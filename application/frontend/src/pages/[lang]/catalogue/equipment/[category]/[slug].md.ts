import { getCollection } from "astro:content";
import type { APIRoute, GetStaticPaths } from "astro";
import {
	type EquipmentEntry,
	getCategory,
	getLocale,
	getProducts,
	getSlug,
} from "@/lib/content-utils";
import { productMarkdown, textResponse } from "@/lib/llms";

// Markdown copy of each product page (/ua/catalogue/equipment/<category>/<slug>.md), linked from
// /llms.txt
export const getStaticPaths = (async () => {
	const equipment = await getCollection("equipment");
	return getProducts(equipment).map((entry) => ({
		params: { lang: getLocale(entry), category: getCategory(entry), slug: getSlug(entry) },
		props: { entry, equipment },
	}));
}) satisfies GetStaticPaths;

export const GET: APIRoute = ({ props, site }) => {
	const { entry, equipment } = props as { entry: EquipmentEntry; equipment: EquipmentEntry[] };
	return textResponse(
		productMarkdown(entry, equipment, site ?? "https://ocs.com.ua"),
		"text/markdown"
	);
};
