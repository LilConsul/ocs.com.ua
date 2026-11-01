import type { Lang } from "@/i18n/utils";
import type { SiteOrigin } from "./types";

export function absUrl(pathOrUrl: string, site: SiteOrigin): string {
	return new URL(pathOrUrl, site).href;
}

export function organizationId(site: SiteOrigin): string {
	return absUrl("/#organization", site);
}

export function websiteId(lang: Lang, site: SiteOrigin): string {
	return absUrl(`/${lang}/#website`, site);
}

export function webpageId(canonicalUrl: string): string {
	const base = canonicalUrl.split("#")[0];
	return `${base}#webpage`;
}

export function breadcrumbId(canonicalUrl: string): string {
	const base = canonicalUrl.split("#")[0];
	return `${base}#breadcrumb`;
}

export function productId(canonicalUrl: string): string {
	const base = canonicalUrl.split("#")[0];
	return `${base}#product`;
}

export function articleId(canonicalUrl: string): string {
	const base = canonicalUrl.split("#")[0];
	return `${base}#article`;
}

export function itemListId(canonicalUrl: string): string {
	const base = canonicalUrl.split("#")[0];
	return `${base}#itemlist`;
}
