const CYRILLIC_MAP: Record<string, string> = {
	а: "a",
	б: "b",
	в: "v",
	г: "h",
	ґ: "g",
	д: "d",
	е: "e",
	є: "ye",
	ж: "zh",
	з: "z",
	и: "y",
	і: "i",
	ї: "yi",
	й: "y",
	к: "k",
	л: "l",
	м: "m",
	н: "n",
	о: "o",
	п: "p",
	р: "r",
	с: "s",
	т: "t",
	у: "u",
	ф: "f",
	х: "kh",
	ц: "ts",
	ч: "ch",
	ш: "sh",
	щ: "shch",
	ь: "",
	ю: "yu",
	я: "ya",
	ы: "y",
	э: "e",
	ё: "yo",
};

/** URL-safe slug from a title, transliterating Cyrillic to Latin. */
export function slugify(text: unknown): string {
	if (!text) return "";
	return String(text)
		.toLowerCase()
		.trim()
		.replace(/[а-яґєіїёыэ]/g, (ch) => CYRILLIC_MAP[ch] ?? ch)
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "");
}
