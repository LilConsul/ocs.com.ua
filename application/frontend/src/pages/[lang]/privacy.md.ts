import type { APIRoute, GetStaticPaths } from "astro";
import type { Lang } from "@/i18n";
import { languages } from "@/i18n/ui";
import { privacyMarkdown, textResponse } from "@/lib/llms";

// Markdown copy of the privacy policy (/ua/privacy.md), linked from /llms.txt
export const getStaticPaths = (() =>
	(Object.keys(languages) as Lang[]).map((lang) => ({
		params: { lang },
	}))) satisfies GetStaticPaths;

export const GET: APIRoute = ({ params, site }) =>
	textResponse(privacyMarkdown(params.lang as Lang, site ?? "https://ocs.com.ua"), "text/markdown");
