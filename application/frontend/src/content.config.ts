import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

const equipment = defineCollection({
	loader: glob({
		pattern: "**/*.md",
		base: "./src/content/equipment",
	}),
	schema: z.object({
		title: z.string().optional(),
		description: z.string().optional(),
		icon: z.string().optional(),
		order: z.number().optional(),
		industries: z.array(z.string()).optional(),
		gallery: z.array(z.string()).optional(),
		datasheet: z.string().optional(),
		specs: z
			.array(
				z.object({
					label: z.string(),
					value: z.string(),
				}),
			)
			.optional(),
	}),
});

export const collections = {
	equipment,
};
