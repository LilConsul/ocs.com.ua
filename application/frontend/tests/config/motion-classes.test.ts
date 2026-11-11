import { describe, expect, it } from "bun:test";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const SRC = join(import.meta.dir, "../../src");

function astroFiles(dir: string): string[] {
	return readdirSync(dir).flatMap((name) => {
		const path = join(dir, name);
		if (statSync(path).isDirectory()) return astroFiles(path);
		return path.endsWith(".astro") ? [path] : [];
	});
}

const files = astroFiles(SRC).map((path) => ({ path, text: readFileSync(path, "utf8") }));
const rel = (path: string) => path.slice(SRC.length + 1).replaceAll("\\", "/");

describe("motion classes in components", () => {
	it("use no hand-set duration-NNN utilities", () => {
		const offenders = files.filter((f) => /\bduration-\d+\b/.test(f.text)).map((f) => rel(f.path));
		expect(offenders).toEqual([]);
	});

	it("use no transition-all", () => {
		const offenders = files
			.filter((f) => /\btransition-all\b/.test(f.text))
			.map((f) => rel(f.path));
		expect(offenders).toEqual([]);
	});
});
