# Homepage Featured Equipment and Design Consistency

Date: 2026-11-11
Status: Draft, awaiting review

## Intent and why

OS-Technology Ukraine is a distributor of factory equipment in Ukraine, supplying Wipotec and
Mesutronic systems. The homepage says this in words (partner badges, hero copy) but never shows
the equipment itself. Visitors who may be interested in a product should see real catalogue
items on the first visit.

Separately, the site's motion and look have drifted: durations and easings are mixed, picture
fade-ins in the catalogue feel wrong to the owner, and the hero background (a canvas of grid,
arcs and calibration points) is the only atmospheric element. The owner wants the site to feel
slightly better and more consistent while keeping the experience it already has.

Everything below lives in `application/frontend` (Astro 7, Tailwind 4, bilingual `/ua` and `/en`,
statically prerendered, content must stay visible without JavaScript, reduced motion respected).
It builds on the existing motion system (`docs/superpowers/specs/2026-11-05-motion-system-design.md`,
`src/lib/anims/`, motion tokens in `src/styles/global.css`).

## Goals

1. A "Featured equipment" band on the homepage that shows catalogue products.
1. One motion language: the same few speeds and easings for every reveal, hover, tab and menu.
1. No fade-in on product pictures; cards reveal as a whole.
1. A consistent background: the existing technical-field look and the alternating grey and
   white section fills stay (owner decision, see Decisions 3).
1. Consistent card hover, section spacing rhythm, and buttons/links across all pages.

## Non-goals

- No redesign of layout, colour palette, typography, navigation or page structure beyond the
  homepage band.
- No new frameworks, no hydrated islands, no change to static output or the i18n approach.
- No new CMS features. Pinning featured products in the CMS is a possible later addition, not
  part of this work.
- Phase 3 and 4 motion ideas from the earlier motion spec (tilt, scroll-scrubbed storytelling)
  are not part of this work.

## Anti-goals (failure even if it technically works)

- The site feels busier, slower or heavier than it does now.
- Background effects reduce text legibility or hurt Lighthouse/loading speed.
- Content becomes invisible without JavaScript, or motion ignores reduced-motion settings.
- Ukrainian pages break because text is longer than English (cards and tabs must tolerate it).

## Decisions made with the owner

### 1. Homepage "Featured equipment" band

- Placed after the Stats section and before Industries.
- Category tabs across the top (Checkweighers, Catchweighers, Track & Trace, Metal detectors,
  X-Ray, following the catalogue categories).
- Each tab shows one large spotlight product (large image, name, manufacturer, a few key specs,
  a "Technical details" link) beside a short list of two or three more products from the same
  category, plus an "All <category>" link.
- Cards and rows have the same height; spacing is even so the spotlight and list read as one block.
- Products, images and text come from the catalogue content collection, so both languages work
  and nothing is duplicated.
- Tab switching animates (short cross-slide), not a hard swap.
- Look from the approved wireframe: tabs, large spotlight on the left, stacked compact rows on
  the right.

### 2. Motion consistency

- Three shared speeds (fast, base, slow) and one easing family, as CSS tokens and the matching
  JS constants, used by every reveal, hover, tab, menu and hero entrance. Hand-set durations
  and `transition-all` are removed in favour of the tokens.
- Product pictures in the catalogue no longer fade in (`img-fade` removed from product cards and
  related-equipment cards).
- Existing reveals, stagger, press effect and header state remain.

### 3. Background

The owner tried several directions in a browser prototype (dot matrix, grain, pulsing glows,
cursor-reactive dots, cursor light, a page-long gradient with transparent sections) and none felt
right: the gradients felt off and too strong, and the owner preferred the grey and white sections.
Final decision: change nothing about the background. The existing technical-field canvas and the
alternating `bg-background` / `bg-surface-container` section fills stay.

- No grain, no dot matrix, no pulsing orbs, no mouse-reactive effects, no page-long gradient.
- The new Featured equipment band takes its place in the alternation: Stats (grey), Featured
  equipment (white), Industries (grey), Partners (white), each with a hairline border.
- Industry cards use the same white card surface and hover as the other cards on the page.
- The throwaway prototypes in `.superpowers/brainstorm/` are references only and are not carried
  into the build.

### 4. Consistency work

- Cards (product, industry, wiki, partner) share one hover treatment: the same lift, shadow,
  border highlight and timing.
- Sections share one vertical spacing rhythm, heading style and eyebrow-rule pattern on all pages.
- Buttons and text links share sizes, radius, arrow motion and focus ring.

## Constraints

- Static prerendered pages; no UI framework; works without JavaScript (no-JS styles exist in
  `src/styles/no-js.css`).
- Biome and Prettier checks must pass; i18n uses the inline `_()` pattern and `bun run i18n`.
- Playwright motion checks and unit tests exist and must keep passing; update them where
  behaviour intentionally changes.
- Design follows the existing visual language (the Stitch design system in `docs/design/`).
- Repo rules in `application/frontend/CLAUDE.md` apply (no emojis; commit format).

## Decided by the assistant (the owner can change these)

- Spotlight product in each category is the first by catalogue `order`; the list shows the next
  two or three. No CMS flag for now.
- The picture fade-in is also removed from partner logos, wiki cards and the client directory,
  not only the catalogue.
- Tabs are data-driven: only categories that have products appear. Today that is Checkweighers
  (6 products) and Catchweighers (2). Track & Trace, Metal detectors and X-Ray get tabs
  automatically once products exist. With few products the list shrinks (2 products means one
  spotlight and one row; 1 product means a spotlight only).
- The spotlight is chosen by `order`, ties broken by slug; category index entries are excluded.
- "Key specs" reuse the catalogue card logic: the first two flattened spec rows
  (`flattenSpecs(...).slice(0, 2)`).
- Manufacturer: add an optional `manufacturer` field to the equipment schema and CMS config; the
  spotlight shows it only when set. Filling it in (Wipotec or Mesutronic per product) is a
  content task for the owner and is not required for the band to work.
- Layout proportions from the wireframe: spotlight about two thirds of the width, list about one
  third, each row with a small image, name and category label; on phones the spotlight stacks
  above the list and tabs scroll horizontally.
- "All <category>" links and category titles reuse `categoryUrl()` and `equipment-types.json`;
  any new UI strings go through `_()` and `bun run i18n`.
- With few products in a category the list rows are capped at 160 px, so a single row is not
  stretched to the height of the spotlight.

## Left to the builder

- Exact speed values, easing curves and token names, within the three-speed rule.
- Tab implementation details (accessible tablist semantics, keyboard support, no-JS fallback
  such as showing all categories stacked).
- How many categories get a tab if a category has too few products.
- Test updates and e2e coverage.
