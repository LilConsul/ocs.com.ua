import { getCollection } from "astro:content";
import type { APIRoute, GetStaticPaths } from "astro";
import type { Lang } from "@/i18n";
import { languages } from "@/i18n/ui";
import { textResponse, wikiIndexMarkdown } from "@/lib/llms";

// Markdown copy of the wiki index (/ua/wiki.md), linked from /llms.txt
export const getStaticPaths = (() =>
	(Object.keys(languages) as Lang[]).map((lang) => ({
		params: { lang },
	}))) satisfies GetStaticPaths;

export const GET: APIRoute = async ({ params, site }) =>
	textResponse(
		wikiIndexMarkdown(
			params.lang as Lang,
			await getCollection("wiki"),
			site ?? "https://ocs.com.ua"
		),
		"text/markdown"
	);
