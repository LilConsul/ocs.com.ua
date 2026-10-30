import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

const specRow = z.object({
	label: z.string(),
	value: z.string(),
});

// A group of rows, optionally with a heading (e.g. "Conveyor")
const specGroup = z.object({
	title: z.string().nullish(),
	items: z.array(specRow).nullish(),
});

const equipment = defineCollection({
	loader: glob({
		pattern: "**/!(_index)*.md",
		base: "./src/content/equipment",
	}),
	schema: z.object({
		type: z.enum(["category", "product"]).nullish(),
		// Used by the CMS to name new files (must match the file's base name)
		file_name: z.string().nullish(),
		title: z.string().nullish(),
		description: z.string().nullish(),
		icon: z.string().nullish(),
		order: z.number().nullish(),
		industries: z.array(z.string()).nullish(),
		gallery: z.array(z.string()).nullish(),
		datasheet: z.string().nullish(),
		// Either a flat list of rows or a list of groups
		specs: z.union([z.array(specRow), z.array(specGroup)]).nullish(),
	}),
});

export const collections = {
	equipment,
};
