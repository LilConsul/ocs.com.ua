# Motion Phase 2: Page-Level Polish Implementation Plan

**Goal:** Native page transitions, image fade-in on load, and section heading reveals, on top of the Phase 1 runtime.

**Architecture:** Same rules as Phase 1. Components only add classes. Hidden states live in
`global.css` behind `html.motion-on`, so content stays visible without JS and with reduced motion.

## Decisions

- Page transitions: CSS `@view-transition { navigation: auto; }` (cross-document, no Astro
  `ClientRouter`). The header gets `view-transition-name: site-header` so it stays put while the
  page body crossfades. Disabled under `prefers-reduced-motion: reduce`. Browsers without support
  ignore the rule.
- Image fade-in: opt-in class `img-fade`. Hidden only under `html.motion-on` until
  `data-loaded` is set by `images.ts` (on `load`, `error`, or already `complete`). Uses a keyframe
  `animation`, not a `transition`, so Tailwind hover transforms on the same element keep working.
  Not applied to the hero image (LCP) or the header logo.
- Heading reveal: new class `reveal-heading` on section `h2`s that follow an eyebrow. Variant
  `heading` rises 14px and starts one stagger step after the eyebrow rule. Word or line splitting
  is skipped (YAGNI: it breaks `text-balance`, hyphenation and screen-reader flow).

## Tasks

### Task 1: heading variant (tokens, reveal, CSS)

- [ ] Tests in `tests/lib/anims/tokens.test.ts`: `variantFor` maps `reveal-heading` to `heading`;
  `revealKeyframes("heading")` ends visible; `revealDelay("heading", 0)` equals `STAGGER_STEP`;
  other variants return `staggerDelay(index)`; `REVEAL_SELECTOR` contains `.reveal-heading`.
- [ ] Test in `tests/config/motion.test.ts`: `reveal-heading` is hidden under
  `html.motion-on ...:not([data-revealed])`.
- [ ] Implement `tokens.ts`, `reveal.ts` (use `revealDelay`), `global.css`.
- [ ] Add `reveal-heading` to the eight section `h2`s: `IndustriesSection`, `PartnersSection`,
  `ManufacturerCredentials`, `ClientDirectory`, `InteractiveUkraineMap`, `RelatedEquipment`,
  `ContactForm`, `OfficeLocation`. Test asserts each file has it.
- [ ] Commit `feat(anims): reveal section headings`.

### Task 2: image fade-in

- [ ] Tests in `tests/lib/anims/images.test.ts` (pure helper `isSettled(img)`), and in
  `tests/config/motion.test.ts`: hidden rule gated by `html.motion-on` and
  `:not([data-loaded])`; uses `animation`, not `transition`; runtime imports `images`;
  listed components carry `img-fade`; sidebar template carries `img-fade` and calls
  `observeImages(` after each innerHTML insert.
- [ ] Implement `images.ts`, `runtime.ts`, `global.css`, components, sidebar.
- [ ] Commit `feat(anims): fade images in on load`.

### Task 3: view transitions

- [ ] Tests in `tests/config/motion.test.ts`: `@view-transition` with `navigation: auto`; reduced
  motion turns it off; header has `view-transition-name: site-header`.
- [ ] Implement in `global.css`.
- [ ] Commit `feat(ui): cross-document page transitions`.

### Task 4: e2e and docs

- [ ] E2E: heading hidden then revealed; image fades (hidden before load via blocked request, then
  `data-loaded`); no-JS images and headings visible; reduced motion images visible; view
  transition fires on navigation in browsers that support it and not under reduced motion.
- [ ] Update `CLAUDE.md` and the spec; tick this plan.
- [ ] Verify: `bun test`, `bunx astro check`, biome on touched files, `bun run build`, e2e.
- [ ] Commit `docs(anims): document page-level motion`.
