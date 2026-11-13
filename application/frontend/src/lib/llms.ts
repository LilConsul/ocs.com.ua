/**
 * Builders for the LLM-facing text files: /llms.txt (https://llmstxt.org), /llms-full.txt and the
 * per-page Markdown copies of products and wiki articles. Pure functions over content entries, so
 * the endpoints stay thin and the output is unit-testable.
 */

import companyData from "@/data/company.json";
import { getInlineTranslations, type Lang } from "@/i18n";
import { industryUrl, productUrl } from "./catalogue-urls";
import {
	type EquipmentEntry,
	filterByLocale,
	flattenSpecs,
	getCategoriesForLocale,
	getCategory,
	getIndustries,
	getIndustriesForLocale,
	getLocale,
	getProducts,
	getSlug,
	groupByCategory,
} from "./content-utils";
import {
	filterWikiByLocale,
	getWikiLocale,
	getWikiSlug,
	sortWikiArticles,
	type WikiEntry,
} from "./wiki-utils";

export interface LlmsContent {
	site: URL | string;
	equipment: EquipmentEntry[];
	wiki: WikiEntry[];
}

const LANGS: Lang[] = ["ua", "en"];

export const wikiUrl = (lang: Lang, slug: string) => `/${lang}/wiki/${slug}`;

/** Absolute URL for a site path. */
const abs = (path: string, site: URL | string) => new URL(path, site).href;

/** The Markdown copy sits next to the HTML page: /ua/wiki/load-cell -> /ua/wiki/load-cell.md */
const mdUrl = (path: string, site: URL | string) => abs(`${path}.md`, site);

/** Collapse whitespace so a frontmatter description fits on one list line. */
const oneLine = (text: string | null | undefined) => (text ?? "").replace(/\s+/g, " ").trim();

const link = (title: string, url: string, note?: string | null) => {
	const n = oneLine(note);
	return n ? `- [${title}](${url}): ${n}` : `- [${title}](${url})`;
};

/** Root-relative Markdown links in content (`](/ua/wiki/x)`) become absolute. */
const absolutizeLinks = (markdown: string, site: URL | string) =>
	markdown.replace(/\]\((\/[^)\s]*)\)/g, (_m, path: string) => `](${abs(path, site)})`);

const join = (blocks: string[]) => `${blocks.filter(Boolean).join("\n\n").trim()}\n`;

function companyBlock(lang: Lang): string {
	const _ = getInlineTranslations(lang);
	const address = companyData.address[lang];
	const street = address.office ? `${address.street}, ${address.office}` : address.street;
	return [
		`- ${_("Phone")}: ${companyData.phone}`,
		`- Email: ${companyData.email}`,
		`- ${_("Address")}: ${street}, ${address.city}, ${address.postalCode}, ${address.country}`,
		`- ${_("Working hours")}: ${companyData.workingHours[lang]}`,
	].join("\n");
}

function productsByCategory(lang: Lang, equipment: EquipmentEntry[]) {
	const products = filterByLocale(getProducts(equipment), lang);
	return groupByCategory(products, getCategoriesForLocale(lang));
}

function articles(lang: Lang, wiki: WikiEntry[]) {
	return sortWikiArticles(filterWikiByLocale(wiki, lang));
}

/** The link sections of llms.txt for one language. */
function linkSections(lang: Lang, { site, equipment, wiki }: LlmsContent): string[] {
	const _ = getInlineTranslations(lang);
	const sections: string[] = [];

	for (const { category, products } of productsByCategory(lang, equipment)) {
		const lines = products.map((p) =>
			link(
				p.data.title,
				mdUrl(productUrl(lang, getCategory(p), getSlug(p)), site),
				p.data.description
			)
		);
		sections.push(
			`## ${category.title}\n\n${oneLine(category.description)}\n\n${lines.join("\n")}`
		);
	}

	const industries = getIndustriesForLocale(lang).map((i) =>
		link(i.title, abs(industryUrl(lang, i.slug), site), i.description)
	);
	if (industries.length) sections.push(`## ${_("Industries")}\n\n${industries.join("\n")}`);

	const wikiLines = articles(lang, wiki).map((a) =>
		link(a.data.title, mdUrl(wikiUrl(lang, getWikiSlug(a)), site), a.data.description)
	);
	if (wikiLines.length) sections.push(`## ${_("Wiki")}\n\n${wikiLines.join("\n")}`);

	sections.push(
		`## ${_("Company")}\n\n${[
			link(_("About"), abs(`/${lang}/about`, site)),
			link(_("Contact"), abs(`/${lang}/contact`, site)),
		].join("\n")}`
	);
	return sections;
}

function header(lang: Lang): string[] {
	const _ = getInlineTranslations(lang);
	const name = companyData.name[lang];
	const other = companyData.name[lang === "ua" ? "en" : "ua"];
	return [
		`# ${name} (${other})`,
		`> ${_(
			"Checkweighers, metal detectors & Track & Trace systems for food, pharmaceutical and logistics industries in Ukraine. Official WIPOTEC & MESUTRONIC partner."
		)}`,
		_(
			"OS-Technology Ukraine is the exclusive authorized distributor and certified integration partner of WIPOTEC GmbH and MESUTRONIC Gerätebau GmbH in Ukraine. We supply dynamic checkweighers, industrial metal detectors, X-Ray scanners, and Track & Trace serialization and aggregation systems for the pharmaceutical industry with turnkey commissioning and factory warranty."
		),
		companyBlock(lang),
	];
}

/** /llms.txt: Ukrainian (the site's default language) first, English links after. */
export function buildLlmsTxt(content: LlmsContent): string {
	const _ = getInlineTranslations("ua");
	const en = linkSections("en", content).map((s) => s.replace(/^## /, "### "));
	return join([
		...header("ua"),
		`${_("Full text of every product and article")}: ${abs("/llms-full.txt", content.site)}`,
		...linkSections("ua", content),
		"## English\n\nThe same catalogue, industries and articles in English.",
		...en,
	]);
}

function specsTable(entry: EquipmentEntry): string {
	const specs = (entry.data.specs ?? []) as Array<Record<string, unknown>>;
	// Flat rows form one untitled group; grouped specs keep their headings ("Conveyor")
	const groups = specs.some((s) => "items" in s)
		? (specs as Array<{ title?: string | null; items?: SpecRow[] | null }>)
		: [{ title: null, items: flattenSpecs(entry.data.specs) }];
	const cell = (s: string) => oneLine(s).replace(/\|/g, "\\|");
	return groups
		.filter((g) => g.items?.length)
		.map((g) =>
			[
				g.title ? `### ${oneLine(g.title)}\n` : "",
				"| | |",
				"| --- | --- |",
				...(g.items ?? []).map((r) => `| ${cell(r.label)} | ${cell(r.value)} |`),
			]
				.filter(Boolean)
				.join("\n")
		)
		.join("\n\n");
}

type SpecRow = { label: string; value: string };

/** Markdown copy of a product page. */
export function productMarkdown(
	entry: EquipmentEntry,
	allEquipment: EquipmentEntry[],
	site: URL | string
): string {
	const lang = getLocale(entry);
	const _ = getInlineTranslations(lang);
	const category = getCategoriesForLocale(lang).find((c) => c.slug === getCategory(entry));
	const industries = (getIndustries(entry, allEquipment) ?? [])
		.map((slug) => getIndustriesForLocale(lang).find((i) => i.slug === slug))
		.filter((i) => i !== undefined);

	const facts = [
		`- ${_("Page")}: ${abs(productUrl(lang, getCategory(entry), getSlug(entry)), site)}`,
		category ? `- ${_("Category")}: ${category.title}` : "",
		entry.data.manufacturer ? `- ${_("Manufacturer")}: ${entry.data.manufacturer}` : "",
		industries.length
			? `- ${_("Industries")}: ${industries.map((i) => `[${i.title}](${abs(industryUrl(lang, i.slug), site)})`).join(", ")}`
			: "",
		`- ${_("Supplier in Ukraine")}: ${companyData.name[lang]}, ${companyData.phone}, ${companyData.email}`,
	]
		.filter(Boolean)
		.join("\n");

	const specs = specsTable(entry);
	return join([
		`# ${entry.data.title}`,
		entry.data.description ? `> ${oneLine(entry.data.description)}` : "",
		facts,
		specs ? `## ${_("Specifications")}\n\n${specs}` : "",
		absolutizeLinks(entry.body ?? "", site),
	]);
}

/** Markdown copy of a wiki article. */
export function wikiMarkdown(entry: WikiEntry, site: URL | string): string {
	const lang = getWikiLocale(entry);
	const _ = getInlineTranslations(lang);
	return join([
		`# ${entry.data.title}`,
		entry.data.description ? `> ${oneLine(entry.data.description)}` : "",
		`- ${_("Page")}: ${abs(wikiUrl(lang, getWikiSlug(entry)), site)}\n- ${_("Publisher")}: ${companyData.name[lang]}`,
		absolutizeLinks(entry.body ?? "", site),
	]);
}

/** /llms-full.txt: every Ukrainian product and article in full, then the English ones. */
export function buildLlmsFullTxt(content: LlmsContent): string {
	const { site, equipment, wiki } = content;
	const docs: string[] = [...header("ua")];
	for (const lang of LANGS) {
		for (const { products } of productsByCategory(lang, equipment)) {
			for (const p of products) docs.push(productMarkdown(p, equipment, site).trim());
		}
		for (const a of articles(lang, wiki)) docs.push(wikiMarkdown(a, site).trim());
	}
	return `${docs.join("\n\n---\n\n")}\n`;
}

export const textResponse = (body: string, type = "text/plain") =>
	new Response(body, { headers: { "Content-Type": `${type}; charset=utf-8` } });
