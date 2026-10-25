export interface EquipmentStats {
	md: number;
	cw: number;
	tqs: number;
	total: number;
}

export interface CityCoordinate {
	lat: number;
	lng: number;
	name: {
		en: string;
		ua: string;
	};
}

export interface CityHub {
	id: string;
	name: {
		en: string;
		ua: string;
	};
	coords: [number, number];
	stats: EquipmentStats;
	clients: {
		en: string;
		ua: string;
		logo?: string;
	}[];
}

export interface PartnerItem {
	name: {
		en: string;
		ua: string;
	};
	website?: string;
	logo?: string;
	equipment?: {
		md?: number;
		cw?: number;
		tqs?: number;
	};
	adres?: string[];
	category: "food" | "pharma" | "household";
}

export interface PartnersData {
	food: Omit<PartnerItem, "category">[];
	household: Omit<PartnerItem, "category">[];
	pharma: Omit<PartnerItem, "category">[];
}

export interface SectorBreakdown {
	category: "food" | "pharma" | "household";
	title: {
		en: string;
		ua: string;
	};
	stats: EquipmentStats;
	clientCount: number;
}
