import { getCollection } from "astro:content";
import type { APIRoute, GetStaticPaths } from "astro";
import type { Lang } from "@/i18n";
import { languages } from "@/i18n/ui";
import { homeMarkdown, textResponse } from "@/lib/llms";

// Markdown copy of the home page (/ua/index.md), linked from /llms.txt
export const getStaticPaths = (() =>
	(Object.keys(languages) as Lang[]).map((lang) => ({
		params: { lang },
	}))) satisfies GetStaticPaths;

export const GET: APIRoute = async ({ params, site }) =>
	textResponse(
		homeMarkdown(params.lang as Lang, {
			site: site ?? "https://ocs.com.ua",
			equipment: await getCollection("equipment"),
			wiki: await getCollection("wiki"),
		}),
		"text/markdown"
	);
