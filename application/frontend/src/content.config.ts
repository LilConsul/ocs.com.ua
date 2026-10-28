import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

const specRow = z.object({
	label: z.string(),
	value: z.string(),
});

// A group of rows, optionally with a heading (e.g. "Conveyor")
const specGroup = z.object({
	title: z.string().optional(),
	items: z.array(specRow).optional(),
});

const equipment = defineCollection({
	loader: glob({
		pattern: "**/!(_index)*.md",
		base: "./src/content/equipment",
	}),
	schema: z.object({
		type: z.enum(["category", "product"]).optional(),
		title: z.string().optional(),
		description: z.string().optional(),
		icon: z.string().optional(),
		order: z.number().optional(),
		industries: z.array(z.string()).optional(),
		gallery: z.array(z.string()).optional(),
		datasheet: z.string().optional(),
		// Either a flat list of rows or a list of groups
		specs: z.union([z.array(specRow), z.array(specGroup)]).optional(),
	}),
});

export const collections = {
	equipment,
};
