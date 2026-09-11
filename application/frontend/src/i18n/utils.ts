import { defaultLang, ui } from "./ui";

export type Lang = keyof typeof ui;

export function getLangFromUrl(url: URL): Lang {
	const [, lang] = url.pathname.split("/");
	// Explicitly check against valid language codes
	if (lang === "en" || lang === "ua") {
		return lang;
	}
	return defaultLang;
}

export function getTranslations(lang: Lang) {
	return function t(key: keyof (typeof ui)[typeof defaultLang]) {
		return ui[lang][key] || ui[defaultLang][key];
	};
}
