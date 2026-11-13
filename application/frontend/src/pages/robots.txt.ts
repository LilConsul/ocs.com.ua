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

// Built per environment so the Sitemap line always matches the configured `site`
export const GET: APIRoute = ({ site }) => {
	const sitemap = new URL("sitemap-index.xml", site);
	const body = [
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
	return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
};
