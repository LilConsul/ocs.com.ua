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

// Declarations that set a duration or an easing (shorthand and long forms, not the delay)
const TIMING = /\b(?:transition|animation)(?:-duration|-timing-function)?\s*:[^;{}]*;/g;
const styleBlocks = (text: string) =>
	[...text.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/g)].map((m) => m[1]).join("\n");
const stripComments = (text: string) => text.replace(/\/\*[\s\S]*?\*\//g, "");

const css = [
	{ file: "styles/global.css", text: readFileSync(join(SRC, "styles/global.css"), "utf8") },
	...files.map((f) => ({ file: rel(f.path), text: styleBlocks(f.text) })),
];

describe("one motion system", () => {
	it("uses only motion tokens for durations in CSS and component style blocks", () => {
		const offenders: string[] = [];
		for (const { file, text } of css) {
			for (const declaration of stripComments(text).match(TIMING) ?? []) {
				if (/(?<![\w.-])(?!0s\b)\d*\.?\d+m?s\b/.test(declaration)) {
					offenders.push(`${file}: ${declaration.replace(/\s+/g, " ")}`);
				}
			}
		}
		expect(offenders).toEqual([]);
	});

	it("uses only the easing tokens in CSS and component style blocks", () => {
		const offenders: string[] = [];
		for (const { file, text } of css) {
			for (const declaration of stripComments(text).match(TIMING) ?? []) {
				const withoutTokens = declaration.replace(/var\(--[\w-]+\)/g, "");
				if (/cubic-bezier\(|\bease(?:-in|-out|-in-out)?\b/.test(withoutTokens)) {
					offenders.push(`${file}: ${declaration.replace(/\s+/g, " ")}`);
				}
			}
		}
		expect(offenders).toEqual([]);
	});

	it("uses no raw easing or arbitrary timing utilities in class strings", () => {
		// Markup only: style blocks legitimately mention the `--ease-out-*` tokens
		const markup = (text: string) =>
			text.replace(/<style\b[^>]*>[\s\S]*?<\/style>/g, "").replace(/var\(--[\w-]+\)/g, "");
		const offenders = files
			.filter((f) =>
				/\bease-(?:in|out|linear|in-out)\b|\b(?:duration|delay)-\[/.test(markup(f.text))
			)
			.map((f) => rel(f.path));
		expect(offenders).toEqual([]);
	});

	it("lets elements override the reveal speed only with a shared speed", () => {
		const shared = new Set(["0.15", "0.3", "0.7"]);
		const bad = files.flatMap((f) =>
			[...f.text.matchAll(/--reveal-duration:\s*([\d.]+)/g)]
				.filter((m) => !shared.has(m[1]))
				.map((m) => `${rel(f.path)}: ${m[1]}`)
		);
		expect(bad).toEqual([]);
	});
});

describe("card hover", () => {
	it("has no hand-written copy of the shared card lift in components", () => {
		const offenders = files
			.filter(
				(f) =>
					f.text.includes("motion-safe:hover:-translate-y-0.5") ||
					f.text.includes("transition-[translate,box-shadow,border-color]")
			)
			.map((f) => rel(f.path));
		expect(offenders).toEqual([]);
	});
});
