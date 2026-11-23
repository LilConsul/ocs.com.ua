# Equipment card design

Date: 2026-11-23. Status: draft for approval.

## Intent

One equipment product is drawn five different ways across the site (catalogue grid, sidebar search
results, Related equipment, two homepage layouts). Each was styled separately, so model code
colour, image background, buttons, icons and hover effects disagree. The goal is one card design,
taken from the homepage featured card, used everywhere a product appears in a list.

Mockups were reviewed in the visual companion (variant B with refinements, `card-b-text-v2.html`).

## Goals

- One card anatomy for the catalogue grid, search results and Related equipment.
- The search results render the real card, so the two can never drift again.
- Text is never cut with "...". Cards in a row line up instead.
- Cards hold up with missing content (no description, no specs) and in Ukrainian.

## Non-goals

- No change to the homepage featured layout (spotlight and side rows). Only its colours and icon
  are aligned.
- No content fixes. The title typos and missing TQS-HC-A content are fixed in the CMS separately.
- No new colours, fonts or tokens.

## Anti-goals

- A row of nine solid pink buttons.
- Several hover effects stacked on one card.
- A card that looks empty or broken when the product has little content.

## The card (approved in mockups)

From top to bottom:

1. **Image area.** 4:3, tinted `bg-surface-container/60` (works in dark mode), photo
   `object-contain`. Manufacturer badge top left, same as the homepage, only when
   `manufacturer` is set.
1. **Model code.** `getSlug().toUpperCase()`, heading font, 2xl, `text-foreground` (not pink).
   May break at hyphens on narrow screens.
1. **Short title.** The title with the model code removed (also a leading ", model" before it),
   first letter capitalised: "HC-A Checkweigher" becomes "Checkweigher". Grey, medium weight,
   `text-wrap: balance`. Falls back to the full title if stripping leaves nothing.
1. **Summary.** `summarize(description, 160)`: whole sentences, never cut. When there is no
   description, a translated default: "Full specifications and configurations are on the
   product page."
1. **Link line.** "Technical details" in `text-secondary` with a Lucide `ArrowRight` that nudges
   on hover. The whole card is one link; there is no button.
1. **Specs strip.** Edge to edge at the bottom of the card, two cells, label and first value
   (as today). With no specs, one full-width cell: "Category" and the translated category title.

**Row alignment.** The grid gives each card `grid-row: span 5` with `grid-template-rows: subgrid`,
so title, summary, link and specs sit on the same lines across a row. Flex column fallback is not
needed (subgrid is in all supported browsers).

**Hover.** Only the existing border trace (`.product-card::after`) and the soft shadow from
`card-hover`. No lift, no photo zoom, no second photo.

**Compact size (Related equipment).** Same parts and colours at a smaller scale: image, model
code, short title, one spec line. No summary and no link line; the card is the link. Its label
uses the translated category title instead of the raw folder name (fixes the current bug).

## Approaches considered for the search results

- **A. Render all cards once, search shows the matches (chosen).** The sidebar renders every
  product of the locale as `ProductCard` inside a hidden `<template>`. Search clones the matching
  cards into the results. Same markup and optimised images as the grid; about 12 cards per
  locale, so a few KB of HTML. The JSON index and the string template in `CatalogueSidebar` go.
- B. One empty card shell filled by the script. Shared layout, but images stay unoptimised and
  title and summary logic run twice.
- C. Update the copied markup again. Smallest change, drifts again.

Matching stays as today: the query against title and description, read from the card's
`data-product-text`.

## Where it applies

- `ProductCard.astro`: rebuilt to the card above (replaces the staged change).
- Category and industry grids: grid gets the subgrid rows.
- `CatalogueSidebar.astro`: template of cards, search clones them. Works on product pages too,
  where the sidebar also appears.
- `RelatedEquipment.astro`: compact card, category label fix.
- `FeaturedEquipment.astro`: image tint already matches; Material Symbols arrows are not used
  there. Only check the model code and title colours match the card.
- A small helper for the short title next to `summarize()` in `src/lib/featured-equipment.ts`
  (or `content-utils.ts`), with unit tests.

## Left to the builder

- Exact spacing values, following the mockup.
- Where the template lives in the sidebar markup.
- Whether the homepage uses the short title helper too (it already shows the model code large
  above the title, so it probably should).

## Checks

- `bun test`, `bun run check`, `bun run build`.
- Visual check in the browser: category page, industry page, search, product page Related, in
  `/en` and `/ua`, light and dark, mobile width.
