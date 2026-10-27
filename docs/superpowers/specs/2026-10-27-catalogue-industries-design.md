# Catalogue: Industries Section

## Goal

Add an **Industries** section to the catalogue sidebar, next to **Equipment Categories**. Opening one section closes the other. Choosing an industry shows every product tagged with it, grouped by category, with the same no-reload swap that categories already use. Industries mirror categories in data shape, typing, CMS handling and page template.

## Decisions

| Topic                    | Decision                                                                                                                                           |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Sidebar                  | Two exclusive accordion sections: Equipment Categories, Industries                                                                                 |
| Industry page            | Lists all products tagged with the industry, grouped under category headings                                                                       |
| Navigation               | In-place swap (existing mechanism), with real indexable URLs as the fallback                                                                       |
| URL scheme               | `/{lang}/catalogue/equipment/{category}`, `/{lang}/catalogue/equipment/{category}/{product}`, `/{lang}/catalogue/industry/{slug}`                  |
| Old URLs                 | `/{lang}/catalogue/{category}` and `/{lang}/catalogue/{category}/{product}` redirect to the new ones                                               |
| Industries data          | New `src/data/industries.json`, same shape as `equipment-types.json`                                                                               |
| Typing                   | `Industry` interface identical to `EquipmentType`; products carry `industries: string[]` (multi-select)                                            |
| Listed industries        | `food-beverage`, `pharmaceutical`, `cosmetics`, `logistics` (only if the locale has at least one product)                                          |
| `general` and `chemical` | Dropped. `general` is removed from `ec-e` (en and ua). **Open for the user to overturn: keeping `general` as a real industry is the alternative.** |

## Data

### `src/data/industries.json`

```json
{
  "en": { "industries": [{ "slug": "food-beverage", "title": "...", "description": "...", "icon": "..." }] },
  "ua": { "industries": [ ... ] }
}
```

- Same fields as categories: `slug`, `title`, `description`, `icon`. Array order is the sidebar order.
- Icons must exist in `icons.json`.

### Types and helpers (`src/lib/content-utils.ts`)

- `interface Industry { slug; title; description; icon }` with the same fields as `EquipmentType`.
- `getIndustriesForLocale(locale): Industry[]` reads `industries.json`, mirroring `getCategoriesForLocale`.
- `filterByIndustry(entries, industrySlug): EquipmentEntry[]` keeps products whose `data.industries` includes the slug.
- The content schema is unchanged (`industries: z.array(z.string()).optional()`). Validity of the values is enforced by a test, the same way category folders are checked today.

### Product tagging

- A product keeps its multi-select `industries` array in frontmatter. One product can appear under several industries.
- `ec-e` (en, ua): remove `general`, keep `food-beverage`.
- `industries` stays identical in both languages of a product (already tested).

## Routes

All pages are static (`getStaticPaths`) and generated per locale.

| Route                                         | Source                                       |
| --------------------------------------------- | -------------------------------------------- |
| `catalogue/equipment/[category]/index.astro`  | the current `[category]/index.astro`, moved  |
| `catalogue/equipment/[category]/[slug].astro` | the current `[category]/[slug].astro`, moved |
| `catalogue/industry/[slug].astro`             | new                                          |

- `industry/[slug]` only generates a path for an industry that has at least one product in that locale, so there are no empty pages.
- Product cards on an industry page link to the canonical `/catalogue/equipment/{category}/{product}`.
- `ProductCard` keeps its current props, since a product still has exactly one URL.

### Industry page content

- Hero: `CategoryHeader`, which only needs a title and description.
- Results: product cards grouped under category sub-headings, in the category order from `equipment-types.json`. A group is omitted if it has no products.
- JSON-LD: `CollectionPage` with `ItemList` and a breadcrumb (Home, then industry), following the category page.
- The page keeps the `data-catalogue-hero` and `data-catalogue-results` hooks, so the existing swap works unchanged.

### Shared layout

The muted band, sidebar and results wrapper are duplicated by the category and industry pages. Extract them into `components/catalogue/CatalogueBand.astro` (slot-based). It owns `data-catalogue-band`, the sidebar and `data-catalogue-results`.

### Redirects

- Astro `redirects` in `astro.config.mjs`, built from `equipment-types.json` and the content folders, so new categories and products need no manual entry:
  - `/{lang}/catalogue/{category}` to `/{lang}/catalogue/equipment/{category}`
  - `/{lang}/catalogue/{category}/{product}` to `/{lang}/catalogue/equipment/{category}/{product}`
- Static build output is a meta-refresh page. That is acceptable here.

### Links to update

`CatalogueSidebar`, `ProductCard`, `RelatedEquipment`, `Header` (Catalogue item), `AboutHero`, `NotFoundContent`, breadcrumbs in the product and category pages, and `preview_path` in `_config.template.yml`.

**Header "Industries" item:** it currently links to `/{lang}/catalogue`, which does not exist. Point it at the first listed industry page.

## Sidebar accordion

- The sidebar keeps its header and CTA. The flat list becomes two sections, each a header button plus a `<nav>` panel.
- Each header button has `aria-expanded` and `aria-controls`. Panels use the `hidden` attribute.
- `CatalogueSidebar` takes `section: "equipment" | "industry"` and the active slug, in addition to its current props. It also takes `allIndustries: Industry[]`. The initial open section is rendered at build time, so there is no flash.
- Opening a section closes the other. Clicking a header only toggles; it does not navigate.
- Clicking an item uses the existing swap. The swap is generalized to any sidebar link that targets a catalogue page. After a swap, `syncChrome` copies the active classes, `aria-current`, and the open section from the fetched page onto the live sidebar. Back/forward and reload therefore always show the right section.
- Product pages render the sidebar with the Equipment section open and the product's category active.
- Animation is a CSS grid-rows transition, disabled under `prefers-reduced-motion`.
- The mobile drawer behaves the same and still closes after an item click.

## CMS (Decap)

- Add an "Industries" file entry beside "Equipment Types", with the same fields and the same drag-to-reorder behaviour.
- The product form's Industries dropdown, hardcoded in `_config.template.yml`, becomes a generated `__INDUSTRY_OPTIONS__` token filled in `config.yml.ts` from `industries.json`, the same way as `__CATEGORY_OPTIONS__`. The widget stays multi-select.
- The `view_filters` for industries in the product collection are generated from the same list.

## Testing

Extend `tests/data/integrity.test.ts` (bun:test) with these checks:

- Industries have the same slugs in the same order in en and ua.
- Industry slugs are unique.
- Industry icons exist in `icons.json`.
- Every industry has a non-empty title and description.
- Every `industries` value on a product exists in `industries.json`.
- Every listed industry has at least one product in each locale.

Other tests:

- Unit tests for `getIndustriesForLocale` and `filterByIndustry`.
- Update the URL assertions in `tests/lib/structured-data.test.ts` for the `/equipment/` paths.
- A redirect test: every old category and product URL maps to an existing new URL.

Manual browser check of the swap:

- category to industry and back
- back/forward
- reload on an industry URL
- mobile drawer
- the ua locale

Final gate: `bun test`, type check and lint, and `astro build` must pass.

## Out of scope

- Reworking the homepage `IndustriesSection` cards (linking them to industry pages can follow later).
- A `/catalogue` index page.
- Filtering within a category by industry.
