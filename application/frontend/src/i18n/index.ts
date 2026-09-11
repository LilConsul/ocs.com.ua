export { getInlineTranslations } from "./inline";
export type { ui } from "./ui";
export { defaultLang, languages, ui } from "./ui";
export { getLangFromUrl, getTranslations } from "./utils";
export type Lang = keyof typeof ui;
