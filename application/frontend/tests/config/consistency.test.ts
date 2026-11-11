import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const SRC = join(import.meta.dir, "../../src");
const read = (path: string) => readFileSync(join(SRC, path), "utf8");
const css = read("styles/global.css");
const rules = css.replace(/\/\*[\s\S]*?\*\//g, "");

describe("card hover", () => {
	it("defines card-hover with the shared motion tokens", () => {
		const base = rules.match(/\.card-hover\s*\{[^}]*\}/)?.[0] ?? "";
		expect(base).toContain("var(--dur-base)");
		expect(base).toContain("var(--ease-out-quart)");
		expect(rules).toMatch(/\.card-hover:hover\s*\{[^}]*border-color:/);
		expect(rules).toMatch(/\.card-hover:hover\s*\{[^}]*box-shadow:/);
	});

	it("lifts only when reduced motion is not requested", () => {
		expect(rules).toMatch(
			/@media \(prefers-reduced-motion: no-preference\)\s*\{\s*\.card-hover:hover\s*\{[^}]*translate:/
		);
	});

	const cards = [
		"components/catalogue/ProductCard.astro",
		"components/catalogue/CatalogueSidebar.astro",
		"components/catalogue/RelatedEquipment.astro",
		"components/homepage/atoms/IndustryCard.astro",
		"components/homepage/atoms/IndustryCardSmall.astro",
		"components/wiki/WikiCard.astro",
		"components/about/ClientDirectory.astro",
		"components/about/InteractiveUkraineMap.astro",
	];
	for (const file of cards) {
		it(`${file} uses card-hover and no copy of its classes`, () => {
			const text = read(file);
			expect(text).toContain("card-hover");
			expect(text).not.toContain("motion-safe:hover:-translate-y-0.5");
			expect(text).not.toContain("transition-[translate,box-shadow,border-color]");
		});
	}
});

describe("buttons and links", () => {
	it("defines btn-primary, btn-secondary, btn-sm and link-arrow", () => {
		for (const name of ["btn-primary", "btn-secondary", "btn-sm", "link-arrow"]) {
			expect(rules).toContain(`.${name}`);
		}
	});

	const primary = [
		"components/homepage/HeroSection.astro",
		"components/about/AboutHero.astro",
		"components/about/AboutCta.astro",
		"components/about/ManufacturerCredentials.astro",
		"components/catalogue/CatalogueSidebar.astro",
		"components/catalogue/DatasheetModal.astro",
		"components/contact/ContactForm.astro",
		"components/errors/NotFoundContent.astro",
		"components/errors/ServerErrorContent.astro",
		"pages/[lang]/catalogue/equipment/[category]/[slug].astro",
	];
	const secondary = [
		"components/homepage/HeroSection.astro",
		"components/about/AboutHero.astro",
		"components/about/AboutCta.astro",
		"components/contact/OfficeLocation.astro",
		"components/errors/NotFoundContent.astro",
		"components/errors/ServerErrorContent.astro",
		"pages/[lang]/catalogue/equipment/[category]/[slug].astro",
	];
	for (const file of primary) {
		it(`${file} uses btn-primary`, () => expect(read(file)).toContain("btn-primary"));
	}
	for (const file of secondary) {
		it(`${file} uses btn-secondary`, () => expect(read(file)).toContain("btn-secondary"));
	}

	it("no component keeps its own copy of the button size", () => {
		for (const file of [...new Set([...primary, ...secondary])]) {
			expect(read(file)).not.toContain("rounded-lg px-7 py-3.5");
		}
	});
});

describe("featured equipment band", () => {
	const page = read("pages/[lang]/index.astro");
	const band = read("components/homepage/FeaturedEquipment.astro");

	it("sits between the stats strip and the industries section", () => {
		const order = ["<StatsSection", "<FeaturedEquipment", "<IndustriesSection"].map((tag) =>
			page.indexOf(tag)
		);
		expect(order.every((i) => i >= 0)).toBe(true);
		expect(order).toEqual([...order].sort((a, b) => a - b));
	});

	it("is a real tab list with panels, wired to the tabs script", () => {
		expect(band).toContain('role="tablist"');
		expect(band).toContain('role="tab"');
		expect(band).toContain('role="tabpanel"');
		expect(band).toContain("initFeaturedTabs");
	});

	it("reuses the shared card, divider and link styles", () => {
		for (const name of ["card-hover", "section-block", "link-arrow"]) {
			expect(band).toContain(name);
		}
		expect(band).not.toMatch(/duration-\d+/);
	});

	it("shows every panel when JavaScript is off and hides the tab bar", () => {
		expect(rules).toMatch(/\[data-featured-tabs\]\s+\.featured-tablist\s*\{[^}]*display:\s*none/);
		expect(rules).toMatch(
			/\[data-featured-tabs\]\[data-tabs-ready\]\s+\.featured-tablist\s*\{[^}]*display:\s*flex/
		);
	});

	it("animates a panel switch with the shared base duration", () => {
		expect(rules).toMatch(/featured-panel-in\s+var\(--dur-base\)/);
	});
});
