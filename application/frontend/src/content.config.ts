import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

// Equipment collection with flattened multilingual fields for easier editing
const equipmentCollection = defineCollection({
	loader: glob({ pattern: "**/[^_]*.md", base: "./src/content/equipment" }),
	schema: () =>
		z.object({
			// Multilingual fields - flattened with kebab-case names
			"en-title": z.string(),
			"ua-title": z.string(),
			"en-description": z.string(),
			"ua-description": z.string(),
			// Media files stored in public/assets/ (as string paths)
			gallery: z.array(z.string()).min(1).max(10), // First image is hero
			datasheet: z.string().optional(),
			// Specs with flattened multilingual labels
			specs: z
				.array(
					z.object({
						"en-label": z.string(),
						"ua-label": z.string(),
						value: z.string(),
					})
				)
				.max(3),
			// Separate body fields for each language
			"en-body": z.string(),
			"ua-body": z.string(),
		}),
});

export const collections = {
	equipment: equipmentCollection,
};
