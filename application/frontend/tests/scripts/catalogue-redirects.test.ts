import { describe, expect, it } from "bun:test";
import { existsSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import equipmentTypes from "@/data/equipment-types.json";
import { buildCatalogueRedirects } from "../../scripts/catalogue-redirects.mjs";

const ROOT = resolve(import.meta.dir, "../..");
const CONTENT_DIR = join(ROOT, "src/content/equipment");
const redirects: Record<string, string> = buildCatalogueRedirects(ROOT);
const LANGS = ["en", "ua"] as const;

describe("catalogue redirects", () => {
	it("sends every old category URL to its new category page", () => {
		for (const lang of LANGS) {
			for (const { slug } of equipmentTypes[lang].categories) {
				expect(redirects[`/${lang}/catalogue/${slug}`]).toBe(
					`/${lang}/catalogue/equipment/${slug}`
				);
			}
		}
	});

	it("sends every old product URL to a product page that exists", () => {
		const productRedirects = Object.entries(redirects).filter(
			([from]) => from.split("/").length === 5
		);
		expect(productRedirects.length).toBeGreaterThan(0);

		for (const [from, to] of productRedirects) {
			const [, lang, , category, product] = from.split("/");
			expect(to).toBe(`/${lang}/catalogue/equipment/${category}/${product}`);
			expect(existsSync(join(CONTENT_DIR, category, `${product}.${lang}.md`))).toBe(true);
		}
	});

	it("covers every product file in the content folders", () => {
		const missing: string[] = [];
		for (const category of readdirSync(CONTENT_DIR)) {
			for (const file of readdirSync(join(CONTENT_DIR, category))) {
				const match = file.match(/^([^_].*)\.(en|ua)\.md$/);
				if (match && !redirects[`/${match[2]}/catalogue/${category}/${match[1]}`]) {
					missing.push(`${category}/${file}`);
				}
			}
		}
		expect(missing).toEqual([]);
	});

	it("never redirects to an old-scheme URL", () => {
		for (const to of Object.values(redirects)) {
			expect(to).toContain("/catalogue/equipment/");
		}
	});
});
