import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const SRC = join(import.meta.dir, "../../src");
const read = (path: string) => readFileSync(join(SRC, path), "utf8");
const css = read("styles/global.css");
const rules = css.replace(/\/\*[\s\S]*?\*\//g, "");

const FILLS =
	/\b(bg-surface-container|bg-background|bg-linear-to-[a-z]+|from-background|to-background|from-surface-container|to-surface-container)\b/;

/** class attribute values of every <section ...> opening tag in a file */
function sectionClasses(file: string): string[] {
	const tags = read(file).match(/<section\b[^>]*>/g) ?? [];
	return tags.map((tag) => tag.match(/class="([^"]*)"/)?.[1] ?? "");
}

describe("site gradient", () => {
	it("is rendered by the layout", () => {
		expect(read("layouts/Layout.astro")).toContain("site-gradient");
	});

	it("spans the page with a repeating, static gradient", () => {
		const rule = rules.match(/\.site-gradient\s*\{[^}]*\}/)?.[0] ?? "";
		expect(rule).toContain("repeat-y");
		expect(rule).toContain("radial-gradient");
		expect(rule).not.toContain("animation");
	});

	it("defines section-block as a hairline divider", () => {
		expect(rules).toMatch(/\.section-block\s*\{[^}]*border-top/);
	});
});

describe("sections are transparent over the shared background", () => {
	const roots = [
		"components/homepage/StatsSection.astro",
		"components/homepage/IndustriesSection.astro",
		"components/homepage/PartnersSection.astro",
		"components/catalogue/CatalogueBand.astro",
		"components/about/ClientDirectory.astro",
		"components/about/ManufacturerCredentials.astro",
		"components/about/InteractiveUkraineMap.astro",
		"components/catalogue/RelatedEquipment.astro",
		"components/about/AboutCta.astro",
		"components/contact/ContactHero.astro",
		"pages/[lang]/contact.astro",
		"pages/[lang]/catalogue/equipment/[category]/[slug].astro",
	];
	for (const file of roots) {
		it(`${file} paints no section fill`, () => {
			const first = sectionClasses(file)[0] ?? "";
			expect(first).not.toMatch(FILLS);
		});
	}

	it("contact page: both sections are transparent", () => {
		for (const cls of sectionClasses("pages/[lang]/contact.astro")) expect(cls).not.toMatch(FILLS);
	});

	const divided = [
		"components/homepage/StatsSection.astro",
		"components/homepage/IndustriesSection.astro",
		"components/homepage/PartnersSection.astro",
		"components/about/ClientDirectory.astro",
		"components/about/ManufacturerCredentials.astro",
		"components/about/InteractiveUkraineMap.astro",
		"components/about/AboutCta.astro",
		"components/catalogue/RelatedEquipment.astro",
	];
	for (const file of divided) {
		it(`${file} is separated by section-block`, () => {
			expect(sectionClasses(file)[0]).toContain("section-block");
		});
	}
});
