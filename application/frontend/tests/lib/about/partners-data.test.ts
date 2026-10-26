import { describe, expect, it } from "bun:test";
import partnersRaw from "@/data/partners.json";
import {
	aggregateCityHubs,
	calculateGlobalStats,
	getAllPartnersList,
	getSectorBreakdowns,
	getSiteStats,
} from "@/lib/about/partners-data";
import type { PartnersData } from "@/lib/about/types";

describe("partners data processing", () => {
	const data = partnersRaw as PartnersData;

	it("calculates global equipment totals accurately", () => {
		const stats = calculateGlobalStats(data);
		expect(stats.md).toBeGreaterThan(0);
		expect(stats.cw).toBeGreaterThan(0);
		expect(stats.total).toBe(stats.md + stats.cw + stats.tqs);
		expect(stats.total).toBeGreaterThan(100);
	});

	it("aggregates Ukrainian city hubs with accurate coordinates and clients", () => {
		const hubs = aggregateCityHubs(data);
		expect(hubs.length).toBeGreaterThanOrEqual(4);

		const kyivHub = hubs.find((h) => h.id === "Kyiv");
		expect(kyivHub).toBeDefined();
		expect(kyivHub?.coords[0]).toBeCloseTo(50.45, 1);
		expect(kyivHub?.stats.total).toBeGreaterThan(0);
		expect(kyivHub?.clients.some((c) => c.en === "Roshen")).toBe(true);

		const vinnytsiaHub = hubs.find((h) => h.id === "Vinnytsia");
		expect(vinnytsiaHub).toBeDefined();
		expect(vinnytsiaHub?.clients.some((c) => c.en === "Roshen")).toBe(true);
	});

	it("groups sector breakdowns for food, pharma, and household", () => {
		const sectors = getSectorBreakdowns(data);
		expect(sectors).toHaveLength(3);

		const food = sectors.find((s) => s.category === "food");
		const pharma = sectors.find((s) => s.category === "pharma");
		const household = sectors.find((s) => s.category === "household");

		expect(food).toBeDefined();
		expect(pharma).toBeDefined();
		expect(household).toBeDefined();

		expect(food?.clientCount).toBe(data.food.length);
		expect(pharma?.clientCount).toBe(data.pharma.length);
		expect(household?.clientCount).toBe(data.household.length);
	});

	it("derives site-wide headline stats from the partner data", () => {
		const site = getSiteStats(data, new Date("2026-06-01"));
		expect(site.clients).toBe(getAllPartnersList(data).length);
		expect(site.systems).toBe(calculateGlobalStats(data).total);
		expect(site.years).toBe(13);
	});

	it("counts years from the founding year, so they grow on later builds", () => {
		expect(getSiteStats(data, new Date("2013-03-01")).years).toBe(0);
		expect(getSiteStats(data, new Date("2033-03-01")).years).toBe(20);
	});

	it("formats flattened partner client list with sector tag", () => {
		const all = getAllPartnersList(data);
		const expectedLength = data.food.length + data.household.length + data.pharma.length;
		expect(all).toHaveLength(expectedLength);
		expect(all.every((p) => ["food", "pharma", "household"].includes(p.category))).toBe(true);
	});
});
