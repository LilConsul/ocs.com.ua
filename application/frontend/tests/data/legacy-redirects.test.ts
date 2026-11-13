import { describe, expect, it } from "bun:test";
import { readdirSync } from "node:fs";
import { join } from "node:path";
import equipmentTypes from "@/data/equipment-types.json";
import industries from "@/data/industries.json";
import legacy from "@/data/legacy-redirects.json";
import { categoryUrl, industryUrl, productUrl } from "@/lib/catalogue-urls";
import { legacyRedirectRules } from "../../scripts/seo-build.mjs";

const CONTENT = join(import.meta.dir, "../../src/content");

/** Every Ukrainian page the site builds, as the redirect targets must name them. */
function ukrainianPages(): Set<string> {
	const pages = new Set([
		"/ua/",
		"/ua/about/",
		"/ua/contact/",
		"/ua/privacy/",
		"/ua/terms/",
		"/ua/wiki/",
	]);
	for (const { slug } of equipmentTypes.ua.categories) {
		pages.add(categoryUrl("ua", slug));
		let files: string[] = [];
		try {
			files = readdirSync(join(CONTENT, "equipment", slug));
		} catch {
			files = [];
		}
		for (const f of files) {
			const m = /^([^_].*)\.ua\.md$/.exec(f);
			if (m) pages.add(productUrl("ua", slug, m[1]));
		}
	}
	for (const { slug } of industries.ua.industries) pages.add(industryUrl("ua", slug));
	for (const f of readdirSync(join(CONTENT, "wiki"))) {
		const m = /^(.+)\.ua\.md$/.exec(f);
		if (m) pages.add(`/ua/wiki/${m[1]}/`);
	}
	return pages;
}

const { redirects } = legacy as { redirects: { from: string; to: string; review?: string }[] };

describe("old WordPress redirects", () => {
	it("send every old address to a page that exists", () => {
		const pages = ukrainianPages();
		const missing = redirects.filter((r) => !pages.has(r.to)).map((r) => `${r.from} -> ${r.to}`);
		expect(missing).toEqual([]);
	});

	it("list each old address once", () => {
		const froms = redirects.map((r) => r.from);
		expect(new Set(froms).size).toBe(froms.length);
	});

	it("never touch the new site's own paths or the root", () => {
		for (const { from } of redirects) {
			expect(from).toMatch(/^\/.+\/$/);
			expect(from).not.toMatch(/^\/(en|ua|admin|api|_astro|assets)\//);
		}
	});

	it("become one exact RedirectMatch rule each, with or without the trailing slash", () => {
		const rules = legacyRedirectRules([
			{ from: "/hc-a/", to: "/ua/catalogue/equipment/checkweigher/hc-a/" },
			{ from: "/model-sc.v/", to: "/ua/" },
		]);
		expect(rules).toContain(
			"RedirectMatch 301 ^/hc-a/?$ /ua/catalogue/equipment/checkweigher/hc-a/"
		);
		// A dot in an old address is escaped, so it matches only a literal dot
		expect(rules).toContain(String.raw`RedirectMatch 301 ^/model-sc\.v/?$ /ua/`);
	});
});
