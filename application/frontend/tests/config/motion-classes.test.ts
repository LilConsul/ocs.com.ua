import { describe, expect, it } from "bun:test";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const SRC = join(import.meta.dir, "../../src");

function sourceFiles(dir: string, extensions: string[]): string[] {
	return readdirSync(dir).flatMap((name) => {
		const path = join(dir, name);
		if (statSync(path).isDirectory()) return sourceFiles(path, extensions);
		return extensions.some((ext) => path.endsWith(ext)) ? [path] : [];
	});
}

const read = (paths: string[]) => paths.map((path) => ({ path, text: readFileSync(path, "utf8") }));
const files = read(sourceFiles(SRC, [".astro"]));
const allFiles = read(sourceFiles(SRC, [".astro", ".ts", ".js", ".css"]));
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

describe("picture fade-in", () => {
	it("the old per-image fade is gone from src", () => {
		const offenders = allFiles
			.filter((f) => /img-fade|observeImages|img-in/.test(f.text))
			.map((f) => rel(f.path));
		expect(offenders).toEqual([]);
	});

	it("data-loaded belongs to the loading skeletons only", () => {
		const owners = new Set(["lib/image-skeleton.ts", "lib/skeleton-on.js", "styles/global.css"]);
		const offenders = allFiles
			.filter((f) => /data-loaded|dataset\.loaded/.test(f.text))
			.map((f) => rel(f.path))
			.filter((path) => !owners.has(path));
		expect(offenders).toEqual([]);
	});
});
