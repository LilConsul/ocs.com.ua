import { describe, expect, it } from "bun:test";
import {
	calculateReadingMinutes,
	filterWikiByLocale,
	findWikiTranslation,
	getWikiCoverImage,
	getWikiLocale,
	getWikiSlug,
	sortWikiArticles,
	type WikiEntry,
} from "@/lib/wiki-utils";

const makeEntry = (id: string, data: Partial<WikiEntry["data"]> = {}): WikiEntry =>
	({
		id,
		data: {
			title: data.title ?? "Test Article",
			description: data.description,
			coverImage: data.coverImage,
			order: data.order,
			related: data.related,
		},
		body: "",
	}) as unknown as WikiEntry;

const sampleEntries: WikiEntry[] = [
	makeEntry("choosing-a-dynamic-checkweigheren", { title: "Choosing a Checkweigher", order: 2 }),
	makeEntry("choosing-a-dynamic-checkweigherua", {
		title: "Як обрати чеквеєр",
		order: 2,
		coverImage: "/assets/checkweigher-cover.webp",
	}),
	makeEntry("checkweigher-calibrationen", { title: "Calibration", order: 1 }),
	makeEntry("checkweigher-calibrationua", { title: "Калібрування", order: 1 }),
	makeEntry("metal-detector-sensitivityen", { title: "Sensitivity", order: undefined }),
];

describe("wiki-utils: getWikiLocale", () => {
	it("extracts en and ua from entry ID suffixes", () => {
		expect(getWikiLocale(sampleEntries[0])).toBe("en");
		expect(getWikiLocale(sampleEntries[1])).toBe("ua");
	});

	it("defaults to en when no recognizable suffix exists", () => {
		expect(getWikiLocale(makeEntry("article-without-suffix"))).toBe("en");
	});
});

describe("wiki-utils: getWikiSlug", () => {
	it("extracts the base slug without locale suffix", () => {
		expect(getWikiSlug(sampleEntries[0])).toBe("choosing-a-dynamic-checkweigher");
		expect(getWikiSlug(sampleEntries[1])).toBe("choosing-a-dynamic-checkweigher");
		expect(getWikiSlug(sampleEntries[2])).toBe("checkweigher-calibration");
	});
});

describe("wiki-utils: filterWikiByLocale", () => {
	it("filters articles matching the requested locale", () => {
		const uaArticles = filterWikiByLocale(sampleEntries, "ua");
		expect(uaArticles.map((e) => e.id)).toEqual([
			"choosing-a-dynamic-checkweigherua",
			"checkweigher-calibrationua",
		]);

		const enArticles = filterWikiByLocale(sampleEntries, "en");
		expect(enArticles.map((e) => e.id)).toEqual([
			"choosing-a-dynamic-checkweigheren",
			"checkweigher-calibrationen",
			"metal-detector-sensitivityen",
		]);
	});
});

describe("wiki-utils: sortWikiArticles", () => {
	it("sorts primarily by order ascending, then by title", () => {
		const sorted = sortWikiArticles(sampleEntries);
		expect(sorted.map((e) => e.id)).toEqual([
			"checkweigher-calibrationen",
			"checkweigher-calibrationua",
			"choosing-a-dynamic-checkweigheren",
			"choosing-a-dynamic-checkweigherua",
			"metal-detector-sensitivityen",
		]);
	});

	it("does not mutate original array", () => {
		const copy = [...sampleEntries];
		sortWikiArticles(copy);
		expect(copy[0].id).toBe(sampleEntries[0].id);
	});
});

describe("wiki-utils: calculateReadingMinutes", () => {
	it("returns minimum 1 minute for short text or empty content", () => {
		expect(calculateReadingMinutes("")).toBe(1);
		expect(calculateReadingMinutes("Short sentence.")).toBe(1);
	});

	it("calculates reading minutes assuming ~200 words per minute", () => {
		const text = new Array(400).fill("word").join(" ");
		expect(calculateReadingMinutes(text)).toBe(2);

		const text650 = new Array(650).fill("word").join(" ");
		expect(calculateReadingMinutes(text650)).toBe(4); // ceil(650 / 200) = 4
	});
});

describe("wiki-utils: findWikiTranslation", () => {
	it("finds the counterpart translation in allEntries", () => {
		const translation = findWikiTranslation(sampleEntries[0], "ua", sampleEntries);
		expect(translation?.id).toBe("choosing-a-dynamic-checkweigherua");
	});

	it("returns undefined if target translation does not exist", () => {
		const translation = findWikiTranslation(sampleEntries[4], "ua", sampleEntries);
		expect(translation).toBeUndefined();
	});
});

describe("wiki-utils: getWikiCoverImage", () => {
	it("returns direct cover image if defined", () => {
		expect(getWikiCoverImage(sampleEntries[1], sampleEntries)).toBe(
			"/assets/checkweigher-cover.webp"
		);
	});

	it("falls back to default ua locale cover image when current locale has none", () => {
		expect(getWikiCoverImage(sampleEntries[0], sampleEntries)).toBe(
			"/assets/checkweigher-cover.webp"
		);
	});
});
