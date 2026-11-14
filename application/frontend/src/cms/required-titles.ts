import type CMS from "decap-cms-app";

type Listener = Parameters<typeof CMS.registerEventListener>[0];

// Minimal structural view of the Immutable.js entry Decap passes (getIn() is typed `unknown`)
interface Entry {
	get(key: string): unknown;
	getIn(path: (string | number)[]): unknown;
}

// Collections whose every locale file must carry a title
const COLLECTIONS = ["equipment", "wiki"];

// Default locale first: its data lives in `data`, the others in `i18n.<locale>.data`
const LOCALES: { code: string; path: string[] }[] = [
	{ code: "ua", path: ["data", "title"] },
	{ code: "en", path: ["i18n", "en", "data", "title"] },
];

/**
 * Blocks saving when a locale has no title.
 *
 * Decap only validates `required` for the locale tab that is open, so an entry saved from
 * the UA tab gets an EN file without a title, which then breaks the Astro build.
 */
export const requiredTitlesListener: Listener = {
	name: "preSave",
	handler: ({ entry }) => {
		const e = entry as unknown as Entry;
		if (!COLLECTIONS.includes(e.get("collection") as string)) return;

		const missing = LOCALES.filter(({ path }) => !String(e.getIn(path) ?? "").trim()).map(
			({ code }) => code.toUpperCase()
		);
		if (missing.length) {
			throw new Error(
				`Title is required in every language. Fill in the Title for: ${missing.join(", ")} (switch the language in "Writing in" at the top of the editor).`
			);
		}
	},
};
