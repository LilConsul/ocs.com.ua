# Image Optimization and Skeletons Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Astro process every raster image (resized WebP with responsive `srcset`), fix loading attributes, then add shadcn-style loading skeletons to pictures.

**Architecture:** Raster images move from `public/` to `src/assets/`. Content and JSON keep plain-string paths (now `/src/assets/...`). One resolver maps a path string to Astro `ImageMetadata` through `import.meta.glob`, and replaces `existingFile()` for rasters (missing file: warn once, skip). Components render `<Image>` with `widths`/`sizes`. Skeletons are a shared CSS class plus one small script.

**Tech Stack:** Astro 7.4.7, Tailwind 4, Decap CMS, bun test, Playwright, Biome, Python 3.11 (Pillow) for the image check script.

**Spec:** `docs/superpowers/specs/2026-11-12-image-optimization-design.md`

All paths below are relative to `application/frontend` unless they start with `docs/`, `application/infra` or `.pre-commit-config.yaml` (repo root).

## Global Constraints

- Astro 7, static output, no React or UI framework in public pages; skeleton behavior is CSS plus vanilla script.
- Output format is WebP only (no AVIF). Keep generated widths to two or three per slot.
- Content strings stay plain strings; no `image()` schema (escape hatch only if Decap round trip fails, see Task 3).
- SVGs, fonts, PDFs, icons, favicons, `placeholder.svg`, `og-en.png`, `og-ua.png` stay in `public/`.
- A missing image file warns once and is skipped; the build never fails for it.
- Social and structured-data images: one fixed 1200 px wide JPEG, absolute URL from the site URL.
- Skeleton: `bg-muted`, rounded, `animate-pulse`; pictures only; skip hero, header logo, search thumbnails; content visible without JavaScript and under reduced motion.
- No emojis anywhere. Commit format `type(scope): subject`, lowercase, imperative, at most 72 chars. NO `Co-Authored-By` lines (frontend `CLAUDE.md`). Run `bun run check:fix` before each commit.
- Check both `/ua` and `/en` pages (Ukrainian text is longer).

## Review Focus

1. A product with no gallery images (or all missing): card, gallery, structured data and search must fall back to `/placeholder.svg` without crashing.
1. Content string pointing at a file that does not exist in `src/assets/`: skipped with one warning, partner kept without logo.
1. Path strings with URL-encoded characters or the old `/assets/...` prefix: must resolve or warn, never throw.
1. English product entries (gallery lives only in the `ua` file): fallback still returns the `ua` images.
1. Cached image already loaded before the script runs: no skeleton flash, image visible.

______________________________________________________________________

### Task 1: Image resolver core

**Files:**

- Create: `src/lib/image-resolver.ts`
- Test: `tests/lib/image-resolver.test.ts`

**Interfaces:**

- Produces:

  - `export type ImageSrc = ImageMetadata | string`
  - `export function createImageResolver(files: Record<string, ImageMetadata>): { resolveImage(path: string | null | undefined): ImageMetadata | undefined; resolveImages(paths: (string | null | undefined)[] | null | undefined): ImageMetadata[] }`

- `files` keys are glob keys like `/src/assets/equipment/hc-a/a.webp`. Lookup decodes URI components first. A miss warns once per path with `console.warn("[images] <path> is referenced in content but missing from src/assets/, skipping it")`. `null`, `undefined`, `""`, remote URLs (`http`, `//`) return `undefined` (remote URLs warn too, same as `existingFile`).

- [ ] **Step 1: Write failing tests** in `tests/lib/image-resolver.test.ts`, modeled on `tests/lib/public-assets.test.ts`: `returns the metadata for a known path`, `decodes encoded paths`, `warns once for a missing path and returns undefined` (spy on `console.warn`, call twice, expect one call), `returns undefined for null, undefined and empty`, `rejects remote urls`, `resolveImages drops misses and keeps order`, `resolveImages accepts undefined and null as empty`.

- [ ] **Step 2: Run** `bun test tests/lib/image-resolver.test.ts`. Expected: FAIL (module missing).

- [ ] **Step 3: Implement** `createImageResolver` per the interface above.

- [ ] **Step 4: Run** the same test. Expected: PASS.

- [ ] **Step 5: Commit** `feat(frontend/images): add image resolver core`.

______________________________________________________________________

### Task 2: Glob wrapper, test mock, data layer, file move

This is one task because moving files and switching the data layer must land together to keep the build green.

**Files:**

- Create: `src/lib/images.ts`
- Modify: `tests/helpers/mocks.ts`, `src/lib/content-utils.ts` (`getGallery`, `ProductSearchEntry`), `src/lib/wiki-utils.ts` (`getWikiCoverImage`), `src/lib/about/partners-data.ts`, `src/lib/about/types.ts` (partner logo type), `src/data/partners.json`, the seven `src/content/equipment/**/*.ua.md` files with `gallery:`
- Move (git mv): `public/assets/equipment/*` to `src/assets/equipment/*`; `public/assets/partners/*` to `src/assets/partners/*`; `public/assets/image_*.webp` (12 files) to `src/assets/equipment/`; `public/images/main_page.webp` to `src/assets/hero/main_page.webp`
- Test: `tests/lib/content-utils.test.ts`, `tests/lib/wiki-utils.test.ts`, `tests/lib/about/partners-data.test.ts`, `tests/data/integrity.test.ts`, `tests/lib/public-assets.test.ts` (keep: PDFs still use `existingFile`)

**Interfaces:**

- Consumes: `createImageResolver`, `ImageSrc` (Task 1).

- Produces:

  - `src/lib/images.ts`: `export const { resolveImage, resolveImages } = createImageResolver(import.meta.glob<ImageMetadata>("/src/assets/**/*.{webp,png,jpg,jpeg}", { eager: true, import: "default" }))`
  - `getGallery(entry: EquipmentEntry, allEntries: EquipmentEntry[]): ImageMetadata[] | undefined` (was `string[]`)
  - `getWikiCoverImage(entry: WikiEntry, allEntries: WikiEntry[]): ImageMetadata | undefined`
  - `ProductSearchEntry.image: string` stays a string URL (filled in Task 6)
  - `PartnerItem.logo?: ImageMetadata` (partners-data resolves it)

- [ ] **Step 1: Write failing tests.** In `tests/helpers/mocks.ts` add `mock.module("@/lib/images", ...)` backed by `createImageResolver` with a fixture map (keys `/src/assets/equipment/hc-a/a.webp`, `/src/assets/partners/p.webp`, `/src/assets/hero/main_page.webp`, values `{ src: "/_astro/a.hash.webp", width: 800, height: 600, format: "webp" }`). If `@/lib/images` does not resolve in `mock.module`, use the relative specifier the modules import. Update the existing tests: `getGallery` returns metadata for known paths and `undefined` when all are missing, English entry falls back to `ua` gallery (Review Focus 4); `getWikiCoverImage` returns metadata or `undefined`; partners test `drops a logo whose file is missing but keeps the partner` now uses `/src/assets/partners/...` paths (Review Focus 2).

- [ ] **Step 2: Run** `bun test`. Expected: FAIL.

- [ ] **Step 3: Move the files** with `git mv` (use a one-off shell loop; do not commit the script). Then rewrite strings: in the seven equipment files and `src/data/partners.json`, replace `/assets/equipment/` with `/src/assets/equipment/`, `/assets/partners/` with `/src/assets/partners/`, and `/assets/image_` with `/src/assets/equipment/image_`. Verify with `grep -rn '"/assets/\|- /assets/' src` that no raster path remains.

- [ ] **Step 4: Implement** `src/lib/images.ts`; switch `getGallery`, `getWikiCoverImage` and partners-data to `resolveImages`/`resolveImage` (keep `existingFile` for PDFs and SVGs in `public/`). In partners-data keep partners without a resolvable logo.

- [ ] **Step 5: Run** `bun test`. Expected: PASS. Then `bun run build`; expected: succeeds (components still receive metadata, which `<Image>` accepts). Fix type errors that `bunx astro check` reports for string-typed props by widening them to `ImageSrc`.

- [ ] **Step 6: Commit** `feat(frontend/images): move rasters to src/assets and resolve them at build`. The move and rewrites go in this single commit.

______________________________________________________________________

### Task 3: CMS config, image tooling, docs

**Files:**

- Modify: `src/pages/admin/_config.template.yml` (image fields at ~line 190 partner `logo`, ~437 equipment `gallery`, ~538 wiki `coverImage`), `application/infra/scripts/check-images.py`, `.pre-commit-config.yaml` (hook `optimize-public-images`), `CLAUDE.md`, `docs/info/development.md`
- Test: `tests/cms/` (add or extend a template test if one parses the template; otherwise manual round trip)

**Interfaces:**

- Consumes: new locations from Task 2.

- Produces: per-field overrides `media_folder: "../../assets/..."` style relative paths are NOT used; use `media_folder: "application/frontend/src/assets/equipment"` with `public_folder: "/src/assets/equipment"` for gallery images, `.../src/assets/partners` + `/src/assets/partners` for partner logo, `.../src/assets/wiki` + `/src/assets/wiki` for wiki `coverImage`. Global `media_folder`/`public_folder` stay on `public/assets`.

- [ ] **Step 1: Edit the template** with the overrides above; keep the existing WebP conversion setting (line ~45).

- [ ] **Step 2: Update `check-images.py`** so `DEFAULT_PATH` becomes a list of both `frontend/public` and `frontend/src/assets`, and update its docstring. Update the hook `files:` regex to `^application/frontend/(public|src/assets)/.*\.(webp|png|jpe?g)$` and rename it to `[FE] Optimize images`.

- [ ] **Step 3: Verify** `uv run application/infra/scripts/check-images.py` exits 0 with both folders (or only prints files over limits that already existed).

- [ ] **Step 4: Verify the CMS round trip** (Risk in the spec): run `bun run dev`, open `/admin`, add an image to a test product gallery, confirm the saved string is `/src/assets/equipment/<file>.webp` and the preview and site resolve it. If it does not round trip, stop and report; the fallback is relative paths plus the `image()` schema for those fields.

- [ ] **Step 5: Update docs:** `CLAUDE.md` bullet "Images in `public/`..." to describe `src/assets/` for rasters and `public/` for the rest; `docs/info/development.md` for the CMS media behavior.

- [ ] **Step 6: Commit** `chore(frontend/cms): point image fields at src/assets and extend image checks`.

______________________________________________________________________

### Task 4: Catalogue and featured components

**Files:**

- Modify: `src/components/catalogue/ProductCard.astro`, `ProductGallery.astro`, `RelatedEquipment.astro`, `src/components/homepage/FeaturedEquipment.astro`, `src/components/homepage/HeroSection.astro`, `src/pages/[lang]/catalogue/equipment/[category]/index.astro`, `.../[slug].astro`, `src/pages/[lang]/catalogue/industry/[slug].astro`
- Test: `tests/e2e/featured.e2e.ts` (extend), build inspection

**Interfaces:**

- Consumes: `getGallery(): ImageMetadata[] | undefined`, `resolveImage`.
- Produces: `ProductCard` prop `gallery?: ImageMetadata[]` and a new prop `eager?: boolean` (true for the first row only; the index pages pass `eager={index < 3}`); `RelatedEquipment` galleries typed `Record<string, ImageMetadata[]>`.

Widths and sizes (builder may adjust within the spirit of the spec):

| Slot                | widths              | sizes                                                      | loading                                                                                                              |
| ------------------- | ------------------- | ---------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| ProductCard         | `[400, 800]`        | `(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw` | eager only when `eager`, else lazy                                                                                   |
| Gallery main        | `[640, 960, 1280]`  | `(min-width: 1024px) 640px, 100vw`                         | eager                                                                                                                |
| Gallery thumb       | `[100, 200]`        | `80px`                                                     | lazy                                                                                                                 |
| Lightbox            | `[1200, 1600]`      | `100vw`                                                    | lazy                                                                                                                 |
| Featured spotlight  | `[400, 800]`        | `(min-width: 1024px) 400px, 80vw`                          | lazy; hidden ones load on first step (already done in `featured-gallery.ts` via `loading = "eager"`)                 |
| Featured small card | `[144, 288]`        | `144px`                                                    | lazy                                                                                                                 |
| Related             | `[400, 800]`        | card sizes above                                           | lazy                                                                                                                 |
| Hero                | `[768, 1280, 1920]` | `100vw`                                                    | eager with high fetch priority (use Astro's `priority` prop if Astro 7.4.7 supports it, else `fetchpriority="high"`) |

- [ ] **Step 1: Write the failing check:** `bun run build`, then a one-off assertion (shell or an e2e test) that `dist/client/ua/catalogue/equipment/checkweigher/index.html` contains `srcset=` on product card images, and that only the first three cards have `loading="eager"`. Add the equivalent assertion to `tests/e2e/featured.e2e.ts` that spotlight images have a `srcset` and the hidden ones switch to `loading="eager"` after the first step.
- [ ] **Step 2: Run** and confirm failure.
- [ ] **Step 3: Implement** the table above in each component; update props types; fix the hero import to `src/assets/hero/main_page.webp` (static import) with the table's attributes.
- [ ] **Step 4: Run** `bun run build && bun run test:e2e`. Expected: PASS; inspect the generated HTML for `/_astro/*.webp` URLs and `srcset`.
- [ ] **Step 5: Commit** `feat(frontend/images): responsive srcset and loading rules for catalogue and homepage`.

______________________________________________________________________

### Task 5: Partner, client and wiki components

**Files:**

- Modify: `src/components/homepage/PartnersSection.astro`, `src/components/homepage/atoms/PartnerLogo.astro` (delete if unused, check with Grep first), `src/components/about/ClientDirectory.astro`, `src/components/wiki/WikiCard.astro`, `src/pages/[lang]/wiki/[slug].astro`, `src/pages/[lang]/wiki/index.astro`
- Test: `tests/pages/` (extend wiki page test if one exists), build inspection

**Interfaces:**

- Consumes: `PartnerItem.logo?: ImageMetadata`, `getWikiCoverImage(): ImageMetadata | undefined`.

- Produces: `WikiCard` prop `coverImage?: ImageMetadata`.

- [ ] **Step 1: Write the failing check:** after `bun run build`, assert wiki card and cover `<img>` tags have `width`, `height` and `srcset` (use a wiki test fixture with a cover, or a temporary content file removed afterward).

- [ ] **Step 2: Implement:** PartnersSection drops `getImageDimensions` and the `image-size`/`fs` imports (width and height come from metadata; remove `image-size` from `package.json` only if no other file uses it); filter uses `p.logo && p.website`. Logos: widths `[176, 352]`, sizes `176px`. ClientDirectory logos: widths `[160, 320]`, sizes `160px`. WikiCard: `<Image>` with widths `[480, 960]`, sizes `(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw`. Wiki cover: widths `[640, 960, 1280]`, sizes `(min-width: 1024px) 768px, 100vw`, eager.

- [ ] **Step 3: Run** `bun test && bun run build`; confirm logos have `srcset` in `dist/client/ua/index.html`.

- [ ] **Step 4: Commit** `feat(frontend/images): process partner, client and wiki images`.

______________________________________________________________________

### Task 6: Share images, structured data, search thumbnails

**Files:**

- Create: `src/lib/share-image.ts`
- Modify: `src/layouts/Layout.astro` (line ~60), `src/lib/structured-data/product.ts`, `src/lib/structured-data/article.ts`, `src/pages/[lang]/catalogue/equipment/[category]/[slug].astro`, `.../index.astro`, `src/pages/[lang]/catalogue/industry/[slug].astro`, `src/pages/[lang]/wiki/[slug].astro`
- Test: `tests/lib/structured-data.test.ts`, `tests/lib/share-image.test.ts`

**Interfaces:**

- Produces:

  - `export async function shareImageUrl(image: ImageMetadata | undefined, site: URL | string): Promise<string | undefined>`: calls `getImage({ src: image, width: 1200, format: "jpeg" })` and returns the absolute URL; `undefined` input returns `undefined`.
  - `export async function thumbUrl(image: ImageMetadata | undefined): Promise<string>`: `getImage({ src: image, width: 400, format: "webp" })`, returns `/placeholder.svg` when `image` is `undefined`.

- `Layout.astro` `image` prop becomes a ready absolute URL string (callers pass `await shareImageUrl(...)`); default stays `/assets/og-${lang}.png`.

- `buildProduct`/`article` structured data keep taking string URLs.

- [ ] **Step 1: Write failing tests:** `share-image.test.ts` with `astro:assets` mocked (add to `tests/helpers/mocks.ts`): undefined returns undefined; metadata returns an absolute URL starting with the site; `thumbUrl(undefined)` returns `/placeholder.svg`. Extend `structured-data.test.ts` to expect absolute processed URLs for product images, and no `image` field when the gallery is empty (Review Focus 1).

- [ ] **Step 2: Run** `bun test`; expected FAIL.

- [ ] **Step 3: Implement** both helpers; in the three catalogue pages fill `productSearchIndex[].image` with `await thumbUrl(gallery[0])`; pass `shareImageUrl(...)` results into Layout and structured data.

- [ ] **Step 4: Run** `bun test && bun run build`; grep `dist/client/ua/catalogue/equipment/checkweigher/hc-a/index.html` for `og:image` and `application/ld+json` image URLs; both must point at `/_astro/...jpg`-style absolute URLs, and `data-product-index` thumbnails must be `/_astro/...webp`.

- [ ] **Step 5: Commit** `feat(frontend/images): processed share, structured data and search images`.

______________________________________________________________________

### Task 6b: Phase 1 verification

- [ ] **Step 1:** `bun run check:fix && bun test && bun run build && bun run test:e2e`; all pass.
- [ ] **Step 2:** Compare `dist/client/_astro` image bytes against the old `public` images for one card page; report the saving. Spot check `/ua` and `/en` home, a category page, a product page, wiki index and the About page in `bun run preview`.
- [ ] **Step 3:** No commit unless fixes were needed.

______________________________________________________________________

### Task 7: Skeletons (phase 2)

**Files:**

- Create: `src/lib/image-skeleton.ts`, `tests/e2e/skeleton.e2e.ts`
- Modify: `src/styles/global.css`, `src/layouts/Layout.astro` (load the script once), and the wrappers of ProductCard, ProductGallery (main and thumbs), RelatedEquipment, FeaturedEquipment, WikiCard, wiki cover, ClientDirectory, PartnersSection (and `PartnerLogo.astro` if kept)

**Interfaces:**

- Produces:

  - CSS: `.skeleton` wrapper class (`bg-muted rounded-md animate-pulse`, pulse stops when `[data-loaded]`), `.skeleton > img` (`opacity: 0; transition: opacity var(--dur-base)`), `.skeleton[data-loaded] > img { opacity: 1 }`. Rules apply only under `html.motion-on`; without JS or with reduced motion the image is simply visible (no skeleton).
  - `export function initImageSkeletons(root: ParentNode = document): void` in `src/lib/image-skeleton.ts`: for each `.skeleton` under `root`, find its `img`; if `img.complete && img.naturalWidth > 0` set `data-loaded` immediately, else listen once for `load` and `error` and then set `data-loaded` (an errored image must not stay hidden). Idempotent. Called on load and after `astro:page-load` if the site uses view transitions navigation; also exported for use after `innerHTML` insertions.

- Wrapper keeps its aspect ratio or fixed box so the layout does not move. Partner logos: wrapper `h-12` with the existing `w-44` slot width. Hidden featured photos: the skeleton applies to the visible stage, not to `hidden` images.

- [ ] **Step 1: Write the failing e2e test** `tests/e2e/skeleton.e2e.ts` (Playwright, the three browsers like the existing suite): route all `/_astro/*.webp` requests with a 1.5 s delay on the catalogue page; assert the first card wrapper has the pulse class and no `data-loaded` immediately, then gains `data-loaded` and the image becomes visible after load; assert an already cached reload shows `data-loaded` without the pulse; assert with JavaScript disabled (`javaScriptEnabled: false`) images are visible; assert with `reducedMotion: "reduce"` images are visible.

- [ ] **Step 2: Run** `bun run build && bun run test:e2e -g skeleton`; expected FAIL.

- [ ] **Step 3: Implement** the CSS, the script (imported once from `Layout.astro`), and add the `skeleton` class to the listed wrappers. Do not touch the hero, header logo or search results.

- [ ] **Step 4: Run** the e2e suite again; expected PASS in all three browsers. Verify visually in `bun run preview` on `/ua` and `/en` that logos, cards and the gallery show the gray pulse and then fade in.

- [ ] **Step 5: Commit** `feat(frontend/ui): add loading skeletons to pictures`.

______________________________________________________________________

## Self-Review

- Spec coverage: processed rasters (Tasks 1-2), CMS and tooling (3), srcset and loading rules (4, 5), wiki dimensions (5), OG/structured data/search (6), skeletons and their exclusions (7). The hero is eager with high priority (4). The decision to keep PDFs on `existingFile` is in Task 2.
- Open item left to the builder, as the spec allows: exact widths (table is a default), whether `PartnerLogo.astro` is dead code, Astro `priority` prop support.
- Type consistency: `ImageSrc` and `ImageMetadata` are used consistently; `ProductSearchEntry.image` stays a string.
