import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

// Equipment collection with multilingual fields and separate body content
const equipmentCollection = defineCollection({
	loader: glob({ pattern: "**/[^_]*.md", base: "./src/content/equipment" }),
	schema: () =>
		z.object({
			// Multilingual fields - nested objects per language
			title: z.object({
				en: z.string(),
				ua: z.string(),
			}),
			description: z.object({
				en: z.string(),
				ua: z.string(),
			}),
			// Media files stored in public/ (as string paths)
			gallery: z.array(z.string()).min(1).max(10), // First image is hero
			datasheet: z.string().optional(),
			// Specs with multilingual labels
			specs: z
				.array(
					z.object({
						label: z.object({
							en: z.string(),
							ua: z.string(),
						}),
						value: z.string(), // Value typically stays the same (numbers/units)
					})
				)
				.max(3),
			// Separate body fields for each language (not using isBody: true)
			bodyEn: z.string(),
			bodyUa: z.string(),
		}),
});

export const collections = {
	equipment: equipmentCollection,
};
