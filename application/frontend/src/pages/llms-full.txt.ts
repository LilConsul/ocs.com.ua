import { getCollection } from "astro:content";
import type { APIRoute } from "astro";
import { buildLlmsFullTxt, textResponse } from "@/lib/llms";

// Every product and wiki article in one Markdown file, for tools that read a site in one pass
export const GET: APIRoute = async ({ site }) =>
	textResponse(
		buildLlmsFullTxt({
			site: site ?? "https://ocs.com.ua",
			equipment: await getCollection("equipment"),
			wiki: await getCollection("wiki"),
		})
	);
