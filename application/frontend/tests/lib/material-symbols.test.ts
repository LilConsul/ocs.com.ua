import { describe, expect, it } from "bun:test";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import shapes from "@/data/icon-shapes.json";
import icons from "@/data/icons.json";
import { iconShape } from "@/lib/material-symbols";

const SRC = join(import.meta.dir, "../../src");

function sourceFiles(dir: string): string[] {
	return readdirSync(dir).flatMap((name) => {
		const path = join(dir, name);
		if (statSync(path).isDirectory()) return name === "cms" ? [] : sourceFiles(path);
		return /\.(astro|ts|js|css)$/.test(path) ? [path] : [];
	});
}

const files = sourceFiles(SRC).map((path) => ({ path, text: readFileSync(path, "utf8") }));
const fixedNames = files.flatMap((f) =>
	[...f.text.matchAll(/<MaterialIcon\b[^>]*?\bname="([a-z0-9_]+)"/gs)].map((m) => m[1])
);
const category = iconShape("category");

describe("material symbols", () => {
	it("has a shape for every icon the CMS offers", () => {
		const missing = icons
			.map((i) => i.value)
			.filter((name) => name !== "category" && iconShape(name).body === category.body);
		expect(missing).toEqual([]);
	});

	it("falls back to category for an unknown, empty or unsafe name", () => {
		for (const name of [
			"no_such_icon",
			"",
			"../category",
			"category.svg",
			"constructor",
			"__proto__",
		])
			expect(iconShape(name)).toEqual(category);
	});

	it("returns path markup only", () => {
		expect(category.viewBox).toMatch(/^0 -?\d+ \d+ \d+$/);
		expect(category.body).toMatch(/^<path /);
	});

	it("has a shape for every fixed icon in the components", () => {
		expect(fixedNames.length).toBeGreaterThanOrEqual(10);
		expect(
			fixedNames.filter((n) => n !== "category" && iconShape(n).body === category.body)
		).toEqual([]);
	});

	it("icon-shapes.json holds exactly the names needed", () => {
		const needed = [...new Set([...icons.map((i) => i.value), ...fixedNames, "category"])].sort();
		const have = Object.keys(shapes.shapes);
		expect(
			have,
			"src/data/icon-shapes.json is out of date, run: uv run application/frontend/scripts/icon-shapes.py"
		).toEqual(needed);
	});

	it("leaves no icon font behind", () => {
		const offenders = files
			.filter((f) => f.text.includes("material-symbols-outlined"))
			.map((f) => f.path.slice(SRC.length + 1).replaceAll("\\", "/"));
		expect(offenders).toEqual([]);
	});
});
