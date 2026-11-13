import type { Lang } from "@/i18n/utils";

/**
 * Canonical catalogue URLs. Paths only, with the trailing slash the built pages are served at
 * (directory format): a link without it costs every visitor and crawler a 301 redirect.
 */
export const categoryUrl = (lang: Lang, category: string) =>
	`/${lang}/catalogue/equipment/${category}/`;

export const productUrl = (lang: Lang, category: string, product: string) =>
	`${categoryUrl(lang, category)}${product}/`;

export const industryUrl = (lang: Lang, industry: string) =>
	`/${lang}/catalogue/industry/${industry}/`;
