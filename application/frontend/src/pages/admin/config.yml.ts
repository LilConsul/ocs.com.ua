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
import { existsSync, readFileSync } from "fs";
import { resolve } from "path";
import template from "./_config.template.yml?raw";

interface EquipmentType {
	slug: string;
	title: string;
}

interface Icon {
	label: string;
	value: string;
}

function readJson<T>(relativePath: string, fallback: T): T {
	const fullPath = resolve(relativePath);
	if (!existsSync(fullPath)) return fallback;
	try {
		return JSON.parse(readFileSync(fullPath, "utf-8")) as T;
	} catch {
		return fallback;
	}
}

export const GET: APIRoute = ({ url }) => {
	// OAuth host serving /api/auth; defaults to the host the CMS is opened on
	const baseUrl = CMS_BASE_URL ?? url.origin;

	// Array position is the display order (drag to reorder in the CMS)
	const equipmentData = readJson<{
		en?: { categories: EquipmentType[] };
		categories?: EquipmentType[];
	}>("src/data/equipment-types.json", {});

	const categories = equipmentData.en?.categories ?? equipmentData.categories ?? [];

	const icons = readJson<Icon[]>("src/data/icons.json", []);

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
	};

	const config = Object.entries(tokens).reduce(
		(yml, [key, value]) => yml.replaceAll(`__${key}__`, JSON.stringify(value)),
		template
	);

	return new Response(config, {
		headers: { "Content-Type": "text/yaml; charset=utf-8" },
	});
};
