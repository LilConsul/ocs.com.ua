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
