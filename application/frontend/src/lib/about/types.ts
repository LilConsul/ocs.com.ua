import type { ImageMetadata } from "astro";

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
		logo?: ImageMetadata;
	}[];
}

/** A partner as stored in src/data/partners.json; logo is a public-style path (/assets/...). */
export interface PartnerRecord {
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
}

/** A partner ready to render: sector attached and logo resolved from src/assets/. */
export interface PartnerItem extends Omit<PartnerRecord, "logo"> {
	logo?: ImageMetadata;
	category: "food" | "pharma" | "household";
}

export interface PartnersData {
	food: PartnerRecord[];
	household: PartnerRecord[];
	pharma: PartnerRecord[];
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
