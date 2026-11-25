import { describe, expect, it } from "bun:test";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { woff2CodePoints } from "../helpers/woff2";

const ROOT = join(import.meta.dir, "../..");
const css = readFileSync(join(ROOT, "src/styles/fonts.css"), "utf8");
const CORE_DIR = join(ROOT, "src/assets/fonts");

const SUBSETS = ["latin", "cyrillic"] as const;
type Subset = (typeof SUBSETS)[number];

/** What each font file is declared as in fonts.css */
const FONTS = [
	{ name: "inter", family: "Inter Variable", weight: "400 700", pkg: "@fontsource-variable/inter" },
	{
		name: "ibm-plex-sans",
		family: "IBM Plex Sans Variable",
		weight: "400 700",
		pkg: "@fontsource-variable/ibm-plex-sans",
	},
	{
		name: "jetbrains-mono-400",
		family: "JetBrains Mono",
		weight: "400",
		pkg: "@fontsource/jetbrains-mono",
	},
	{
		name: "jetbrains-mono-500",
		family: "JetBrains Mono",
		weight: "500",
		pkg: "@fontsource/jetbrains-mono",
	},
];

interface Face {
	family: string;
	weight: string;
	display: string;
	url: string;
	points: Set<number>;
}

function parseRanges(list: string): Set<number> {
	const points = new Set<number>();
	for (const part of list.split(",")) {
		const [from, to] = part.trim().replace(/U\+/gi, "").split("-");
		const first = Number.parseInt(from, 16);
		const last = Number.parseInt(to ?? from, 16);
		if (Number.isNaN(first) || Number.isNaN(last)) throw new Error(`bad range "${part}"`);
		for (let code = first; code <= last; code++) points.add(code);
	}
	return points;
}

const faces: Face[] = [...css.matchAll(/@font-face\s*\{([^}]*)\}/g)].map(([, body]) => {
	const value = (property: string) => {
		const found = body.match(new RegExp(`(?:^|[\\s;])${property}:\\s*([^;]+);`))?.[1].trim();
		if (!found) throw new Error(`a face has no ${property}: ${body}`);
		return found;
	};
	return {
		family: value("font-family").replace(/"/g, ""),
		weight: value("font-weight"),
		display: value("font-display"),
		url: value("src").match(/url\("([^"]+)"\)/)?.[1] ?? "",
		points: parseRanges(value("unicode-range")),
	};
});

/** The one face of a font file, so a renamed or missing face fails instead of checking nothing */
function face(name: string, subset: Subset, kind: "core" | "rest"): Face {
	const file =
		kind === "core"
			? `/${name}-${subset}-core.woff2?no-inline`
			: name.startsWith("jetbrains-mono-")
				? `/jetbrains-mono-${subset}-${name.slice(-3)}-normal.woff2`
				: `/${name}-${subset}-wght-normal.woff2`;
	const found = faces.filter((f) => f.url.endsWith(file));
	if (found.length !== 1) throw new Error(`${found.length} faces for ${file} in fonts.css`);
	return found[0];
}

const sourcePath = (f: Face) => join(ROOT, "node_modules", f.url);
const corePath = (name: string, subset: Subset) => join(CORE_DIR, `${name}-${subset}-core.woff2`);

const hex = (points: Iterable<number>) =>
	[...points].map((code) => `U+${code.toString(16).toUpperCase().padStart(4, "0")}`);
const missing = (wanted: Iterable<number>, from: Set<number>) =>
	[...wanted].filter((code) => !from.has(code));
const letters = (text: string) => [...text].map((char) => char.codePointAt(0) ?? 0);

const FILES = FONTS.flatMap((font) => SUBSETS.map((subset) => ({ ...font, subset })));

describe("fonts.css", () => {
	it("has a core and a rest face per file, Latin and Cyrillic only, all swap", () => {
		expect(faces).toHaveLength(FILES.length * 2);
		expect(faces.filter((f) => f.display !== "swap")).toEqual([]);
		expect(css).not.toMatch(/greek|vietnamese|-ext-/);
	});

	for (const { name, family, weight, pkg, subset } of FILES) {
		const core = face(name, subset, "core");
		const rest = face(name, subset, "rest");

		it(`${name} ${subset}: both faces declare the same family and weights`, () => {
			for (const f of [core, rest]) {
				expect(f.family).toBe(family);
				// Different weight ranges would keep the browser from combining the two
				expect(f.weight).toBe(weight);
			}
		});

		it(`${name} ${subset}: core and rest split the original range, no gap and no overlap`, () => {
			const unicode = JSON.parse(
				readFileSync(join(ROOT, "node_modules", pkg, "unicode.json"), "utf8")
			);
			const original = parseRanges(unicode[subset]);
			expect(hex([...core.points].filter((code) => rest.points.has(code)))).toEqual([]);
			expect(hex(missing(original, new Set([...core.points, ...rest.points])))).toEqual([]);
			expect(hex(missing([...core.points, ...rest.points], original))).toEqual([]);
		});

		it(`${name} ${subset}: the core file holds its range and nothing else`, () => {
			const inFile = woff2CodePoints(corePath(name, subset));
			const inSource = woff2CodePoints(sourcePath(rest));
			expect(hex(missing(inFile, core.points))).toEqual([]);
			const drawable = [...core.points].filter((code) => inSource.has(code));
			expect(hex(missing(drawable, inFile))).toEqual([]);
		});
	}

	it("covers the whole English and Ukrainian alphabets in the core", () => {
		const english = "abcdefghijklmnopqrstuvwxyz";
		const ukrainian = "абвгґдеєжзиіїйклмнопрстуфхцчшщьюя";
		expect(letters(ukrainian)).toHaveLength(33);
		for (const { name } of FONTS) {
			const latin = face(name, "latin", "core").points;
			const cyrillic = face(name, "cyrillic", "core").points;
			expect(hex(missing(letters(english + english.toUpperCase()), latin))).toEqual([]);
			expect(hex(missing(letters(ukrainian + ukrainian.toUpperCase()), cyrillic))).toEqual([]);
			expect(
				hex(missing(letters("0123456789 '’ʼ«»„“”–—№"), new Set([...latin, ...cyrillic])))
			).toEqual([]);
		}
	});

	// Interface text only. Content and data are the editors', and a CMS publish is a deploy: a letter
	// of another script there (an ohm sign, a name with a stroke) shows in a system font, it must not
	// stop the release.
	it("covers every character of the interface text", () => {
		const dir = join(ROOT, "locales");
		const files = readdirSync(dir).filter((file) => file.endsWith(".po"));
		expect(files.length).toBeGreaterThan(0);
		const used = new Set(files.flatMap((file) => letters(readFileSync(join(dir, file), "utf8"))));
		expect(used.size).toBeGreaterThan(100);
		for (const { name } of FONTS) {
			const covered = SUBSETS.flatMap((subset) => [
				...face(name, subset, "core").points,
				...face(name, subset, "rest").points,
			]);
			expect(hex(missing(used, new Set(covered)))).toEqual([]);
		}
	});
});

describe("core font files", () => {
	it("are exactly the ones fonts.css declares", () => {
		const expected = FILES.map(({ name, subset }) => `${name}-${subset}-core.woff2`);
		expect(readdirSync(CORE_DIR).sort()).toEqual(expected.sort());
	});

	it("are smaller than their sources and stay within the page budget", () => {
		const size = (path: string) => statSync(path).size;
		const total = { latin: 0, cyrillic: 0 };
		for (const { name, subset } of FILES) {
			const core = size(corePath(name, subset));
			expect(core).toBeLessThan(0.82 * size(sourcePath(face(name, subset, "rest"))));
			// Pages without article code blocks use one weight of the mono font
			if (name !== "jetbrains-mono-400") total[subset] += core;
		}
		expect(total.latin).toBeLessThan(65_000);
		expect(total.cyrillic).toBeLessThan(40_000);
	});
});
