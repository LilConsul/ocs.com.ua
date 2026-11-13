/**
 * Build-time SEO helpers used by astro.config.mjs:
 *
 * - sitemapLastmod(): the <lastmod> of a sitemap URL, from the git history of the content and
 *   data files that page is built from, so crawlers know which pages to fetch again.
 * - seoIntegration(): after the build, marks every file noindex when indexing is off (the dev
 *   site) and writes the IndexNow key file when INDEXNOW_KEY is set.
 */

import { execFileSync } from "node:child_process";
import { appendFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

/** Content and data files each kind of page is built from, relative to application/frontend. */
export function sourcesFor(pathname) {
	for (const [pattern, sources] of SOURCE_RULES) {
		const match = pattern.exec(pathname);
		if (match) return sources(match);
	}
	return [];
}

/** @type {Array<[RegExp, (m: RegExpExecArray) => string[]]>} First match wins. */
const SOURCE_RULES = [
	[
		/^\/(en|ua)\/catalogue\/equipment\/([^/]+)\/([^/]+)\/$/,
		(m) => [`src/content/equipment/${m[2]}/${m[3]}.${m[1]}.md`],
	],
	[
		/^\/(en|ua)\/catalogue\/equipment\/([^/]+)\/$/,
		(m) => [`src/content/equipment/${m[2]}`, "src/data/equipment-types.json"],
	],
	[
		/^\/(en|ua)\/catalogue\/industry\/[^/]+\/$/,
		() => ["src/data/industries.json", "src/content/equipment"],
	],
	[/^\/(en|ua)\/wiki\/([^/]+)\/$/, (m) => [`src/content/wiki/${m[2]}.${m[1]}.md`]],
	[/^\/(en|ua)\/wiki\/$/, () => ["src/content/wiki"]],
	[/^\/(en|ua)\/privacy\/$/, () => ["src/data/privacy-policy.json"]],
	[/^\/(en|ua)\/terms\/$/, () => ["src/data/terms-of-use.json"]],
	[
		/^\/(en|ua)\/about\/$/,
		() => ["src/data/partners.json", "src/data/company.json", "src/data/documents.json"],
	],
	[/^\/(en|ua)\/contact\/$/, () => ["src/data/company.json", "src/data/documents.json"]],
	[/^\/(en|ua)\/$/, () => ["src/content", "src/data"]],
];

const git = (args, cwd) => execFileSync("git", args, { cwd, encoding: "utf8" }).trim();

/**
 * Returns a function from sitemap URL to the ISO date of the last commit touching its sources,
 * or undefined. A shallow clone (CI default) has one commit only, which would date every page
 * the same, so lastmod is left out there; the deploy build checks out the full history.
 */
export function sitemapLastmod(cwd) {
	let usable = false;
	try {
		usable = git(["rev-parse", "--is-shallow-repository"], cwd) === "false";
	} catch {
		usable = false;
	}
	const cache = new Map();
	return (url) => {
		if (!usable) return undefined;
		const sources = sourcesFor(new URL(url).pathname);
		if (sources.length === 0) return undefined;
		const key = sources.join("|");
		if (!cache.has(key)) {
			let date;
			try {
				date = git(["log", "-1", "--format=%cI", "--", ...sources], cwd) || undefined;
			} catch {
				date = undefined;
			}
			cache.set(key, date);
		}
		return cache.get(key);
	};
}

/** Apache rules appended to dist/client/.htaccess when the site must not be indexed. */
export const NOINDEX_HTACCESS = `
# --- Indexing off (LLMS_INDEXING=false), added by the build ---
# Covers every file, also the .md, .txt and PDF files that cannot carry a <meta name="robots">
<IfModule mod_headers.c>
	Header always set X-Robots-Tag "noindex, nofollow"
</IfModule>
`;

/** IndexNow keys are 8 to 128 characters of a-z, A-Z, 0-9 and "-". */
export const isIndexNowKey = (key) => /^[A-Za-z0-9-]{8,128}$/.test(key);

/**
 * @param {{ indexing: boolean, indexNowKey?: string }} options
 * @returns {import("astro").AstroIntegration}
 */
export function seoIntegration({ indexing, indexNowKey }) {
	return {
		name: "seo-build",
		hooks: {
			"astro:build:done": ({ dir, logger }) => {
				const out = fileURLToPath(dir);
				if (!indexing) {
					appendFileSync(`${out}.htaccess`, NOINDEX_HTACCESS);
					logger.info("LLMS_INDEXING=false: every file is served with X-Robots-Tag noindex");
					return;
				}
				if (!indexNowKey) return;
				if (!isIndexNowKey(indexNowKey)) {
					throw new Error("INDEXNOW_KEY must be 8-128 characters of a-z, A-Z, 0-9 and '-'");
				}
				// https://www.indexnow.org/documentation: the key file proves we own the host
				writeFileSync(`${out}${indexNowKey}.txt`, indexNowKey);
				logger.info(`IndexNow key file written: /${indexNowKey}.txt`);
			},
		},
	};
}
