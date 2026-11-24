# PageSpeed 100 design

Date: 2026-11-24. Status: draft for approval.

## Intent

Raise ocs.com.ua to 100 in every PageSpeed Insights category on mobile and desktop, including the
new Agentic Browsing category (3/3), without changing how the site looks. The request names the
goal; the reason behind it was not stated.

## Where it stands

PageSpeed Insights, 2026-11-24, mobile, Lighthouse 13.6. Best Practices and SEO are 100 everywhere.

| Page                                    | Perf | A11y | Agentic |
| --------------------------------------- | ---- | ---- | ------- |
| Home (`/ua/`)                           | 77   | 90   | 2/3     |
| Contact                                 | 68   | 91   | 2/3     |
| About                                   | 76   | 84   | 2/3     |
| Category (`equipment/checkweigher`)     | 77   | 96   | 3/3     |
| Product (`equipment/checkweigher/hc-a`) | 79   | 97   | 2/3     |
| Industry (`industry/food-beverage`)     | 81   | 96   | 3/3     |
| Wiki index                              | 79   | 94   | 3/3     |

Home on desktop: 98 / 90 / 100 / 100 / 2 of 3. Not measured: wiki article, privacy, terms, 404, the
English pages, and desktop for everything but home.

## Goals

- Accessibility 100 and Agentic Browsing 3/3 on every page type, both languages.
- Performance 100 on desktop, and 100 on mobile as the median of three runs per page type.
- Best Practices and SEO stay at 100.
- The result is protected by an automated accessibility check.

## Non-goals

- Checks PageSpeed lists without scoring: script CSP, COOP, Trusted Types, HSTS preload, WebMCP, ARD
  manifest, skeleton pulse animation, unused code inside Plerdy, identical link purpose.
- Content changes, new features, changes to the CMS.
- Server changes outside `public/.htaccess` (HTTP/2, Brotli).

## Anti-goals

- A visible redesign. Same fonts, same icons, same layout; only the gray gets darker.
- Content that depends on JavaScript to be visible, or breaks with reduced motion.
- Removing Plerdy.

## Constraints

- Prerendered Astro pages, no UI framework, inline `_()` translations (see `AGENTS.md`).
- Public pages are Ukrainian and English; check layouts in both.
- Lab scores vary by a few points between runs, so one run proves nothing either way.
- dev.ocs.com.ua is noindex on purpose, so its SEO score is always lower. Judge SEO on production.

## Approaches

- **A. Fix the causes, keep the look.** Many small edits; gray text gets slightly darker.
- **B. A, plus CSS inlined into every page.** Removes the last render-blocking request (PageSpeed
  estimates 150 to 300 ms on mobile). Costs about 20 KB (gzip) more per page, and the CSS is no
  longer cached between pages.
- **C. Strip down.** System fonts, no entrance motion, no Plerdy. Surest 100, loses the brand look
  and the heatmaps.

Picked: **A, then B if A measures short.** See "When B applies". C is not a fallback.

## Part 1: performance

### Icons

`material-symbols-outlined.woff2` is 317 KB, preloaded on every page by `Layout.astro`, and the home
page shows none of its icons.

- Replace it with inline SVGs of the same Material Symbols shapes through one Astro component that
  takes an icon name and a class. Names come from 11 fixed icons in the components plus the icons
  editors pick in the CMS (131 choices in `src/data/icons.json`).
- Any name in `icons.json` must resolve, because a CMS publish goes straight to production. An
  unknown name falls back to `category`, as today. A unit test checks that every name in
  `icons.json`, and every fixed name, has a shape.
- Source: shapes are extracted from the previous font file (kept as `scripts/icons/material-symbols-outlined.woff2`,
  not served) by `scripts/icon-shapes.py` into `src/data/icon-shapes.json`, so they match the old
  glyphs exactly. Only the icons on a page reach its HTML.
- Icons that only sat next to text are `aria-hidden`, so the icon name ("mail", "location_on") no
  longer appears as text to screen readers and AI agents.
- Delete the font file, its preload, its `@font-face` and the `.material-symbols-outlined` CSS.
- The CMS picker is untouched: `/admin` loads its own font from Google.

### Text fonts

- Load only the Latin and Cyrillic subsets of Inter, IBM Plex Sans and JetBrains Mono. All text in
  `src/content`, `src/data`, `locales` and the components is covered by these two, apart from a few
  symbols (arrows, the >= sign) that already use a fallback font. Letters from other scripts would
  also fall back to a system font.
- This also removes Greek, Vietnamese and extended subsets embedded as base64 in the CSS. Without
  any font rules the CSS is 20 KB (gzip) instead of 36 KB, which is the floor for this step.
- Keep JetBrains Mono 400 and 500 (400 is used by article code blocks); a weight is only downloaded
  where it is used.
- Preload the body and heading subset of the page's language: Cyrillic on `/ua`, Latin on `/en`.
  Nothing else is preloaded. Keep `font-display: swap`.

### Elements that decide LCP

Lighthouse ignores an element until it is visible. On contact and about the LCP is hero text that
starts at opacity 0 and appears after more than 3 s.

Rule: nothing that can be the largest element of the first screen starts invisible.

- `.hero-rise` slides in but stays at full opacity. `.hero-media` keeps its scale and stays at full
  opacity.
- Skeletons hide only lazy pictures. A picture with `loading="eager"` shows as it arrives.
- The first three (eager) cards on category and industry pages drop `reveal`, so they no longer fade
  in. Later cards are unchanged.
- The product gallery's main photo and the wiki article cover get `fetchpriority="high"`.
- `skeleton.e2e.ts` and `motion.e2e.ts` are updated to this behavior, not loosened elsewhere.

### Pictures

- Product cards and the home spotlight ship an 800 px file for a 207 to 250 px box. Add smaller
  `widths` and make `sizes` match the real box (card padding and `max-h` included) on
  `ProductCard`, `FeaturedEquipment`, `RelatedEquipment` and `WikiCard`.
- Recompress the hero's small sizes: PageSpeed sees 12 KB to save. No visible artifacts.

### Plerdy

Load it on the first scroll, pointer move, touch, click or key press instead of at page load. Same
snippet and site code, once per page. Visitors who never interact are not recorded; that is
accepted. There is no timer fallback, because a timer can land inside a Lighthouse run.

Check on the deployed site that `core.js` and `save_statistic` are requested after an interaction,
and that a visit shows up in the Plerdy dashboard (owner does the dashboard part).

### Google Map (contact)

`loading="lazy"` still loads 469 KB on a slow connection. Set the iframe's `src` when it comes within
about 200 px of the viewport. Its box keeps its size, so nothing shifts. Without JavaScript a link to
the map shows instead.

### Rest

- `TechnicalField`: take the canvas size from the `ResizeObserver` instead of measuring during load
  (up to 110 ms of forced reflow on mobile). The drawing is unchanged.
- Cache: serve the header logo under `/_astro/` with a hashed name, so the existing one-year rule
  covers it. Files in `public/` that keep their name are not given a long cache.

## Part 2: accessibility and Agentic Browsing

- **Gray text.** `--industrial-gray` (light theme) goes from `oklch(0.55 0.015 254)` to
  `oklch(0.50 0.015 254)`. Computed contrast: 5.8 on the page background, 5.3 on
  `surface-container`, 5.0 on `surface-container-high`; 4.5 is required. The dark theme value stays.
- **Faded gray.** Text in `text-industrial-gray/60`, `/70`, `/80` and `placeholder:.../70` becomes
  plain `text-industrial-gray`. Purely decorative icons may stay faded.
- **Client filter count (About).** Pink on the dark pressed button fails; give the count a light
  color while its button is pressed.
- **Definition lists.** `dt`/`dd` must be direct children of the `dl` or of one `div` group. Fix
  `StatsSection`, `AboutHero`, `ContactInfoCard` and `OfficeLocation`, where an icon and a second
  wrapper sit in between. Any icon or link moves inside the `dt` or `dd`. The look stays the same.
  Check the other seven `dl`s.
- **Map pins (About).** `hub-panel-${hub.id}` contains spaces ("Kryvyi Rih"); build a space-free id.
- **Product gallery.** `role="group"` is not allowed on `figure`: use a `div` (keep the label,
  `aria-roledescription`, microdata and data attributes) or drop the role.
- **Wiki index.** Cards are `h3` directly under the `h1`. The card takes its heading level as a prop:
  `h2` on the index, `h3` under the article page's "related" `h2`.

## Part 3: keeping it

- Add `@axe-core/playwright` (dev) and an e2e test that runs axe on every page type in both languages
  at mobile and desktop width, and fails on any WCAG A/AA or best-practice rule Lighthouse scores.
  Content is revealed before the scan. Chromium only.
- Extend that test to assert that Plerdy and Google Maps are not requested before interaction or
  scroll, and that pages request no icon font.
- No Lighthouse in CI: its score varies too much to gate on.
- Update `AGENTS.md` (icons, fonts, the LCP rule, the `fetchpriority` rule) and `docs/info` where they
  describe the icon font, caching or Plerdy.

## Measuring, and when B applies

1. Build locally and run Lighthouse on every page type for quick feedback.
1. Deploy to dev (owner approves) and run PageSpeed three times per page type, mobile and desktop.
1. If the median mobile or desktop Performance of any page type is below 100, apply B.
1. Measure again. Whatever the numbers are then, report them per page and stop; anything further is
   a new decision.
1. After production deploy, run the two original reports again, plus SEO.

**B:** set Astro's `build.inlineStylesheets` to `"always"`. `find_asset` in
`application/infra/scripts/verify-site.py` looks for a linked stylesheet to check caching; with B
there is none, so it must pick another hashed file. Its tests change with it.

## Left to the builder

- Order of work, component and file names, how icon shapes are read at build time.
- Exact image widths and quality, as long as PageSpeed reports no image savings on the page types.
- How the hero slide is written, and how the `dl` markup is regrouped.

## Calls made without asking

- All page types are in scope, not only the home page.
- Material shapes are kept for icons rather than switching to Lucide, so nothing changes visually.
- No timer fallback for Plerdy.
- The first three cards on listing pages lose their fade-in.
- The axe check is included; it was offered and not declined.
- The `0+` the counters show to agents before the strip scrolls into view is left as is. The
  prerendered HTML already has the real numbers.
