import type { Lang } from "@/i18n/utils";
import { breadcrumbSchema } from "./breadcrumb";
import { cleanSchema } from "./clean";
import { organizationSchema } from "./organization";
import { productSchema } from "./product";
import type { BreadcrumbItem, SchemaGraph, SchemaNode, SiteOrigin } from "./types";
import { webPageSchema } from "./webpage";
import { websiteSchema } from "./website";

export * from "./types";
export * from "./graph";
export * from "./clean";
export * from "./organization";
export * from "./website";
export * from "./breadcrumb";
export * from "./webpage";
export * from "./product";
export * from "./article";

export interface CreatePageGraphOptions {
	lang: Lang;
	url: string;
	site: SiteOrigin;
	title: string;
	description: string;
	pageType?: "WebPage" | "AboutPage" | "ContactPage" | "CollectionPage";
	breadcrumbs?: BreadcrumbItem[];
	mainEntities?: SchemaNode[];
	includeOrganization?: boolean;
	includeWebsite?: boolean;
}

export function createPageGraph({
	lang,
	url,
	site,
	title,
	description,
	pageType = "WebPage",
	breadcrumbs = [],
	mainEntities = [],
	includeOrganization = true,
	includeWebsite = true,
}: CreatePageGraphOptions): SchemaGraph {
	const nodes: SchemaNode[] = [];

	if (includeOrganization) {
		nodes.push(organizationSchema(lang, site));
	}

	if (includeWebsite) {
		nodes.push(websiteSchema(lang, site));
	}

	const hasBreadcrumbs = breadcrumbs.length > 0;
	if (hasBreadcrumbs) {
		nodes.push(breadcrumbSchema(breadcrumbs, url));
	}

	// Link first main entity to WebPage if present
	const primaryEntityId = mainEntities[0]?.["@id"] as string | undefined;

	nodes.push(
		webPageSchema({
			lang,
			url,
			site,
			title,
			description,
			pageType,
			mainEntityId: primaryEntityId,
			hasBreadcrumb: hasBreadcrumbs,
		})
	);

	for (const entity of mainEntities) {
		nodes.push(entity);
	}

	const cleanedNodes = nodes
		.map((node) => cleanSchema(node))
		.filter((node): node is SchemaNode => Boolean(node && typeof node === "object"));

	return {
		"@context": "https://schema.org",
		"@graph": cleanedNodes,
	};
}
