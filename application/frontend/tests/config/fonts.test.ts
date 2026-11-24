import { describe, expect, it } from "bun:test";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dir, "../..");
const css = readFileSync(join(ROOT, "src/styles/fonts.css"), "utf8");

function ranges(subset: string): [number, number][] {
	const faces = [...css.matchAll(/src:\s*url\("([^"]+)"\)[^;]*;\s*unicode-range:\s*([^;]+);/g)];
	const list = faces.find((face) => face[1].includes(`-${subset}-`))?.[2] ?? "";
	return list.split(",").map((part) => {
		const [from, to] = part.trim().replace(/U\+/g, "").split("-");
		return [Number.parseInt(from, 16), Number.parseInt(to ?? from, 16)];
	});
}

function walk(dir: string, ext: string[]): string[] {
	return readdirSync(dir).flatMap((name) => {
		const path = join(dir, name);
		if (statSync(path).isDirectory()) return walk(path, ext);
		return ext.some((e) => name.endsWith(e)) ? [path] : [];
	});
}

describe("fonts.css", () => {
	it("has Latin and Cyrillic only, all swap", () => {
		expect(css.match(/@font-face/g)).toHaveLength(8);
		expect(css.match(/font-display: swap/g)).toHaveLength(8);
		expect(css).not.toMatch(/greek|vietnamese|-ext-/);
	});

	it("covers every letter the site uses", () => {
		const covered = [...ranges("latin"), ...ranges("cyrillic")];
		const files = [
			...walk(join(ROOT, "src/content"), [".md"]),
			...walk(join(ROOT, "src/data"), [".json"]),
			...walk(join(ROOT, "locales"), [".po"]),
		];
		const uncovered = new Set<string>();
		for (const file of files) {
			for (const char of readFileSync(file, "utf8").matchAll(/\p{L}/gu)) {
				const code = char[0].codePointAt(0) ?? 0;
				if (!covered.some(([from, to]) => code >= from && code <= to)) {
					uncovered.add(`${char[0]} U+${code.toString(16).toUpperCase()}`);
				}
			}
		}
		expect([...uncovered]).toEqual([]);
	});
});
