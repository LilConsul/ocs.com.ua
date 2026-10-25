import type { APIRoute } from "astro";

// Built per environment so the Sitemap line always matches the configured `site`
export const GET: APIRoute = ({ site }) => {
	const sitemap = new URL("sitemap-index.xml", site);
	return new Response(`User-agent: *\nAllow: /\nDisallow: /admin/\n\nSitemap: ${sitemap.href}\n`, {
		headers: { "Content-Type": "text/plain; charset=utf-8" },
	});
};
