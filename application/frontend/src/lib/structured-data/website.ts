import companyData from "@/data/company.json";
import { getIsoLang, type Lang } from "@/i18n";
import { absUrl, organizationId, websiteId } from "./graph";
import type { SchemaNode, SiteOrigin } from "./types";

export function websiteSchema(lang: Lang, site: SiteOrigin): SchemaNode {
	const companyName = companyData.name[lang as "en" | "ua"] ?? companyData.name.en;
	return {
		"@type": "WebSite",
		"@id": websiteId(lang, site),
		name: companyName,
		url: absUrl(`/${lang}/`, site),
		inLanguage: getIsoLang(lang),
		publisher: {
			"@id": organizationId(site),
		},
	};
}
