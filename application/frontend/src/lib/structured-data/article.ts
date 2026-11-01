import { getIsoLang, type Lang } from "@/i18n/utils";
import { absUrl, articleId, organizationId, webpageId } from "./graph";
import type { SchemaNode, SiteOrigin } from "./types";

export interface ArticleSchemaInput {
	headline: string;
	description: string;
	url: string;
	lang: Lang;
	site: SiteOrigin;
	image?: string | null;
	readMinutes?: number;
	wordCount?: number;
}

export function articleSchema({
	headline,
	description,
	url,
	lang,
	site,
	image,
	readMinutes,
	wordCount,
}: ArticleSchemaInput): SchemaNode {
	return {
		"@type": "TechArticle",
		"@id": articleId(url),
		headline,
		description,
		inLanguage: getIsoLang(lang),
		image: image ? [absUrl(image, site)] : undefined,
		timeRequired: readMinutes ? `PT${readMinutes}M` : undefined,
		wordCount,
		author: {
			"@id": organizationId(site),
		},
		publisher: {
			"@id": organizationId(site),
		},
		mainEntityOfPage: {
			"@id": webpageId(url),
		},
	};
}
