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
