import { getInlineTranslations, getIsoLang, type Lang } from "@/i18n";
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
	const _ = getInlineTranslations(lang);
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
					name: _("Technical Datasheet"),
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
				description: _("Price on request"),
			},
			seller: {
				"@id": organizationId(site),
			},
		},
	};
}
