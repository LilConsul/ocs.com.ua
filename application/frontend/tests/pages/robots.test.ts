import { describe, expect, it } from "bun:test";
import { GET } from "@/pages/robots.txt";

const render = async (site: string) => {
	const response = await GET({ site: new URL(site) } as Parameters<typeof GET>[0]);
	const body = await response.text();
	return { response, body, lines: body.split("\n") };
};

describe("robots.txt", () => {
	it("is served as UTF-8 plain text", async () => {
		const { response } = await render("https://ocs.com.ua");
		expect(response.headers.get("Content-Type")).toBe("text/plain; charset=utf-8");
	});

	it("applies to all crawlers and keeps the CMS and API out", async () => {
		const { lines } = await render("https://ocs.com.ua");
		expect(lines[0]).toBe("User-agent: *");
		expect(lines).toContain("Disallow: /admin/");
		expect(lines).toContain("Disallow: /api/");
	});

	it("does not block the public site", async () => {
		const { lines } = await render("https://ocs.com.ua");
		expect(lines).not.toContain("Disallow: /");
		expect(lines).not.toContain("Disallow:");
	});

	it("points at the absolute sitemap index of the configured site", async () => {
		const prod = await render("https://ocs.com.ua");
		expect(prod.lines).toContain("Sitemap: https://ocs.com.ua/sitemap-index.xml");
		const dev = await render("https://dev.ocs.com.ua");
		expect(dev.lines).toContain("Sitemap: https://dev.ocs.com.ua/sitemap-index.xml");
	});

	it("ends with a single trailing newline", async () => {
		const { body } = await render("https://ocs.com.ua");
		expect(body.endsWith("\n")).toBe(true);
		expect(body.endsWith("\n\n")).toBe(false);
	});
});
