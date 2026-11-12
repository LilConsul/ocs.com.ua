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

function buildDocument(data: RawDocument, lang: Lang): LegalDocument {
	const a = companyData.address[lang] ?? companyData.address.en;
	const values: TokenValues = {
		email: companyData.email,
		address: [a.street, "office" in a ? a.office : "", a.city, a.postalCode, a.country]
			.filter(Boolean)
			.join(", "),
		privacyUrl: `/${lang}/privacy`,
		termsUrl: `/${lang}/terms`,
	};
	const pick = (value: Localized | undefined) => value?.[lang] || value?.en || "";
	const render = (text: string) =>
		text ? marked.parse(fillTokens(text, values), { async: false }) : "";

	const sections = data.sections.map((raw, index) => ({
		number: index + 1,
		id: `section-${index + 1}`,
		title: pick(raw.title),
		html: render(pick(raw.body)),
	}));

	return { effectiveDate: data.effectiveDate, sections };
}

export function getPrivacyPolicy(lang: Lang): LegalDocument {
	return buildDocument(privacyData as RawDocument, lang);
}

export function getTermsOfUse(lang: Lang): LegalDocument {
	return buildDocument(termsData as RawDocument, lang);
}
