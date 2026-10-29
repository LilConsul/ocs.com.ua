import {
	CMS_BASE_URL,
	CMS_LOCALE,
	CMS_SEARCH,
	GITHUB_BRANCH,
	GITHUB_OWNER,
	GITHUB_REPO,
	SITE_URL,
} from "astro:env/server";
import type { APIRoute } from "astro";
import icons from "@/data/icons.json";
import { getCategoriesForLocale, getIndustriesForLocale } from "@/lib/content-utils";
import template from "./_config.template.yml?raw";

// Rendered on demand: BASE_URL falls back to the request origin when CMS_BASE_URL is unset
export const prerender = false;

export const GET: APIRoute = ({ url }) => {
	// OAuth host serving /api/auth; defaults to the host the CMS is opened on
	const baseUrl = CMS_BASE_URL ?? url.origin;

	// Array position is the display order (drag to reorder in the CMS)
	const categories = getCategoriesForLocale("en");
	const industries = getIndustriesForLocale("en");

	// Each __KEY__ in the template is replaced with JSON (valid YAML for strings and arrays)
	const tokens: Record<string, unknown> = {
		GITHUB_REPO: `${GITHUB_OWNER}/${GITHUB_REPO}`,
		GITHUB_BRANCH,
		BASE_URL: baseUrl,
		SITE_URL,
		CMS_LOCALE,
		CMS_SEARCH,
		ICON_OPTIONS: icons.map(({ label, value }) => ({ label, value })),
		CATEGORY_OPTIONS: categories.map((c) => ({ label: c.title, value: c.slug })),
		INDUSTRY_OPTIONS: industries.map((i) => ({ label: i.title, value: i.slug })),
		INDUSTRY_FILTERS: industries.map((i) => ({
			label: i.title,
			field: "industries",
			pattern: i.slug,
		})),
	};

	const config = Object.entries(tokens).reduce(
		(yml, [key, value]) => yml.replaceAll(`__${key}__`, JSON.stringify(value)),
		template
	);

	return new Response(config, {
		headers: { "Content-Type": "text/yaml; charset=utf-8" },
	});
};
