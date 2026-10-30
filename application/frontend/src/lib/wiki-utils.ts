import type { CollectionEntry } from "astro:content";
import type { Locale } from "./content-utils";

export type WikiEntry = CollectionEntry<"wiki">;

/**
 * Extract locale from wiki entry ID (e.g. "choosing-a-dynamic-checkweigheren" -> "en")
 */
export function getWikiLocale(entry: WikiEntry): Locale {
	const id = entry.id;
	if (id.endsWith("en")) return "en";
	if (id.endsWith("ua")) return "ua";
	return "en";
}

/**
 * Extract base slug without locale suffix
 */
export function getWikiSlug(entry: WikiEntry): string {
	const parts = entry.id.split("/");
	const filename = parts[parts.length - 1];
	return filename.replace(/(en|ua)$/, "");
}

/**
 * Filter wiki entries by locale
 */
export function filterWikiByLocale(entries: WikiEntry[], locale: Locale): WikiEntry[] {
	return entries.filter((entry) => getWikiLocale(entry) === locale);
}

/**
 * Sort wiki articles by order (ascending, default 999), then alphabetically by title
 */
export function sortWikiArticles(entries: WikiEntry[]): WikiEntry[] {
	if (!Array.isArray(entries) || entries.length === 0) return [];
	return [...entries].sort((a, b) => {
		const orderA = a.data?.order ?? 999;
		const orderB = b.data?.order ?? 999;
		if (orderA !== orderB) return orderA - orderB;
		const titleA = a.data?.title ?? "";
		const titleB = b.data?.title ?? "";
		return titleA.localeCompare(titleB);
	});
}

/**
 * Calculate estimated reading time in minutes (default 200 words per minute, min 1)
 */
export function calculateReadingMinutes(content: string): number {
	if (!content?.trim()) return 1;
	const words = content.trim().split(/\s+/).filter(Boolean).length;
	return Math.max(1, Math.ceil(words / 200));
}

/**
 * Find matching translation for a wiki article
 */
export function findWikiTranslation(
	entry: WikiEntry,
	targetLocale: Locale,
	allEntries: WikiEntry[]
): WikiEntry | undefined {
	const slug = getWikiSlug(entry);
	const targetId = `${slug}${targetLocale}`;
	return allEntries.find((e) => e.id === targetId || e.id.endsWith(`/${targetId}`));
}

/**
 * Get article cover image with fallback to Ukrainian default locale
 */
export function getWikiCoverImage(entry: WikiEntry, allEntries: WikiEntry[]): string | undefined {
	if (entry.data.coverImage) return entry.data.coverImage;
	const locale = getWikiLocale(entry);
	if (locale === "ua") return undefined;
	const uaEntry = findWikiTranslation(entry, "ua", allEntries);
	return uaEntry?.data.coverImage ?? undefined;
}
