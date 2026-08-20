# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is the frontend application for OS-Technology Ukraine, a B2B industrial equipment website. The project is built with **Astro 6**, **React 19**, **shadcn/ui**, and features a bilingual (English/Ukrainian) architecture optimized for SEO and LLM indexing.

**Key Requirements:**

- Single-page architecture with language paths (`/en`, `/ua`)
- Best-in-class SEO and LLM indexing capabilities
- Maximum loading speed performance
- Design integration with Stitch design system
- Strict code quality with Biome linting

## Essential Commands

```bash
# Development
npm run dev              # Start dev server at localhost:4321

# Building
npm run build            # Build production site to ./dist/
npm run preview          # Preview production build

# Code Quality (ALWAYS RUN BEFORE COMMITS)
npm run check:fix        # Fix all linting, formatting issues
npm run ci:fix           # Alias for check:fix - formats, lints, and fixes
npm run ci               # CI check - validates without fixing

# Individual operations
npm run lint:fix         # Fix linting issues only
npm run format:fix       # Fix formatting issues only
```

## Architecture & Key Patterns

### i18n Structure (Critical)

The site uses a **single dynamic page** with `getStaticPaths()` to generate both language versions at build time:

```
/en/           → English homepage
/ua/           → Ukrainian homepage (default locale)
```

**Implementation:**

- Dynamic route: `src/pages/[lang]/index.astro`
- Uses `getStaticPaths()` to generate both `/en` and `/ua` paths
- Single source of truth for content and layout
- Language-specific content handled inline with conditionals or via `getTranslations()`

**Core i18n files:**

- `src/i18n/ui.ts` - All translation strings as const objects
- `src/i18n/utils.ts` - Helper functions: `getLangFromUrl()`, `getTranslations()`
- `astro.config.mjs` - Language routing config (prefixDefaultLocale: true)
- `src/pages/[lang]/index.astro` - Dynamic page template for all languages

**Usage pattern:**

```astro
---
import { getTranslations } from '@/i18n';
import { languages } from '@/i18n/ui';

export function getStaticPaths() {
  return Object.keys(languages).map((lang) => ({
    params: { lang },
  }));
}

const { lang } = Astro.params;
const t = getTranslations(lang as "en" | "ua");
---
<h1>{t('site.title')}</h1>
<!-- Or inline conditionals for non-i18n content -->
<p>{lang === "ua" ? "Текст українською" : "English text"}</p>
```

### Component Strategy

**Two component types coexist:**

1. **Astro Components** (`.astro`) - Static, SSR content

   - Layouts, pages, static sections
   - No client-side JavaScript by default

1. **React Components** (`.tsx`) - Interactive elements

   - shadcn/ui components (Button, DropdownMenu, etc.)
   - Header navigation, forms, interactive widgets
   - **Must add `client:load` directive** in Astro files:
     ```astro
     <Header client:load {...props} />
     ```

### shadcn/ui Integration

Components are installed via CLI and live in `src/components/ui/`:

```bash
npx shadcn@latest add button dropdown-menu
```

**Configuration:** `components.json`

- Style: `radix-lyra`
- Icon Library: `lucide-react`
- Path aliases: `@/components/ui`

**Not all pages use shadcn** - verify existing page patterns before applying shadcn components globally, if needed variants of the shadcn component wasn't found - add your own to match styles.

### Design System

**Fonts:**

- Headings: `IBM Plex Sans Variable` (--font-heading)
- Body: `Inter Variable` (--font-sans)
- Code/Labels: `JetBrains Mono`

**Colors:** CSS custom properties in `src/styles/global.css`

- Uses `oklch()` color space for consistency
- Light/dark mode via `.dark` class
- Primary, secondary, muted, accent variants

**Spacing:** Tailwind 4.x with custom tokens

- Uses `@theme inline` directive
- Custom properties like `--radius`, `--color-*`

### Stitch Integration

Stitch is used for design creation:

- Design exports should be reviewed for shadcn compatibility
- Not all Stitch designs will directly map to shadcn components
- Check existing implementations before blindly applying new designs

## Code Quality Rules (Biome)

**Critical settings from `biome.json`:**

- **Formatting:** Tabs (width: 2), 100-char line width, double quotes
- **Unused imports/variables:** OFF for Astro files (frontmatter quirk)
- **TypeScript:** `noExplicitAny` is a WARNING (not error)
- **CSS:** Tailwind directives enabled in parser

**Before every commit:**

```bash
npm run check:fix
```

This runs format + lint + organize imports in one command.

## SEO & Performance Considerations

**For optimal SEO:**

- Use semantic HTML5 elements
- Add `<title>` and `<meta name="description">` in Layout.astro
- Each language route should have unique, translated metadata
- Static generation (default) is preferred for indexability

**For optimal speed:**

- Lazy-load React components with `client:load` or `client:idle`
- Optimize images (use Astro's `<Image>` component)
- Minimize JavaScript bundles (check what gets `client:*` directive)

**For LLM indexing:**

- Structured data is key (add JSON-LD where appropriate)
- Clear, semantic headings hierarchy
- Descriptive link text (avoid "click here")

## Common Workflows

### Adding a New Translation

1. Edit `src/i18n/ui.ts`:

   ```typescript
   export const ui = {
     en: { 'new.key': 'English text' },
     ua: { 'new.key': 'Український текст' },
   } as const;
   ```

1. Use in component:

   ```astro
   const t = getTranslations(lang);
   <p>{t('new.key')}</p>
   ```

### Creating a New Bilingual Page

1. Create `src/pages/[lang]/page-name.astro`
1. Add `getStaticPaths()` function to generate all language versions:
   ```astro
   export function getStaticPaths() {
     return Object.keys(languages).map((lang) => ({
       params: { lang },
     }));
   }
   ```
1. Use `Layout.astro` wrapper
1. Access language from params: `const { lang } = Astro.params`
1. Use `getTranslations(lang as "en" | "ua")` or inline conditionals for content

### Adding a shadcn Component

1. Install: `npx shadcn@latest add component-name`
1. Import in React component: `import { Button } from "@/components/ui/button"`
1. Use in Astro with `client:load`: `<MyReactComponent client:load />`

### Working with Stitch Designs

1. Review design system alignment with existing shadcn theme
1. Check if existing components can be reused
1. If creating custom components, maintain accessibility standards
1. Verify design works in both languages (text expansion)

## Path Aliases

```typescript
@/* → ./src/*
@/components → ./src/components
@/lib → ./src/lib
@/i18n → ./src/i18n
```

Configured in `tsconfig.json` and `components.json`.

## Critical Files

- `astro.config.mjs` - Routing, integrations, i18n config
- `src/i18n/ui.ts` - ALL translation strings
- `src/layouts/Layout.astro` - Base HTML wrapper
- `src/components/Header.tsx` - Main navigation component
- `src/styles/global.css` - Design tokens, Tailwind config
- `biome.json` - Linting and formatting rules
- `components.json` - shadcn/ui configuration

## TypeScript Configuration

- JSX: `react-jsx` (React 19 automatic runtime)
- Strict mode enabled
- Path aliases via `baseUrl` and `paths`

## Deployment Notes

- Build output: `./dist/`
- All routes are pre-rendered (SSG) by default
- No server-side runtime required
- Serve `dist/` as static files

## Design System Constraints

**Industrial Precision Brand:**

- Corporate Modern + Glassmorphism aesthetic
- Minimalist, "White Space First" philosophy
- Reserved pink accent (#C71978) for CTAs
- Technical teal (#0D9488) for data viz
- Deep neutral black (#171717) for structure

Match this aesthetic when creating new components or pages.
