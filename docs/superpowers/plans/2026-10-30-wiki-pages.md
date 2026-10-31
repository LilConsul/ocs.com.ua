# Wiki Pages Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use skills:subagent-driven-development (recommended) or skills:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a multi-language technical knowledge base and documentation library (`/[lang]/wiki` and `/[lang]/wiki/[slug]`) backed by Astro Content Collections and Decap CMS.

**Architecture:** Localized flat Markdown files in `src/content/wiki/<slug>.<locale>.md` loaded via Astro Content Layer `wiki` collection, processed by `src/lib/wiki-utils.ts`, and rendered with dedicated Astro components (`WikiCard`, `WikiSidebar`, `WikiToc`, `WikiProgressBar`, `WikiPagination`, `WikiCta`) inside responsive layouts conforming to the OS-Technology industrial design system.

**Tech Stack:** Astro 5 (Content Collections & Content Layer), TypeScript, Tailwind CSS v4, Lucide React icons, Decap CMS, Bun test runner.

______________________________________________________________________

## File Structure Map

```
application/frontend/
├── src/
│   ├── content.config.ts                                      # Add wiki content collection schema
│   ├── content/wiki/                                          # Localized flat markdown articles
│   │   ├── what-is-scale-division.en.md                       # Explaining scale division & accuracy in plain terms
│   │   ├── what-is-scale-division.ua.md                       # Пояснення дискретності ваг (d) простими словами
│   │   ├── choosing-a-dynamic-checkweigher.en.md
│   │   ├── choosing-a-dynamic-checkweigher.ua.md
│   │   ├── checkweigher-calibration.en.md
│   │   └── checkweigher-calibration.ua.md
│   ├── lib/
│   │   └── wiki-utils.ts                                      # Slug, locale, reading time, and sorting helpers
│   ├── components/wiki/
│   │   ├── WikiCard.astro                                     # Index card & related article preview
│   │   ├── WikiCta.astro                                      # Consultation / Contact callout banner
│   │   ├── WikiSidebar.astro                                  # Sticky desktop sidebar / mobile drawer
│   │   ├── WikiToc.astro                                      # Table of contents with scrollspy
│   │   ├── WikiProgressBar.astro                              # Viewport top reading progress bar
│   │   └── WikiPagination.astro                               # Prev/Next article navigation buttons
│   ├── pages/
│   │   ├── admin/_config.template.yml                         # Add Decap CMS wiki collection
│   │   └── [lang]/wiki/
│   │       ├── index.astro                                    # Wiki index grid page
│   │       └── [slug].astro                                   # Wiki article detail page
│   └── i18n/
│       └── ui.ts                                              # Generated translation dictionary
├── locales/
│   ├── messages.pot                                           # English source gettext catalog
│   └── ua.po                                                  # Ukrainian translation catalog
└── tests/
    ├── lib/
    │   └── wiki-utils.test.ts                                 # Unit tests for wiki utilities
    └── data/
        └── integrity.test.ts                                  # Extended data & Decap CMS integrity tests
```

______________________________________________________________________

## Tasks

### Task 1: Decap CMS & Content Collection Schema

**Files:**

- Modify: `application/frontend/src/content.config.ts`

- Modify: `application/frontend/src/pages/admin/_config.template.yml`

- Create: `application/frontend/src/content/wiki/what-is-scale-division.ua.md`

- Create: `application/frontend/src/content/wiki/what-is-scale-division.en.md`

- Create: `application/frontend/src/content/wiki/choosing-a-dynamic-checkweigher.ua.md`

- Create: `application/frontend/src/content/wiki/choosing-a-dynamic-checkweigher.en.md`

- Create: `application/frontend/src/content/wiki/checkweigher-calibration.ua.md`

- Create: `application/frontend/src/content/wiki/checkweigher-calibration.en.md`

- Modify: `application/frontend/tests/data/integrity.test.ts`

- [ ] **Step 1: Write failing data integrity tests for wiki content & CMS config**

Edit `application/frontend/tests/data/integrity.test.ts` and add tests for the `wiki` collection and markdown content:

```typescript
describe("wiki content", () => {
	const WIKI_DIR = join(import.meta.dir, "../../src/content/wiki");

	const wikiFiles = existsSync(WIKI_DIR)
		? walk(WIKI_DIR)
				.filter((f) => f.endsWith(".md"))
				.map((f) => relative(WIKI_DIR, f).replaceAll("\\", "/"))
		: [];

	it("finds wiki content files", () => {
		expect(wikiFiles.length).toBeGreaterThan(0);
	});

	it("names every wiki file <slug>.<en|ua>.md", () => {
		const bad = wikiFiles.filter((f) => !/^[a-z0-9-]+\.(en|ua)\.md$/.test(f));
		expect(bad).toEqual([]);
	});

	it("has a translation for every wiki file (en <-> ua)", () => {
		const set = new Set(wikiFiles);
		const missing = wikiFiles
			.map((f) => f.replace(/\.(en|ua)\.md$/, (_m, l) => `.${l === "en" ? "ua" : "en"}.md`))
			.filter((counterpart) => !set.has(counterpart));
		expect(missing).toEqual([]);
	});

	it("matches the wiki content schema", () => {
		const schema = (collections.wiki as any).schema;
		const failures = wikiFiles
			.map((f) => ({ f, result: schema.safeParse(frontmatter(join(WIKI_DIR, f))) }))
			.filter(({ result }) => !result.success)
			.map(({ f, result }) => `${f}: ${result.error.issues.map((i: any) => i.message).join("; ")}`);
		expect(failures).toEqual([]);
	});
});

describe("decap cms wiki collection", () => {
	it("configures wiki folder collection in _config.template.yml", () => {
		const templatePath = join(import.meta.dir, "../../src/pages/admin/_config.template.yml");
		const raw = readFileSync(templatePath, "utf8");
		const parsed = parse(raw.replace(/__[A-Z0-9_]+__/g, '""'));
		const wikiCollection = parsed.collections?.find((c: any) => c.name === "wiki");
		expect(wikiCollection).toBeDefined();
		expect(wikiCollection.label).toBe("Wiki");
		expect(wikiCollection.folder).toBe("application/frontend/src/content/wiki");
		expect(wikiCollection.i18n).toBe(true);
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test tests/data/integrity.test.ts`
Expected: FAIL with missing wiki collection and files.

- [ ] **Step 3: Define wiki content collection in `content.config.ts`**

Update `application/frontend/src/content.config.ts`:

```typescript
import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

const specRow = z.object({
	label: z.string(),
	value: z.string(),
});

// A group of rows, optionally with a heading (e.g. "Conveyor")
const specGroup = z.object({
	title: z.string().nullish(),
	items: z.array(specRow).nullish(),
});

const equipment = defineCollection({
	loader: glob({
		pattern: "**/!(_index)*.md",
		base: "./src/content/equipment",
	}),
	schema: z.object({
		type: z.enum(["category", "product"]).nullish(),
		title: z.string().nullish(),
		description: z.string().nullish(),
		icon: z.string().nullish(),
		order: z.number().nullish(),
		industries: z.array(z.string()).nullish(),
		gallery: z.array(z.string()).nullish(),
		datasheet: z.string().nullish(),
		// Either a flat list of rows or a list of groups
		specs: z.union([z.array(specRow), z.array(specGroup)]).nullish(),
	}),
});

const wiki = defineCollection({
	loader: glob({
		pattern: "**/!(_index)*.md",
		base: "./src/content/wiki",
	}),
	schema: z.object({
		title: z.string(),
		description: z.string().nullish(),
		coverImage: z.string().nullish(),
		order: z.number().nullish(),
		related: z.array(z.string()).nullish(),
	}),
});

export const collections = {
	equipment,
	wiki,
};
```

- [ ] **Step 4: Update Decap CMS config template in `_config.template.yml`**

Add the `wiki` collection to `application/frontend/src/pages/admin/_config.template.yml`:

```yaml
  # ── Wiki Knowledge Base ──────────────────────────────────────────────────
  - name: "wiki"
    label: "Wiki"
    label_singular: "Wiki Article"
    description: "Knowledge base and technical articles."
    folder: "application/frontend/src/content/wiki"
    create: true
    delete: true
    i18n: true
    preview_path: "{{locale}}/wiki/{{filename}}"
    sortable_fields: ["commit_date", "order", "title"]
    fields:
      - { label: "Title", name: "title", widget: "string", i18n: true }
      - { label: "Description / Summary", name: "description", widget: "text", required: false, i18n: true, hint: "Brief summary shown on index cards and in SEO meta tags" }
      - label: "Cover Image"
        name: "coverImage"
        widget: "image"
        required: false
        i18n: duplicate
        media_processing:
          enabled: true
          format:
            enabled: true
            default: webp
          quality: 85
          strip_metadata: true
          width: 1400
          height: null
          aspect_ratio: 16x9
      - { label: "Order", name: "order", widget: "number", value_type: "int", default: 0, required: false, i18n: duplicate, hint: "Sorting priority (lower numbers appear first)" }
      - { label: "Related Articles", name: "related", widget: "relation", collection: "wiki", search_fields: ["title"], value_field: "{{slug}}", display_fields: ["title"], multiple: true, required: false, i18n: duplicate }
      - { label: "Body", name: "body", widget: "markdown", required: true, i18n: true }
```

- [ ] **Step 5: Create starter localized wiki markdown files**

Create `application/frontend/src/content/wiki/what-is-scale-division.ua.md`:

```markdown
---
title: "Що таке дискретність ваг (d) простими словами"
description: "Пояснення базового поняття метрології: що означає ціна поділки (d), чим вона відрізняється від похибки (e) та як правильно обрати дискретність для вашої лінії."
order: 1
related:
  - "choosing-a-dynamic-checkweigher"
  - "checkweigher-calibration"
---

Коли ви обираєте ваги або динамічний чеквеєр для виробництва, однією з перших характеристик у специфікації є **дискретність** (позначається латинською літерою **d**).

## Що таке дискретність простими словами?

**Дискретність (d)** — це мінімальний крок, на який змінюється значення на дисплеї ваг.

Уявіть звичайну лінійку з поділками:
- Якщо на лінійці є тільки сантиметри, ви можете виміряти довжину з кроком 1 см.
- Якщо нанесені міліметри, крок вимірювання стає 1 мм.

Аналогічно працюють і ваги:
- Якщо ваги мають дискретність **d = 1 г**, дисплей показуватиме: `100 г` → `101 г` → `102 г`. Показати `100.5 г` такі ваги технічно не можуть.
- Якщо дискретність **d = 0.1 г**, екран відображатиме: `100.0 г` → `100.1 г` → `100.2 г`.

## Дискретність (d) чи Похибка? У чому різниця

Часта помилка інженерів-початківців — вважати, що дискретність дорівнює точності (похибці) ваг. Це не одне й те саме:

1. **Дискретність (d)** — це роздільна здатність дисплея (найменший крок відображення).
2. **Похибка (точність)** — це максимальна різниця між реальною масою еталона та тим, що виміряли ваги.

> **Приклад:** Якщо ваги показують `150.2 г` при `d = 0.1 г`, це означає лише те, що екран має крок 0.1 г. Реальна маса продукту може бути `150.4 г`, якщо загальна похибка приладу становить ±0.3 г.

## Що означає повірочна поділка (e)?

У технічній документації на сертифіковані ваги ви часто зустрінете дві літери: **d** та **e**:
- **d (actual scale interval)** — фактична дискретність відліку.
- **e (verification scale interval)** — ціна повірочної поділки, яка використовується метрологами для визначення класу точності ваг та допустимої похибки при державній повірці.

Для більшості технологічних ваг `e = 10 · d` або `e = d`.

## Як обрати дискретність для вашого виробництва?

Вимоги до дискретності залежать від типу фасованої продукції та стандартів (наприклад, вимог до відхилення маси фасованих товарів у споживчій тарі):

| Галузь / Продукт | Маса дози | Рекомендована дискретність (d) |
| :--- | :--- | :--- |
| **Фармацевтика (таблетки, флакони)** | до 100 г | `0.01 г – 0.05 г` |
| **Кондитерські вироби, кава, чай** | 100 г – 1 кг | `0.1 г – 0.2 г` |
| **Харчова упаковка, м'ясні лотки** | 1 кг – 5 кг | `0.5 г – 1 г` |
| **Логістичні короби, мішки** | 10 кг – 60 кг | `5 г – 10 г` |

## Чому не варто обирати занадто малу дискретність?

Здається логічним взяти ваги з максимально високою дискретністю (наприклад, 0.01 г для коробки 5 кг), але на конвеєрній лінії це може викликати проблеми:
- **Чутливість до вібрацій:** Надчутливий ваговий датчик реагуватиме на шум лінії, рух повітря та вібрації сусідніх транспортерів.
- **Час стабілізації:** Для обчислення ультраточного значення вагопроцесору потрібно більше часу, що знижує максимальну швидкість конвеєра (шт/хв).

**Золоте правило метролога:** Дискретність має бути приблизно в 3–5 разів меншою, ніж допустиме технологічне відхилення (допуск) на масу вашого продукту.
```

Create `application/frontend/src/content/wiki/what-is-scale-division.en.md`:

```markdown
---
title: "Understanding Scale Division (d) and Accuracy in Plain Words"
description: "A plain-language guide to industrial weighing terminology: what scale division (d) means, how it differs from error and verification interval (e), and how to select the right resolution."
order: 1
related:
  - "choosing-a-dynamic-checkweigher"
  - "checkweigher-calibration"
---

When selecting industrial scales or an automated dynamic checkweigher, one of the primary technical parameters in datasheets is **scale division** or resolution (denoted by the letter **d**).

## What is Scale Division (d) in Plain Terms?

**Scale division (d)** is the smallest step or increment by which the weight value changes on the display.

Think of an ordinary mechanical ruler:
- If a ruler only has marks every centimetre, you can measure with a 1 cm step.
- If it has millimeter lines, your resolution is 1 mm.

Industrial weighing scales work the exact same way:
- If a scale has **d = 1 g**, the display increments as: `100 g` → `101 g` → `102 g`. It cannot display `100.5 g`.
- If a scale has **d = 0.1 g**, the display increments as: `100.0 g` → `100.1 g` → `100.2 g`.

## Scale Division (d) vs Accuracy: What is the Difference?

A common misconception is assuming that scale division equals scale accuracy. They are fundamentally different:

1. **Scale Division (d)** — The display resolution (the smallest measurable increment).
2. **Measurement Error (Accuracy)** — The actual deviation between the true certified test mass and the reading provided by the scale.

> **Example:** If a scale displays `150.2 g` with `d = 0.1 g`, this only indicates display granularity. The true mass might be `150.4 g` if the system error tolerance is ±0.3 g.

## What is Verification Scale Interval (e)?

In metrological certifications and data sheets, you will frequently see both **d** and **e**:
- **d (actual scale interval)** — The actual display resolution.
- **e (verification scale interval)** — The verified metrological division used by calibration authorities to determine accuracy classes (OIML Class II, III, etc.) and maximum permissible errors.

In most industrial weighing systems, `e = d` or `e = 10 · d`.

## Practical Recommendations by Industry

| Industry / Application | Typical Package Weight | Recommended Scale Division (d) |
| :--- | :--- | :--- |
| **Pharmaceuticals (blisters, vials)** | up to 100 g | `0.01 g – 0.05 g` |
| **Confectionery, coffee, dry goods** | 100 g – 1 kg | `0.1 g – 0.2 g` |
| **Food packaging, fresh meat trays** | 1 kg – 5 kg | `0.5 g – 1 g` |
| **Logistics cartons, bulk bags** | 10 kg – 60 kg | `5 g – 10 g` |

## Why Not Choose the Smallest Possible 'd'?

While choosing ultra-high resolution might sound ideal, setting resolution unnecessarily high on a dynamic production line introduces drawbacks:
- **Sensitivity to environmental vibration:** High-resolution load cells register ambient conveyor vibration, motor hum, and air drafts.
- **Stabilization time:** Processing ultra-fine signals takes more filter settling time, reducing maximum throughput (packs per minute).

**Rule of Thumb:** Your scale division (d) should typically be 3 to 5 times smaller than your permitted product packaging tolerance.
```

Create `application/frontend/src/content/wiki/choosing-a-dynamic-checkweigher.ua.md`:

```markdown
---
title: "Як обрати динамічні контрольні ваги (чеквеєр)"
description: "Критерії підбору чеквеєра за продуктивністю, масою продукту та вимогами до точності зважування на виробничій лінії."
order: 2
related:
  - "what-is-scale-division"
  - "checkweigher-calibration"
---

Динамічний чеквеєр зважує кожен продукт безпосередньо під час руху конвеєром і відбраковує одиниці, маса яких виходить за межі допустимих допусків.

## Принцип динамічного зважування

Продукт переміщується через ваговий транспортер. Тензодатчик високої роздільної здатності фіксує масу під час повного перебування продукту на стрічці, а контролер обробляє сигнал за лічені мілісекунди.

## Критерії підбору обладнання

Під час вибору моделі необхідно враховувати:

- Діапазон маси продукції та мінімальний допустимий допуск
- Швидкість лінії та дистанцію між продуктами на конвеєрі
- Вимоги до гігієнічного виконання (IP65, IP69K)
- Тип відбраковувача: повітряний струмінь (air jet), штовхач (pusher) або відвідний конвеєр
```

Create `application/frontend/src/content/wiki/choosing-a-dynamic-checkweigher.en.md`:

```markdown
---
title: "Choosing a Dynamic Checkweigher"
description: "How to match throughput, product weight, and accuracy requirements to the right checkweigher model."
order: 2
related:
  - "what-is-scale-division"
  - "checkweigher-calibration"
---

A dynamic checkweigher weighs every product while it moves along the conveyor belt, automatically rejecting anything outside the permitted weight range.

## How Dynamic Weighing Works

The product travels across a dedicated weighing conveyor. A high-resolution load cell measures the force while the product is fully on the belt, and the controller converts the signal into a precise weight value within milliseconds.

## Key Selection Criteria

When selecting a machine for your production line, consider:

- Product weight range and minimum allowable tolerance
- Conveyor speed and pitch between products
- Washdown and hygiene requirements (IP65, IP69K)
- Rejection mechanism: air jet, pneumatic pusher, or drop flap conveyor
```

Create `application/frontend/src/content/wiki/checkweigher-calibration.ua.md`:

```markdown
---
title: "Калібрування та налаштування нуля чеквеєра"
description: "Покрокова інструкція з регулярного калібрування динамічних ваг для забезпечення точності та готовності до аудиту."
order: 3
related:
  - "what-is-scale-division"
  - "choosing-a-dynamic-checkweigher"
---

Регулярне калібрування забезпечує простежуваність результатів зважування та відповідність стандартам IFS та BRC.

## Підготовка до калібрування

Перед початком процедури виконайте наступні кроки:

- Зупиніть лінію та очистіть стрічку транспортера
- Увімкніть обладнання щонайменше за 15 хвилин до тесту для прогріву електроніки
- Підготуйте еталонні калібрувальні гирі відповідного класу точності

## Порядок виконання

1. Запустіть процедуру встановлення нуля у сервісному меню.
2. Встановіть першу калібрувальну гирю на стрічку та підтвердьте показники.
3. Повторіть дію з гирею верхнього діапазону зважування.
4. Проведіть 5 динамічних тестових прогонів та перевірте відхилення.
5. Зафіксуйте результати в журналі технічного обслуговування.
```

Create `application/frontend/src/content/wiki/checkweigher-calibration.en.md`:

```markdown
---
title: "Checkweigher Calibration and Zero Setting"
description: "A step-by-step routine for keeping dynamic checkweighers accurate between service visits."
order: 3
related:
  - "what-is-scale-division"
  - "choosing-a-dynamic-checkweigher"
---

Regular calibration keeps dynamic weighing results traceable and audit-ready under IFS and BRC quality standards.

## Before You Start

Before performing calibration:

- Stop the line and clear the conveyor belt
- Let the machine warm up for at least 15 minutes
- Have certified test weights ready

## Calibration Procedure

1. Run the zero-setting routine from the service menu.
2. Place the first certified test weight on the belt and confirm the reading.
3. Repeat with the second weight at the upper end of the weighing range.
4. Run five dynamic test passes and record the deviation.
5. Log the calibration results in the maintenance register.
```

- [ ] **Step 6: Run tests and verify they pass**

Run: `bun test tests/data/integrity.test.ts`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add application/frontend/src/content.config.ts application/frontend/src/pages/admin/_config.template.yml application/frontend/src/content/wiki/ application/frontend/tests/data/integrity.test.ts
git commit -m "feat(wiki): add content collection schema, decap config, and starter articles"
```

______________________________________________________________________

### Task 2: Wiki Utilities & Reading Time Calculation

**Files:**

- Create: `application/frontend/tests/lib/wiki-utils.test.ts`

- Create: `application/frontend/src/lib/wiki-utils.ts`

- [ ] **Step 1: Write failing unit tests for wiki utilities**

Create `application/frontend/tests/lib/wiki-utils.test.ts`:

```typescript
import { describe, expect, it } from "bun:test";
import {
	type WikiEntry,
	calculateReadingMinutes,
	filterWikiByLocale,
	findWikiTranslation,
	getWikiCoverImage,
	getWikiLocale,
	getWikiSlug,
	sortWikiArticles,
} from "@/lib/wiki-utils";

const makeEntry = (id: string, data: Partial<WikiEntry["data"]> = {}): WikiEntry =>
	({
		id,
		data: {
			title: data.title ?? "Test Article",
			description: data.description,
			coverImage: data.coverImage,
			order: data.order,
			related: data.related,
		},
		body: data.body ?? "",
	}) as unknown as WikiEntry;

const sampleEntries: WikiEntry[] = [
	makeEntry("choosing-a-dynamic-checkweigheren", { title: "Choosing a Checkweigher", order: 2 }),
	makeEntry("choosing-a-dynamic-checkweigherua", {
		title: "Як обрати чеквеєр",
		order: 2,
		coverImage: "/assets/checkweigher-cover.webp",
	}),
	makeEntry("checkweigher-calibrationen", { title: "Calibration", order: 1 }),
	makeEntry("checkweigher-calibrationua", { title: "Калібрування", order: 1 }),
	makeEntry("metal-detector-sensitivityen", { title: "Sensitivity", order: undefined }),
];

describe("wiki-utils: getWikiLocale", () => {
	it("extracts en and ua from entry ID suffixes", () => {
		expect(getWikiLocale(sampleEntries[0])).toBe("en");
		expect(getWikiLocale(sampleEntries[1])).toBe("ua");
	});

	it("defaults to en when no recognizable suffix exists", () => {
		expect(getWikiLocale(makeEntry("article-without-suffix"))).toBe("en");
	});
});

describe("wiki-utils: getWikiSlug", () => {
	it("extracts the base slug without locale suffix", () => {
		expect(getWikiSlug(sampleEntries[0])).toBe("choosing-a-dynamic-checkweigher");
		expect(getWikiSlug(sampleEntries[1])).toBe("choosing-a-dynamic-checkweigher");
		expect(getWikiSlug(sampleEntries[2])).toBe("checkweigher-calibration");
	});
});

describe("wiki-utils: filterWikiByLocale", () => {
	it("filters articles matching the requested locale", () => {
		const uaArticles = filterWikiByLocale(sampleEntries, "ua");
		expect(uaArticles.map((e) => e.id)).toEqual([
			"choosing-a-dynamic-checkweigherua",
			"checkweigher-calibrationua",
		]);

		const enArticles = filterWikiByLocale(sampleEntries, "en");
		expect(enArticles.map((e) => e.id)).toEqual([
			"choosing-a-dynamic-checkweigheren",
			"checkweigher-calibrationen",
			"metal-detector-sensitivityen",
		]);
	});
});

describe("wiki-utils: sortWikiArticles", () => {
	it("sorts primarily by order ascending, then by title", () => {
		const sorted = sortWikiArticles(sampleEntries);
		expect(sorted.map((e) => e.id)).toEqual([
			"checkweigher-calibrationen",
			"checkweigher-calibrationua",
			"choosing-a-dynamic-checkweigheren",
			"choosing-a-dynamic-checkweigherua",
			"metal-detector-sensitivityen",
		]);
	});

	it("does not mutate original array", () => {
		const copy = [...sampleEntries];
		sortWikiArticles(copy);
		expect(copy[0].id).toBe(sampleEntries[0].id);
	});
});

describe("wiki-utils: calculateReadingMinutes", () => {
	it("returns minimum 1 minute for short text or empty content", () => {
		expect(calculateReadingMinutes("")).toBe(1);
		expect(calculateReadingMinutes("Short sentence.")).toBe(1);
	});

	it("calculates reading minutes assuming ~200 words per minute", () => {
		const text = new Array(400).fill("word").join(" ");
		expect(calculateReadingMinutes(text)).toBe(2);

		const text650 = new Array(650).fill("word").join(" ");
		expect(calculateReadingMinutes(text650)).toBe(4); // ceil(650 / 200) = 4
	});
});

describe("wiki-utils: findWikiTranslation", () => {
	it("finds the counterpart translation in allEntries", () => {
		const translation = findWikiTranslation(sampleEntries[0], "ua", sampleEntries);
		expect(translation?.id).toBe("choosing-a-dynamic-checkweigherua");
	});

	it("returns undefined if target translation does not exist", () => {
		const translation = findWikiTranslation(sampleEntries[4], "ua", sampleEntries);
		expect(translation).toBeUndefined();
	});
});

describe("wiki-utils: getWikiCoverImage", () => {
	it("returns direct cover image if defined", () => {
		expect(getWikiCoverImage(sampleEntries[1], sampleEntries)).toBe("/assets/checkweigher-cover.webp");
	});

	it("falls back to default ua locale cover image when current locale has none", () => {
		expect(getWikiCoverImage(sampleEntries[0], sampleEntries)).toBe("/assets/checkweigher-cover.webp");
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test tests/lib/wiki-utils.test.ts`
Expected: FAIL with "Cannot find module '@/lib/wiki-utils'"

- [ ] **Step 3: Implement `src/lib/wiki-utils.ts`**

Create `application/frontend/src/lib/wiki-utils.ts`:

```typescript
import type { CollectionEntry } from "astro:content";
import type { Locale } from "./content-utils";

export type WikiEntry = CollectionEntry<"wiki">;

/**
 * Extract locale from wiki entry ID (e.g. "choosing-a-dynamic-checkweigheren" -> "en")
 */
export function getWikiLocale(entry: WikiEntry): Locale {
	const id = entry.id;
	if (id.endsWith("en")) return "en";
	if (id.endsWith("ua")) return "ua";
	return "en";
}

/**
 * Extract base slug without locale suffix
 */
export function getWikiSlug(entry: WikiEntry): string {
	const parts = entry.id.split("/");
	const filename = parts[parts.length - 1];
	return filename.replace(/(en|ua)$/, "");
}

/**
 * Filter wiki entries by locale
 */
export function filterWikiByLocale(entries: WikiEntry[], locale: Locale): WikiEntry[] {
	return entries.filter((entry) => getWikiLocale(entry) === locale);
}

/**
 * Sort wiki articles by order (ascending, default 999), then alphabetically by title
 */
export function sortWikiArticles(entries: WikiEntry[]): WikiEntry[] {
	if (!Array.isArray(entries) || entries.length === 0) return [];
	return [...entries].sort((a, b) => {
		const orderA = a.data?.order ?? 999;
		const orderB = b.data?.order ?? 999;
		if (orderA !== orderB) return orderA - orderB;
		const titleA = a.data?.title ?? "";
		const titleB = b.data?.title ?? "";
		return titleA.localeCompare(titleB);
	});
}

/**
 * Calculate estimated reading time in minutes (default 200 words per minute, min 1)
 */
export function calculateReadingMinutes(content: string): number {
	if (!content || !content.trim()) return 1;
	const words = content.trim().split(/\s+/).filter(Boolean).length;
	return Math.max(1, Math.ceil(words / 200));
}

/**
 * Find matching translation for a wiki article
 */
export function findWikiTranslation(
	entry: WikiEntry,
	targetLocale: Locale,
	allEntries: WikiEntry[]
): WikiEntry | undefined {
	const slug = getWikiSlug(entry);
	const targetId = `${slug}${targetLocale}`;
	return allEntries.find((e) => e.id === targetId || e.id.endsWith(`/${targetId}`));
}

/**
 * Get article cover image with fallback to Ukrainian default locale
 */
export function getWikiCoverImage(
	entry: WikiEntry,
	allEntries: WikiEntry[]
): string | undefined {
	if (entry.data.coverImage) return entry.data.coverImage;
	const locale = getWikiLocale(entry);
	if (locale === "ua") return undefined;
	const uaEntry = findWikiTranslation(entry, "ua", allEntries);
	return uaEntry?.data.coverImage ?? undefined;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `bun test tests/lib/wiki-utils.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add application/frontend/src/lib/wiki-utils.ts application/frontend/tests/lib/wiki-utils.test.ts
git commit -m "feat(wiki): add wiki utilities and reading time calculation"
```

______________________________________________________________________

### Task 3: i18n Translations for Wiki Section

**Files:**

- Modify: `application/frontend/locales/messages.pot`

- Modify: `application/frontend/locales/ua.po`

- Modify: `application/frontend/src/i18n/ui.ts`

- [ ] **Step 1: Update `messages.pot` with wiki translation keys**

Append the new source gettext strings to `application/frontend/locales/messages.pot`:

```po
msgid "Knowledge Base"
msgstr ""

msgid "Technical articles, guides, and operational documentation for industrial equipment."
msgstr ""

msgid "min read"
msgstr ""

msgid "On this page"
msgstr ""

msgid "All articles"
msgstr ""

msgid "Browse articles"
msgstr ""

msgid "Search the wiki…"
msgstr ""

msgid "No articles match your search."
msgstr ""

msgid "Previous article"
msgstr ""

msgid "Next article"
msgstr ""

msgid "Related articles"
msgstr ""

msgid "Need technical consultation?"
msgstr ""

msgid "Our engineers will help you choose the optimal solution for your production line."
msgstr ""

msgid "Contact us"
msgstr ""

msgid "Read article"
msgstr ""

msgid "Article navigation"
msgstr ""
```

- [ ] **Step 2: Update `ua.po` with Ukrainian translations**

Append corresponding translations to `application/frontend/locales/ua.po`:

```po
msgid "Knowledge Base"
msgstr "База знань"

msgid "Technical articles, guides, and operational documentation for industrial equipment."
msgstr "Технічні статті, інструкції та керівництва з експлуатації промислового обладнання."

msgid "min read"
msgstr "хв читання"

msgid "On this page"
msgstr "Зміст статті"

msgid "All articles"
msgstr "Всі статті"

msgid "Browse articles"
msgstr "Переглянути статті"

msgid "Search the wiki…"
msgstr "Пошук у базі знань…"

msgid "No articles match your search."
msgstr "За вашим запитом статей не знайдено."

msgid "Previous article"
msgstr "Попередня стаття"

msgid "Next article"
msgstr "Наступна стаття"

msgid "Related articles"
msgstr "Схожі статті"

msgid "Need technical consultation?"
msgstr "Потрібна консультація щодо обладнання?"

msgid "Our engineers will help you choose the optimal solution for your production line."
msgstr "Наші інженери допоможуть підібрати оптимальне рішення для вашої виробничої лінії."

msgid "Contact us"
msgstr "Зв'язатися з нами"

msgid "Read article"
msgstr "Читати статтю"

msgid "Article navigation"
msgstr "Навігація по статтях"
```

- [ ] **Step 3: Run translation compilation script**

Run: `bun run i18n:compile` (in `application/frontend`)
Expected: Output showing generated `src/i18n/ui.ts`.

- [ ] **Step 4: Run i18n parity tests to verify completeness**

Run: `bun test tests/i18n/`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add application/frontend/locales/messages.pot application/frontend/locales/ua.po application/frontend/src/i18n/ui.ts
git commit -m "feat(wiki): add i18n translations for wiki knowledge base"
```

______________________________________________________________________

### Task 4: Wiki Card & CTA UI Components

**Files:**

- Create: `application/frontend/src/components/wiki/WikiCard.astro`

- Create: `application/frontend/src/components/wiki/WikiCta.astro`

- [ ] **Step 1: Implement `WikiCard.astro`**

Create `application/frontend/src/components/wiki/WikiCard.astro`:

```astro
---
import { ArrowRight, Clock } from "lucide-react";
import { getInlineTranslations, type Lang } from "@/i18n";
import { getWikiSlug, type WikiEntry } from "@/lib/wiki-utils";

interface Props {
	entry: WikiEntry;
	lang: Lang;
	readMinutes: number;
	coverImage?: string;
}

const { entry, lang, readMinutes, coverImage } = Astro.props;
const _ = getInlineTranslations(lang);
const slug = getWikiSlug(entry);
const title = entry.data.title;
const description = entry.data.description;
const image = coverImage ?? entry.data.coverImage;
---

<a
	href={`/${lang}/wiki/${slug}`}
	class="group/card bg-surface-lowest border-border-subtle hover:border-secondary/40 focus-visible:outline-secondary flex h-full flex-col overflow-hidden rounded-xl border p-5 shadow-xs transition-[translate,box-shadow,border-color] duration-300 hover:shadow-lg focus-visible:outline-2 focus-visible:outline-offset-2 motion-safe:hover:-translate-y-0.5 sm:p-6"
	data-wiki-item
	data-wiki-text={`${title} ${description ?? ""}`.toLowerCase()}
>
	{
		image && (
			<div class="border-border-subtle/60 mb-5 aspect-video w-full overflow-hidden rounded-lg border bg-surface-container">
				<img
					src={image}
					alt={title}
					loading="lazy"
					class="size-full object-cover transition-transform duration-500 group-hover/card:scale-105"
				/>
			</div>
		)
	}

	<div class="mb-3 flex items-center justify-between gap-3">
		<span class="font-technical-data text-industrial-gray inline-flex items-center gap-1.5 text-xs font-medium">
			<Clock className="text-secondary size-3.5" aria-hidden="true" />
			{readMinutes} {_("min read")}
		</span>
	</div>

	<h3 class="font-headline-lg text-foreground m-0 text-lg font-semibold tracking-tight transition-colors group-hover/card:text-secondary">
		{title}
	</h3>

	{
		description && (
			<p class="font-body-md text-industrial-gray m-0 mt-2 line-clamp-3 text-sm leading-relaxed">
				{description}
			</p>
		)
	}

	<span class="text-secondary font-technical-data mt-auto inline-flex items-center gap-2 pt-4 text-sm font-semibold">
		{_("Read article")}
		<ArrowRight
			className="size-4 transition-transform duration-200 group-hover/card:translate-x-1"
			aria-hidden="true"
		/>
	</span>
</a>
```

- [ ] **Step 2: Implement `WikiCta.astro`**

Create `application/frontend/src/components/wiki/WikiCta.astro`:

```astro
---
import { ArrowRight } from "lucide-react";
import { getInlineTranslations, type Lang } from "@/i18n";

interface Props {
	lang: Lang;
}

const { lang } = Astro.props;
const _ = getInlineTranslations(lang);
---

<section
	class="bg-primary text-primary-foreground relative mt-12 flex flex-col gap-6 overflow-hidden rounded-xl p-6 shadow-xs sm:flex-row sm:items-center sm:justify-between sm:p-8"
	aria-labelledby="wiki-cta-heading"
>
	<div class="max-w-xl">
		<h2 id="wiki-cta-heading" class="font-headline-lg m-0 text-lg font-semibold tracking-tight sm:text-xl">
			{_("Need technical consultation?")}
		</h2>
		<p class="font-body-md text-primary-foreground/80 m-0 mt-2 text-sm leading-relaxed">
			{_("Our engineers will help you choose the optimal solution for your production line.")}
		</p>
	</div>

	<a
		href={`/${lang}/contact`}
		class="group bg-background text-foreground focus-visible:outline-background inline-flex shrink-0 items-center justify-center gap-2 rounded-lg px-6 py-3 text-[15px] font-medium shadow-xs transition-[opacity,box-shadow] hover:opacity-90 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2"
	>
		{_("Contact us")}
		<ArrowRight
			className="size-[18px] transition-transform duration-200 group-hover:translate-x-1"
			aria-hidden="true"
		/>
	</a>
</section>
```

- [ ] **Step 3: Run Biome check to verify formatting and types**

Run: `bun run check`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add application/frontend/src/components/wiki/WikiCard.astro application/frontend/src/components/wiki/WikiCta.astro
git commit -m "feat(wiki): add WikiCard and WikiCta components"
```

______________________________________________________________________

### Task 5: Wiki Navigation, TOC & Progress Components

**Files:**

- Create: `application/frontend/src/components/wiki/WikiSidebar.astro`

- Create: `application/frontend/src/components/wiki/WikiToc.astro`

- Create: `application/frontend/src/components/wiki/WikiProgressBar.astro`

- Create: `application/frontend/src/components/wiki/WikiPagination.astro`

- [ ] **Step 1: Implement `WikiProgressBar.astro`**

Create `application/frontend/src/components/wiki/WikiProgressBar.astro`:

```astro
---
---

<div
	id="wiki-progress-bar"
	class="bg-secondary fixed inset-x-0 top-0 z-50 h-1 origin-left scale-x-0 transition-transform duration-100 ease-out"
	aria-hidden="true"
/>

<script>
	function setupProgressBar() {
		const bar = document.getElementById("wiki-progress-bar");
		const articleEl = document.querySelector<HTMLElement>("article");
		if (!bar || !articleEl) return;

		let ticking = false;
		const update = () => {
			const rect = articleEl.getBoundingClientRect();
			const total = rect.height - window.innerHeight;
			const progress = total > 0 ? Math.min(1, Math.max(0, -rect.top / total)) : 1;
			bar.style.transform = `scaleX(${progress})`;
			ticking = false;
		};

		window.addEventListener(
			"scroll",
			() => {
				if (!ticking) {
					ticking = true;
					requestAnimationFrame(update);
				}
			},
			{ passive: true }
		);
		update();
	}

	setupProgressBar();
	document.addEventListener("astro:page-load", setupProgressBar);
</script>
```

- [ ] **Step 2: Implement `WikiPagination.astro`**

Create `application/frontend/src/components/wiki/WikiPagination.astro`:

```astro
---
import { ArrowLeft, ArrowRight } from "lucide-react";
import { getInlineTranslations, type Lang } from "@/i18n";
import { getWikiSlug, type WikiEntry } from "@/lib/wiki-utils";

interface Props {
	prev?: WikiEntry;
	next?: WikiEntry;
	lang: Lang;
}

const { prev, next, lang } = Astro.props;
const _ = getInlineTranslations(lang);

const cardClass =
	"group/card bg-surface-lowest border-border-subtle hover:border-secondary/40 focus-visible:outline-secondary rounded-xl border p-4 sm:p-5 shadow-xs transition-[translate,box-shadow,border-color] duration-300 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 motion-safe:hover:-translate-y-0.5";
---

{
	(prev || next) && (
		<nav aria-label={_("Article navigation")} class="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2">
			{prev ? (
				<a href={`/${lang}/wiki/${getWikiSlug(prev)}`} class={`${cardClass} flex flex-col gap-1`}>
					<span class="font-label-caps text-industrial-gray inline-flex items-center gap-2 text-[11px] tracking-widest uppercase">
						<ArrowLeft
							className="text-secondary size-4 transition-transform duration-200 group-hover/card:-translate-x-1"
							aria-hidden="true"
						/>
						{_("Previous article")}
					</span>
					<span class="font-headline-lg text-foreground text-sm font-semibold">{prev.data.title}</span>
				</a>
			) : (
				<div class="hidden sm:block" />
			)}

			{next && (
				<a
					href={`/${lang}/wiki/${getWikiSlug(next)}`}
					class={`${cardClass} flex flex-col items-end gap-1 text-right`}
				>
					<span class="font-label-caps text-industrial-gray inline-flex items-center gap-2 text-[11px] tracking-widest uppercase">
						{_("Next article")}
						<ArrowRight
							className="text-secondary size-4 transition-transform duration-200 group-hover/card:translate-x-1"
							aria-hidden="true"
						/>
					</span>
					<span class="font-headline-lg text-foreground text-sm font-semibold">{next.data.title}</span>
				</a>
			)}
		</nav>
	)
}
```

- [ ] **Step 3: Implement `WikiSidebar.astro`**

Create `application/frontend/src/components/wiki/WikiSidebar.astro`:

```astro
---
import { BookOpen, ChevronRight, Search } from "lucide-react";
import { getInlineTranslations, type Lang } from "@/i18n";
import { getWikiSlug, type WikiEntry } from "@/lib/wiki-utils";

interface Props {
	articles: WikiEntry[];
	currentSlug: string;
	lang: Lang;
}

const { articles, currentSlug, lang } = Astro.props;
const _ = getInlineTranslations(lang);
---

<aside class="lg:sticky lg:top-24 lg:self-start">
	<details data-wiki-nav open class="group/nav">
		<summary class="bg-surface-lowest border-border-subtle font-label-caps text-foreground flex cursor-pointer list-none items-center justify-between rounded-lg border px-4 py-3 text-xs font-semibold tracking-widest uppercase lg:hidden">
			<span class="inline-flex items-center gap-2">
				<BookOpen className="text-secondary size-4" aria-hidden="true" />
				{_("Browse articles")}
			</span>
			<ChevronRight className="size-4 transition-transform group-open/nav:rotate-90" />
		</summary>

		<div class="mt-4 lg:mt-0">
			<div class="relative mb-5">
				<Search
					className="text-industrial-gray pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2"
					aria-hidden="true"
				/>
				<input
					type="search"
					class="font-body-md text-foreground placeholder:text-industrial-gray/70 border-border-subtle bg-surface-lowest focus-visible:outline-secondary h-11 w-full rounded-lg border pr-4 pl-10 text-sm shadow-xs transition-shadow focus-visible:outline-2 focus-visible:outline-offset-2"
					placeholder={_("Search the wiki…")}
					aria-label={_("Search the wiki…")}
					data-wiki-filter="[data-wiki-nav-item]"
					data-wiki-empty="#wiki-nav-empty"
				/>
			</div>

			<nav aria-label={_("All articles")} class="flex flex-col gap-2">
				<p class="font-label-caps text-industrial-gray m-0 mb-1 flex items-center gap-2 text-[11px] font-semibold tracking-widest uppercase">
					<BookOpen className="text-secondary size-3.5" aria-hidden="true" />
					{_("All articles")}
				</p>
				<ul class="border-border-subtle m-0 list-none border-l p-0">
					{
						articles.map((item) => {
							const slug = getWikiSlug(item);
							const active = slug === currentSlug;
							return (
								<li data-wiki-nav-item data-wiki-text={`${item.data.title} ${item.data.description ?? ""}`.toLowerCase()}>
									<a
										href={`/${lang}/wiki/${slug}`}
										aria-current={active ? "page" : undefined}
										class:list={[
											"font-body-md -ml-px block border-l-2 py-1.5 pr-2 pl-4 text-sm leading-snug transition-colors",
											active
												? "border-secondary bg-secondary/5 text-foreground font-semibold"
												: "border-transparent text-industrial-gray hover:border-secondary/50 hover:text-foreground",
										]}
									>
										{item.data.title}
									</a>
								</li>
							);
						})
					}
				</ul>
			</nav>

			<p id="wiki-nav-empty" hidden class="font-body-md text-industrial-gray m-0 mt-4 text-sm">
				{_("No articles match your search.")}
			</p>
		</div>
	</details>
</aside>

<script>
	function setupWikiSidebar() {
		// Filter items on search input
		document.querySelectorAll<HTMLInputElement>("[data-wiki-filter]").forEach((input) => {
			const itemSelector = input.dataset.wikiFilter ?? "";
			const emptyEl = input.dataset.wikiEmpty ? document.querySelector<HTMLElement>(input.dataset.wikiEmpty) : null;

			const run = () => {
				const query = input.value.trim().toLowerCase();
				const items = document.querySelectorAll<HTMLElement>(itemSelector);
				let visible = 0;
				items.forEach((item) => {
					const match = query === "" || (item.dataset.wikiText ?? "").includes(query);
					item.hidden = !match;
					if (match) visible++;
				});
				if (emptyEl) emptyEl.hidden = visible > 0 || query === "";
			};
			input.addEventListener("input", run);
		});

		// Ensure drawer is open on desktop
		const nav = document.querySelector<HTMLDetailsElement>("[data-wiki-nav]");
		if (nav) {
			const desktop = window.matchMedia("(min-width: 1024px)");
			const sync = () => {
				if (desktop.matches) nav.open = true;
			};
			sync();
			desktop.addEventListener("change", sync);
		}
	}

	setupWikiSidebar();
	document.addEventListener("astro:page-load", setupWikiSidebar);
</script>
```

- [ ] **Step 4: Implement `WikiToc.astro`**

Create `application/frontend/src/components/wiki/WikiToc.astro`:

```astro
---
import type { MarkdownHeading } from "astro";
import { AlignLeft, ChevronRight } from "lucide-react";
import { getInlineTranslations, type Lang } from "@/i18n";

interface Props {
	headings: MarkdownHeading[];
	mobile?: boolean;
	lang: Lang;
}

const { headings = [], mobile = false, lang } = Astro.props;
const _ = getInlineTranslations(lang);

// Filter headings to depth 2 and 3
const filteredHeadings = headings.filter((h) => h.depth === 2 || h.depth === 3);
---

{
	filteredHeadings.length > 0 && (
		mobile ? (
			<details class="group/toc bg-surface-lowest border-border-subtle mt-6 rounded-lg border xl:hidden">
				<summary class="font-label-caps text-foreground flex cursor-pointer list-none items-center justify-between px-4 py-3 text-xs font-semibold tracking-widest uppercase">
					<span class="inline-flex items-center gap-2">
						<AlignLeft className="text-secondary size-4" aria-hidden="true" />
						{_("On this page")}
					</span>
					<ChevronRight className="size-4 transition-transform group-open/toc:rotate-90" />
				</summary>
				<ul class="m-0 list-none px-4 pb-3">
					{filteredHeadings.map((item) => (
						<li>
							<a
								href={`#${item.slug}`}
								class:list={[
									"font-body-md text-industrial-gray hover:text-secondary block py-1.5 text-sm transition-colors",
									item.depth === 3 && "pl-4",
								]}
							>
								{item.text}
							</a>
						</li>
					))}
				</ul>
			</details>
		) : (
			<aside class="hidden xl:block">
				<nav aria-label={_("On this page")} class="sticky top-24" data-wiki-toc>
					<p class="font-label-caps text-industrial-gray m-0 mb-3 flex items-center gap-2 text-[11px] font-semibold tracking-widest uppercase">
						<AlignLeft className="text-secondary size-3.5" aria-hidden="true" />
						{_("On this page")}
					</p>
					<ul class="border-border-subtle m-0 list-none border-l p-0">
						{filteredHeadings.map((item) => (
							<li>
								<a
									href={`#${item.slug}`}
									data-toc-link={item.slug}
									class:list={[
										"font-body-md text-industrial-gray hover:text-foreground aria-[current=true]:border-secondary aria-[current=true]:text-secondary -ml-px block border-l-2 border-transparent py-1.5 pr-2 text-[13px] leading-snug transition-colors aria-[current=true]:font-semibold",
										item.depth === 3 ? "pl-7" : "pl-4",
									]}
								>
									{item.text}
								</a>
							</li>
						))}
					</ul>
				</nav>
			</aside>
		)
	)
}

<script>
	function setupTocObserver() {
		const tocLinks = Array.from(document.querySelectorAll<HTMLAnchorElement>("[data-toc-link]"));
		if (tocLinks.length === 0) return;

		const headingElements = tocLinks
			.map((link) => document.getElementById(link.dataset.tocLink ?? ""))
			.filter((el): el is HTMLElement => el !== null);

		const setActive = (id: string) => {
			for (const link of tocLinks) {
				link.setAttribute("aria-current", String(link.dataset.tocLink === id));
			}
		};

		if (headingElements[0]) {
			setActive(headingElements[0].id);
		}

		const observer = new IntersectionObserver(
			(entries) => {
				const visible = entries
					.filter((e) => e.isIntersecting)
					.sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
				if (visible[0]) setActive(visible[0].target.id);
			},
			{ rootMargin: "-96px 0px -65% 0px" }
		);

		headingElements.forEach((h) => observer.observe(h));
	}

	setupTocObserver();
	document.addEventListener("astro:page-load", setupTocObserver);
</script>
```

- [ ] **Step 5: Run Biome check to verify formatting and syntax**

Run: `bun run check`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add application/frontend/src/components/wiki/
git commit -m "feat(wiki): add WikiSidebar, WikiToc, WikiProgressBar, and WikiPagination components"
```

______________________________________________________________________

### Task 6: Wiki Index Page Route

**Files:**

- Create: `application/frontend/src/pages/[lang]/wiki/index.astro`

- [ ] **Step 1: Implement `src/pages/[lang]/wiki/index.astro`**

Create `application/frontend/src/pages/[lang]/wiki/index.astro`:

```astro
---
import { getCollection } from "astro:content";
import { BookOpen, Search } from "lucide-react";
import WikiCard from "@/components/wiki/WikiCard";
import WikiCta from "@/components/wiki/WikiCta.astro";
import { getInlineTranslations, type Lang, languages } from "@/i18n";
import Layout from "@/layouts/Layout.astro";
import {
	calculateReadingMinutes,
	filterWikiByLocale,
	getWikiCoverImage,
	sortWikiArticles,
	type WikiEntry,
} from "@/lib/wiki-utils";

export async function getStaticPaths() {
	return Object.keys(languages).map((lang) => ({
		params: { lang },
	}));
}

const { lang } = Astro.params as { lang: Lang };
const _ = getInlineTranslations(lang);

const allArticles = await getCollection("wiki");
const localizedArticles = filterWikiByLocale(allArticles, lang);
const sortedArticles = sortWikiArticles(localizedArticles);

const title = `${_("Knowledge Base")} | ${_("OS-Technology Ukraine")}`;
const description = _(
	"Technical articles, guides, and operational documentation for industrial equipment."
);
---

<Layout title={title} description={description}>
	{/* Hero Banner */}
	<header
		class="from-surface-container/40 to-background border-border-subtle relative w-full overflow-hidden border-b bg-linear-to-b py-12 lg:py-20"
	>
		<div
			class="bg-secondary/10 pointer-events-none absolute -top-32 -right-24 size-[30rem] rounded-full blur-3xl"
			aria-hidden="true"
		>
		</div>
		<div class="px-edge-margin relative mx-auto max-w-[1280px]">
			<div class="max-w-3xl">
				<p class="font-label-caps text-secondary m-0 flex items-center gap-3 text-xs font-semibold tracking-widest uppercase">
					<span class="eyebrow-rule bg-secondary h-px w-8" aria-hidden="true"></span>
					{_("Knowledge Base")}
				</p>
				<h1 class="font-display-lg text-foreground m-0 mt-4 text-4xl tracking-tight text-balance sm:text-5xl">
					{_("Knowledge Base")}
				</h1>
				<p class="font-body-md text-industrial-gray m-0 mt-5 max-w-prose text-base leading-relaxed lg:text-lg">
					{description}
				</p>

				{/* Search bar */}
				<div class="relative mt-8 max-w-xl">
					<Search
						className="text-industrial-gray pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2"
						aria-hidden="true"
					/>
					<input
						type="search"
						class="font-body-md text-foreground placeholder:text-industrial-gray/70 border-border-subtle bg-surface-lowest focus-visible:outline-secondary h-12 w-full rounded-lg border pr-4 pl-10 text-sm shadow-xs transition-shadow focus-visible:outline-2 focus-visible:outline-offset-2"
						placeholder={_("Search the wiki…")}
						aria-label={_("Search the wiki…")}
						data-wiki-index-filter
					/>
				</div>
			</div>
		</div>
	</header>

	{/* Articles Grid Section */}
	<section class="px-edge-margin mx-auto max-w-[1280px] py-12 lg:py-20" aria-label={_("All articles")}>
		<div
			id="wiki-index-grid"
			class="gap-gutter grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
		>
			{
				sortedArticles.map((article: WikiEntry) => (
					<WikiCard
						entry={article}
						lang={lang}
						readMinutes={calculateReadingMinutes(article.body ?? "")}
						coverImage={getWikiCoverImage(article, allArticles)}
					/>
				))
			}
		</div>

		<p
			id="wiki-index-empty"
			hidden
			class="font-body-md text-industrial-gray m-0 mt-10 flex items-center justify-center gap-2 text-center text-sm"
		>
			<BookOpen className="text-secondary size-4" aria-hidden="true" />
			{_("No articles match your search.")}
		</p>

		<WikiCta lang={lang} />
	</section>
</Layout>

<script>
	function setupWikiIndexSearch() {
		const searchInput = document.querySelector<HTMLInputElement>("[data-wiki-index-filter]");
		const grid = document.getElementById("wiki-index-grid");
		const emptyEl = document.getElementById("wiki-index-empty");

		if (!searchInput || !grid) return;

		searchInput.addEventListener("input", () => {
			const query = searchInput.value.trim().toLowerCase();
			const items = grid.querySelectorAll<HTMLElement>("[data-wiki-item]");
			let visibleCount = 0;

			items.forEach((item) => {
				const match = query === "" || (item.dataset.wikiText ?? "").includes(query);
				item.hidden = !match;
				if (match) visibleCount++;
			});

			if (emptyEl) {
				emptyEl.hidden = visibleCount > 0 || query === "";
			}
		});
	}

	setupWikiIndexSearch();
	document.addEventListener("astro:page-load", setupWikiIndexSearch);
</script>
```

- [ ] **Step 2: Run Biome check to verify formatting and syntax**

Run: `bun run check`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add application/frontend/src/pages/[lang]/wiki/index.astro
git commit -m "feat(wiki): implement Wiki Index page route"
```

______________________________________________________________________

### Task 7: Wiki Article Detail Page Route

**Files:**

- Create: `application/frontend/src/pages/[lang]/wiki/[slug].astro`

- [ ] **Step 1: Implement `src/pages/[lang]/wiki/[slug].astro`**

Create `application/frontend/src/pages/[lang]/wiki/[slug].astro`:

```astro
---
import { getCollection, render } from "astro:content";
import { CalendarDays, ChevronRight, Clock } from "lucide-react";
import WikiCard from "@/components/wiki/WikiCard.astro";
import WikiCta from "@/components/wiki/WikiCta.astro";
import WikiPagination from "@/components/wiki/WikiPagination.astro";
import WikiProgressBar from "@/components/wiki/WikiProgressBar.astro";
import WikiSidebar from "@/components/wiki/WikiSidebar.astro";
import WikiToc from "@/components/wiki/WikiToc.astro";
import { getInlineTranslations, type Lang } from "@/i18n";
import Layout from "@/layouts/Layout.astro";
import { breadcrumbSchema } from "@/lib/structured-data";
import {
	calculateReadingMinutes,
	filterWikiByLocale,
	findWikiTranslation,
	getWikiCoverImage,
	getWikiLocale,
	getWikiSlug,
	sortWikiArticles,
	type WikiEntry,
} from "@/lib/wiki-utils";

export async function getStaticPaths() {
	const allArticles = await getCollection("wiki");
	const paths = [];

	for (const article of allArticles) {
		const locale = getWikiLocale(article);
		const slug = getWikiSlug(article);
		const localeArticles = sortWikiArticles(filterWikiByLocale(allArticles, locale));
		const currentIndex = localeArticles.findIndex((a) => getWikiSlug(a) === slug);
		const prev = currentIndex > 0 ? localeArticles[currentIndex - 1] : undefined;
		const next =
			currentIndex >= 0 && currentIndex < localeArticles.length - 1
				? localeArticles[currentIndex + 1]
				: undefined;

		const relatedSlugs = article.data.related ?? [];
		const relatedArticles = relatedSlugs
			.map((relSlug) => localeArticles.find((a) => getWikiSlug(a) === relSlug))
			.filter((a): a is WikiEntry => Boolean(a));

		paths.push({
			params: { lang: locale, slug },
			props: {
				article,
				allArticles,
				localeArticles,
				prev,
				next,
				relatedArticles,
			},
		});
	}

	return paths;
}

interface Props {
	article: WikiEntry;
	allArticles: WikiEntry[];
	localeArticles: WikiEntry[];
	prev?: WikiEntry;
	next?: WikiEntry;
	relatedArticles: WikiEntry[];
}

const { article, allArticles, localeArticles, prev, next, relatedArticles } = Astro.props;
const { lang, slug } = Astro.params as { lang: Lang; slug: string };
const _ = getInlineTranslations(lang);

const { Content, headings } = await render(article);

const title = article.data.title;
const description = article.data.description ?? "";
const readMinutes = calculateReadingMinutes(article.body ?? "");
const coverImage = getWikiCoverImage(article, allArticles);

const siteUrl = Astro.site || "https://ocs.com.ua";
const currentUrl = new URL(Astro.url.pathname, siteUrl).href;

const structuredData = [
	{
		"@context": "https://schema.org",
		"@type": "Article",
		headline: title,
		description: description,
		image: coverImage ? [new URL(coverImage, siteUrl).href] : undefined,
		inLanguage: lang === "ua" ? "uk" : "en",
		mainEntityOfPage: {
			"@type": "WebPage",
			"@id": currentUrl,
		},
	},
	breadcrumbSchema([
		{ name: lang === "en" ? "Home" : "Головна", url: new URL(`/${lang}/`, siteUrl).href },
		{ name: _("Knowledge Base"), url: new URL(`/${lang}/wiki`, siteUrl).href },
		{ name: title, url: currentUrl },
	]),
];
---

<Layout
	title={`${title} | ${_("OS-Technology Ukraine")}`}
	description={description}
	image={coverImage}
	article={true}
>
	<script is:inline type="application/ld+json" set:html={JSON.stringify(structuredData)} />

	<WikiProgressBar />

	<div class="px-edge-margin mx-auto max-w-[1280px] py-10 lg:py-14">
		{/* Breadcrumbs */}
		<nav aria-label={_("Breadcrumb")} class="mb-8">
			<ol class="font-technical-data text-industrial-gray m-0 flex list-none flex-wrap items-center gap-1.5 p-0 text-xs">
				<li>
					<a href={`/${lang}/`} class="hover:text-secondary transition-colors hover:underline">
						{lang === "en" ? "Home" : "Головна"}
					</a>
				</li>
				<li aria-hidden="true"><ChevronRight className="size-3.5" /></li>
				<li>
					<a href={`/${lang}/wiki`} class="hover:text-secondary transition-colors hover:underline">
						{_("Knowledge Base")}
					</a>
				</li>
				<li aria-hidden="true"><ChevronRight className="size-3.5" /></li>
				<li aria-current="page" class="text-foreground font-medium">{title}</li>
			</ol>
		</nav>

		<div class="gap-gutter grid grid-cols-1 lg:grid-cols-[16rem_minmax(0,1fr)] xl:grid-cols-[16rem_minmax(0,1fr)_14rem]">
			{/* Left Column: Sidebar Navigation */}
			<WikiSidebar articles={localeArticles} currentSlug={slug} lang={lang} />

			{/* Center Column: Article Main Content */}
			<article class="min-w-0">
				<header class="border-border-subtle border-b pb-8">
					<h1 class="font-display-lg text-foreground m-0 text-3xl tracking-tight text-balance sm:text-4xl lg:text-5xl">
						{title}
					</h1>

					{
						description && (
							<p class="font-body-md text-industrial-gray m-0 mt-4 max-w-prose text-base leading-relaxed lg:text-lg">
								{description}
							</p>
						)
					}

					<div class="font-technical-data text-industrial-gray m-0 mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs">
						<span class="inline-flex items-center gap-1.5">
							<Clock className="text-secondary size-4" aria-hidden="true" />
							{readMinutes} {_("min read")}
						</span>
					</div>
				</header>

				{
					coverImage && (
						<div class="border-border-subtle mt-8 aspect-video w-full overflow-hidden rounded-xl border bg-surface-container">
							<img src={coverImage} alt={title} class="size-full object-cover" />
						</div>
					)
				}

				{/* Mobile TOC */}
				<WikiToc headings={headings} mobile={true} lang={lang} />

				{/* Markdown Article Body */}
				<div class="wiki-content prose prose-neutral dark:prose-invert mt-8 max-w-none">
					<Content />
				</div>

				{/* Previous / Next Article Navigation */}
				<WikiPagination prev={prev} next={next} lang={lang} />

				{/* Related Articles */}
				{
					relatedArticles.length > 0 && (
						<section class="mt-12" aria-labelledby="related-heading">
							<h2
								id="related-heading"
								class="font-label-caps text-industrial-gray m-0 mb-4 flex items-center gap-3 text-xs font-semibold tracking-widest uppercase"
							>
								<span class="bg-secondary h-px w-6" aria-hidden="true" />
								{_("Related articles")}
							</h2>
							<div class="gap-gutter grid grid-cols-1 md:grid-cols-2">
								{relatedArticles.map((rel: WikiEntry) => (
									<WikiCard
										entry={rel}
										lang={lang}
										readMinutes={calculateReadingMinutes(rel.body ?? "")}
										coverImage={getWikiCoverImage(rel, allArticles)}
									/>
								))}
							</div>
						</section>
					)
				}

				{/* Bottom Consultation CTA */}
				<WikiCta lang={lang} />
			</article>

			{/* Right Column: Desktop TOC */}
			<WikiToc headings={headings} lang={lang} />
		</div>
	</div>
</Layout>

<style>
	/* Markdown typography and image enhancements */
	.wiki-content :global(h2) {
		font-family: var(--font-heading);
		scroll-margin-top: 7rem;
	}

	.wiki-content :global(h3) {
		font-family: var(--font-heading);
		scroll-margin-top: 7rem;
	}

	.wiki-content :global(img) {
		border: 1px solid var(--color-border-subtle);
		border-radius: var(--radius-lg);
		max-width: 100%;
		height: auto;
		margin: 1.5rem 0;
	}

	.wiki-content :global(table) {
		width: 100%;
		border-collapse: collapse;
	}
</style>
```

- [ ] **Step 2: Run Biome check to verify formatting and syntax**

Run: `bun run check`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add application/frontend/src/pages/[lang]/wiki/[slug].astro
git commit -m "feat(wiki): implement Wiki Article detail page route with TOC and progress bar"
```

______________________________________________________________________

### Task 8: Verification & Build Validation

**Files:**

- All modified and newly created files across the repository

- [ ] **Step 1: Run all unit and data integrity tests**

Run: `bun test` (in `application/frontend`)
Expected: All tests pass (240+ tests).

- [ ] **Step 2: Run Biome linter and type checks**

Run: `bun run check` (in `application/frontend`)
Expected: All files pass linting and formatting with no errors.

- [ ] **Step 3: Run production Astro build**

Run: `bun run build` (in `application/frontend`)
Expected: Static build completes successfully generating all routes (`/en/wiki`, `/ua/wiki`, `/en/wiki/*`, `/ua/wiki/*`).

- [ ] **Step 4: Commit any final cleanup or adjustments**

```bash
git add .
git commit -m "chore(wiki): complete verification and build checks"
```

______________________________________________________________________

## Self-Review Checklist

- **Spec coverage:**
  - Content collection & schema (`src/content.config.ts`, `_config.template.yml`) covered in Task 1.
  - Utility layer (`src/lib/wiki-utils.ts`) with read time calculation covered in Task 2.
  - i18n UI translations in Ukrainian and English covered in Task 3.
  - UI components (`WikiCard`, `WikiCta`, `WikiSidebar`, `WikiToc`, `WikiProgressBar`, `WikiPagination`) covered in Tasks 4 & 5.
  - Pages (`/[lang]/wiki` index and `/[lang]/wiki/[slug]` detail) covered in Tasks 6 & 7.
  - Verification & validation covered in Task 8.
- **Placeholder scan:** No "TODO", "TBD", or placeholder code.
- **Type consistency:** Function signatures (`getWikiLocale`, `getWikiSlug`, `filterWikiByLocale`, `sortWikiArticles`, `calculateReadingMinutes`, `findWikiTranslation`, `getWikiCoverImage`) and prop types match across components and utilities.
