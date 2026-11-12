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
				expect(height).toBeLessThanOrEqual(209);
			}
		});

		test("the tab bar shows no scrollbar on desktop", async ({ page }) => {
			await page.setViewportSize({ width: 1440, height: 1000 });
			await openHome(page, `/${lang}`);
			const tablist = page.locator(`${BAND} [role="tablist"]`);
			const metrics = await tablist.evaluate((el) => ({
				verticalBar: el.offsetWidth - el.clientWidth,
				overflowY: el.scrollHeight - el.clientHeight,
			}));
			// A vertical scrollbar would take width from the bar and let it scroll up and down
			expect(metrics.verticalBar).toBeLessThanOrEqual(0);
			expect(metrics.overflowY).toBeLessThanOrEqual(0);
		});

		test("the spotlight shows three equipment stat cards on wide screens", async ({ page }) => {
			await page.setViewportSize({ width: 1440, height: 1000 });
			await openHome(page, `/${lang}`);
			const cards = visiblePanel(page).locator("article dl > div");
			expect(await cards.count()).toBe(3);
			for (let i = 0; i < 3; i++) await expect(cards.nth(i)).toBeVisible();
		});

		test("the spotlight shows two stat cards on phones", async ({ page }) => {
			await page.setViewportSize({ width: 390, height: 800 });
			await openHome(page, `/${lang}`);
			const cards = visiblePanel(page).locator("article dl > div");
			const visible = await cards.evaluateAll(
				(els) => els.filter((el) => (el as HTMLElement).offsetParent !== null).length
			);
			expect(visible).toBe(2);
		});

		test("switching tabs does not move the panel down", async ({ page }) => {
			await page.setViewportSize({ width: 1440, height: 1000 });
			await openHome(page, `/${lang}`);
			// Position in the document, so the scrolling done by clickTab does not count
			const top = () =>
				visiblePanel(page).evaluate((el) => el.getBoundingClientRect().top + window.scrollY);
			const before = await top();
			await clickTab(page, 1);
			await expect(page.locator(`${BAND} [role="tab"]`).nth(1)).toHaveAttribute(
				"aria-selected",
				"true"
			);
			// The entrance animation slides the panel 12px, so wait until it has settled
			await expect.poll(async () => Math.abs((await top()) - before)).toBeLessThanOrEqual(1);
		});

		test("clicking the selected tab does not replay the panel animation", async ({ page }) => {
			await openHome(page, `/${lang}`);
			await clickTab(page, 0);
			await expect(visiblePanel(page)).not.toHaveAttribute("data-active", /.*/);
		});

		test("moving the mouse over the spotlight image steps through its photos", async ({ page }) => {
			await page.setViewportSize({ width: 1440, height: 1000 });
			await openHome(page, `/${lang}`);
			const stage = visiblePanel(page).locator("article [data-gallery-stage]");
			await stage.scrollIntoViewIfNeeded();
			const images = stage.locator("img");
			expect(await images.count()).toBeGreaterThan(1);
			const shownIndex = () =>
				images.evaluateAll((els) => els.findIndex((el) => !(el as HTMLElement).hidden));

			expect(await shownIndex()).toBe(0);
			const box = await stage.boundingBox();
			if (!box) throw new Error("stage has no box");
			const y = box.y + box.height / 2;
			await page.mouse.move(box.x + box.width * 0.95, y);
			await expect.poll(shownIndex).toBe((await images.count()) - 1);
			await page.mouse.move(box.x + box.width * 0.05, y);
			await expect.poll(shownIndex).toBe(0);
			// Leaving the stage keeps the photo that was showing
			await page.mouse.move(box.x + box.width * 0.5, y);
			const last = await shownIndex();
			expect(last).toBeGreaterThan(0);
			await page.mouse.move(2, 2);
			await page.waitForTimeout(400);
			expect(await shownIndex()).toBe(last);
		});

		test("a photo change cuts instantly with no animation", async ({ page }) => {
			await page.setViewportSize({ width: 1440, height: 1000 });
			await openHome(page, `/${lang}`);
			const stage = visiblePanel(page).locator("article [data-gallery-stage]");
			await stage.scrollIntoViewIfNeeded();
			const box = await stage.boundingBox();
			if (!box) throw new Error("stage has no box");
			await page.mouse.move(box.x + box.width * 0.95, box.y + box.height / 2);
			const shown = stage.locator("img:not([hidden])");
			await expect(shown).toHaveCount(1);
			const style = await shown.evaluate((el) => {
				const computed = getComputedStyle(el);
				return { animation: computed.animationName, opacity: Number(computed.opacity) };
			});
			expect(style.animation).toBe("none");
			expect(style.opacity).toBe(1);
		});

		test("list cards step through their photos on hover and show a key spec", async ({ page }) => {
			await page.setViewportSize({ width: 1440, height: 1000 });
			await openHome(page, `/${lang}`);
			const row = visiblePanel(page).locator("article + div > a.card-hover").first();
			await row.scrollIntoViewIfNeeded();
			const images = row.locator("[data-gallery-stage] img");
			expect(await images.count()).toBeGreaterThan(1);
			await expect(row.locator("[data-spec]")).toHaveCount(1);
			const shownIndex = () =>
				images.evaluateAll((els) => els.findIndex((el) => !(el as HTMLElement).hidden));
			expect(await shownIndex()).toBe(0);
			const box = await row.locator("[data-gallery-stage]").boundingBox();
			if (!box) throw new Error("row stage has no box");
			await page.mouse.move(box.x + box.width * 0.95, box.y + box.height / 2);
			await expect.poll(shownIndex).toBe((await images.count()) - 1);
			// Leaving the card keeps the photo that was showing
			await page.mouse.move(2, 2);
			await page.waitForTimeout(400);
			expect(await shownIndex()).toBe((await images.count()) - 1);
		});

		test("swiping the spotlight photo changes it, and a tap still opens the product", async ({
			page,
		}) => {
			await page.setViewportSize({ width: 390, height: 800 });
			await openHome(page, `/${lang}`);
			const stage = visiblePanel(page).locator("article [data-gallery-stage]");
			await stage.scrollIntoViewIfNeeded();
			const images = stage.locator("img");
			const shownIndex = () =>
				images.evaluateAll((els) => els.findIndex((el) => !(el as HTMLElement).hidden));
			// Playwright cannot swipe on every engine, so send the touch pointer events directly
			const swipe = (fromX: number, toX: number) =>
				stage.evaluate(
					(el, [from, to]) => {
						const rect = el.getBoundingClientRect();
						const y = rect.top + rect.height / 2;
						const fire = (type: string, x: number) =>
							el.dispatchEvent(
								new PointerEvent(type, {
									pointerType: "touch",
									pointerId: 7,
									isPrimary: true,
									clientX: rect.left + x,
									clientY: y,
									bubbles: true,
									cancelable: true,
								})
							);
						fire("pointerdown", from);
						fire("pointermove", (from + to) / 2);
						fire("pointerup", to);
					},
					[fromX, toX]
				);
			expect(await shownIndex()).toBe(0);
			await swipe(250, 60);
			await expect.poll(shownIndex).toBe(1);
			await swipe(250, 60);
			await expect.poll(shownIndex).toBe(2);
			await swipe(60, 250);
			await expect.poll(shownIndex).toBe(1);
			// The stage must not block vertical page scrolling
			const touchAction = await stage.evaluate((el) => getComputedStyle(el).touchAction);
			expect(touchAction).toBe("pan-y");
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
		// Only the first photo of each spotlight shows without the script
		const shown = await page
			.locator(`${BAND} [data-gallery-stage]`)
			.evaluateAll((stages) =>
				stages.map((stage) => stage.querySelectorAll("img:not([hidden])").length)
			);
		expect(shown.length).toBeGreaterThan(0);
		expect(shown.every((n) => n === 1)).toBe(true);
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
