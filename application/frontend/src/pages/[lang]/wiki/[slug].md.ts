import { getCollection } from "astro:content";
import type { APIRoute, GetStaticPaths } from "astro";
import { textResponse, wikiMarkdown } from "@/lib/llms";
import { getWikiLocale, getWikiSlug, type WikiEntry } from "@/lib/wiki-utils";

// Markdown copy of each wiki article (/ua/wiki/<slug>.md), linked from /llms.txt
export const getStaticPaths = (async () => {
	const articles = await getCollection("wiki");
	return articles.map((entry) => ({
		params: { lang: getWikiLocale(entry), slug: getWikiSlug(entry) },
		props: { entry },
	}));
}) satisfies GetStaticPaths;

export const GET: APIRoute = ({ props, site }) =>
	textResponse(
		wikiMarkdown((props as { entry: WikiEntry }).entry, site ?? "https://ocs.com.ua"),
		"text/markdown"
	);
