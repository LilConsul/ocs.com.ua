export { getInlineTranslations } from "./inline";
export { defaultLang, languages, ui } from "./ui";
export type { Lang } from "./utils";
export { getLangFromUrl, getTranslations } from "./utils";

// Helper to validate language code
export function isValidLang(lang: unknown): lang is import("./utils").Lang {
	return typeof lang === "string" && (lang === "en" || lang === "ua");
}
