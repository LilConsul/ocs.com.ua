import { describe, expect, it } from "bun:test";
import type { EquipmentEntry, EquipmentType } from "@/lib/content-utils";
import { getFeaturedGroups } from "@/lib/featured-equipment";

// The glob loader strips the dot before the locale, so "hc-a.en.md" has the id "hc-aen"
const entry = (id: string, order?: number) =>
	({ id, data: order === undefined ? {} : { order } }) as unknown as EquipmentEntry;

const category = (slug: string): EquipmentType => ({
	slug,
	title: slug,
	description: "",
	icon: "scale",
});

const categories = [
	category("checkweigher"),
	category("catchweigher"),
	category("track-and-trace"),
];

const ids = (entries: EquipmentEntry[]) => entries.map((e) => e.id);

describe("getFeaturedGroups", () => {
	it("skips categories with no products", () => {
		const entries = [entry("checkweigher/hc-aen", 1)];
		const groups = getFeaturedGroups(entries, "en", categories);
		expect(groups.map((g) => g.category.slug)).toEqual(["checkweigher"]);
	});

	it("orders products by order, then by slug", () => {
		const entries = [
			entry("checkweigher/zen", 2),
			entry("checkweigher/ben", 1),
			entry("checkweigher/aen", 1),
			entry("checkweigher/noorderen"),
		];
		const [group] = getFeaturedGroups(entries, "en", categories);
		expect(group.spotlight.id).toBe("checkweigher/aen");
		expect(ids(group.others)).toEqual([
			"checkweigher/ben",
			"checkweigher/zen",
			"checkweigher/noorderen",
		]);
	});

	it("excludes category index entries and other locales", () => {
		const entries = [
			entry("checkweigher/_indexen", 0),
			entry("checkweigher/hc-aua", 1),
			entry("checkweigher/hc-men", 2),
		];
		const [group] = getFeaturedGroups(entries, "en", categories);
		expect(group.spotlight.id).toBe("checkweigher/hc-men");
		expect(group.others).toEqual([]);
	});

	it("gives a spotlight and no others for a single product", () => {
		const [group] = getFeaturedGroups([entry("catchweigher/hc-slen", 1)], "en", categories);
		expect(group.spotlight.id).toBe("catchweigher/hc-slen");
		expect(group.others).toEqual([]);
	});

	it("gives one other for two products", () => {
		const entries = [entry("catchweigher/aen", 1), entry("catchweigher/ben", 2)];
		const [group] = getFeaturedGroups(entries, "en", categories);
		expect(ids(group.others)).toEqual(["catchweigher/ben"]);
	});

	it("caps others at listSize (default 3)", () => {
		const entries = ["a", "b", "c", "d", "e", "f"].map((n, i) => entry(`checkweigher/${n}en`, i));
		const [group] = getFeaturedGroups(entries, "en", categories);
		expect(group.others).toHaveLength(3);
		const [small] = getFeaturedGroups(entries, "en", categories, 2);
		expect(small.others).toHaveLength(2);
	});

	it("keeps the order of the categories argument", () => {
		const entries = [entry("catchweigher/aen", 1), entry("checkweigher/ben", 1)];
		const groups = getFeaturedGroups(entries, "en", categories);
		expect(groups.map((g) => g.category.slug)).toEqual(["checkweigher", "catchweigher"]);
	});
});
