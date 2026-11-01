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
	});

	it("translates address and company name for Ukrainian locale", () => {
		const org = organizationSchema("ua", SITE);
		expect(org.name).toBe(companyData.name.ua);
		expect(org.url).toBe("https://ocs.com.ua/ua/");
		expect(org.address.addressLocality).toBe("Київ");
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
	});
});
