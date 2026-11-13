import { LLMS_INDEXING } from "astro:env/server";
import type { APIRoute } from "astro";

// AI search and training crawlers, named so they are explicitly welcome. A crawler obeys only the
// most specific group that matches it, so each group repeats the private paths.
export const AI_CRAWLERS = [
	"GPTBot",
	"OAI-SearchBot",
	"ChatGPT-User",
	"ClaudeBot",
	"Claude-SearchBot",
	"Claude-User",
	"PerplexityBot",
	"Perplexity-User",
	"Google-Extended",
	"Applebot-Extended",
];

// Decap CMS and the on-demand endpoints (OAuth, contact form) are not content
const PRIVATE = ["Disallow: /admin/", "Disallow: /api/"];

/**
 * robots.txt for the given site. With indexing off (LLMS_INDEXING=false, the dev site) every
 * crawler is kept out, so the dev copy never competes with ocs.com.ua in search or AI answers.
 */
export function robotsTxt(site: URL, indexing: boolean): string {
	if (!indexing) return ["User-agent: *", "Disallow: /", ""].join("\n");
	const sitemap = new URL("sitemap-index.xml", site);
	return [
		"User-agent: *",
		...PRIVATE,
		"",
		...AI_CRAWLERS.map((bot) => `User-agent: ${bot}`),
		"Allow: /",
		...PRIVATE,
		"",
		`Sitemap: ${sitemap.href}`,
		"",
	].join("\n");
}

// Built per environment so the Sitemap line always matches the configured `site`
export const GET: APIRoute = ({ site }) =>
	new Response(robotsTxt(site ?? new URL("https://ocs.com.ua"), LLMS_INDEXING), {
		headers: { "Content-Type": "text/plain; charset=utf-8" },
	});
