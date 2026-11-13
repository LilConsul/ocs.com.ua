import { getCollection } from "astro:content";
import type { APIRoute, GetStaticPaths } from "astro";
import type { Lang } from "@/i18n";
import { languages } from "@/i18n/ui";
import { type EquipmentType, getCategoriesForLocale } from "@/lib/content-utils";
import { categoryMarkdown, textResponse } from "@/lib/llms";

// Markdown copy of each equipment category page (/ua/catalogue/equipment/<category>.md), linked
// from /llms.txt
export const getStaticPaths = (async () => {
	const equipment = await getCollection("equipment");
	return (Object.keys(languages) as Lang[]).flatMap((lang) =>
		getCategoriesForLocale(lang).map((category) => ({
			params: { lang, category: category.slug },
			props: { category, equipment },
		}))
	);
}) satisfies GetStaticPaths;

export const GET: APIRoute = ({ params, props, site }) => {
	const { category, equipment } = props as {
		category: EquipmentType;
		equipment: Parameters<typeof categoryMarkdown>[2];
	};
	return textResponse(
		categoryMarkdown(category, params.lang as Lang, equipment, site ?? "https://ocs.com.ua"),
		"text/markdown"
	);
};
