import companyData from "@/data/company.json";
import { getIsoLang, type Lang } from "@/i18n";
import { absUrl, organizationId, websiteId } from "./graph";
import type { SchemaNode, SiteOrigin } from "./types";

export function websiteSchema(lang: Lang, site: SiteOrigin): SchemaNode {
	const companyName = companyData.name[lang as "en" | "ua"] ?? companyData.name.en;
	const baseUrl = absUrl(`/${lang}/`, site);
	return {
		"@type": "WebSite",
		"@id": websiteId(lang, site),
		name: companyName,
		url: baseUrl,
		inLanguage: getIsoLang(lang),
		publisher: {
			"@id": organizationId(site),
		},
		potentialAction: {
			"@type": "SearchAction",
			target: {
				"@type": "EntryPoint",
				urlTemplate: `${baseUrl}wiki/?q={search_term_string}`,
			},
			"query-input": "required name=search_term_string",
		},
	};
}
