# Motion Foundation (Phase 1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use skills:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace scroll-scrubbed CSS reveals with eased, staggered, play-once reveals on the vanilla `motion` package, and add motion tokens, button press states and a CSS-driven header scroll state.

**Architecture:** An inline `<head>` script sets `html.motion-on` (only when reduced motion is off and `IntersectionObserver` exists) with a 3 second failsafe. CSS hides unrevealed `.reveal*` elements only under `html.motion-on`. One runtime module (`src/lib/anims/runtime.ts`) observes them with `inView` and plays a `motion/mini` animation once. Pure logic lives in `tokens.ts` and is unit tested.

**Tech Stack:** Astro 7, Tailwind 4, `motion` 14 (`motion/mini` `animate`, `inView`), bun test, Biome.

Spec: `docs/superpowers/specs/2026-11-05-motion-system-design.md`

Deviation from the spec: the JS runtime keeps its own easing and timing constants in `tokens.ts` instead of reading CSS custom properties at runtime. A test asserts the CSS and JS easing values stay identical. This avoids a `getComputedStyle` read per reveal.

______________________________________________________________________

### Task 1: Pure tokens and helpers (TDD)

**Files:**

- Create: `src/lib/anims/tokens.ts`

- Test: `tests/lib/anims/tokens.test.ts`

- [ ] Write failing tests for `parseIndex`, `staggerDelay`, `variantFor`, `REVEAL_SELECTOR`

- [ ] Run `bun test tests/lib/anims/tokens.test.ts` and confirm FAIL (module missing)

- [ ] Implement `tokens.ts`

- [ ] Run the test and confirm PASS

- [ ] Commit `feat(anims): add motion tokens and reveal helpers`

### Task 2: Head script that enables motion (TDD)

**Files:**

- Create: `src/lib/anims/motion-on.js`

- Test: `tests/lib/anims/motion-on.test.ts`

- [ ] Write failing tests: class added when allowed; not added for reduced motion; not added without `IntersectionObserver`; failsafe timer of `FAILSAFE_MS` removes the class

- [ ] Run and confirm FAIL

- [ ] Implement `motion-on.js` as an IIFE using `window` and `document`

- [ ] Run and confirm PASS

- [ ] Commit `feat(anims): add head script that gates reveal motion`

### Task 3: Reveal runtime

**Files:**

- Create: `src/lib/anims/reveal.ts`, `src/lib/anims/runtime.ts`

- Modify: `src/layouts/Layout.astro` (inline head script, runtime script)

- Modify: `src/styles/global.css` (tokens, hidden state, remove scrubbed block)

- Test: `tests/config/motion.test.ts`

- [ ] Write failing wiring tests: Layout inlines `motion-on.js` and loads the runtime; `global.css` hides `.reveal*` only under `html.motion-on`; no `animation-timeline` remains; CSS `--ease-out-expo` equals `EASE_OUT_EXPO`

- [ ] Run and confirm FAIL

- [ ] Implement `reveal.ts` (`observeReveals`, no-op unless `html.motion-on`, sets `data-revealed` in `finally`)

- [ ] Implement `runtime.ts` (clear failsafe, observe the document)

- [ ] Edit `Layout.astro` and `global.css`

- [ ] Run tests and confirm PASS

- [ ] Commit `feat(anims): eased play-once reveals on motion`

### Task 4: Re-scan reveals after dynamic DOM swaps

**Files:**

- Modify: `src/components/catalogue/CatalogueSidebar.astro` (call `observeReveals` after each `innerHTML` assignment)

- Test: `tests/config/motion.test.ts`

- [ ] Add failing test: every `innerHTML =` assignment that inserts server or search markup is followed by `observeReveals(`

- [ ] Run and confirm FAIL

- [ ] Add the import and the four calls

- [ ] Run and confirm PASS

- [ ] Commit `fix(catalogue): replay reveals for swapped results`

### Task 5: Button press states

**Files:**

- Modify: `src/styles/global.css` (`@utility press`)

- Modify: CTA buttons in `HeroSection`, `AboutHero`, `AboutCta`, `WikiCta`, `ContactForm`, `CatalogueSidebar`, `ManufacturerCredentials`, `OfficeLocation`, `NotFoundContent`, `ServerErrorContent`

- Test: `tests/config/motion.test.ts`

- [ ] Add failing test: every class string containing `press` also transitions `scale`

- [ ] Add the utility and apply `press` plus `scale` in the transition list

- [ ] Run and confirm PASS

- [ ] Commit `feat(ui): add press state to call-to-action buttons`

### Task 6: Header scroll state

**Files:**

- Modify: `src/components/Header.astro`

- Test: `tests/config/motion.test.ts`

- [ ] Add failing test: header styles the scrolled state through `data-[scrolled=true]:` variants, the listener is passive, and class toggling is gone

- [ ] Implement

- [ ] Run and confirm PASS

- [ ] Commit `feat(header): style scroll state from data attribute`

### Task 7: Docs and cleanup

**Files:**

- Modify: `CLAUDE.md`, `src/lib/anims/reveal-once.ts` (comment only)

- [ ] Update the JavaScript rule in `CLAUDE.md` and the stale comment in `reveal-once.ts`

- [ ] Commit `docs(frontend): document motion runtime`

### Task 8: Verification

- [ ] `bun test`
- [ ] `bun run check:fix` then `bun run ci`
- [ ] `bunx astro check`
- [ ] `bun run build` and measure the gzip size of the motion chunk (target under 10 KB)
- [ ] Browser check with reduced motion, JavaScript disabled and the catalogue search
