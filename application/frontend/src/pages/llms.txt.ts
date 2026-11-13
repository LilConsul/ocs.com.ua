import { getCollection } from "astro:content";
import type { APIRoute } from "astro";
import { buildLlmsTxt, textResponse } from "@/lib/llms";

// https://llmstxt.org: a Markdown map of the site for language models, built from the content
export const GET: APIRoute = async ({ site }) =>
	textResponse(
		buildLlmsTxt({
			site: site ?? "https://ocs.com.ua",
			equipment: await getCollection("equipment"),
			wiki: await getCollection("wiki"),
		})
	);
