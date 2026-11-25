import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const SRC = join(import.meta.dir, "../../src");
const read = (path: string) => readFileSync(join(SRC, path), "utf8");

const script = read("lib/plerdy.js");
const layout = read("layouts/Layout.astro");

describe("plerdy on demand", () => {
	it("is inlined from Layout with the marker attribute", () => {
		expect(layout).toContain('import plerdy from "../lib/plerdy.js?raw"');
		expect(layout).toContain('<script is:inline data-plerdy_code="1" set:html={plerdy} />');
	});

	it("cannot close the inline script element early", () => {
		expect(script.toLowerCase()).not.toContain("</script");
	});

	it("has no imports and no timer", () => {
		expect(script).not.toMatch(/^\s*import\s/m);
		expect(script).not.toMatch(/setTimeout|setInterval|requestIdleCallback/);
	});

	it("keeps Plerdy's snippet values", () => {
		expect(script).toContain("4032906a023912ef8712153f97e74d4c");
		expect(script).toContain("83066");
		expect(script).toContain("strict-origin-when-cross-origin");
		expect(script).toContain("https://a.plerdy.com/public/js/click/main.js?v=");
	});

	it("listens to the six events on window, capture and passive", () => {
		for (const type of ["scroll", "pointermove", "pointerdown", "touchstart", "keydown", "click"])
			expect(script).toContain(`"${type}"`);
		expect(script).toContain("capture: true, passive: true");
	});
});
