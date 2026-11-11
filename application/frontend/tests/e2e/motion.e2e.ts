import { expect, type Page, test } from "@playwright/test";

// The page loads Plerdy analytics from a third-party host. It is irrelevant to motion, needs the
// network and adds main-thread work that can push the runtime past the 3 s failsafe, so the tests
// never load it.
test.beforeEach(async ({ page }) => {
	await page.route(/\/\/a\.plerdy\.com\//, (route) => route.abort());
});

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
		await page.goto(HOME, { waitUntil: "domcontentloaded" });
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
			.locator(".reveal, .reveal-slide, .reveal-glow, .reveal-heading, .img-fade")
			.evaluateAll((els) => els.map((el) => Number(getComputedStyle(el).opacity)));
		expect(opacities.length).toBeGreaterThan(0);
		expect(opacities.every((o) => o === 1)).toBe(true);
	});
});

test.describe("section headings", () => {
	test("hide until scrolled into view, then rise in after the eyebrow", async ({ page }) => {
		await page.goto(HOME);
		const heading = page.locator("#partners-heading");
		await expect(heading).toHaveClass(/reveal-heading/);
		await expect(heading).not.toHaveAttribute("data-revealed", /.*/);
		expect(await opacityOf(page, "#partners-heading")).toBe(0);

		await heading.scrollIntoViewIfNeeded();
		await expect(heading).toHaveAttribute("data-revealed", "");
		await expect.poll(() => opacityOf(page, "#partners-heading")).toBe(1);
		await expect.poll(() => heading.evaluate((el) => (el as HTMLElement).style.transform)).toBe("");
	});

	test("reduced motion: headings are visible straight away", async ({ page }) => {
		await page.emulateMedia({ reducedMotion: "reduce" });
		await page.goto(HOME);
		expect(await opacityOf(page, "#partners-heading")).toBe(1);
	});
});

test.describe("image fade-in", () => {
	test("an image stays hidden until its file arrives, then fades in", async ({ page }) => {
		let release: () => void = () => undefined;
		const gate = new Promise<void>((resolve) => {
			release = resolve;
		});
		await page.route(/\/_image\?|\/assets\/.*\.(png|jpe?g|webp|avif)/, async (route) => {
			await gate;
			await route.continue();
		});

		await page.goto(CATEGORY, { waitUntil: "domcontentloaded" });
		const img = page.locator("img.img-fade").first();
		await expect(img).toBeAttached();
		await expect(img).not.toHaveAttribute("data-loaded", /.*/);
		expect(await img.evaluate((el) => Number(getComputedStyle(el).opacity))).toBe(0);

		release();
		await expect(img).toHaveAttribute("data-loaded", "", { timeout: 15_000 });
		await expect.poll(() => img.evaluate((el) => Number(getComputedStyle(el).opacity))).toBe(1);
	});

	test("a broken image still ends up marked, so its alt text is not hidden", async ({ page }) => {
		await page.route(/\/_image\?|\/assets\/.*\.(png|jpe?g|webp|avif)/, (route) => route.abort());
		await page.goto(CATEGORY);
		const img = page.locator("img.img-fade").first();
		await expect(img).toHaveAttribute("data-loaded", "", { timeout: 15_000 });
	});

	test("hover scale on a card image still works after the fade", async ({ page }) => {
		await page.goto(CATEGORY);
		const img = page.locator("img.img-fade").first();
		await expect(img).toHaveAttribute("data-loaded", "", { timeout: 15_000 });
		await img.hover();
		await expect
			.poll(() => img.evaluate((el) => parseFloat(getComputedStyle(el).scale)))
			.toBeGreaterThan(1);
	});

	test("reduced motion: images are visible and never gated", async ({ page }) => {
		await page.emulateMedia({ reducedMotion: "reduce" });
		await page.goto(CATEGORY);
		const opacities = await page
			.locator("img.img-fade")
			.evaluateAll((els) => els.map((el) => Number(getComputedStyle(el).opacity)));
		expect(opacities.length).toBeGreaterThan(0);
		expect(opacities.every((o) => o === 1)).toBe(true);
	});

	test("the hero and header logo are never faded", async ({ page }) => {
		await page.goto(HOME);
		await expect(page.locator("header img.img-fade, #main-header img.img-fade")).toHaveCount(0);
		await expect(page.locator("main img.img-fade").first()).toBeAttached();
	});
});

test.describe("page transitions", () => {
	/** Records, per navigation, whether the browser started a view transition (`pageswap`) */
	const recordTransitions = (page: Page) =>
		page.addInitScript(() => {
			addEventListener("pageswap", (event) => {
				const swap = event as Event & { viewTransition?: unknown };
				sessionStorage.setItem("vt", swap.viewTransition ? "1" : "0");
			});
		});
	const supportsPageSwap = (page: Page) => page.evaluate(() => "PageSwapEvent" in window);

	test("the header is a named transition layer", async ({ page }) => {
		await page.goto(HOME);
		const name = await page
			.locator("#main-header")
			.evaluate((el) => getComputedStyle(el).getPropertyValue("view-transition-name"));
		// Browsers without view-transition support report an empty string
		test.skip(name === "", "view transitions not supported in this browser");
		expect(name).toBe("site-header");
	});

	test("navigation still works and lands on the new page", async ({ page }) => {
		await page.goto(HOME);
		await page.locator('#main-header nav a[href$="/wiki"]').click();
		await expect(page).toHaveURL(/\/ua\/wiki/);
		await expect(page.locator("h1").first()).toBeVisible();
	});

	test("a link click starts a view transition", async ({ page }) => {
		await recordTransitions(page);
		await page.goto(HOME);
		test.skip(!(await supportsPageSwap(page)), "cross-document view transitions unsupported");
		await page.locator('#main-header nav a[href$="/wiki"]').click();
		await expect(page).toHaveURL(/\/ua\/wiki/);
		expect(await page.evaluate(() => sessionStorage.getItem("vt"))).toBe("1");
	});

	test("reduced motion: a link click starts no view transition", async ({ page }) => {
		await page.emulateMedia({ reducedMotion: "reduce" });
		await recordTransitions(page);
		await page.goto(HOME);
		test.skip(!(await supportsPageSwap(page)), "cross-document view transitions unsupported");
		await page.locator('#main-header nav a[href$="/wiki"]').click();
		await expect(page).toHaveURL(/\/ua\/wiki/);
		expect(await page.evaluate(() => sessionStorage.getItem("vt"))).toBe("0");
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
