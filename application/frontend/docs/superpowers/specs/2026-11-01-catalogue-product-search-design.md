# Catalogue Product Search — Design Spec

**Date:** 2026-11-01
**Branch:** denys/chore/json-ld-structure

______________________________________________________________________

## Goal

Add a URL-driven text search to the catalogue sidebar that filters product cards by title and description.
Searches are bookmarkable via `?q=`, the URL bar updates as the user types, and both the
catalogue and wiki search actions are declared correctly in JSON-LD `SearchAction` nodes.

______________________________________________________________________

## Context

- The wiki index already has client-side search (`data-wiki-item` / `data-wiki-text` / `data-wiki-index-filter`)
  but never reads `?q=` from the URL — the `SearchAction` in the `WebSite` JSON-LD currently points to
  `/{lang}/wiki/?q=` which is a broken claim. This must be fixed in the same pass.
- The catalogue sidebar (`CatalogueSidebar.astro`) persists across category switches via in-place page swap.
- `ProductCard.astro` currently has no search data attributes.
- The `WebSite` schema's `potentialAction` is a single `SearchAction` today; Schema.org allows an array.

______________________________________________________________________

## Design

### 1. `ProductCard.astro` — data attributes

Add to the root `<article>`:

- `data-product-item` — querySelectorAll marker
- `data-product-text="{title} {description}"` — build-time lowercased corpus (same pattern as `WikiCard.astro`)

### 2. `CatalogueSidebar.astro` — HTML

Insert between the header block and the accordion:

- `<input data-product-search-input>` — styled to match wiki search bar
- `<p data-product-empty hidden>` — empty state with "No products match. Try another category."

### 3. `CatalogueSidebar.astro` — Script

**`filterProducts()`** — queries `[data-product-item]` inside `[data-catalogue-results]`, toggles
`.hidden` per card, shows/hides `[data-product-empty]`.

**`setupProductSearch()`** — clones the input element to avoid duplicate listeners, attaches
`filterProducts` on `input` event, calls `filterProducts()` immediately (to apply any `?q=` already
in the URL).

On every `input` event:

- Run `filterProducts()`
- `history.replaceState` to update `?q=` in the URL (empty query removes the param)

On page load: read `URLSearchParams.get("q")`, set `input.value`, call `filterProducts()`.

After every `swapPage()` completes: call `setupProductSearch()` — the sidebar input value survives
the swap, so the new page's cards are filtered immediately.

After every `swapPage()` pushState: carry the current `?q=` value forward by appending it to the
navigated URL.

### 4. `wiki/index.astro` — read `?q=` on load

In the existing `setupWikiIndexSearch()` script, after attaching the `input` listener, add:

```ts
const initial = new URLSearchParams(location.search).get("q") ?? "";
if (initial) {
  searchInput.value = initial;
  searchInput.dispatchEvent(new Event("input"));
}
```

Also add `history.replaceState` on `input` events (same pattern as catalogue).

### 5. `website.ts` — dual `SearchAction` in `WebSite` JSON-LD

Change `potentialAction` from a single object to an array of two `SearchAction` nodes:

```json
"potentialAction": [
  {
    "@type": "SearchAction",
    "target": {
      "@type": "EntryPoint",
      "urlTemplate": "https://ocs.com.ua/{lang}/wiki/?q={search_term_string}"
    },
    "query-input": "required name=search_term_string"
  },
  {
    "@type": "SearchAction",
    "target": {
      "@type": "EntryPoint",
      "urlTemplate": "https://ocs.com.ua/{lang}/catalogue/equipment/checkweighers/?q={search_term_string}"
    },
    "query-input": "required name=search_term_string"
  }
]
```

The `{lang}` segment is not a search variable — it is substituted at schema build time per locale
(so `websiteSchema` emits one `WebSite` node per language, each with hardcoded lang in the URLs).

### 6. i18n

Two new strings:

- `"Search products…"` → UA: `"Пошук обладнання…"`
- `"No products match your search. Try browsing another category."` → UA: `"За вашим запитом обладнання не знайдено. Спробуйте іншу категорію."`

______________________________________________________________________

## What does NOT change

- `CatalogueBand.astro`, `CategoryHeader.astro`
- `[category]/index.astro`, `industry/[slug].astro` — page-level pages are untouched
- No new routes, no server-side search, no new pages

______________________________________________________________________

## Behaviour Specification

| Situation                   | Expected                                                             |
| --------------------------- | -------------------------------------------------------------------- |
| Load `?q=metal`             | Input pre-filled, matching cards shown                               |
| Type into input             | Cards filter; URL updates via `replaceState`                         |
| Clear input                 | All cards shown; `?q=` removed from URL                              |
| Switch category via sidebar | New cards loaded; current query carried in URL + applied immediately |
| No match                    | Empty state visible                                                  |
| Wiki: load `?q=weighing`    | Wiki input pre-filled, matching articles shown                       |
| Google Sitelinks Searchbox  | Both `SearchAction` nodes present in `WebSite` JSON-LD               |

______________________________________________________________________

## Testing

- Unit test: `websiteSchema` emits `potentialAction` as an array with two `SearchAction` entries.
- Manual: load category with `?q=`, verify pre-fill and filtering; type and verify URL updates; switch category and verify query carries.
