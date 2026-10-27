/**
 * Content utilities for working with i18n content collections
 *
 * The glob loader generates IDs from filenames by stripping the .md extension.
 * Dots within the filename are also removed, so:
 *   - "catchweighers/hc-sl.en.md"  → ID: "catchweighers/hc-slen"
 *   - "catchweighers/_index.en.md" → ID: "catchweighers/_indexen"
 *   - "catchweighers/hc-sl.ua.md"  → ID: "catchweighers/hc-slua"
 */

import type { CollectionEntry } from "astro:content";
import equipmentTypes from "../data/equipment-types.json";
import industriesData from "../data/industries.json";

export type Locale = "en" | "ua";
export type EquipmentEntry = CollectionEntry<"equipment">;

export interface EquipmentType {
	slug: string;
	title: string;
	description: string;
	icon: string;
}

/**
 * Get all equipment category types for a given locale, in array order.
 * Reads from src/data/equipment-types.json (managed by CMS, drag to reorder).
 */
export function getCategoriesForLocale(locale: Locale): EquipmentType[] {
	const data = equipmentTypes as {
		en?: { categories: EquipmentType[] };
		ua?: { categories: EquipmentType[] };
	};
	return data[locale]?.categories ?? [];
}

export interface Industry {
	slug: string;
	title: string;
	description: string;
	icon: string;
}

/**
 * Get all industries for a given locale, in array order.
 * Reads from src/data/industries.json (managed by CMS, drag to reorder).
 */
export function getIndustriesForLocale(locale: Locale): Industry[] {
	const data = industriesData as {
		en?: { industries: Industry[] };
		ua?: { industries: Industry[] };
	};
	return data[locale]?.industries ?? [];
}

/**
 * Extract locale from entry ID
 * @example getLocale("catchweighers/hc-slen") => "en"
 */
export function getLocale(entry: EquipmentEntry): Locale {
	const id = entry.id;
	if (id.endsWith("en")) return "en";
	if (id.endsWith("ua")) return "ua";
	return "en";
}

/**
 * Extract just the filename slug (without category and locale)
 * @example getSlug("catchweighers/hc-slen") => "hc-sl"
 */
export function getSlug(entry: EquipmentEntry): string {
	const parts = entry.id.split("/");
	const filename = parts[parts.length - 1];
	// Remove trailing locale suffix ("en" or "ua")
	return filename.replace(/(en|ua)$/, "");
}

/**
 * Extract category from entry ID
 * @example getCategory("catchweighers/hc-slen") => "catchweighers"
 */
export function getCategory(entry: EquipmentEntry): string {
	return entry.id.split("/")[0];
}

/**
 * Check if entry is a category (_index file)
 * @example isCategory("catchweighers/_indexen") => true
 */
export function isCategory(entry: EquipmentEntry): boolean {
	const parts = entry.id.split("/");
	const filename = parts[parts.length - 1];
	return filename.startsWith("_index");
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
export function filterByCategory(
	entries: EquipmentEntry[],
	categorySlug: string
): EquipmentEntry[] {
	return entries.filter((entry) => getCategory(entry) === categorySlug);
}

/**
 * Filter entries tagged with an industry
 */
export function filterByIndustry(
	entries: EquipmentEntry[],
	industrySlug: string
): EquipmentEntry[] {
	return entries.filter((entry) => entry.data.industries?.includes(industrySlug));
}

export interface CategoryGroup {
	category: EquipmentType;
	products: EquipmentEntry[];
}

/**
 * Group entries under their category, in the order of `categories`.
 * Products inside a group are sorted by order; categories without products are omitted.
 */
export function groupByCategory(
	entries: EquipmentEntry[],
	categories: EquipmentType[]
): CategoryGroup[] {
	return categories
		.map((category) => ({
			category,
			products: sortByOrder(filterByCategory(entries, category.slug)),
		}))
		.filter((group) => group.products.length > 0);
}

/**
 * Get all products (non-category entries)
 */
export function getProducts(entries: EquipmentEntry[]): EquipmentEntry[] {
	return entries.filter(isProduct);
}

/**
 * Get all categories (_index entries)
 */
export function getCategories(entries: EquipmentEntry[]): EquipmentEntry[] {
	return entries.filter(isCategory);
}

/**
 * Find matching entry in a different locale
 * @example findTranslation(hcaEN, "ua", allEntries) => hcaUA entry
 */
export function findTranslation(
	entry: EquipmentEntry,
	targetLocale: Locale,
	allEntries: EquipmentEntry[]
): EquipmentEntry | undefined {
	const category = getCategory(entry);
	const slug = getSlug(entry);
	const targetId = `${category}/${slug}${targetLocale}`;
	return allEntries.find((e) => e.id === targetId);
}

/**
 * Sort entries by order field
 */
export function sortByOrder(entries: EquipmentEntry[]): EquipmentEntry[] {
	if (!Array.isArray(entries) || entries.length === 0) return [];
	return [...entries].sort((a, b) => {
		const orderA = a?.data?.order ?? 999;
		const orderB = b?.data?.order ?? 999;
		return orderA - orderB;
	});
}

/**
 * Type guard for category entries
 */
export function isCategoryEntry(entry: EquipmentEntry): entry is EquipmentEntry & {
	data: {
		title?: string;
		description?: string;
		icon?: string;
		order?: number;
	};
} {
	return isCategory(entry);
}

/**
 * Type guard for product entries
 */
export function isProductEntry(entry: EquipmentEntry): entry is EquipmentEntry & {
	data: {
		title?: string;
		description?: string;
		gallery?: string[];
		datasheet?: string;
		industries?: string[];
		specs?: Array<{ label: string; value: string }>;
		order?: number;
	};
} {
	return isProduct(entry);
}
