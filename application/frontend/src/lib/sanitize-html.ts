import sanitize from "sanitize-html";

/**
 * Standard sanitize-html wrapper that permits standard markdown formatting
 * (headings, paragraphs, lists, tables, links, images, code blocks, blockquotes)
 * while strictly stripping all executable scripts, iframes, inline event handlers,
 * and dangerous protocols.
 */
export function sanitizeHtml(dirtyHtml: string): string {
	if (!dirtyHtml) return "";

	return sanitize(dirtyHtml, {
		allowedTags: sanitize.defaults.allowedTags.concat([
			"img",
			"h1",
			"h2",
			"h3",
			"h4",
			"h5",
			"h6",
			"details",
			"summary",
			"table",
			"thead",
			"tbody",
			"tfoot",
			"tr",
			"th",
			"td",
		]),
		allowedAttributes: {
			...sanitize.defaults.allowedAttributes,
			img: ["src", "alt", "title", "width", "height", "loading"],
			a: ["href", "name", "target", "rel", "title"],
			th: ["align", "valign", "colspan", "rowspan"],
			td: ["align", "valign", "colspan", "rowspan"],
		},
		allowedSchemes: ["http", "https", "mailto", "tel"],
		disallowedTagsMode: "discard",
	});
}
