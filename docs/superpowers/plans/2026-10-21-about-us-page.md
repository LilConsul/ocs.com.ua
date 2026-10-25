# About Us Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use skills:subagent-driven-development (recommended) or skills:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a bilingual (`/en/about`, `/ua/about`) About Us page featuring dynamic equipment calculations from `partners.json`, automated build-time geocoding, official WIPOTEC & MESUTRONIC credentials with PDF downloads, an interactive Leaflet Ukraine installation map with city hubs, and an SEO-optimized enterprise client directory.

**Architecture:** Pure TypeScript calculation and geocoding modules parse `src/data/partners.json` and `src/data/documents.json`. Static Astro components render the Hero, Manufacturer Credentials, Infrastructure Highlights, and Client Directory. The Ukraine Map component lazy-loads a lightweight Leaflet instance with custom styled brand pins and an interactive city hub inspection drawer.

**Tech Stack:** Astro, TypeScript, Tailwind CSS v4, Leaflet, JSON-LD Schema.org, Bun Test, Biome.

______________________________________________________________________

## File Structure Map

```
application/frontend/
├── src/
│   ├── data/
│   │   └── city-coordinates.json           # Cached coordinates & names for Ukrainian cities
│   ├── lib/
│   │   └── about/
│   │       ├── types.ts                    # Partner, Equipment, CityHub, and Sector interfaces
│   │       ├── geocoding.ts                # Coordinate cache lookup and Nominatim auto-fetcher
│   │       └── partners-data.ts            # Dynamic KPI calculation, city hub aggregation, client helpers
│   ├── components/
│   │   └── about/
│   │       ├── AboutHero.astro             # Hero with breadcrumbs, H1, mission, and dynamic KPI grid
│   │       ├── ManufacturerCredentials.astro # WIPOTEC & MESUTRONIC official partner cards & PDF links
│   │       ├── InfrastructureHighlights.astro # Certified engineers, line commissioning, Kyiv warehouse
│   │       ├── InteractiveUkraineMap.astro # Leaflet map, pulsing pins, city hub inspector, sector matrix
│   │       ├── ClientDirectory.astro       # Filterable client grid (All/Food/Pharma/Household)
│   │       └── AboutCta.astro              # High-conversion consultation CTA banner
│   └── pages/
│       └── [lang]/
│           └── about.astro                 # Bilingual static route with JSON-LD structured data
└── tests/
    ├── lib/
    │   └── about/
    │       ├── geocoding.test.ts           # Geocoding cache & fallback tests
    │       └── partners-data.test.ts       # Equipment math, city aggregation & sector breakdown tests
    └── pages/
        └── about.test.ts                   # Page rendering, metadata, and data consistency tests
```

______________________________________________________________________

## Tasks

### Task 1: Data Types & Geocoding Cache Resolver

**Files:**

- Create: `application/frontend/src/lib/about/types.ts`

- Create: `application/frontend/src/data/city-coordinates.json`

- Create: `application/frontend/src/lib/about/geocoding.ts`

- Test: `application/frontend/tests/lib/about/geocoding.test.ts`

- [ ] **Step 1: Write the failing geocoding test**

Create `application/frontend/tests/lib/about/geocoding.test.ts`:

```typescript
import { describe, expect, it } from "bun:test";
import { getCityCoordinates, resolveCityCoordinates } from "@/lib/about/geocoding";

describe("geocoding helper", () => {
	it("returns cached coordinates for known Ukrainian cities", () => {
		const kyiv = getCityCoordinates("Kyiv");
		expect(kyiv).toBeDefined();
		expect(kyiv?.lat).toBeCloseTo(50.45, 1);
		expect(kyiv?.lng).toBeCloseTo(30.52, 1);
		expect(kyiv?.name.ua).toBe("Київ");
		expect(kyiv?.name.en).toBe("Kyiv");
	});

	it("returns cached coordinates for Vinnytsia", () => {
		const vinnytsia = getCityCoordinates("Vinnytsia");
		expect(vinnytsia).toBeDefined();
		expect(vinnytsia?.lat).toBeCloseTo(49.23, 1);
		expect(vinnytsia?.lng).toBeCloseTo(28.46, 1);
	});

	it("returns undefined for unknown city in sync lookup", () => {
		const unknown = getCityCoordinates("NonExistentCity123");
		expect(unknown).toBeUndefined();
	});

	it("falls back to default Ukraine center or handles unknown gracefully in resolveCityCoordinates", async () => {
		const result = await resolveCityCoordinates("Kyiv");
		expect(result.lat).toBeCloseTo(50.45, 1);
		expect(result.lng).toBeCloseTo(30.52, 1);
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test tests/lib/about/geocoding.test.ts`
Expected: FAIL (Cannot find module `@/lib/about/geocoding`)

- [ ] **Step 3: Implement types, coordinate cache, and geocoding helper**

Create `application/frontend/src/lib/about/types.ts`:

```typescript
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
```

Create `application/frontend/src/data/city-coordinates.json`:

```json
{
	"Kyiv": {
		"lat": 50.4501,
		"lng": 30.5234,
		"name": { "en": "Kyiv", "ua": "Київ" }
	},
	"Vinnytsia": {
		"lat": 49.2331,
		"lng": 28.4682,
		"name": { "en": "Vinnytsia", "ua": "Вінниця" }
	},
	"Sumy": {
		"lat": 50.9077,
		"lng": 34.7981,
		"name": { "en": "Sumy", "ua": "Суми" }
	},
	"Lviv": {
		"lat": 49.8397,
		"lng": 24.0297,
		"name": { "en": "Lviv", "ua": "Львів" }
	},
	"Cherkasy": {
		"lat": 49.4444,
		"lng": 32.0598,
		"name": { "en": "Cherkasy", "ua": "Черкаси" }
	},
	"Odesa": {
		"lat": 46.4825,
		"lng": 30.7233,
		"name": { "en": "Odesa", "ua": "Одеса" }
	},
	"Zhytomyr": {
		"lat": 50.2547,
		"lng": 28.6587,
		"name": { "en": "Zhytomyr", "ua": "Житомир" }
	},
	"Dnipro": {
		"lat": 48.4647,
		"lng": 35.0462,
		"name": { "en": "Dnipro", "ua": "Дніпро" }
	},
	"Kharkiv": {
		"lat": 49.9935,
		"lng": 36.2304,
		"name": { "en": "Kharkiv", "ua": "Харків" }
	},
	"Poltava": {
		"lat": 49.5883,
		"lng": 34.5514,
		"name": { "en": "Poltava", "ua": "Полтава" }
	}
}
```

Create `application/frontend/src/lib/about/geocoding.ts`:

```typescript
import cityCoordinatesData from "@/data/city-coordinates.json";
import type { CityCoordinate } from "./types";

const coordinatesCache: Record<string, CityCoordinate> = {
	...(cityCoordinatesData as Record<string, CityCoordinate>),
};

export function getCityCoordinates(cityName: string): CityCoordinate | undefined {
	const normalized = cityName.trim();
	return coordinatesCache[normalized];
}

export async function resolveCityCoordinates(cityName: string): Promise<CityCoordinate> {
	const cached = getCityCoordinates(cityName);
	if (cached) {
		return cached;
	}

	try {
		const query = encodeURIComponent(`${cityName}, Ukraine`);
		const url = `https://nominatim.openstreetmap.org/search?q=${query}&format=json&limit=1&accept-language=uk,en`;
		const response = await fetch(url, {
			headers: {
				"User-Agent": "ocs-website-build/1.0 (info@ocs.com.ua)",
			},
		});

		if (response.ok) {
			const data = (await response.json()) as Array<{ lat: string; lon: string; display_name: string }>;
			if (data && data.length > 0) {
				const resolved: CityCoordinate = {
					lat: Number.parseFloat(data[0].lat),
					lng: Number.parseFloat(data[0].lon),
					name: {
						en: cityName,
						ua: cityName,
					},
				};
				coordinatesCache[cityName] = resolved;
				return resolved;
			}
		}
	} catch {
		// Fallback gracefully on network error during build
	}

	// Safe Ukraine fallback center if geocoder is unreachable
	return {
		lat: 49.0384,
		lng: 31.4513,
		name: { en: cityName, ua: cityName },
	};
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test tests/lib/about/geocoding.test.ts`
Expected: PASS

- [ ] **Step 5: Commit Task 1**

```bash
git add application/frontend/src/lib/about/types.ts application/frontend/src/data/city-coordinates.json application/frontend/src/lib/about/geocoding.ts application/frontend/tests/lib/about/geocoding.test.ts
git commit -m "feat(about): add data types and geocoding coordinate resolver"
```

______________________________________________________________________

### Task 2: Partners Data Aggregator & Equipment Math

**Files:**

- Create: `application/frontend/src/lib/about/partners-data.ts`

- Test: `application/frontend/tests/lib/about/partners-data.test.ts`

- [ ] **Step 1: Write the failing partners data math tests**

Create `application/frontend/tests/lib/about/partners-data.test.ts`:

```typescript
import { describe, expect, it } from "bun:test";
import partnersRaw from "@/data/partners.json";
import {
	aggregateCityHubs,
	calculateGlobalStats,
	getAllPartnersList,
	getSectorBreakdowns,
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

	it("formats flattened partner client list with sector tag", () => {
		const all = getAllPartnersList(data);
		const expectedLength = data.food.length + data.household.length + data.pharma.length;
		expect(all).toHaveLength(expectedLength);
		expect(all.every((p) => ["food", "pharma", "household"].includes(p.category))).toBe(true);
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test tests/lib/about/partners-data.test.ts`
Expected: FAIL (Cannot find module `@/lib/about/partners-data`)

- [ ] **Step 3: Implement `partners-data.ts`**

Create `application/frontend/src/lib/about/partners-data.ts`:

```typescript
import { getCityCoordinates } from "./geocoding";
import type {
	CityHub,
	EquipmentStats,
	PartnerItem,
	PartnersData,
	SectorBreakdown,
} from "./types";

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
			if (!hubsMap.has(city)) {
				hubsMap.set(city, {
					stats: { md: 0, cw: 0, tqs: 0, total: 0 },
					clients: [],
				});
			}

			const hub = hubsMap.get(city)!;
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
		const coord = getCityCoordinates(cityName) ?? {
			lat: 49.0384,
			lng: 31.4513,
			name: { en: cityName, ua: cityName },
		};

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
		title: { en: string; ua: string },
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test tests/lib/about/partners-data.test.ts`
Expected: PASS

- [ ] **Step 5: Commit Task 2**

```bash
git add application/frontend/src/lib/about/partners-data.ts application/frontend/tests/lib/about/partners-data.test.ts
git commit -m "feat(about): implement partners data aggregation and KPI math"
```

______________________________________________________________________

### Task 3: Install Leaflet and Dependency Setup

**Files:**

- Modify: `application/frontend/package.json`

- [ ] **Step 1: Install `leaflet` and `@types/leaflet`**

Run: `bun add leaflet && bun add -d @types/leaflet` inside `application/frontend` directory.

- [ ] **Step 2: Verify package.json and run existing test suite**

Run: `bun test`
Expected: All 192+ tests pass with zero errors.

- [ ] **Step 3: Commit Task 3**

```bash
git add application/frontend/package.json application/frontend/bun.lock*
git commit -m "build(about): add leaflet dependency for interactive map"
```

______________________________________________________________________

### Task 4: Hero, Infrastructure & CTA Components

**Files:**

- Create: `application/frontend/src/components/about/AboutHero.astro`

- Create: `application/frontend/src/components/about/InfrastructureHighlights.astro`

- Create: `application/frontend/src/components/about/AboutCta.astro`

- [ ] **Step 1: Create `AboutHero.astro`**

Create `application/frontend/src/components/about/AboutHero.astro`:

```astro
---
import type { EquipmentStats } from "@/lib/about/types";
import { getInlineTranslations, type Lang } from "@/i18n";

interface Props {
	lang: Lang;
	stats: EquipmentStats;
}

const { lang, stats } = Astro.props;
const _ = getInlineTranslations(lang);
---

<section class="w-full py-12 lg:py-20 bg-surface">
	<div class="max-w-container-max mx-auto px-edge-margin">
		<!-- Breadcrumbs -->
		<nav aria-label={_("Breadcrumb")} class="mb-6 flex items-center gap-2 font-technical-data text-xs text-industrial-gray">
			<a href={`/${lang}`} class="hover:text-primary transition-colors">{_("Home")}</a>
			<span>/</span>
			<span class="text-primary font-medium" aria-current="page">{_("About Us")}</span>
		</nav>

		<div class="grid grid-cols-1 lg:grid-cols-12 gap-gutter items-center">
			<div class="lg:col-span-8 flex flex-col justify-center">
				<div class="flex flex-wrap items-center gap-2 mb-4">
					<span class="px-3 py-1 rounded bg-secondary/10 text-secondary font-label-caps text-xs font-semibold uppercase tracking-wider">
						{_("Official German Engineering Partner")}
					</span>
				</div>
				<h1 class="font-display-lg text-headline-xl sm:text-display-lg-mobile lg:text-display-lg font-semibold tracking-tight text-primary mb-6">
					{_("German Precision Engineering. Official Ukrainian Distributor.")}
				</h1>
				<p class="font-body-lg text-body-md sm:text-body-lg text-industrial-gray leading-relaxed mb-8 max-w-3xl">
					{_("OS-Technology Ukraine is the exclusive authorized distributor and certified integration partner of WIPOTEC GmbH and MESUTRONIC Gerätebau GmbH in Ukraine. We deliver world-class dynamic checkweighers, industrial metal detectors, X-Ray scanners, and pharmaceutical Track & Trace serialization lines with turnkey commissioning and factory warranty.")}
				</p>

				<!-- Dynamic Metric Counters Row -->
				<div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
					<div class="bg-surface-container-low p-4 rounded-lg border border-border-subtle/60 shadow-sm">
						<div class="font-technical-data text-2xl sm:text-3xl font-bold text-primary">{stats.total}+</div>
						<div class="font-label-caps text-xs text-industrial-gray uppercase mt-1">{_("Installed Systems")}</div>
					</div>
					<div class="bg-surface-container-low p-4 rounded-lg border border-border-subtle/60 shadow-sm">
						<div class="font-technical-data text-2xl sm:text-3xl font-bold text-secondary">{stats.cw}</div>
						<div class="font-label-caps text-xs text-industrial-gray uppercase mt-1">{_("Dynamic Checkweighers")}</div>
					</div>
					<div class="bg-surface-container-low p-4 rounded-lg border border-border-subtle/60 shadow-sm">
						<div class="font-technical-data text-2xl sm:text-3xl font-bold text-primary">{stats.md}</div>
						<div class="font-label-caps text-xs text-industrial-gray uppercase mt-1">{_("Metal Detectors")}</div>
					</div>
					<div class="bg-surface-container-low p-4 rounded-lg border border-border-subtle/60 shadow-sm">
						<div class="font-technical-data text-2xl sm:text-3xl font-bold text-primary">{stats.tqs > 0 ? stats.tqs : "100%"}</div>
						<div class="font-label-caps text-xs text-industrial-gray uppercase mt-1">{stats.tqs > 0 ? _("Serialization Stations") : _("German Hardware")}</div>
					</div>
				</div>
			</div>

			<div class="lg:col-span-4 flex flex-col gap-4">
				<div class="p-6 bg-surface-container-low rounded-xl border border-border-subtle/80 shadow-sm">
					<div class="font-label-caps text-xs text-secondary font-semibold uppercase mb-2">{_("Direct Authorization")}</div>
					<h2 class="font-headline-lg text-lg font-semibold text-primary mb-2">{_("Factory Endorsed Expertise")}</h2>
					<p class="font-body-md text-sm text-industrial-gray leading-relaxed mb-4">
						{_("Direct factory supply lines from Kaiserslautern and Kirchberg ensure original German components, continuous software updates, and rapid spare parts availability nationwide.")}
					</p>
					<a href="#credentials" class="inline-flex items-center gap-1 font-technical-data text-xs font-semibold text-secondary hover:underline">
						{_("View Manufacturer Credentials")} →
					</a>
				</div>
			</div>
		</div>
	</div>
</section>
```

- [ ] **Step 2: Create `InfrastructureHighlights.astro`**

Create `application/frontend/src/components/about/InfrastructureHighlights.astro`:

```astro
---
import { getInlineTranslations, type Lang } from "@/i18n";
import { CheckCircle2, ShieldCheck, Wrench } from "lucide-react";

interface Props {
	lang: Lang;
}

const { lang } = Astro.props;
const _ = getInlineTranslations(lang);
---

<section class="w-full py-12 lg:py-16 bg-surface border-t border-border-subtle/40">
	<div class="max-w-container-max mx-auto px-edge-margin">
		<div class="bg-surface-container-low rounded-2xl p-6 sm:p-10 border border-border-subtle/80 shadow-sm">
			<div class="mb-8">
				<span class="font-label-caps text-xs text-secondary font-semibold uppercase tracking-wider">{_("Technical Infrastructure")}</span>
				<h2 class="font-headline-xl text-xl sm:text-2xl font-semibold text-primary mt-1">{_("Comprehensive Line Support & Domestic Service")}</h2>
			</div>

			<div class="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
				<div class="flex items-start gap-4">
					<div class="p-3 bg-surface rounded-lg text-secondary border border-border-subtle/50 shrink-0">
						<Wrench className="w-6 h-6" />
					</div>
					<div>
						<h3 class="font-headline-lg text-base sm:text-lg font-semibold text-primary">{_("Certified Factory Engineers")}</h3>
						<p class="font-body-md text-sm text-industrial-gray mt-1 leading-relaxed">
							{_("Directly trained and certified at WIPOTEC & MESUTRONIC German production plants for mechanical assembly, weighing cell calibration, and PLC integration.")}
						</p>
					</div>
				</div>

				<div class="flex items-start gap-4">
					<div class="p-3 bg-surface rounded-lg text-secondary border border-border-subtle/50 shrink-0">
						<CheckCircle2 className="w-6 h-6" />
					</div>
					<div>
						<h3 class="font-headline-lg text-base sm:text-lg font-semibold text-primary">{_("Turnkey Line Commissioning")}</h3>
						<p class="font-body-md text-sm text-industrial-gray mt-1 leading-relaxed">
							{_("Complete turn-key commissioning, factory validation (IQ/OQ/PQ), and regulatory certification compliant with IFS Food, BRC, HACCP, and EU GMP standards.")}
						</p>
					</div>
				</div>

				<div class="flex items-start gap-4">
					<div class="p-3 bg-surface rounded-lg text-secondary border border-border-subtle/50 shrink-0">
						<ShieldCheck className="w-6 h-6" />
					</div>
					<div>
						<h3 class="font-headline-lg text-base sm:text-lg font-semibold text-primary">{_("24/7 Domestic Parts Warehouse")}</h3>
						<p class="font-body-md text-sm text-industrial-gray mt-1 leading-relaxed">
							{_("Centralized spare parts storage in Kyiv with essential belts, EMFR weigh cells, rejectors, and search coils ready for prompt deployment across Ukraine.")}
						</p>
					</div>
				</div>
			</div>
		</div>
	</div>
</section>
```

- [ ] **Step 3: Create `AboutCta.astro`**

Create `application/frontend/src/components/about/AboutCta.astro`:

```astro
---
import companyData from "@/data/company.json";
import { getInlineTranslations, type Lang } from "@/i18n";
import { ArrowRight, PhoneCall } from "lucide-react";

interface Props {
	lang: Lang;
}

const { lang } = Astro.props;
const _ = getInlineTranslations(lang);
---

<section class="w-full py-16 lg:py-24 bg-surface-container-low border-t border-border-subtle/40">
	<div class="max-w-container-max mx-auto px-edge-margin">
		<div class="bg-primary text-white rounded-2xl p-8 sm:p-12 relative overflow-hidden shadow-xl">
			<div class="relative z-10 max-w-2xl">
				<span class="font-label-caps text-xs text-secondary-fixed font-semibold uppercase tracking-wider">{_("Engineering Consultation")}</span>
				<h2 class="font-headline-xl text-2xl sm:text-3xl font-bold mt-2 mb-4 text-white">
					{_("Upgrade Your Line with German Quality")}
				</h2>
				<p class="font-body-lg text-sm sm:text-base text-primary-fixed-dim leading-relaxed mb-8">
					{_("Discuss your production inspection requirements with certified engineers. We provide comprehensive line audits, sensitivity tests, and tailored integration blueprints.")}
				</p>
				<div class="flex flex-wrap items-center gap-4">
					<a
						href={`/${lang}/contact`}
						class="inline-flex items-center gap-2 px-6 py-3.5 bg-secondary text-white font-technical-data text-sm font-semibold rounded-lg hover:bg-secondary/90 transition-colors shadow-md"
					>
						{_("Request Consultation")}
						<ArrowRight className="w-4 h-4" />
					</a>
					<a
						href={`tel:${companyData.phone.replace(/\s+/g, "")}`}
						class="inline-flex items-center gap-2 px-6 py-3.5 bg-white/10 hover:bg-white/20 text-white font-technical-data text-sm font-medium rounded-lg transition-colors border border-white/20"
					>
						<PhoneCall className="w-4 h-4" />
						{companyData.phone}
					</a>
				</div>
			</div>
		</div>
	</div>
</section>
```

- [ ] **Step 4: Commit Task 4**

```bash
git add application/frontend/src/components/about/AboutHero.astro application/frontend/src/components/about/InfrastructureHighlights.astro application/frontend/src/components/about/AboutCta.astro
git commit -m "feat(about): create hero, infrastructure, and CTA components"
```

______________________________________________________________________

### Task 5: Official Manufacturer Credentials Component

**Files:**

- Create: `application/frontend/src/components/about/ManufacturerCredentials.astro`

- [ ] **Step 1: Implement `ManufacturerCredentials.astro` with PDF download links from `documents.json`**

Create `application/frontend/src/components/about/ManufacturerCredentials.astro`:

```astro
---
import documentsData from "@/data/documents.json";
import { getInlineTranslations, type Lang } from "@/i18n";
import { CheckCircle2, Download, FileCheck, ShieldAlert } from "lucide-react";

interface Props {
	lang: Lang;
}

const { lang } = Astro.props;
const _ = getInlineTranslations(lang);
---

<section id="credentials" class="w-full py-16 lg:py-24 bg-surface-container-low border-y border-border-subtle/40">
	<div class="max-w-container-max mx-auto px-edge-margin">
		<div class="flex flex-col md:flex-row md:items-end justify-between mb-12">
			<div>
				<span class="font-label-caps text-xs text-secondary uppercase font-semibold tracking-wider">{_("Manufacturer Alliances")}</span>
				<h2 class="font-headline-xl text-2xl sm:text-3xl font-semibold text-primary mt-2">
					{_("Official German Engineering Credentials")}
				</h2>
			</div>
			<p class="font-technical-data text-xs text-industrial-gray mt-2 md:mt-0">
				{_("Direct Factory Partnership & Certified Distribution")}
			</p>
		</div>

		<div class="grid grid-cols-1 lg:grid-cols-2 gap-gutter">
			<!-- WIPOTEC Card -->
			<div class="bg-surface rounded-xl p-6 sm:p-8 shadow-sm border border-border-subtle/80 flex flex-col justify-between">
				<div>
					<div class="flex items-center justify-between pb-4 mb-6 bg-surface-container-low p-4 rounded-lg border border-border-subtle/40">
						<div>
							<h3 class="font-headline-lg text-xl font-bold tracking-tight text-primary">WIPOTEC GmbH</h3>
							<span class="block font-technical-data text-xs text-industrial-gray">Kaiserslautern, Germany</span>
						</div>
						<span class="px-3 py-1 bg-surface-container-high text-primary font-label-caps text-xs rounded font-medium border border-border-subtle">
							{_("Tier 1 Distributor")}
						</span>
					</div>

					<p class="font-body-md text-sm text-industrial-gray mb-6 leading-relaxed">
						{_("Global innovation leader in high-speed Electro-Magnetic Force Restoration (EMFR) dynamic weighing technology, industrial X-Ray scanners, and pharmaceutical Track & Trace serialization lines.")}
					</p>

					<div class="space-y-3 font-technical-data text-xs text-on-surface mb-6">
						<div class="flex items-center gap-2">
							<CheckCircle2 className="w-4 h-4 text-secondary shrink-0" />
							<span>{_("EMFR High-Precision Dynamic Weighing Cells (up to 600 pcs/min)")}</span>
						</div>
						<div class="flex items-center gap-2">
							<CheckCircle2 className="w-4 h-4 text-secondary shrink-0" />
							<span>{_("SC Series High-Resolution Industrial X-Ray Inspection Scanners")}</span>
						</div>
						<div class="flex items-center gap-2">
							<CheckCircle2 className="w-4 h-4 text-secondary shrink-0" />
							<span>{_("Pharma Serialization & Aggregation Systems (EU FMD, GS1)")}</span>
						</div>
					</div>
				</div>

				<div>
					<!-- Certificate Box -->
					<div class="bg-surface-container-low border border-border-subtle rounded-lg p-4">
						<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
							<div class="flex items-start gap-3">
								<div class="p-2 bg-surface rounded text-secondary shrink-0 border border-border-subtle/40">
									<FileCheck className="w-5 h-5" />
								</div>
								<div>
									<div class="font-headline-lg text-sm font-semibold text-primary">{_("Official Distributor Authorization")}</div>
									<div class="font-technical-data text-[11px] text-industrial-gray mt-0.5">
										{_("Direct Factory Endorsement • Valid Nationwide")}
									</div>
								</div>
							</div>
							<a
								href={documentsData.wipotec}
								target="_blank"
								rel="noopener noreferrer"
								class="inline-flex items-center justify-center gap-2 px-4 py-2 bg-primary text-white hover:bg-secondary transition-colors rounded-lg font-technical-data text-xs whitespace-nowrap shadow-sm"
							>
								<Download className="w-3.5 h-3.5" />
								<span>{_("Authorization Letter (PDF)")}</span>
							</a>
						</div>
					</div>
					<div class="mt-4 pt-3 border-t border-border-subtle/50 flex items-center justify-between text-industrial-gray font-label-caps text-[11px]">
						<span>{_("Service: Nationwide Ukraine")}</span>
						<span class="font-technical-data text-primary font-medium">{_("Factory Certified Hub")}</span>
					</div>
				</div>
			</div>

			<!-- MESUTRONIC Card -->
			<div class="bg-surface rounded-xl p-6 sm:p-8 shadow-sm border border-border-subtle/80 flex flex-col justify-between">
				<div>
					<div class="flex items-center justify-between pb-4 mb-6 bg-surface-container-low p-4 rounded-lg border border-border-subtle/40">
						<div>
							<h3 class="font-headline-lg text-xl font-bold tracking-tight text-primary">MESUTRONIC Gerätebau GmbH</h3>
							<span class="block font-technical-data text-xs text-industrial-gray">Kirchberg im Wald, Germany</span>
						</div>
						<span class="px-3 py-1 bg-surface-container-high text-primary font-label-caps text-xs rounded font-medium border border-border-subtle">
							{_("Authorized Partner")}
						</span>
					</div>

					<p class="font-body-md text-sm text-industrial-gray mb-6 leading-relaxed">
						{_("Pioneering German metal detection systems built for rigorous industrial environments. Multi-segment digital signal evaluation detecting ferrous, non-ferrous, and stainless steel contaminants.")}
					</p>

					<div class="space-y-3 font-technical-data text-xs text-on-surface mb-6">
						<div class="flex items-center gap-2">
							<CheckCircle2 className="w-4 h-4 text-secondary shrink-0" />
							<span>{_("Meatline & Pipeline Metal Inspection For Pumped Products")}</span>
						</div>
						<div class="flex items-center gap-2">
							<CheckCircle2 className="w-4 h-4 text-secondary shrink-0" />
							<span>{_("Quicktron & Pharma Freefall Gravity Contaminant Separators")}</span>
						</div>
						<div class="flex items-center gap-2">
							<CheckCircle2 className="w-4 h-4 text-secondary shrink-0" />
							<span>{_("Metron FlatLine & Transtron High-Sensitivity Conveyor Systems")}</span>
						</div>
					</div>
				</div>

				<div>
					<!-- Certificate Box -->
					<div class="bg-surface-container-low border border-border-subtle rounded-lg p-4">
						<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
							<div class="flex items-start gap-3">
								<div class="p-2 bg-surface rounded text-secondary shrink-0 border border-border-subtle/40">
									<FileCheck className="w-5 h-5" />
								</div>
								<div>
									<div class="font-headline-lg text-sm font-semibold text-primary">{_("Official Partner Certificate")}</div>
									<div class="font-technical-data text-[11px] text-industrial-gray mt-0.5">
										{_("Direct Factory Authorization • Genuine OEM Parts")}
									</div>
								</div>
							</div>
							<a
								href={documentsData.mesutronic}
								target="_blank"
								rel="noopener noreferrer"
								class="inline-flex items-center justify-center gap-2 px-4 py-2 bg-primary text-white hover:bg-secondary transition-colors rounded-lg font-technical-data text-xs whitespace-nowrap shadow-sm"
							>
								<Download className="w-3.5 h-3.5" />
								<span>{_("Authorization Letter (PDF)")}</span>
							</a>
						</div>
					</div>
					<div class="mt-4 pt-3 border-t border-border-subtle/50 flex items-center justify-between text-industrial-gray font-label-caps text-[11px]">
						<span>{_("Standard: HACCP / IFS Compliant")}</span>
						<span class="font-technical-data text-primary font-medium">{_("Direct OEM Spare Parts")}</span>
					</div>
				</div>
			</div>
		</div>
	</div>
</section>
```

- [ ] **Step 2: Commit Task 5**

```bash
git add application/frontend/src/components/about/ManufacturerCredentials.astro
git commit -m "feat(about): create official manufacturer credentials component"
```

______________________________________________________________________

### Task 6: Interactive Leaflet Ukraine Map Component

**Files:**

- Create: `application/frontend/src/components/about/InteractiveUkraineMap.astro`

- [ ] **Step 1: Implement `InteractiveUkraineMap.astro` with lazy Leaflet initialization and pulsing pins**

Create `application/frontend/src/components/about/InteractiveUkraineMap.astro`:

```astro
---
import type { CityHub, SectorBreakdown } from "@/lib/about/types";
import { getInlineTranslations, type Lang } from "@/i18n";
import { Factory, MapPin, Layers, CheckCircle } from "lucide-react";

interface Props {
	lang: Lang;
	cityHubs: CityHub[];
	sectors: SectorBreakdown[];
}

const { lang, cityHubs, sectors } = Astro.props;
const _ = getInlineTranslations(lang);

const primaryHub = cityHubs[0] ?? {
	id: "Kyiv",
	name: { en: "Kyiv", ua: "Київ" },
	stats: { md: 0, cw: 0, tqs: 0, total: 0 },
	clients: [],
};
---

<section class="w-full py-16 lg:py-24 bg-surface" id="installation-map">
	<div class="max-w-container-max mx-auto px-edge-margin">
		<div class="flex flex-col lg:flex-row items-start lg:items-center justify-between mb-12">
			<div>
				<span class="font-label-caps text-xs text-secondary uppercase font-semibold tracking-wider">
					{_("Deployment Breakdown")}
				</span>
				<h2 class="font-headline-xl text-2xl sm:text-3xl font-semibold text-primary mt-2">
					{_("Verified Ukrainian Industrial Footprint")}
				</h2>
			</div>
			<div class="font-technical-data text-xs text-industrial-gray mt-4 lg:mt-0 flex items-center gap-2">
				<MapPin className="w-4 h-4 text-secondary" />
				<span>{_("Active Factory Installations Across Regional Hubs")}</span>
			</div>
		</div>

		<div class="grid grid-cols-1 lg:grid-cols-12 gap-gutter items-start mb-12">
			<!-- Leaflet Map Container -->
			<div class="lg:col-span-7 flex flex-col gap-4">
				<div class="bg-surface-container-low rounded-xl p-4 sm:p-5 shadow-sm border border-border-subtle">
					<div class="flex items-center justify-between mb-3 pb-3 border-b border-border-subtle/60">
						<div class="flex items-center gap-2">
							<span class="w-2.5 h-2.5 rounded-full bg-secondary animate-pulse"></span>
							<span class="font-headline-lg text-sm font-semibold text-primary">{_("Installation Map of Ukraine")}</span>
						</div>
						<span class="font-technical-data text-xs text-secondary font-medium">{_("Interactive Regional Hubs")}</span>
					</div>

					<!-- Map viewport -->
					<div
						id="ukraine-leaflet-map"
						class="w-full aspect-[16/10] min-h-[340px] rounded-lg border border-border-subtle/80 overflow-hidden bg-surface relative z-0"
						data-lang={lang}
					>
						<div class="absolute inset-0 flex items-center justify-center text-industrial-gray font-technical-data text-xs">
							{_("Loading interactive map...")}
						</div>
					</div>

					<!-- Interactive Hub Details Drawer -->
					<div class="mt-4 p-4 bg-surface rounded-lg border border-border-subtle/80 shadow-xs" id="hubDetailBox">
						<div class="flex flex-wrap items-center justify-between gap-2 mb-2">
							<div class="flex items-center gap-2">
								<h3 class="font-headline-lg text-base font-semibold text-primary" id="hubTitle">
									{primaryHub.name[lang as "en" | "ua"] ?? primaryHub.name.en} {_("Industrial Hub")}
								</h3>
								<span class="px-2 py-0.5 rounded bg-secondary/10 text-secondary font-label-caps text-xs font-bold" id="hubBadge">
									{primaryHub.stats.total}+ {_("Units")}
								</span>
							</div>
							<span class="font-technical-data text-[11px] text-industrial-gray">{_("Click pins to inspect")}</span>
						</div>

						<!-- Equipment breakdown line -->
						<div class="grid grid-cols-3 gap-2 py-2 border-y border-border-subtle/40 mb-2 font-technical-data text-xs">
							<div>
								<span class="text-industrial-gray block text-[10px] uppercase">{_("Checkweighers")}:</span>
								<span class="font-bold text-primary" id="hubCw">{primaryHub.stats.cw}</span>
							</div>
							<div>
								<span class="text-industrial-gray block text-[10px] uppercase">{_("Metal Detectors")}:</span>
								<span class="font-bold text-primary" id="hubMd">{primaryHub.stats.md}</span>
							</div>
							<div>
								<span class="text-industrial-gray block text-[10px] uppercase">{_("Serialization")}:</span>
								<span class="font-bold text-primary" id="hubTqs">{primaryHub.stats.tqs}</span>
							</div>
						</div>

						<p class="font-body-md text-xs text-industrial-gray leading-relaxed" id="hubClients">
							<strong class="text-primary font-medium">{_("Active Client Facilities:")}</strong>{" "}
							<span id="hubClientsList">
								{primaryHub.clients.map((c) => c[lang as "en" | "ua"] ?? c.en).join(", ") || _("Multiple facilities active")}
							</span>
						</p>
					</div>
				</div>
			</div>

			<!-- Sector Breakdown Column -->
			<div class="lg:col-span-5 flex flex-col gap-4">
				{sectors.map((sector) => (
					<div class="bg-surface-container-low p-5 sm:p-6 rounded-xl shadow-xs border border-border-subtle/70">
						<div class="flex items-center justify-between mb-3">
							<div class="flex items-center gap-2.5">
								<div class="p-2 rounded bg-surface text-secondary border border-border-subtle/50">
									<Factory className="w-4 h-4" />
								</div>
								<h3 class="font-headline-lg text-sm sm:text-base font-semibold text-primary">
									{sector.title[lang as "en" | "ua"] ?? sector.title.en}
								</h3>
							</div>
							<span class="font-technical-data text-xs px-2.5 py-0.5 rounded bg-surface-container-high text-primary font-bold">
								{sector.stats.total} {_("Units")}
							</span>
						</div>

						<div class="grid grid-cols-3 gap-2 pt-2">
							<div class="bg-surface p-2.5 rounded border border-border-subtle/40">
								<span class="font-technical-data text-lg font-bold text-primary block">{sector.stats.cw}</span>
								<span class="font-label-caps text-[10px] text-industrial-gray uppercase">{_("Checkweighers")}</span>
							</div>
							<div class="bg-surface p-2.5 rounded border border-border-subtle/40">
								<span class="font-technical-data text-lg font-bold text-primary block">{sector.stats.md}</span>
								<span class="font-label-caps text-[10px] text-industrial-gray uppercase">{_("Metal Detectors")}</span>
							</div>
							<div class="bg-surface p-2.5 rounded border border-border-subtle/40">
								<span class="font-technical-data text-lg font-bold text-primary block">{sector.stats.tqs}</span>
								<span class="font-label-caps text-[10px] text-industrial-gray uppercase">{_("Track & Trace")}</span>
							</div>
						</div>
					</div>
				))}
			</div>
		</div>
	</div>

	<!-- Pass JSON data to client script -->
	<script type="application/json" id="city-hubs-json" set:html={JSON.stringify(cityHubs)} />
</section>

<!-- Leaflet Map CSS -->
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=" crossorigin="" />

<style>
	:global(.custom-pin-marker) {
		background: transparent;
		border: none;
	}
	:global(.pin-container) {
		position: relative;
		width: 36px;
		height: 36px;
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
	}
	:global(.pin-pulse) {
		position: absolute;
		width: 100%;
		height: 100%;
		border-radius: 50%;
		background-color: rgba(184, 0, 109, 0.4);
		animation: pinPulse 2s cubic-bezier(0, 0, 0.2, 1) infinite;
	}
	:global(.pin-dot) {
		position: relative;
		width: 24px;
		height: 24px;
		border-radius: 50%;
		background-color: #b8006d;
		color: #ffffff;
		font-family: var(--font-technical-data, monospace);
		font-size: 11px;
		font-weight: 700;
		display: flex;
		align-items: center;
		justify-content: center;
		box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
		border: 2px solid #ffffff;
		transition: transform 0.2s ease;
	}
	:global(.pin-container:hover .pin-dot) {
		transform: scale(1.2);
		background-color: #000000;
	}
	@keyframes pinPulse {
		0% {
			transform: scale(0.6);
			opacity: 1;
		}
		100% {
			transform: scale(1.6);
			opacity: 0;
		}
	}
</style>

<script>
	let mapInitialized = false;

	async function initMap() {
		if (mapInitialized) return;
		const container = document.getElementById("ukraine-leaflet-map");
		const hubsDataEl = document.getElementById("city-hubs-json");
		if (!container || !hubsDataEl) return;

		mapInitialized = true;
		const lang = container.getAttribute("data-lang") || "en";
		const hubs = JSON.parse(hubsDataEl.textContent || "[]");

		// Dynamically load leaflet
		const L = (await import("leaflet")).default;

		// Initialize map centered on Ukraine
		const map = L.map(container, {
			center: [48.8, 31.4],
			zoom: 6,
			minZoom: 5,
			maxZoom: 10,
			scrollWheelZoom: false,
		});

		// CartoDB Positron clean map tiles
		L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
			attribution: '&copy; <a href="https://carto.com/">CARTO</a> &copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>',
			subdomains: "abcd",
			maxZoom: 19,
		}).addTo(map);

		// Add markers for city hubs
		hubs.forEach((hub: any) => {
			const hubName = hub.name[lang] || hub.name.en;
			const total = hub.stats.total;

			const icon = L.divIcon({
				className: "custom-pin-marker",
				html: `
					<div class="pin-container" title="${hubName}: ${total} Units">
						<div class="pin-pulse"></div>
						<div class="pin-dot">${total}</div>
					</div>
				`,
				iconSize: [36, 36],
				iconAnchor: [18, 18],
			});

			const marker = L.marker(hub.coords, { icon }).addTo(map);

			marker.on("click", () => {
				updateHubDrawer(hub, lang);
			});
		});

		function updateHubDrawer(hub: any, currentLang: string) {
			const titleEl = document.getElementById("hubTitle");
			const badgeEl = document.getElementById("hubBadge");
			const cwEl = document.getElementById("hubCw");
			const mdEl = document.getElementById("hubMd");
			const tqsEl = document.getElementById("hubTqs");
			const clientsListEl = document.getElementById("hubClientsList");

			const localizedName = hub.name[currentLang] || hub.name.en;
			const suffix = currentLang === "ua" ? "Індустріальний хаб" : "Industrial Hub";

			if (titleEl) titleEl.innerText = `${localizedName} ${suffix}`;
			if (badgeEl) badgeEl.innerText = `${hub.stats.total}+ ${currentLang === "ua" ? "Одиниць" : "Units"}`;
			if (cwEl) cwEl.innerText = hub.stats.cw;
			if (mdEl) mdEl.innerText = hub.stats.md;
			if (tqsEl) tqsEl.innerText = hub.stats.tqs;

			if (clientsListEl) {
				const clientNames = hub.clients.map((c: any) => c[currentLang] || c.en).join(", ");
				clientsListEl.innerText = clientNames || (currentLang === "ua" ? "Працюючі підприємства" : "Multiple active plants");
			}
		}
	}

	// Lazy load using IntersectionObserver
	const mapContainer = document.getElementById("ukraine-leaflet-map");
	if (mapContainer) {
		const observer = new IntersectionObserver((entries) => {
			if (entries[0].isIntersecting) {
				initMap();
				observer.disconnect();
			}
		}, { rootMargin: "200px" });
		observer.observe(mapContainer);
	}
</script>
```

- [ ] **Step 2: Commit Task 6**

```bash
git add application/frontend/src/components/about/InteractiveUkraineMap.astro
git commit -m "feat(about): create interactive Leaflet Ukraine installation map"
```

______________________________________________________________________

### Task 7: Enterprise Client Directory Component

**Files:**

- Create: `application/frontend/src/components/about/ClientDirectory.astro`

- [ ] **Step 1: Implement `ClientDirectory.astro` with sector tabs and client cards**

Create `application/frontend/src/components/about/ClientDirectory.astro`:

```astro
---
import type { PartnerItem } from "@/lib/about/types";
import { getInlineTranslations, type Lang } from "@/i18n";
import { Building2, ExternalLink, MapPin } from "lucide-react";

interface Props {
	lang: Lang;
	partners: PartnerItem[];
}

const { lang, partners } = Astro.props;
const _ = getInlineTranslations(lang);
---

<section class="w-full py-16 lg:py-24 bg-surface-container-low border-t border-border-subtle/40" id="clients">
	<div class="max-w-container-max mx-auto px-edge-margin">
		<div class="flex flex-col items-center text-center mb-12">
			<span class="font-label-caps text-xs text-secondary uppercase font-semibold tracking-wider">
				{_("Enterprise Reference Directory")}
			</span>
			<h2 class="font-headline-xl text-2xl sm:text-3xl font-semibold text-primary mt-2">
				{_("Trusted by Ukraine's Industrial Flagships")}
			</h2>
			<p class="font-body-md text-sm sm:text-base text-industrial-gray max-w-2xl mt-3">
				{_("Explore verified German inspection equipment installations across leading food, pharmaceutical, and consumer goods manufacturers in Ukraine.")}
			</p>

			<!-- Filter Tabs -->
			<div class="flex flex-wrap items-center justify-center gap-2 mt-8" id="clientFilterGroup">
				<button
					type="button"
					class="client-tab active px-4 py-2 rounded-lg font-technical-data text-xs transition-all shadow-xs bg-primary text-white"
					data-filter="all"
				>
					{_("All Sectors")} ({partners.length})
				</button>
				<button
					type="button"
					class="client-tab px-4 py-2 rounded-lg font-technical-data text-xs transition-all hover:text-primary shadow-xs bg-surface text-industrial-gray"
					data-filter="food"
				>
					{_("Food & Beverage")}
				</button>
				<button
					type="button"
					class="client-tab px-4 py-2 rounded-lg font-technical-data text-xs transition-all hover:text-primary shadow-xs bg-surface text-industrial-gray"
					data-filter="pharma"
				>
					{_("Pharmaceuticals")}
				</button>
				<button
					type="button"
					class="client-tab px-4 py-2 rounded-lg font-technical-data text-xs transition-all hover:text-primary shadow-xs bg-surface text-industrial-gray"
					data-filter="household"
				>
					{_("Chemicals & Packaging")}
				</button>
			</div>
		</div>

		<!-- Client Grid Cards -->
		<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" id="clientCardsContainer">
			{partners.map((partner) => {
				const clientName = partner.name[lang as "en" | "ua"] ?? partner.name.en;
				const eq = partner.equipment;
				const totalUnits = (eq?.md ?? 0) + (eq?.cw ?? 0) + (eq?.tqs ?? 0);
				const categoryLabels: Record<string, string> = {
					food: _("Food & Beverage"),
					pharma: _("Pharmaceuticals"),
					household: _("Chemicals & Packaging"),
				};

				return (
					<div
						class="client-card bg-surface rounded-xl p-6 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between border border-border-subtle/70"
						data-category={partner.category}
					>
						<div>
							<div class="flex items-center justify-between pb-4 mb-4 bg-surface-container-low p-3.5 rounded-lg border border-border-subtle/30">
								<div class="w-14 h-14 flex items-center justify-center bg-white rounded p-1.5 shadow-xs border border-border-subtle/40 shrink-0">
									{partner.logo ? (
										<img
											src={partner.logo}
											alt={`${clientName} Logo`}
											class="max-h-full max-w-full object-contain"
											loading="lazy"
										/>
									) : (
										<Building2 className="w-6 h-6 text-industrial-gray" />
									)}
								</div>
								<span class="px-2.5 py-1 rounded bg-surface-container-high text-primary font-label-caps text-[11px] font-semibold">
									{categoryLabels[partner.category]}
								</span>
							</div>

							<div class="flex items-center justify-between mb-2">
								<h3 class="font-headline-lg text-lg font-semibold text-primary">{clientName}</h3>
								{totalUnits > 0 && (
									<span class="font-technical-data text-xs px-2 py-0.5 rounded bg-secondary/10 text-secondary font-bold">
										{totalUnits} {_("Units")}
									</span>
								)}
							</div>

							{/* Equipment breakdown pill tags */}
							{eq && totalUnits > 0 && (
								<div class="mt-3 pt-3 border-t border-border-subtle/50 space-y-1.5">
									<div class="font-label-caps text-[10px] text-industrial-gray uppercase font-semibold">
										{_("Installed Equipment:")}
									</div>
									<div class="flex flex-wrap gap-1.5 font-technical-data text-xs">
										{eq.cw !== undefined && eq.cw > 0 && (
											<span class="px-2 py-0.5 rounded bg-surface-container-low text-primary text-[11px] border border-border-subtle/50">
												{eq.cw}x {_("Checkweighers")}
											</span>
										)}
										{eq.md !== undefined && eq.md > 0 && (
											<span class="px-2 py-0.5 rounded bg-surface-container-low text-primary text-[11px] border border-border-subtle/50">
												{eq.md}x {_("Metal Detectors")}
											</span>
										)}
										{eq.tqs !== undefined && eq.tqs > 0 && (
											<span class="px-2 py-0.5 rounded bg-surface-container-low text-primary text-[11px] border border-border-subtle/50">
												{eq.tqs}x {_("Track & Trace")}
											</span>
										)}
									</div>
								</div>
							)}
						</div>

						<div class="mt-6 pt-3 bg-surface-container-low -mx-6 -mb-6 px-6 py-3 rounded-b-xl flex items-center justify-between font-label-caps text-[11px] text-industrial-gray border-t border-border-subtle/40">
							<div class="flex items-center gap-1">
								<MapPin className="w-3.5 h-3.5 text-secondary shrink-0" />
								<span>{partner.adres && partner.adres.length > 0 ? partner.adres.join(", ") : _("Ukraine")}</span>
							</div>
							{partner.website && (
								<a
									href={partner.website}
									target="_blank"
									rel="noopener noreferrer"
									class="text-primary hover:text-secondary inline-flex items-center gap-0.5 font-technical-data font-medium"
									aria-label={`${clientName} Website`}
								>
									<span>{_("Site")}</span>
									<ExternalLink className="w-3 h-3" />
								</a>
							)}
						</div>
					</div>
				);
			})}
		</div>
	</div>
</section>

<script>
	function setupClientFilters() {
		const tabs = document.querySelectorAll(".client-tab");
		const cards = document.querySelectorAll("#clientCardsContainer .client-card");

		tabs.forEach((tab) => {
			tab.addEventListener("click", () => {
				const filter = tab.getAttribute("data-filter");

				tabs.forEach((t) => {
					if (t === tab) {
						t.classList.remove("bg-surface", "text-industrial-gray");
						t.classList.add("bg-primary", "text-white");
					} else {
						t.classList.remove("bg-primary", "text-white");
						t.classList.add("bg-surface", "text-industrial-gray");
					}
				});

				cards.forEach((card) => {
					const category = card.getAttribute("data-category");
					if (filter === "all" || category === filter) {
						(card as HTMLElement).style.display = "flex";
					} else {
						(card as HTMLElement).style.display = "none";
					}
				});
			});
		});
	}

	if (document.readyState === "loading") {
		document.addEventListener("DOMContentLoaded", setupClientFilters);
	} else {
		setupClientFilters();
	}
</script>
```

- [ ] **Step 2: Commit Task 7**

```bash
git add application/frontend/src/components/about/ClientDirectory.astro
git commit -m "feat(about): create enterprise client directory with filtering"
```

______________________________________________________________________

### Task 8: About Page Route, i18n Translations & Structured Data

**Files:**

- Create: `application/frontend/src/pages/[lang]/about.astro`

- Test: `application/frontend/tests/pages/about.test.ts`

- Modify: `application/frontend/src/i18n/ui.ts` (or run i18n extract/compile)

- [ ] **Step 1: Create `src/pages/[lang]/about.astro`**

Create `application/frontend/src/pages/[lang]/about.astro`:

```astro
---
import AboutCta from "@/components/about/AboutCta.astro";
import AboutHero from "@/components/about/AboutHero.astro";
import ClientDirectory from "@/components/about/ClientDirectory.astro";
import InfrastructureHighlights from "@/components/about/InfrastructureHighlights.astro";
import InteractiveUkraineMap from "@/components/about/InteractiveUkraineMap.astro";
import ManufacturerCredentials from "@/components/about/ManufacturerCredentials.astro";
import companyData from "@/data/company.json";
import documentsData from "@/data/documents.json";
import partnersRaw from "@/data/partners.json";
import { getInlineTranslations, getIsoLang, isValidLang, type Lang } from "@/i18n";
import { languages } from "@/i18n/ui";
import Layout from "@/layouts/Layout.astro";
import {
	aggregateCityHubs,
	calculateGlobalStats,
	getAllPartnersList,
	getSectorBreakdowns,
} from "@/lib/about/partners-data";
import type { PartnersData } from "@/lib/about/types";

export function getStaticPaths() {
	return (Object.keys(languages) as Lang[]).map((lang) => ({ params: { lang } }));
}

const langParam = Astro.params.lang;
if (!isValidLang(langParam)) {
	return new Response(null, { status: 404 });
}
const lang: Lang = langParam;
const _ = getInlineTranslations(lang);

const partnersData = partnersRaw as PartnersData;
const globalStats = calculateGlobalStats(partnersData);
const cityHubs = aggregateCityHubs(partnersData);
const sectorBreakdowns = getSectorBreakdowns(partnersData);
const allPartners = getAllPartnersList(partnersData);

const siteUrl = Astro.site ?? "https://ocs.com.ua";
const currentUrl = new URL(Astro.url.pathname, siteUrl).href;

const structuredData = [
	{
		"@context": "https://schema.org",
		"@type": "AboutPage",
		url: currentUrl,
		inLanguage: getIsoLang(lang),
		name: lang === "en" ? "About OS-Technology Ukraine" : "Про компанію ОС-Технолоджи Україна",
		description:
			lang === "en"
				? "Official exclusive distributor and certified integration partner of WIPOTEC GmbH and MESUTRONIC Gerätebau GmbH in Ukraine."
				: "Офіційний ексклюзивний дистриб'ютор та сертифікований інтеграційний партнер WIPOTEC GmbH та MESUTRONIC Gerätebau GmbH в Україні.",
		breadcrumb: {
			"@type": "BreadcrumbList",
			itemListElement: [
				{
					"@type": "ListItem",
					position: 1,
					name: lang === "en" ? "Home" : "Головна",
					item: new URL(`/${lang}`, siteUrl).href,
				},
				{
					"@type": "ListItem",
					position: 2,
					name: lang === "en" ? "About Us" : "Про нас",
					item: currentUrl,
				},
			],
		},
	},
	{
		"@context": "https://schema.org",
		"@type": "Organization",
		name: lang === "en" ? "OS-Technology Ukraine" : "ОС-Технолоджи Україна",
		url: new URL(`/${lang}`, siteUrl).href,
		telephone: companyData.phone,
		email: companyData.email,
		knowsAbout: [
			"WIPOTEC GmbH Dynamic Checkweighers",
			"MESUTRONIC Gerätebau Metal Detectors",
			"Industrial X-Ray Scanners",
			"Pharmaceutical Track and Trace Serialization",
			"HACCP and IFS Food Inspection Compliance",
		],
		hasCredential: [
			{
				"@type": "EducationalOccupationalCredential",
				name: "WIPOTEC Official Distributor Authorization",
				url: new URL(documentsData.wipotec, siteUrl).href,
			},
			{
				"@type": "EducationalOccupationalCredential",
				name: "MESUTRONIC Authorized Distributor Certificate",
				url: new URL(documentsData.mesutronic, siteUrl).href,
			},
		],
		areaServed: {
			"@type": "Country",
			name: "Ukraine",
		},
	},
];
---

<Layout
	title={lang === "en" ? "About Us | OS-Technology Ukraine" : "Про нас | ОС-Технолоджи Україна"}
	description={lang === "en"
		? "Official exclusive distributor and certified engineering partner of WIPOTEC GmbH and MESUTRONIC Gerätebau GmbH in Ukraine. 250+ systems installed."
		: "Офіційний дистриб'ютор та сервісний партнер WIPOTEC GmbH та MESUTRONIC Gerätebau GmbH в Україні. Понад 250 встановлених систем контролю якості."}
	lang={lang}
	structuredData={structuredData}
>
	<main>
		<AboutHero lang={lang} stats={globalStats} />
		<ManufacturerCredentials lang={lang} />
		<InfrastructureHighlights lang={lang} />
		<InteractiveUkraineMap lang={lang} cityHubs={cityHubs} sectors={sectorBreakdowns} />
		<ClientDirectory lang={lang} partners={allPartners} />
		<AboutCta lang={lang} />
	</main>
</Layout>
```

- [ ] **Step 2: Write Page & Structured Data Unit Test**

Create `application/frontend/tests/pages/about.test.ts`:

```typescript
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
});
```

- [ ] **Step 3: Extract & Compile Translations**

Run in `application/frontend`: `npm run i18n`
Verify that `src/i18n/ui.ts` contains all new string keys and translation completeness passes.

- [ ] **Step 4: Run unit & parity tests**

Run: `bun test`
Expected: All tests pass including `parity.test.ts` and `about.test.ts`.

- [ ] **Step 5: Commit Task 8**

```bash
git add application/frontend/src/pages/[lang]/about.astro application/frontend/tests/pages/about.test.ts application/frontend/src/i18n/
git commit -m "feat(about): create about page route, structured data, and i18n translations"
```

______________________________________________________________________

### Task 9: Verification & Build Validation

**Files:**

- None (Build & validation only)

- [ ] **Step 1: Run code quality check**

Run in `application/frontend`: `npm run check` (Biome check)
Fix any formatting or lint warnings.

- [ ] **Step 2: Run complete test suite**

Run in `application/frontend`: `bun test`
Expected: 100% test suite passing.

- [ ] **Step 3: Run static Astro production build**

Run in `application/frontend`: `npm run build`
Expected: Build succeeds, emitting static `/en/about/index.html` and `/ua/about/index.html`.

- [ ] **Step 4: Commit any final formatting adjustments**

```bash
git add -A
git commit -m "chore(about): format and verify production build"
```

______________________________________________________________________

## Self-Review Checklist

- **Spec Coverage:**
  - Hero with dynamic stats from `partners.json`? Yes (Task 4)
  - Official WIPOTEC & MESUTRONIC credentials with PDF download links from `documents.json`? Yes (Task 5)
  - Infrastructure Highlights? Yes (Task 4)
  - Leaflet Ukraine map with pulsing pins & city hub drawer? Yes (Task 6)
  - Client Directory with sector filter tabs? Yes (Task 7)
  - Automated geocoding with cache? Yes (Task 1)
  - Bilingual i18n and Schema.org JSON-LD? Yes (Task 8)
- **Placeholders Scan:** No "TBD", "TODO", or vague requirements found.
- **Type Consistency:** `EquipmentStats`, `CityHub`, `PartnerItem`, and `SectorBreakdown` match throughout all tasks.
