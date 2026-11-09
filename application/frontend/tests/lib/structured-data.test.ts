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
		const input: Record<string, unknown> = {
			"@type": "Product",
			name: "HC-A",
			description: undefined,
			offers: null,
			brand: {
				"@id": "https://ocs.com.ua/#organization",
				legalName: undefined,
			},
		};
		expect(cleanSchema(input as Parameters<typeof cleanSchema>[0])).toEqual({
			"@type": "Product",
			name: "HC-A",
			brand: {
				"@id": "https://ocs.com.ua/#organization",
			},
		});
	});

	it("removes empty arrays and leaves populated arrays intact", () => {
		const input: Record<string, unknown> = {
			"@type": "Product",
			image: [],
			additionalProperty: [{ "@type": "PropertyValue", name: "Speed", value: "2.5 m/s" }],
		};
		expect(cleanSchema(input as Parameters<typeof cleanSchema>[0])).toEqual({
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

import companyData from "@/data/company.json";
import { organizationSchema } from "@/lib/structured-data/organization";
import { websiteSchema } from "@/lib/structured-data/website";

describe("structured-data: organizationSchema", () => {
	it("builds a rich unified Organization node sourced completely from company.json", () => {
		const org = organizationSchema("en", SITE);
		expect(org["@type"]).toEqual(["Organization", "LocalBusiness"]);
		expect(org["@id"]).toBe("https://ocs.com.ua/#organization");
		expect(org.name).toBe(companyData.name.en);
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
			latitude: companyData.geo.latitude,
			longitude: companyData.geo.longitude,
		});
		expect(org.openingHoursSpecification).toEqual({
			"@type": "OpeningHoursSpecification",
			dayOfWeek: companyData.openingHours.days,
			opens: companyData.openingHours.opens,
			closes: companyData.openingHours.closes,
		});
		expect(org.contactPoint).toEqual({
			"@type": "ContactPoint",
			contactType: "sales",
			name: companyData.contactPerson.en.name,
			telephone: companyData.phone,
			email: companyData.email,
			areaServed: "UA",
			availableLanguage: ["uk", "en"],
		});
		expect(org.hasCredential).toBeDefined();
		expect(org.knowsAbout).toBeDefined();
		expect(org.knowsAbout).toContain(
			"FDA 21 CFR Part 11 Compliance (Electronic Records & Signatures)"
		);
		expect(org.knowsAbout).toContain("Machinery Directive 2006/42/EC");
		expect(org.knowsAbout).toContain("Electromagnetic Compatibility (EMC) Directive 2014/30/EU");
		expect(org.knowsAbout).toContain(
			"RoHS Directive 2011/65/EU (Restriction of Hazardous Substances)"
		);
		expect(org.knowsAbout).toContain("EU Regulation (EC) No 1935/2004 (Food Contact Materials)");
		expect(org.knowsAbout).toContain(
			"EU Regulation (EC) No 2023/2006 (Good Manufacturing Practice for Food Contact Materials)"
		);
		expect(org.knowsAbout).toContain("EU Regulation No 10/2011 (Plastic Food Contact Materials)");
		expect(org.knowsAbout).not.toContain("");
		expect(org.openingHours).toBe("Mo Tu We Th Fr 09:00-18:00");
		expect(org.priceRange).toBe(companyData.priceRange);
		expect(org.sameAs).toEqual(companyData.sameAs);
	});

	it("translates address and company name for Ukrainian locale", () => {
		const org = organizationSchema("ua", SITE);
		expect(org.name).toBe(companyData.name.ua);
		expect(org.url).toBe("https://ocs.com.ua/ua/");
		expect((org.address as Record<string, unknown>)?.addressLocality).toBe("Київ");
	});
});

describe("structured-data: websiteSchema", () => {
	it("builds a WebSite node referencing the organization publisher and company name", () => {
		const ws = websiteSchema("en", SITE);
		expect(ws["@type"]).toBe("WebSite");
		expect(ws["@id"]).toBe("https://ocs.com.ua/en/#website");
		expect(ws.name).toBe(companyData.name.en);
		expect(ws.inLanguage).toBe("en");
		expect(ws.publisher).toEqual({ "@id": "https://ocs.com.ua/#organization" });
		expect(Array.isArray(ws.potentialAction)).toBe(true);
	});

	it("emits two SearchAction nodes — one for wiki and one for catalogue", () => {
		const ws = websiteSchema("en", SITE);
		const actions = ws.potentialAction as unknown[];
		expect(Array.isArray(actions)).toBe(true);
		expect(actions).toHaveLength(2);
		const templates = (actions as Array<Record<string, unknown>>).map(
			(a) => ((a.target as Record<string, unknown>)?.urlTemplate as string) ?? ""
		);
		expect(templates.some((t) => t.includes("/wiki/"))).toBe(true);
		expect(templates.some((t) => t.includes("/catalogue/equipment/checkweighers/"))).toBe(true);
	});
});

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
		// No hasPart — sub-groups are sibling nodes, not nested on ItemList
		expect((collection.itemList as Record<string, unknown>).hasPart).toBeUndefined();
		expect(collection.subLists).toEqual([]);
	});

	it("emits sub-group ItemLists as sibling nodes with stable @ids", () => {
		const pageUrl = "https://ocs.com.ua/en/catalogue/industry/food-beverage/";
		const collection = collectionPageSchema({
			lang: "en",
			url: pageUrl,
			site: SITE,
			title: "Food & Beverage",
			description: "Industry overview",
			items: [
				{ name: "HC-A", url: "https://ocs.com.ua/en/catalogue/equipment/checkweigher/hc-a/" },
			],
			subGroups: [
				{
					name: "Checkweighers",
					items: [
						{
							name: "HC-A",
							url: "https://ocs.com.ua/en/catalogue/equipment/checkweigher/hc-a/",
						},
					],
				},
			],
		});
		expect(collection.subLists).toHaveLength(1);
		const sub = collection.subLists[0];
		expect(sub["@type"]).toBe("ItemList");
		expect(sub["@id"]).toBe(
			"https://ocs.com.ua/en/catalogue/industry/food-beverage/#itemlist-checkweighers"
		);
		expect(sub.name).toBe("Checkweighers");
		expect(sub.numberOfItems).toBe(1);
		// main itemList has no hasPart
		expect((collection.itemList as Record<string, unknown>).hasPart).toBeUndefined();
	});
});

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
	};

	it("builds a full product schema with specs, gallery, and presentation-only inquiry offer via i18n", () => {
		const product = productSchema(productBase);
		expect(product["@type"]).toBe("Product");
		expect(product["@id"]).toBe(
			"https://ocs.com.ua/en/catalogue/equipment/checkweigher/hc-a/#product"
		);
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
		expect(product.subjectOf).toBeUndefined();
		const offers = product.offers as Record<string, unknown>;
		expect(offers["@type"]).toBe("Offer");
		expect(offers.url).toBe(productBase.url);
		expect(offers.availability).toBe("https://schema.org/InStock");
		expect(offers.priceCurrency).toBe("UAH");
		expect(offers.price).toBe("0");
		expect(typeof offers.priceValidUntil).toBe("string");
		expect(offers.priceValidUntil as string).toMatch(/^\d{4}-\d{2}-\d{2}$/);
		expect((offers.priceSpecification as Record<string, unknown>).description).toBe(
			"Price on request"
		);
		expect(offers.seller).toEqual({ "@id": "https://ocs.com.ua/#organization" });
	});

	it("translates the offer in Ukrainian locale", () => {
		const uaProduct = productSchema({
			name: "Чеквеєр HC-A",
			description: "Опис",
			url: "https://ocs.com.ua/ua/catalogue/equipment/checkweigher/hc-a/",
			lang: "ua",
			site: SITE,
		});
		expect(((uaProduct.offers as Record<string, unknown>)?.priceSpecification as Record<string, unknown>)?.description).toBe("Ціна за запитом");
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
		expect(minimal.inLanguage).toBeUndefined();
	});

	it("never exposes a datasheet URL, even if a caller passes one", () => {
		const leaked = productSchema({
			name: "HC-A",
			description: "Desc",
			url: "https://ocs.com.ua/en/catalogue/equipment/checkweigher/hc-a/",
			lang: "en",
			site: SITE,
			datasheetUrl: "/assets/equipment/hc-a/datasheet.pdf",
		} as never);
		expect(leaked.subjectOf).toBeUndefined();
		expect(JSON.stringify(leaked)).not.toContain("datasheet.pdf");
	});
});

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

describe("structured-data: integration — no null/undefined in JSON output", () => {
	it("JSON.stringify produces no undefined keys for product graph", () => {
		const pageUrl = "https://ocs.com.ua/en/catalogue/equipment/checkweigher/hc-a/";
		const graph = createPageGraph({
			lang: "en",
			url: pageUrl,
			site: SITE,
			title: "HC-A",
			description: "Checkweigher",
			breadcrumbs: [
				{ name: "Home", url: "https://ocs.com.ua/en/" },
				{ name: "HC-A", url: pageUrl },
			],
			mainEntities: [
				productSchema({
					name: "HC-A",
					description: "Checkweigher",
					url: pageUrl,
					lang: "en",
					site: SITE,
					specs: [{ label: "Speed", value: "600 pcs/min" }],
				}),
			],
		});
		const serialized = JSON.stringify(graph);
		expect(serialized).not.toContain('"undefined"');
		expect(serialized).not.toContain(":null");
		expect(serialized).not.toContain('":null"');
	});

	it("every @id in the graph is a valid https URL", () => {
		const pageUrl = "https://ocs.com.ua/en/wiki/weighing-accuracy/";
		const graph = createPageGraph({
			lang: "en",
			url: pageUrl,
			site: SITE,
			title: "Article",
			description: "Desc",
			breadcrumbs: [{ name: "Home", url: "https://ocs.com.ua/en/" }],
			mainEntities: [
				articleSchema({
					headline: "Article",
					description: "Desc",
					url: pageUrl,
					lang: "en",
					site: SITE,
				}),
			],
		});
		const ids = graph["@graph"]
			.map((n) => n["@id"])
			.filter((id): id is string => typeof id === "string");
		expect(ids.length).toBeGreaterThan(0);
		for (const id of ids) {
			expect(id).toMatch(/^https:\/\//);
		}
	});

	it("uses correct ISO language codes: uk for ua, en for en", () => {
		const pageUrl = "https://ocs.com.ua/ua/wiki/test/";
		const graph = createPageGraph({
			lang: "ua",
			url: pageUrl,
			site: SITE,
			title: "Test",
			description: "Desc",
		});
		const serialized = JSON.stringify(graph);
		expect(serialized).toContain('"uk"');
		expect(serialized).not.toContain('"ua"');
	});

	it("companyData.name and shortName are used consistently", () => {
		const org = organizationSchema("en", SITE);
		expect(org.name).toBe(companyData.name.en);
		const orgUa = organizationSchema("ua", SITE);
		expect(orgUa.name).toBe(companyData.name.ua);
	});

	it("geocoordinates and opening hours match company.json", () => {
		const org = organizationSchema("en", SITE);
		expect((org.geo as Record<string, unknown>)?.latitude).toBe(companyData.geo.latitude);
		expect((org.geo as Record<string, unknown>)?.longitude).toBe(companyData.geo.longitude);
		expect((org.openingHoursSpecification as Record<string, unknown>)?.dayOfWeek).toEqual(companyData.openingHours.days);
		expect((org.openingHoursSpecification as Record<string, unknown>)?.opens).toBe(companyData.openingHours.opens);
		expect((org.openingHoursSpecification as Record<string, unknown>)?.closes).toBe(companyData.openingHours.closes);
	});

	it("_('Price on request') translates correctly", () => {
		const enProduct = productSchema({
			name: "Test",
			description: "Desc",
			url: "https://ocs.com.ua/en/catalogue/equipment/checkweigher/test/",
			lang: "en",
			site: SITE,
		});
		expect(((enProduct.offers as Record<string, unknown>)?.priceSpecification as Record<string, unknown>)?.description).toBe("Price on request");

		const uaProduct = productSchema({
			name: "Test",
			description: "Desc",
			url: "https://ocs.com.ua/ua/catalogue/equipment/checkweigher/test/",
			lang: "ua",
			site: SITE,
		});
		expect(((uaProduct.offers as Record<string, unknown>)?.priceSpecification as Record<string, unknown>)?.description).toBe("Ціна за запитом");
	});
});
