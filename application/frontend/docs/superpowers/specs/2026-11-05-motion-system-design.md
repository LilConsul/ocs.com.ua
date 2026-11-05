# Motion System Design

Date: 2026-11-05
Status: Draft, awaiting review

## Goal

Make the site feel more polished and animated without giving up its static, SEO-first
architecture. Replace the scroll-scrubbed, linear CSS reveals with eased, staggered,
play-once reveals driven by a small shared runtime built on the vanilla `motion` package
(the Framer Motion engine without React), and add the supporting polish layers (tokens,
press states, header state, page transitions, hero depth, scroll storytelling).

## Current state

- Scroll reveals are pure CSS (`animation-timeline: view()`) in `src/styles/global.css`:
  `.reveal`, `.reveal-slide`, `.reveal-glow`, `.reveal-bar`, `.eyebrow-rule`, staggered by a
  `--i` custom property. About 20 components use them.
- Problems: linear easing tied to scroll position (mechanical, reverses on scroll-up, only
  14px of travel); no support in Firefox (no `animation-timeline`); no page transitions;
  easing and duration values are hardcoded in class strings; no button press state;
  `Header.astro` sets `data-scrolled` but nothing styles it.
- One-off scripts exist for count-up (`StatsSection`, `AboutHero`), the partner marquee
  (`PartnersSection`) and the Ukraine map intro (`src/lib/anims/reveal-once.ts`).
- Constraints: Astro static output, no UI frameworks or islands, content visible without
  JavaScript (`src/styles/no-js.css` shows no-JS is a deliberate requirement), reduced motion
  respected, bilingual pages (Ukrainian text is longer).

## Decisions

- Library: vanilla `motion` package, imported from sub-paths. Not React Framer Motion
  (would hydrate React on every page) and not GSAP (larger, only needed for heavy pinning).
- Architecture: one declarative runtime. Components declare intent through classes and data
  attributes; no per-component scripts for reveals.
- CSS handles what CSS does well: hover, press, header state, `@view-transition`.
  JS handles reveals, parallax, magnetic and spring effects.
- Page transitions use native cross-document view transitions, not Astro `ClientRouter`, so
  pages stay real multi-page static HTML.
- Reveals play once and do not reverse on scroll-up.
- Existing class names (`reveal`, `reveal-slide`, `reveal-glow`, `reveal-bar`,
  `eyebrow-rule`) and the `--i` stagger index are kept, so no markup changes are needed.

## Phasing

Each phase gets its own implementation plan and can ship independently.

| Phase           | Contents                                                             | Depends on |
| --------------- | -------------------------------------------------------------------- | ---------- |
| 1. Foundation   | Tokens, runtime, eased staggered reveals, press states, header state | none       |
| 2. Page-level   | View transitions, image fade-in, heading and line reveals            | 1          |
| 3. Showpiece    | Hero parallax, magnetic CTAs, spring card hover and tilt             | 1          |
| 4. Storytelling | Sticky or scrubbed homepage sections, scroll-linked effects          | 1          |

## Phase 1: Foundation (detailed)

### Components

- `src/lib/anims/tokens.ts`: JS-only values (spring configs, stagger step, reveal distances).
- `src/lib/anims/reveal.ts`: finds `.reveal*` elements, plays one-shot animations, exposes
  `observeReveals(root)`.
- `src/lib/anims/runtime.ts`: entry point. Checks reduced motion, runs `observeReveals`,
  cancels the failsafe timer, sets `window.__motionReady`.
- `src/lib/anims/motion-gate.ts` (pure, unit-tested): decides whether motion is enabled and
  computes stagger delay from `--i`.
- `global.css`: motion tokens and the `.motion-on` hidden state (see below).
- `Layout.astro`: inline head script plus the runtime script.

### Motion tokens (`global.css`)

CSS custom properties: `--ease-out-expo`, `--ease-out-quart`, `--dur-fast` (150ms),
`--dur-base` (300ms), `--dur-slow` (700ms). The reveal runtime reads them with
`getComputedStyle` so CSS and JS share one source of truth. Existing hardcoded
`duration-*` classes migrate gradually; they are not rewritten in Phase 1.

### Reveal behavior

1. A tiny inline script in `<head>` adds `html.motion-on` only when
   `prefers-reduced-motion: no-preference` and `IntersectionObserver` exists. It starts a
   3 second failsafe timer that removes the class again.
1. Under `html.motion-on`, `.reveal*` elements without `data-revealed` are `opacity: 0`
   with their start transform (the same offsets the CSS keyframes use today).
1. `runtime.ts` loads, cancels the failsafe, and calls `observeReveals(document)`.
1. `inView` fires once per element. The runtime sets `data-revealed`, plays a WAAPI
   animation (`motion/mini`) from the start state to the natural state using
   `--ease-out-expo`, with delay = `--i` times the stagger step, then clears inline styles
   so hover transforms (Tailwind `translate`) keep working.
1. Variants map one to one: `reveal` rises, `reveal-slide` slides in from the left,
   `reveal-glow` scales in, `reveal-bar` grows from the left, `eyebrow-rule` draws.
1. The old `animation-timeline: view()` block is deleted. `hero-rise` (time-based, runs on
   load) is unchanged so above-the-fold content never waits for JS.
1. `observeReveals(root)` is idempotent (skips elements with `data-revealed` or already
   observed). `CatalogueSidebar.astro` calls it after replacing results with `innerHTML`.

### Button press states

A `press` utility: `motion-safe:active:scale-[0.97]` with `--dur-fast` transition. Applied
to the primary and secondary CTAs (hero, about hero, about CTA, wiki CTA, contact form
submit, error pages, catalogue sidebar action).

### Header scroll state

- Style from `data-scrolled` in CSS (background opacity, blur, shadow, border color).
- `Header.astro` script keeps setting `data-scrolled` but no longer toggles utility
  classes; the listener becomes `{ passive: true }` and rAF-throttled. The duplicate
  `astro:page-load` registration is guarded so listeners do not stack.

## Phases 2 to 4 (outline)

- Phase 2: `@view-transition { navigation: auto }` with `view-transition-name` on the
  header so it persists; image fade-in on load; heading and line reveals. Handle `pageshow`
  for bfcache restores.
- Phase 3: hero background parallax via `scroll()`; magnetic CTAs; spring card tilt.
  Pointer-fine devices only, skipped on touch and reduced motion.
- Phase 4: sticky or scrubbed homepage sections using `scroll()` and `position: sticky`,
  no pinning library.

## Error handling and accessibility

- Reduced motion: `.motion-on` is never set, nothing is hidden or animated. Hover
  transitions keep their `motion-safe:` guards.
- JavaScript disabled or runtime fails to load: content is visible (class never set, or the
  failsafe removes it after 3 seconds).
- `data-revealed` is set before animating, so a thrown animation error cannot re-hide
  content.
- Animations only touch `opacity` and `transform` (compositor-friendly, no layout shift).
- Focus order and keyboard behavior are unchanged.

## Testing

- Unit tests (bun) for `motion-gate.ts`: motion-enabled decision, stagger delay from `--i`,
  failsafe behavior.
- Manual matrix: Chrome, Firefox, Safari; reduced motion on; JavaScript disabled; Ukrainian
  and English; catalogue search re-render; mobile viewport.
- Success criteria: Phase 1 adds under 10 KB gzip of JS; no layout shift; Lighthouse
  performance drops by no more than 2 points and LCP on inner pages is not worse; reveals
  work in Firefox.

## Repository changes

- Add dependency `motion`.
- Update `CLAUDE.md` rule "avoid client-side JavaScript unless a feature needs it" to permit
  the `motion` runtime in `src/lib/anims/`; keep the no-framework, no-islands rule.
- Update the comment block in `global.css` and `reveal-once.ts` that describes reveals as
  CSS-only.

## Out of scope

- Migrating count-up, marquee and Ukraine map scripts onto the runtime (optional later).
- Rewriting every hardcoded `duration-*` class.
- Any React or island usage.
