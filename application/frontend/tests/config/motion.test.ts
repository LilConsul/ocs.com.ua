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
		const hiding = rules.match(/html\.motion-on[^{]*\{[^}]*opacity:\s*0[^}]*\}/g) ?? [];
		expect(hiding.length).toBeGreaterThan(0);
		for (const rule of hiding) {
			expect(rule).toContain(":not([data-revealed])");
		}
		// No other rule may hide a reveal element
		const withoutGated = rules.replace(/html\.motion-on[^{]*\{[^}]*\}/g, "");
		expect(withoutGated).not.toMatch(/\.(reveal|eyebrow-rule)[^{]*\{[^}]*opacity:\s*0/);
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
