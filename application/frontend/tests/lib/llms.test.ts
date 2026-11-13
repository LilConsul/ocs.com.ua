import { describe, expect, it } from "bun:test";
import type { EquipmentEntry } from "@/lib/content-utils";
import { getIndustriesForLocale } from "@/lib/content-utils";
import {
	aboutMarkdown,
	buildLlmsFullTxt,
	buildLlmsTxt,
	industryMarkdown,
	productMarkdown,
	wikiMarkdown,
} from "@/lib/llms";
import type { WikiEntry } from "@/lib/wiki-utils";

const SITE = "https://ocs.com.ua";

const product = (id: string, data: Record<string, unknown>, body = "") =>
	({ id, data, body }) as unknown as EquipmentEntry;
const article = (id: string, data: Record<string, unknown>, body = "") =>
	({ id, data, body }) as unknown as WikiEntry;

const equipment = [
	product(
		"checkweigher/hc-aua",
		{
			title: "Ваги HC-A",
			description: "Опис\n  HC-A",
			manufacturer: "Wipotec",
			industries: ["food-beverage"],
			specs: [{ title: "Зважування", items: [{ label: "Швидкість", value: "150 | 200" }] }],
		},
		"Див. [точність](/ua/wiki/weighing-accuracy)."
	),
	product("checkweigher/hc-aen", { title: "HC-A Checkweigher", description: "HC-A text" }),
	product("checkweigher/_indexua", { title: "Category file" }),
];

const wiki = [
	article(
		"load-cellua",
		{ title: "Датчик ваги", description: "Про датчик" },
		"Текст [d](/ua/wiki/d)."
	),
	article("load-cellen", { title: "Load cell", description: "About load cells" }, "Body"),
];

const content = { site: SITE, equipment, wiki };

describe("llms.txt", () => {
	const txt = buildLlmsTxt(content);

	it("starts with the Ukrainian company name as the H1 and a summary blockquote", () => {
		const lines = txt.split("\n");
		expect(lines[0]).toBe("# ОС-Технолоджи Україна (OS-Technology Ukraine)");
		expect(lines[2].startsWith("> ")).toBe(true);
	});

	it("links each product and article to its Markdown copy with a one-line description", () => {
		expect(txt).toContain(
			`- [Ваги HC-A](${SITE}/ua/catalogue/equipment/checkweigher/hc-a.md): Опис HC-A`
		);
		expect(txt).toContain(`- [Датчик ваги](${SITE}/ua/wiki/load-cell.md): Про датчик`);
	});

	it("lists Ukrainian before English and leaves category files out", () => {
		expect(txt.indexOf("/ua/wiki/load-cell.md")).toBeLessThan(txt.indexOf("/en/wiki/load-cell.md"));
		expect(txt).toContain(
			`- [HC-A Checkweigher](${SITE}/en/catalogue/equipment/checkweigher/hc-a.md)`
		);
		expect(txt).not.toContain("Category file");
		expect(txt).not.toContain("_index");
	});

	it("links industries, about, contact and the full-text file", () => {
		expect(txt).toContain(`${SITE}/ua/catalogue/industry/food-beverage.md)`);
		expect(txt).toContain(`${SITE}/ua/about.md)`);
		expect(txt).toContain(`${SITE}/ua/contact)`);
		expect(txt).toContain(`${SITE}/llms-full.txt`);
	});

	it("never points at the CMS or the API", () => {
		expect(txt).not.toContain("/admin");
		expect(txt).not.toContain("/api/");
	});

	it("follows the configured site", () => {
		expect(buildLlmsTxt({ ...content, site: "https://dev.ocs.com.ua" })).toContain(
			"https://dev.ocs.com.ua/ua/wiki/load-cell.md"
		);
	});
});

describe("product Markdown copy", () => {
	const md = productMarkdown(equipment[0], equipment, SITE);

	it("has the title, page link, category, manufacturer and industries", () => {
		expect(md.startsWith("# Ваги HC-A\n")).toBe(true);
		expect(md).toContain(`${SITE}/ua/catalogue/equipment/checkweigher/hc-a`);
		expect(md).toContain("Wipotec");
		expect(md).toContain(`${SITE}/ua/catalogue/industry/food-beverage`);
	});

	it("renders specs as a table per group with pipes escaped", () => {
		expect(md).toContain("### Зважування\n\n| | |\n| --- | --- |\n");
		expect(md).toContain("| Швидкість | 150 \\| 200 |");
	});

	it("makes root-relative links in the body absolute", () => {
		expect(md).toContain(`(${SITE}/ua/wiki/weighing-accuracy)`);
	});

	it("takes industries from the Ukrainian file for an English product", () => {
		expect(productMarkdown(equipment[1], equipment, SITE)).toContain(
			`${SITE}/en/catalogue/industry/food-beverage`
		);
	});
});

describe("wiki Markdown copy and llms-full.txt", () => {
	it("renders an article with its canonical page and absolute links", () => {
		const md = wikiMarkdown(wiki[0], SITE);
		expect(md.startsWith("# Датчик ваги\n")).toBe(true);
		expect(md).toContain(`${SITE}/ua/wiki/load-cell`);
		expect(md).toContain(`(${SITE}/ua/wiki/d)`);
	});

	it("contains every product and article, Ukrainian first", () => {
		const full = buildLlmsFullTxt(content);
		for (const t of ["# Ваги HC-A", "# HC-A Checkweigher", "# Датчик ваги", "# Load cell"]) {
			expect(full).toContain(t);
		}
		expect(full.indexOf("# Ваги HC-A")).toBeLessThan(full.indexOf("# HC-A Checkweigher"));
		expect(full.endsWith("\n")).toBe(true);
	});
});

describe("industry Markdown copy", () => {
	const food = getIndustriesForLocale("ua").find((i) => i.slug === "food-beverage");
	if (!food) throw new Error("food-beverage industry missing from industries.json");
	const pharma = getIndustriesForLocale("ua").find((i) => i.slug === "pharmaceutical");
	if (!pharma) throw new Error("pharmaceutical industry missing from industries.json");

	it("lists the products tagged with the industry, linked to their Markdown copies", () => {
		const md = industryMarkdown(food, "ua", equipment, SITE);
		expect(md.startsWith(`# ${food.title}\n`)).toBe(true);
		expect(md).toContain(`${SITE}/ua/catalogue/industry/food-beverage`);
		expect(md).toContain(`- [Ваги HC-A](${SITE}/ua/catalogue/equipment/checkweigher/hc-a.md)`);
		expect(md).toContain("info@ocs.com.ua");
	});

	it("leaves out the equipment section when no product is tagged", () => {
		expect(industryMarkdown(pharma, "ua", equipment, SITE)).not.toContain("hc-a.md");
	});

	it("takes the tags from the Ukrainian file for English products", () => {
		const en = getIndustriesForLocale("en").find((i) => i.slug === "food-beverage");
		if (!en) throw new Error("food-beverage industry missing from industries.json");
		expect(industryMarkdown(en, "en", equipment, SITE)).toContain(
			`${SITE}/en/catalogue/equipment/checkweigher/hc-a.md`
		);
	});
});

describe("About Markdown copy", () => {
	const ua = aboutMarkdown("ua", SITE);
	const en = aboutMarkdown("en", SITE);

	it("names the company and both manufacturers", () => {
		expect(ua.startsWith("# ОС-Технолоджи Україна\n")).toBe(true);
		expect(en.startsWith("# OS-Technology Ukraine\n")).toBe(true);
		for (const md of [ua, en]) {
			expect(md).toContain("### WIPOTEC GmbH");
			expect(md).toContain("### MESUTRONIC Gerätebau GmbH");
		}
	});

	it("lists clients by name with their websites", () => {
		expect(ua).toContain("- [Рошен](https://roshen.com)");
		expect(en).toContain("- [Roshen](https://roshen.com)");
	});

	it("keeps per-client equipment counts out", () => {
		expect(en).not.toMatch(/Roshen\]\([^)]*\)\s*[:(\d]/);
	});

	it("contains no soft hyphens", () => {
		expect(ua).not.toContain("­");
	});
});
