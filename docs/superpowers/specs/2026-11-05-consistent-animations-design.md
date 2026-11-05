# Consistent animations: wiki coverage and CSS-first consolidation

Date: 2026-11-05
Scope: `application/frontend`

## Problem

1. The wiki pages (`wiki/index.astro`, `wiki/[slug].astro`, `components/wiki/*`) have no entrance animations. Every other page has a hero intro and scroll reveals.
1. The animation code is duplicated:
   - `@keyframes hero-rise` is defined 5 times (HeroSection, AboutHero, ContactHero, CategoryHeader, product page).
   - Another 8 near-identical "fade and rise" keyframes exist: `contact-rise`, `stat-rise`, `bento-rise`, `product-rise`, `related-rise`, `cta-rise`, `cred-rise`, `card-rise`, `client-rise`. Their distances differ (12, 14, 18, 22, 24px) for no reason.
   - About 10 components carry a `<script>` that only calls `revealOnce` and hides content behind `data-anim="ready"` until it runs.

## Decisions

- **Scroll reveals become pure CSS** using scroll-driven animations (`animation-timeline: view()`). This replaces the `revealOnce` JS helper and its `data-anim` state machine.
- **Browser support policy:** browsers without `animation-timeline` (currently Firefox) and users with `prefers-reduced-motion: reduce` get plain, fully visible content. Nothing is hidden by default, so no content can get stuck invisible if JS is slow or disabled (compatible with `styles/no-js.css`).
- **Not play-once:** reveals follow scroll position and reverse when scrolling back up. This is accepted.
- **Rise distances are normalised to two values:** 18px (heroes and large blocks) and 14px (cards and grid items).
- **Out of scope:** the 404 and 50x pages, the article body, and the sticky wiki sidebar and TOC. Number count-up scripts (`StatsSection`, `AboutHero`) stay, because they are real JS.
- **Ukraine map keeps `revealOnce`** (decision A1). Its choreography is time-based (outline draw 1.6s, pins popping from 0.9s). That cannot be expressed as scroll-scrubbed progress, so `reveal-once.ts` and its test stay for that one use only.

## Design

### 1. Shared primitives in `src/styles/global.css`

Placed next to the existing `eyebrow-rule` block.

- Keyframes: `rise` (translateY 18px), `rise-sm` (translateY 14px), `slide-in` (translateX -12px, used by credential features), `bar-grow` (scaleX from 0), `glow-in` (scale from 0.7, used by the CTA and related-equipment glows).
- `.hero-rise`: time-based intro on page load, same behaviour as today. It uses `rise 0.7s cubic-bezier(0.22, 1, 0.36, 1) backwards` and `animation-delay: calc(var(--d, 0) * 90ms)`.
- `.reveal`: scroll-driven rise for individual items.
- `.reveal-bar`: scroll-driven `bar-grow` for share and progress bars (`sector-bar`, `client-bar`).
- `.reveal-slide` and `.reveal-glow`: the `slide-in` and `glow-in` variants, for credential features and the decorative glows.
- All of these are wrapped in `@media (prefers-reduced-motion: no-preference)`. The scroll-driven ones are additionally wrapped in `@supports (animation-timeline: view())`.

```css
@media (prefers-reduced-motion: no-preference) {
	.hero-rise {
		animation: rise 0.7s cubic-bezier(0.22, 1, 0.36, 1) backwards;
		animation-delay: calc(var(--d, 0) * 90ms);
	}
	@supports (animation-timeline: view()) {
		.reveal {
			animation: rise-sm linear both;
			animation-timeline: view();
			animation-range: entry calc(var(--i, 0) * 8%) entry calc(50% + var(--i, 0) * 8%);
		}
	}
}
```

`--i` is the stagger index and shifts the animation range. `--i` is set per item, as it is today.

The eyebrow dash gets the same treatment: `scale: 0 1` to `1 1` with `animation-timeline: view()`, so `lib/anims/eyebrow-rule.ts` and its call in `Layout.astro` are deleted.

The decision to put the shared classes in `global.css` rather than per-component `<style>` blocks matters because Astro scopes keyframe names and selectors inside component styles. A global stylesheet avoids that scoping problem.

### 2. Per-component conversion

For each file below: delete the `[data-anim="ready"]` hide rules, the local `@keyframes`, the `<script>` that calls `revealOnce`, and the `data-anim` attribute or `data-*` hook that only existed for it. Add `class="reveal"` (or a variant) and `--i` to the individual items.

| File                                                        | Notes                                                                                                                                                                               |
| ----------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `homepage/StatsSection.astro`                               | `.stat-cell` becomes `.reveal`. The count-up script stays.                                                                                                                          |
| `homepage/IndustriesSection.astro`                          | `.bento-item` becomes `.reveal`.                                                                                                                                                    |
| `about/AboutCta.astro`                                      | `.cta-card`, `.cta-item` become `.reveal`; `.cta-glow` becomes `.reveal-glow`.                                                                                                      |
| `about/ManufacturerCredentials.astro`                       | `.cred-card` becomes `.reveal`; `.cred-feature` becomes `.reveal-slide`.                                                                                                            |
| `about/ClientDirectory.astro`                               | `.client-card` becomes `.reveal`; `.client-bar` becomes `.reveal-bar`. Its filter and pagination logic is untouched.                                                                |
| `about/InteractiveUkraineMap.astro`                         | Sector cards and bars convert to `.reveal` and `.reveal-bar`. The map stage keeps `revealOnce`. The hub-panel and hub-metric animations are click-driven, so they stay as they are. |
| `catalogue/ProductCard.astro`                               | `.product-card` becomes `.reveal`.                                                                                                                                                  |
| `catalogue/CatalogueBand.astro`                             | Remove the `revealOnce` script.                                                                                                                                                     |
| `catalogue/CatalogueSidebar.astro`                          | Remove `revealGrids()` and its calls. Cards injected after a filter or search animate by themselves. The `hero.querySelectorAll(".hero-rise")` animation-reset block stays.         |
| `catalogue/RelatedEquipment.astro`                          | `.related-card` becomes `.reveal`; `.related-glow` becomes `.reveal-glow`.                                                                                                          |
| `pages/[lang]/catalogue/equipment/[category]/[slug].astro`  | Local `.hero-rise`, `.reveal` and keyframes removed; the shared classes are used.                                                                                                   |
| `pages/[lang]/contact.astro`                                | `.contact-reveal` becomes `.reveal`.                                                                                                                                                |
| `HeroSection`, `AboutHero`, `ContactHero`, `CategoryHeader` | Delete the local `.hero-rise` and `@keyframes hero-rise`; the shared class is used.                                                                                                 |

### 3. Wiki

- **`wiki/index.astro`**
  - Hero: `.hero-rise` with `--d` 0 to 3 on the eyebrow, h1, description and search bar.
  - Grid: `WikiCard` gets `.reveal` and `--i = index % 3`, matching `ProductCard`. The search filter uses `hidden` and is unaffected.
  - `WikiCta`: `.reveal`.
- **`wiki/[slug].astro`**
  - Header: `.hero-rise` on the h1, description, meta row and cover image (`--d` 0 to 3).
  - `.reveal` on `WikiPagination`, the related-articles cards (`--i = index`) and `WikiCta`.
  - Not animated: the article body, `WikiSidebar`, `WikiToc` (the progress bar already animates).
- `WikiCard` takes an optional `index` prop to set `--i`. Both pages pass it.

### 4. Deletions

- `src/lib/anims/eyebrow-rule.ts` (and its import in `Layout.astro`).
- `reveal-once.ts` and `tests/lib/anims/reveal-once.test.ts` are **kept**, but `revealOnce` is used only by the Ukraine map. Its doc comment is updated to say so.

## Risks

1. **Firefox** shows no scroll reveals. Content is fully visible, and hero intros still play.
1. **`view()` and tall elements:** ranges are relative to each item, so this is fine for cards. Containers are never animated as a whole.
1. **Items near the bottom of the viewport on load** can render partway through their animation. This is inherent to scroll-driven animation and looks like a normal reveal.
1. **Hover transforms** on cards use the `translate` property, which is separate from the keyframes' `transform`, so a `both` fill cannot override them.
1. **Visual regression** from snapping distances (12, 22, 24px to 14 or 18px) and from the new stagger model. This is accepted, and it needs a manual look in Chrome.

## Verification

- `bun test`: the `reveal-once` tests must still pass and `tests/config/no-js.test.ts` must be unaffected.
- `bun run check` (Biome), `astro check`, `astro build`.
- Grep: no `eyebrow-rule` script, no `data-anim` outside the Ukraine map, and none of the old keyframe names remain.
- Inspect the built CSS for the shared keyframes and classes, to confirm Astro did not scope or rename them.
- Manual check in Chrome on: home, about, contact, catalogue (filter and search), a product page, wiki index and an article. Also check the reduced-motion setting and a Firefox page load.
