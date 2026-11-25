import type { Page } from "@playwright/test";

const LANGS = ["ua", "en"] as const;
const SUBPATHS = [
	"",
	"contact/",
	"about/",
	"catalogue/equipment/checkweigher/",
	"catalogue/equipment/checkweigher/hc-a/",
	"catalogue/industry/food-beverage/",
	"wiki/",
	"wiki/load-cell/",
	"privacy/",
	"terms/",
];

// Every public page in both languages, plus the shared 404
export const PAGES: { name: string; path: string }[] = [
	...LANGS.flatMap((lang) =>
		SUBPATHS.map((sub) => ({ name: `${lang}/${sub}`, path: `/${lang}/${sub}` }))
	),
	{ name: "404", path: "/404.html" },
];

export const VIEWPORTS = {
	mobile: { width: 412, height: 823 },
	desktop: { width: 1350, height: 940 },
} as const;

// Third-party analytics must not load during audits
export async function blockPlerdy(page: Page): Promise<void> {
	await page.route(/\/\/a\.plerdy\.com\//, (route) => route.abort());
}
