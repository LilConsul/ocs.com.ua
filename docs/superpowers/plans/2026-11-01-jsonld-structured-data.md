# Comprehensive Interconnected JSON-LD Structured Data Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use skills:subagent-driven-development (recommended) or skills:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a unified, interconnected Schema.org JSON-LD Knowledge Graph architecture across all pages with modular builders, full data presentation (specifications, credentials, gallery, datasheets, catalog lists), and clean Layout integration.

**Architecture:** A single `<script type="application/ld+json">` with `{"@context": "https://schema.org", "@graph": [...]}` per page, interconnecting `Organization`, `WebSite`, `WebPage`, `BreadcrumbList`, and page-specific `mainEntity` (`Product`, `TechArticle`, `ItemList`) via canonical `@id` URIs. Modular typed schema builders in `src/lib/structured-data/` sanitize and compose graphs cleanly without undefined or empty keys.

**Tech Stack:** Astro 5, TypeScript, Schema.org JSON-LD, Bun Test.

______________________________________________________________________

### Task 1: Clean Utility, Types & Canonical Graph ID Generator

**Files:**

- Create: `application/frontend/src/lib/structured-data/types.ts`

- Create: `application/frontend/src/lib/structured-data/clean.ts`

- Create: `application/frontend/src/lib/structured-data/graph.ts`

- Test: `application/frontend/tests/lib/structured-data.test.ts`

- [ ] **Step 1: Write tests for clean and graph ID helpers**

Edit `application/frontend/tests/lib/structured-data.test.ts`:

```typescript
import { describe, expect, it } from "bun:test";
import { cleanSchema } from "@/lib/structured-data/clean";
import {
	absUrl,
	articleId,
	breadcrumbId,
	itemListId,
	organizationId,
	productId,
	webpageId,
	websiteId,
} from "@/lib/structured-data/graph";

const SITE = "https://ocs.com.ua";

describe("structured-data: cleanSchema", () => {
	it("removes undefined and null properties recursively", () => {
		const input = {
			"@type": "Product",
			name: "HC-A",
			description: undefined,
			offers: null,
			brand: {
				"@id": "https://ocs.com.ua/#organization",
				legalName: undefined,
			},
		};
		expect(cleanSchema(input)).toEqual({
			"@type": "Product",
			name: "HC-A",
			brand: {
				"@id": "https://ocs.com.ua/#organization",
			},
		});
	});

	it("removes empty arrays and leaves populated arrays intact", () => {
		const input = {
			"@type": "Product",
			image: [],
			additionalProperty: [{ "@type": "PropertyValue", name: "Speed", value: "2.5 m/s" }],
		};
		expect(cleanSchema(input)).toEqual({
			"@type": "Product",
			additionalProperty: [{ "@type": "PropertyValue", name: "Speed", value: "2.5 m/s" }],
		});
	});
});

describe("structured-data: canonical graph IDs", () => {
	it("generates stable organization and website IDs", () => {
		expect(organizationId(SITE)).toBe("https://ocs.com.ua/#organization");
		expect(websiteId("en", SITE)).toBe("https://ocs.com.ua/en/#website");
		expect(websiteId("ua", SITE)).toBe("https://ocs.com.ua/ua/#website");
	});

	it("generates stable page-level entity IDs", () => {
		const pageUrl = "https://ocs.com.ua/en/catalogue/equipment/checkweigher/hc-a/";
		expect(webpageId(pageUrl)).toBe(`${pageUrl}#webpage`);
		expect(breadcrumbId(pageUrl)).toBe(`${pageUrl}#breadcrumb`);
		expect(productId(pageUrl)).toBe(`${pageUrl}#product`);
		expect(articleId(pageUrl)).toBe(`${pageUrl}#article`);
		expect(itemListId(pageUrl)).toBe(`${pageUrl}#itemlist`);
	});

	it("normalizes absolute URLs", () => {
		expect(absUrl("/assets/logo.png", SITE)).toBe("https://ocs.com.ua/assets/logo.png");
		expect(absUrl("https://example.com/doc.pdf", SITE)).toBe("https://example.com/doc.pdf");
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test tests/lib/structured-data.test.ts` (in `application/frontend`)
Expected: FAIL with missing module `@/lib/structured-data/clean` or `@/lib/structured-data/graph`.

- [ ] **Step 3: Create types, clean, and graph modules**

Create `application/frontend/src/lib/structured-data/types.ts`:

```typescript
import type { Lang } from "@/i18n/utils";

export type SiteOrigin = string | URL;

export type JsonValue =
	| string
	| number
	| boolean
	| null
	| undefined
	| { [key: string]: JsonValue }
	| JsonValue[];

export interface SchemaNode {
	"@type": string | string[];
	"@id"?: string;
	[key: string]: JsonValue;
}

export interface BreadcrumbItem {
	name: string;
	url: string;
}

export interface SchemaGraph {
	"@context": "https://schema.org";
	"@graph": SchemaNode[];
}
```

Create `application/frontend/src/lib/structured-data/clean.ts`:

```typescript
import type { JsonValue } from "./types";

/**
 * Recursively cleans Schema.org objects:
 * - Drops keys with undefined or null values
 * - Drops keys with empty arrays
 * - Cleans nested objects and arrays
 */
export function cleanSchema<T extends JsonValue>(value: T): T {
	if (value === null || value === undefined) {
		return undefined as unknown as T;
	}

	if (Array.isArray(value)) {
		const cleanedArray = value
			.map((item) => cleanSchema(item))
			.filter((item) => item !== undefined && item !== null);
		return (cleanedArray.length > 0 ? cleanedArray : undefined) as unknown as T;
	}

	if (typeof value === "object") {
		const cleanedObj: Record<string, JsonValue> = {};
		for (const [k, v] of Object.entries(value)) {
			const cleanedVal = cleanSchema(v as JsonValue);
			if (cleanedVal !== undefined && cleanedVal !== null) {
				cleanedObj[k] = cleanedVal;
			}
		}
		return cleanedObj as unknown as T;
	}

	return value;
}
```

Create `application/frontend/src/lib/structured-data/graph.ts`:

```typescript
import type { Lang } from "@/i18n/utils";
import type { SiteOrigin } from "./types";

export function absUrl(pathOrUrl: string, site: SiteOrigin): string {
	return new URL(pathOrUrl, site).href;
}

export function organizationId(site: SiteOrigin): string {
	return absUrl("/#organization", site);
}

export function websiteId(lang: Lang, site: SiteOrigin): string {
	return absUrl(`/${lang}/#website`, site);
}

export function webpageId(canonicalUrl: string): string {
	const base = canonicalUrl.split("#")[0];
	return `${base}#webpage`;
}

export function breadcrumbId(canonicalUrl: string): string {
	const base = canonicalUrl.split("#")[0];
	return `${base}#breadcrumb`;
}

export function productId(canonicalUrl: string): string {
	const base = canonicalUrl.split("#")[0];
	return `${base}#product`;
}

export function articleId(canonicalUrl: string): string {
	const base = canonicalUrl.split("#")[0];
	return `${base}#article`;
}

export function itemListId(canonicalUrl: string): string {
	const base = canonicalUrl.split("#")[0];
	return `${base}#itemlist`;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test tests/lib/structured-data.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/structured-data/ tests/lib/structured-data.test.ts
git commit -m "feat(seo): add structured data types, clean utility, and graph ID helpers"
```

______________________________________________________________________

### Task 2: Organization, LocalBusiness & WebSite Builders

**Files:**

- Create: `application/frontend/src/lib/structured-data/organization.ts`

- Create: `application/frontend/src/lib/structured-data/website.ts`

- Modify: `application/frontend/tests/lib/structured-data.test.ts`

- [ ] **Step 1: Write tests for organization and website builders**

Append to `application/frontend/tests/lib/structured-data.test.ts`:

```typescript
import companyData from "@/data/company.json";
import { organizationSchema } from "@/lib/structured-data/organization";
import { websiteSchema } from "@/lib/structured-data/website";

describe("structured-data: organizationSchema", () => {
	it("builds a rich unified Organization node", () => {
		const org = organizationSchema("en", SITE);
		expect(org["@type"]).toEqual(["Organization", "LocalBusiness"]);
		expect(org["@id"]).toBe("https://ocs.com.ua/#organization");
		expect(org.name).toBe("OS-Technology Ukraine");
		expect(org.url).toBe("https://ocs.com.ua/en/");
		expect(org.email).toBe(companyData.email);
		expect(org.telephone).toBe(companyData.phone);
		expect(org.address).toEqual({
			"@type": "PostalAddress",
			streetAddress: "67 Beresteiskyi Ave, Office 9",
			addressLocality: "Kyiv",
			postalCode: "03062",
			addressCountry: "UA",
		});
		expect(org.geo).toEqual({
			"@type": "GeoCoordinates",
			latitude: 50.4578,
			longitude: 30.4024,
		});
		expect(org.hasCredential).toBeDefined();
		expect(org.knowsAbout).toBeDefined();
	});

	it("translates address and name for Ukrainian locale", () => {
		const org = organizationSchema("ua", SITE);
		expect(org.name).toBe("ОС-Технолоджи Україна");
		expect(org.url).toBe("https://ocs.com.ua/ua/");
		expect(org.address.addressLocality).toBe("Київ");
	});
});

describe("structured-data: websiteSchema", () => {
	it("builds a WebSite node referencing the organization publisher", () => {
		const ws = websiteSchema("en", SITE);
		expect(ws["@type"]).toBe("WebSite");
		expect(ws["@id"]).toBe("https://ocs.com.ua/en/#website");
		expect(ws.inLanguage).toBe("en");
		expect(ws.publisher).toEqual({ "@id": "https://ocs.com.ua/#organization" });
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test tests/lib/structured-data.test.ts`
Expected: FAIL with missing `@/lib/structured-data/organization` and `@/lib/structured-data/website`.

- [ ] **Step 3: Implement organization and website builders**

Create `application/frontend/src/lib/structured-data/organization.ts`:

```typescript
import companyData from "@/data/company.json";
import documentsData from "@/data/documents.json";
import type { Lang } from "@/i18n/utils";
import { absUrl, organizationId } from "./graph";
import type { SchemaNode, SiteOrigin } from "./types";

export function organizationSchema(lang: Lang, site: SiteOrigin): SchemaNode {
	const address = companyData.address[lang as "en" | "ua"] ?? companyData.address.en;
	const contactPerson = companyData.contactPerson[lang as "en" | "ua"] ?? companyData.contactPerson.en;

	const credentials = [
		documentsData.wipotec
			? {
					"@type": "EducationalOccupationalCredential",
					name: "WIPOTEC Official Distributor Authorization",
					url: absUrl(documentsData.wipotec, site),
				}
			: null,
		documentsData.mesutronic
			? {
					"@type": "EducationalOccupationalCredential",
					name: "MESUTRONIC Authorized Distributor Certificate",
					url: absUrl(documentsData.mesutronic, site),
				}
			: null,
	].filter(Boolean);

	return {
		"@type": ["Organization", "LocalBusiness"],
		"@id": organizationId(site),
		name: lang === "en" ? "OS-Technology Ukraine" : "ОС-Технолоджи Україна",
		url: absUrl(`/${lang}/`, site),
		logo: absUrl("/apple-touch-icon.png", site),
		email: companyData.email,
		telephone: companyData.phone,
		address: {
			"@type": "PostalAddress",
			streetAddress: address.office ? `${address.street}, ${address.office}` : address.street,
			addressLocality: address.city,
			postalCode: address.postalCode,
			addressCountry: "UA",
		},
		geo: {
			"@type": "GeoCoordinates",
			latitude: 50.4578,
			longitude: 30.4024,
		},
		openingHoursSpecification: {
			"@type": "OpeningHoursSpecification",
			dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
			opens: "09:00",
			closes: "18:00",
		},
		contactPoint: {
			"@type": "ContactPoint",
			contactType: "sales",
			name: contactPerson.name,
			telephone: companyData.phone,
			email: companyData.email,
			areaServed: "UA",
			availableLanguage: ["uk", "en"],
		},
		knowsAbout: [
			"WIPOTEC GmbH Dynamic Checkweighers",
			"MESUTRONIC Gerätebau Metal Detectors",
			"Industrial X-Ray Scanners",
			"Pharmaceutical Track and Trace Serialization",
			"HACCP and IFS Food Inspection Compliance",
		],
		hasCredential: credentials.length > 0 ? (credentials as unknown as SchemaNode[]) : undefined,
		areaServed: {
			"@type": "Country",
			name: "Ukraine",
		},
	};
}
```

Create `application/frontend/src/lib/structured-data/website.ts`:

```typescript
import { getIsoLang, type Lang } from "@/i18n/utils";
import { absUrl, organizationId, websiteId } from "./graph";
import type { SchemaNode, SiteOrigin } from "./types";

export function websiteSchema(lang: Lang, site: SiteOrigin): SchemaNode {
	return {
		"@type": "WebSite",
		"@id": websiteId(lang, site),
		name: lang === "en" ? "OS-Technology Ukraine" : "ОС-Технолоджи Україна",
		url: absUrl(`/${lang}/`, site),
		inLanguage: getIsoLang(lang),
		publisher: {
			"@id": organizationId(site),
		},
	};
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test tests/lib/structured-data.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/structured-data/organization.ts src/lib/structured-data/website.ts tests/lib/structured-data.test.ts
git commit -m "feat(seo): implement rich Organization and WebSite schema builders"
```

______________________________________________________________________

### Task 3: BreadcrumbList and WebPage / Collection Builders

**Files:**

- Create: `application/frontend/src/lib/structured-data/breadcrumb.ts`

- Create: `application/frontend/src/lib/structured-data/webpage.ts`

- Modify: `application/frontend/tests/lib/structured-data.test.ts`

- [ ] **Step 1: Write tests for breadcrumbs and webpage/collection builders**

Append to `application/frontend/tests/lib/structured-data.test.ts`:

```typescript
import { breadcrumbSchema } from "@/lib/structured-data/breadcrumb";
import { collectionPageSchema, webPageSchema } from "@/lib/structured-data/webpage";

describe("structured-data: breadcrumbSchema", () => {
	it("numbers items from 1 and links canonical ID", () => {
		const pageUrl = "https://ocs.com.ua/en/wiki/";
		const crumbs = breadcrumbSchema(
			[
				{ name: "Home", url: "https://ocs.com.ua/en/" },
				{ name: "Knowledge Base", url: pageUrl },
			],
			pageUrl
		);
		expect(crumbs["@type"]).toBe("BreadcrumbList");
		expect(crumbs["@id"]).toBe("https://ocs.com.ua/en/wiki/#breadcrumb");
		expect(crumbs.itemListElement).toEqual([
			{ "@type": "ListItem", position: 1, name: "Home", item: "https://ocs.com.ua/en/" },
			{ "@type": "ListItem", position: 2, name: "Knowledge Base", item: pageUrl },
		]);
	});
});

describe("structured-data: webPageSchema", () => {
	it("builds a WebPage node linked to website, organization, and breadcrumb", () => {
		const pageUrl = "https://ocs.com.ua/en/about/";
		const page = webPageSchema({
			lang: "en",
			url: pageUrl,
			site: SITE,
			title: "About Us",
			description: "Company overview",
			pageType: "AboutPage",
		});
		expect(page["@type"]).toBe("AboutPage");
		expect(page["@id"]).toBe("https://ocs.com.ua/en/about/#webpage");
		expect(page.isPartOf).toEqual({ "@id": "https://ocs.com.ua/en/#website" });
		expect(page.about).toEqual({ "@id": "https://ocs.com.ua/#organization" });
		expect(page.breadcrumb).toEqual({ "@id": "https://ocs.com.ua/en/about/#breadcrumb" });
	});
});

describe("structured-data: collectionPageSchema", () => {
	it("builds a CollectionPage node with an ItemList mainEntity", () => {
		const pageUrl = "https://ocs.com.ua/en/catalogue/equipment/checkweigher/";
		const collection = collectionPageSchema({
			lang: "en",
			url: pageUrl,
			site: SITE,
			title: "Checkweighers",
			description: "Dynamic checkweighers",
			items: [
				{
					name: "HC-A",
					url: "https://ocs.com.ua/en/catalogue/equipment/checkweigher/hc-a/",
					description: "High speed",
				},
				{
					name: "EC-E",
					url: "https://ocs.com.ua/en/catalogue/equipment/checkweigher/ec-e/",
				},
			],
		});
		expect(collection.page["@type"]).toBe("CollectionPage");
		expect(collection.page.mainEntity).toEqual({
			"@id": "https://ocs.com.ua/en/catalogue/equipment/checkweigher/#itemlist",
		});
		expect(collection.itemList["@type"]).toBe("ItemList");
		expect(collection.itemList["@id"]).toBe(
			"https://ocs.com.ua/en/catalogue/equipment/checkweigher/#itemlist"
		);
		expect(collection.itemList.numberOfItems).toBe(2);
		expect(collection.itemList.itemListElement).toEqual([
			{
				"@type": "ListItem",
				position: 1,
				name: "HC-A",
				url: "https://ocs.com.ua/en/catalogue/equipment/checkweigher/hc-a/",
				description: "High speed",
			},
			{
				"@type": "ListItem",
				position: 2,
				name: "EC-E",
				url: "https://ocs.com.ua/en/catalogue/equipment/checkweigher/ec-e/",
				description: undefined,
			},
		]);
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test tests/lib/structured-data.test.ts`
Expected: FAIL with missing `@/lib/structured-data/breadcrumb` and `@/lib/structured-data/webpage`.

- [ ] **Step 3: Implement breadcrumb and webpage builders**

Create `application/frontend/src/lib/structured-data/breadcrumb.ts`:

```typescript
import { breadcrumbId } from "./graph";
import type { BreadcrumbItem, SchemaNode } from "./types";

export function breadcrumbSchema(items: BreadcrumbItem[], pageUrl: string): SchemaNode {
	return {
		"@type": "BreadcrumbList",
		"@id": breadcrumbId(pageUrl),
		itemListElement: items.map((item, index) => ({
			"@type": "ListItem",
			position: index + 1,
			name: item.name,
			item: item.url,
		})),
	};
}
```

Create `application/frontend/src/lib/structured-data/webpage.ts`:

```typescript
import { getIsoLang, type Lang } from "@/i18n/utils";
import { breadcrumbId, itemListId, organizationId, webpageId, websiteId } from "./graph";
import type { BreadcrumbItem, SchemaNode, SiteOrigin } from "./types";

export interface WebPageOptions {
	lang: Lang;
	url: string;
	site: SiteOrigin;
	title: string;
	description: string;
	pageType?: "WebPage" | "AboutPage" | "ContactPage" | "CollectionPage";
	mainEntityId?: string;
	hasBreadcrumb?: boolean;
}

export function webPageSchema({
	lang,
	url,
	site,
	title,
	description,
	pageType = "WebPage",
	mainEntityId,
	hasBreadcrumb = true,
}: WebPageOptions): SchemaNode {
	return {
		"@type": pageType,
		"@id": webpageId(url),
		url,
		name: title,
		description,
		inLanguage: getIsoLang(lang),
		isPartOf: {
			"@id": websiteId(lang, site),
		},
		about: {
			"@id": organizationId(site),
		},
		breadcrumb: hasBreadcrumb ? { "@id": breadcrumbId(url) } : undefined,
		mainEntity: mainEntityId ? { "@id": mainEntityId } : undefined,
	};
}

export interface CollectionItem {
	name: string;
	url: string;
	description?: string;
}

export interface CollectionPageOptions {
	lang: Lang;
	url: string;
	site: SiteOrigin;
	title: string;
	description: string;
	items: CollectionItem[];
}

export function collectionPageSchema({
	lang,
	url,
	site,
	title,
	description,
	items,
}: CollectionPageOptions): { page: SchemaNode; itemList: SchemaNode } {
	const listId = itemListId(url);
	const page = webPageSchema({
		lang,
		url,
		site,
		title,
		description,
		pageType: "CollectionPage",
		mainEntityId: listId,
	});

	const itemList: SchemaNode = {
		"@type": "ItemList",
		"@id": listId,
		numberOfItems: items.length,
		itemListElement: items.map((item, index) => ({
			"@type": "ListItem",
			position: index + 1,
			name: item.name,
			url: item.url,
			description: item.description,
		})),
	};

	return { page, itemList };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test tests/lib/structured-data.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/structured-data/breadcrumb.ts src/lib/structured-data/webpage.ts tests/lib/structured-data.test.ts
git commit -m "feat(seo): implement BreadcrumbList, WebPage, and CollectionPage schema builders"
```

______________________________________________________________________

### Task 4: Product Schema Builder (Specs, Gallery, Datasheet, Inquiry-only Offer)

**Files:**

- Create: `application/frontend/src/lib/structured-data/product.ts`

- Modify: `application/frontend/tests/lib/structured-data.test.ts`

- [ ] **Step 1: Write tests for productSchema**

Append to `application/frontend/tests/lib/structured-data.test.ts`:

```typescript
import { productSchema } from "@/lib/structured-data/product";

describe("structured-data: productSchema", () => {
	const productBase = {
		name: "HC-A Checkweigher",
		description: "High speed dynamic checkweigher",
		url: "https://ocs.com.ua/en/catalogue/equipment/checkweigher/hc-a/",
		lang: "en" as const,
		site: SITE,
		category: "Checkweighers",
		images: ["/assets/equipment/hc-a/front.webp", "/assets/equipment/hc-a/left.webp"],
		specs: [
			{ label: "Weighing Range", value: "up to 750g" },
			{ label: "Throughput", value: "up to 600 pcs/min" },
		],
		datasheetUrl: "/assets/equipment/hc-a/datasheet.pdf",
	};

	it("builds a full product schema with specs, datasheet, gallery, and inquiry offer", () => {
		const product = productSchema(productBase);
		expect(product["@type"]).toBe("Product");
		expect(product["@id"]).toBe("https://ocs.com.ua/en/catalogue/equipment/checkweigher/hc-a/#product");
		expect(product.name).toBe("HC-A Checkweigher");
		expect(product.category).toBe("Checkweighers");
		expect(product.image).toEqual([
			"https://ocs.com.ua/assets/equipment/hc-a/front.webp",
			"https://ocs.com.ua/assets/equipment/hc-a/left.webp",
		]);
		expect(product.brand).toEqual({ "@id": "https://ocs.com.ua/#organization" });
		expect(product.manufacturer).toEqual({ "@id": "https://ocs.com.ua/#organization" });
		expect(product.additionalProperty).toEqual([
			{ "@type": "PropertyValue", name: "Weighing Range", value: "up to 750g" },
			{ "@type": "PropertyValue", name: "Throughput", value: "up to 600 pcs/min" },
		]);
		expect(product.subjectOf).toEqual({
			"@type": "DigitalDocument",
			name: "Technical Datasheet",
			url: "https://ocs.com.ua/assets/equipment/hc-a/datasheet.pdf",
		});
		expect(product.offers).toEqual({
			"@type": "Offer",
			availability: "https://schema.org/InStock",
			priceCurrency: "UAH",
			price: "0",
			priceSpecification: {
				"@type": "PriceSpecification",
				description: "Price on request",
			},
			seller: {
				"@id": "https://ocs.com.ua/#organization",
			},
		});
	});

	it("omits empty gallery, specs, or datasheet when not present", () => {
		const minimal = productSchema({
			name: "Basic Weigher",
			description: "Simple desc",
			url: "https://ocs.com.ua/ua/catalogue/equipment/checkweigher/basic/",
			lang: "ua",
			site: SITE,
		});
		expect(minimal.image).toBeUndefined();
		expect(minimal.additionalProperty).toBeUndefined();
		expect(minimal.subjectOf).toBeUndefined();
		expect(minimal.inLanguage).toBe("uk");
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test tests/lib/structured-data.test.ts`
Expected: FAIL with missing `@/lib/structured-data/product`.

- [ ] **Step 3: Implement product schema builder**

Create `application/frontend/src/lib/structured-data/product.ts`:

```typescript
import { getIsoLang, type Lang } from "@/i18n/utils";
import { absUrl, organizationId, productId } from "./graph";
import type { SchemaNode, SiteOrigin } from "./types";

export interface ProductSpec {
	label: string;
	value: string;
}

export interface ProductSchemaInput {
	name: string;
	description: string;
	url: string;
	lang: Lang;
	site: SiteOrigin;
	category?: string;
	images?: string[] | null;
	specs?: ProductSpec[] | null;
	datasheetUrl?: string | null;
}

export function productSchema({
	name,
	description,
	url,
	lang,
	site,
	category,
	images,
	specs,
	datasheetUrl,
}: ProductSchemaInput): SchemaNode {
	const validImages = images?.filter(Boolean) ?? [];
	const validSpecs = specs?.filter((s) => s.label && s.value) ?? [];

	return {
		"@type": "Product",
		"@id": productId(url),
		name,
		description,
		url,
		inLanguage: getIsoLang(lang),
		category,
		image: validImages.length > 0 ? validImages.map((img) => absUrl(img, site)) : undefined,
		brand: {
			"@id": organizationId(site),
		},
		manufacturer: {
			"@id": organizationId(site),
		},
		additionalProperty:
			validSpecs.length > 0
				? validSpecs.map((spec) => ({
						"@type": "PropertyValue",
						name: spec.label,
						value: spec.value,
					}))
				: undefined,
		subjectOf: datasheetUrl
			? {
					"@type": "DigitalDocument",
					name: lang === "en" ? "Technical Datasheet" : "Технічний паспорт",
					url: absUrl(datasheetUrl, site),
				}
			: undefined,
		offers: {
			"@type": "Offer",
			availability: "https://schema.org/InStock",
			priceCurrency: "UAH",
			price: "0",
			priceSpecification: {
				"@type": "PriceSpecification",
				description: lang === "en" ? "Price on request" : "Ціна за запитом",
			},
			seller: {
				"@id": organizationId(site),
			},
		},
	};
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test tests/lib/structured-data.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/structured-data/product.ts tests/lib/structured-data.test.ts
git commit -m "feat(seo): implement Product schema builder with specs, datasheet, and inquiry offer"
```

______________________________________________________________________

### Task 5: TechArticle / Article Schema Builder

**Files:**

- Create: `application/frontend/src/lib/structured-data/article.ts`

- Modify: `application/frontend/tests/lib/structured-data.test.ts`

- [ ] **Step 1: Write tests for articleSchema**

Append to `application/frontend/tests/lib/structured-data.test.ts`:

```typescript
import { articleSchema } from "@/lib/structured-data/article";

describe("structured-data: articleSchema", () => {
	it("builds a TechArticle node with reading time and author/publisher refs", () => {
		const pageUrl = "https://ocs.com.ua/en/wiki/weighing-accuracy/";
		const article = articleSchema({
			headline: "Dynamic Weighing Accuracy",
			description: "Understanding calibration tolerances",
			url: pageUrl,
			lang: "en",
			site: SITE,
			image: "/assets/wiki/cover.webp",
			readMinutes: 4,
			wordCount: 820,
		});

		expect(article["@type"]).toBe("TechArticle");
		expect(article["@id"]).toBe(`${pageUrl}#article`);
		expect(article.headline).toBe("Dynamic Weighing Accuracy");
		expect(article.image).toEqual(["https://ocs.com.ua/assets/wiki/cover.webp"]);
		expect(article.timeRequired).toBe("PT4M");
		expect(article.wordCount).toBe(820);
		expect(article.author).toEqual({ "@id": "https://ocs.com.ua/#organization" });
		expect(article.publisher).toEqual({ "@id": "https://ocs.com.ua/#organization" });
		expect(article.mainEntityOfPage).toEqual({ "@id": `${pageUrl}#webpage` });
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test tests/lib/structured-data.test.ts`
Expected: FAIL with missing `@/lib/structured-data/article`.

- [ ] **Step 3: Implement article schema builder**

Create `application/frontend/src/lib/structured-data/article.ts`:

```typescript
import { getIsoLang, type Lang } from "@/i18n/utils";
import { absUrl, articleId, organizationId, webpageId } from "./graph";
import type { SchemaNode, SiteOrigin } from "./types";

export interface ArticleSchemaInput {
	headline: string;
	description: string;
	url: string;
	lang: Lang;
	site: SiteOrigin;
	image?: string | null;
	readMinutes?: number;
	wordCount?: number;
}

export function articleSchema({
	headline,
	description,
	url,
	lang,
	site,
	image,
	readMinutes,
	wordCount,
}: ArticleSchemaInput): SchemaNode {
	return {
		"@type": "TechArticle",
		"@id": articleId(url),
		headline,
		description,
		inLanguage: getIsoLang(lang),
		image: image ? [absUrl(image, site)] : undefined,
		timeRequired: readMinutes ? `PT${readMinutes}M` : undefined,
		wordCount,
		author: {
			"@id": organizationId(site),
		},
		publisher: {
			"@id": organizationId(site),
		},
		mainEntityOfPage: {
			"@id": webpageId(url),
		},
	};
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test tests/lib/structured-data.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/structured-data/article.ts tests/lib/structured-data.test.ts
git commit -m "feat(seo): implement TechArticle schema builder"
```

______________________________________________________________________

### Task 6: Master `createPageGraph` and Public API

**Files:**

- Create: `application/frontend/src/lib/structured-data/index.ts`

- Modify: `application/frontend/src/lib/structured-data.ts` (re-export or alias for backwards compatibility)

- Modify: `application/frontend/tests/lib/structured-data.test.ts`

- [ ] **Step 1: Write test for createPageGraph**

Append to `application/frontend/tests/lib/structured-data.test.ts`:

```typescript
import { createPageGraph } from "@/lib/structured-data";

describe("structured-data: createPageGraph", () => {
	it("assembles a complete, clean, interconnected @graph", () => {
		const pageUrl = "https://ocs.com.ua/en/catalogue/equipment/checkweigher/hc-a/";
		const graph = createPageGraph({
			lang: "en",
			url: pageUrl,
			site: SITE,
			title: "HC-A Checkweigher",
			description: "High speed weigher",
			breadcrumbs: [
				{ name: "Home", url: "https://ocs.com.ua/en/" },
				{ name: "Checkweighers", url: "https://ocs.com.ua/en/catalogue/equipment/checkweigher/" },
				{ name: "HC-A", url: pageUrl },
			],
			mainEntities: [
				productSchema({
					name: "HC-A Checkweigher",
					description: "High speed weigher",
					url: pageUrl,
					lang: "en",
					site: SITE,
				}),
			],
		});

		expect(graph["@context"]).toBe("https://schema.org");
		expect(Array.isArray(graph["@graph"])).toBe(true);
		const types = graph["@graph"].map((n) => n["@type"]);
		expect(types).toContainEqual(["Organization", "LocalBusiness"]);
		expect(types).toContain("WebSite");
		expect(types).toContain("BreadcrumbList");
		expect(types).toContain("WebPage");
		expect(types).toContain("Product");
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test tests/lib/structured-data.test.ts`
Expected: FAIL with `createPageGraph` undefined.

- [ ] **Step 3: Implement index.ts and createPageGraph**

Create `application/frontend/src/lib/structured-data/index.ts`:

```typescript
import type { Lang } from "@/i18n/utils";
import { articleSchema } from "./article";
import { breadcrumbSchema } from "./breadcrumb";
import { cleanSchema } from "./clean";
import { absUrl, articleId, breadcrumbId, itemListId, organizationId, productId, webpageId, websiteId } from "./graph";
import { organizationSchema } from "./organization";
import { productSchema } from "./product";
import type { BreadcrumbItem, SchemaGraph, SchemaNode, SiteOrigin } from "./types";
import { collectionPageSchema, webPageSchema } from "./webpage";
import { websiteSchema } from "./website";

export * from "./types";
export * from "./graph";
export * from "./clean";
export * from "./organization";
export * from "./website";
export * from "./breadcrumb";
export * from "./webpage";
export * from "./product";
export * from "./article";

export interface CreatePageGraphOptions {
	lang: Lang;
	url: string;
	site: SiteOrigin;
	title: string;
	description: string;
	pageType?: "WebPage" | "AboutPage" | "ContactPage" | "CollectionPage";
	breadcrumbs?: BreadcrumbItem[];
	mainEntities?: SchemaNode[];
	includeOrganization?: boolean;
	includeWebsite?: boolean;
}

export function createPageGraph({
	lang,
	url,
	site,
	title,
	description,
	pageType = "WebPage",
	breadcrumbs = [],
	mainEntities = [],
	includeOrganization = true,
	includeWebsite = true,
}: CreatePageGraphOptions): SchemaGraph {
	const nodes: SchemaNode[] = [];

	if (includeOrganization) {
		nodes.push(organizationSchema(lang, site));
	}

	if (includeWebsite) {
		nodes.push(websiteSchema(lang, site));
	}

	const hasBreadcrumbs = breadcrumbs.length > 0;
	if (hasBreadcrumbs) {
		nodes.push(breadcrumbSchema(breadcrumbs, url));
	}

	// Link first main entity to WebPage if present
	const primaryEntityId = mainEntities[0]?.["@id"] as string | undefined;

	nodes.push(
		webPageSchema({
			lang,
			url,
			site,
			title,
			description,
			pageType,
			mainEntityId: primaryEntityId,
			hasBreadcrumb: hasBreadcrumbs,
		})
	);

	for (const entity of mainEntities) {
		nodes.push(entity);
	}

	const cleanedNodes = nodes
		.map((node) => cleanSchema(node))
		.filter((node): node is SchemaNode => Boolean(node && typeof node === "object"));

	return {
		"@context": "https://schema.org",
		"@graph": cleanedNodes,
	};
}
```

Update `application/frontend/src/lib/structured-data.ts` to re-export from `./structured-data/index`:

```typescript
export * from "./structured-data/index";
```

- [ ] **Step 4: Run test to verify all unit tests pass**

Run: `bun test tests/lib/structured-data.test.ts`
Expected: ALL PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/structured-data/ src/lib/structured-data.ts tests/lib/structured-data.test.ts
git commit -m "feat(seo): implement createPageGraph and structured-data entry point"
```

______________________________________________________________________

### Task 7: Layout.astro Structured Data Support

**Files:**

- Modify: `application/frontend/src/layouts/Layout.astro`

- [ ] **Step 1: Update Layout.astro to accept structuredData prop**

Edit `application/frontend/src/layouts/Layout.astro`:
Add `structuredData?: Record<string, unknown>;` to `Props` interface and render `<script is:inline type="application/ld+json" set:html={JSON.stringify(structuredData)} />` inside `<head>`.

```astro
---
import "../styles/global.css";
import { SEO } from "astro-seo";
import Footer from "@/components/Footer.astro";
import Header from "@/components/Header.astro";
import { defaultLang, getIsoLang, getLangFromUrl } from "@/i18n";

interface Props {
	title: string;
	description?: string;
	showHeader?: boolean;
	image?: string;
	article?: boolean;
	structuredData?: Record<string, unknown>;
}

const {
	title,
	description,
	showHeader = true,
	image,
	article = false,
	structuredData,
} = Astro.props;
// ... rest of frontmatter ...
---

<!doctype html>
<html lang={isoLang}>
	<head>
		<meta charset="UTF-8" />
		<meta name="viewport" content="width=device-width, initial-scale=1" />
		<link rel="icon" type="image/svg+xml" href="/assets/icons/favicon.svg" />
		<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
		<link
			rel="preload"
			href="/assets/fonts/material-symbols-outlined.woff2"
			as="font"
			type="font/woff2"
			crossorigin
		/>
		<link rel="sitemap" href="/sitemap-index.xml" />
		<meta name="generator" content={Astro.generator} />

		<SEO
			...
		/>

		{
			structuredData && (
				<script
					is:inline
					type="application/ld+json"
					set:html={JSON.stringify(structuredData)}
				/>
			)
		}

		<!-- BEGIN PLERDY CODE -->
		...
```

- [ ] **Step 2: Run build check to verify Layout compiles cleanly**

Run: `bun run check` (in `application/frontend`)
Expected: PASS with 0 errors.

- [ ] **Step 3: Commit**

```bash
git add src/layouts/Layout.astro
git commit -m "feat(seo): add structuredData prop to Layout.astro"
```

______________________________________________________________________

### Task 8: Page Integration — Home, About & Contact

**Files:**

- Modify: `application/frontend/src/pages/[lang]/index.astro`

- Modify: `application/frontend/src/pages/[lang]/about.astro`

- Modify: `application/frontend/src/pages/[lang]/contact.astro`

- [ ] **Step 1: Integrate `createPageGraph` into `[lang]/index.astro`**

Update `application/frontend/src/pages/[lang]/index.astro`:

```astro
---
import HeroSection from "@/components/homepage/HeroSection.astro";
import IndustriesSection from "@/components/homepage/IndustriesSection.astro";
import PartnersSection from "@/components/homepage/PartnersSection.astro";
import StatsSection from "@/components/homepage/StatsSection.astro";
import partnersData from "@/data/partners.json";
import { getInlineTranslations, isValidLang, type Lang } from "@/i18n";
import { languages } from "@/i18n/ui";
import Layout from "@/layouts/Layout.astro";
import { getSiteStats } from "@/lib/about/partners-data";
import type { PartnersData } from "@/lib/about/types";
import { createPageGraph } from "@/lib/structured-data";

export function getStaticPaths() {
	return (Object.keys(languages) as Lang[]).map((lang) => ({
		params: { lang },
	}));
}

const langParam = Astro.params.lang;
if (!isValidLang(langParam)) {
	return new Response(null, { status: 404 });
}
const lang: Lang = langParam;
const _ = getInlineTranslations(lang);

const site = Astro.site ?? "https://ocs.com.ua";
const currentUrl = new URL(Astro.url.pathname, site).href;
const title = _("OS-Technology Ukraine | Checkweighers & Inspection Systems");
const description = _(
	"Dynamic checkweighers and Track & Trace systems for food, pharmaceutical, and logistics industries in Ukraine. Official Wipotec partner."
);

const structuredData = createPageGraph({
	lang,
	url: currentUrl,
	site,
	title,
	description,
	pageType: "WebPage",
});
const siteStats = getSiteStats(partnersData as PartnersData);
---

<Layout title={title} description={description} structuredData={structuredData}>
	<HeroSection lang={lang} siteStats={siteStats} />
	<StatsSection lang={lang} siteStats={siteStats} />
	<IndustriesSection lang={lang} />
	<PartnersSection partnersByCategory={partnersData} siteStats={siteStats} lang={lang} />
</Layout>
```

- [ ] **Step 2: Integrate `createPageGraph` into `[lang]/about.astro`**

Update `application/frontend/src/pages/[lang]/about.astro`:
Replace inline structured data with `createPageGraph`:

```astro
const pageTitle = _("About Us | OS-Technology Ukraine");
const pageDescription = _(
	"Official exclusive distributor and certified engineering partner of WIPOTEC GmbH and MESUTRONIC Gerätebau GmbH in Ukraine. {systems} systems installed."
).replace("{systems}", formatApprox(siteStats.systems));

const structuredData = createPageGraph({
	lang,
	url: currentUrl,
	site: siteUrl,
	title: pageTitle,
	description: pageDescription,
	pageType: "AboutPage",
	breadcrumbs: [
		{ name: lang === "en" ? "Home" : "Головна", url: new URL(`/${lang}/`, siteUrl).href },
		{ name: lang === "en" ? "About Us" : "Про нас", url: currentUrl },
	],
});
```

Pass `structuredData={structuredData}` to `<Layout>`.

- [ ] **Step 3: Integrate `createPageGraph` into `[lang]/contact.astro`**

Update `application/frontend/src/pages/[lang]/contact.astro`:
Replace inline structured data with `createPageGraph`:

```astro
const pageTitle = _("Contact Us | OS-Technology Ukraine");
const pageDescription = _(
	"Contact the OS-Technology Ukraine engineering team. Request a quotation, arrange a product demonstration, or get technical support."
);

const structuredData = createPageGraph({
	lang,
	url: currentUrl,
	site: siteUrl,
	title: pageTitle,
	description: pageDescription,
	pageType: "ContactPage",
	breadcrumbs: [
		{ name: lang === "en" ? "Home" : "Головна", url: new URL(`/${lang}/`, siteUrl).href },
		{ name: lang === "en" ? "Contact Us" : "Зв'яжіться з нами", url: currentUrl },
	],
});
```

Pass `structuredData={structuredData}` to `<Layout>`.

- [ ] **Step 4: Run tests and typecheck**

Run: `bun test` and `bun run check`
Expected: ALL PASS

- [ ] **Step 5: Commit**

```bash
git add src/pages/[lang]/index.astro src/pages/[lang]/about.astro src/pages/[lang]/contact.astro
git commit -m "feat(seo): integrate unified graph structured data into home, about, and contact pages"
```

______________________________________________________________________

### Task 9: Page Integration — Equipment, Industry & Wiki

**Files:**

- Modify: `application/frontend/src/pages/[lang]/catalogue/equipment/[category]/index.astro`

- Modify: `application/frontend/src/pages/[lang]/catalogue/equipment/[category]/[slug].astro`

- Modify: `application/frontend/src/pages/[lang]/catalogue/industry/[slug].astro`

- Modify: `application/frontend/src/pages/[lang]/wiki/index.astro`

- Modify: `application/frontend/src/pages/[lang]/wiki/[slug].astro`

- [ ] **Step 1: Integrate into `equipment/[category]/index.astro`**

Update `equipment/[category]/index.astro`:

```astro
const { itemList } = collectionPageSchema({
	lang: lang as Lang,
	url: currentUrl,
	site: siteUrl,
	title: pageTitle,
	description: pageDescription,
	items: sortedProducts.map((product) => ({
		name: product.data.title,
		description: product.data.description,
		url: new URL(productUrl(lang as Lang, categorySlug, getSlug(product)), siteUrl).href,
	})),
});

const structuredData = createPageGraph({
	lang: lang as Lang,
	url: currentUrl,
	site: siteUrl,
	title: pageTitle,
	description: pageDescription,
	pageType: "CollectionPage",
	breadcrumbs: [
		{ name: lang === "en" ? "Home" : "Головна", url: new URL(`/${lang}/`, siteUrl).href },
		{ name: categoryData?.title || categorySlug, url: currentUrl },
	],
	mainEntities: [itemList],
});
```

Pass `structuredData={structuredData}` to `<Layout>`.

- [ ] **Step 2: Integrate into `equipment/[category]/[slug].astro`**

Update `equipment/[category]/[slug].astro`:

```astro
const productNode = productSchema({
	name: title,
	description,
	url: currentUrl,
	lang: lang as Lang,
	site: siteUrl,
	category: categoryTitle,
	images: gallery,
	specs: flattenSpecs(product.data.specs),
	datasheetUrl: product.data.datasheet,
});

const structuredData = createPageGraph({
	lang: lang as Lang,
	url: currentUrl,
	site: siteUrl,
	title,
	description,
	breadcrumbs: [
		{ name: lang === "en" ? "Home" : "Головна", url: new URL(`/${lang}/`, siteUrl).href },
		{ name: categoryTitle, url: new URL(`${categoryUrl(lang as Lang, category)}/`, siteUrl).href },
		{ name: title, url: currentUrl },
	],
	mainEntities: [productNode],
});
```

Pass `structuredData={structuredData}` to `<Layout>`.

- [ ] **Step 3: Integrate into `industry/[slug].astro`**

Update `industry/[slug].astro`:

```astro
const { itemList } = collectionPageSchema({
	lang: lang as Lang,
	url: currentUrl,
	site: siteUrl,
	title: industry.title,
	description: industry.description,
	items: listedProducts.map((product) => ({
		name: product.data.title,
		description: product.data.description,
		url: new URL(productUrl(lang as Lang, getCategory(product), getSlug(product)), siteUrl).href,
	})),
});

const structuredData = createPageGraph({
	lang: lang as Lang,
	url: currentUrl,
	site: siteUrl,
	title: pageTitle,
	description: industry.description,
	pageType: "CollectionPage",
	breadcrumbs: [
		{ name: lang === "en" ? "Home" : "Головна", url: new URL(`/${lang}/`, siteUrl).href },
		{ name: industry.title, url: currentUrl },
	],
	mainEntities: [itemList],
});
```

Pass `structuredData={structuredData}` to `<Layout>`.

- [ ] **Step 4: Integrate into `wiki/index.astro` and `wiki/[slug].astro`**

Update `wiki/index.astro`:

```astro
const siteUrl = Astro.site ?? "https://ocs.com.ua";
const currentUrl = new URL(Astro.url.pathname, siteUrl).href;

const { itemList } = collectionPageSchema({
	lang,
	url: currentUrl,
	site: siteUrl,
	title: _("Knowledge Base"),
	description,
	items: sortedArticles.map((article) => ({
		name: article.data.title,
		description: article.data.description,
		url: new URL(`/${lang}/wiki/${getWikiSlug(article)}/`, siteUrl).href,
	})),
});

const structuredData = createPageGraph({
	lang,
	url: currentUrl,
	site: siteUrl,
	title,
	description,
	pageType: "CollectionPage",
	breadcrumbs: [
		{ name: lang === "en" ? "Home" : "Головна", url: new URL(`/${lang}/`, siteUrl).href },
		{ name: _("Knowledge Base"), url: currentUrl },
	],
	mainEntities: [itemList],
});
```

Pass `structuredData={structuredData}` to `<Layout>`.

Update `wiki/[slug].astro`:

```astro
const articleNode = articleSchema({
	headline: title,
	description,
	url: currentUrl,
	lang,
	site: siteUrl,
	image: coverImage,
	readMinutes,
	wordCount: (article.body ?? "").split(/\s+/).filter(Boolean).length,
});

const structuredData = createPageGraph({
	lang,
	url: currentUrl,
	site: siteUrl,
	title,
	description,
	breadcrumbs: [
		{ name: lang === "en" ? "Home" : "Головна", url: new URL(`/${lang}/`, siteUrl).href },
		{ name: _("Knowledge Base"), url: new URL(`/${lang}/wiki`, siteUrl).href },
		{ name: title, url: currentUrl },
	],
	mainEntities: [articleNode],
});
```

Pass `structuredData={structuredData}` to `<Layout>`.

- [ ] **Step 5: Run tests and typecheck**

Run: `bun test` and `bun run check`
Expected: ALL PASS

- [ ] **Step 6: Commit**

```bash
git add src/pages/[lang]/catalogue/ src/pages/[lang]/wiki/
git commit -m "feat(seo): integrate unified graph structured data across catalogue and wiki pages"
```

______________________________________________________________________

### Task 10: End-to-End Validation & Build Verification

**Files:**

- Modify: `application/frontend/tests/lib/structured-data.test.ts`

- [ ] **Step 1: Write integration tests verifying schema output across all routes**

Add route schema snapshot/structure tests to `tests/lib/structured-data.test.ts` checking:

1. Every entity has valid `@id` anchors
1. No undefined/null keys in JSON stringification
1. Correct language ISO codes (`uk`, `en`)
1. Full specification and credential mappings

- [ ] **Step 2: Run complete test suite and project build**

Run in `application/frontend`:

```bash
bun test
bun run check
bun run build
```

Expected: All tests pass, build succeeds with zero errors.

- [ ] **Step 3: Commit**

```bash
git add tests/
git commit -m "test(seo): add complete structured data integration test suite"
```
