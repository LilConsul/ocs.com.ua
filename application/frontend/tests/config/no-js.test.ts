import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const SRC = join(import.meta.dir, "../../src");
const read = (path: string) => readFileSync(join(SRC, path), "utf8");

const css = read("styles/no-js.css");
const layout = read("layouts/Layout.astro");
const contactForm = read("components/contact/ContactForm.astro");

// Strip comments so a selector mentioned in prose is not counted as a rule
const rules = css.replace(/\/\*[\s\S]*?\*\//g, "");

describe("no-JS fallback: wiring", () => {
	it("is injected from Layout inside <noscript>, so it never applies when JS runs", () => {
		expect(layout).toContain('import noJsCss from "../styles/no-js.css?raw"');
		expect(layout).toMatch(/<noscript><style[^>]*set:html=\{noJsCss\}/);
	});

	it("is not imported as a regular stylesheet", () => {
		expect(layout).not.toMatch(/import\s+["'][^"']*no-js\.css["']/);
	});
});

describe("no-JS fallback: rules target ids that exist in the markup", () => {
	const markup = [
		["#mobile-menu-toggle", "components/Header.astro"],
		["#mobile-menu", "components/Header.astro"],
		["#main-header", "components/Header.astro"],
		["#dev-notice-close", "components/Header.astro"],
		["#catalogue-sidebar", "components/catalogue/CatalogueSidebar.astro"],
		["#mobile-filter-toggle", "components/catalogue/CatalogueSidebar.astro"],
		["#mobile-filter-close", "components/catalogue/CatalogueSidebar.astro"],
		["#gallery-expand-btn", "components/catalogue/ProductGallery.astro"],
		["#gallery-card-prev", "components/catalogue/ProductGallery.astro"],
		["#gallery-card-next", "components/catalogue/ProductGallery.astro"],
		["#gallery-badge-text", "components/catalogue/ProductGallery.astro"],
		["#clientFilterGroup", "components/about/ClientDirectory.astro"],
		["#contact-form", "components/contact/ContactForm.astro"],
	] as const;

	for (const [selector, file] of markup) {
		it(`${selector} is used by ${file}`, () => {
			expect(rules).toContain(selector);
			expect(read(file)).toContain(`id="${selector.slice(1)}"`);
		});
	}

	it("every data-attribute hook exists in the markup", () => {
		const hooks = [
			["[data-product-search-input]", "components/catalogue/CatalogueSidebar.astro"],
			["[data-wiki-filter]", "components/wiki/WikiSidebar.astro"],
			["[data-wiki-index-filter]", "pages/[lang]/wiki/index.astro"],
			["[data-sidebar-body]", "components/catalogue/CatalogueSidebar.astro"],
		] as const;
		for (const [selector, file] of hooks) {
			expect(rules).toContain(selector);
			expect(read(file)).toContain(selector.slice(1, -1));
		}
	});
});

describe("no-JS fallback: the mobile menu is reachable", () => {
	it("shows the drawer on small screens and hides the dead toggle", () => {
		expect(rules).toMatch(/#mobile-menu-toggle\s*\{[^}]*display:\s*none/);
		expect(rules).toMatch(
			/@media \(max-width: 767px\)[\s\S]*#mobile-menu\s*\{[^}]*display:\s*block/
		);
	});

	it("un-fixes the header so the drawer cannot cover the page content", () => {
		expect(rules).toMatch(/#main-header\s*\{[^}]*position:\s*relative/);
		expect(rules).toMatch(/main\s*\{[^}]*padding-top:\s*0/);
	});
});

describe("no-JS fallback: catalogue sidebar", () => {
	it("keeps every accordion section open and its links visible", () => {
		expect(rules).toMatch(/\.sidebar-panel\s*\{[^}]*grid-template-rows:\s*1fr/);
		expect(rules).toMatch(/\[data-sidebar-body\]\[hidden\]\s*\{[^}]*display:\s*block/);
	});

	it("overrides Tailwind's [hidden] rule from inside the same cascade layer", () => {
		// Preflight sets `[hidden] { display: none !important }` in @layer base. For !important
		// declarations an earlier layer beats later and unlayered ones, so an unlayered override
		// silently loses and the closed Industries section stays invisible.
		expect(rules).toMatch(
			/@layer base\s*\{[^@]*\[data-sidebar-body\]\[hidden\]\s*\{[^}]*display:\s*block/
		);
		expect(rules).toMatch(/@layer properties, theme, base, components, utilities;/);
	});

	it("does not rely on a script to expose the industry links", () => {
		const sidebar = read("components/catalogue/CatalogueSidebar.astro");
		// The links are plain anchors built from the same loop for every section
		expect(sidebar).toMatch(/<a\s+href=\{s\.hrefFor\(item\.slug\)\}/);
		expect(sidebar).toContain('id: "industry"');
	});

	it("brings the off-canvas drawer back into the page flow", () => {
		expect(rules).toMatch(/#catalogue-sidebar\s*\{[^}]*position:\s*static/);
		expect(rules).toMatch(/#catalogue-sidebar\s*\{[^}]*transform:\s*none/);
		// Tailwind v4 offsets the drawer with the `translate` property, which `transform` does not reset
		expect(rules).toMatch(/#catalogue-sidebar\s*\{[^}]*translate:\s*none/);
	});
});

describe("no-JS fallback: contact form", () => {
	it("shows a <noscript> notice with phone and email instead of a dead form", () => {
		expect(contactForm).toMatch(/<noscript>[\s\S]*tel:[\s\S]*mailto:[\s\S]*<\/noscript>/);
		expect(rules).toMatch(/#contact-form\s*\{[^}]*display:\s*none/);
	});

	it("keeps the notice before the form", () => {
		expect(contactForm.indexOf("<noscript>")).toBeLessThan(
			contactForm.indexOf('<form id="contact-form"')
		);
	});
});

describe("no-JS fallback: content is never hidden by default", () => {
	// Reveal animations must start hidden only after a script sets data-anim="ready"
	const withHidingCss = [
		"pages/[lang]/contact.astro",
		"components/homepage/StatsSection.astro",
		"components/homepage/IndustriesSection.astro",
		"components/about/AboutCta.astro",
		"components/about/ManufacturerCredentials.astro",
		"components/catalogue/RelatedEquipment.astro",
	];

	for (const file of withHidingCss) {
		it(`${file} only hides under [data-anim="ready"]`, () => {
			const style = read(file).match(/<style[^>]*>([\s\S]*?)<\/style>/)?.[1] ?? "";
			const hiding = style.match(/[^{}]+\{[^{}]*opacity:\s*0[^{}]*\}/g) ?? [];
			for (const rule of hiding) {
				// Keyframe steps ("from"/"to"/"0%") are fine; real selectors must be gated
				const selector = rule.split("{")[0].trim();
				if (/^(from|to|\d+%)$/.test(selector)) continue;
				expect(selector).toContain('[data-anim="ready"]');
			}
		});
	}
});
