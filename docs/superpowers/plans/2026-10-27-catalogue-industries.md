# Catalogue Industries Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use skills:subagent-driven-development (recommended) or skills:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an Industries accordion section to the catalogue sidebar, with static `/{lang}/catalogue/industry/{slug}` pages, and move category and product pages under `/catalogue/equipment/` with redirects from the old URLs.

**Architecture:** Industries mirror categories: a new `industries.json` with the same shape as `equipment-types.json`, an `Industry` type, and `getIndustriesForLocale` / `filterByIndustry` helpers in `content-utils.ts`. A new slot-based `CatalogueBand.astro` owns the muted band, the sidebar and the swap target, and is shared by the category and industry pages. The existing in-place page swap (a `<script>` in `CatalogueSidebar.astro`) is generalized and gains an exclusive two-section accordion. Redirects are generated at config time by a small plain-JS module so they can be unit tested.

**Tech Stack:** Astro 7 (static output), TypeScript, Tailwind v4, Decap CMS, Bun test, Biome, Prettier (astro files).

**Spec:** [`docs/superpowers/specs/2026-10-27-catalogue-industries-design.md`](../specs/2026-10-27-catalogue-industries-design.md)

______________________________________________________________________

## Working conventions

- All commands run from `application/frontend` unless stated. Git commands work from there too (paths are relative to the cwd).
- Repo rules (`application/frontend/CLAUDE.md`): no emojis anywhere, no `Co-Authored-By` lines in commits.
- Branch: `denys/feat/industries-page` (already checked out).
- Every new user-visible string uses `_("...")` and needs a Ukrainian translation (Task 5 does this for the one new string).
- Biome formats with tabs; `.astro` files are additionally formatted by Prettier. **Run Prettier only on files this plan creates or rewrites** (never `bun run check:fix`, it reformats unrelated files).

## Baseline (measured before any change)

| Check                | Result                                                                                                                                                                                                                                                                 |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `bun test`           | 213 pass, 0 fail, 17 files                                                                                                                                                                                                                                             |
| `bunx astro check`   | 0 errors, 0 warnings, 8 hints                                                                                                                                                                                                                                          |
| `bunx biome check .` | 17 errors, 3 warnings, **already failing** in unrelated files (`ClientDirectory.astro`, `PartnersSection.astro`, `ShareButtons.astro`, `partners.json`, `form-script.ts`, `global.css`, `reveal-once.test.ts`) plus import order in the two current `[category]` pages |

Final lint gate for this work: `biome check` on every file this plan touches reports **0 diagnostics**, and the whole-repo error count is **not higher than 17**.

## Spec decisions this plan makes explicit

1. `CatalogueSidebar` props: `currentCategory` is **renamed** `activeSlug` (it now holds a category or industry slug). New props `allIndustries` and `section`.
1. Two latent bugs sit on lines this plan must change anyway, so they are fixed in place (Task 3): the category page JSON-LD builds product URLs from `id.split("/")[1].replace(/\.(en|ua)$/, "")` (ids have no dot, so the locale suffix stays, e.g. `hc-slen`) and concatenates `${Astro.site}` with a leading `/` (double slash). Both are replaced by `getSlug()` and `new URL(path, siteUrl)`.
1. The Decap slug auto-generation listener (`src/cms/category-slugs.ts`) only knows the `categories` key. Industries need the same behaviour ("same CMS handling"), so the listener is generalized to also handle `industries` (Task 8).
1. Header active state: the Catalogue item matches `/catalogue/equipment`, the Industries item matches `/catalogue/industry`. Otherwise both would light up on industry pages. After an in-place swap the header link classes are copied too, so the underline follows the page.
1. The Industries CMS file lives in the existing `equipment-categories` collection (spec: "file entry beside Equipment Types"). The collection `name` stays (the slug listener depends on it); only its `label` and `description` change.
1. Industry copy (titles/descriptions in `industries.json`) is draft text modelled on the existing site copy. Flag it for the content owner.

## File structure

```
application/frontend/
├── astro.config.mjs                                   MODIFY  redirects: buildCatalogueRedirects(...)
├── biome.json                                         MODIFY  industries.json uses 2-space JSON (Decap writes it)
├── scripts/
│   └── catalogue-redirects.mjs                        CREATE  old -> new URL map from data + content folders
├── src/
│   ├── cms/category-slugs.ts                          MODIFY  also slugify `industries`
│   ├── components/
│   │   ├── Header.astro                               MODIFY  nav links + patterns
│   │   ├── about/AboutHero.astro                      MODIFY  catalogue link
│   │   ├── errors/NotFoundContent.astro               MODIFY  catalogue link
│   │   └── catalogue/
│   │       ├── CatalogueBand.astro                    CREATE  band + sidebar + results wrapper (slot)
│   │       ├── CatalogueSidebar.astro                 REWRITE two-section accordion + generalized swap
│   │       ├── ProductCard.astro                      MODIFY  canonical product URL
│   │       └── RelatedEquipment.astro                 MODIFY  canonical product URL
│   ├── data/industries.json                           CREATE
│   ├── lib/
│   │   ├── catalogue-urls.ts                          CREATE  categoryUrl / productUrl / industryUrl
│   │   └── content-utils.ts                           MODIFY  Industry, getIndustriesForLocale, filterByIndustry, groupByCategory
│   ├── content/equipment/checkweigher/ec-e.{en,ua}.md MODIFY  drop `general`
│   └── pages/
│       ├── admin/_config.template.yml                 MODIFY  Industries file, tokens, preview_path
│       ├── admin/config.yml.ts                        MODIFY  INDUSTRY_OPTIONS / INDUSTRY_FILTERS tokens
│       └── [lang]/catalogue/
│           ├── [category]/...                         MOVE    -> equipment/[category]/...
│           ├── equipment/[category]/index.astro       MOVED + REWRITE (uses CatalogueBand)
│           ├── equipment/[category]/[slug].astro      MOVED + EDIT
│           └── industry/[slug].astro                  CREATE
├── locales/{messages.pot,ua.po}, src/i18n/ui.ts       REGENERATE one new string
└── tests/
    ├── cms/category-slugs.test.ts                     CREATE
    ├── data/integrity.test.ts                         MODIFY
    ├── lib/catalogue-urls.test.ts                     CREATE
    ├── lib/content-utils.test.ts                      MODIFY
    ├── lib/structured-data.test.ts                    MODIFY  /equipment/ fixtures
    └── scripts/catalogue-redirects.test.ts            CREATE
```

______________________________________________________________________

### Task 1: Industries data, type and helpers

**Files:**

- Create: `src/data/industries.json`

- Modify: `src/lib/content-utils.ts`, `biome.json`, `src/content/equipment/checkweigher/ec-e.en.md`, `src/content/equipment/checkweigher/ec-e.ua.md`

- Test: `tests/lib/content-utils.test.ts`, `tests/data/integrity.test.ts`

- [ ] **Step 1: Write the failing unit tests**

In `tests/lib/content-utils.test.ts`, extend the import list (keep alphabetical order) and append the new blocks at the end of the file.

Replace the import block (lines 2-16) with:

```ts
import {
	type EquipmentEntry,
	type EquipmentType,
	filterByCategory,
	filterByIndustry,
	filterByLocale,
	findTranslation,
	getCategories,
	getCategoriesForLocale,
	getCategory,
	getIndustriesForLocale,
	getLocale,
	getProducts,
	getSlug,
	groupByCategory,
	isCategory,
	isProduct,
	sortByOrder,
} from "@/lib/content-utils";
```

Append at the end of the file:

```ts
describe("getIndustriesForLocale", () => {
	it("returns industries with slug, title and icon for both locales", () => {
		for (const locale of ["en", "ua"] as const) {
			const industries = getIndustriesForLocale(locale);
			expect(industries.length).toBeGreaterThan(0);
			for (const i of industries) {
				expect(i.slug).toBeTruthy();
				expect(i.title).toBeTruthy();
				expect(i.icon).toBeTruthy();
			}
		}
	});
});

describe("filterByIndustry", () => {
	const tagged = (id: string, industries?: string[]) =>
		({ id, data: { industries } }) as unknown as EquipmentEntry;

	const list = [
		tagged("checkweigher/hc-men", ["food-beverage", "pharmaceutical"]),
		tagged("catchweigher/hc-slen", ["logistics"]),
		tagged("checkweigher/ec-een"),
	];

	it("keeps products tagged with the industry, including multi-tagged ones", () => {
		expect(filterByIndustry(list, "pharmaceutical").map((e) => e.id)).toEqual([
			"checkweigher/hc-men",
		]);
		expect(filterByIndustry(list, "food-beverage")).toHaveLength(1);
	});

	it("ignores products without industries", () => {
		expect(filterByIndustry(list, "logistics").map((e) => e.id)).toEqual([
			"catchweigher/hc-slen",
		]);
	});

	it("returns an empty array for an unknown industry", () => {
		expect(filterByIndustry(list, "chemical")).toEqual([]);
	});
});

describe("groupByCategory", () => {
	const category = (slug: string): EquipmentType => ({
		slug,
		title: slug.toUpperCase(),
		description: "",
		icon: "category",
	});
	const categories = [category("checkweigher"), category("catchweigher"), category("metal")];

	const products = [
		entry("catchweigher/hc-slen", 2),
		entry("checkweigher/a-en", 5),
		entry("checkweigher/b-en", 1),
	];

	it("groups in category order and omits categories without products", () => {
		const groups = groupByCategory(products, categories);
		expect(groups.map((g) => g.category.slug)).toEqual(["checkweigher", "catchweigher"]);
	});

	it("sorts products inside a group by order", () => {
		const groups = groupByCategory(products, categories);
		expect(groups[0].products.map((e) => e.id)).toEqual([
			"checkweigher/b-en",
			"checkweigher/a-en",
		]);
	});
});
```

- [ ] **Step 2: Write the failing integrity tests**

In `tests/data/integrity.test.ts`, add the import after the `equipment-types.json` import (line 8):

```ts
import industries from "@/data/industries.json";
```

Add these two blocks after the `equipment categories data` block (after line 106):

```ts
describe("industries data", () => {
	it("has the same slugs in the same order in en and ua", () => {
		expect(industries.ua.industries.map((i) => i.slug)).toEqual(
			industries.en.industries.map((i) => i.slug)
		);
	});

	it("has unique slugs", () => {
		const slugs = industries.en.industries.map((i) => i.slug);
		expect(new Set(slugs).size).toBe(slugs.length);
	});

	it("only references icons that exist in icons.json", () => {
		const known = new Set(icons.map((i) => i.value));
		const unknown = [...industries.en.industries, ...industries.ua.industries]
			.map((i) => i.icon)
			.filter((icon) => !known.has(icon));
		expect(unknown).toEqual([]);
	});

	it("has a title and description for every industry", () => {
		for (const i of [...industries.en.industries, ...industries.ua.industries]) {
			expect(i.title.trim()).not.toBe("");
			expect(i.description.trim()).not.toBe("");
		}
	});
});

describe("product industries", () => {
	it("tags products only with industries listed in industries.json", () => {
		const known = new Set(industries.en.industries.map((i) => i.slug));
		const unknown = files.flatMap((f) =>
			((frontmatter(f).industries ?? []) as string[])
				.filter((slug) => !known.has(slug))
				.map((slug) => `${f}: ${slug}`)
		);
		expect(unknown).toEqual([]);
	});

	it("has at least one product for every listed industry in each locale", () => {
		for (const locale of ["en", "ua"] as const) {
			const used = new Set(
				files
					.filter((f) => f.endsWith(`.${locale}.md`))
					.flatMap((f) => (frontmatter(f).industries ?? []) as string[])
			);
			const empty = industries[locale].industries.map((i) => i.slug).filter((s) => !used.has(s));
			expect(empty).toEqual([]);
		}
	});
});
```

- [ ] **Step 3: Run the tests and confirm they fail**

Run: `bun test tests/lib/content-utils.test.ts tests/data/integrity.test.ts`
Expected: FAIL. `Cannot find module '@/data/industries.json'` and missing exports from `@/lib/content-utils`.

- [ ] **Step 4: Create `src/data/industries.json`**

Two-space indent, same as `equipment-types.json` (Decap writes it that way).

```json
{
  "en": {
    "industries": [
      {
        "slug": "food-beverage",
        "title": "Food & Beverage",
        "description": "Inline weight control, metal detection and X-ray inspection for food and beverage production lines. Equipment that protects product safety, keeps giveaway under control and supports traceability requirements.",
        "icon": "lunch_dining"
      },
      {
        "slug": "pharmaceutical",
        "title": "Pharmaceutical",
        "description": "Weight verification, serialization and aggregation for pharmaceutical and healthcare packaging lines. Systems that support strict quality documentation and track-and-trace requirements.",
        "icon": "medication"
      },
      {
        "slug": "cosmetics",
        "title": "Cosmetics",
        "description": "Precise weight control and inspection for cosmetics and personal care production. Solutions for filling, packaging and final-check stages where consistent fill weight and presentation matter.",
        "icon": "spa"
      },
      {
        "slug": "logistics",
        "title": "Logistics & Distribution",
        "description": "High-speed dynamic weighing for warehouses, parcel handling and distribution centers. Systems that verify parcel weight on the move and keep sorting and shipping data accurate.",
        "icon": "local_shipping"
      }
    ]
  },
  "ua": {
    "industries": [
      {
        "slug": "food-beverage",
        "title": "Харчова промисловість і виробництво напоїв",
        "description": "Динамічний контроль маси, виявлення металевих забруднень і рентгенівська інспекція для ліній виробництва продуктів харчування та напоїв. Обладнання, що забезпечує безпечність продукції, контролює надлишок відважування та підтримує вимоги простежуваності.",
        "icon": "lunch_dining"
      },
      {
        "slug": "pharmaceutical",
        "title": "Фармацевтична промисловість",
        "description": "Перевірка маси, серіалізація та агрегація для фармацевтичних і медичних пакувальних ліній. Системи, що підтримують суворі вимоги до документування якості та простежуваності.",
        "icon": "medication"
      },
      {
        "slug": "cosmetics",
        "title": "Косметична промисловість",
        "description": "Точний контроль маси та інспекція у виробництві косметики й засобів особистого догляду. Рішення для етапів наповнення, пакування та фінального контролю, де важливі стабільна маса наповнення та якість подачі.",
        "icon": "spa"
      },
      {
        "slug": "logistics",
        "title": "Логістика та дистрибуція",
        "description": "Високошвидкісне динамічне зважування для складів, обробки посилок і розподільчих центрів. Системи, що перевіряють масу посилок на ходу та забезпечують точні дані для сортування й відправлення.",
        "icon": "local_shipping"
      }
    ]
  }
}
```

- [ ] **Step 5: Tell Biome to keep 2-space JSON for this file**

In `biome.json`, change the override at lines 160-168 from:

```json
		{
			"includes": ["src/data/equipment-types.json"],
```

to:

```json
		{
			"includes": ["src/data/equipment-types.json", "src/data/industries.json"],
```

- [ ] **Step 6: Add the type and helpers to `src/lib/content-utils.ts`**

Add the import under the existing `equipmentTypes` import (line 12):

```ts
import industriesData from "../data/industries.json";
```

Add after `getCategoriesForLocale` (after line 34):

```ts
export interface Industry {
	slug: string;
	title: string;
	description: string;
	icon: string;
}

/**
 * Get all industries for a given locale, in array order.
 * Reads from src/data/industries.json (managed by CMS, drag to reorder).
 */
export function getIndustriesForLocale(locale: Locale): Industry[] {
	const data = industriesData as {
		en?: { industries: Industry[] };
		ua?: { industries: Industry[] };
	};
	return data[locale]?.industries ?? [];
}
```

Add after `filterByCategory` (after line 98):

```ts
/**
 * Filter entries tagged with an industry
 */
export function filterByIndustry(
	entries: EquipmentEntry[],
	industrySlug: string
): EquipmentEntry[] {
	return entries.filter((entry) => entry.data.industries?.includes(industrySlug));
}

export interface CategoryGroup {
	category: EquipmentType;
	products: EquipmentEntry[];
}

/**
 * Group entries under their category, in the order of `categories`.
 * Products inside a group are sorted by order; categories without products are omitted.
 */
export function groupByCategory(
	entries: EquipmentEntry[],
	categories: EquipmentType[]
): CategoryGroup[] {
	return categories
		.map((category) => ({
			category,
			products: sortByOrder(filterByCategory(entries, category.slug)),
		}))
		.filter((group) => group.products.length > 0);
}
```

`sortByOrder` is declared later in the file as a function declaration, so hoisting makes this valid.

- [ ] **Step 7: Drop `general` from `ec-e`**

In both `src/content/equipment/checkweigher/ec-e.en.md` and `ec-e.ua.md`, change lines 5-7 from:

```yaml
industries:
  - food-beverage
  - general
```

to:

```yaml
industries:
  - food-beverage
```

- [ ] **Step 8: Run the tests and confirm they pass**

Run: `bun test tests/lib/content-utils.test.ts tests/data/integrity.test.ts`
Expected: PASS, 0 fail.

- [ ] **Step 9: Lint the touched files**

Run: `bunx biome check src/lib/content-utils.ts src/data/industries.json biome.json tests/lib/content-utils.test.ts tests/data/integrity.test.ts`
Expected: no diagnostics. If Biome reports formatting only, run the same command with `--write`.

- [ ] **Step 10: Commit**

```bash
git add src/data/industries.json src/lib/content-utils.ts biome.json src/content/equipment/checkweigher/ec-e.en.md src/content/equipment/checkweigher/ec-e.ua.md tests/lib/content-utils.test.ts tests/data/integrity.test.ts
git commit -m "feat(frontend): add industries data, type and helpers"
```

______________________________________________________________________

### Task 2: Catalogue URL helpers

One place builds every catalogue URL, so the many link updates in later tasks stay consistent.

**Files:**

- Create: `src/lib/catalogue-urls.ts`

- Test: `tests/lib/catalogue-urls.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/lib/catalogue-urls.test.ts`:

```ts
import { describe, expect, it } from "bun:test";
import { categoryUrl, industryUrl, productUrl } from "@/lib/catalogue-urls";

describe("catalogue URLs", () => {
	it("puts categories under /catalogue/equipment/", () => {
		expect(categoryUrl("en", "checkweigher")).toBe("/en/catalogue/equipment/checkweigher");
	});

	it("puts products under their category", () => {
		expect(productUrl("ua", "catchweigher", "hc-sl")).toBe(
			"/ua/catalogue/equipment/catchweigher/hc-sl"
		);
	});

	it("puts industries under /catalogue/industry/", () => {
		expect(industryUrl("ua", "food-beverage")).toBe("/ua/catalogue/industry/food-beverage");
	});
});
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `bun test tests/lib/catalogue-urls.test.ts`
Expected: FAIL, `Cannot find module '@/lib/catalogue-urls'`.

- [ ] **Step 3: Implement**

Create `src/lib/catalogue-urls.ts`:

```ts
import type { Lang } from "@/i18n/utils";

/** Canonical catalogue URLs. Paths only, no trailing slash. */
export const categoryUrl = (lang: Lang, category: string) =>
	`/${lang}/catalogue/equipment/${category}`;

export const productUrl = (lang: Lang, category: string, product: string) =>
	`${categoryUrl(lang, category)}/${product}`;

export const industryUrl = (lang: Lang, industry: string) =>
	`/${lang}/catalogue/industry/${industry}`;
```

- [ ] **Step 4: Run it and confirm it passes**

Run: `bun test tests/lib/catalogue-urls.test.ts`
Expected: PASS, 3 tests.

- [ ] **Step 5: Lint and commit**

Run: `bunx biome check src/lib/catalogue-urls.ts tests/lib/catalogue-urls.test.ts` (expect no diagnostics).

```bash
git add src/lib/catalogue-urls.ts tests/lib/catalogue-urls.test.ts
git commit -m "feat(frontend): add catalogue URL helpers"
```

______________________________________________________________________

### Task 3: Move category and product routes under `/equipment/` and update their links

**Files:**

- Move: `src/pages/[lang]/catalogue/[category]/` to `src/pages/[lang]/catalogue/equipment/[category]/`

- Modify: the two moved pages, `ProductCard.astro`, `RelatedEquipment.astro`, `CatalogueSidebar.astro` (one line), `Header.astro`, `AboutHero.astro`, `NotFoundContent.astro`, `_config.template.yml`, `tests/lib/structured-data.test.ts`

- [ ] **Step 1: Move the folder as a pure rename (own commit, reviewable)**

```bash
git mv "src/pages/[lang]/catalogue/[category]" "src/pages/[lang]/catalogue/equipment-tmp"
git mv "src/pages/[lang]/catalogue/equipment-tmp" "src/pages/[lang]/catalogue/equipment/[category]"
```

If the second command complains the parent `equipment` does not exist, create it first with `New-Item -ItemType Directory "src/pages/[lang]/catalogue/equipment"` and move `equipment-tmp` into it as `[category]`.

Verify: `git status --short` shows two `R` (rename) lines only.

```bash
git commit -m "refactor(frontend): move catalogue category routes under equipment/"
```

- [ ] **Step 2: Fix the category page JSON-LD URLs and add imports**

File: `src/pages/[lang]/catalogue/equipment/[category]/index.astro`.

Replace the content-utils import (lines 9-19) with:

```astro
import {
	filterByCategory,
	filterByLocale,
	getCategoriesForLocale,
	getProducts,
	getSlug,
	type Locale,
	sortByOrder,
} from "@/lib/content-utils";
import { categoryUrl, productUrl } from "@/lib/catalogue-urls";
```

(This also drops the unused `EquipmentType`, `getCategory`, `getLocale` imports that Biome flagged.)

Replace the `itemListElement` mapping (lines 86-96) with:

```astro
		itemListElement: sortedProducts.map((product, index) => ({
			"@type": "ListItem",
			position: index + 1,
			url: new URL(productUrl(lang as Lang, categorySlug, getSlug(product)), siteUrl).href,
			name: product.data.title,
			description: product.data.description,
		})),
```

- [ ] **Step 3: Point the category page sidebar at the new URLs**

`CatalogueSidebar.astro` line 77 still builds the old URL. Edit it now so this commit is internally consistent (the file is rewritten in Task 5).

In `src/components/catalogue/CatalogueSidebar.astro`, add to the frontmatter imports (after line 3):

```ts
import { categoryUrl } from "@/lib/catalogue-urls";
```

and change line 77 from:

```astro
							href={`/${lang}/catalogue/${cat.slug}`}
```

to:

```astro
							href={categoryUrl(lang, cat.slug)}
```

- [ ] **Step 4: Update the product page**

File: `src/pages/[lang]/catalogue/equipment/[category]/[slug].astro`.

Add after the `structured-data` import (line 11):

```ts
import { categoryUrl } from "@/lib/catalogue-urls";
```

Change the breadcrumb line (line 93) from:

```ts
		{ name: categoryTitle, url: new URL(`/${lang}/catalogue/${category}/`, siteUrl).href },
```

to:

```ts
		{ name: categoryTitle, url: new URL(`${categoryUrl(lang, category)}/`, siteUrl).href },
```

- [ ] **Step 5: Update `ProductCard.astro`**

Replace the import on line 4 and the URL block (lines 21-24).

Line 4:

```ts
import { productUrl } from "@/lib/catalogue-urls";
import { type EquipmentEntry, getCategory, getSlug } from "@/lib/content-utils";
```

Lines 21-24 become:

```ts
// Build product URL
const href = productUrl(lang, getCategory(product), getSlug(product));
```

and change `href={productUrl}` (line 73) to `href={href}`.

- [ ] **Step 6: Update `RelatedEquipment.astro`**

Add after line 3:

```ts
import { productUrl } from "@/lib/catalogue-urls";
```

and change line 45 from:

```ts
						const itemUrl = `/${lang}/catalogue/${itemCategory}/${itemSlug}`;
```

to:

```ts
						const itemUrl = productUrl(lang, itemCategory, itemSlug);
```

- [ ] **Step 7: Update `Header.astro` (Catalogue item and its active pattern)**

Add to the frontmatter imports (after line 4):

```ts
import { categoryUrl } from "@/lib/catalogue-urls";
```

Change line 22 from:

```ts
	{ href: `/${lang}/catalogue/checkweigher`, label: _("Catalogue"), pattern: "/catalogue" },
```

to:

```ts
	{ href: categoryUrl(lang, "checkweigher"), label: _("Catalogue"), pattern: "/catalogue/equipment" },
```

The Industries item is handled in Task 7.

- [ ] **Step 8: Update `AboutHero.astro` and `NotFoundContent.astro`**

`src/components/about/AboutHero.astro`: add `import { categoryUrl } from "@/lib/catalogue-urls";` after line 14 (the `types` import) and change line 118 from

```astro
						href={`/${lang}/catalogue/checkweigher`}
```

to

```astro
						href={categoryUrl(lang, "checkweigher")}
```

`src/components/errors/NotFoundContent.astro`: add `import { categoryUrl } from "@/lib/catalogue-urls";` after line 3 and change line 40 from

```astro
			href={`/${lang}/catalogue/checkweigher`}
```

to

```astro
			href={categoryUrl(lang, "checkweigher")}
```

- [ ] **Step 9: Update the CMS preview path**

In `src/pages/admin/_config.template.yml` line 207, change:

```yaml
    preview_path: "{{locale}}/catalogue/{{dirname}}/{{filename}}"
```

to:

```yaml
    preview_path: "{{locale}}/catalogue/equipment/{{dirname}}/{{filename}}"
```

- [ ] **Step 10: Update URL fixtures in `tests/lib/structured-data.test.ts`**

Change three strings to the new scheme:

- line 63: `"https://ocs.com.ua/en/catalogue/checkweigher/"` becomes `"https://ocs.com.ua/en/catalogue/equipment/checkweigher/"`

- line 70: `"https://ocs.com.ua/en/catalogue/checkweigher/"` becomes `"https://ocs.com.ua/en/catalogue/equipment/checkweigher/"`

- line 78: `"https://ocs.com.ua/en/catalogue/catchweigher/hc-sl/"` becomes `"https://ocs.com.ua/en/catalogue/equipment/catchweigher/hc-sl/"`

- [ ] **Step 11: Verify no old-scheme link remains in source**

Run (PowerShell): `Get-ChildItem src -Recurse -Include *.astro,*.ts,*.yml | Select-String -Pattern 'catalogue/\$\{|catalogue/checkweigher'`
Expected: no output (the only places that build `catalogue/` paths are now `catalogue-urls.ts` and the `equipment`/`industry` literals).

- [ ] **Step 12: Run tests, type check and build**

Run: `bun test`
Expected: 224+ pass (213 baseline plus the Task 1-2 additions), 0 fail.

Run: `bunx astro check`
Expected: 0 errors.

Run: `bunx astro build 2>&1 | Select-Object -Last 15`
Expected: build succeeds; `dist/client/en/catalogue/equipment/checkweigher/index.html` and `dist/client/en/catalogue/equipment/checkweigher/hc-m/index.html` exist (`Test-Path` both).

- [ ] **Step 13: Lint touched files**

Run:

```bash
bunx biome check "src/pages/[lang]/catalogue/equipment" src/components/catalogue/ProductCard.astro src/components/catalogue/RelatedEquipment.astro src/components/catalogue/CatalogueSidebar.astro src/components/Header.astro src/components/about/AboutHero.astro src/components/errors/NotFoundContent.astro tests/lib/structured-data.test.ts
```

Expected: no diagnostics. For import-order complaints run the same command with `--write`.

- [ ] **Step 14: Commit**

```bash
git add -A src tests
git commit -m "feat(frontend): serve categories and products under /catalogue/equipment"
```

______________________________________________________________________

### Task 4: Redirects from the old URLs

**Files:**

- Create: `scripts/catalogue-redirects.mjs`

- Modify: `astro.config.mjs`

- Test: `tests/scripts/catalogue-redirects.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/scripts/catalogue-redirects.test.ts`:

```ts
import { describe, expect, it } from "bun:test";
import { existsSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import equipmentTypes from "@/data/equipment-types.json";
import { buildCatalogueRedirects } from "../../scripts/catalogue-redirects.mjs";

const ROOT = resolve(import.meta.dir, "../..");
const CONTENT_DIR = join(ROOT, "src/content/equipment");
const redirects: Record<string, string> = buildCatalogueRedirects(ROOT);
const LANGS = ["en", "ua"] as const;

describe("catalogue redirects", () => {
	it("sends every old category URL to its new category page", () => {
		for (const lang of LANGS) {
			for (const { slug } of equipmentTypes[lang].categories) {
				expect(redirects[`/${lang}/catalogue/${slug}`]).toBe(
					`/${lang}/catalogue/equipment/${slug}`
				);
			}
		}
	});

	it("sends every old product URL to a product page that exists", () => {
		const productRedirects = Object.entries(redirects).filter(
			([from]) => from.split("/").length === 5
		);
		expect(productRedirects.length).toBeGreaterThan(0);

		for (const [from, to] of productRedirects) {
			const [, lang, , category, product] = from.split("/");
			expect(to).toBe(`/${lang}/catalogue/equipment/${category}/${product}`);
			expect(existsSync(join(CONTENT_DIR, category, `${product}.${lang}.md`))).toBe(true);
		}
	});

	it("covers every product file in the content folders", () => {
		const missing: string[] = [];
		for (const category of readdirSync(CONTENT_DIR)) {
			for (const file of readdirSync(join(CONTENT_DIR, category))) {
				const match = file.match(/^([^_].*)\.(en|ua)\.md$/);
				if (match && !redirects[`/${match[2]}/catalogue/${category}/${match[1]}`]) {
					missing.push(`${category}/${file}`);
				}
			}
		}
		expect(missing).toEqual([]);
	});

	it("never redirects to an old-scheme URL", () => {
		for (const to of Object.values(redirects)) {
			expect(to).toContain("/catalogue/equipment/");
		}
	});
});
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `bun test tests/scripts/catalogue-redirects.test.ts`
Expected: FAIL, `Cannot find module '../../scripts/catalogue-redirects.mjs'`.

- [ ] **Step 3: Implement the module**

Create `scripts/catalogue-redirects.mjs`. It is plain JS (the Astro config cannot rely on TS imports) and only reads data, so new categories and products need no manual entry.

```js
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const LANGS = ["en", "ua"];

/**
 * Old catalogue URLs mapped to the /catalogue/equipment/ scheme:
 *   /{lang}/catalogue/{category}           -> /{lang}/catalogue/equipment/{category}
 *   /{lang}/catalogue/{category}/{product} -> /{lang}/catalogue/equipment/{category}/{product}
 * Built from equipment-types.json and the content folders under `root` (the frontend folder).
 */
export function buildCatalogueRedirects(root) {
	const types = JSON.parse(readFileSync(join(root, "src/data/equipment-types.json"), "utf8"));
	const contentDir = join(root, "src/content/equipment");
	const redirects = {};

	for (const lang of LANGS) {
		for (const { slug: category } of types[lang]?.categories ?? []) {
			redirects[`/${lang}/catalogue/${category}`] = `/${lang}/catalogue/equipment/${category}`;

			// A category can exist before it has any product folder
			const categoryDir = join(contentDir, category);
			if (!existsSync(categoryDir)) continue;

			for (const file of readdirSync(categoryDir)) {
				const match = file.match(new RegExp(`^([^_].*)\\.${lang}\\.md$`));
				if (!match) continue;
				redirects[`/${lang}/catalogue/${category}/${match[1]}`] =
					`/${lang}/catalogue/equipment/${category}/${match[1]}`;
			}
		}
	}

	return redirects;
}
```

- [ ] **Step 4: Run it and confirm it passes**

Run: `bun test tests/scripts/catalogue-redirects.test.ts`
Expected: PASS, 4 tests.

- [ ] **Step 5: Wire it into `astro.config.mjs`**

Add imports after line 3 (keep existing imports; Biome will order them):

```js
import { fileURLToPath } from "node:url";
```

and after the `defineConfig, envField` import (line 7):

```js
import { buildCatalogueRedirects } from "./scripts/catalogue-redirects.mjs";
```

Inside `defineConfig({ ... })`, add after `output: "static",` (line 12):

```js
	// Old /catalogue/{category}[/{product}] URLs -> /catalogue/equipment/...; static output emits meta-refresh pages
	redirects: buildCatalogueRedirects(fileURLToPath(new URL(".", import.meta.url))),
```

- [ ] **Step 6: Verify in a real build**

Run: `bunx astro build 2>&1 | Select-Object -Last 15`
Expected: succeeds.

Run: `Get-Content dist/client/en/catalogue/checkweigher/index.html`
Expected: contains `http-equiv="refresh"` and a target of `/en/catalogue/equipment/checkweigher`.

Run: `Test-Path dist/client/ua/catalogue/checkweigher/hc-m/index.html`
Expected: `True`.

- [ ] **Step 7: Check the sitemap**

Run: `Select-String -Path "dist/client/sitemap-0.xml" -Pattern 'catalogue/checkweigher|catalogue/catchweigher'`
Expected: no match (old redirect pages must not be listed).

If there are matches, add this to the `sitemap({ filter })` in `astro.config.mjs` so redirect stubs stay out:

```js
filter: (page) => {
	const path = new URL(page).pathname;
	if (/^\/((admin|404|50x)\/?)?$/.test(path)) return false;
	// Old catalogue URLs only redirect
	return !/^\/(en|ua)\/catalogue\/(?!equipment\/|industry\/)/.test(path);
},
```

and re-run the build and this check.

- [ ] **Step 8: Lint and commit**

Run: `bunx biome check astro.config.mjs scripts/catalogue-redirects.mjs tests/scripts/catalogue-redirects.test.ts` (expect no diagnostics; use `--write` for import order).

```bash
git add astro.config.mjs scripts/catalogue-redirects.mjs tests/scripts/catalogue-redirects.test.ts
git commit -m "feat(frontend): redirect old catalogue URLs to the equipment scheme"
```

______________________________________________________________________

### Task 5: `CatalogueBand`, accordion sidebar, category page refactor

This is the largest task. There is no DOM test environment in this repo, so the browser behaviour is verified by the checklist in Task 9. Industry links in the sidebar 404 until Task 6.

**Files:**

- Create: `src/components/catalogue/CatalogueBand.astro`

- Rewrite: `src/components/catalogue/CatalogueSidebar.astro`

- Rewrite: `src/pages/[lang]/catalogue/equipment/[category]/index.astro`

- Modify: `src/pages/[lang]/catalogue/equipment/[category]/[slug].astro`

- Regenerate: `locales/messages.pot`, `locales/ua.po`, `src/i18n/ui.ts`

- [ ] **Step 1: Create `CatalogueBand.astro`**

```astro
---
import type { Lang } from "@/i18n";
import type { EquipmentType, Industry } from "@/lib/content-utils";
import CatalogueSidebar from "./CatalogueSidebar.astro";

interface Props {
	allCategories: EquipmentType[];
	allIndustries: Industry[];
	section: "equipment" | "industry";
	activeSlug: string;
	lang: Lang;
}
---

{/* Muted band: white sidebar and product cards stand out against it */}
<section class="bg-surface-container w-full scroll-mt-32 py-12 lg:py-20" data-catalogue-band>
	<div class="px-edge-margin mx-auto flex max-w-[1600px] gap-8">
		<CatalogueSidebar {...Astro.props} />

		{/* Swapped in place when the sidebar switches page (see the CatalogueSidebar script) */}
		<div
			class="min-w-0 flex-1 transition-opacity duration-200 aria-busy:opacity-60"
			data-catalogue-results
		>
			<slot />
		</div>
	</div>
</section>

<script>
	import { revealOnce } from "@/lib/anims/reveal-once";

	document
		.querySelectorAll<HTMLElement>("[data-product-grid]")
		.forEach((grid) => revealOnce(grid, 0.1));
</script>
```

- [ ] **Step 2: Rewrite `CatalogueSidebar.astro`**

Replace the whole file. Markup changes: the flat category list becomes two sections, each a header button plus a collapsible panel. The mobile filter button, overlay, drawer shell, header and CTA are unchanged.

```astro
---
import { getInlineTranslations, type Lang } from "@/i18n";
import { categoryUrl, industryUrl } from "@/lib/catalogue-urls";
import type { EquipmentType, Industry } from "@/lib/content-utils";

interface Props {
	allCategories: EquipmentType[];
	allIndustries: Industry[];
	/** Which accordion section renders open */
	section: "equipment" | "industry";
	/** Slug of the active category (equipment) or industry (industry) */
	activeSlug: string;
	lang: Lang;
}

const { allCategories, allIndustries, section, activeSlug, lang } = Astro.props;
const _ = getInlineTranslations(lang);

// Array order is the display order
const sections = [
	{
		id: "equipment",
		label: _("Equipment Categories"),
		navLabel: _("Category navigation"),
		items: allCategories,
		hrefFor: (slug: string) => categoryUrl(lang, slug),
	},
	{
		id: "industry",
		label: _("Industries"),
		navLabel: _("Industry navigation"),
		items: allIndustries,
		hrefFor: (slug: string) => industryUrl(lang, slug),
	},
];
---

{/* Mobile Filter Button */}
<button
	id="mobile-filter-toggle"
	class="bg-background border-border-subtle text-foreground hover:border-secondary/40 focus-visible:outline-secondary fixed right-6 bottom-6 z-40 flex items-center gap-2 rounded-full border px-6 py-3 shadow-lg transition-all hover:shadow-xl focus-visible:outline-2 focus-visible:outline-offset-2 lg:hidden"
	aria-label={_("Open filters")}
>
	<span class="material-symbols-outlined text-[20px]">filter_list</span>
	<span class="text-sm font-medium">{_("Filters")}</span>
</button>

{/* Mobile Filter Overlay */}
<div
	id="mobile-filter-overlay"
	class="fixed inset-0 z-50 hidden bg-black/50 backdrop-blur-sm lg:hidden"
	aria-hidden="true"
>
</div>

{/* Desktop Sidebar & Mobile Drawer */}
<aside
	id="catalogue-sidebar"
	class="fixed inset-y-0 left-0 z-50 w-80 -translate-x-full transition-transform duration-300 lg:sticky lg:top-24 lg:z-10 lg:h-fit lg:w-72 lg:flex-shrink-0 lg:translate-x-0"
>
	<div
		class="bg-background border-border-subtle/70 before:from-secondary relative h-full w-full overflow-y-auto rounded-none border-r px-5 py-8 shadow-xs before:absolute before:inset-x-0 before:top-0 before:h-0.5 before:bg-linear-to-r before:to-transparent lg:rounded-xl lg:border lg:px-6"
	>
		{/* Close button (mobile only) */}
		<button
			id="mobile-filter-close"
			class="text-muted-foreground hover:text-foreground absolute top-4 right-4 transition-colors lg:hidden"
			aria-label={_("Close filters")}
		>
			<span class="material-symbols-outlined text-[24px]">close</span>
		</button>
		{/* Header with generous spacing */}
		<div class="mb-6 px-2">
			<h2 class="font-headline-lg text-foreground mb-1 text-xl font-semibold tracking-tight">
				{_("Catalogue Filters")}
			</h2>
			<p class="font-technical-data text-industrial-gray text-xs tracking-wide">
				{_("Technical Specs")}
			</p>
		</div>

		{/* Exclusive accordion: opening one section closes the other */}
		<div class="space-y-3">
			{
				sections.map((s) => {
					const open = s.id === section;

					return (
						<div data-sidebar-section={s.id} data-open={open ? "true" : "false"}>
							<h3 class="m-0">
								<button
									type="button"
									id={`sidebar-trigger-${s.id}`}
									data-sidebar-toggle
									aria-expanded={open ? "true" : "false"}
									aria-controls={`sidebar-body-${s.id}`}
									class="font-label-caps text-secondary focus-visible:outline-secondary flex w-full cursor-pointer items-center gap-3 rounded-lg px-2 py-2 text-left text-xs font-semibold tracking-widest uppercase focus-visible:outline-2 focus-visible:outline-offset-2"
								>
									<span class="eyebrow-rule bg-secondary h-px w-6" aria-hidden="true" />
									<span class="flex-1">{s.label}</span>
									<svg
										xmlns="http://www.w3.org/2000/svg"
										width="16"
										height="16"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										stroke-width="2"
										stroke-linecap="round"
										stroke-linejoin="round"
										class="sidebar-chevron"
										aria-hidden="true"
									>
										<path d="m6 9 6 6 6-6" />
									</svg>
								</button>
							</h3>

							{/* Grid-rows transition: 0fr (closed) to 1fr (open); the body is `hidden` when closed */}
							<div class="sidebar-panel">
								<div
									id={`sidebar-body-${s.id}`}
									data-sidebar-body
									class="min-h-0 overflow-hidden"
									hidden={!open}
								>
									<nav aria-label={s.navLabel} class="space-y-1.5 px-0.5 py-1">
										{s.items.map((item) => {
											const isActive = open && item.slug === activeSlug;

											return (
												<a
													href={s.hrefFor(item.slug)}
													aria-current={isActive ? "page" : undefined}
													class={`focus-visible:outline-secondary flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 transition-all focus-visible:outline-2 focus-visible:outline-offset-2 ${
														isActive
															? "border-secondary/30 bg-secondary/10 text-secondary font-bold"
															: "text-industrial-gray hover:bg-surface-container hover:border-border-subtle/60 border-transparent hover:translate-x-1"
													}`}
												>
													<span class="material-symbols-outlined text-[20px]">
														{item.icon || "category"}
													</span>
													<span class="font-technical-data text-xs tracking-wider uppercase">
														{item.title}
													</span>
												</a>
											);
										})}
									</nav>
								</div>
							</div>
						</div>
					);
				})
			}
		</div>

		{/* CTA button */}
		<div class="border-border-subtle/60 mt-8 border-t px-2 pt-6">
			<a
				href={`/${lang}/contact`}
				class="group bg-primary text-primary-foreground focus-visible:outline-secondary flex w-full items-center justify-center gap-2 rounded-lg px-4 py-3 text-[15px] font-medium shadow-xs transition-[opacity,box-shadow] hover:opacity-90 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2"
			>
				{_("Contact Us")}
				<svg
					xmlns="http://www.w3.org/2000/svg"
					width="16"
					height="16"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
					class="lucide lucide-arrow-right transition-transform duration-200 group-hover:translate-x-1"
				>
					<path d="M5 12h14"></path>
					<path d="m12 5 7 7-7 7"></path>
				</svg>
			</a>
		</div>
	</div>
</aside>

<style>
	.sidebar-panel {
		display: grid;
		grid-template-rows: 0fr;
	}
	[data-open="true"] > .sidebar-panel {
		grid-template-rows: 1fr;
	}
	.sidebar-chevron {
		transition: none;
	}
	[data-open="true"] .sidebar-chevron {
		rotate: 180deg;
	}

	@media (prefers-reduced-motion: no-preference) {
		.sidebar-panel {
			transition: grid-template-rows 0.3s cubic-bezier(0.22, 1, 0.36, 1);
		}
		.sidebar-chevron {
			transition: rotate 0.3s cubic-bezier(0.22, 1, 0.36, 1);
		}
	}
</style>

<script>
	import { revealOnce } from "@/lib/anims/reveal-once";

	const toggleBtn = document.getElementById("mobile-filter-toggle");
	const closeBtn = document.getElementById("mobile-filter-close");
	const overlay = document.getElementById("mobile-filter-overlay");
	const sidebar = document.getElementById("catalogue-sidebar");

	function openFilters() {
		sidebar?.classList.remove("-translate-x-full");
		overlay?.classList.remove("hidden");
		document.body.style.overflow = "hidden";
	}

	function closeFilters() {
		sidebar?.classList.add("-translate-x-full");
		overlay?.classList.add("hidden");
		document.body.style.overflow = "";
	}

	toggleBtn?.addEventListener("click", openFilters);
	closeBtn?.addEventListener("click", closeFilters);
	overlay?.addEventListener("click", closeFilters);

	const trimSlash = (path: string) => path.replace(/\/+$/, "");
	const getResults = () => document.querySelector<HTMLElement>("[data-catalogue-results]");
	const prefersReducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
	const getSections = () =>
		Array.from(sidebar?.querySelectorAll<HTMLElement>("[data-sidebar-section]") ?? []);

	/*
	 * Accordion. A section is open when data-open="true"; the CSS grid-rows transition animates
	 * the height. The body keeps the `hidden` attribute while closed, so its links are not
	 * reachable by keyboard or screen readers. It is removed before opening and set again once
	 * the closing transition has finished.
	 */
	const hideTimers = new WeakMap<HTMLElement, number>();

	function setSectionOpen(section: HTMLElement, open: boolean) {
		if ((section.dataset.open === "true") === open) return;

		const trigger = section.querySelector<HTMLElement>("[data-sidebar-toggle]");
		const body = section.querySelector<HTMLElement>("[data-sidebar-body]");
		if (!trigger || !body) return;

		window.clearTimeout(hideTimers.get(body));
		trigger.setAttribute("aria-expanded", String(open));

		if (open) {
			body.hidden = false;
			// Flush styles so the 0fr to 1fr transition starts from the collapsed state
			void body.offsetHeight;
			section.dataset.open = "true";
			return;
		}

		section.dataset.open = "false";
		if (prefersReducedMotion()) {
			body.hidden = true;
			return;
		}
		hideTimers.set(
			body,
			window.setTimeout(() => {
				body.hidden = true;
			}, 320)
		);
	}

	function revealGrids() {
		document
			.querySelectorAll<HTMLElement>("[data-product-grid]")
			.forEach((grid) => revealOnce(grid, 0.1));
	}

	/*
	 * In-place page switching. On a category or industry page the sidebar swaps the hero and the
	 * results instead of reloading, so scroll position and keyboard focus survive. Product pages
	 * have no results container, so their sidebar links navigate normally. Any failure falls back
	 * to a regular navigation.
	 */
	let shownPath = trimSlash(location.pathname);
	let inflight: AbortController | undefined;

	function syncChrome(next: Document) {
		// Sidebar: copy the active-state classes onto the existing links so focus is not lost
		const nextLinks = Array.from(
			next.querySelectorAll<HTMLAnchorElement>("#catalogue-sidebar nav a")
		);
		sidebar?.querySelectorAll<HTMLAnchorElement>("nav a").forEach((link) => {
			const match = nextLinks.find((n) => n.getAttribute("href") === link.getAttribute("href"));
			if (!match) return;
			link.className = match.className;
			const current = match.getAttribute("aria-current");
			if (current) link.setAttribute("aria-current", current);
			else link.removeAttribute("aria-current");
		});

		// Open section follows the fetched page, so back/forward always shows the right one
		next.querySelectorAll<HTMLElement>("[data-sidebar-section]").forEach((nextSection) => {
			const live = getSections().find(
				(s) => s.dataset.sidebarSection === nextSection.dataset.sidebarSection
			);
			if (live) setSectionOpen(live, nextSection.dataset.open === "true");
		});

		// Header links: hrefs depend on the current path (language switcher), classes carry the
		// active-page underline
		const headerLinks = document.querySelectorAll<HTMLAnchorElement>("#main-header a");
		const nextHeaderLinks = next.querySelectorAll<HTMLAnchorElement>("#main-header a");
		if (headerLinks.length === nextHeaderLinks.length) {
			headerLinks.forEach((link, i) => {
				const nextLink = nextHeaderLinks[i];
				const href = nextLink?.getAttribute("href");
				if (href) link.setAttribute("href", href);
				if (nextLink) link.className = nextLink.className;
			});
		}

		// Footer share links point at the current page
		const nextFooter = next.querySelector("footer");
		if (nextFooter) document.querySelector("footer")?.replaceWith(nextFooter);

		document.title = next.title;
	}

	async function swapPage(href: string, push: boolean) {
		const results = getResults();
		if (!results) {
			location.assign(href);
			return;
		}

		inflight?.abort();
		const controller = new AbortController();
		inflight = controller;
		results.setAttribute("aria-busy", "true");

		try {
			const response = await fetch(href, { signal: controller.signal });
			if (!response.ok) throw new Error(`HTTP ${response.status}`);

			const next = new DOMParser().parseFromString(await response.text(), "text/html");
			const nextResults = next.querySelector("[data-catalogue-results]");
			const nextHero = next.querySelector("[data-catalogue-hero]");
			const hero = document.querySelector<HTMLElement>("[data-catalogue-hero]");
			if (!nextResults || !nextHero || !hero) throw new Error("Unexpected page");

			hero.innerHTML = nextHero.innerHTML;
			// The hero is usually off screen after a click, so do not replay its intro animation
			hero.querySelectorAll<HTMLElement>(".hero-rise").forEach((el) => {
				el.style.animation = "none";
			});

			results.innerHTML = nextResults.innerHTML;
			revealGrids();

			syncChrome(next);

			const url = new URL(href, location.href);
			if (push) history.pushState({ catalogue: true }, "", url);
			shownPath = trimSlash(url.pathname);

			// Keep the scroll position, unless the new list starts above the viewport
			const band = document.querySelector<HTMLElement>("[data-catalogue-band]");
			if (push && band && band.getBoundingClientRect().top < 0) {
				band.scrollIntoView({
					block: "start",
					behavior: prefersReducedMotion() ? "auto" : "smooth",
				});
			}

			results.removeAttribute("aria-busy");
		} catch (error) {
			if ((error as Error).name === "AbortError") return;
			location.assign(href);
		}
	}

	sidebar?.addEventListener("click", (event) => {
		const target = event.target as Element;

		// Header buttons only toggle; they never navigate
		const toggle = target.closest<HTMLElement>("[data-sidebar-toggle]");
		if (toggle) {
			const clicked = toggle.closest<HTMLElement>("[data-sidebar-section]");
			const willOpen = clicked?.dataset.open !== "true";
			getSections().forEach((s) => {
				setSectionOpen(s, s === clicked && willOpen);
			});
			return;
		}

		const link = target.closest<HTMLAnchorElement>("nav a");
		if (!link) return;

		if (window.innerWidth < 1024) closeFilters();

		// Product pages and modified clicks (new tab, etc.) navigate normally
		if (!getResults()) return;
		if (event.defaultPrevented || event.button !== 0) return;
		if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

		const url = new URL(link.href, location.href);
		if (url.origin !== location.origin) return;

		event.preventDefault();
		if (trimSlash(url.pathname) === shownPath) return;
		swapPage(url.href, true);
	});

	window.addEventListener("popstate", () => {
		if (!getResults() || trimSlash(location.pathname) === shownPath) return;
		swapPage(location.href, false);
	});
</script>
```

- [ ] **Step 3: Rewrite the category page to use `CatalogueBand`**

Replace the whole of `src/pages/[lang]/catalogue/equipment/[category]/index.astro`:

```astro
---
import { getCollection } from "astro:content";
import CatalogueBand from "@/components/catalogue/CatalogueBand.astro";
import CategoryHeader from "@/components/catalogue/CategoryHeader.astro";
import ProductCard from "@/components/catalogue/ProductCard.astro";
import { getInlineTranslations, getIsoLang, type Lang } from "@/i18n";
import Layout from "@/layouts/Layout.astro";
import { productUrl } from "@/lib/catalogue-urls";
import {
	filterByCategory,
	filterByLocale,
	getCategoriesForLocale,
	getIndustriesForLocale,
	getProducts,
	getSlug,
	type Locale,
	sortByOrder,
} from "@/lib/content-utils";
import { breadcrumbSchema } from "@/lib/structured-data";

export async function getStaticPaths() {
	const allEquipment = await getCollection("equipment");
	const allProducts = getProducts(allEquipment);

	// Categories are sourced from JSON, not _index entries
	const enCategories = getCategoriesForLocale("en");
	const uaCategories = getCategoriesForLocale("ua");

	const paths = [];

	for (const cat of enCategories) {
		for (const lang of ["en", "ua"] as Locale[]) {
			const localeCategories = lang === "en" ? enCategories : uaCategories;
			const categoryData = localeCategories.find((c) => c.slug === cat.slug);
			if (!categoryData) continue;

			const localeProducts = filterByLocale(allProducts, lang);
			const categoryProducts = filterByCategory(localeProducts, cat.slug);

			paths.push({
				params: { lang, category: cat.slug },
				props: {
					categoryData,
					categorySlug: cat.slug,
					products: categoryProducts || [],
					allCategories: localeCategories,
					allIndustries: getIndustriesForLocale(lang),
					lang,
				},
			});
		}
	}

	return paths;
}

const {
	categoryData,
	categorySlug,
	products = [],
	allCategories = [],
	allIndustries = [],
	lang,
} = Astro.props;
const _ = getInlineTranslations(lang as Lang);

// Sort products by order field; categories keep their JSON array order
const sortedProducts = Array.isArray(products) ? sortByOrder(products) : [];
const sortedCategories = Array.isArray(allCategories) ? allCategories : [];

// Page metadata - with fallback for missing categoryData
const pageTitle = `${categoryData?.title || "Equipment"} | ${lang === "en" ? "OS-Technology" : "ОС-Технолоджи"}`;
const pageDescription = categoryData?.description || "";

// Structured data for SEO
const siteUrl = Astro.site || "https://ocs.com.ua";
const currentUrl = new URL(Astro.url.pathname, siteUrl).href;

const structuredData = {
	"@context": "https://schema.org",
	"@type": "CollectionPage",
	name: categoryData?.title || "Equipment",
	description: categoryData?.description || "",
	url: currentUrl,
	inLanguage: getIsoLang(lang as Lang),
	// There is no /catalogue/ index page, so the trail goes straight from Home to the category
	breadcrumb: breadcrumbSchema([
		{ name: lang === "en" ? "Home" : "Головна", url: new URL(`/${lang}/`, siteUrl).href },
		{ name: categoryData?.title || categorySlug, url: currentUrl },
	]),
	mainEntity: {
		"@type": "ItemList",
		numberOfItems: sortedProducts.length,
		itemListElement: sortedProducts.map((product, index) => ({
			"@type": "ListItem",
			position: index + 1,
			url: new URL(productUrl(lang as Lang, categorySlug, getSlug(product)), siteUrl).href,
			name: product.data.title,
			description: product.data.description,
		})),
	},
};
---

<Layout title={pageTitle} description={pageDescription}>
	<script is:inline type="application/ld+json" set:html={JSON.stringify(structuredData)} />

	<CategoryHeader categoryData={categoryData} lang={lang as Lang} />

	<CatalogueBand
		allCategories={sortedCategories}
		allIndustries={allIndustries}
		section="equipment"
		activeSlug={categorySlug}
		lang={lang as Lang}
	>
		<section aria-label={_("Products")}>
			{
				sortedProducts.length > 0 ? (
					<div
						data-product-grid
						class="gap-gutter grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3"
					>
						{sortedProducts.map((product, index) => (
							<ProductCard product={product} lang={lang as Lang} index={index} />
						))}
					</div>
				) : (
					<div class="text-industrial-gray py-24 text-center">
						<p class="text-lg">{_("No products available in this category")}</p>
					</div>
				)
			}
		</section>
	</CatalogueBand>
</Layout>
```

- [ ] **Step 4: Update the product page to the new sidebar props**

File: `src/pages/[lang]/catalogue/equipment/[category]/[slug].astro`.

Add `getIndustriesForLocale` to the content-utils import (keep alphabetical): after `getCategoriesForLocale,` insert `getIndustriesForLocale,`.

In `getStaticPaths`, after `const allCategories = getCategoriesForLocale(locale);` add:

```ts
		const allIndustries = getIndustriesForLocale(locale);
```

and change the props line to:

```ts
			props: { product, lang: locale, allCategories, allIndustries, relatedProducts },
```

In `interface Props`, after `allCategories: ...;` add:

```ts
	allIndustries: ReturnType<typeof getIndustriesForLocale>;
```

Change the destructuring line to:

```ts
const { product, lang, allCategories, allIndustries, relatedProducts = [] } = Astro.props;
```

Replace the sidebar usage (the `<CatalogueSidebar ... />` block) with:

```astro
			<CatalogueSidebar
				allCategories={allCategories}
				allIndustries={allIndustries}
				section="equipment"
				activeSlug={category}
				lang={lang as Lang}
			/>
```

(The product page keeps its own markup and does not use `CatalogueBand`: it has no `data-catalogue-results`, so sidebar links navigate normally.)

- [ ] **Step 5: Add the one new Ukrainian string**

The only new `_()` string is `"Industry navigation"`.

Run: `bun run i18n:extract`
Expected: `locales/messages.pot` and `locales/ua.po` gain a `msgid "Industry navigation"` entry with an empty `msgstr` in `ua.po`.

Open `locales/ua.po`, find the new entry and set:

```po
msgid "Industry navigation"
msgstr "Навігація за галузями"
```

Run: `bun run i18n:compile`
Expected: `src/i18n/ui.ts` updated with `"inline.industry_navigation"` in both languages.

If `node` is not on PATH, run the two scripts with `bun scripts/i18n-extract-po.js` and `bun scripts/i18n-compile.js` instead.

- [ ] **Step 6: Format the rewritten and new Astro files**

Run:

```bash
bunx prettier --write src/components/catalogue/CatalogueBand.astro src/components/catalogue/CatalogueSidebar.astro "src/pages/[lang]/catalogue/equipment/[category]/index.astro"
bunx biome check --write src/components/catalogue "src/pages/[lang]/catalogue/equipment"
```

Expected: second command reports no remaining diagnostics. Do not run Prettier on `ProductCard.astro`, `RelatedEquipment.astro` or `[slug].astro` (they were not rewritten).

- [ ] **Step 7: Run tests, type check, build**

Run: `bun test`
Expected: all pass, including `tests/i18n/parity.test.ts` (this proves the new string is extracted, translated and compiled).

Run: `bunx astro check`
Expected: 0 errors.

Run: `bunx astro build 2>&1 | Select-Object -Last 10`
Expected: succeeds.

Run: `Select-String -Path "dist/client/en/catalogue/equipment/catchweigher/index.html" -Pattern 'data-sidebar-section="industry"','aria-expanded="false"','data-product-grid'`
Expected: all three patterns match (industry section rendered closed, equipment open, grid hook present).

Run: `Select-String -Path "dist/client/en/catalogue/equipment/catchweigher/index.html" -Pattern 'catalogue/equipment/catchweigher/hc-sl\b'`
Expected: matches (JSON-LD now has the clean slug and no double slash; `Select-String -Pattern 'hc-slen'` on the same file returns nothing).

- [ ] **Step 8: Commit**

```bash
git add -A src locales
git commit -m "feat(frontend): add Industries accordion to the catalogue sidebar"
```

______________________________________________________________________

### Task 6: Industry page

**Files:**

- Create: `src/pages/[lang]/catalogue/industry/[slug].astro`

- [ ] **Step 1: Create the page**

```astro
---
import { getCollection } from "astro:content";
import CatalogueBand from "@/components/catalogue/CatalogueBand.astro";
import CategoryHeader from "@/components/catalogue/CategoryHeader.astro";
import ProductCard from "@/components/catalogue/ProductCard.astro";
import { getInlineTranslations, getIsoLang, type Lang } from "@/i18n";
import Layout from "@/layouts/Layout.astro";
import { productUrl } from "@/lib/catalogue-urls";
import {
	filterByIndustry,
	filterByLocale,
	getCategoriesForLocale,
	getCategory,
	getIndustriesForLocale,
	getProducts,
	getSlug,
	groupByCategory,
	type Locale,
} from "@/lib/content-utils";
import { breadcrumbSchema } from "@/lib/structured-data";

export async function getStaticPaths() {
	const allProducts = getProducts(await getCollection("equipment"));

	return (["en", "ua"] as Locale[]).flatMap((lang) => {
		const allIndustries = getIndustriesForLocale(lang);
		const allCategories = getCategoriesForLocale(lang);
		const localeProducts = filterByLocale(allProducts, lang);

		return allIndustries.flatMap((industry) => {
			const products = filterByIndustry(localeProducts, industry.slug);
			// No empty pages: an industry only gets a route when the locale has a product for it
			if (products.length === 0) return [];

			return [
				{
					params: { lang, slug: industry.slug },
					props: {
						industry,
						groups: groupByCategory(products, allCategories),
						allCategories,
						allIndustries,
						lang,
					},
				},
			];
		});
	});
}

const { industry, groups, allCategories, allIndustries, lang } = Astro.props;
const _ = getInlineTranslations(lang as Lang);

const pageTitle = `${industry.title} | ${lang === "en" ? "OS-Technology" : "ОС-Технолоджи"}`;

const siteUrl = Astro.site || "https://ocs.com.ua";
const currentUrl = new URL(Astro.url.pathname, siteUrl).href;

// Flat list in the same order the groups are shown
const listedProducts = groups.flatMap((group) => group.products);

const structuredData = {
	"@context": "https://schema.org",
	"@type": "CollectionPage",
	name: industry.title,
	description: industry.description,
	url: currentUrl,
	inLanguage: getIsoLang(lang as Lang),
	// There is no /catalogue/ index page, so the trail goes straight from Home to the industry
	breadcrumb: breadcrumbSchema([
		{ name: lang === "en" ? "Home" : "Головна", url: new URL(`/${lang}/`, siteUrl).href },
		{ name: industry.title, url: currentUrl },
	]),
	mainEntity: {
		"@type": "ItemList",
		numberOfItems: listedProducts.length,
		itemListElement: listedProducts.map((product, index) => ({
			"@type": "ListItem",
			position: index + 1,
			url: new URL(productUrl(lang as Lang, getCategory(product), getSlug(product)), siteUrl)
				.href,
			name: product.data.title,
			description: product.data.description,
		})),
	},
};
---

<Layout title={pageTitle} description={industry.description}>
	<script is:inline type="application/ld+json" set:html={JSON.stringify(structuredData)} />

	<CategoryHeader categoryData={industry} lang={lang as Lang} />

	<CatalogueBand
		allCategories={allCategories}
		allIndustries={allIndustries}
		section="industry"
		activeSlug={industry.slug}
		lang={lang as Lang}
	>
		<section aria-label={_("Products")} class="space-y-12">
			{
				groups.map(({ category, products }) => (
					<section aria-labelledby={`industry-group-${category.slug}`}>
						<h2
							id={`industry-group-${category.slug}`}
							class="font-headline-lg text-foreground mb-6 flex items-center gap-3 text-xl font-semibold tracking-tight"
						>
							<span class="material-symbols-outlined text-secondary text-[22px]" aria-hidden="true">
								{category.icon || "category"}
							</span>
							{category.title}
						</h2>
						<div
							data-product-grid
							class="gap-gutter grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3"
						>
							{products.map((product, index) => (
								<ProductCard product={product} lang={lang as Lang} index={index} />
							))}
						</div>
					</section>
				))
			}
		</section>
	</CatalogueBand>
</Layout>
```

- [ ] **Step 2: Format and lint**

```bash
bunx prettier --write "src/pages/[lang]/catalogue/industry/[slug].astro"
bunx biome check --write "src/pages/[lang]/catalogue/industry"
```

Expected: no remaining diagnostics.

- [ ] **Step 3: Type check and build**

Run: `bunx astro check`
Expected: 0 errors.

Run: `bunx astro build 2>&1 | Select-Object -Last 10`
Expected: succeeds.

- [ ] **Step 4: Verify the generated pages**

Run: `Get-ChildItem dist/client/en/catalogue/industry, dist/client/ua/catalogue/industry | Select-Object FullName`
Expected: four folders per locale (`food-beverage`, `pharmaceutical`, `cosmetics`, `logistics`).

Run: `Select-String -Path "dist/client/en/catalogue/industry/logistics/index.html" -Pattern 'hc-sl','hc-warehouse','data-sidebar-section="industry" data-open="true"'`
Expected: all three match (both logistics products listed; industry section open).

Run: `Select-String -Path "dist/client/en/catalogue/industry/food-beverage/index.html" -Pattern 'ec-e','hc-a','hc-m'`
Expected: matches. In the HTML, the `Checkweighers` group heading appears once and `Catchweighers` does not (no catchweigher product is food-tagged).

Run: `Select-String -Path "dist/client/en/catalogue/industry/food-beverage/index.html" -Pattern 'id="productGrid"'`
Expected: no match (grid id replaced by the `data-product-grid` hook).

- [ ] **Step 5: Commit**

```bash
git add -A src
git commit -m "feat(frontend): add industry pages"
```

______________________________________________________________________

### Task 7: Header Industries link

Header currently points Industries at `/{lang}/catalogue`, which does not exist. Point it at the first listed industry.

**Files:**

- Modify: `src/components/Header.astro`

- [ ] **Step 1: Edit the nav links**

Change the imports added in Task 3:

```ts
import { categoryUrl, industryUrl } from "@/lib/catalogue-urls";
import { getIndustriesForLocale } from "@/lib/content-utils";
```

Replace the Industries entry (line 23) so the array reads:

```ts
const navLinks = [
	{ href: categoryUrl(lang, "checkweigher"), label: _("Catalogue"), pattern: "/catalogue/equipment" },
	{
		href: industryUrl(lang, getIndustriesForLocale(lang)[0].slug),
		label: _("Industries"),
		pattern: "/catalogue/industry",
	},
	{ href: `/${lang}/wiki`, label: _("Wiki"), pattern: "/wiki" },
	{ href: `/${lang}/about`, label: _("About Us"), pattern: "/about" },
];
```

The `[0]` access is safe: the integrity tests guarantee at least one industry per locale.

- [ ] **Step 2: Lint, type check, build**

Run: `bunx biome check --write src/components/Header.astro`
Expected: no remaining diagnostics (formatting of the long first entry may be adjusted automatically).

Run: `bunx astro check`
Expected: 0 errors.

Run: `bunx astro build 2>&1 | Select-Object -Last 5`
Expected: succeeds.

Run: `Select-String -Path "dist/client/ua/index.html" -Pattern '/ua/catalogue/industry/food-beverage','/ua/catalogue/equipment/checkweigher'`
Expected: both match.

- [ ] **Step 3: Commit**

```bash
git add src/components/Header.astro
git commit -m "feat(frontend): link the Industries nav item to the first industry page"
```

______________________________________________________________________

### Task 8: CMS (Decap)

**Files:**

- Modify: `src/cms/category-slugs.ts`, `src/pages/admin/_config.template.yml`, `src/pages/admin/config.yml.ts`, `package.json` (devDependency)

- Test: `tests/cms/category-slugs.test.ts`, `tests/data/integrity.test.ts`

- [ ] **Step 1: Add `immutable` as an explicit dev dependency (used only by the listener test)**

Run: `bun add -D immutable`
Expected: `package.json` and `bun.lock` updated.

- [ ] **Step 2: Write the failing slug-listener test**

Create `tests/cms/category-slugs.test.ts`:

```ts
import { describe, expect, it } from "bun:test";
import { fromJS } from "immutable";
import { categorySlugsListener } from "@/cms/category-slugs";

const run = (collection: string, data: unknown) => {
	const entry = fromJS({ collection, data });
	return (categorySlugsListener.handler as any)({ entry });
};

describe("categorySlugsListener", () => {
	it("generates category slugs from the EN title and mirrors them to UA", () => {
		const out = run("equipment-categories", {
			en: { categories: [{ title: "Metal Detectors" }] },
			ua: { categories: [{ title: "Металодетектори" }] },
		});
		expect(out.getIn(["en", "categories", 0, "slug"])).toBe("metal-detectors");
		expect(out.getIn(["ua", "categories", 0, "slug"])).toBe("metal-detectors");
	});

	it("generates industry slugs from the EN title and mirrors them to UA", () => {
		const out = run("equipment-categories", {
			en: { industries: [{ title: "Food & Beverage" }] },
			ua: { industries: [{ title: "Харчова промисловість" }] },
		});
		expect(out.getIn(["en", "industries", 0, "slug"])).toBe("food-beverage");
		expect(out.getIn(["ua", "industries", 0, "slug"])).toBe("food-beverage");
	});

	it("keeps an existing slug when the title changes", () => {
		const out = run("equipment-categories", {
			en: { industries: [{ title: "Renamed", slug: "cosmetics" }] },
			ua: { industries: [{ title: "Перейменовано" }] },
		});
		expect(out.getIn(["en", "industries", 0, "slug"])).toBe("cosmetics");
		expect(out.getIn(["ua", "industries", 0, "slug"])).toBe("cosmetics");
	});

	it("ignores other collections", () => {
		expect(run("equipment", { en: { industries: [{ title: "X" }] } })).toBeUndefined();
	});
});
```

- [ ] **Step 3: Run it and confirm the industry tests fail**

Run: `bun test tests/cms/category-slugs.test.ts`
Expected: the two industry tests FAIL (slug is `undefined`); the category and "other collections" tests pass.

- [ ] **Step 4: Generalize the listener**

In `src/cms/category-slugs.ts`, replace the `COLLECTION` line and the exported listener (lines 22-78) with:

```ts
const COLLECTION = "equipment-categories";

// Each file in the collection holds one list: equipment types or industries
const LIST_KEYS = ["categories", "industries"] as const;

function trimmedSlug(cat: Cat): string {
	const slug = cat.get("slug");
	return slug ? String(slug).trim() : "";
}

/**
 * Auto-generates hidden slugs for categories and industries from the EN title on save.
 * Existing slugs are preserved, and the same slug is synced to the UA list (matched by position).
 */
export const categorySlugsListener: Listener = {
	name: "preSave",
	handler: ({ entry }) => {
		try {
			if (entry.get("collection") !== COLLECTION) return;

			let data = entry.get("data") as EntryData | undefined;
			if (!data) return;

			for (const key of LIST_KEYS) {
				// 1. EN items: keep an existing slug, otherwise generate one from the title
				const enItems = (data.getIn(["en", key]) ?? data.get(key)) as CatList | undefined;
				enItems?.forEach((item, idx) => {
					const slug = trimmedSlug(item) || slugify(item.get("title"));
					if (!(slug && data)) return;
					if (data.hasIn(["en", key])) {
						data = data.setIn(["en", key, idx, "slug"], slug);
					}
					if (data.has(key)) {
						data = data.setIn([key, idx, "slug"], slug);
					}
				});

				// 2. UA items: reuse the EN slug
				const uaItems = data.getIn(["ua", key]) as CatList | undefined;
				if (!uaItems) continue;
				const finalEnItems = (data.getIn(["en", key]) ?? data.get(key)) as CatList | undefined;
				uaItems.forEach((item, idx) => {
					const enSlug = (finalEnItems?.get(idx)?.get("slug") as string | undefined) ?? "";
					const slug = enSlug || trimmedSlug(item) || slugify(item.get("title"));
					if (slug && data) {
						data = data.setIn(["ua", key, idx, "slug"], slug);
					}
				});
			}

			// Returning the data Map replaces the entry data in Decap
			return data;
		} catch (err) {
			console.error("[preSave] slug error:", err);
		}
	},
};
```

- [ ] **Step 5: Run it and confirm it passes**

Run: `bun test tests/cms/category-slugs.test.ts`
Expected: PASS, 4 tests.

- [ ] **Step 6: Write the failing template tests**

Append to `tests/data/integrity.test.ts`:

```ts
describe("decap cms industries", () => {
	const templatePath = join(import.meta.dir, "../../src/pages/admin/_config.template.yml");
	const raw = readFileSync(templatePath, "utf8");
	const parsed = parse(raw.replace(/__[A-Z0-9_]+__/g, '""'));

	it("edits industries.json as a file entry beside the equipment types", () => {
		const collection = parsed.collections?.find((c: any) => c.name === "equipment-categories");
		const names = collection.files.map((f: any) => f.name);
		expect(names).toEqual(["equipment-types", "industries"]);

		const file = collection.files.find((f: any) => f.name === "industries");
		expect(file.file).toBe("application/frontend/src/data/industries.json");
		expect(file.format).toBe("json");
		expect(file.fields[0].name).toBe("industries");
	});

	it("generates the product industry options and filters instead of hardcoding them", () => {
		expect(raw).toContain("__INDUSTRY_OPTIONS__");
		expect(raw).toContain("__INDUSTRY_FILTERS__");
		expect(raw).not.toContain('value: "general"');
		expect(raw).not.toContain('value: "chemical"');
	});
});
```

- [ ] **Step 7: Run it and confirm it fails**

Run: `bun test tests/data/integrity.test.ts`
Expected: the two new tests FAIL (only `equipment-types` file exists; tokens absent).

- [ ] **Step 8: Update `_config.template.yml`**

(a) Rename the collection label and description (keep `name: "equipment-categories"`). Replace lines 144-155:

```yaml
  # ── Equipment Categories & Industries ───────────────────────────────────────
  # File collection backed by JSON. Adding an entry creates a new category or
  # industry that auto-appears in the site sidebar and the product dropdowns.
  - name: "equipment-categories"
    label: "Categories & Industries"
    label_singular: "Category or Industry"
    description: >-
      Catalogue taxonomy. "Equipment Types" controls the sidebar label, icon and
      description of each equipment category; "Industries" does the same for each
      industry. Drag entries to reorder. New entries automatically populate the
      matching dropdown in Products.
    editor:
      preview: false
    i18n:
      structure: single_file
      locales: [en, ua]
      default_locale: en
```

(b) Add the Industries file after the `equipment-types` file's last field (the `icon-select` field, line 193), at the same indentation as `- name: "equipment-types"`:

```yaml
      - name: "industries"
        label: "Industries"
        file: "application/frontend/src/data/industries.json"
        format: json
        i18n: true
        fields:
          - label: "Industries"
            name: "industries"
            widget: list
            i18n: true
            hint: "Drag entries to reorder — the order here is the order in the sidebar."
            fields:
              - label: "Slug"
                name: "slug"
                widget: "hidden"
                i18n: duplicate
                required: false
              - label: "Title"
                name: "title"
                widget: "string"
                i18n: true
                hint: "Industry name displayed in the sidebar, header, and product industries dropdown."
              - label: "Description"
                name: "description"
                widget: "text"
                required: false
                i18n: true
                hint: "Brief industry overview shown at the top of the industry page."
              - label: "Icon"
                name: "icon"
                widget: "icon-select"
                required: false
                options: __ICON_OPTIONS__
```

(c) Replace the hardcoded `view_filters` (the whole block from `view_filters:` through the `pattern: "general"` line) with:

```yaml
    view_filters: __INDUSTRY_FILTERS__
```

(d) Replace the hardcoded Industries `options:` list in the product Industries field (the six `- { label: ..., value: ... }` lines under `options:`) so the field reads:

```yaml
      - label: "Industries"
        name: "industries"
        widget: "select"
        required: false
        i18n: true
        multiple: true
        min: 0
        options: __INDUSTRY_OPTIONS__
```

- [ ] **Step 9: Generate the tokens in `config.yml.ts`**

Change the content-utils import (line 12) to:

```ts
import { getCategoriesForLocale, getIndustriesForLocale } from "@/lib/content-utils";
```

After `const categories = getCategoriesForLocale("en");` add:

```ts
	const industries = getIndustriesForLocale("en");
```

and add two entries to the `tokens` object after `CATEGORY_OPTIONS`:

```ts
		INDUSTRY_OPTIONS: industries.map((i) => ({ label: i.title, value: i.slug })),
		INDUSTRY_FILTERS: industries.map((i) => ({
			label: i.title,
			field: "industries",
			pattern: i.slug,
		})),
```

- [ ] **Step 10: Run the full test suite**

Run: `bun test`
Expected: all pass.

- [ ] **Step 11: Verify the rendered CMS config end to end**

Start the dev server in the background: `bun run dev` (use the `background` option; it listens on `http://localhost:4321`).

Run: `(Invoke-WebRequest http://localhost:4321/admin/config.yml -UseBasicParsing).Content | Select-String -Pattern 'food-beverage','logistics','industries.json'`
Expected: matches for all three.

Run: `(Invoke-WebRequest http://localhost:4321/admin/config.yml -UseBasicParsing).Content | Select-String -Pattern 'general','chemical'`
Expected: no match.

Run the same content through the YAML parser to confirm it is valid:

```bash
bun -e "import {parse} from 'yaml'; const t = await (await fetch('http://localhost:4321/admin/config.yml')).text(); const c = parse(t); console.log(c.collections.find(x=>x.name==='equipment').view_filters.map(f=>f.pattern))"
```

Expected: `[ 'food-beverage', 'pharmaceutical', 'cosmetics', 'logistics' ]`.

Stop the dev server afterwards.

- [ ] **Step 12: Lint and commit**

Run: `bunx biome check src/cms/category-slugs.ts src/pages/admin/config.yml.ts tests/cms/category-slugs.test.ts tests/data/integrity.test.ts package.json`
Expected: no diagnostics (use `--write` for formatting).

```bash
git add package.json bun.lock src/cms/category-slugs.ts src/pages/admin tests/cms/category-slugs.test.ts tests/data/integrity.test.ts
git commit -m "feat(frontend): manage industries in Decap and generate the product options from them"
```

______________________________________________________________________

### Task 9: Final gate and manual browser check

**Files:** none (verification only).

- [ ] **Step 1: Full automated gate**

Run: `bun test`
Expected: all pass, 0 fail.

Run: `bunx astro check`
Expected: 0 errors, 0 warnings.

Run: `bunx astro build 2>&1 | Select-Object -Last 10`
Expected: succeeds. (The build reads `.env.local` for the required Astro env schema values.)

Run: `bunx biome check . 2>&1 | Select-Object -Last 6`
Expected: error count **≤ 17** (the pre-existing baseline), and none of the files touched by this work appear in the diagnostics. The two catalogue pages that had import-order errors should now be clean, so the count is expected to drop.

Run the touched-files lint explicitly:

```bash
bunx biome check src/lib src/cms src/components/catalogue src/components/Header.astro src/components/about/AboutHero.astro src/components/errors/NotFoundContent.astro "src/pages/[lang]/catalogue" src/pages/admin src/data/industries.json scripts/catalogue-redirects.mjs astro.config.mjs tests biome.json
```

Expected: only diagnostics from `tests/lib/anims/reveal-once.test.ts` (pre-existing, untouched). Anything else must be fixed.

- [ ] **Step 2: Start the preview**

Run: `bun run dev` in the background and open `http://localhost:4321/en/catalogue/equipment/checkweigher`.

- [ ] **Step 3: Manual checklist (spec "Manual browser check of the swap")**

Tick each, in both `/en` and `/ua`:

- [ ] Category page loads with **Equipment Categories** open and **Industries** closed. No flash of the wrong section on reload.

- [ ] Click the **Industries** header: it opens, Equipment closes, with a height animation. The page does not navigate. Click it again: it closes (both closed is allowed).

- [ ] Open Industries, click **Food & Beverage**: the hero and results swap in place (no reload, scroll position and focus kept, URL becomes `/…/catalogue/industry/food-beverage`). Results show a **Checkweighers** group heading only, with EC-E, HC-A, HC-M. The Industries section stays open with the item highlighted.

- [ ] Click **Logistics**: results show a **Catchweighers** group with HC-SL and HC-Warehouse.

- [ ] Open Equipment Categories, click a category: swap back to the category page; Equipment is open and the category highlighted.

- [ ] Browser **Back** and **Forward** cycle category to industry to category: the right section is open and the right item highlighted each time.

- [ ] **Reload** on an industry URL: Industries open, item highlighted.

- [ ] Header: on a category page the **Catalogue** item is underlined; after swapping to an industry the underline moves to **Industries** without a reload.

- [ ] Header **Industries** link opens the first industry page (Food & Beverage).

- [ ] Open a product page (`/…/catalogue/equipment/checkweigher/hc-m`): sidebar shows Equipment open with Checkweighers active. Clicking an industry navigates normally (full page load) to the industry page.

- [ ] A product card on an industry page links to `/…/catalogue/equipment/{category}/{product}`.

- [ ] Old URLs `/en/catalogue/checkweigher` and `/en/catalogue/checkweigher/hc-m` land on the new pages (in `dev`, redirects are served; in the static build they are meta-refresh pages already confirmed in Task 4).

- [ ] **Mobile** (viewport under 1024 px): the Filters button opens the drawer; toggling a section header keeps the drawer open; clicking an item closes the drawer and swaps the page.

- [ ] **Keyboard**: Tab reaches each section header; Enter/Space toggles; links inside a closed section are not reachable.

- [ ] **Reduced motion** (OS setting or DevTools emulation): sections open and close instantly, no chevron animation.

- [ ] Chevron icon, section headers and group headings look right in the Ukrainian locale (longer text wraps cleanly in the 288 px sidebar).

- [ ] **Step 4: Stop the dev server and finish**

Stop the background dev server. Confirm `git status` is clean, then use skills:finishing-a-development-branch to decide how to integrate.

______________________________________________________________________

## Self-review (against the spec)

| Spec requirement                                                                                                                 | Task                            |
| -------------------------------------------------------------------------------------------------------------------------------- | ------------------------------- |
| Two exclusive accordion sections, build-time initial state, `aria-expanded`/`aria-controls`/`hidden`                             | 5 (markup + script)             |
| Header button only toggles; items use the swap; swap generalized                                                                 | 5                               |
| `syncChrome` copies classes, `aria-current` and open section; back/forward and reload correct                                    | 5 (script), 9 (manual)          |
| CSS grid-rows transition, off under `prefers-reduced-motion`                                                                     | 5 (`<style>`, `setSectionOpen`) |
| Mobile drawer unchanged, closes after item click                                                                                 | 5, 9                            |
| Product pages: Equipment open, category active                                                                                   | 5 Step 4                        |
| `industries.json`, same shape, icons exist in `icons.json`                                                                       | 1                               |
| `Industry`, `getIndustriesForLocale`, `filterByIndustry`; schema unchanged                                                       | 1                               |
| `general` removed from `ec-e` (en, ua); `chemical` dropped                                                                       | 1 (Step 7), 8 (options)         |
| Routes: moved category + product, new `industry/[slug]`, only industries with products                                           | 3, 6                            |
| Industry page: `CategoryHeader`, grouped by category in JSON order, omit empty groups                                            | 1 (`groupByCategory`), 6        |
| JSON-LD `CollectionPage` + `ItemList` + breadcrumb                                                                               | 6                               |
| `data-catalogue-hero` / `data-catalogue-results` hooks kept                                                                      | 5 (`CatalogueBand`), 6          |
| `ProductCard` keeps props, links to canonical URL                                                                                | 3 Step 5                        |
| `CatalogueBand.astro` shared layout                                                                                              | 5                               |
| Redirects built from data + content folders                                                                                      | 4                               |
| Links updated: sidebar, `ProductCard`, `RelatedEquipment`, `Header`, `AboutHero`, `NotFoundContent`, breadcrumbs, `preview_path` | 3, 5, 7                         |
| Header Industries points at the first industry page                                                                              | 7                               |
| CMS: Industries file entry, `__INDUSTRY_OPTIONS__`, generated `view_filters`, multi-select                                       | 8                               |
| Integrity tests (slugs, uniqueness, icons, non-empty, product values, products per locale)                                       | 1                               |
| Unit tests for the helpers; structured-data URL assertions; redirect test                                                        | 1, 3, 4                         |
| Manual browser check                                                                                                             | 9                               |
| Final gate: `bun test`, type check, lint, `astro build`                                                                          | 9                               |
| Out of scope (homepage `IndustriesSection`, `/catalogue` index, in-category filtering) untouched                                 | n/a                             |

Placeholder scan: no TBD/TODO steps; every code step carries its code. Type and name consistency: `categoryUrl` / `productUrl` / `industryUrl` (Task 2) are the only URL builders used in Tasks 3, 5, 6, 7; `activeSlug`, `section`, `allIndustries` are used identically in `CatalogueSidebar`, `CatalogueBand`, the category, product and industry pages; `data-product-grid`, `data-sidebar-section`, `data-sidebar-toggle`, `data-sidebar-body` are used identically in markup and script.

Open items worth confirming with the content owner before merge: the four industries' draft copy (Task 1), and the renamed CMS collection label "Categories & Industries" (Task 8).
