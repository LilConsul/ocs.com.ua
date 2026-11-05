import { expect, type Page, test } from "@playwright/test";

const HOME = "/ua";
const CATEGORY = "/ua/catalogue/equipment/checkweigher";

const opacityOf = (page: Page, selector: string) =>
	page
		.locator(selector)
		.first()
		.evaluate((el) => Number(getComputedStyle(el).opacity));

/** The last .reveal on the page, which is below the fold on a desktop viewport */
const lastReveal = (page: Page) => page.locator(".reveal").last();

test.describe("scroll reveals", () => {
	test("hide until scrolled into view, then play once and stay visible", async ({ page }) => {
		await page.goto(HOME);
		await expect(page.locator("html")).toHaveClass(/motion-on/);

		const target = lastReveal(page);
		await expect(target).not.toHaveAttribute("data-revealed", /.*/);
		expect(await target.evaluate((el) => Number(getComputedStyle(el).opacity))).toBe(0);

		await target.scrollIntoViewIfNeeded();
		await expect(target).toHaveAttribute("data-revealed", "");
		await expect.poll(() => target.evaluate((el) => Number(getComputedStyle(el).opacity))).toBe(1);

		// Hands control back to the stylesheet so hover transforms keep working
		await expect.poll(() => target.evaluate((el) => (el as HTMLElement).style.transform)).toBe("");

		// Scrolling away and back does not replay or re-hide it
		await page.evaluate(() => window.scrollTo(0, 0));
		await target.scrollIntoViewIfNeeded();
		expect(await target.evaluate((el) => Number(getComputedStyle(el).opacity))).toBe(1);
	});

	test("stagger: later --i items start later than earlier ones", async ({ page }) => {
		await page.goto(HOME);
		const items = page.locator('.reveal[style*="--i:"]');
		const count = await items.count();
		test.skip(count < 3, "needs a staggered group");

		await items.first().scrollIntoViewIfNeeded();
		const first = await items
			.nth(0)
			.evaluate((el) => el.getAnimations().map((a) => a.effect?.getTiming().delay ?? 0));
		const third = await items
			.nth(2)
			.evaluate((el) => el.getAnimations().map((a) => a.effect?.getTiming().delay ?? 0));
		if (first.length && third.length) expect(third[0]).toBeGreaterThan(first[0]);
	});

	test("reduced motion: nothing is hidden or animated", async ({ page }) => {
		await page.emulateMedia({ reducedMotion: "reduce" });
		await page.goto(HOME);
		await expect(page.locator("html")).not.toHaveClass(/motion-on/);
		const opacities = await page
			.locator(".reveal, .reveal-slide, .reveal-glow")
			.evaluateAll((els) => els.map((el) => Number(getComputedStyle(el).opacity)));
		expect(opacities.length).toBeGreaterThan(0);
		expect(opacities.every((o) => o === 1)).toBe(true);
	});

	test("failsafe: if the runtime never loads, content shows after 3 seconds", async ({ page }) => {
		// Record that the class was set at some point, so a slow page load cannot race the timer.
		// The init script runs before <html> exists, so spy on classList.add instead of observing.
		await page.addInitScript(() => {
			const add = DOMTokenList.prototype.add;
			DOMTokenList.prototype.add = function (...tokens: string[]) {
				if (tokens.includes("motion-on")) {
					(window as unknown as { __sawMotionOn: boolean }).__sawMotionOn = true;
				}
				return add.apply(this, tokens);
			};
		});
		await page.route("**/_astro/**/*.js", (route) => route.abort());
		await page.goto(HOME);
		await expect(page.locator("html")).not.toHaveClass(/motion-on/, { timeout: 10_000 });
		expect(
			await page.evaluate(() => (window as unknown as { __sawMotionOn?: boolean }).__sawMotionOn)
		).toBe(true);
		expect(await opacityOf(page, ".reveal")).toBe(1);
	});

	test("catalogue search: swapped-in cards are revealed too", async ({ page }) => {
		await page.goto(CATEGORY);
		const word = await page.evaluate(() => {
			const index = JSON.parse(
				document.querySelector("[data-product-index]")?.textContent ?? "[]"
			) as { title: string }[];
			return index[0]?.title.split(/\s+/)[0] ?? "";
		});
		test.skip(!word, "no product index on this page");

		await page.locator("[data-product-search-input]").fill(word);
		const card = page.locator("[data-product-item]").first();
		await card.scrollIntoViewIfNeeded();
		await expect(card).toHaveAttribute("data-revealed", "");
		await expect.poll(() => card.evaluate((el) => Number(getComputedStyle(el).opacity))).toBe(1);
	});
});

test.describe("no JavaScript", () => {
	test.use({ javaScriptEnabled: false });

	test("every reveal element is visible", async ({ page }) => {
		await page.goto(HOME);
		const opacities = await page
			.locator(".reveal, .reveal-slide, .reveal-glow")
			.evaluateAll((els) => els.map((el) => Number(getComputedStyle(el).opacity)));
		expect(opacities.length).toBeGreaterThan(0);
		expect(opacities.every((o) => o === 1)).toBe(true);
	});
});

test.describe("button press state", () => {
	const primary = (page: Page) => page.locator("main a.bg-primary").first();

	test("primary call-to-action scales down while pressed", async ({ page }) => {
		await page.goto(HOME);
		const button = primary(page);
		await button.scrollIntoViewIfNeeded();
		const box = await button.boundingBox();
		if (!box) throw new Error("button has no box");

		await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
		await page.mouse.down();
		await expect
			.poll(() => button.evaluate((el) => parseFloat(getComputedStyle(el).scale)))
			.toBeCloseTo(0.97, 2);
		await page.mouse.up();
	});

	test("reduced motion: no press scale", async ({ page }) => {
		await page.emulateMedia({ reducedMotion: "reduce" });
		await page.goto(HOME);
		const button = primary(page);
		const box = await button.boundingBox();
		if (!box) throw new Error("button has no box");

		await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
		await page.mouse.down();
		const scale = await button.evaluate((el) => getComputedStyle(el).scale);
		expect(["none", "1"]).toContain(scale);
		await page.mouse.up();
	});
});

test.describe("header scroll state", () => {
	test("gains a shadow after scrolling and loses it back at the top", async ({ page }) => {
		await page.goto(HOME);
		const header = page.locator("#main-header");
		// Tailwind's shadow-none computes to transparent shadows rather than the keyword `none`,
		// so measure the largest alpha across all shadow layers instead
		const shadowAlpha = () =>
			header.evaluate((el) => {
				const colors = getComputedStyle(el).boxShadow.match(/rgba?\([^)]*\)/g) ?? [];
				return Math.max(
					0,
					...colors.map((c) => {
						const parts = c.replace(/rgba?\(|\)/g, "").split(",");
						return parts.length === 4 ? Number(parts[3]) : 1;
					})
				);
			});

		expect(await shadowAlpha()).toBe(0);

		await page.evaluate(() => window.scrollTo(0, 400));
		await expect(header).toHaveAttribute("data-scrolled", "true");
		await expect.poll(shadowAlpha).toBeGreaterThan(0);

		await page.evaluate(() => window.scrollTo(0, 0));
		await expect(header).toHaveAttribute("data-scrolled", "false");
		await expect.poll(shadowAlpha).toBe(0);
	});
});
