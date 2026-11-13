/**
 * Builders for the LLM-facing text files: /llms.txt (https://llmstxt.org), /llms-full.txt and the
 * Markdown copy of every public page (/ua/about -> /ua/about.md, /ua/ -> /ua/index.md). Pure
 * functions over content entries, so the endpoints stay thin and the output is unit-testable.
 */

import companyData from "@/data/company.json";
import partnersRaw from "@/data/partners.json";
import { getInlineTranslations, type Lang } from "@/i18n";
import { getManufacturers } from "./about/manufacturers";
import { formatApprox, getSectorBreakdowns, getSiteStats } from "./about/partners-data";
import type { PartnersData } from "./about/types";
import { categoryUrl, industryUrl, productUrl } from "./catalogue-urls";
import {
	type EquipmentEntry,
	type EquipmentType,
	filterByCategory,
	filterByIndustry,
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
	type Industry,
	sortByOrder,
} from "./content-utils";
import { getPrivacyPolicySource, getTermsOfUseSource, type LegalSource } from "./legal/document";
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

export const wikiUrl = (lang: Lang, slug: string) => `/${lang}/wiki/${slug}/`;

/** Absolute URL for a site path. */
const abs = (path: string, site: URL | string) => new URL(path, site).href;

/** The Markdown copy sits next to the HTML page: /ua/wiki/load-cell -> /ua/wiki/load-cell.md */
const mdUrl = (path: string, site: URL | string) => abs(`${path.replace(/\/+$/, "")}.md`, site);

/** The home page /ua/ has no name to append .md to, so its copy is /ua/index.md */
export const homeMdUrl = (lang: Lang, site: URL | string) => abs(`/${lang}/index.md`, site);

/**
 * Path of the Markdown copy of a localized page, advertised in its <head>; undefined outside
 * /en and /ua (error pages).
 */
export function markdownPath(pagePath: string): string | undefined {
	const path = pagePath.replace(/\/+$/, "");
	if (/^\/(en|ua)$/.test(path)) return `${path}/index.md`;
	return /^\/(en|ua)\//.test(path) ? `${path}.md` : undefined;
}

/** Collapse whitespace so a frontmatter description fits on one list line. */
const oneLine = (text: string | null | undefined) => (text ?? "").replace(/\s+/g, " ").trim();

const link = (title: string, url: string, note?: string | null) => {
	const n = oneLine(note);
	return n ? `- [${title}](${url}): ${n}` : `- [${title}](${url})`;
};

/** A page path gets its trailing slash; files (/x.pdf) and anchors/queries are left alone. */
const withSlash = (path: string) => {
	const [, base, rest] = /^([^?#]*)(.*)$/.exec(path) ?? ["", path, ""];
	const last = base.split("/").pop() ?? "";
	return base.endsWith("/") || last.includes(".") ? path : `${base}/${rest}`;
};

/**
 * Root-relative Markdown links in content (`](/ua/wiki/x)`) become absolute, with the trailing
 * slash the pages are served at (CMS editors often leave it out).
 */
const absolutizeLinks = (markdown: string, site: URL | string) =>
	markdown.replace(/\]\((\/[^)\s]*)\)/g, (_m, path: string) => `](${abs(withSlash(path), site)})`);

// Soft hyphens in UI translations ("Метало-детектори") are layout hints, not text
const join = (blocks: string[]) =>
	`${blocks.filter(Boolean).join("\n\n").replace(/­/g, "").trim()}\n`;

function companyBlock(lang: Lang): string {
	const _ = getInlineTranslations(lang);
	const address = companyData.address[lang];
	const street = address.office ? `${address.street}, ${address.office}` : address.street;
	return [
		`- ${_("Phone")}: ${companyData.phone}`,
		`- Email: ${companyData.email}`,
		`- ${_("Address")}: ${street}, ${address.city}, ${address.postalCode}, ${address.country}`,
		`- ${_("Working Hours")}: ${companyData.workingHours[lang]}`,
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

	// Every category, also those without products yet: each has a page and a Markdown copy
	const localeProducts = filterByLocale(getProducts(equipment), lang);
	for (const category of getCategoriesForLocale(lang)) {
		const products = sortByOrder(filterByCategory(localeProducts, category.slug));
		const lines = products.map((p) =>
			link(
				p.data.title,
				mdUrl(productUrl(lang, getCategory(p), getSlug(p)), site),
				p.data.description
			)
		);
		const all = link(category.title, mdUrl(categoryUrl(lang, category.slug), site));
		sections.push(
			`## ${category.title}\n\n${oneLine(category.description)}\n\n${[all, ...lines].join("\n")}`
		);
	}

	const industries = getIndustriesForLocale(lang).map((i) =>
		link(i.title, mdUrl(industryUrl(lang, i.slug), site), i.description)
	);
	if (industries.length) sections.push(`## ${_("Industries")}\n\n${industries.join("\n")}`);

	const wikiLines = articles(lang, wiki).map((a) =>
		link(a.data.title, mdUrl(wikiUrl(lang, getWikiSlug(a)), site), a.data.description)
	);
	const wikiIndex = link(_("Wiki"), mdUrl(`/${lang}/wiki`, site));
	sections.push(`## ${_("Wiki")}\n\n${[wikiIndex, ...wikiLines].join("\n")}`);

	sections.push(
		`## ${_("Company")}\n\n${[
			link(_("Home"), homeMdUrl(lang, site)),
			link(_("About"), mdUrl(`/${lang}/about`, site)),
			link(_("Contact"), mdUrl(`/${lang}/contact`, site)),
			link(_("Privacy Policy"), mdUrl(`/${lang}/privacy`, site)),
			link(_("Terms of Use"), mdUrl(`/${lang}/terms`, site)),
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

/** Markdown copy of an industry page: what it is and the products used in it. */
export function industryMarkdown(
	industry: Industry,
	lang: Lang,
	allEquipment: EquipmentEntry[],
	site: URL | string
): string {
	const _ = getInlineTranslations(lang);
	const products = getProducts(allEquipment);
	const used = sortByOrder(
		filterByIndustry(filterByLocale(products, lang), industry.slug, products)
	).map((p) =>
		link(
			p.data.title,
			mdUrl(productUrl(lang, getCategory(p), getSlug(p)), site),
			p.data.description
		)
	);
	return join([
		`# ${industry.title}`,
		industry.description ? `> ${oneLine(industry.description)}` : "",
		[
			`- ${_("Page")}: ${abs(industryUrl(lang, industry.slug), site)}`,
			`- ${_("Supplier in Ukraine")}: ${companyData.name[lang]}`,
		].join("\n"),
		used.length ? `## ${_("Equipment")}\n\n${used.join("\n")}` : "",
		`## ${_("Contact")}\n\n${companyBlock(lang)}`,
	]);
}

/** Markdown copy of the About page: credentials, installed base and clients. */
export function aboutMarkdown(lang: Lang, site: URL | string): string {
	const _ = getInlineTranslations(lang);
	const partners = partnersRaw as PartnersData;
	const stats = getSiteStats(partners);
	const sectors = getSectorBreakdowns(partners);
	const installed = sectors.reduce(
		(sum, s) => ({ cw: sum.cw + s.stats.cw, md: sum.md + s.stats.md, tqs: sum.tqs + s.stats.tqs }),
		{ cw: 0, md: 0, tqs: 0 }
	);
	const clientsLine = _("Trusted by {clients} factories across Ukraine").replace(
		"{clients}",
		formatApprox(stats.clients)
	);

	const facts = [
		`- ${_("Page")}: ${abs(`/${lang}/about/`, site)}`,
		`- ${_("Serving Ukraine since 2013")}`,
		`- ${clientsLine}`,
		`- ${_("Installed Systems")}: ${formatApprox(stats.systems)}`,
		`- ${_("Checkweighers")}: ${formatApprox(installed.cw)}`,
		`- ${_("Metal Detectors")}: ${formatApprox(installed.md)}`,
		installed.tqs ? `- ${_("Serialization Stations")}: ${formatApprox(installed.tqs)}` : "",
	]
		.filter(Boolean)
		.join("\n");

	const manufacturers = getManufacturers(lang).map((m) =>
		[
			`### ${m.name}`,
			`${m.description} ${m.details}`,
			m.features.map((f) => `- ${f}`).join("\n"),
			[
				`- ${m.location}`,
				`- ${m.websiteUrl}`,
				m.pdfUrl ? `- [${_("Authorization Letter")}](${abs(m.pdfUrl, site)})` : "",
			]
				.filter(Boolean)
				.join("\n"),
		].join("\n\n")
	);

	// Client names only: per-client equipment counts stay behind SHOW_CLIENT_EQUIPMENT on the page
	const clients = sectors
		.map((sector) => {
			const names = partners[sector.category].map((p) =>
				p.website ? `- [${p.name[lang]}](${p.website})` : `- ${p.name[lang]}`
			);
			return names.length ? `### ${sector.title[lang]}\n\n${names.join("\n")}` : "";
		})
		.filter(Boolean);

	const summary = _(
		"Official exclusive distributor and certified engineering partner of WIPOTEC GmbH and MESUTRONIC Gerätebau GmbH in Ukraine. {systems} systems installed."
	).replace("{systems}", formatApprox(stats.systems));

	return join([
		`# ${companyData.name[lang]}`,
		`> ${summary}`,
		_(
			"OS-Technology Ukraine is the exclusive authorized distributor and certified integration partner of WIPOTEC GmbH and MESUTRONIC Gerätebau GmbH in Ukraine. We supply dynamic checkweighers, industrial metal detectors, X-Ray scanners, and Track & Trace serialization and aggregation systems for the pharmaceutical industry with turnkey commissioning and factory warranty."
		),
		facts,
		`## ${_("Manufacturers")}\n\n${manufacturers.join("\n\n")}`,
		clients.length ? `## ${_("Our clients")}\n\n${clients.join("\n\n")}` : "",
		`## ${_("Contact")}\n\n${companyBlock(lang)}`,
	]);
}

/** Markdown copy of the home page: the company, its contacts and the map of every section. */
export function homeMarkdown(lang: Lang, content: LlmsContent): string {
	const _ = getInlineTranslations(lang);
	return join([
		...header(lang),
		`- ${_("Page")}: ${abs(`/${lang}/`, content.site)}`,
		...linkSections(lang, content),
	]);
}

/** Markdown copy of an equipment category page: what the category is and its products. */
export function categoryMarkdown(
	category: EquipmentType,
	lang: Lang,
	allEquipment: EquipmentEntry[],
	site: URL | string
): string {
	const _ = getInlineTranslations(lang);
	const products = sortByOrder(
		filterByCategory(filterByLocale(getProducts(allEquipment), lang), category.slug)
	).map((p) =>
		link(p.data.title, mdUrl(productUrl(lang, category.slug, getSlug(p)), site), p.data.description)
	);
	return join([
		`# ${category.title}`,
		category.description ? `> ${oneLine(category.description)}` : "",
		[
			`- ${_("Page")}: ${abs(categoryUrl(lang, category.slug), site)}`,
			`- ${_("Supplier in Ukraine")}: ${companyData.name[lang]}`,
		].join("\n"),
		products.length ? `## ${_("Equipment")}\n\n${products.join("\n")}` : "",
		`## ${_("Contact")}\n\n${companyBlock(lang)}`,
	]);
}

/** Markdown copy of the wiki index: every article with its summary. */
export function wikiIndexMarkdown(lang: Lang, wiki: WikiEntry[], site: URL | string): string {
	const _ = getInlineTranslations(lang);
	const list = articles(lang, wiki).map((a) =>
		link(a.data.title, mdUrl(wikiUrl(lang, getWikiSlug(a)), site), a.data.description)
	);
	return join([
		`# ${_("Wiki")}`,
		`> ${_("Technical articles, guides, and operational documentation for industrial equipment.")}`,
		[
			`- ${_("Page")}: ${abs(`/${lang}/wiki/`, site)}`,
			`- ${_("Publisher")}: ${companyData.name[lang]}`,
		].join("\n"),
		list.join("\n"),
	]);
}

/** Markdown copy of the contact page: every way to reach the company. */
export function contactMarkdown(lang: Lang, site: URL | string): string {
	const _ = getInlineTranslations(lang);
	const letters = getManufacturers(lang)
		.filter((m) => m.pdfUrl)
		.map((m) => link(`${m.name}: ${_("Authorization Letter")}`, abs(m.pdfUrl as string, site)));
	const profiles = companyData.sameAs.map((url) => `- ${url}`);
	return join([
		`# ${_("Contact Us")}`,
		`> ${_(
			"Contact the OS-Technology Ukraine engineering team. Request a quotation, arrange a product demonstration, or get technical support."
		)}`,
		`- ${_("Page")}: ${abs(`/${lang}/contact/`, site)}`,
		`## ${_("Contact Information")}\n\n${[
			`- ${companyData.name[lang]}`,
			`- ${companyData.contactPerson[lang].name}`,
			companyBlock(lang),
		].join("\n")}`,
		`## ${_("Send Us a Message")}\n\n${abs(`/${lang}/contact/`, site)}`,
		letters.length ? `## ${_("Authorized Documentation")}\n\n${letters.join("\n")}` : "",
		profiles.length ? `## ${_("Company")}\n\n${profiles.join("\n")}` : "",
	]);
}

function legalMarkdown(
	title: string,
	path: string,
	doc: LegalSource,
	lang: Lang,
	site: URL | string
): string {
	const _ = getInlineTranslations(lang);
	return join([
		`# ${title}`,
		[
			`- ${_("Page")}: ${abs(path, site)}`,
			`- ${_("Effective date")}: ${doc.effectiveDate}`,
			`- ${_("Publisher")}: ${companyData.name[lang]}`,
		].join("\n"),
		...doc.sections.map(
			(s, i) =>
				`## ${i + 1}. ${s.title}${s.markdown ? `\n\n${absolutizeLinks(s.markdown, site)}` : ""}`
		),
	]);
}

/** Markdown copy of the privacy policy, the same text as the page. */
export function privacyMarkdown(lang: Lang, site: URL | string): string {
	const _ = getInlineTranslations(lang);
	return legalMarkdown(
		_("Privacy Policy"),
		`/${lang}/privacy/`,
		getPrivacyPolicySource(lang),
		lang,
		site
	);
}

/** Markdown copy of the terms of use, the same text as the page. */
export function termsMarkdown(lang: Lang, site: URL | string): string {
	const _ = getInlineTranslations(lang);
	return legalMarkdown(_("Terms of Use"), `/${lang}/terms/`, getTermsOfUseSource(lang), lang, site);
}

/**
 * /llms-full.txt: the full text of every Ukrainian page, then the English ones. Pages that are
 * only lists of links (home, categories, wiki index) are left out; /llms.txt already is that list.
 */
export function buildLlmsFullTxt(content: LlmsContent): string {
	const { site, equipment, wiki } = content;
	const docs: string[] = [...header("ua")];
	for (const lang of LANGS) {
		docs.push(aboutMarkdown(lang, site).trim());
		for (const { products } of productsByCategory(lang, equipment)) {
			for (const p of products) docs.push(productMarkdown(p, equipment, site).trim());
		}
		for (const i of getIndustriesForLocale(lang)) {
			docs.push(industryMarkdown(i, lang, equipment, site).trim());
		}
		for (const a of articles(lang, wiki)) docs.push(wikiMarkdown(a, site).trim());
		docs.push(contactMarkdown(lang, site).trim());
		docs.push(privacyMarkdown(lang, site).trim());
		docs.push(termsMarkdown(lang, site).trim());
	}
	return `${docs.join("\n\n---\n\n")}\n`;
}

export const textResponse = (body: string, type = "text/plain") =>
	new Response(body, { headers: { "Content-Type": `${type}; charset=utf-8` } });
