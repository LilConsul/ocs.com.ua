import { describe, expect, it } from "bun:test";
import partnersRaw from "@/data/partners.json";
import {
	aggregateCityHubs,
	calculateGlobalStats,
	getAllPartnersList,
	getSectorBreakdowns,
} from "@/lib/about/partners-data";
import type { PartnersData } from "@/lib/about/types";

describe("About Us page data & integrity", () => {
	const data = partnersRaw as PartnersData;

	it("computes non-zero total equipment for both EN and UA routes", () => {
		const stats = calculateGlobalStats(data);
		expect(stats.total).toBeGreaterThan(150);
		expect(stats.cw).toBeGreaterThan(50);
		expect(stats.md).toBeGreaterThan(50);
	});

	it("has city hubs covering major industrial regions", () => {
		const hubs = aggregateCityHubs(data);
		const cityIds = hubs.map((h) => h.id);
		expect(cityIds).toContain("Kyiv");
		expect(cityIds).toContain("Lviv");
		expect(cityIds).toContain("Vinnytsia");
		expect(cityIds).toContain("Odesa");
	});

	it("has all partner items formatted with required fields", () => {
		const partners = getAllPartnersList(data);
		for (const p of partners) {
			expect(p.name.en).toBeTruthy();
			expect(p.name.ua).toBeTruthy();
			expect(["food", "pharma", "household"]).toContain(p.category);
		}
	});

	it("keeps the per-sector totals consistent with the global total", () => {
		const sectorTotal = getSectorBreakdowns(data).reduce((sum, s) => sum + s.stats.total, 0);
		expect(sectorTotal).toBe(calculateGlobalStats(data).total);
	});
});
