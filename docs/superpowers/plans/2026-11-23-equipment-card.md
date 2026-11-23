# Equipment Card Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** One equipment card design (variant B) for the catalogue grids, search results and Related equipment.

**Architecture:** `ProductCard.astro` becomes the single card: the whole card is one `<a data-product-item>` laid out on 5 subgrid rows. The sidebar renders every locale product as a `ProductCard` inside `<template data-product-cards>`; search clones the matches. A `shortTitle()` helper strips the model code from titles.

**Tech Stack:** Astro 7, Tailwind 4 (`grid-rows-subgrid`, `row-span-5`), bun test, Playwright.

**Spec:** `docs/superpowers/specs/2026-11-23-equipment-card-design.md`

## Global Constraints

- No "..." truncation (`line-clamp`, `truncate`) anywhere on the card.
- Summary: `summarize(description, 160)`.
- Pink (`text-secondary`) only on the link line, the badge and the hover trace.
- Hover: border trace and `card-hover` shadow only; no lift, no photo zoom.
- Strings through `_()`; reuse existing msgids "Technical Details" and "Category".
- Lucide icons, no Material Symbols on the card.

## Review Focus

- Product with no description and no specs (TQS-HC-A): default sentence plus a full-width "Category" cell.
- Title where the model is lowercase or mixed case ("HC-M-MDi" vs slug "hc-m-mdi"), or preceded by "model"/"модель".
- A model that is a prefix of another code ("HC-A" in "TQS-HC-A"): must not be stripped.
- Search with no matches, then clearing the query: the original grid comes back with reveals and skeletons working.
- Ukrainian long titles wrap without overflow at 320 px.

______________________________________________________________________

### Task 1: `shortTitle()` helper

**Files:** Modify `src/lib/featured-equipment.ts`; Test `tests/lib/featured-equipment.test.ts`

**Interfaces:** Produces `shortTitle(title: string, model: string): string`

- [ ] Tests: `"HC-A Checkweigher","HC-A"` -> `"Checkweigher"`; `"HC-M-MDi Checkweigher with Metal Detector","HC-M-MDI"` -> `"Checkweigher with Metal Detector"`; `"Serialization system with checkweighing, model TQS-HC-A","TQS-HC-A"` -> `"Serialization system with checkweighing"`; `"Контрольно динамічні ваги з металодетектором HC-A-MD","HC-A-MD"` -> `"Контрольно динамічні ваги з металодетектором"`; `"система серіалізації TQS-SP","TQS-SP"` -> `"Система серіалізації"`; `"Система ... модель TQS-HC-A","TQS-HC-A"` strips "модель"; `"TQS-HC-A Line","HC-A"` unchanged; `"HC-A","HC-A"` -> `"HC-A"` (falls back to full title); double spaces collapse.
- [ ] Run `bun test tests/lib/featured-equipment.test.ts`: FAIL. Implement (case-insensitive, model bounded by non-word-non-hyphen, optional `,?\s*(model|модель)` before it, trim trailing punctuation, uppercase first letter). Run: PASS.

### Task 2: ProductCard and grids

**Files:** Modify `src/components/catalogue/ProductCard.astro`, both grid pages (`[category]/index.astro`, `industry/[slug].astro`), `src/styles/global.css`, `tests/e2e/skeleton.e2e.ts`

- [ ] Card root `<a href data-product-item data-product-text class="card-hover product-card reveal group row-span-5 grid grid-rows-subgrid gap-y-0 ...">`, rows: `.skeleton` image well (4:3, `bg-surface-container/60`, manufacturer badge), head (model + short title), summary or default sentence, link line (`_("Technical Details")` + Lucide `ArrowRight`), specs `dl` (2 cells) or one "Category" cell with the translated category title from `getCategoriesForLocale(lang)`.
- [ ] `global.css`: `.product-card:hover { translate: none; }` after the `card-hover` lift rule.
- [ ] e2e skeleton: `firstCardWrapper` -> `[data-product-item] .skeleton`; href from `a[data-product-item]`.
- [ ] `bun run i18n`, translate the default sentence in `locales/ua.po`, `bun run i18n` again.

### Task 3: Search clones real cards

**Files:** Modify `CatalogueSidebar.astro`, `CatalogueBand.astro`, both grid pages, `src/lib/content-utils.ts` (drop `ProductSearchEntry`), `tests/e2e/motion.e2e.ts`, `tests/config/consistency.test.ts`

**Interfaces:** Sidebar and band props `searchProducts?: EquipmentEntry[]`, `searchGalleries?: Record<string, ImageMetadata[]>` replace `productSearchIndex`.

- [ ] Sidebar renders `<template data-product-cards>` with a `ProductCard` per product; script filters `template.content` cards by `data-product-text`, clones them into a `data-product-grid`, sets `--i` to `index % 3`, calls `observeReveals` and `initImageSkeletons`. JSON index, `escapeHtml`, `renderSearchResults` string card and `data-label-technical-details` go.
- [ ] motion e2e reads the first word from the template's first card `data-product-text`; consistency test drops `CatalogueSidebar.astro` from the card list.

### Task 4: Related equipment compact card

**Files:** Modify `src/components/catalogue/RelatedEquipment.astro`

- [ ] Same image well tint, model code, short title, one spec line; label shows the translated category title; no zoom; grid uses subgrid rows (4 rows).

### Task 5: Verify

- [ ] `bun test`, `bun run check:fix`, `bun run build`, then visual check (category, industry, search, product Related; `/en` and `/ua`; 1440 and 375 px).
