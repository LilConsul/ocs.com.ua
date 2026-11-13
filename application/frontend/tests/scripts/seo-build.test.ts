import { describe, expect, it } from "bun:test";
import { isIndexNowKey, NOINDEX_HTACCESS, sourcesFor } from "../../scripts/seo-build.mjs";

describe("seo-build: sitemap lastmod sources", () => {
	it("dates a product by its own content file", () => {
		expect(sourcesFor("/ua/catalogue/equipment/checkweigher/hc-a/")).toEqual([
			"src/content/equipment/checkweigher/hc-a.ua.md",
		]);
	});

	it("dates a category by its products and the category list", () => {
		expect(sourcesFor("/en/catalogue/equipment/checkweigher/")).toEqual([
			"src/content/equipment/checkweigher",
			"src/data/equipment-types.json",
		]);
	});

	it("dates a wiki article by its own file and the index by all articles", () => {
		expect(sourcesFor("/en/wiki/load-cell/")).toEqual(["src/content/wiki/load-cell.en.md"]);
		expect(sourcesFor("/ua/wiki/")).toEqual(["src/content/wiki"]);
	});

	it("dates the legal pages by their CMS data", () => {
		expect(sourcesFor("/ua/privacy/")).toEqual(["src/data/privacy-policy.json"]);
		expect(sourcesFor("/en/terms/")).toEqual(["src/data/terms-of-use.json"]);
	});

	it("gives no source for unknown paths, so no lastmod is written", () => {
		expect(sourcesFor("/ua/unknown/page/")).toEqual([]);
		expect(sourcesFor("/admin/")).toEqual([]);
	});
});

describe("seo-build: indexing off and IndexNow", () => {
	it("marks every file noindex through a header", () => {
		expect(NOINDEX_HTACCESS).toContain('Header always set X-Robots-Tag "noindex, nofollow"');
		expect(NOINDEX_HTACCESS).toContain("<IfModule mod_headers.c>");
	});

	it("accepts only valid IndexNow keys", () => {
		expect(isIndexNowKey("a1b2c3d4")).toBe(true);
		expect(isIndexNowKey("short")).toBe(false);
		expect(isIndexNowKey("has space 123")).toBe(false);
		expect(isIndexNowKey("x".repeat(129))).toBe(false);
	});
});
