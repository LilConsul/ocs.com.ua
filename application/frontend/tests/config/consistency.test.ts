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
