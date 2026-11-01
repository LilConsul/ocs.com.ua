# Catalogue Product Search — Design Spec

**Date:** 2026-11-01
**Branch:** denys/chore/json-ld-structure

______________________________________________________________________

## Goal

Add a text search input to the catalogue sidebar that filters the product cards currently visible on any category or industry page, matching against product title and description. When no products match, show an empty state with a suggestion to browse another category.

______________________________________________________________________

## Context

- The wiki index page already has an identical client-side search pattern (`data-wiki-item` / `data-wiki-text` attributes on cards; an `<input>` that filters by `.hidden`).
- The catalogue sidebar (`CatalogueSidebar.astro`) persists across category switches via an in-place page swap — it fetches the new category page's `[data-catalogue-results]` HTML and replaces only that DOM subtree without a full navigation.
- `ProductCard.astro` currently has no search data attributes.

______________________________________________________________________

## Design

### What changes

#### 1. `ProductCard.astro`

Add two data attributes to the root `<article>` element (same as `WikiCard.astro`):

- `data-product-item` — marker for the JS querySelectorAll
- `data-product-text="{title} {description}"` — lowercased search corpus

#### 2. `CatalogueSidebar.astro` — HTML

Add a search block between the existing header block (`.mb-6.px-2`) and the accordion `<div class="space-y-3">`. The block contains:

- A visually-styled search input (same Tailwind classes as the wiki search bar)
- A `data-product-empty` hidden paragraph with the "no match + browse categories" message

The empty state paragraph is rendered once, hidden by default. It sits below the search input, not inside `[data-catalogue-results]` (so it survives category swaps).

#### 3. `CatalogueSidebar.astro` — Script

Add a `setupProductSearch()` function called once on mount and re-called after every `swapPage()` completes (to re-filter with the current query against the new page's cards).

```
setupProductSearch():
  input  = [data-product-search-input]
  empty  = [data-product-empty]

  filter():
    query = input.value.trim().toLowerCase()
    items = [data-catalogue-results] querySelectorAll [data-product-item]
    count = 0
    for each item:
      match = query === "" || item.dataset.productText.includes(query)
      item.hidden = !match
      if match: count++
    empty.hidden = count > 0 || query === ""
```

Hook into `swapPage()`: after `results.innerHTML = nextResults.innerHTML` and `revealGrids()`, call `setupProductSearch()` to re-attach the listener against the new cards. Since `input` is in the sidebar (not swapped), its value persists — the new cards are filtered immediately if a query is active.

#### 4. `locales/messages.pot` + `locales/ua.po` + `bun run i18n:compile`

Two new translation strings:

- `"Search products…"` → UA: `"Пошук обладнання…"`
- `"No products match your search. Try browsing another category."` → UA: `"За вашим запитом обладнання не знайдено. Спробуйте іншу категорію."`

______________________________________________________________________

## What does NOT change

- `CatalogueBand.astro` — untouched
- `[category]/index.astro`, `industry/[slug].astro` — untouched
- The page-swap fetch/DOM-replace logic — only a post-swap call to `setupProductSearch()` is added
- No new routes, no build-time data, no server changes

______________________________________________________________________

## Behaviour Specification

| Situation                             | Expected result                                                                                 |
| ------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Search input empty                    | All product cards visible; empty state hidden                                                   |
| Query matches some cards              | Matching cards visible; others hidden; empty state hidden                                       |
| Query matches no cards                | All cards hidden; empty state visible                                                           |
| User switches category (sidebar link) | New cards fetched and rendered; existing query filters immediately; empty state updated         |
| User clears input                     | All new cards shown; empty state hidden                                                         |
| Industry page (grouped by category)   | Same — all `[data-product-item]` in `[data-catalogue-results]` are searched regardless of group |

______________________________________________________________________

## Testing

No unit tests needed (pure DOM manipulation, no logic beyond substring matching).
Manual verification: load a category page, type a partial product name, verify only matching cards show. Type a nonsense query, verify empty state appears. Switch category, verify query persists and filters new cards.
