import { expect, type Locator, test } from "@playwright/test";

// Third-party analytics is irrelevant here and needs the network
test.beforeEach(async ({ page }) => {
	await page.route(/\/\/a\.plerdy\.com\//, (route) => route.abort());
});

/** A product with several photos */
const PRODUCT = "/ua/catalogue/equipment/checkweigher/hc-a/";

/** The picture the browser actually shows, once it has picked one from the srcset */
const shownUrl = async (img: Locator) => {
	await expect.poll(() => img.evaluate((el) => (el as HTMLImageElement).currentSrc)).not.toBe("");
	return img.evaluate((el) => new URL((el as HTMLImageElement).currentSrc).pathname);
};

/** Waits until the shown picture differs from `before`, and returns it */
const nextShownUrl = async (img: Locator, before: string) => {
	await expect
		.poll(() => img.evaluate((el) => new URL((el as HTMLImageElement).currentSrc).pathname))
		.not.toBe(before);
	return shownUrl(img);
};

test.describe("product gallery", () => {
	test.beforeEach(async ({ page }) => {
		await page.setViewportSize({ width: 1440, height: 1000 });
		await page.goto(PRODUCT, { waitUntil: "load" });
		await expect(page.locator(".gallery-thumb")).not.toHaveCount(0);
		await expect(page.locator(".gallery-thumb").nth(1)).toBeAttached();
	});

	test("the main picture changes with the thumbnails and the arrows", async ({ page }) => {
		const main = page.locator("#gallery-main-image");
		const badge = page.locator("#gallery-badge-text");
		const first = await shownUrl(main);

		await page.locator(".gallery-thumb[data-index='1']").click();
		await expect(badge).toHaveText(/^02 \//);
		const second = await nextShownUrl(main, first);
		expect(second).not.toBe(first);
		await expect(main).toHaveJSProperty("complete", true);
		expect(await main.evaluate((el) => Number(getComputedStyle(el).opacity))).toBe(1);

		// The arrows show on hover
		await page.locator("[data-main-card]").hover();
		await page.locator("#gallery-card-prev").click();
		await expect(badge).toHaveText(/^01 \//);
		expect(await nextShownUrl(main, second)).toBe(first);

		await page.locator("#gallery-card-next").click();
		await expect(badge).toHaveText(/^02 \//);
		expect(await nextShownUrl(main, first)).toBe(second);
	});

	test("the lightbox picture changes when stepping inside it", async ({ page }) => {
		await page.locator("#gallery-expand-btn").click();
		const lightbox = page.locator("#gallery-lightbox");
		await expect(lightbox).toBeVisible();
		const img = page.locator("#lightbox-image");
		const counter = page.locator("#lightbox-counter");
		const first = await shownUrl(img);

		await page.locator("#lightbox-next-btn").click();
		await expect(counter).toHaveText(/^02 \//);
		const second = await nextShownUrl(img, first);

		await page.keyboard.press("ArrowLeft");
		await expect(counter).toHaveText(/^01 \//);
		expect(await nextShownUrl(img, second)).toBe(first);

		await page.locator(".lightbox-thumb[data-index='1']").click();
		await expect(counter).toHaveText(/^02 \//);
		expect(await nextShownUrl(img, first)).toBe(second);
	});
});
