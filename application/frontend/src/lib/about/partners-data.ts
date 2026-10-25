import { getCityCoordinates } from "./geocoding";
import type { CityHub, EquipmentStats, PartnerItem, PartnersData, SectorBreakdown } from "./types";

/**
 * Display-friendly approximation of an exact count: floors to a multiple of 5 and
 * appends "+" (229 → "225+"). Zero stays "0" and 1–4 become "<5", so we never
 * claim equipment that isn't there.
 */
export function formatApprox(n: number): string {
	if (n <= 0) return "0";
	if (n < 5) return "<5";
	return `${Math.floor(n / 5) * 5}+`;
}

export function calculateGlobalStats(data: PartnersData): EquipmentStats {
	let md = 0;
	let cw = 0;
	let tqs = 0;

	const allPartners = [...data.food, ...data.household, ...data.pharma];

	for (const partner of allPartners) {
		if (partner.equipment) {
			md += partner.equipment.md ?? 0;
			cw += partner.equipment.cw ?? 0;
			tqs += partner.equipment.tqs ?? 0;
		}
	}

	return {
		md,
		cw,
		tqs,
		total: md + cw + tqs,
	};
}

export function aggregateCityHubs(data: PartnersData): CityHub[] {
	const hubsMap = new Map<string, { stats: EquipmentStats; clients: PartnerItem[] }>();

	const allPartners = getAllPartnersList(data);

	for (const partner of allPartners) {
		const cities = partner.adres && partner.adres.length > 0 ? partner.adres : [];
		for (const rawCity of cities) {
			const city = rawCity.trim();
			let hub = hubsMap.get(city);
			if (!hub) {
				hub = {
					stats: { md: 0, cw: 0, tqs: 0, total: 0 },
					clients: [],
				};
				hubsMap.set(city, hub);
			}

			hub.clients.push(partner);

			if (partner.equipment) {
				const eqMd = partner.equipment.md ?? 0;
				const eqCw = partner.equipment.cw ?? 0;
				const eqTqs = partner.equipment.tqs ?? 0;

				hub.stats.md += eqMd;
				hub.stats.cw += eqCw;
				hub.stats.tqs += eqTqs;
				hub.stats.total += eqMd + eqCw + eqTqs;
			}
		}
	}

	const cityHubs: CityHub[] = [];

	for (const [cityName, hubData] of hubsMap.entries()) {
		const coord = getCityCoordinates(cityName);
		if (!coord) {
			// A made-up fallback position would put a pin on the wrong city, so skip the hub
			console.warn(
				`[about] No coordinates for "${cityName}" in city-coordinates.json; hub skipped`
			);
			continue;
		}

		cityHubs.push({
			id: cityName,
			name: coord.name,
			coords: [coord.lat, coord.lng],
			stats: hubData.stats,
			clients: hubData.clients.map((c) => ({
				en: c.name.en,
				ua: c.name.ua,
				logo: c.logo,
			})),
		});
	}

	// Sort hubs descending by total equipment units
	return cityHubs.sort((a, b) => b.stats.total - a.stats.total);
}

export function getSectorBreakdowns(data: PartnersData): SectorBreakdown[] {
	const calcCategory = (
		category: "food" | "pharma" | "household",
		items: Omit<PartnerItem, "category">[],
		title: { en: string; ua: string }
	): SectorBreakdown => {
		let md = 0;
		let cw = 0;
		let tqs = 0;

		for (const item of items) {
			if (item.equipment) {
				md += item.equipment.md ?? 0;
				cw += item.equipment.cw ?? 0;
				tqs += item.equipment.tqs ?? 0;
			}
		}

		return {
			category,
			title,
			stats: { md, cw, tqs, total: md + cw + tqs },
			clientCount: items.length,
		};
	};

	return [
		calcCategory("food", data.food, { en: "Food & Beverage", ua: "Харчова промисловість" }),
		calcCategory("pharma", data.pharma, { en: "Pharmaceuticals", ua: "Фармацевтика" }),
		calcCategory("household", data.household, {
			en: "Chemicals & Packaging",
			ua: "Побутова хімія та пакування",
		}),
	];
}

export function getAllPartnersList(data: PartnersData): PartnerItem[] {
	return [
		...data.food.map((item) => ({ ...item, category: "food" as const })),
		...data.pharma.map((item) => ({ ...item, category: "pharma" as const })),
		...data.household.map((item) => ({ ...item, category: "household" as const })),
	];
}
