#!/usr/bin/env node
/**
 * Fails when a built page links to one of our own pages without the trailing slash.
 *
 * Pages are built in directory format (/ua/about/index.html), so Apache answers /ua/about with a
 * 301 to /ua/about/. Every such link costs visitors and crawlers an extra round trip. Checks the
 * href of every .html file and every own-site URL in the .md and .txt files for LLMs.
 *
 * Usage (after `bun run build`): node scripts/check-links.mjs [dist/client]
 */

import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";

const root = process.argv[2] ?? "dist/client";

/** Own pages live under /en or /ua; a last segment with a dot is a file (/ua/about.md). */
const needsSlash = (path) => {
	if (!/^\/(en|ua)(\/|$)/.test(path)) return false;
	if (path.endsWith("/")) return false;
	const last = path.split("/").pop() ?? "";
	return !last.includes(".");
};

function* files(dir) {
	for (const entry of readdirSync(dir, { withFileTypes: true })) {
		const path = join(dir, entry.name);
		if (entry.isDirectory()) yield* files(path);
		else yield path;
	}
}

// Own-site host, taken from the sitemap so absolute URLs on other domains are ignored
const sitemap = readFileSync(join(root, "sitemap-0.xml"), "utf8");
const siteHost = new URL(/<loc>([^<]+)<\/loc>/.exec(sitemap)?.[1] ?? "https://ocs.com.ua").host;

const problems = [];
for (const file of files(root)) {
	const text = /\.(html|md|txt)$/.test(file) ? readFileSync(file, "utf8") : null;
	if (text === null) continue;

	const paths = [];
	if (file.endsWith(".html")) {
		for (const [, href] of text.matchAll(/href="([^"]*)"/g)) {
			if (href.startsWith("/") && !href.startsWith("//")) paths.push(href);
			else if (href.startsWith("http")) paths.push(href);
		}
	} else {
		for (const [url] of text.matchAll(/https?:\/\/[^\s)<>"`]+/g)) paths.push(url);
	}

	for (const raw of paths) {
		let url;
		try {
			url = new URL(raw, `https://${siteHost}`);
		} catch {
			continue;
		}
		if (url.host !== siteHost) continue;
		if (needsSlash(url.pathname)) problems.push(`${relative(root, file)}: ${raw}`);
	}
}

if (problems.length > 0) {
	const unique = [...new Set(problems)];
	console.error(`${unique.length} links to own pages miss the trailing slash (301 redirect):`);
	for (const p of unique.slice(0, 50)) console.error(`  ${p}`);
	if (unique.length > 50) console.error(`  ... and ${unique.length - 50} more`);
	process.exit(1);
}
console.log("All links to own pages end with a slash.");
