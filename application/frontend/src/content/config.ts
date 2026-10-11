import { defineCollection, z } from "astro:content";

const equipment = defineCollection({
	type: "content",
	schema: z.object({
		// Common fields
		category: z.string().optional(),
		label: z.string().optional(),
		description: z.string().optional(),
		icon: z.string().optional(),
		order: z.number().optional(),

		// Product fields
		title: z.string().optional(),
		model: z.string().optional(),
		manufacturer: z.string().optional(),
		image: z.string().optional(),
		datasheet: z.string().optional(),
		specs: z
			.object({
				weighingRange: z.string().optional(),
				accuracy: z.string().optional(),
				speed: z.string().optional(),
				beltWidth: z.string().optional(),
				protection: z.string().optional(),
			})
			.optional(),
		features: z.array(z.string()).optional(),
		applications: z.array(z.string()).optional(),
	}),
});

export const collections = {
	equipment,
};
