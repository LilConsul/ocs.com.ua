import { describe, expect, it } from "bun:test";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { parse } from "yaml";
import { collections } from "@/content.config";
import documentsData from "@/data/documents.json";
import equipmentTypes from "@/data/equipment-types.json";
import icons from "@/data/icons.json";
import { getInlineTranslations } from "@/i18n/inline";
import { EQUIPMENT_SLUGS, SECTORS } from "@/lib/contact/options";

const CONTENT_DIR = join(import.meta.dir, "../../src/content/equipment");

function walk(dir: string): string[] {
	return readdirSync(dir, { withFileTypes: true }).flatMap((d) =>
		d.isDirectory() ? walk(join(dir, d.name)) : [join(dir, d.name)]
	);
}

const files = walk(CONTENT_DIR)
	.filter((f) => f.endsWith(".md"))
	.map((f) => relative(CONTENT_DIR, f).replaceAll("\\", "/"));

const frontmatter = (file: string) => {
	const raw = readFileSync(join(CONTENT_DIR, file), "utf8");
	const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
	if (!match) throw new Error(`${file}: missing frontmatter`);
	return parse(match[1]);
};

describe("equipment content", () => {
	it("finds content files", () => {
		expect(files.length).toBeGreaterThan(0);
	});

	it("names every file <slug>.<en|ua>.md", () => {
		const bad = files.filter((f) => !/^[a-z0-9-]+\/_?[a-z0-9-]+\.(en|ua)\.md$/.test(f));
		expect(bad).toEqual([]);
	});

	it("has a translation for every file (en <-> ua)", () => {
		const set = new Set(files);
		const missing = files
			.map((f) => f.replace(/\.(en|ua)\.md$/, (_m, l) => `.${l === "en" ? "ua" : "en"}.md`))
			.filter((counterpart) => !set.has(counterpart));
		expect(missing).toEqual([]);
	});

	it("keeps every product in a folder that is a known category slug", () => {
		const slugs = new Set(equipmentTypes.en.categories.map((c) => c.slug));
		const unknown = files.map((f) => f.split("/")[0]).filter((dir) => !slugs.has(dir));
		expect(unknown).toEqual([]);
	});

	it("matches the content schema", () => {
		const schema = (collections.equipment as any).schema;
		const failures = files
			.map((f) => ({ f, result: schema.safeParse(frontmatter(f)) }))
			.filter(({ result }) => !result.success)
			.map(({ f, result }) => `${f}: ${result.error.issues.map((i: any) => i.message).join("; ")}`);
		expect(failures).toEqual([]);
	});

	it("uses the same order and industries in both languages of a product", () => {
		const mismatched = files
			.filter((f) => f.endsWith(".en.md"))
			.filter((f) => {
				const en = frontmatter(f);
				const ua = frontmatter(f.replace(".en.md", ".ua.md"));
				return (
					en.order !== ua.order ||
					JSON.stringify(en.industries ?? []) !== JSON.stringify(ua.industries ?? [])
				);
			});
		expect(mismatched).toEqual([]);
	});
});

describe("equipment categories data", () => {
	it("has the same slugs in the same order in en and ua", () => {
		expect(equipmentTypes.ua.categories.map((c) => c.slug)).toEqual(
			equipmentTypes.en.categories.map((c) => c.slug)
		);
	});

	it("has unique slugs", () => {
		const slugs = equipmentTypes.en.categories.map((c) => c.slug);
		expect(new Set(slugs).size).toBe(slugs.length);
	});

	it("only references icons that exist in icons.json", () => {
		const known = new Set(icons.map((i) => i.value));
		const unknown = [...equipmentTypes.en.categories, ...equipmentTypes.ua.categories]
			.map((c) => c.icon)
			.filter((icon) => !known.has(icon));
		expect(unknown).toEqual([]);
	});

	it("has a title and description for every category", () => {
		for (const c of [...equipmentTypes.en.categories, ...equipmentTypes.ua.categories]) {
			expect(c.title.trim()).not.toBe("");
			expect(c.description.trim()).not.toBe("");
		}
	});
});

describe("contact form options", () => {
	it("offers only equipment slugs that exist (checkweigher covers catchweigher)", () => {
		const slugs = new Set(equipmentTypes.en.categories.map((c) => c.slug));
		expect(EQUIPMENT_SLUGS.filter((s) => !slugs.has(s))).toEqual([]);
	});

	it("covers every category except the merged catchweigher", () => {
		const expected = equipmentTypes.en.categories
			.map((c) => c.slug)
			.filter((s) => s !== "catchweigher")
			.sort();
		expect([...EQUIPMENT_SLUGS].sort()).toEqual(expected);
	});

	it("has a Ukrainian translation for every sector (used in the email)", () => {
		const t = getInlineTranslations("ua");
		const untranslated = SECTORS.filter((s) => t(s) === s);
		expect(untranslated).toEqual([]);
	});
});

describe("authorization documents data", () => {
	it("has wipotec and mesutronic string keys", () => {
		expect(typeof documentsData.wipotec).toBe("string");
		expect(typeof documentsData.mesutronic).toBe("string");
	});

	it("points to files that exist when path is non-empty", () => {
		const publicDir = join(import.meta.dir, "../../public");
		for (const [, path] of Object.entries(documentsData)) {
			if (path) {
				const filePath = join(publicDir, path);
				const exists = existsSync(filePath);
				expect(exists).toBe(true);
			}
		}
	});
});

describe("decap cms documents collection", () => {
	it("configures documents file collection in _config.template.yml", () => {
		const templatePath = join(import.meta.dir, "../../src/pages/admin/_config.template.yml");
		const raw = readFileSync(templatePath, "utf8");
		// Replace template tokens with dummy values so it parses valid YAML
		const parsed = parse(raw.replace(/__[A-Z0-9_]+__/g, '""'));
		const documentsCollection = parsed.collections?.find((c: any) => c.name === "documents");
		expect(documentsCollection).toBeDefined();
		expect(documentsCollection.label).toBe("Documents");
		expect(documentsCollection.files?.[0]?.name).toBe("authorization-letters");
		expect(documentsCollection.files?.[0]?.file).toBe("application/frontend/src/data/documents.json");
		expect(documentsCollection.files?.[0]?.media_folder).toBe("application/frontend/public/assets/documents");
		expect(documentsCollection.files?.[0]?.public_folder).toBe("/assets/documents");
	});
});
