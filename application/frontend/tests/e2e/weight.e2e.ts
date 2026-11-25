import { expect, type Page, test } from "@playwright/test";
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
			const fontBytes: Promise<number>[] = [];
			page.on("request", (request) => {
				if (request.resourceType() === "font") fontRequests.push(request.url());
			});
			page.on("response", (response) => {
				if (response.url().endsWith(".woff2"))
					fontBytes.push(response.body().then((body) => body.length));
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
				expect(href).toContain(`-${subset}-core.`);
				expect(fontRequests.filter((url) => url === href)).toHaveLength(1);
			}
			// Ranges are normalised by the browser. Each preloaded file must back a face the page really loaded (family and subset)
			const loaded = await page.evaluate(() =>
				[...document.fonts]
					.filter((face) => face.status === "loaded")
					.map((face) => ({ family: face.family.replace(/"/g, ""), range: face.unicodeRange }))
			);
			const marker = subset === "cyrillic" ? "U+410-44F" : "U+20-7E";
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

			const bytes = (await Promise.all(fontBytes)).reduce((sum, size) => sum + size, 0);
			expect(bytes).toBeGreaterThan(0);
			expect(bytes).toBeLessThan(lang === "ua" ? 105_000 : 85_000);

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

test.describe("picture sizes", () => {
	const paths = [
		"/ua/",
		"/ua/catalogue/equipment/checkweigher/",
		"/ua/catalogue/equipment/checkweigher/hc-a/",
		"/ua/wiki/",
	];
	for (const path of paths) {
		test(`each picture fits the box it fills: ${path}`, async ({ browser }) => {
			const context = await browser.newContext({
				viewport: VIEWPORTS.mobile,
				deviceScaleFactor: 1.75,
			});
			const page = await context.newPage();
			await blockPlerdy(page);
			await page.goto(path, { waitUntil: "load" });
			// Scroll through the page so every lazy picture loads
			const height = await page.evaluate(() => document.documentElement.scrollHeight);
			for (let y = 0; y < height; y += 400) {
				await page.evaluate((top) => window.scrollTo(0, top), y);
				await page.waitForTimeout(60);
			}
			// The gallery's 80 px thumbnails and lightbox, and the partner logos, keep fixed widths
			const selector =
				".skeleton:not(.gallery-thumb, #gallery-lightbox *, #partners *) img[srcset]";
			const onScreen = (img: HTMLImageElement) => {
				const r = img.getBoundingClientRect();
				return r.width > 0 && r.right > 0 && r.left < innerWidth;
			};
			await page.waitForFunction(
				({ sel, test }) => {
					const visible = new Function(`return ${test}`)() as typeof onScreen;
					return [...document.querySelectorAll<HTMLImageElement>(sel)]
						.filter(visible)
						.every((img) => img.complete && img.naturalWidth > 0);
				},
				{ sel: selector, test: onScreen.toString() }
			);
			const pictures = await page.evaluate(
				({ sel, test }) => {
					const visible = new Function(`return ${test}`)() as typeof onScreen;
					const dpr = window.devicePixelRatio;
					return [...document.querySelectorAll<HTMLImageElement>(sel)]
						.filter((img) => visible(img) && img.currentSrc)
						.map((img) => {
							const box = img.getBoundingClientRect();
							const fit = getComputedStyle(img).objectFit;
							const ratio = img.naturalWidth / img.naturalHeight;
							let painted = box.width;
							if (fit === "contain") painted = Math.min(box.width, box.height * ratio);
							if (fit === "cover") painted = Math.max(box.width, box.height * ratio);
							const widths = img.srcset
								.split(",")
								.map((part) => part.trim().split(/\s+/))
								.map(([url, w]) => ({
									url: new URL(url, location.href).href,
									w: Number.parseInt(w, 10),
								}));
							const chosen = widths.find((c) => c.url === img.currentSrc)?.w ?? 0;
							return {
								src: img.currentSrc.split("/").pop(),
								chosen,
								smallest: Math.min(...widths.map((c) => c.w)),
								largest: Math.max(...widths.map((c) => c.w)),
								needed: painted * dpr,
							};
						});
				},
				{ sel: selector, test: onScreen.toString() }
			);
			expect(pictures.length).toBeGreaterThan(0);
			const problems: string[] = [];
			for (const p of pictures) {
				const info = `${p.src}: chose ${p.chosen}w for ${Math.round(p.needed)} device px`;
				if (p.chosen === 0) problems.push(`${info} (candidate not found)`);
				// Chrome at a density above 1 may take the next smaller candidate, hence 0.7
				if (p.chosen > 1.5 * p.needed && p.chosen > p.smallest) problems.push(`${info}: too big`);
				if (p.chosen < 0.7 * p.needed && p.chosen < p.largest) problems.push(`${info}: too small`);
			}
			expect(problems).toEqual([]);
			await context.close();
		});
	}
});

// Slow CI runners: what a page does on its own may take a while to show up
const SLOW = { timeout: 15_000 };
const PLERDY = /\/\/a\.plerdy\.com\/public\/js\/click\/main\.js/;
const MAPS = /google\.com\/maps|maps\.google\.com/;

// Count the requests and abort them: the real script is not wanted, only the request
async function countRequests(page: Page, pattern: RegExp): Promise<() => number> {
	let count = 0;
	await page.route(pattern, (route) => {
		count += 1;
		return route.abort();
	});
	return () => count;
}

test.describe("on demand", () => {
	// Records what reaches window, so a failure names the event that started Plerdy
	const recordEvents = () => {
		const seen: string[] = [];
		(window as unknown as { __seen: string[] }).__seen = seen;
		for (const type of [
			"scroll",
			"wheel",
			"pointermove",
			"pointerdown",
			"touchstart",
			"keydown",
			"click",
		])
			window.addEventListener(
				type,
				(event) => {
					const e = event as PointerEvent;
					const target = event.target as Element | Document | null;
					const name = target && "tagName" in target ? target.tagName : "document";
					seen.push(
						`${type} trusted=${event.isTrusted} target=${name} move=${e.movementX},${e.movementY} t=${Math.round(performance.now())}`
					);
				},
				{ capture: true, passive: true }
			);
	};
	const seenEvents = (page: Page) =>
		page.evaluate(() => (window as unknown as { __seen?: string[] }).__seen ?? []);

	test("Plerdy waits for a real interaction and loads once", async ({ page }) => {
		const loads = await countRequests(page, PLERDY);
		await page.addInitScript(recordEvents);
		await page.goto("/ua/", { waitUntil: "networkidle" });
		const events = JSON.stringify(await seenEvents(page));
		expect(loads(), `before any input, events seen: ${events}`).toBe(0);

		// Programmatic scrolling and made-up events are not a visitor
		await page.evaluate(() => {
			window.scrollTo(0, 400);
			for (const selector of ["[data-marquee-viewport]", ".featured-tablist"]) {
				const el = document.querySelector(selector);
				if (el) el.scrollLeft = 40;
			}
			for (const type of ["wheel", "pointermove", "pointerdown", "touchstart", "keydown", "click"])
				window.dispatchEvent(new Event(type));
			document.body.click();
		});
		await page.waitForTimeout(500);
		expect(
			loads(),
			`after scripted input, events seen: ${JSON.stringify(await seenEvents(page))}`
		).toBe(0);

		await page.mouse.move(100, 100);
		await page.mouse.wheel(0, 300);
		await expect.poll(loads, SLOW).toBe(1);
		await page.locator("body").click({ position: { x: 5, y: 5 } });
		await page.keyboard.press("Tab");
		await page.mouse.wheel(0, 300);
		// Give a second request every chance to show up
		await page.waitForTimeout(500);
		expect(loads()).toBe(1);

		await page.evaluate(() => {
			(window as unknown as { __kept: boolean }).__kept = true;
		});
		await page.goto("/ua/contact/", { waitUntil: "networkidle" });
		const before = loads();
		await page.goBack({ waitUntil: "networkidle" });
		const restored = await page.evaluate(
			() => (window as unknown as { __kept?: boolean }).__kept === true
		);
		if (restored) {
			// Back/forward cache: the page keeps its one load
			await page.mouse.wheel(0, 300);
			await page.waitForTimeout(500);
			expect(loads()).toBe(before);
		} else {
			// Restoring the scroll position is not a visitor's input
			await page.waitForTimeout(500);
			expect(
				loads(),
				`after going back, events seen: ${JSON.stringify(await seenEvents(page))}`
			).toBe(before);
			await page.mouse.wheel(0, 300);
			await expect.poll(loads, SLOW).toBe(before + 1);
			await page.waitForTimeout(500);
			expect(loads()).toBe(before + 1);
		}
	});

	test("a mouse move, a key press and a tap each start Plerdy", async ({ browser, page }) => {
		const inputs: [string, (p: Page) => Promise<void>][] = [
			["mouse move", (p) => p.mouse.move(120, 140, { steps: 3 })],
			["key press", (p) => p.keyboard.press("Tab")],
		];
		for (const [name, act] of inputs) {
			const fresh = await page.context().newPage();
			const loads = await countRequests(fresh, PLERDY);
			await fresh.goto("/ua/", { waitUntil: "networkidle" });
			expect(loads(), name).toBe(0);
			await act(fresh);
			await expect.poll(loads, SLOW).toBe(1);
			await fresh.close();
		}
		const context = await browser.newContext({ hasTouch: true, viewport: VIEWPORTS.mobile });
		const touch = await context.newPage();
		const loads = await countRequests(touch, PLERDY);
		await touch.goto("/ua/", { waitUntil: "networkidle" });
		expect(loads()).toBe(0);
		await touch.touchscreen.tap(20, 300);
		await expect.poll(loads, SLOW).toBe(1);
		await context.close();
	});

	test("several real inputs in one go load Plerdy once", async ({ page }) => {
		const loads = await countRequests(page, PLERDY);
		await page.goto("/en/", { waitUntil: "networkidle" });
		await Promise.all([
			page.mouse.move(200, 200),
			page.mouse.down().then(() => page.mouse.up()),
			page.keyboard.press("Tab"),
			page.mouse.wheel(0, 200),
		]);
		await expect.poll(loads, SLOW).toBe(1);
		await page.waitForTimeout(500);
		expect(loads()).toBe(1);
	});

	test("the map waits until it is near", async ({ browser }) => {
		const context = await browser.newContext({ viewport: VIEWPORTS.mobile });
		const page = await context.newPage();
		await blockPlerdy(page);
		const requests = await countRequests(page, MAPS);
		await page.addInitScript(() => {
			(window as unknown as { __cls: number }).__cls = 0;
			new PerformanceObserver((list) => {
				for (const entry of list.getEntries() as unknown as {
					value: number;
					hadRecentInput: boolean;
				}[])
					if (!entry.hadRecentInput) (window as unknown as { __cls: number }).__cls += entry.value;
			}).observe({ type: "layout-shift", buffered: true });
		});
		await page.goto("/ua/contact/", { waitUntil: "networkidle" });
		expect(requests()).toBe(0);
		const figure = page.locator("figure:has(iframe)");
		await expect(figure.locator("iframe")).toBeHidden();
		const before = await figure.boundingBox();
		await figure.scrollIntoViewIfNeeded();
		await expect.poll(requests, SLOW).toBeGreaterThanOrEqual(1);
		await expect(figure.locator("iframe")).toHaveAttribute("src", /maps\.google\.com/, SLOW);
		const after = await figure.boundingBox();
		expect(Math.abs((after?.height ?? 0) - (before?.height ?? 0))).toBeLessThan(1);
		const shift = await page.evaluate(() => (window as unknown as { __cls: number }).__cls);
		expect(shift).toBe(0);
		await context.close();
	});

	test("without JavaScript the map is a link", async ({ browser }) => {
		const context = await browser.newContext({ javaScriptEnabled: false });
		const page = await context.newPage();
		await page.goto("/ua/contact/");
		const link = page.locator('figure a[href^="https://www.google.com/maps/search/"]');
		await expect(link).toBeVisible();
		await expect(page.locator("figure iframe")).toBeHidden();
		await context.close();
	});
});
