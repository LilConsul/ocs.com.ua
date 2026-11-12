# Homepage Featured Equipment and Design Consistency Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a catalogue-driven "Featured equipment" band to the homepage and make motion, cards, buttons, section spacing and the page background consistent across the site.

**Architecture:** Three-speed motion tokens in `global.css` (mirrored in `src/lib/anims/tokens.ts`) replace hand-set durations. Shared utility classes (`card-hover`, `btn-primary`, `btn-secondary`, `link-arrow`, `section-block`) replace per-component copies. One page-long gradient layer in `Layout.astro` sits behind transparent sections; the existing fixed `TechnicalField` canvas is untouched. The featured band is a pure data function (`featured-equipment.ts`) feeding a static Astro component with a small progressive-enhancement tabs script.

**Tech Stack:** Astro 7 (static), Tailwind 4, TypeScript, Bun test, Playwright (e2e, needs a build), Biome, `motion` package, Decap CMS.

**Spec:** `docs/superpowers/specs/2026-11-11-homepage-products-and-design-consistency-design.md`

All paths are relative to `application/frontend/` unless they start with `docs/`.

## Global Constraints

- Static prerendered pages; no UI framework, no hydrated islands; content visible without JavaScript (`src/styles/no-js.css`); reduced motion respected.
- Both `/ua` and `/en` pages; new UI strings use the inline `_()` pattern, then run `bun run i18n`. Ukrainian text is longer than English; cards and tabs must tolerate it.
- Exactly three motion speeds: `--dur-fast`, `--dur-base`, `--dur-slow` (150 ms, 300 ms, 700 ms), one easing family (`--ease-out-expo`, `--ease-out-quart`). No hand-set `duration-NNN` utilities and no `transition-all`.
- The existing `TechnicalField` canvas and its per-page variants stay as they are. No grain, no dot matrix, no pulsing orbs, no mouse-reactive effects.
- Alternating white/grey section fills are removed on every page, no exceptions. Cards, forms and tables keep their own surfaces.
- No emojis in code, docs or commit messages. Commit messages follow `.gitmessage`; per `application/frontend/CLAUDE.md`, do not add a `Co-Authored-By` line to commits.
- Run `bun run check:fix`, `bun test` and (for visual or motion tasks) `bun run build && bun run test:e2e` before the final commit of each task.

## Review Focus

- Category with exactly 1 product: the band shows a spotlight and no list, no empty column, no broken grid.
- Category with 2 products: spotlight plus one row; the stretched cards still line up.
- Product with no gallery image or no specs: placeholder image and no empty spec slots.
- JavaScript disabled: every category panel is visible, stacked, with its own heading; no dead tab bar.
- Reduced motion: tab switching and reveals show content immediately; nothing stays hidden.
- Ukrainian long titles and descriptions in tabs and rows: no overflow or clipped text at 375 px width.

______________________________________________________________________

### Task 1: Branch and motion tokens

**Files:**

- Modify: `src/styles/global.css` (motion tokens block near line 229, `hero-rise`, `hero-media`, `.mobile-menu-shell`, reveal and `clip-path 900ms` rules)
- Modify: `src/lib/anims/tokens.ts`
- Test: `tests/config/motion.test.ts`, `tests/lib/anims/tokens.test.ts`

**Interfaces:**

- Produces: CSS tokens `--dur-fast`, `--dur-base`, `--dur-slow` (unchanged names); JS constant `REVEAL_DURATION` equal to `--dur-slow` in seconds (0.7); JS export `DUR = { fast: 0.15, base: 0.3, slow: 0.7 }` in `src/lib/anims/tokens.ts`.

- [ ] **Step 1:** Create the branch: `git switch main && git pull && git switch -c feat/homepage-products-design-consistency`.

- [ ] **Step 2: Write failing tests.** In `tests/lib/anims/tokens.test.ts` add `it("exposes DUR matching the CSS duration tokens")`: assert `DUR` equals `{ fast: 0.15, base: 0.3, slow: 0.7 }` and `REVEAL_DURATION === DUR.slow`. In `tests/config/motion.test.ts` add `it("keeps CSS duration tokens equal to the JS ones")`: parse `--dur-fast|base|slow` (ms) from `global.css` and compare with `DUR * 1000`. Add `it("uses no hand-set durations in global.css rules")`: after comment stripping, assert no `transition` or `animation` declaration contains a literal duration such as `900ms`, `0.7s`, `1.2s` (every duration is `var(--dur-*)`), allowing `0s`.

- [ ] **Step 3: Run** `bun test tests/lib/anims tests/config/motion.test.ts`; expected FAIL on the three new tests.

- [ ] **Step 4: Implement.** Export `DUR` from `tokens.ts`, set `REVEAL_DURATION = DUR.slow`, keep `STAGGER_STEP`. In `global.css` replace every literal duration (`0.7s` in `.hero-rise`, `1.2s` in `.hero-media`, `900ms` clip-path, `700ms` transform, `ease` fast transitions) with `var(--dur-fast|base|slow)`; use `--dur-slow` where the old value was 700 ms or longer, `--dur-base` for 300 ms and `--dur-fast` for 150 ms or less. Only the three tokens carry numbers.

- [ ] **Step 5: Run** `bun test`; expected PASS.

- [ ] **Step 6: Commit** `refactor: align motion durations to three shared tokens`.

### Task 2: Remove hand-set durations and `transition-all` from components

**Files:**

- Modify: the 19 files from `grep -rln "duration-\(100\|200\|500\)\|transition-all" src` (AboutCta, AboutHero, ClientDirectory, ManufacturerCredentials, CatalogueBand, CatalogueSidebar, ProductCard, ProductGallery, ContactForm, Header, IndustryCard, IndustryCardCTA, PartnerLogo, HeroSection, WikiCard, WikiCta, WikiPagination, WikiProgressBar, `[slug].astro`), plus any file using `duration-300`

- Test: create `tests/config/motion-classes.test.ts`

- [ ] **Step 1: Write the failing test** `tests/config/motion-classes.test.ts`: walk every `.astro` file under `src`, assert none matches `/\bduration-\d+\b/` or `/\btransition-all\b/`. Allowed replacements are `duration-(--dur-fast)`, `duration-(--dur-base)`, `duration-(--dur-slow)` and `ease-(--ease-out-quart)`.

- [ ] **Step 2: Run** `bun test tests/config/motion-classes.test.ts`; expected FAIL listing files.

- [ ] **Step 3: Implement.** Replace `duration-100/200` with `duration-(--dur-fast)`, `duration-300` with `duration-(--dur-base)`, `duration-500/700` with `duration-(--dur-slow)`, and `transition-all` with the specific property list that component actually animates (for example `transition-[translate,box-shadow,border-color]`). Add `ease-(--ease-out-quart)` next to every `transition-*` that has none.

- [ ] **Step 4: Run** `bun test` and `bun run check:fix`; expected PASS.

- [ ] **Step 5: Commit** `refactor: use shared motion tokens in component classes`.

### Task 3: Remove the picture fade-in

**Files:**

- Delete: `src/lib/anims/images.ts`, `tests/lib/anims/images.test.ts`

- Modify: `src/lib/anims/runtime.ts`, `src/styles/global.css` (`@keyframes img-in`, `.img-fade` rules), `src/styles/no-js.css` if it mentions `img-fade`

- Modify (remove `img-fade` class and any `observeImages` import): `ClientDirectory.astro`, `CatalogueSidebar.astro`, `ProductCard.astro`, `RelatedEquipment.astro`, `PartnerLogo.astro`, `PartnersSection.astro`, `WikiCard.astro`, `[lang]/wiki/[slug].astro`

- Modify: `tests/config/motion.test.ts` (the `img-fade` describe blocks near lines 110-155), `tests/e2e/motion.e2e.ts` (image tests near lines 116, 156-195)

- [ ] **Step 1: Write the failing test** in `tests/config/motion-classes.test.ts`: `it("has no img-fade anywhere in src")` asserts no file under `src` contains `img-fade`, `observeImages` or `data-loaded`.

- [ ] **Step 2: Run** it; expected FAIL.

- [ ] **Step 3: Implement** the deletions and edits above. In `motion.test.ts` delete the image-fade tests; in `motion.e2e.ts` delete the image tests and drop `.img-fade` from the reveal locator.

- [ ] **Step 4: Run** `bun test` and `bun run build && bun run test:e2e`; expected PASS. Open `/ua/catalogue` in `bun run dev` and confirm card images appear with their card, not on their own.

- [ ] **Step 5: Commit** `feat: remove picture fade-in; images appear with their card`.

### Task 4: Shared card hover

**Files:**

- Modify: `src/styles/global.css` (add `.card-hover` in `@layer utilities`)
- Modify: `ProductCard.astro`, `IndustryCard.astro`, `IndustryCardSmall.astro`, `WikiCard.astro`, `PartnerLogo.astro`, `RelatedEquipment.astro` cards
- Test: `tests/config/consistency.test.ts` (create)

**Interfaces:**

- Produces: utility class `card-hover` = `transition-[translate,box-shadow,border-color]` over `--dur-base` and `--ease-out-quart`; under `prefers-reduced-motion: no-preference` hover gives `translate: 0 -2px`, `box-shadow` of `shadow-lg` strength and `border-color` of `secondary` at 40%.

- [ ] **Step 1: Write the failing test** `tests/config/consistency.test.ts`: `it("defines card-hover with the motion tokens")` (rule exists in `global.css`, contains `var(--dur-base)`); `it.each([...six files])("%s uses card-hover")` asserts each file contains `card-hover`.

- [ ] **Step 2: Run** `bun test tests/config/consistency.test.ts`; expected FAIL.

- [ ] **Step 3: Implement** the utility and apply it to each card's root element, removing that component's own `hover:*`, `transition-*`, `duration-*` classes for lift, shadow and border.

- [ ] **Step 4: Run** `bun test`; expected PASS. Check the six card types by hand in dev.

- [ ] **Step 5: Commit** `feat: one shared card hover treatment`.

### Task 5: Shared buttons and links

**Files:**

- Modify: `src/styles/global.css` (`.btn-primary`, `.btn-secondary`, `.link-arrow` in `@layer components`)
- Modify: `HeroSection.astro`, `AboutCta.astro`, `WikiCta.astro`, `ProductCard.astro`, `IndustryCardCTA.astro`, `ContactForm.astro` (submit), `ErrorSection.astro`
- Test: `tests/config/consistency.test.ts`

**Interfaces:**

- Produces: `btn-primary` (filled, primary background, `rounded-lg`, `px-7 py-3.5`, press effect, focus ring `outline-secondary`), `btn-secondary` (2px secondary border, hover `bg-secondary/5`), `link-arrow` (inline-flex gap, trailing arrow translates 4px on hover over `--dur-fast`). The existing `.press` class stays and is included in both buttons.

- [ ] **Step 1: Write the failing test:** `.btn-primary`, `.btn-secondary` and `.link-arrow` are defined in `global.css`; `HeroSection.astro` contains `btn-primary` and `btn-secondary`; no file under `src/components` still contains the literal sequence `rounded-lg px-7 py-3.5`.

- [ ] **Step 2: Run** it; expected FAIL.

- [ ] **Step 3: Implement** and apply, copying the Hero's current button look (it is the reference). Keep each component's own layout classes (width, margin).

- [ ] **Step 4: Run** `bun test` and `bun run check:fix`; expected PASS.

- [ ] **Step 5: Commit** `feat: unify buttons and arrow links`.

### Task 6: Continuous background gradient and transparent sections (SUPERSEDED)

> Built, reviewed in a browser and then reverted at the owner's request: the gradients felt off and too strong and the grey and white sections were preferred. The background is unchanged; see the spec, Decisions 3.

**Files:**

- Modify: `src/layouts/Layout.astro` (add gradient layer inside `<body>`; make `<main>` wrapper `relative`)
- Modify: `src/styles/global.css` (add `.site-gradient`, `.section-block`)
- Modify (drop root `bg-background`, `bg-surface-container`, and section-level `bg-linear-*` fills; add `section-block`): `StatsSection.astro`, `IndustriesSection.astro`, `PartnersSection.astro`, `CatalogueBand.astro`, `ClientDirectory.astro`, `ManufacturerCredentials.astro`, `InteractiveUkraineMap.astro`, `RelatedEquipment.astro`, `AboutCta.astro`, `ContactHero.astro`, `[lang]/contact.astro` (two sections), `[lang]/catalogue/equipment/[category]/[slug].astro` (section near line 165)
- Test: `tests/config/background.test.ts` (create)

**Interfaces:**

- Produces: `.site-gradient`: `position: absolute; inset: 0; z-index: 0; pointer-events: none` over the full body height, built from stacked `radial-gradient` layers of the existing `--secondary` and `--primary` colours via `color-mix` at 6-12% alpha, `background-size: 100% 1400px; background-repeat: repeat-y`, positions alternating left and right so the wash is the same from hero to footer; no animation, or a drift under `prefers-reduced-motion: no-preference` only. `.section-block`: `border-top` hairline `border-border-subtle/50`, vertical padding `py-16 lg:py-24`.

- Footer keeps its own surface (my call); cards and forms keep theirs.

- [ ] **Step 1: Write the failing test** `tests/config/background.test.ts`: `Layout.astro` contains `site-gradient`; `global.css` rule `.site-gradient` contains `repeat-y` and no `animation` outside a `prefers-reduced-motion: no-preference` block; for every file listed above, the first `<section` opening tag's `class` contains neither `bg-surface-container` nor `bg-background` nor `bg-linear` and (for homepage, about, contact, catalogue section files) contains `section-block`.

- [ ] **Step 2: Run** `bun test tests/config/background.test.ts`; expected FAIL.

- [ ] **Step 3: Implement** the layer, the utility and the file edits. The gradient layer sits under the fixed `TechnicalField` canvas and under content; check `z-index` order in `Layout.astro` (canvas wrapper `z-0`, gradient `z-0` before it in DOM, `<main>` `z-10`).

- [ ] **Step 4: Run** `bun test`, then `bun run dev` and review `/ua`, `/en`, catalogue, a product page, wiki, about, contact at 375, 768 and 1440 px. Tune gradient alpha and positions by eye until it is calm and text is readable everywhere; adjust values only inside `.site-gradient`.

- [ ] **Step 5: Commit** `feat: continuous page gradient, transparent sections`.

### Task 7: Manufacturer field

**Files:**

- Modify: `src/content.config.ts`, `src/pages/admin/_config.template.yml` (equipment product fields near line 398)
- Test: `tests/data/integrity.test.ts`

**Interfaces:**

- Produces: optional frontmatter field `manufacturer: "Wipotec" | "Mesutronic"` on equipment entries; schema `z.enum(["Wipotec", "Mesutronic"]).nullish()`; CMS `select` widget with the same two options, `required: false`, `i18n: duplicate`.

- [ ] **Step 1: Write the failing test** in `tests/data/integrity.test.ts`: `it("equipment manufacturer values are Wipotec or Mesutronic")` reads every `src/content/equipment/**/*.md` frontmatter and asserts `manufacturer`, when present, is one of the two. Also `it("CMS config exposes the manufacturer select")` asserts `_config.template.yml` contains `name: "manufacturer"`.

- [ ] **Step 2: Run** it; expected FAIL on the CMS assertion.

- [ ] **Step 3: Implement** the schema and CMS widget. Do not edit product files; the owner fills the field later.

- [ ] **Step 4: Run** `bun test` and `bun run build`; expected PASS.

- [ ] **Step 5: Commit** `feat: optional manufacturer field for equipment`.

### Task 8: Featured equipment selection function

**Files:**

- Create: `src/lib/featured-equipment.ts`
- Test: `tests/lib/featured-equipment.test.ts`

**Interfaces:**

- Consumes: `EquipmentEntry`, `EquipmentType`, `getCategory`, `getSlug`, `getLocale`, `isProduct`, `sortByOrder` from `src/lib/content-utils.ts`.

- Produces:

  - `export interface FeaturedGroup { category: EquipmentType; spotlight: EquipmentEntry; others: EquipmentEntry[] }`
  - `export function getFeaturedGroups(entries: EquipmentEntry[], locale: Locale, categories: EquipmentType[], listSize?: number): FeaturedGroup[]` (`listSize` default 3). Categories follow the order of `categories`; categories without products are omitted; products are the locale's `isProduct` entries sorted by `order` (missing last) then slug; the first is the spotlight, the next `listSize` are `others`.

- [ ] **Step 1: Write failing tests** (use the fake `entry()` helper style from `tests/lib/content-utils.test.ts`, with ids like `checkweigher/hc-aen`): `skips categories with no products`; `orders by order then slug`; `excludes category index entries and other locales`; `one product gives a spotlight and no others`; `two products give one other`; `caps others at listSize`; `keeps the order of the categories argument`.

- [ ] **Step 2: Run** `bun test tests/lib/featured-equipment.test.ts`; expected FAIL (module missing).

- [ ] **Step 3: Implement** the function with the signature above.

- [ ] **Step 4: Run** it; expected PASS.

- [ ] **Step 5: Commit** `feat: select featured equipment per category`.

### Task 9: Tab behaviour helper

**Files:**

- Create: `src/lib/homepage/featured-tabs.ts`
- Test: `tests/lib/homepage/featured-tabs.test.ts`

**Interfaces:**

- Produces:

  - `export function nextTabIndex(current: number, count: number, key: string): number` returns the new index for `ArrowRight`, `ArrowLeft`, `Home`, `End` (wrapping for arrows) and `current` for any other key.
  - `export function initFeaturedTabs(root: HTMLElement): void` finds `[role="tablist"]`, `[role="tab"]`, `[role="tabpanel"]` inside `root`, sets `root.dataset.tabsReady = ""`, wires click and keyboard (roving `tabindex`, `aria-selected`, `hidden` on inactive panels) and plays the panel entrance by toggling `data-active`.

- [ ] **Step 1: Write failing tests** for `nextTabIndex`: `ArrowRight wraps from last to first`, `ArrowLeft wraps from first to last`, `Home and End jump to the ends`, `other keys keep the index`, `count of 1 stays 0`.

- [ ] **Step 2: Run** it; expected FAIL.

- [ ] **Step 3: Implement** both functions. `initFeaturedTabs` is covered by the e2e test in Task 11, not a unit test.

- [ ] **Step 4: Run** unit tests; expected PASS.

- [ ] **Step 5: Commit** `feat: accessible tab behaviour for featured equipment`.

### Task 10: Featured equipment component and homepage wiring

**Files:**

- Create: `src/components/homepage/FeaturedEquipment.astro`
- Modify: `src/pages/[lang]/index.astro` (insert after `StatsSection`, before `IndustriesSection`), `src/styles/global.css` (panel entrance keyframe using `--dur-base`), `locales/*.po` via `bun run i18n`
- Test: `tests/config/consistency.test.ts`

**Interfaces:**

- Consumes: `getFeaturedGroups`, `getGallery`, `flattenSpecs`, `productUrl`, `categoryUrl`, `getCategoriesForLocale`, `initFeaturedTabs`, utilities `card-hover`, `link-arrow`, `section-block`, `reveal`.

- Produces: `<FeaturedEquipment lang={lang} />`; the component loads the equipment collection itself with `getCollection("equipment")`.

- [ ] **Step 1: Write the failing test:** `[lang]/index.astro` imports `FeaturedEquipment` and renders it between `StatsSection` and `IndustriesSection` (index order in the source); the component file contains `role="tablist"`, `role="tabpanel"`, `card-hover` and `initFeaturedTabs`; it contains no literal `duration-` number classes.

- [ ] **Step 2: Run** it; expected FAIL.

- [ ] **Step 3: Implement the component.** Header with eyebrow ("Featured equipment") and heading ("Equipment we supply in Ukraine"); tab bar hidden by default and shown only under `[data-tabs-ready]` (without JS every panel is visible, stacked, each with its category title as a heading); each panel is a grid `lg:grid-cols-3` with the spotlight spanning two columns and a list column of stacked compact rows, `items-stretch` and `h-full` so both sides have equal height; rows show a small image, title and category label; spotlight shows the large image (placeholder when `getGallery` is undefined), title, `manufacturer` when set, the first two `flattenSpecs` rows, a "Technical details" `link-arrow`, and an "All <category title>" `link-arrow` under the list. Phone: spotlight above list, tab bar scrolls horizontally. Titles use `text-balance` and `wrap-break-word`; descriptions `line-clamp-2`. Call `initFeaturedTabs` from a module `<script>`.

- [ ] **Step 4: Run** `bun run i18n`, `bun test`, `bun run check:fix`; expected PASS.

- [ ] **Step 5: Commit** `feat: featured equipment band on the homepage`.

### Task 11: End-to-end checks for the band and the consistency work

**Files:**

- Create: `tests/e2e/featured.e2e.ts`

- Modify: `tests/e2e/motion.e2e.ts` if reveal expectations changed

- [ ] **Step 1: Write the tests** (run against `/ua` and `/en`): `tabs switch the visible panel on click and with ArrowRight`; `only the active panel is visible and the tab has aria-selected`; with `javaScriptEnabled: false` `every category panel is visible and the tab bar is hidden`; with `reducedMotion: "reduce"` `the active panel is visible immediately`; at 375 px width `the page has no horizontal scroll`; `the spotlight card and the list column have equal height at 1440 px` (compare bounding box heights within 1 px); `section roots have a transparent background` for the homepage (computed `background-color` of each top-level `main > section` is `rgba(0, 0, 0, 0)`).

- [ ] **Step 2: Run** `bun run build && bun run test:e2e`; expected PASS in Chromium, Firefox and WebKit. Fix the implementation, not the tests, where they fail.

- [ ] **Step 3: Final pass:** `bun run check`, `bun test`, then update `docs/info/development.md` with one short paragraph naming the shared utilities (`card-hover`, `btn-primary`, `btn-secondary`, `link-arrow`, `section-block`, `site-gradient`) and the three-speed rule.

- [ ] **Step 4: Commit** `test: e2e coverage for featured equipment and consistency`.

______________________________________________________________________

## Self-Review Notes

- Spec coverage: band (Tasks 8-11), manufacturer field (7), three speeds (1-2), no picture fade (3), card hover (4), buttons and links (5), transparent sections, section rhythm and continuous gradient (6), existing canvas untouched (Global Constraints), both languages and no-JS (10-11).
- Section rhythm: Task 6 was reverted; the homepage keeps alternating grey and white sections, with the featured band slotted in as a white section.
- Names used across tasks: `getFeaturedGroups`, `FeaturedGroup`, `nextTabIndex`, `initFeaturedTabs`, `card-hover`, `btn-primary`, `btn-secondary`, `link-arrow`, `section-block`, `site-gradient`, `DUR`.
