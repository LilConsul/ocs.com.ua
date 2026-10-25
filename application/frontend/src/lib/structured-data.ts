import companyData from "@/data/company.json";
import { getIsoLang, type Lang } from "@/i18n/utils";

type Site = string | URL;

const abs = (path: string, site: Site) => new URL(path, site).href;

export function organizationSchema(lang: Lang, site: Site) {
	const address = companyData.address[lang];
	return {
		"@context": "https://schema.org",
		"@type": "Organization",
		// Same @id in every language so search engines treat both as one entity
		"@id": abs("/#organization", site),
		name: lang === "en" ? "OS-Technology Ukraine" : "ОС-Технолоджи Україна",
		url: abs(`/${lang}/`, site),
		logo: abs("/apple-touch-icon.png", site),
		email: companyData.email,
		telephone: companyData.phone,
		address: {
			"@type": "PostalAddress",
			streetAddress: address.office ? `${address.street}, ${address.office}` : address.street,
			addressLocality: address.city,
			postalCode: address.postalCode,
			addressCountry: "UA",
		},
		contactPoint: {
			"@type": "ContactPoint",
			contactType: "sales",
			telephone: companyData.phone,
			email: companyData.email,
			areaServed: "UA",
			availableLanguage: ["uk", "en"],
		},
	};
}

export function websiteSchema(lang: Lang, site: Site) {
	return {
		"@context": "https://schema.org",
		"@type": "WebSite",
		"@id": abs(`/${lang}/#website`, site),
		name: lang === "en" ? "OS-Technology Ukraine" : "ОС-Технолоджи Україна",
		url: abs(`/${lang}/`, site),
		inLanguage: getIsoLang(lang),
		publisher: { "@id": abs("/#organization", site) },
	};
}

export function breadcrumbSchema(items: { name: string; url: string }[]) {
	return {
		"@context": "https://schema.org",
		"@type": "BreadcrumbList",
		itemListElement: items.map((item, index) => ({
			"@type": "ListItem" as const,
			position: index + 1,
			name: item.name,
			item: item.url,
		})),
	};
}

interface ProductSchemaInput {
	name: string;
	description: string;
	url: string;
	lang: Lang;
	site: Site;
	category?: string;
	images?: string[];
	specs?: { label: string; value: string }[];
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
}: ProductSchemaInput) {
	return {
		"@context": "https://schema.org",
		"@type": "Product",
		name,
		description,
		url,
		inLanguage: getIsoLang(lang),
		category,
		image: images?.length ? images.map((img) => abs(img, site)) : undefined,
		additionalProperty: specs?.length
			? specs.map((spec) => ({
					"@type": "PropertyValue" as const,
					name: spec.label,
					value: spec.value,
				}))
			: undefined,
		brand: { "@id": abs("/#organization", site) },
	};
}
