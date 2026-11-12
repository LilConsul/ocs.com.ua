import { expect, type Page, test } from "@playwright/test";

// Third-party analytics is irrelevant here and needs the network
test.beforeEach(async ({ page }) => {
	await page.route(/\/\/a\.plerdy\.com\//, (route) => route.abort());
});

const BAND = "#featured-equipment";
/** Opens the page and waits until the tabs script has turned the panels into tabs */
async function openHome(page: Page, path: string) {
	await page.goto(path);
	await expect(page.locator(BAND)).toHaveAttribute("data-tabs-ready", "");
}

/** Clicks a tab once the tab bar has finished its scroll reveal, so it is not moving */
async function clickTab(page: Page, index: number) {
	const tablist = page.locator(`${BAND} [role="tablist"]`);
	await tablist.scrollIntoViewIfNeeded();
	// With reduced motion there is no reveal, so there is nothing to wait for
	const reveals = await page.locator("html").evaluate((el) => el.classList.contains("motion-on"));
	if (reveals) {
		await expect(tablist).toHaveAttribute("data-revealed", "");
		await expect.poll(() => tablist.evaluate((el) => Number(getComputedStyle(el).opacity))).toBe(1);
		await expect.poll(() => tablist.evaluate((el) => (el as HTMLElement).style.transform)).toBe("");
	}
	await page.locator(`${BAND} [role="tab"]`).nth(index).click();
}

const visiblePanel = (page: Page) => page.locator(`${BAND} [role="tabpanel"]:not([hidden])`);

for (const lang of ["ua", "en"]) {
	test.describe(`featured equipment (${lang})`, () => {
		test("tabs switch the visible panel on click", async ({ page }) => {
			await openHome(page, `/${lang}`);
			const tabs = page.locator(`${BAND} [role="tab"]`);
			await expect(tabs.first()).toBeVisible();
			expect(await tabs.count()).toBeGreaterThan(1);

			await expect(tabs.nth(0)).toHaveAttribute("aria-selected", "true");
			await expect(visiblePanel(page)).toHaveCount(1);
			const firstId = await visiblePanel(page).getAttribute("id");

			await clickTab(page, 1);
			await expect(tabs.nth(1)).toHaveAttribute("aria-selected", "true");
			await expect(tabs.nth(0)).toHaveAttribute("aria-selected", "false");
			await expect(visiblePanel(page)).toHaveCount(1);
			expect(await visiblePanel(page).getAttribute("id")).not.toBe(firstId);
		});

		test("tabs switch with the arrow keys", async ({ page }) => {
			await openHome(page, `/${lang}`);
			const tabs = page.locator(`${BAND} [role="tab"]`);
			await tabs.nth(0).focus();
			await page.keyboard.press("ArrowRight");
			await expect(tabs.nth(1)).toHaveAttribute("aria-selected", "true");
			await expect(tabs.nth(1)).toBeFocused();
			await page.keyboard.press("ArrowLeft");
			await expect(tabs.nth(0)).toHaveAttribute("aria-selected", "true");
		});

		test("the spotlight and the list have equal height on desktop", async ({ page }) => {
			await page.setViewportSize({ width: 1440, height: 1000 });
			await openHome(page, `/${lang}`);
			const panel = visiblePanel(page);
			const spotlight = (await panel.locator("article").boundingBox())?.height ?? 0;
			const list = (await panel.locator("article + div").boundingBox())?.height ?? 0;
			expect(spotlight).toBeGreaterThan(0);
			expect(Math.abs(spotlight - list)).toBeLessThanOrEqual(1);
		});

		test("a category with few products does not stretch its cards", async ({ page }) => {
			await page.setViewportSize({ width: 1440, height: 1000 });
			await openHome(page, `/${lang}`);
			const tabs = page.locator(`${BAND} [role="tab"]`);
			// Catchweighers has only two products: a spotlight and one row
			await clickTab(page, 1);
			await expect(tabs.nth(1)).toHaveAttribute("aria-selected", "true");
			const rows = visiblePanel(page).locator("article + div > a.card-hover");
			expect(await rows.count()).toBeLessThan(3);
			for (let i = 0; i < (await rows.count()); i++) {
				const height = (await rows.nth(i).boundingBox())?.height ?? 0;
				expect(height).toBeGreaterThan(0);
				expect(height).toBeLessThanOrEqual(161);
			}
		});

		test("the page does not scroll sideways at phone width", async ({ page }) => {
			await page.setViewportSize({ width: 375, height: 800 });
			await page.goto(`/${lang}`);
			const overflow = await page.evaluate(
				() => document.documentElement.scrollWidth - document.documentElement.clientWidth
			);
			expect(overflow).toBeLessThanOrEqual(0);
		});
	});
}

test.describe("featured equipment without JavaScript", () => {
	test.use({ javaScriptEnabled: false });

	test("every category panel is visible and the tab bar is hidden", async ({ page }) => {
		await page.goto("/ua");
		const panels = page.locator(`${BAND} [role="tabpanel"]`);
		const count = await panels.count();
		expect(count).toBeGreaterThan(1);
		for (let i = 0; i < count; i++) await expect(panels.nth(i)).toBeVisible();
		await expect(page.locator(`${BAND} [role="tablist"]`)).toBeHidden();
		await expect(page.locator(`${BAND} .featured-panel-title`).first()).toBeVisible();
	});
});

test.describe("featured equipment with reduced motion", () => {
	test.use({ reducedMotion: "reduce" });

	test("the active panel is visible immediately after switching", async ({ page }) => {
		await openHome(page, "/ua");
		const tabs = page.locator(`${BAND} [role="tab"]`);
		await clickTab(page, 1);
		await expect(tabs.nth(1)).toHaveAttribute("aria-selected", "true");
		const opacity = await visiblePanel(page).evaluate((el) => Number(getComputedStyle(el).opacity));
		expect(opacity).toBe(1);
	});
});
