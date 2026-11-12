import { describe, expect, it } from "bun:test";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const SRC = join(import.meta.dir, "../../src");

function sourceFiles(dir: string): string[] {
	return readdirSync(dir).flatMap((name) => {
		const path = join(dir, name);
		if (statSync(path).isDirectory()) return sourceFiles(path);
		return path.endsWith(".astro") || path.endsWith(".ts") ? [path] : [];
	});
}

const files = sourceFiles(SRC).map((path) => ({
	path: path.slice(SRC.length + 1).replaceAll("\\", "/"),
	text: readFileSync(path, "utf8"),
}));

/**
 * Astro crops a processed picture to the shape of the `width` and `height` it is given (the
 * default `fit` is "cover"). Hand-picked numbers such as 800x600 therefore cut a square product
 * photo at the top and bottom. A picture keeps its shape when it gets only `widths`, or when its
 * width and height are read from the image itself.
 */
describe("processed pictures are never cropped by hand-set dimensions", () => {
	it("<Image> sets width and height only from the image itself", () => {
		const offenders: string[] = [];
		for (const { path, text } of files) {
			for (const tag of text.match(/<Image\b[\s\S]*?\/>/g) ?? []) {
				const width = /\bwidth=\{([^}]*)\}/.exec(tag)?.[1];
				const height = /\bheight=\{([^}]*)\}/.exec(tag)?.[1];
				if (width === undefined && height === undefined) continue;
				const fromImage = (value?: string) => !!value && /\.(width|height)\b|dims\./.test(value);
				if (!(fromImage(width) && fromImage(height)))
					offenders.push(`${path}: ${tag.slice(0, 60)}`);
			}
		}
		expect(offenders).toEqual([]);
	});

	it("getImage is not given both a width and a height", () => {
		const offenders = files
			.filter(({ text }) =>
				(text.match(/getImage\(\{[^}]*\}\)/g) ?? []).some(
					(call) => /\bwidth\b/.test(call) && /\bheight\b/.test(call)
				)
			)
			.map(({ path }) => path);
		expect(offenders).toEqual([]);
	});
});
