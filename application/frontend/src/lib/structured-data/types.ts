export type SiteOrigin = string | URL;

export type JsonValue =
	| string
	| number
	| boolean
	| null
	| undefined
	| { [key: string]: JsonValue }
	| JsonValue[];

export interface SchemaNode {
	"@type": string | string[];
	"@id"?: string;
	[key: string]: JsonValue;
}

export interface BreadcrumbItem {
	name: string;
	url: string;
}

export interface SchemaGraph {
	"@context": "https://schema.org";
	"@graph": SchemaNode[];
}
