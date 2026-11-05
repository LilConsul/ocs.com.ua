import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { EASE_OUT_EXPO } from "@/lib/anims/tokens";

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
		const hiding = (rules.match(/html\.motion-on[^{]*\{[^}]*opacity:\s*0[^}]*\}/g) ?? []).filter(
			(rule) => !rule.includes(".img-fade")
		);
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

describe("motion: image fade-in", () => {
	const files = [
		"components/catalogue/ProductCard.astro",
		"components/catalogue/RelatedEquipment.astro",
		"components/about/ClientDirectory.astro",
		"components/homepage/PartnersSection.astro",
		"components/homepage/atoms/PartnerLogo.astro",
		"components/wiki/WikiCard.astro",
		"pages/[lang]/wiki/[slug].astro",
	];

	it("hides an image only under html.motion-on and until it has loaded", () => {
		expect(rules).toMatch(
			/html\.motion-on \.img-fade:not\(\[data-loaded\]\)\s*\{[^}]*opacity:\s*0/
		);
	});

	it("fades with a keyframe animation so hover transforms on the image keep working", () => {
		expect(rules).toMatch(/html\.motion-on \.img-fade\[data-loaded\]\s*\{[^}]*animation:\s*img-in/);
		expect(rules).toMatch(/@keyframes img-in\s*\{\s*from\s*\{\s*opacity:\s*0/);
	});

	for (const file of files) {
		it(`${file} marks its images with img-fade`, () => {
			const tags = read(file).match(/<(Image|img)\b[^>]*>/g) ?? [];
			expect(tags.length).toBeGreaterThan(0);
			for (const tag of tags) expect(tag).toContain("img-fade");
		});
	}

	it("leaves the largest-contentful-paint images alone", () => {
		expect(read("components/homepage/HeroSection.astro")).not.toContain("img-fade");
		expect(read("components/Header.astro")).not.toContain("img-fade");
		expect(read("components/catalogue/ProductGallery.astro")).not.toContain("img-fade");
	});

	it("starts the observer from the runtime", () => {
		expect(read("lib/anims/runtime.ts")).toMatch(/observeImages\(document\)/);
	});
});

describe("motion: dynamic markup", () => {
	const sidebar = read("components/catalogue/CatalogueSidebar.astro");

	it("search result cards carry img-fade and are scanned for images", () => {
		expect(sidebar).toMatch(/<img[^>]*class="[^"]*img-fade/);
		expect(sidebar).toMatch(/import\s*\{\s*observeImages\s*\}\s*from\s*"@\/lib\/anims\/images"/);
	});

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
