import type { CollectionEntry } from "astro:content";
import type { ImageMetadata } from "astro";
import type { Locale } from "./content-utils";
import { resolveImage } from "./images";

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

/** Blocks that are not prose: headings, lists, images, quotes, tables, HTML, fences, rules */
const NOT_PROSE = /^(#|[-*+]\s|\d+[.)]\s|!\[|>|\||<|```|~~~|---|\*\*\*)/;

/**
 * The first prose paragraph of an article body as plain text, for cards whose article has no
 * description. Links keep their text, bold and italic markers go, inline code keeps its
 * backticks so the card can render it. Returns "" when the body has no prose paragraph.
 */
export function articleExcerpt(body: string | null | undefined): string {
	for (const block of (body ?? "").split(/\n\s*\n/)) {
		const text = block.trim();
		if (!text || NOT_PROSE.test(text)) continue;
		return text
			.replace(/!\[[^\]]*\]\([^)]*\)/g, "")
			.replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
			.replace(/(\*\*|__)(.+?)\1/g, "$2")
			.replace(/(^|[\s(])[*_](\S(?:.*?\S)?)[*_](?=[\s).,;:!?]|$)/g, "$1$2")
			.replace(/\s+/g, " ")
			.trim();
	}
	return "";
}

const INLINE_CODE = /`([^`]+)`/;

/**
 * Splits text with Markdown inline code ("`d` is the resolution") into plain and code parts,
 * so a description can show `d` as code instead of raw backticks. Empty parts are dropped.
 */
export function splitInlineCode(text: string): { text: string; code: boolean }[] {
	return text
		.split(new RegExp(INLINE_CODE.source, "g"))
		.map((part, i) => ({ text: part, code: i % 2 === 1 }))
		.filter((part) => part.text !== "");
}

/** The same text without backticks, for meta descriptions and structured data */
export function stripInlineCode(text: string | null | undefined): string {
	return (text ?? "").replace(new RegExp(INLINE_CODE.source, "g"), "$1");
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
 * Get article cover image with fallback to Ukrainian default locale.
 * A cover missing from src/assets/ is treated as no cover.
 */
export function getWikiCoverImage(
	entry: WikiEntry,
	allEntries: WikiEntry[]
): ImageMetadata | undefined {
	return resolveImage(rawCoverImage(entry, allEntries));
}

function rawCoverImage(entry: WikiEntry, allEntries: WikiEntry[]): string | undefined {
	if (entry.data.coverImage) return entry.data.coverImage;
	const locale = getWikiLocale(entry);
	if (locale === "ua") return undefined;
	const uaEntry = findWikiTranslation(entry, "ua", allEntries);
	return uaEntry?.data.coverImage ?? undefined;
}
