import { marked } from "marked";
import { sanitizeHtml } from "./sanitize-html";

/**
 * Safely parses markdown to sanitized HTML.
 */
export async function renderMarkdown(markdown: string): Promise<string> {
	if (!markdown) return "";
	const raw = await marked.parse(markdown);
	return sanitizeHtml(raw);
}

/**
 * Synchronous markdown parser with HTML sanitization.
 */
export function renderMarkdownSync(markdown: string): string {
	if (!markdown) return "";
	const raw = marked.parse(markdown, { async: false }) as string;
	return sanitizeHtml(raw);
}
