import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { DUR, EASE_OUT_EXPO } from "@/lib/anims/tokens";

const SRC = join(import.meta.dir, "../../src");
const read = (path: string) => readFileSync(join(SRC, path), "utf8");

const layout = read("layouts/Layout.astro");
const css = read("styles/global.css");
// Strip comments so prose mentioning a selector is not counted as a rule
const rules = css.replace(/\/\*[\s\S]*?\*\//g, "");

describe("motion: wiring", () => {
	it("inlines the head script before first paint", () => {
		expect(layout).toContain('import motionOn from "../lib/anims/motion-on.js?raw"');
		expect(layout).toMatch(/<script is:inline set:html=\{motionOn\}\s*\/>/);
		expect(layout.indexOf("set:html={motionOn}")).toBeLessThan(layout.indexOf("</head>"));
	});

	it("loads the runtime", () => {
		expect(layout).toMatch(/import\s+["']@\/lib\/anims\/runtime["']/);
	});
});

describe("motion: global.css", () => {
	it("no longer uses scroll-driven animation timelines", () => {
		expect(css).not.toContain("animation-timeline");
	});

	it("hides reveal elements only under html.motion-on and until they are revealed", () => {
		const hiding = rules.match(/html\.motion-on[^{]*\{[^}]*opacity:\s*0[^}]*\}/g) ?? [];
		expect(hiding.length).toBeGreaterThan(0);
		for (const rule of hiding) {
			expect(rule).toContain(":not([data-revealed])");
		}
		// No other rule may hide a reveal element
		const withoutGated = rules.replace(/html\.motion-on[^{]*\{[^}]*\}/g, "");
		expect(withoutGated).not.toMatch(/\.(reveal|eyebrow-rule)[^{]*\{[^}]*opacity:\s*0/);
	});

	it("hides section headings the same gated way", () => {
		expect(rules).toMatch(
			/html\.motion-on \.reveal-heading:not\(\[data-revealed\]\)[^{]*\{[^}]*opacity:\s*0/
		);
	});

	it("keeps the CSS easing token equal to the JS one", () => {
		const match = css.match(/--ease-out-expo:\s*cubic-bezier\(([^)]*)\)/);
		expect(match).not.toBeNull();
		const values = match?.[1].split(",").map(Number);
		expect(values).toEqual([...EASE_OUT_EXPO]);
	});

	it("keeps CSS duration tokens equal to the JS ones", () => {
		for (const [name, seconds] of Object.entries(DUR)) {
			const match = css.match(new RegExp(`--dur-${name}:\\s*(\\d+)ms`));
			expect(match).not.toBeNull();
			expect(Number(match?.[1])).toBe(Math.round(seconds * 1000));
		}
	});

	it("uses no hand-set durations in transition or animation declarations", () => {
		const declarations = rules.match(/\b(?:transition|animation)(?:-duration)?\s*:[^;{}]*;/g) ?? [];
		for (const declaration of declarations) {
			expect(declaration).not.toMatch(/(?<![\w.-])(?!0s\b)\d*\.?\d+m?s\b/);
		}
	});

	it("defines the duration tokens", () => {
		for (const name of ["--dur-fast", "--dur-base", "--dur-slow"]) {
			expect(css).toContain(`${name}:`);
		}
	});
});

describe("motion: section headings", () => {
	const files = [
		"components/homepage/IndustriesSection.astro",
		"components/homepage/PartnersSection.astro",
		"components/about/ManufacturerCredentials.astro",
		"components/about/ClientDirectory.astro",
		"components/about/InteractiveUkraineMap.astro",
		"components/catalogue/RelatedEquipment.astro",
		"components/contact/ContactForm.astro",
		"components/contact/OfficeLocation.astro",
	];

	for (const file of files) {
		it(`${file} reveals its h2`, () => {
			const h2 = read(file).match(/<h2[^>]*>/)?.[0] ?? "";
			expect(h2).toContain("reveal-heading");
		});
	}
});

describe("motion: page transitions", () => {
	it("opts in to native cross-document view transitions", () => {
		expect(rules).toMatch(/@view-transition\s*\{[^}]*navigation:\s*auto/);
	});

	it("turns them off for reduced motion", () => {
		expect(rules).toMatch(
			/@media \(prefers-reduced-motion: reduce\)\s*\{\s*@view-transition\s*\{[^}]*navigation:\s*none/
		);
	});

	it("keeps the header in place while the page crossfades", () => {
		expect(rules).toMatch(/#main-header\s*\{[^}]*view-transition-name:\s*site-header/);
	});

	it("uses the shared duration and easing for the page crossfade", () => {
		expect(rules).toMatch(
			/::view-transition-(old|new)\(root\)[^{]*\{[^}]*animation-duration:\s*var\(--dur-base\)/
		);
	});
});

describe("motion: dynamic markup", () => {
	const sidebar = read("components/catalogue/CatalogueSidebar.astro");

	it("imports observeReveals", () => {
		expect(sidebar).toMatch(/import\s*\{\s*observeReveals\s*\}\s*from\s*"@\/lib\/anims\/reveal"/);
	});

	it("re-scans after every innerHTML assignment that inserts reveal cards", () => {
		const inserts = sidebar.match(/(results|hero)\.innerHTML = [^;]+;/g) ?? [];
		expect(inserts.length).toBe(4);
		for (const stmt of inserts) {
			const after = sidebar.slice(sidebar.indexOf(stmt) + stmt.length);
			// The next statements before the end of the enclosing block must call observeReveals
			expect(after.slice(0, 400)).toContain("observeReveals(");
		}
	});
});

describe("motion: button press state", () => {
	it("defines .press with a scale on :active, only when motion is allowed", () => {
		expect(rules).toMatch(/\.press\s*\{[^}]*transition-property:[^;}]*\bscale\b/);
		expect(rules).toMatch(
			/@media \(prefers-reduced-motion: no-preference\)\s*\{\s*\.press:active\s*\{[^}]*scale:\s*0\.97/
		);
	});

	it("marks every primary and outline call-to-action with press", () => {
		const files = [
			"components/homepage/HeroSection.astro",
			"components/about/AboutHero.astro",
			"components/about/AboutCta.astro",
			"components/about/ManufacturerCredentials.astro",
			"components/wiki/WikiCta.astro",
			"components/contact/ContactForm.astro",
			"components/contact/OfficeLocation.astro",
			"components/catalogue/CatalogueSidebar.astro",
			"components/errors/NotFoundContent.astro",
			"components/errors/ServerErrorContent.astro",
			"pages/[lang]/catalogue/equipment/[category]/[slug].astro",
		];
		const cta =
			/class="(?!press )(group\/dl |group )?(bg-primary text-primary-foreground|border-secondary text-secondary hover:bg-secondary\/5|bg-background text-foreground focus-visible:outline-background)/;
		const unmarked = files.filter((file) => cta.test(read(file)));
		expect(unmarked).toEqual([]);
	});
});

describe("motion: header scroll state", () => {
	const header = read("components/Header.astro");

	it("styles the scrolled state from the data attribute, not from toggled classes", () => {
		expect(header).toContain("data-[scrolled=true]:shadow-sm");
		expect(header).not.toMatch(/classList\.(add|remove)\("border-b"/);
	});

	it("listens passively and registers only once", () => {
		expect(header).toContain("{ passive: true }");
		expect(header).toContain("scrollListening");
	});
});
