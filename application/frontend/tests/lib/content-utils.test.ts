import { describe, expect, it } from "bun:test";
import {
	type EquipmentEntry,
	type EquipmentType,
	filterByCategory,
	filterByIndustry,
	filterByLocale,
	findTranslation,
	getCategories,
	getCategoriesForLocale,
	getCategory,
	getIndustriesForLocale,
	getLocale,
	getProducts,
	getSlug,
	groupByCategory,
	isCategory,
	isProduct,
	sortByOrder,
} from "@/lib/content-utils";

// The glob loader strips the dot before the locale, so "hc-sl.en.md" has the id "hc-slen"
const entry = (id: string, order?: number) =>
	({ id, data: order === undefined ? {} : { order } }) as unknown as EquipmentEntry;

const all = [
	entry("catchweigher/hc-slen", 2),
	entry("catchweigher/hc-slua", 2),
	entry("catchweigher/_indexen", 1),
	entry("checkweigher/hc-men", 5),
	entry("checkweigher/hc-mua", 5),
	entry("checkweigher/ec-een"),
];

describe("entry id parsing", () => {
	it("reads the locale from the id suffix", () => {
		expect(getLocale(entry("catchweigher/hc-slen"))).toBe("en");
		expect(getLocale(entry("catchweigher/hc-slua"))).toBe("ua");
	});

	it("defaults to en when there is no known suffix", () => {
		expect(getLocale(entry("catchweigher/hc-sl"))).toBe("en");
	});

	it("extracts the slug without category and locale", () => {
		expect(getSlug(entry("catchweigher/hc-slen"))).toBe("hc-sl");
		expect(getSlug(entry("checkweigher/ec-eua"))).toBe("ec-e");
	});

	it("extracts the category", () => {
		expect(getCategory(entry("checkweigher/hc-men"))).toBe("checkweigher");
	});

	it("tells categories (_index) from products", () => {
		expect(isCategory(entry("catchweigher/_indexen"))).toBe(true);
		expect(isProduct(entry("catchweigher/_indexen"))).toBe(false);
		expect(isProduct(entry("catchweigher/hc-slen"))).toBe(true);
	});
});

describe("entry filtering", () => {
	it("filters by locale", () => {
		expect(filterByLocale(all, "ua").map((e) => e.id)).toEqual([
			"catchweigher/hc-slua",
			"checkweigher/hc-mua",
		]);
	});

	it("filters by category", () => {
		expect(filterByCategory(all, "checkweigher")).toHaveLength(3);
	});

	it("splits products and categories", () => {
		expect(getProducts(all)).toHaveLength(5);
		expect(getCategories(all)).toHaveLength(1);
	});
});

describe("findTranslation", () => {
	it("finds the same product in another locale", () => {
		const found = findTranslation(entry("catchweigher/hc-slen"), "ua", all);
		expect(found?.id).toBe("catchweigher/hc-slua");
	});

	it("returns undefined when the translation does not exist", () => {
		expect(findTranslation(entry("checkweigher/ec-een"), "ua", all)).toBeUndefined();
	});
});

describe("sortByOrder", () => {
	it("sorts ascending and puts entries without order last", () => {
		const sorted = sortByOrder([entry("a", 3), entry("b"), entry("c", 1)]).map((e) => e.id);
		expect(sorted).toEqual(["c", "a", "b"]);
	});

	it("does not mutate the input", () => {
		const input = [entry("a", 2), entry("b", 1)];
		sortByOrder(input);
		expect(input[0].id).toBe("a");
	});

	it("returns an empty array for empty or invalid input", () => {
		expect(sortByOrder([])).toEqual([]);
		expect(sortByOrder(undefined as unknown as EquipmentEntry[])).toEqual([]);
	});
});

describe("getCategoriesForLocale", () => {
	it("returns categories with slug and title for both locales", () => {
		for (const locale of ["en", "ua"] as const) {
			const categories = getCategoriesForLocale(locale);
			expect(categories.length).toBeGreaterThan(0);
			for (const c of categories) {
				expect(c.slug).toBeTruthy();
				expect(c.title).toBeTruthy();
			}
		}
	});
});

describe("getIndustriesForLocale", () => {
	it("returns industries with slug, title and icon for both locales", () => {
		for (const locale of ["en", "ua"] as const) {
			const industries = getIndustriesForLocale(locale);
			expect(industries.length).toBeGreaterThan(0);
			for (const i of industries) {
				expect(i.slug).toBeTruthy();
				expect(i.title).toBeTruthy();
				expect(i.icon).toBeTruthy();
			}
		}
	});
});

describe("filterByIndustry", () => {
	const tagged = (id: string, industries?: string[]) =>
		({ id, data: { industries } }) as unknown as EquipmentEntry;

	// EN entries have no industries; UA counterparts carry the tags (i18n: false pattern)
	const allEntries = [
		tagged("checkweigher/hc-mua", ["food-beverage", "pharmaceutical"]),
		tagged("checkweigher/hc-men"),
		tagged("catchweigher/hc-slua", ["logistics"]),
		tagged("catchweigher/hc-slen"),
		tagged("checkweigher/ec-een"),
	];

	const localeEn = [
		tagged("checkweigher/hc-men"),
		tagged("catchweigher/hc-slen"),
		tagged("checkweigher/ec-een"),
	];

	it("keeps products tagged with the industry, including multi-tagged ones", () => {
		expect(filterByIndustry(localeEn, "pharmaceutical", allEntries).map((e) => e.id)).toEqual([
			"checkweigher/hc-men",
		]);
		expect(filterByIndustry(localeEn, "food-beverage", allEntries)).toHaveLength(1);
	});

	it("falls back to the ua file when the en entry has no industries", () => {
		expect(filterByIndustry(localeEn, "logistics", allEntries).map((e) => e.id)).toEqual([
			"catchweigher/hc-slen",
		]);
	});

	it("ignores products whose ua counterpart has no industries either", () => {
		expect(filterByIndustry(localeEn, "logistics", allEntries.slice(0, 2))).toEqual([]);
	});

	it("returns an empty array for an unknown industry", () => {
		expect(filterByIndustry(localeEn, "chemical", allEntries)).toEqual([]);
	});
});

describe("groupByCategory", () => {
	const category = (slug: string): EquipmentType => ({
		slug,
		title: slug.toUpperCase(),
		description: "",
		icon: "category",
	});
	const categories = [category("checkweigher"), category("catchweigher"), category("metal")];

	const products = [
		entry("catchweigher/hc-slen", 2),
		entry("checkweigher/a-en", 5),
		entry("checkweigher/b-en", 1),
	];

	it("groups in category order and omits categories without products", () => {
		const groups = groupByCategory(products, categories);
		expect(groups.map((g) => g.category.slug)).toEqual(["checkweigher", "catchweigher"]);
	});

	it("sorts products inside a group by order", () => {
		const groups = groupByCategory(products, categories);
		expect(groups[0].products.map((e) => e.id)).toEqual(["checkweigher/b-en", "checkweigher/a-en"]);
	});
});
