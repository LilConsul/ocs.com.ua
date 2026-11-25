import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { blockPlerdy, PAGES, VIEWPORTS } from "./pages";

test.skip(({ browserName }) => browserName !== "chromium", "axe result is browser independent");

for (const [viewportName, viewport] of Object.entries(VIEWPORTS)) {
	for (const { name, path } of PAGES) {
		test(`axe: ${name} (${viewportName})`, async ({ page }) => {
			await blockPlerdy(page);
			await page.emulateMedia({ reducedMotion: "reduce" }); // reveals are visible at once
			await page.setViewportSize(viewport);
			await page.goto(path, { waitUntil: "load" });
			const { violations } = await new AxeBuilder({ page })
				.options({
					runOnly: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"],
					rules: {
						// Lighthouse does not run `region`, so it is not part of the score
						region: { enabled: false },
						// Experimental, so no tag above includes it, but Lighthouse runs it
						"label-content-name-mismatch": { enabled: true },
					},
				})
				.exclude("iframe")
				.analyze();
			expect(violations.flatMap((v) => v.nodes.map((n) => `${v.id}: ${n.target}`))).toEqual([]);
		});
	}
}
