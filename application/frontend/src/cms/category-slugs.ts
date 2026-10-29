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

// Each file in the collection holds one list: equipment types or industries
const LIST_KEYS = ["categories", "industries"] as const;

function trimmedSlug(cat: Cat): string {
	const slug = cat.get("slug");
	return slug ? String(slug).trim() : "";
}

/**
 * Auto-generates hidden slugs for categories and industries from the EN title on save.
 * Existing slugs are preserved, and the same slug is synced to the UA list (matched by position).
 */
export const categorySlugsListener: Listener = {
	name: "preSave",
	handler: ({ entry }) => {
		try {
			if (entry.get("collection") !== COLLECTION) return;

			let data = entry.get("data") as EntryData | undefined;
			if (!data) return;

			for (const key of LIST_KEYS) {
				// 1. EN items: keep an existing slug, otherwise generate one from the title
				const enItems = (data.getIn(["en", key]) ?? data.get(key)) as CatList | undefined;
				enItems?.forEach((item, idx) => {
					const slug = trimmedSlug(item) || slugify(item.get("title"));
					if (!(slug && data)) return;
					if (data.hasIn(["en", key])) {
						data = data.setIn(["en", key, idx, "slug"], slug);
					}
					if (data.has(key)) {
						data = data.setIn([key, idx, "slug"], slug);
					}
				});

				// 2. UA items: reuse the EN slug
				const uaItems = data.getIn(["ua", key]) as CatList | undefined;
				if (!uaItems) continue;
				const finalEnItems = (data.getIn(["en", key]) ?? data.get(key)) as CatList | undefined;
				uaItems.forEach((item, idx) => {
					const enSlug = (finalEnItems?.get(idx)?.get("slug") as string | undefined) ?? "";
					const slug = enSlug || trimmedSlug(item) || slugify(item.get("title"));
					if (slug && data) {
						data = data.setIn(["ua", key, idx, "slug"], slug);
					}
				});
			}

			// Returning the data Map replaces the entry data in Decap
			return data;
		} catch (err) {
			console.error("[preSave] slug error:", err);
		}
	},
};
