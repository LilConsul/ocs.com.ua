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
	keywords?: string;
	/** Override the default about ref (org). Use for category/industry pages. */
	about?: SchemaNode;
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
	keywords,
	about,
}: WebPageOptions): SchemaNode {
	return {
		"@type": pageType,
		"@id": webpageId(url),
		url,
		name: title,
		description,
		keywords,
		inLanguage: getIsoLang(lang),
		isPartOf: {
			"@id": websiteId(lang, site),
		},
		about: about ?? { "@id": organizationId(site) },
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
	/** Overrides WebPage.about. Describes the subject (category/industry Thing). */
	about?: SchemaNode;
	/** Comma-separated keywords for the WebPage node. */
	keywords?: string;
	/** Optional sub-groups encoded as hasPart ItemLists on the main ItemList. */
	subGroups?: Array<{ name: string; items: CollectionItem[] }>;
}

export function collectionPageSchema({
	lang,
	url,
	site,
	title,
	description,
	items,
	about,
	keywords,
	subGroups,
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
		keywords,
		about,
	});

	const itemList: SchemaNode = {
		"@type": "ItemList",
		"@id": listId,
		name: title,
		description,
		numberOfItems: items.length,
		itemListElement: items.map((item, index) => ({
			"@type": "ListItem",
			position: index + 1,
			name: item.name,
			url: item.url,
			description: item.description,
		})),
		hasPart:
			subGroups && subGroups.length > 0
				? subGroups.map((group) => ({
						"@type": "ItemList",
						name: group.name,
						numberOfItems: group.items.length,
						itemListElement: group.items.map((item, index) => ({
							"@type": "ListItem",
							position: index + 1,
							name: item.name,
							url: item.url,
							description: item.description,
						})),
					}))
				: undefined,
	};

	return { page, itemList };
}
