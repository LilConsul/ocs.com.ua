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
		// Required: it is the alt text of every product image and the page <title>/<h1>
		title: z.string().min(1),
		description: z.string().nullish(),
		icon: z.string().nullish(),
		order: z.number().nullish(),
		// Optional: shown on the homepage featured band when set
		manufacturer: z.enum(["Wipotec", "Mesutronic"]).nullish(),
		industries: z.array(z.string()).nullish(),
		gallery: z.array(z.string()).nullish(),
		datasheet: z.string().nullish(),
		// Either a flat list of rows or a list of groups
		specs: z.union([z.array(specRow), z.array(specGroup)]).nullish(),
	}),
});

const wiki = defineCollection({
	loader: glob({
		pattern: "**/!(_index)*.md",
		base: "./src/content/wiki",
	}),
	schema: z.object({
		// Used by the CMS to name new files (must match the file's base name)
		file_name: z.string().nullish(),
		title: z.string(),
		description: z.string().nullish(),
		coverImage: z.string().nullish(),
		order: z.number().nullish(),
		related: z.array(z.string()).nullish(),
		// Accepts both quoted strings and unquoted YAML dates (what the CMS writes)
		datePublished: z.coerce.date().nullish(),
		dateModified: z.coerce.date().nullish(),
	}),
});

export const collections = {
	equipment,
	wiki,
};
