import { getInlineTranslations, type Lang } from "@/i18n";
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
	sku?: string;
	category?: string;
	images?: string[] | null;
	specs?: ProductSpec[] | null;
}

/** ISO-8601 date one year from now — used as a rolling priceValidUntil for inquiry-only products. */
function nextYearDate(): string {
	const d = new Date();
	d.setFullYear(d.getFullYear() + 1);
	return d.toISOString().slice(0, 10);
}

export function productSchema({
	name,
	description,
	url,
	lang,
	site,
	sku,
	category,
	images,
	specs,
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
		sku,
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
		offers: {
			"@type": "Offer",
			url,
			availability: "https://schema.org/InStock",
			priceCurrency: "UAH",
			price: "0",
			priceValidUntil: nextYearDate(),
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
