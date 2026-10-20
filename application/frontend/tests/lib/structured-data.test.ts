import { describe, expect, it } from "bun:test";
import {
	breadcrumbSchema,
	organizationSchema,
	productSchema,
	websiteSchema,
} from "@/lib/structured-data";

const SITE = "https://ocs.com.ua/";

describe("organizationSchema", () => {
	it("describes the company in English", () => {
		const org = organizationSchema("en", SITE);
		expect(org["@type"]).toBe("Organization");
		expect(org.name).toBe("OS-Technology Ukraine");
		expect(org.url).toBe("https://ocs.com.ua/en/");
		expect(org.email).toBe("info@ocs.com.ua");
		expect(org.address.addressCountry).toBe("UA");
		expect(org.address.streetAddress).toBe("67 Beresteiskyi Ave, Office 9");
	});

	it("describes the company in Ukrainian", () => {
		const org = organizationSchema("ua", SITE);
		expect(org.name).toBe("ОС-Технолоджи Україна");
		expect(org.url).toBe("https://ocs.com.ua/ua/");
		expect(org.address.addressLocality).toBe("Київ");
	});

	it("uses an absolute logo URL with a single slash", () => {
		expect(organizationSchema("en", SITE).logo).toBe("https://ocs.com.ua/apple-touch-icon.png");
	});

	it("accepts a URL object (Astro.site)", () => {
		expect(organizationSchema("en", new URL(SITE)).url).toBe("https://ocs.com.ua/en/");
	});

	it("keeps the same @id in both languages", () => {
		expect(organizationSchema("en", SITE)["@id"]).toBe(organizationSchema("ua", SITE)["@id"]);
	});

	it("lists a sales contact point reachable in both languages", () => {
		const { contactPoint } = organizationSchema("en", SITE);
		expect(contactPoint.contactType).toBe("sales");
		expect(contactPoint.availableLanguage).toEqual(["uk", "en"]);
	});
});

describe("websiteSchema", () => {
	it("uses the ISO language code, not the route code", () => {
		expect(websiteSchema("ua", SITE).inLanguage).toBe("uk");
		expect(websiteSchema("en", SITE).inLanguage).toBe("en");
	});

	it("points its publisher at the organization", () => {
		expect(websiteSchema("en", SITE).publisher["@id"]).toBe(organizationSchema("en", SITE)["@id"]);
	});
});

describe("breadcrumbSchema", () => {
	it("numbers the items from 1 in order", () => {
		const crumbs = breadcrumbSchema([
			{ name: "Home", url: "https://ocs.com.ua/en/" },
			{ name: "Checkweighers", url: "https://ocs.com.ua/en/catalogue/checkweigher/" },
		]);
		expect(crumbs["@type"]).toBe("BreadcrumbList");
		expect(crumbs.itemListElement.map((i) => [i.position, i.name])).toEqual([
			[1, "Home"],
			[2, "Checkweighers"],
		]);
		expect(crumbs.itemListElement[1].item).toBe("https://ocs.com.ua/en/catalogue/checkweigher/");
	});
});

describe("productSchema", () => {
	const base = {
		name: "HC-SL Catchweigher",
		description: "High-accuracy catchweigher",
		url: "https://ocs.com.ua/en/catalogue/catchweigher/hc-sl/",
		lang: "en" as const,
		site: SITE,
	};

	it("makes gallery paths absolute and leaves absolute URLs alone", () => {
		const product = productSchema({
			...base,
			images: ["/assets/equipment/hc-sl/a.webp", "https://cdn.example.com/b.jpg"],
		});
		expect(product.image).toEqual([
			"https://ocs.com.ua/assets/equipment/hc-sl/a.webp",
			"https://cdn.example.com/b.jpg",
		]);
	});

	it("omits image when there is no gallery", () => {
		expect(productSchema({ ...base, images: [] }).image).toBeUndefined();
		expect(productSchema(base).image).toBeUndefined();
	});

	it("turns specs into additionalProperty entries", () => {
		const product = productSchema({
			...base,
			specs: [
				{ label: "Max Speed", value: "2.9 m/s" },
				{ label: "Accuracy", value: "±5g" },
			],
		});
		expect(product.additionalProperty).toEqual([
			{ "@type": "PropertyValue", name: "Max Speed", value: "2.9 m/s" },
			{ "@type": "PropertyValue", name: "Accuracy", value: "±5g" },
		]);
	});

	it("omits additionalProperty when there are no specs", () => {
		expect(productSchema({ ...base, specs: [] }).additionalProperty).toBeUndefined();
	});

	it("carries the category and the ISO language", () => {
		const product = productSchema({ ...base, lang: "ua", category: "Чеквейджери" });
		expect(product.category).toBe("Чеквейджери");
		expect(product.inLanguage).toBe("uk");
	});
});
