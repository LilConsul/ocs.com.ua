import { marked } from "marked";
import companyData from "@/data/company.json";
import privacyData from "@/data/privacy-policy.json";
import termsData from "@/data/terms-of-use.json";
import type { Lang } from "@/i18n";

type Localized = { en: string; ua: string };

export interface LegalSection {
	number: number;
	id: string;
	title: string;
	html: string;
}

export interface LegalDocument {
	effectiveDate: string;
	sections: LegalSection[];
}

interface RawSection {
	title: Localized;
	body?: Localized;
}

interface RawDocument {
	effectiveDate: string;
	sections: RawSection[];
}

export interface TokenValues {
	email: string;
	address: string;
	privacyUrl: string;
	termsUrl: string;
}

/**
 * Fills the {email}, {address}, {privacyUrl} and {termsUrl} tokens the CMS text can use. The rich
 * text editor may percent-encode the braces of a link address, so that form is accepted too.
 */
export function fillTokens(text: string, values: TokenValues): string {
	return text
		.replaceAll("{email}", `[${values.email}](mailto:${values.email})`)
		.replaceAll("{address}", values.address)
		.replaceAll(/\{privacyUrl\}|%7BprivacyUrl%7D/gi, values.privacyUrl)
		.replaceAll(/\{termsUrl\}|%7BtermsUrl%7D/gi, values.termsUrl);
}

export interface LegalSource {
	effectiveDate: string;
	sections: { title: string; markdown: string }[];
}

/** The document as Markdown with the tokens filled in (for the page and for its Markdown copy). */
function buildSource(data: RawDocument, lang: Lang): LegalSource {
	const a = companyData.address[lang] ?? companyData.address.en;
	const values: TokenValues = {
		email: companyData.email,
		address: [a.street, "office" in a ? a.office : "", a.city, a.postalCode, a.country]
			.filter(Boolean)
			.join(", "),
		privacyUrl: `/${lang}/privacy/`,
		termsUrl: `/${lang}/terms/`,
	};
	const pick = (value: Localized | undefined) => value?.[lang] || value?.en || "";
	const fill = (text: string) => (text ? fillTokens(text, values) : "");

	return {
		effectiveDate: data.effectiveDate,
		sections: data.sections.map((raw) => ({
			title: pick(raw.title),
			markdown: fill(pick(raw.body)),
		})),
	};
}

function buildDocument(data: RawDocument, lang: Lang): LegalDocument {
	const source = buildSource(data, lang);
	const sections = source.sections.map((section, index) => ({
		number: index + 1,
		id: `section-${index + 1}`,
		title: section.title,
		html: section.markdown ? marked.parse(section.markdown, { async: false }) : "",
	}));
	return { effectiveDate: source.effectiveDate, sections };
}

export function getPrivacyPolicy(lang: Lang): LegalDocument {
	return buildDocument(privacyData as RawDocument, lang);
}

export function getTermsOfUse(lang: Lang): LegalDocument {
	return buildDocument(termsData as RawDocument, lang);
}

export function getPrivacyPolicySource(lang: Lang): LegalSource {
	return buildSource(privacyData as RawDocument, lang);
}

export function getTermsOfUseSource(lang: Lang): LegalSource {
	return buildSource(termsData as RawDocument, lang);
}
