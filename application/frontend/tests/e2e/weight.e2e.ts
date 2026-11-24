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

test.describe("text fonts", () => {
	for (const lang of ["ua", "en"]) {
		test(`preloads two fonts and uses both: ${lang}`, async ({ page }) => {
			const fontRequests: string[] = [];
			const warnings: string[] = [];
			page.on("request", (request) => {
				if (request.resourceType() === "font") fontRequests.push(request.url());
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
				expect(href).toContain(`-${subset}-`);
				expect(fontRequests.filter((url) => url === href)).toHaveLength(1);
			}
			// Ranges are normalised by the browser. Each preloaded file must back a face the page really loaded (family and subset)
			const loaded = await page.evaluate(() =>
				[...document.fonts]
					.filter((face) => face.status === "loaded")
					.map((face) => ({ family: face.family.replace(/"/g, ""), range: face.unicodeRange }))
			);
			const marker = subset === "cyrillic" ? "U+400-45F" : "U+0-FF,";
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
			// The product gallery keeps its own widths; partner logos are a separate, fixed-size strip
			const selector = ".skeleton:not(.product-gallery-container *, #partners *) img[srcset]";
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
