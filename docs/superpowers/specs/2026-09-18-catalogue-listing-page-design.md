# Catalogue Listing Page Design

**Date:** 2026-09-18
**Status:** Approved
**Scope:** Category listing pages for equipment catalogue with TinaCMS integration

______________________________________________________________________

## Overview

Design and implement a fully static, SEO-optimized catalogue system for OS-Technology's equipment listings. The system will automatically discover categories and products from the TinaCMS content structure, generate bilingual pages, and follow the Industrial Precision design system strictly.

**Key Goals:**

- Zero JavaScript (fully Astro static rendering)
- Semantic HTML for maximum SEO benefit
- Responsive design (mobile-first, tablet, desktop)
- Auto-discovery of categories from folder structure
- Strict adherence to design system specifications

______________________________________________________________________

## 1. Content Collection Architecture

### Two Collections

#### Equipment Collection (Enhanced)

- **Location:** `src/content/equipment/[category]/[slug].md`
- **Schema additions:**
  - Add `industries` field: `z.array(z.string()).optional()`
- **Existing fields:** `en-title`, `ua-title`, `en-description`, `ua-description`, `gallery`, `datasheet`, `specs`, `en-body`, `ua-body`

#### Categories Collection (New)

- **Location:** `src/content/equipment/[category]/index.md`
- **Discovery pattern:** Glob pattern finds all `index.md` files in equipment subfolders
- **Schema:**
  ```typescript
  {
    "en-label": z.string(),
    "ua-label": z.string(),
    "en-description": z.string(),
    "ua-description": z.string(),
    "icon": z.string().optional(), // Material Symbol name
    "order": z.number().optional()  // For sidebar sorting
  }
  ```

### Relationship Model

- Products belong to categories via folder path: `checkweighers/hc-m.md` → category: `checkweighers`
- No explicit foreign keys needed
- Filtering: `equipment.filter(item => item.id.startsWith('checkweighers/'))`

______________________________________________________________________

## 2. Routing & Page Structure

### Routes

**Category Listing Page (NEW - Main Focus):**

- Path: `/[lang]/catalogue/[category]/index.astro`
- Example: `/en/catalogue/checkweighers`, `/ua/catalogue/checkweighers`
- Generates all combinations: `languages × categories`

**Product Detail Page (Existing - Keep as Placeholder):**

- Path: `/[lang]/catalogue/[category]/[slug].astro`
- Example: `/en/catalogue/checkweighers/hc-m`
- Current dark-theme implementation stays unchanged

**Catalogue Index (Future - Out of Scope):**

- Path: `/[lang]/catalogue/index.astro`
- Would show all categories overview

### Static Path Generation

```typescript
export async function getStaticPaths() {
  const allCategories = await getCollection('categories');
  const allEquipment = await getCollection('equipment');

  return allCategories.flatMap(category => {
    const categorySlug = category.id;

    // Filter products in this category (exclude index.md)
    const categoryProducts = allEquipment.filter(item => {
      const folder = item.id.split('/')[0];
      return folder === categorySlug && !item.id.endsWith('index.md');
    });

    return ['en', 'ua'].map(lang => ({
      params: { lang, category: categorySlug },
      props: {
        categoryData: category.data,
        categorySlug,
        products: categoryProducts,
        allCategories, // For sidebar
        lang
      }
    }));
  });
}
```

______________________________________________________________________

## 3. Component Structure & Layout

### Component Hierarchy

#### New Components

**1. CatalogueSidebar.astro**

- **Props:** `allCategories`, `currentCategory`, `lang`
- **Responsibilities:**
  - Render sorted list of category links
  - Show active state for current category
  - Display Material Icons for each category
  - "Request Full Specs" button at bottom
- **Behavior:**
  - Sticky positioning (`sticky top-24`)
  - Hidden on mobile/tablet (`hidden lg:flex`)
  - Sorted by `order` field (default 999 if not set)

**2. ProductCard.astro**

- **Props:** `product`, `lang`
- **Responsibilities:**
  - Display product image (first from gallery)
  - Show title, description, industry tags
  - Render 2-column specs grid (max 3 specs)
  - "Technical Details" CTA linking to detail page
- **Styling:**
  - Card hover effects (shadow, scale on image)
  - Aspect ratio 4:3 for images
  - Mix-blend-multiply for product images

**3. CategoryHeader.astro**

- **Props:** `categoryData`, `lang`
- **Responsibilities:**
  - Responsive title (display-lg on desktop, display-lg-mobile on mobile)
  - Category description paragraph
  - Mobile filter chips placeholder (hidden on desktop)

### Layout Structure

```
┌─────────────────────────────────────────────────┐
│  <header> Global Navigation (glassmorphic)      │
├──────────────┬──────────────────────────────────┤
│  <aside>     │  <main>                          │
│  Sidebar     │  ┌────────────────────────────┐  │
│  (sticky)    │  │ <header> CategoryHeader    │  │
│              │  ├────────────────────────────┤  │
│  Category    │  │ <section> Product Grid     │  │
│  Navigation  │  │  <article> ProductCard 1   │  │
│              │  │  <article> ProductCard 2   │  │
│              │  │  <article> ProductCard 3   │  │
│  [Button]    │  └────────────────────────────┘  │
└──────────────┴──────────────────────────────────┘
│  <footer> Global Footer                         │
└─────────────────────────────────────────────────┘
```

### Semantic HTML Structure

```html
<body>
  <header> <!-- Global navigation (Layout.astro or inline) -->

  <div class="flex max-w-container-max mx-auto"> <!-- Container -->
    <aside> <!-- Sidebar -->
      <nav> <!-- Category links -->
    </aside>

    <main> <!-- Category page content -->
      <header> <!-- CategoryHeader component -->
        <h1> <!-- Category title -->
        <p>  <!-- Category description -->
      </header>

      <section aria-label="Products"> <!-- Product grid -->
        <article> <!-- ProductCard 1 -->
        <article> <!-- ProductCard 2 -->
        ...
      </section>
    </main>
  </div>

  <footer> <!-- Global footer -->
</body>
```

### Grid System

- **Desktop (xl: 1024px+):** 3 columns
- **Tablet (md: 768px-1024px):** 2 columns
- **Mobile (\<768px):** 1 column
- **Gap:** `gap-6` (1.5rem)
- **Sidebar width:** `w-72` (288px fixed)
- **Max container:** `max-w-container-max` (1280px)

______________________________________________________________________

## 4. Styling & Design System Integration

### CSS Architecture

- **Framework:** Tailwind CSS exclusively
- **Config:** Design tokens already configured in `tailwind.config` (from design spec)
- **No custom CSS files needed**
- **Global styles:** Use existing `src/styles/global.css`

### Typography Scale

| Element            | Desktop Class                                              | Mobile Class                                    |
| ------------------ | ---------------------------------------------------------- | ----------------------------------------------- |
| Category title     | `font-display-lg text-display-lg`                          | `font-display-lg-mobile text-display-lg-mobile` |
| Product card title | `font-headline-lg text-headline-lg text-[20px]`            | Same                                            |
| Body text          | `font-body-md text-body-md`                                | Same                                            |
| Spec labels        | `font-label-caps text-label-caps uppercase tracking-wider` | Same                                            |
| Spec values        | `font-technical-data text-technical-data`                  | Same                                            |

### Color System

| Usage              | Class                                | Color          |
| ------------------ | ------------------------------------ | -------------- |
| Background base    | `bg-background`                      | #fdf8f8        |
| Card background    | `bg-surface-muted`                   | #F8FAFC        |
| Image container    | `bg-white`                           | #ffffff        |
| Primary text       | `text-primary`                       | #000000        |
| Secondary text     | `text-industrial-gray`               | #64748B        |
| Accent (CTAs only) | `text-secondary`, `border-secondary` | #C71978 (pink) |
| Borders            | `border-border-subtle`               | #E2E8F0        |

### Spacing System (8px baseline)

- Section padding: `py-8`
- Section bottom gap: `pb-section-gap-lg` (8rem)
- Card padding: `p-6`
- Grid gap: `gap-6`
- Container padding: `px-edge-margin` (2rem)
- Sidebar padding: `py-8 px-4`

### Component Patterns

#### Product Card

```astro
<article class="bg-surface-muted border border-border-subtle rounded-lg overflow-hidden flex flex-col group hover:shadow-sm transition-all duration-300">
  <!-- Image Container -->
  <div class="aspect-[4/3] bg-white p-6 flex items-center justify-center border-b border-border-subtle">
    <img class="object-contain w-full h-full mix-blend-multiply transition-transform duration-500 group-hover:scale-105" />
  </div>

  <!-- Content -->
  <div class="p-6 flex flex-col flex-1">
    <h3 class="font-headline-lg text-headline-lg text-primary mb-2 text-[20px]">Title</h3>
    <p class="font-body-md text-body-md text-industrial-gray text-sm mb-4 line-clamp-2">Description</p>

    <!-- Specs Grid -->
    <div class="grid grid-cols-2 gap-4 border-t border-border-subtle pt-4 mb-6">
      <div>
        <p class="text-[10px] text-industrial-gray uppercase tracking-wider mb-1">Label</p>
        <p class="font-technical-data text-technical-data">Value</p>
      </div>
    </div>

    <!-- CTA -->
    <a class="w-full bg-white border border-border-subtle text-primary py-2.5 rounded text-sm font-medium hover:bg-surface-container transition-colors flex items-center justify-center gap-2 group-hover:border-primary">
      Technical Details
      <span class="material-symbols-outlined text-[16px]">arrow_forward</span>
    </a>
  </div>
</article>
```

#### Sidebar Navigation Link

```astro
<a
  class={`flex items-center gap-3 py-3 px-4 rounded-lg transition-all cursor-pointer ${
    isActive
      ? 'bg-surface-bright text-secondary font-bold'
      : 'text-industrial-gray hover:bg-surface-container-high hover:translate-x-1'
  }`}
>
  <span class="material-symbols-outlined">{icon}</span>
  <span class="font-label-caps text-label-caps">{label}</span>
</a>
```

#### Buttons

**Primary CTA:**

```astro
<a class="bg-primary text-on-primary px-5 py-2.5 rounded font-medium hover:bg-on-surface-variant transition-colors text-sm">
  Contact Sales
</a>
```

**Secondary (Outline):**

```astro
<button class="w-full border border-secondary text-secondary px-4 py-2.5 rounded hover:bg-secondary/5 transition-colors font-medium text-sm flex items-center justify-center gap-2">
  <span class="material-symbols-outlined text-[18px]">download</span>
  Request Full Specs
</button>
```

### Responsive Breakpoints

- **Mobile (\<768px):**

  - Single column grid
  - Sidebar hidden
  - Show mobile filter chips

- **Tablet (768px-1024px):**

  - 2-column grid
  - Sidebar still hidden

- **Desktop (>1024px):**

  - 3-column grid
  - Sidebar visible (`lg:flex`)

### Glassmorphism

**Only used for top header (per design spec):**

```astro
<header class="bg-white/70 backdrop-blur-xl sticky top-0 z-50 border-b border-border-subtle/50">
```

**NOT used for cards, sidebar, or other elements.**

### Accessibility

- Semantic HTML5 elements
- Proper heading hierarchy (h1 → h2 → h3)
- `aria-label="Products"` on product grid
- Alt text on all images
- Focus states on interactive elements (`:focus-visible:ring-2 ring-primary`)
- Color contrast ratios meet WCAG AA standards

______________________________________________________________________

## 5. Data Flow & Content Integration

### Translation Strategy

**Use inline `_()` pattern per CLAUDE.md:**

```astro
---
import { getInlineTranslations, type Lang } from '@/i18n';

const { lang, categoryData, products } = Astro.props;
const _ = getInlineTranslations(lang);
---

<!-- Content from CMS uses lang-prefixed fields -->
<h1>{categoryData[`${lang}-label`]}</h1>

<!-- Static UI strings use _() -->
<button>{_("Request Full Specs")}</button>
<span>{_("Technical Details")}</span>
```

### Sidebar Category Generation

```astro
<!-- CatalogueSidebar.astro -->
{allCategories
  .sort((a, b) => (a.data.order || 999) - (b.data.order || 999))
  .map(cat => {
    const isActive = cat.id === currentCategory;
    const label = cat.data[`${lang}-label`];
    const icon = cat.data.icon || 'category';

    return (
      <a href={`/${lang}/catalogue/${cat.id}`} class={linkClasses}>
        <span class="material-symbols-outlined">{icon}</span>
        <span class="font-label-caps text-label-caps">{label}</span>
      </a>
    );
  })
}
```

### Product Card Data Binding

```astro
<!-- ProductCard.astro -->
---
interface Props {
  product: any;
  lang: 'en' | 'ua';
}

const { product, lang } = Astro.props;

// Extract multilingual fields
const title = product.data[`${lang}-title`];
const description = product.data[`${lang}-description`];
const specs = product.data.specs?.slice(0, 3) || []; // Max 3 specs
const firstImage = product.data.gallery?.[0] || '/placeholder.jpg';
const industries = product.data.industries || [];

// Build product URL
const categorySlug = product.id.split('/')[0];
const productSlug = product.id.split('/')[1].replace('.md', '');
const productUrl = `/${lang}/catalogue/${categorySlug}/${productSlug}`;
---

<article class="...">
  <div class="aspect-[4/3] bg-white p-6">
    <img src={firstImage} alt={title} class="..." />
  </div>

  <div class="p-6">
    <h3>{title}</h3>
    <p>{description}</p>

    <!-- Industry tags -->
    {industries.length > 0 && (
      <div class="flex flex-wrap gap-2 mb-6">
        {industries.map(industry => (
          <span class="px-2 py-1 bg-surface-container text-industrial-gray text-xs rounded">
            {industry}
          </span>
        ))}
      </div>
    )}

    <!-- Specs grid -->
    <div class="grid grid-cols-2 gap-4 border-t border-border-subtle pt-4 mb-6">
      {specs.map(spec => (
        <div>
          <p class="text-[10px] text-industrial-gray uppercase tracking-wider mb-1">
            {spec[`${lang}-label`]}
          </p>
          <p class="font-technical-data text-technical-data">{spec.value}</p>
        </div>
      ))}
    </div>

    <a href={productUrl} class="...">
      {_("Technical Details")}
      <span class="material-symbols-outlined">arrow_forward</span>
    </a>
  </div>
</article>
```

### Static Strings for Translation

**Add to `locales/*.po` files:**

- "Request Full Specs"
- "Technical Details"
- "Catalogue Filters"
- "Equipment Categories"
- "Products"

______________________________________________________________________

## 6. File Structure & Implementation Plan

### Files to Create

```
src/
├── pages/
│   └── [lang]/
│       └── catalogue/
│           └── [category]/
│               └── index.astro              # NEW - Category listing page
│
├── components/
│   └── catalogue/
│       ├── CatalogueSidebar.astro          # NEW - Sidebar navigation
│       ├── ProductCard.astro                # NEW - Product card
│       └── CategoryHeader.astro             # NEW - Category header
```

### Files to Modify

1. **`src/content.config.ts`**

   - Add `categories` collection with schema
   - Add `industries` field to `equipment` collection schema

1. **`src/content/equipment/checkweighers/index.md`**

   - Standardize fields to kebab-case:
     - `labelEn` → `en-label`
     - `labelUa` → `ua-label`
     - `desriptionEn` → `en-description` (fix typo)
     - `descriptionUa` → `ua-description`
   - Add optional `icon: "scale"` and `order: 1`

1. **`locales/messages.pot` and `locales/*.po`** (via i18n workflow)

   - Add static UI strings for extraction

1. **`src/layouts/Layout.astro`** (verify only)

   - Check if header/footer are included
   - Ensure supports catalogue page structure

### Files NOT in Scope

- `src/pages/[lang]/catalogue/[category]/[slug].astro` — Keep existing product detail placeholder
- Homepage components — No changes
- Existing Header/Footer components — Use as-is

______________________________________________________________________

## 7. Implementation Checklist

### Phase 1: Content Schema

- [ ] Update `content.config.ts` with categories collection
- [ ] Add `industries` field to equipment schema
- [ ] Standardize `checkweighers/index.md` fields
- [ ] Run `pnpm run check:fix` to validate

### Phase 2: Components

- [ ] Create `CatalogueSidebar.astro`
- [ ] Create `ProductCard.astro`
- [ ] Create `CategoryHeader.astro`
- [ ] Test components in isolation

### Phase 3: Category Page

- [ ] Create `[category]/index.astro` with `getStaticPaths()`
- [ ] Integrate all components
- [ ] Wire up data flow (props passing)
- [ ] Test responsive layout

### Phase 4: Translations

- [ ] Add static strings with `_()` calls
- [ ] Run `pnpm run i18n:extract`
- [ ] Add Ukrainian translations to `locales/ua.po`
- [ ] Run `pnpm run i18n:compile`

### Phase 5: Polish & Validation

- [ ] Test both `/en/catalogue/checkweighers` and `/ua/catalogue/checkweighers`
- [ ] Verify semantic HTML structure
- [ ] Check responsive breakpoints (mobile, tablet, desktop)
- [ ] Validate accessibility (focus states, aria labels)
- [ ] Run lighthouse audit (should be 100 for SEO/Accessibility)
- [ ] Run `pnpm run check:fix` before commit

______________________________________________________________________

## 8. Success Criteria

**This implementation is complete when:**

1. ✅ `/en/catalogue/checkweighers` and `/ua/catalogue/checkweighers` render correctly
1. ✅ All products in category display as styled cards
1. ✅ Sidebar shows all categories with active state highlighting
1. ✅ Fully responsive on mobile/tablet/desktop
1. ✅ Semantic HTML structure for SEO
1. ✅ Zero JavaScript shipped (100% static)
1. ✅ Both language versions work correctly
1. ✅ Product cards link to existing detail pages
1. ✅ Design matches specification (colors, typography, spacing)
1. ✅ Lighthouse scores: 100 for SEO and Accessibility

______________________________________________________________________

## 9. Future Enhancements (Out of Scope)

**Phase 2:**

- Client-side filtering by industry tags
- Search functionality (header + category page)
- Sort options (price, speed, alphabetical)

**Phase 3:**

- Product detail page redesign (currently placeholder)
- Catalogue index page (`/[lang]/catalogue`)
- Category filtering in sidebar

**Phase 4:**

- Product comparison feature
- "Request Quote" form integration
- Related products recommendations

______________________________________________________________________

## 10. Design System Compliance

This implementation strictly follows the design specifications from `docs/design/catalogue/DESIGN.md`:

- **Brand Personality:** Technical, authoritative, sophisticated
- **Visual Style:** Corporate Modern + Glassmorphism (header only)
- **Philosophy:** "White Space First" - massive margins, breathing room
- **Color Discipline:** Black primary, pink accent (CTAs only), teal (future data viz)
- **Typography:** IBM Plex Sans (headings), Inter (body), JetBrains Mono (technical)
- **Layout:** 12-column grid, 8rem section gaps, 8px baseline spacing
- **Elevation:** Tonal layering (not heavy shadows)
- **Shapes:** 0.5rem radius (8px), no pill shapes
- **Components:** High-contrast buttons, zebra tables, technical badges

**No deviations from the spec are permitted without explicit approval.**

______________________________________________________________________

## Appendix A: Example Category Index Content

**`src/content/equipment/checkweighers/index.md`** (standardized):

```yaml
---
en-label: Checkweighers
ua-label: Чеквейєри
en-description: High-precision dynamic weighing systems for industrial applications, ensuring 100% weight control and compliance.
ua-description: Високоточні динамічні системи зважування для промислових застосувань, що забезпечують 100% контроль ваги та відповідність нормам.
icon: scale
order: 1
---
```

______________________________________________________________________

## Appendix B: Key Design Tokens Reference

```javascript
// From tailwind.config (already configured)
colors: {
  primary: '#000000',
  secondary: '#b8006d', // Pink accent
  'industrial-gray': '#64748B',
  'surface-muted': '#F8FAFC',
  'border-subtle': '#E2E8F0',
  background: '#fdf8f8',
}

spacing: {
  'section-gap-lg': '8rem',
  'edge-margin': '2rem',
  'gutter': '1.5rem',
}

borderRadius: {
  DEFAULT: '0.25rem',
  lg: '0.5rem',
}
```

______________________________________________________________________

**End of Design Document**
