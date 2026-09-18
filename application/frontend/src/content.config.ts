import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

// Category schema for index.md files
const categorySchema = z.object({
	"en-label": z.string(),
	"ua-label": z.string(),
	"en-description": z.string(),
	"ua-description": z.string(),
	icon: z.string().optional(),
	order: z.number().optional(),
});

// Product schema for equipment files
const productSchema = z.object({
	// Multilingual fields - flattened with kebab-case names
	"en-title": z.string(),
	"ua-title": z.string(),
	"en-description": z.string(),
	"ua-description": z.string(),
	// Display order (lower numbers appear first)
	order: z.number().optional(),
	// Media files stored in public/assets/ (as string paths)
	gallery: z.array(z.string()).min(1).max(10), // First image is hero
	datasheet: z.string().optional(),
	// Industry tags for filtering
	industries: z.array(z.string()).optional(),
	// Specs with flattened multilingual labels
	specs: z
		.array(
			z.object({
				"en-label": z.string(),
				"ua-label": z.string(),
				value: z.string(),
			})
		)
		.min(1)
		.max(3)
		.optional(),
	// Separate body fields for each language
	"en-body": z.string(),
	"ua-body": z.string(),
});

// Equipment collection contains both products and categories (index files)
// Use discriminated union to handle both schemas
const equipmentCollection = defineCollection({
	loader: glob({
		pattern: "**/*.md",
		base: "./src/content/equipment",
	}),
	schema: z.union([categorySchema, productSchema]),
});

export const collections = {
	equipment: equipmentCollection,
};
