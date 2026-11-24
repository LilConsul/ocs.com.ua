import { expect, test } from "@playwright/test";
import { blockPlerdy, PAGES, VIEWPORTS } from "./pages";

test.skip(({ browserName }) => browserName !== "chromium", "weight is browser independent");

test.describe("icons", () => {
	for (const { name, path } of PAGES) {
		test(`no icon font is requested: ${name}`, async ({ page }) => {
			const urls: string[] = [];
			page.on("request", (request) => urls.push(request.url()));
			await blockPlerdy(page);
			await page.setViewportSize(VIEWPORTS.mobile);
			await page.goto(path, { waitUntil: "load" });
			expect(urls.filter((url) => url.includes("material-symbols"))).toEqual([]);
		});
	}
});

test.describe("text fonts", () => {
	for (const lang of ["ua", "en"]) {
		test(`preloads two fonts and uses both: ${lang}`, async ({ page }) => {
			const fontRequests: string[] = [];
			const warnings: string[] = [];
			page.on("request", (request) => {
				if (request.resourceType() === "font") fontRequests.push(request.url());
			});
			page.on("console", (message) => warnings.push(message.text()));
			await blockPlerdy(page);
			await page.setViewportSize(VIEWPORTS.mobile);
			await page.goto(`/${lang}`, { waitUntil: "load" });
			await page.evaluate(() => document.fonts.ready);

			const preloaded = await page.$$eval('link[rel="preload"][as="font"]', (links) =>
				links.map((link) => (link as HTMLLinkElement).href)
			);
			expect(preloaded).toHaveLength(2);
			const subset = lang === "ua" ? "cyrillic" : "latin";
			for (const href of preloaded) {
				expect(href).toContain(`-${subset}-`);
				expect(fontRequests.filter((url) => url === href)).toHaveLength(1);
			}
			expect(warnings.filter((text) => text.includes("preloaded"))).toEqual([]);

			const css = await page.evaluate(async () => {
				const inline = [...document.querySelectorAll("style")].map((el) => el.textContent ?? "");
				const linked = await Promise.all(
					[...document.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]')].map((link) =>
						fetch(link.href).then((res) => res.text())
					)
				);
				return [...inline, ...linked].join("\n");
			});
			expect(css).not.toMatch(/data:(application\/)?font/);
		});
	}
});
