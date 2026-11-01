import { breadcrumbId } from "./graph";
import type { BreadcrumbItem, SchemaNode } from "./types";

export function breadcrumbSchema(items: BreadcrumbItem[], pageUrl: string): SchemaNode {
	return {
		"@type": "BreadcrumbList",
		"@id": breadcrumbId(pageUrl),
		itemListElement: items.map((item, index) => ({
			"@type": "ListItem",
			position: index + 1,
			name: item.name,
			item: item.url,
		})),
	};
}
