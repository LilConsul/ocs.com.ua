import { marked } from "marked";
import companyData from "@/data/company.json";
import policyData from "@/data/privacy-policy.json";
import type { Lang } from "@/i18n";

type Localized = { en: string; ua: string };

export interface PolicyTableRow {
	purpose: string;
	data: string;
	basis: string;
}

export interface PolicySection {
	number: number;
	id: string;
	title: string;
	html: string;
	table: PolicyTableRow[];
	htmlAfter: string;
}

export interface PrivacyPolicy {
	effectiveDate: string;
	sections: PolicySection[];
}

/** Fills the {email} and {address} tokens the CMS text can use. */
export function fillTokens(text: string, email: string, address: string): string {
	return text.replaceAll("{email}", `[${email}](mailto:${email})`).replaceAll("{address}", address);
}

function renderMarkdown(text: string | undefined, email: string, address: string): string {
	if (!text) return "";
	return marked.parse(fillTokens(text, email, address), { async: false });
}

export function getPrivacyPolicy(lang: Lang): PrivacyPolicy {
	const email = companyData.email;
	const a = companyData.address[lang] ?? companyData.address.en;
	const address = [a.street, "office" in a ? a.office : "", a.city, a.postalCode, a.country]
		.filter(Boolean)
		.join(", ");
	const pick = (value: Localized | undefined) => value?.[lang] || value?.en || "";

	const sections = policyData.sections.map((section, index) => {
		const raw = section as {
			title: Localized;
			body?: Localized;
			bodyAfter?: Localized;
			table?: { purpose: Localized; data: Localized; basis: Localized }[];
		};
		return {
			number: index + 1,
			id: `section-${index + 1}`,
			title: pick(raw.title),
			html: renderMarkdown(pick(raw.body), email, address),
			table: (raw.table ?? []).map((row) => ({
				purpose: pick(row.purpose),
				data: pick(row.data),
				basis: pick(row.basis),
			})),
			htmlAfter: renderMarkdown(pick(raw.bodyAfter), email, address),
		};
	});

	return { effectiveDate: policyData.effectiveDate, sections };
}
