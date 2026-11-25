import { expect, test } from "@playwright/test";
import { blockPlerdy } from "./pages";

// In every browser, because they look up different characters: Firefox asks the fonts for a hyphen
// on each page and WebKit for line feeds in preformatted text (see scripts/subset-fonts.py).
for (const lang of ["ua", "en"]) {
	test(`the home page needs only the core font files: ${lang}`, async ({ page }) => {
		const fonts: string[] = [];
		page.on("request", (request) => {
			if (request.url().includes(".woff2")) fonts.push(request.url().split("/").pop() ?? "");
		});
		await blockPlerdy(page);
		await page.goto(`/${lang}/`, { waitUntil: "load" });
		// Every family in use has loaded, so a rest file would have been asked for too
		await expect
			.poll(() => fonts.filter((file) => /^jetbrains-mono-.*-core\./.test(file)).length, {
				timeout: 15_000,
			})
			.toBeGreaterThan(0);
		await page.evaluate(() => document.fonts.ready.then(() => undefined));
		expect(fonts.filter((file) => /^inter-latin-core\./.test(file)).length).toBeGreaterThan(0);
		expect(fonts.filter((file) => !file.includes("-core."))).toEqual([]);
	});
}
