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
			// Ranges are normalised by the browser. Each preloaded file must back a face the page really loaded (family and subset)
			const loaded = await page.evaluate(() =>
				[...document.fonts]
					.filter((face) => face.status === "loaded")
					.map((face) => ({ family: face.family.replace(/"/g, ""), range: face.unicodeRange }))
			);
			const marker = subset === "cyrillic" ? "U+400-45F" : "U+0-FF,";
			for (const href of preloaded) {
				const file = href.split("/").pop() ?? "";
				const family = file.startsWith("ibm-plex-sans-")
					? "IBM Plex Sans Variable"
					: file.startsWith("inter-")
						? "Inter Variable"
						: file;
				expect(
					loaded.some((face) => face.family === family && face.range.includes(marker)),
					`${href} backs a loaded ${family} face`
				).toBe(true);
			}
			// Chrome warns about an unused preload about 3 s after load
			await page.waitForTimeout(3500);
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
