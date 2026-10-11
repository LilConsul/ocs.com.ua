import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

/**
 * Content Collections Configuration - Native i18n with multiple_files structure
 *
 * File structure:
 *   - Products: checkweighers/hc-a.en.md, checkweighers/hc-a.ua.md
 *   - Categories: checkweighers/index.en.md, checkweighers/index.ua.md
 *
 * Entry IDs include locale: "checkweighers/hc-a.en", "checkweighers/hc-a.ua"
 */

// Combined schema that handles both categories and products
const equipmentSchema = z.object({
	// Required fields for all entries
	category: z.enum(["checkweighers", "catchweighers", "metal-detectors", "x-ray-inspection"]),
	description: z.string(),
	order: z.number().optional(),

	// Category-specific fields
	label: z.string().optional(),
	icon: z.string().optional(),

	// Product-specific fields
	title: z.string().optional(),
	gallery: z.array(z.string()).optional(),
	datasheet: z.string().optional(),
	industries: z.array(z.string()).optional(),
	specs: z
		.array(
			z.object({
				label: z.string(),
				value: z.string(),
			})
		)
		.optional(),
	body: z.string().optional(),
}).refine(
	(data) => {
		// Must be either a category (has label) or product (has title)
		return (data.label && !data.title) || (data.title && !data.label);
	},
	{
		message: "Entry must be either a category (with label) or product (with title)",
	}
);

// Equipment collection - handles both products and categories
// Loader pattern matches .en.md and .ua.md files
const equipmentCollection = defineCollection({
	loader: glob({
		pattern: "**/*.{en,ua}.md", // Match locale-suffixed files
		base: "./src/content/equipment",
	}),
	schema: equipmentSchema,
});

export const collections = {
	equipment: equipmentCollection,
};

/**
 * Helper types for TypeScript consumers
 */

// Extract locale from entry ID (e.g., "checkweighers/hc-a.en" -> "en")
export type Locale = "en" | "ua";

export function getLocaleFromId(id: string): Locale {
	const match = id.match(/\.(en|ua)$/);
	return (match?.[1] as Locale) || "en";
}

// Extract slug without locale (e.g., "checkweighers/hc-a.en" -> "checkweighers/hc-a")
export function getSlugWithoutLocale(id: string): string {
	return id.replace(/\.(en|ua)$/, "");
}

// Check if entry is a category (index file)
export function isCategory(id: string): boolean {
	return /index\.(en|ua)$/.test(id);
}

// Check if entry is a product
export function isProduct(id: string): boolean {
	return !isCategory(id);
}
