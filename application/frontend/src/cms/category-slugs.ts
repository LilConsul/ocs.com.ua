import type CMS from "decap-cms-app";
import { slugify } from "./slugify";

type Listener = Parameters<typeof CMS.registerEventListener>[0];

// Minimal structural view of the Immutable.js values Decap passes (getIn() is typed `unknown`)
interface Cat {
	get(key: string): unknown;
}
interface CatList {
	get(index: number): Cat | undefined;
	forEach(fn: (cat: Cat, idx: number) => void): void;
}
interface EntryData {
	get(key: string): unknown;
	has(key: string): boolean;
	hasIn(path: (string | number)[]): boolean;
	getIn(path: (string | number)[]): unknown;
	setIn(path: (string | number)[], value: unknown): EntryData;
}

const COLLECTION = "equipment-categories";

function trimmedSlug(cat: Cat): string {
	const slug = cat.get("slug");
	return slug ? String(slug).trim() : "";
}

/**
 * Auto-generates hidden category slugs from the EN title on save. Existing slugs are
 * preserved, and the same slug is synced to the UA categories (matched by position).
 */
export const categorySlugsListener: Listener = {
	name: "preSave",
	handler: ({ entry }) => {
		try {
			if (entry.get("collection") !== COLLECTION) return;

			let data = entry.get("data") as EntryData | undefined;
			if (!data) return;

			// 1. EN categories: keep an existing slug, otherwise generate one from the title
			const enCats = (data.getIn(["en", "categories"]) ?? data.get("categories")) as
				| CatList
				| undefined;
			enCats?.forEach((cat, idx) => {
				const slug = trimmedSlug(cat) || slugify(cat.get("title"));
				if (!(slug && data)) return;
				if (data.hasIn(["en", "categories"])) {
					data = data.setIn(["en", "categories", idx, "slug"], slug);
				}
				if (data.has("categories")) {
					data = data.setIn(["categories", idx, "slug"], slug);
				}
			});

			// 2. UA categories: reuse the EN slug
			const uaCats = data.getIn(["ua", "categories"]) as CatList | undefined;
			if (uaCats) {
				const finalEnCats = (data.getIn(["en", "categories"]) ?? data.get("categories")) as
					| CatList
					| undefined;
				uaCats.forEach((cat, idx) => {
					const enSlug = (finalEnCats?.get(idx)?.get("slug") as string | undefined) ?? "";
					const slug = enSlug || trimmedSlug(cat) || slugify(cat.get("title"));
					if (slug && data) {
						data = data.setIn(["ua", "categories", idx, "slug"], slug);
					}
				});
			}

			// Returning the data Map replaces the entry data in Decap
			return data;
		} catch (err) {
			console.error("[preSave] category slug error:", err);
		}
	},
};
