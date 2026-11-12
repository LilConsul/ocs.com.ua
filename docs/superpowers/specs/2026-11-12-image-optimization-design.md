# Image optimization and loading skeletons - design

Date: 2026-11-12. Scope: `application/frontend`.

## Intent and why

Pictures are the slow, jumpy part of the site. Astro's `<Image>` is used in most places, but every
raster image lives in `public/`, and Astro does not process files in `public/`. The built HTML
confirms it: `<Image>` only emits the original file URL with `width`/`height`, `loading` and
`decoding`. There is no resized file, no `srcset` and no format conversion, so phones download the
same 800-1600 px file as desktops.

Two goals, in this order:

1. Make Astro actually process the raster images (resized WebP with a responsive `srcset`) and fix
   loading attributes.
1. After that, show shadcn-style skeletons while pictures load.

## Goals

- Equipment photos, partner logos, wiki cover images and the hero are processed by Astro at build.
- Cards, gallery and logos ship a responsive `srcset` through `widths` and `sizes`.
- Loading attributes are correct: first row eager, the rest lazy, hero has `fetchpriority="high"`,
  hidden featured photos load when needed.
- Every picture reserves its box before the file arrives (no layout jump), including the wiki
  images that have no dimensions today.
- Editors keep the Decap CMS image workflow; new uploads end up in the same place as existing files.
- A deleted or missing file is still skipped with a console warning, never shipped as a broken
  `<img>` (today's `existingFile()` behavior).
- Skeletons, as a second phase (see below).

## Non-goals

- No move to Astro's `image()` content-collection schema; content fields stay plain strings.
- No React or UI framework; skeleton behavior is CSS plus a few lines of vanilla script, in line
  with the rest of the site.
- SVGs, fonts, documents, favicons, the placeholder and the header logo stay in `public/`
  (Astro does not optimize SVG).
- No change to datasheet PDFs or the lead-form flow.

## Anti-goals

- Editors must not be forced to edit code or content paths by hand.
- Do not ship broken image links if the glob map and a content string disagree.
- Do not make the build fail because of one missing image (warn and skip, as today).

## Current state (verified)

- Raster images: `public/assets/equipment/<model>/*.webp` (5 folders), `public/assets/partners/*`
  (34 files), `public/images/main_page.webp` (hero), and 12 loose CMS uploads at the root
  (`public/assets/image_*.webp`, used by hc-warehouse, hc-a-md, hc-m-mdi and hc-m-sl).
  `public/assets/og-en.png` and `og-ua.png` are the default social images.
- Content references them as plain strings: `gallery:` in seven `equipment/*.ua.md` files,
  `logo:` in `src/data/partners.json`. The wiki `coverImage` field exists in the schema and CMS
  but no wiki content uses it yet, so nothing needs rewriting there.
- Decap: `media_folder: application/frontend/public/assets`, `public_folder: /assets`, plus
  per-collection folders for documents and partners (`_config.template.yml` lines 42-43,
  168-169, 190-191).
- `src/lib/public-assets.ts` (`existingFile`, `existingFiles`) checks that a referenced file exists
  in `public/`. Used by `content-utils.ts`, `wiki-utils.ts`, `partners-data.ts`,
  `structured-data/organization.ts`, `PartnersSection`, `ManufacturerCredentials`,
  `DocumentsCard`.
- Plain `<img>` today: `WikiCard`, the wiki cover in `wiki/[slug].astro`, `PartnerLogo` (may be
  unused), the search results in `CatalogueSidebar` (built inside a JS template string), and the
  header SVG logo.
- Structured data and OG images build absolute URLs from the path strings (`structured-data/ product.ts`, `article.ts`, `Layout.astro` `ogImage`).
- Pre-commit hook `optimize-public-images` and `application/infra/scripts/check-images.py` watch
  `application/frontend/public/` (hook pattern `^application/frontend/public/.*\.(webp|png|jpe?g)$`).
- Unit tests that mention image paths: `tests/data/integrity.test.ts`,
  `tests/lib/about/partners-data.test.ts`, `tests/lib/structured-data.test.ts`,
  `tests/lib/datasheet/files.test.ts`.

## Phase 1: image optimization (decisions made with the user)

Decided by the user: full migration to processed images, optimization before skeletons.

Decided in the design (Claude's call, open to change):

1. **Move raster images to `src/assets/`**, keeping the sub-folder layout
   (`src/assets/equipment/...`, `src/assets/partners/...`, hero as `src/assets/hero/...`).
1. **Content strings stay strings.** They change once from `/assets/...` to `/src/assets/...`
   (partners.json and the seven equipment files). The 12 loose `image_*.webp` uploads move to
   `src/assets/equipment/` (flat) and their strings are rewritten. Documents (PDF), fonts, icons
   and the OG images stay in `public/assets`.
   **Decap:** the global `media_folder`/`public_folder` stay on `public/assets` (documents and
   everything else). Per-field overrides send image fields to `src/assets`: equipment `gallery`
   images to `src/assets/equipment` (`public_folder: /src/assets/equipment`), partner `logo` to
   `src/assets/partners`, wiki `coverImage` to `src/assets/wiki`. The hero is not CMS-managed.
1. **One resolver module** replaces the `public/` existence check for raster images. It builds a
   map with `import.meta.glob("/src/assets/**/*.{webp,png,jpg,jpeg}", { eager: true })` and turns a
   content string into Astro `ImageMetadata`, or `undefined` (with a one-time warning) when the file
   is missing. `existingFile()` remains for PDFs and other public files.
1. **Components take `ImageMetadata`** (not strings) and render `<Image>` or `<Picture>` with
   `widths`/`sizes` suited to the slot (card, gallery main, thumbnail, lightbox, partner logo, wiki
   card, wiki cover, hero). Prefer WebP output; AVIF is optional if build time allows.
1. **Loading rules:** the first visible row of a catalogue grid is eager and the rest lazy; gallery
   main image eager, thumbnails lazy; the hero is eager with `fetchpriority="high"`; the featured
   equipment photos that start hidden must not rely on `loading="lazy"` while `display: none`
   (preload on first interaction, or use a layout where they are not hidden).
1. **Structured data and OG images** use a URL generated with `getImage` at one fixed size
   (1200 px wide, JPEG or PNG for social crawlers, not the card WebP), made absolute with the site
   URL. They never point at a path that no longer exists. The default `og-en.png`/`og-ua.png` stay
   in `public/`.
1. **Search results (`CatalogueSidebar`)**: the page builds a JSON list of products; the build adds
   a single pre-generated thumbnail URL per product (using `getImage`) to that data instead of the
   raw path.
1. **Tooling follows the files:** the pre-commit hook and `check-images.py` also cover
   `application/frontend/src/assets/` (and keep covering `public/`). The existing limits (real
   WebP/PNG/JPEG, at most 1600 px on a side and 300 KB) stay and apply to the originals; Astro
   produces the delivered variants.
1. **CLAUDE.md and `docs/info`** are updated for the new image location and the CMS behavior.

## Phase 2: skeletons (agreed with the user)

- shadcn look: `bg-muted`, rounded, pulse animation (`animate-pulse`).
- Pictures only. Applies to equipment/product photos, featured equipment, related equipment,
  wiki images, client directory logos and partner logos (including the `PartnerLogo` atom if it is
  used). The hero is skipped (eager, above the fold). Header logo and search thumbnails are skipped.
- One shared CSS class on the image wrapper plus one small shared script: the image starts at
  `opacity: 0`, fades in on `load`, and the pulse stops. Cached images (`img.complete`) show no
  skeleton. Content stays visible without JavaScript (`<noscript>`/`html.motion-on` pattern,
  matching the existing motion rules in CLAUDE.md).
- Wrapper keeps the aspect ratio so the layout does not move. Partner logos get a fixed
  `h-12` box with a sensible width.
- Must work with the reveal animations and with reduced motion.

## Constraints

- Astro 7, static output, Tailwind 4, no client frameworks, Biome and Prettier rules, no emojis,
  commit format `type(scope): subject`, and no Co-Authored lines in commits (frontend `CLAUDE.md`).
- Build time may grow; keep the number of generated widths modest. Default to WebP output only
  (no AVIF) unless the build stays fast.
- Bilingual pages (`/ua`, `/en`) must be checked, since Ukrainian text is longer.

## Left to the builder

- Exact `widths`/`sizes` values per slot (output format defaults to WebP via `<Image>`).
- Resolver API shape and file name.
- How to keep the featured photos' hover stepping working with deferred loading.
- Playwright and unit test updates (the e2e suite for the featured gallery already exists).
- Whether `PartnerLogo.astro` is dead code and can be deleted.

## Open risks

- Decap `public_folder` with a `/src/assets/...` value is unusual; the builder must verify that the
  CMS preview and saved content still round-trip. If it does not, fall back to relative paths and
  Astro's `image()` schema for those fields (this is the escape hatch, not the plan).
- Moving files changes git history for 50+ binaries; do it in a single commit.
