import {
	type EquipmentEntry,
	type EquipmentType,
	filterByCategory,
	filterByLocale,
	getProducts,
	getSlug,
	type Locale,
} from "@/lib/content-utils";

export interface FeaturedGroup {
	category: EquipmentType;
	/** First product of the category by catalogue order */
	spotlight: EquipmentEntry;
	/** The next products, at most `listSize` */
	others: EquipmentEntry[];
}

const byOrderThenSlug = (a: EquipmentEntry, b: EquipmentEntry) =>
	(a.data.order ?? 999) - (b.data.order ?? 999) || getSlug(a).localeCompare(getSlug(b));

/**
 * One group per category that has products, in the order of `categories`. The spotlight is the
 * first product by `order` (ties broken by slug); `others` are the next `listSize` products.
 * Category index entries and other locales are ignored.
 */
export function getFeaturedGroups(
	entries: EquipmentEntry[],
	locale: Locale,
	categories: EquipmentType[],
	listSize = 3
): FeaturedGroup[] {
	const products = getProducts(filterByLocale(entries, locale));
	return categories.flatMap((category) => {
		const sorted = [...filterByCategory(products, category.slug)].sort(byOrderThenSlug);
		const [spotlight, ...rest] = sorted;
		return spotlight ? [{ category, spotlight, others: rest.slice(0, listSize) }] : [];
	});
}

/**
 * Whole sentences from `text` up to about `max` characters, always at least the first one and
 * never cut mid-sentence. Decimals like "0.1 g" do not end a sentence.
 */
export function summarize(text: string | null | undefined, max = 230): string {
	const flat = (text ?? "").replace(/\s+/g, " ").trim();
	const sentences = flat.match(/.+?(?:[.!?]+(?=\s|$)|$)/g) ?? [];
	let out = "";
	for (const sentence of sentences) {
		if (out && out.length + sentence.length > max) break;
		out += sentence;
	}
	return out.trim();
}

const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * The title without the model code, for cards that already show the code above it:
 * "HC-A Checkweigher" with model "HC-A" gives "Checkweigher". Case does not matter, a "model" or
 * "модель" right before the code goes too, and a code that is only part of a longer one
 * ("HC-A" in "TQS-HC-A") is left alone. Returns the full title if nothing would be left.
 */
export function shortTitle(title: string, model: string): string {
	const flat = title.replace(/\s+/g, " ").trim();
	if (!model) return flat;
	const code = new RegExp(
		`(?:,?\\s*(?:model|модель)\\s+)?(?<![\\p{L}\\p{N}-])${escapeRegExp(model)}(?![\\p{L}\\p{N}-])`,
		"iu"
	);
	const rest = flat
		.replace(code, " ")
		.replace(/\s+/g, " ")
		.trim()
		.replace(/^[,\s]+|[,\s]+$/g, "");
	return rest ? rest.charAt(0).toUpperCase() + rest.slice(1) : flat;
}
