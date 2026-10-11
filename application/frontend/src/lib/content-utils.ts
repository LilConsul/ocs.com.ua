/**
 * Content utilities for working with i18n content collections
 *
 * With multiple_files structure, entries have locale suffixes:
 * - ID: "checkweighers/hc-a.en", "checkweighers/hc-a.ua"
 * - Slug: "hc-a" (same for both locales)
 * - Category: "checkweighers"
 */

import type { CollectionEntry } from "astro:content";

export type Locale = "en" | "ua";
export type EquipmentEntry = CollectionEntry<"equipment">;

/**
 * Extract locale from entry ID
 * @example getLocale("checkweighers/hc-a.en") => "en"
 */
export function getLocale(entry: EquipmentEntry): Locale {
	const match = entry.id.match(/\.(en|ua)$/);
	return (match?.[1] as Locale) || "en";
}

/**
 * Extract base slug without locale suffix
 * @example getBaseSlug("checkweighers/hc-a.en") => "checkweighers/hc-a"
 */
export function getBaseSlug(entry: EquipmentEntry): string {
	return entry.id.replace(/\.(en|ua)$/, "");
}

/**
 * Extract just the filename slug (without category and locale)
 * @example getSlug("checkweighers/hc-a.en") => "hc-a"
 */
export function getSlug(entry: EquipmentEntry): string {
	const parts = entry.id.split("/");
	const filename = parts[parts.length - 1];
	return filename.replace(/\.(en|ua)$/, "").replace("index", "");
}

/**
 * Extract category from entry ID
 * @example getCategory("checkweighers/hc-a.en") => "checkweighers"
 */
export function getCategory(entry: EquipmentEntry): string {
	return entry.id.split("/")[0];
}

/**
 * Check if entry is a category (index file)
 */
export function isCategory(entry: EquipmentEntry): boolean {
	return /index\.(en|ua)$/.test(entry.id);
}

/**
 * Check if entry is a product
 */
export function isProduct(entry: EquipmentEntry): boolean {
	return !isCategory(entry);
}

/**
 * Filter entries by locale
 */
export function filterByLocale(entries: EquipmentEntry[], locale: Locale): EquipmentEntry[] {
	return entries.filter((entry) => getLocale(entry) === locale);
}

/**
 * Filter entries by category
 */
export function filterByCategory(entries: EquipmentEntry[], categorySlug: string): EquipmentEntry[] {
	return entries.filter((entry) => getCategory(entry) === categorySlug);
}

/**
 * Get all products (non-category entries)
 */
export function getProducts(entries: EquipmentEntry[]): EquipmentEntry[] {
	return entries.filter(isProduct);
}

/**
 * Get all categories (index entries)
 */
export function getCategories(entries: EquipmentEntry[]): EquipmentEntry[] {
	return entries.filter(isCategory);
}

/**
 * Find matching entry in a different locale
 * @example findTranslation(hcaEN, "ua", allEntries) => hcaUA
 */
export function findTranslation(
	entry: EquipmentEntry,
	targetLocale: Locale,
	allEntries: EquipmentEntry[]
): EquipmentEntry | undefined {
	const baseSlug = getBaseSlug(entry);
	const targetId = `${baseSlug}.${targetLocale}`;
	return allEntries.find((e) => e.id === targetId);
}

/**
 * Group entries by base slug (all locales together)
 * @returns Map<baseSlug, EquipmentEntry[]>
 */
export function groupBySlug(entries: EquipmentEntry[]): Map<string, EquipmentEntry[]> {
	const groups = new Map<string, EquipmentEntry[]>();

	for (const entry of entries) {
		const baseSlug = getBaseSlug(entry);
		if (!groups.has(baseSlug)) {
			groups.set(baseSlug, []);
		}
		groups.get(baseSlug)!.push(entry);
	}

	return groups;
}

/**
 * Get available locales for a slug
 * @example getAvailableLocales("checkweighers/hc-a", allEntries) => ["en", "ua"]
 */
export function getAvailableLocales(baseSlug: string, entries: EquipmentEntry[]): Locale[] {
	return entries
		.filter((entry) => getBaseSlug(entry) === baseSlug)
		.map((entry) => getLocale(entry));
}

/**
 * Sort entries by order field
 */
export function sortByOrder(entries: EquipmentEntry[]): EquipmentEntry[] {
	if (!Array.isArray(entries) || entries.length === 0) {
		return [];
	}
	return [...entries].sort((a, b) => {
		const orderA = a?.data?.order ?? 999;
		const orderB = b?.data?.order ?? 999;
		return orderA - orderB;
	});
}

/**
 * Type guard for category entries
 */
export function isCategoryEntry(
	entry: EquipmentEntry
): entry is EquipmentEntry & {
	data: {
		label: string;
		description: string;
		icon?: string;
		order?: number;
	};
} {
	return isCategory(entry);
}

/**
 * Type guard for product entries
 */
export function isProductEntry(
	entry: EquipmentEntry
): entry is EquipmentEntry & {
	data: {
		title: string;
		description: string;
		gallery: string[];
		datasheet?: string;
		industries?: string[];
		specs?: Array<{ label: string; value: string }>;
		order?: number;
		body: string;
	};
} {
	return isProduct(entry);
}
