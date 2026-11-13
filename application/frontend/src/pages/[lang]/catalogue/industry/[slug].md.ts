import { getCollection } from "astro:content";
import type { APIRoute, GetStaticPaths } from "astro";
import type { Lang } from "@/i18n";
import { languages } from "@/i18n/ui";
import { getIndustriesForLocale, type Industry } from "@/lib/content-utils";
import { industryMarkdown, textResponse } from "@/lib/llms";

// Markdown copy of each industry page (/ua/catalogue/industry/<slug>.md), linked from /llms.txt
export const getStaticPaths = (async () => {
	const equipment = await getCollection("equipment");
	return (Object.keys(languages) as Lang[]).flatMap((lang) =>
		getIndustriesForLocale(lang).map((industry) => ({
			params: { lang, slug: industry.slug },
			props: { industry, equipment },
		}))
	);
}) satisfies GetStaticPaths;

export const GET: APIRoute = ({ params, props, site }) => {
	const { industry, equipment } = props as {
		industry: Industry;
		equipment: Parameters<typeof industryMarkdown>[2];
	};
	return textResponse(
		industryMarkdown(industry, params.lang as Lang, equipment, site ?? "https://ocs.com.ua"),
		"text/markdown"
	);
};
