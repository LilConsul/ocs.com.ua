import { describe, expect, it } from "bun:test";
import type { EquipmentEntry } from "@/lib/content-utils";
import { getCategoriesForLocale, getIndustriesForLocale } from "@/lib/content-utils";
import { getPrivacyPolicySource, getTermsOfUseSource } from "@/lib/legal/document";
import {
	aboutMarkdown,
	buildLlmsFullTxt,
	buildLlmsTxt,
	categoryMarkdown,
	contactMarkdown,
	homeMarkdown,
	industryMarkdown,
	markdownPath,
	privacyMarkdown,
	productMarkdown,
	termsMarkdown,
	wikiIndexMarkdown,
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

	it("links the Markdown copy of every kind of page and the full-text file", () => {
		for (const path of [
			"/ua/index.md",
			"/ua/catalogue/equipment/checkweigher.md",
			"/ua/catalogue/industry/food-beverage.md",
			"/ua/wiki.md",
			"/ua/about.md",
			"/ua/contact.md",
			"/ua/privacy.md",
			"/ua/terms.md",
			"/en/index.md",
			"/en/terms.md",
		]) {
			expect(txt).toContain(`${SITE}${path})`);
		}
		expect(txt).toContain(`${SITE}/llms-full.txt`);
	});

	it("links no HTML page directly", () => {
		const urls = [...txt.matchAll(/\]\((https?:[^)]+)\)/g)].map((m) => m[1]);
		expect(urls.length).toBeGreaterThan(0);
		for (const url of urls) expect(url.endsWith(".md")).toBe(true);
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
		expect(md).toContain(`(${SITE}/ua/wiki/weighing-accuracy/)`);
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
		expect(md).toContain(`(${SITE}/ua/wiki/d/)`);
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

describe("Markdown copies of the remaining pages", () => {
	it("maps every localized page path to its copy and skips error pages", () => {
		expect(markdownPath("/ua/")).toBe("/ua/index.md");
		expect(markdownPath("/en")).toBe("/en/index.md");
		expect(markdownPath("/ua/about")).toBe("/ua/about.md");
		expect(markdownPath("/ua/wiki/")).toBe("/ua/wiki.md");
		expect(markdownPath("/ua/catalogue/equipment/checkweigher/hc-a/")).toBe(
			"/ua/catalogue/equipment/checkweigher/hc-a.md"
		);
		expect(markdownPath("/404")).toBeUndefined();
		expect(markdownPath("/admin/")).toBeUndefined();
	});

	it("home: company, contacts and links to every section", () => {
		const md = homeMarkdown("ua", content);
		expect(md.startsWith("# ОС-Технолоджи Україна")).toBe(true);
		expect(md).toContain("info@ocs.com.ua");
		expect(md).toContain(`${SITE}/ua/catalogue/equipment/checkweigher/hc-a.md`);
		expect(md).toContain(`${SITE}/ua/wiki/load-cell.md`);
	});

	it("category: description and its products only", () => {
		const md = categoryMarkdown(
			{ slug: "checkweigher", title: "Ваги", description: "Опис ваг", icon: "scale" },
			"ua",
			equipment,
			SITE
		);
		expect(md.startsWith("# Ваги\n")).toBe(true);
		expect(md).toContain(`: ${SITE}/ua/catalogue/equipment/checkweigher/\n`);
		expect(md).toContain(`- [Ваги HC-A](${SITE}/ua/catalogue/equipment/checkweigher/hc-a.md)`);
		expect(md).not.toContain("/en/");
	});

	it("wiki index: every article of the language", () => {
		const md = wikiIndexMarkdown("en", wiki, SITE);
		expect(md).toContain(`- [Load cell](${SITE}/en/wiki/load-cell.md): About load cells`);
		expect(md).not.toContain("/ua/wiki/");
	});

	it("contact: person, phone, email, address and profiles", () => {
		const md = contactMarkdown("ua", SITE);
		for (const t of ["Георгій Шевченко", "+38 067 35 33 853", "info@ocs.com.ua", "Київ"]) {
			expect(md).toContain(t);
		}
		expect(md).toContain("https://www.facebook.com/ocs.com.ua");
	});

	it("privacy and terms: every section of the document, in order", () => {
		for (const [md, source] of [
			[privacyMarkdown("ua", SITE), getPrivacyPolicySource("ua")],
			[termsMarkdown("en", SITE), getTermsOfUseSource("en")],
		] as const) {
			expect(md).toContain(source.effectiveDate);
			let last = -1;
			source.sections.forEach((s, i) => {
				const at = md.indexOf(`## ${i + 1}. ${s.title}`);
				expect(at).toBeGreaterThan(last);
				last = at;
			});
			expect(md).not.toContain("{email}");
			expect(md).not.toContain("{address}");
		}
	});

	it("llms-full.txt includes the contact page and both legal documents", () => {
		const full = buildLlmsFullTxt(content);
		const _ = getPrivacyPolicySource("ua").sections[0].title;
		expect(full).toContain(`## 1. ${_}`);
		expect(full).toContain("Георгій Шевченко");
	});
});

describe("llms.txt coverage", () => {
	it("links every equipment category, also those without products", () => {
		const txt = buildLlmsTxt(content);
		for (const lang of ["ua", "en"] as const) {
			for (const c of getCategoriesForLocale(lang)) {
				expect(txt).toContain(`${SITE}/${lang}/catalogue/equipment/${c.slug}.md)`);
			}
		}
	});
});

describe("page links in the Markdown copies", () => {
	it("end with a slash, so they hit the page without a redirect", () => {
		const docs = [
			buildLlmsFullTxt(content),
			homeMarkdown("ua", content),
			wikiIndexMarkdown("ua", wiki, SITE),
		];
		for (const doc of docs) {
			for (const [url] of doc.matchAll(/https:\/\/ocs\.com\.ua\/[^\s)]*/g)) {
				const last = url.split("/").pop() ?? "";
				if (!last.includes(".")) expect(url.endsWith("/")).toBe(true);
			}
		}
	});
});
