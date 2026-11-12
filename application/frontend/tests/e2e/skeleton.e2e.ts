import { type Browser, expect, type Locator, type Page, test } from "@playwright/test";

// Third-party analytics is irrelevant here and needs the network
test.beforeEach(async ({ page }) => {
	await page.route(/\/\/a\.plerdy\.com\//, (route) => route.abort());
});

const CATEGORY = "/ua/catalogue/equipment/checkweigher";
/** Image wrapper of the first product card on a category page */
const firstCardWrapper = (page: Page) => page.locator("[data-product-item] > a").first();

/**
 * Holds processed images back for `ms` (those `only` accepts, or all), so the skeleton stays up
 * long enough to check. Routing also turns off the HTTP cache, so the images are fetched again.
 */
const delayImages = (page: Page, ms: number, only: (url: string) => boolean = () => true) =>
	page.route("**/_astro/*.webp", async (route) => {
		if (only(route.request().url())) await new Promise((resolve) => setTimeout(resolve, ms));
		await route.continue();
	});

const animationOf = (el: Locator) => el.evaluate((node) => getComputedStyle(node).animationName);
const opacityOf = (el: Locator) => el.evaluate((node) => Number(getComputedStyle(node).opacity));

/** Opacity of every skeleton image on the page */
const skeletonImageOpacities = (page: Page) =>
	page
		.locator(".skeleton img")
		.evaluateAll((els) => els.map((el) => Number(getComputedStyle(el).opacity)));

/**
 * The URLs of the first card's picture (its src and every srcset file), read in a separate context
 * with scripts off, so nothing is cached for the page under test. Holding back only these keeps
 * the page's other pictures loading normally: delaying every image can tie up the browser's
 * connections (seen in Firefox).
 */
async function firstCardImageUrls(browser: Browser): Promise<string[]> {
	const probe = await browser.newContext({ javaScriptEnabled: false });
	const probePage = await probe.newPage();
	await probePage.route("**/*.webp", (route) => route.abort());
	await probePage.goto(CATEGORY, { waitUntil: "domcontentloaded" });
	const urls = await firstCardWrapper(probePage)
		.locator("img")
		.evaluate((img) => {
			const image = img as HTMLImageElement;
			const fromSet = image.srcset.split(",").map((part) => part.trim().split(/\s+/)[0]);
			const src = image.getAttribute("src") ?? "";
			return [src, ...fromSet].map((url) => new URL(url, location.href).pathname);
		});
	await probe.close();
	return urls;
}

test.describe("image skeletons", () => {
	test("pulse while the picture loads, then fade the picture in", async ({ page, browser }) => {
		const urls = await firstCardImageUrls(browser);
		await delayImages(page, 1500, (url) => urls.includes(new URL(url).pathname));
		await page.goto(CATEGORY, { waitUntil: "domcontentloaded" });
		await expect(page.locator("html")).toHaveClass(/skeleton-on/);

		const wrapper = firstCardWrapper(page);
		const img = wrapper.locator("img");
		await expect(wrapper).toHaveClass(/\bskeleton\b/);
		await expect(wrapper).not.toHaveAttribute("data-loaded", /.*/);
		expect(await animationOf(wrapper)).not.toBe("none");
		expect(await opacityOf(img)).toBe(0);

		await expect(wrapper).toHaveAttribute("data-loaded", "", { timeout: 10_000 });
		await expect.poll(() => opacityOf(img)).toBe(1);
		expect(await animationOf(wrapper)).toBe("none");
	});

	test("a cached picture shows no pulse", async ({ page }) => {
		await page.goto(CATEGORY, { waitUntil: "load" });
		await expect(firstCardWrapper(page)).toHaveAttribute("data-loaded", "");

		// Second visit: the picture comes from the cache, so it is marked loaded right away
		await page.goto(CATEGORY, { waitUntil: "domcontentloaded" });
		const wrapper = firstCardWrapper(page);
		await expect(wrapper).toHaveAttribute("data-loaded", "", { timeout: 2_000 });
		expect(await animationOf(wrapper)).toBe("none");
		await expect.poll(() => opacityOf(wrapper.locator("img"))).toBe(1);
	});

	test("the skeleton stays up when the page scripts arrive late", async ({ page, browser }) => {
		// Scripts held back well past the old 3 s failsafe, and the picture later still: the
		// skeleton must be there the whole time, and end when the picture loads
		const urls = await firstCardImageUrls(browser);
		await page.route("**/_astro/*.js", async (route) => {
			await new Promise((resolve) => setTimeout(resolve, 5000));
			await route.continue();
		});
		await delayImages(page, 7000, (url) => urls.includes(new URL(url).pathname));
		// Deferred scripts hold up domcontentloaded, so count from the moment the page starts
		await page.goto(CATEGORY, { waitUntil: "commit" });

		const wrapper = firstCardWrapper(page);
		const img = wrapper.locator("img");
		await page.waitForTimeout(4000);
		await expect(page.locator("html")).toHaveClass(/skeleton-on/);
		await expect(wrapper).not.toHaveAttribute("data-loaded", /.*/);
		expect(await opacityOf(img)).toBe(0);
		const background = await wrapper.evaluate((el) => getComputedStyle(el).backgroundColor);
		expect(background).not.toBe("rgba(0, 0, 0, 0)");

		await expect(wrapper).toHaveAttribute("data-loaded", "", { timeout: 15_000 });
		await expect.poll(() => opacityOf(img)).toBe(1);
	});

	test("reduced motion: the gray block stays but does not pulse, the picture still shows", async ({
		page,
		browser,
	}) => {
		await page.emulateMedia({ reducedMotion: "reduce" });
		const urls = await firstCardImageUrls(browser);
		await delayImages(page, 1500, (url) => urls.includes(new URL(url).pathname));
		await page.goto(CATEGORY, { waitUntil: "domcontentloaded" });

		const wrapper = firstCardWrapper(page);
		const img = wrapper.locator("img");
		// The placeholder shows while loading, without the pulse
		await expect(page.locator("html")).toHaveClass(/skeleton-on/);
		await expect(wrapper).not.toHaveAttribute("data-loaded", /.*/);
		expect(await animationOf(wrapper)).toBe("none");
		const background = await wrapper.evaluate((el) => getComputedStyle(el).backgroundColor);
		expect(background).not.toBe("rgba(0, 0, 0, 0)");
		expect(await opacityOf(img)).toBe(0);

		// And the picture shows once it has loaded
		await expect(wrapper).toHaveAttribute("data-loaded", "", { timeout: 10_000 });
		await expect.poll(() => opacityOf(img)).toBe(1);
	});

	/**
	 * Scrolls every skeleton into view and checks that none is left hidden: each one whose
	 * picture has loaded gets `data-loaded` and its picture reaches full opacity.
	 */
	async function expectNothingStuck(page: Page, path: string) {
		await page.goto(path, { waitUntil: "load" });
		const wrappers = page.locator(".skeleton");
		const count = await wrappers.count();
		expect(count).toBeGreaterThan(0);
		// Scroll down the page in steps so every lazy picture below the fold starts loading. The
		// marquee logos keep moving, so Playwright's own scroll-into-view (which waits for a stable
		// element) cannot be used.
		const height = await page.evaluate(() => document.documentElement.scrollHeight);
		for (let y = 0; y < height; y += 600) {
			await page.evaluate((top) => window.scrollTo(0, top), y);
			await page.waitForTimeout(100);
		}
		// Every picture that finished (or failed) loading must be marked and visible
		await expect
			.poll(
				() =>
					page.locator(".skeleton").evaluateAll(
						(els) =>
							els
								.map((el) => ({
									el,
									img: el.querySelector("img:not([hidden])") as HTMLImageElement,
								}))
								.filter(({ img }) => img?.complete)
								.filter(
									({ el, img }) =>
										!el.hasAttribute("data-loaded") || Number(getComputedStyle(img).opacity) !== 1
								).length
					),
				{ timeout: 10_000 }
			)
			.toBe(0);
		const loaded = await page.locator(".skeleton[data-loaded]").count();
		expect(loaded).toBeGreaterThan(0);
	}

	for (const lang of ["ua", "en"]) {
		test(`home (${lang}): no picture stays hidden after it loads`, async ({ page }) => {
			await page.setViewportSize({ width: 1440, height: 1000 });
			await expectNothingStuck(page, `/${lang}`);
		});
	}

	test("product page: no picture stays hidden after it loads", async ({ page }) => {
		await page.goto(CATEGORY);
		const href = await page.locator("[data-product-item] > a").first().getAttribute("href");
		if (!href) throw new Error("no product link");
		await expectNothingStuck(page, href);
	});
});

test.describe("no JavaScript", () => {
	test.use({ javaScriptEnabled: false });

	test("pictures are visible with no skeleton", async ({ page }) => {
		await page.goto(CATEGORY);
		const opacities = await skeletonImageOpacities(page);
		expect(opacities.length).toBeGreaterThan(0);
		expect(opacities.every((o) => o === 1)).toBe(true);
		expect(await animationOf(firstCardWrapper(page))).toBe("none");
	});
});
