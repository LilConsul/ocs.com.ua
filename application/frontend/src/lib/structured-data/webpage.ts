import { getIsoLang, type Lang } from "@/i18n/utils";
import { breadcrumbId, itemListId, organizationId, webpageId, websiteId } from "./graph";
import type { SchemaNode, SiteOrigin } from "./types";

export interface WebPageOptions {
	lang: Lang;
	url: string;
	site: SiteOrigin;
	title: string;
	description: string;
	pageType?: "WebPage" | "AboutPage" | "ContactPage" | "CollectionPage";
	mainEntityId?: string;
	hasBreadcrumb?: boolean;
}

export function webPageSchema({
	lang,
	url,
	site,
	title,
	description,
	pageType = "WebPage",
	mainEntityId,
	hasBreadcrumb = true,
}: WebPageOptions): SchemaNode {
	return {
		"@type": pageType,
		"@id": webpageId(url),
		url,
		name: title,
		description,
		inLanguage: getIsoLang(lang),
		isPartOf: {
			"@id": websiteId(lang, site),
		},
		about: {
			"@id": organizationId(site),
		},
		breadcrumb: hasBreadcrumb ? { "@id": breadcrumbId(url) } : undefined,
		mainEntity: mainEntityId ? { "@id": mainEntityId } : undefined,
	};
}

export interface CollectionItem {
	name: string;
	url: string;
	description?: string;
}

export interface CollectionPageOptions {
	lang: Lang;
	url: string;
	site: SiteOrigin;
	title: string;
	description: string;
	items: CollectionItem[];
}

export function collectionPageSchema({
	lang,
	url,
	site,
	title,
	description,
	items,
}: CollectionPageOptions): { page: SchemaNode; itemList: SchemaNode } {
	const listId = itemListId(url);
	const page = webPageSchema({
		lang,
		url,
		site,
		title,
		description,
		pageType: "CollectionPage",
		mainEntityId: listId,
	});

	const itemList: SchemaNode = {
		"@type": "ItemList",
		"@id": listId,
		numberOfItems: items.length,
		itemListElement: items.map((item, index) => ({
			"@type": "ListItem",
			position: index + 1,
			name: item.name,
			url: item.url,
			description: item.description,
		})),
	};

	return { page, itemList };
}
