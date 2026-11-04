import type { APIRoute } from "astro";

// Built per environment so the Sitemap line always matches the configured `site`
export const GET: APIRoute = ({ site }) => {
	const sitemap = new URL("sitemap-index.xml", site);
	const body = [
		"User-agent: *",
		// Decap CMS and the on-demand endpoints (OAuth, contact form) are not content
		"Disallow: /admin/",
		"Disallow: /api/",
		"",
		`Sitemap: ${sitemap.href}`,
		"",
	].join("\n");
	return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
};
