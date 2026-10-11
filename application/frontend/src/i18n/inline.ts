import { defaultLang, ui } from "./ui";
import type { Lang } from "./utils";

/**
 * Inline translation function for gettext-style workflow.
 * Use this with English source text: _("Hello, world")
 *
 * The English text acts as the key - it gets auto-converted to a key like "inline.hello_world"
 * Run `bun run i18n:extract` to extract new strings and add translations.
 */
export function getInlineTranslations(lang: Lang) {
	return function _(text: string): string {
		// Generate key from English text
		const key = textToKey(text);
		const fullKey = `inline.${key}` as keyof (typeof ui)[typeof defaultLang];

		// Defensive lookup with proper fallbacks
		const langTranslations = ui[lang];
		const defaultTranslations = ui[defaultLang];

		if (!langTranslations || !defaultTranslations) {
			console.warn(`[i18n] Missing translations object for lang: ${lang}`);
			return text;
		}

		// Look up translation, fallback to English text if not found
		return langTranslations[fullKey] || defaultTranslations[fullKey] || text;
	};
}

/**
 * Convert English text to a valid translation key.
 * "Hello, World!" -> "hello_world"
 */
function textToKey(text: string): string {
	return text
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "_") // Replace non-alphanumeric with underscore
		.replace(/^_+|_+$/g, "") // Trim leading/trailing underscores
		.substring(0, 80); // Limit length to keep keys manageable
}

// Export the converter for use in extraction scripts
export { textToKey };
