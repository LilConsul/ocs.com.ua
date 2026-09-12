# Equipment Catalogue CMS Design

**Date:** 2026-09-12
**Status:** Approved
**Approach:** Astro Content Collections + TinaCMS Local Editor

## Overview

This document describes the implementation of an equipment catalogue system for OS-Technology Ukraine's website. The catalogue will be managed through TinaCMS in git-based (self-hosted) mode, with content stored as markdown files in the repository.

## Content Structure & Requirements

### Categories

The catalogue includes the following equipment categories:

- **Catchweigher** - for logistic warehouses only (max speed | display value) - Note: Combi checker
- **Checkweigher** - other industries (max speed | display value)
- **Track & Trace** - serialization (2d code, 2d+weighing, 2d+weighing+tamper evidence) + aggregation (semi-auto, integrations kit for case packer)
- **Metal Detectors** - Types (conveyor types, gravity fall, pipeline, meatline)
- **X-Ray** - Belt width, weight category (float), type of product (bulk flow, standing)
- **Miscellaneous** - Software, Test pieces

### Equipment Requirements

Each equipment piece includes:

- **Card display** (catalogue listing):

  - Title
  - Short description
  - Hero image
  - 2-3 technical specifications (max 3, vary by category)

- **Detail page**:

  - Hero image
  - Full description
  - Photo gallery (multiple images)
  - Detailed technical documentation (markdown)
  - Downloadable PDF datasheet (form-gated - to be implemented later)
  - Recommended products section (future enhancement)

### Bilingual Support

All content exists in two languages:

- English (en)
- Ukrainian (ua)

Separate content files per language with shared assets.

## Architecture Decision: Approach 1

**Selected Approach:** Astro Content Collections + TinaCMS as Editor

### Rationale

- **Simpler architecture** - Leverages Astro's native content system
- **Better performance** - No additional build layers, pure static generation
- **Less vendor lock-in** - Content system independent of CMS choice
- **Team familiarity** - Aligns with existing Astro patterns in the codebase
- **Optimized build** - Single build step (`astro build`), no TinaCMS compilation needed

### Trade-offs

- **Schema duplication** - Must define schema in both Astro (validation) and TinaCMS (editing UI)
  - Acceptable because: both are version-controlled, serve different purposes, drift is visible in code review
- **Custom category auto-discovery** - Requires helper functions in Astro
  - Acceptable because: implementation is straightforward, ~50 lines of code

## File Structure

```
src/content/
  config.ts                      # Astro Content Collections schema

  categories/
    checkweighers.en.md
    checkweighers.ua.md
    xray.en.md
    xray.ua.md
    metal-detectors.en.md
    metal-detectors.ua.md
    track-and-trace.en.md
    track-and-trace.ua.md
    miscellaneous.en.md
    miscellaneous.ua.md

  equipment/
    checkweighers/
      hc-m/
        index.en.md              # English content
        index.ua.md              # Ukrainian content
        hero.jpg                 # Shared assets
        gallery-1.jpg
        gallery-2.jpg
        datasheet.pdf
      hc-a/
        index.en.md
        index.ua.md
        hero.jpg
        ...
      hc-wd/
        index.en.md
        index.ua.md
        ...
    xray/
      xr-3000/
        index.en.md
        index.ua.md
        ...
    metal-detectors/
      ...
    track-and-trace/
      ...
    miscellaneous/
      ...
```

### Key Design Decisions

1. **Category inferred from folder path** - No `category` field in frontmatter, derived from parent directory
1. **Colocated assets** (Option A) - All images and PDFs live alongside content for portability
1. **Separate language files** (Option A) - `index.en.md` and `index.ua.md` give full control per language
1. **Flexible specs** (Option A) - Free-form key-value pairs for technical specifications

## Content Collections Schema

### Categories Collection

**File:** `src/content/config.ts`

```typescript
const categoriesCollection = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string(),
    icon: z.string().optional(), // lucide icon name
    order: z.number().default(0), // for sorting in nav
    notes: z.string().optional(), // e.g., "for logistic warehouses only"
  }),
});
```

**Fields:**

- `title` - Display name (e.g., "Checkweighers")
- `description` - Short description for category page
- `icon` - Lucide icon name (e.g., "scale", "scan")
- `order` - Numeric sort order for sidebar navigation
- `notes` - Internal notes about category requirements

### Equipment Collection

```typescript
const equipmentCollection = defineCollection({
  type: 'content',
  schema: ({ image }) => z.object({
    title: z.string(),
    slug: z.string(),
    description: z.string(), // Short description for card
    heroImage: image(), // Astro's image type
    gallery: z.array(image()).max(10).default([]),
    datasheet: z.string().optional(), // Path to PDF
    specs: z.array(
      z.object({
        label: z.string(),
        value: z.string(),
      })
    ).max(3), // Maximum 3 specs for card display
  }),
});
```

**Fields:**

- `title` - Equipment name (e.g., "HC-M Checkweigher")
- `slug` - URL slug (e.g., "hc-m-checkweigher")
- `description` - Short description for catalogue card
- `heroImage` - Main product image (Astro optimized)
- `gallery` - Array of additional images (max 10)
- `datasheet` - Path to PDF technical datasheet
- `specs` - Array of label/value pairs (max 3 for card display)
- Body content (markdown) - Detailed technical documentation

**Note:** Category is NOT in frontmatter - derived from file path.

## Helper Functions

### Category Auto-Discovery

**File:** `src/lib/catalogue.ts`

```typescript
import { getCollection, getEntry } from 'astro:content';
import type { Lang } from '@/i18n';

// Extract category from equipment entry ID
// e.g., "checkweighers/hc-m/index.en.md" → "checkweighers"
export function getCategoryFromEquipment(equipmentId: string): string {
  return equipmentId.split('/')[0];
}

// Get all unique categories by scanning equipment folders
export async function getAllCategories(lang: Lang) {
  const equipment = await getCollection('equipment', (entry) => {
    return entry.id.endsWith(`index.${lang}.md`);
  });

  const categoryIds = new Set(
    equipment.map(e => getCategoryFromEquipment(e.id))
  );

  // Get category metadata for each discovered category
  const categories = await Promise.all(
    Array.from(categoryIds).map(async (catId) => {
      try {
        const meta = await getEntry('categories', `${catId}.${lang}`);
        return {
          id: catId,
          ...meta.data,
        };
      } catch {
        // Fallback if category metadata doesn't exist
        return {
          id: catId,
          title: catId.charAt(0).toUpperCase() + catId.slice(1),
          description: '',
          order: 999,
        };
      }
    })
  );

  return categories.sort((a, b) => a.order - b.order);
}

// Get equipment by category
export async function getEquipmentByCategory(
  categoryId: string,
  lang: Lang
) {
  const equipment = await getCollection('equipment', (entry) => {
    const cat = getCategoryFromEquipment(entry.id);
    return cat === categoryId && entry.id.endsWith(`index.${lang}.md`);
  });

  return equipment;
}
```

**Features:**

- Auto-discovers categories by scanning equipment folders
- Provides fallback if category metadata missing
- Filters by language
- Sorts categories by order field

## Routing Structure

### Pages

```
src/pages/[lang]/catalogue/
  index.astro                    # Main catalogue page (all categories)
  [category]/
    index.astro                  # Category listing page
    [slug].astro                 # Equipment detail page
```

### Category Listing Page

**File:** `src/pages/[lang]/catalogue/[category]/index.astro`

**Responsibilities:**

- Display category metadata (title, description)
- Grid of equipment cards
- Each card shows: hero image, title, description, specs (max 3)
- Link to equipment detail page

**Static path generation:**

```typescript
export async function getStaticPaths() {
  const paths = [];

  for (const lang of ['en', 'ua'] as Lang[]) {
    const categories = await getAllCategories(lang);

    for (const category of categories) {
      paths.push({
        params: { lang, category: category.id },
        props: { category, lang },
      });
    }
  }

  return paths;
}
```

### Equipment Detail Page

**File:** `src/pages/[lang]/catalogue/[category]/[slug].astro`

**Responsibilities:**

- Breadcrumb navigation
- Hero image + product info
- Key specifications display
- Photo gallery grid
- Detailed technical documentation (rendered markdown)
- Datasheet download button (form gate future enhancement)
- Recommended products section (future enhancement)

**Static path generation:**

```typescript
export async function getStaticPaths() {
  const paths = [];

  for (const lang of ['en', 'ua'] as Lang[]) {
    const equipment = await getCollection('equipment', (entry) => {
      return entry.id.endsWith(`index.${lang}.md`);
    });

    for (const item of equipment) {
      const category = getCategoryFromEquipment(item.id);

      paths.push({
        params: { lang, category, slug: item.data.slug },
        props: { item, lang, category },
      });
    }
  }

  return paths;
}
```

## TinaCMS Configuration

### Installation

```bash
npm install tinacms @tinacms/cli
```

### Scripts

Add to `package.json`:

```json
{
  "scripts": {
    "dev": "tinacms dev -c \"astro dev\"",
    "build": "astro build",
    "tina:init": "tinacms init"
  }
}
```

### Configuration File

**File:** `tina/config.ts`

```typescript
import { defineConfig } from 'tinacms';

export default defineConfig({
  branch: process.env.TINA_BRANCH || 'main',
  clientId: process.env.TINA_CLIENT_ID || '',
  token: process.env.TINA_TOKEN || '',

  build: {
    outputFolder: 'admin',
    publicFolder: 'public',
  },

  media: {
    tina: {
      mediaRoot: 'src/content/equipment',
      publicFolder: 'src',
    },
  },

  schema: {
    collections: [
      // Categories collection
      {
        name: 'categories',
        label: 'Categories',
        path: 'src/content/categories',
        format: 'md',
        fields: [
          {
            type: 'string',
            name: 'title',
            label: 'Title',
            required: true,
          },
          {
            type: 'string',
            name: 'description',
            label: 'Description',
            required: true,
            ui: { component: 'textarea' },
          },
          {
            type: 'string',
            name: 'icon',
            label: 'Icon (Lucide name)',
            description: 'e.g., "scale", "scan", "shield"',
          },
          {
            type: 'number',
            name: 'order',
            label: 'Display Order',
            required: true,
          },
          {
            type: 'string',
            name: 'notes',
            label: 'Internal Notes',
            ui: { component: 'textarea' },
          },
        ],
        ui: {
          filename: {
            readonly: false,
            slugify: (values) => {
              const slug = values.title
                ?.toLowerCase()
                .replace(/\s+/g, '-')
                .replace(/[^a-z0-9-]/g, '');
              const lang = values._language || 'en';
              return `${slug}.${lang}`;
            },
          },
        },
      },

      // Equipment collection
      {
        name: 'equipment',
        label: 'Equipment',
        path: 'src/content/equipment',
        format: 'md',

        ui: {
          allowedActions: {
            create: true,
            delete: true,
          },
          filename: {
            readonly: false,
            slugify: () => 'index',
          },
          router: ({ document }) => {
            const parts = document._sys.filename.split('/');
            if (parts.length >= 3) {
              const category = parts[0];
              const equipmentFolder = parts[1];
              const lang = document._sys.filename.match(/\.(en|ua)\.md$/)?.[1] || 'en';
              return `/admin/collections/equipment/${category}/${equipmentFolder}/${lang}`;
            }
            return undefined;
          },
        },

        fields: [
          {
            type: 'string',
            name: 'title',
            label: 'Title',
            required: true,
          },
          {
            type: 'string',
            name: 'slug',
            label: 'URL Slug',
            required: true,
            description: 'Used in the URL (e.g., "hc-m-checkweigher")',
          },
          {
            type: 'string',
            name: 'description',
            label: 'Short Description',
            required: true,
            ui: { component: 'textarea' },
            description: 'Displayed on catalogue card (keep concise)',
          },
          {
            type: 'image',
            name: 'heroImage',
            label: 'Hero Image',
            required: true,
            description: 'Main product image',
          },
          {
            type: 'image',
            name: 'gallery',
            label: 'Gallery Images',
            list: true,
            description: 'Additional product photos (max 10)',
          },
          {
            type: 'string',
            name: 'datasheet',
            label: 'Datasheet PDF',
            description: 'Path to technical datasheet PDF',
          },
          {
            type: 'object',
            name: 'specs',
            label: 'Specifications',
            list: true,
            max: 3,
            ui: {
              itemProps: (item) => ({
                label: item?.label || 'New Spec',
              }),
            },
            fields: [
              {
                type: 'string',
                name: 'label',
                label: 'Label',
                required: true,
                description: 'e.g., "Max Speed", "Display value"',
              },
              {
                type: 'string',
                name: 'value',
                label: 'Value',
                required: true,
                description: 'e.g., "250 pcs/min", "0.1g"',
              },
            ],
          },
          {
            type: 'rich-text',
            name: 'body',
            label: 'Technical Documentation',
            isBody: true,
            description: 'Detailed technical information (supports markdown)',
          },
        ],
      },
    ],
  },
});
```

### Environment Variables

**File:** `.env.local` (git-ignored)

For local/self-hosted mode:

```
TINA_CLIENT_ID=local
TINA_TOKEN=local
TINA_BRANCH=main
```

### Key TinaCMS Features

- Media uploads colocated in equipment folders
- Categories and equipment as separate collections
- Specs limited to max 3 items with validation
- Rich text editor for technical documentation
- Image uploads handled inline
- Custom filename handling for `index.[lang].md` pattern

## Components

### Catalogue Sidebar Navigation

**File:** `src/components/CatalogueSidebar.astro`

**Responsibilities:**

- Display all categories with icons
- Highlight current category
- "Request Full Specs" CTA button
- Fully translated

**Implementation notes:**

- Uses `getAllCategories()` helper
- Icon mapping with fallback
- Active state styling
- Integration with existing design system

## Data Flow

### Content Creation Flow

```
Editor uses TinaCMS UI (/admin)
  ↓
TinaCMS writes to markdown files (src/content/)
  ↓
Git commit & push
  ↓
Astro build reads Content Collections
  ↓
Static pages generated (dist/)
```

### Page Rendering Flow

```
User visits /en/catalogue/checkweighers
  ↓
Astro's getStaticPaths() runs at build time
  ↓
getAllCategories() scans equipment folders
  ↓
getEquipmentByCategory() filters by category & language
  ↓
Page renders with equipment cards
```

## Development Workflow

### Local Development

```bash
npm run dev
```

This starts:

1. TinaCMS dev server (wraps Astro)
1. Astro dev server at `localhost:4321`
1. TinaCMS admin at `localhost:4321/admin/index.html`

### Editing Content

1. Navigate to `/admin/index.html`
1. Select "Equipment" or "Categories" collection
1. Edit visually with TinaCMS UI
1. Changes save directly to markdown files
1. Commit changes to git

### Production Build

```bash
npm run build
```

- No TinaCMS build step needed
- Astro builds static pages from content
- Deploy `dist/` folder

## Future Enhancements

### Datasheet Form Gate

**Current:** Direct download link to PDF
**Future:** Modal with form capture before download

**Implementation notes:**

- Client-side modal component
- Form validation
- Integration with analytics/CRM
- Store form submissions

### Recommended Products

**Current:** Placeholder section
**Future:** Related products display

**Implementation options:**

- Manual selection in frontmatter (array of product slugs)
- Automatic based on category
- ML-based recommendations

**Data model:**

```yaml
recommended:
  - slug: "hc-a-checkweigher"
  - slug: "metal-detector-conveyor"
```

## Integration with Existing System

### i18n Integration

The catalogue uses the existing inline translation system:

- Component UI strings use `_("Text")` pattern
- Content strings are in separate language files
- Translation workflow via existing `npm run i18n:*` scripts

### Design System

All components follow the Industrial Precision design system:

- IBM Plex Sans for headings
- Inter for body text
- JetBrains Mono for technical specs
- Existing color tokens and spacing
- shadcn/ui components where applicable

### Build Process

No changes to existing build process:

- Same `npm run check:fix` before commits
- Biome linting applies to all files
- Standard Astro build pipeline

## Schema Evolution

### Adding New Categories

1. Create folder in `src/content/equipment/new-category/`
1. Add equipment files in that folder
1. Optionally create `src/content/categories/new-category.en.md` and `new-category.ua.md`
1. Category auto-discovered on next build

### Adding New Fields to Equipment

1. Update Astro schema in `src/content/config.ts`
1. Update TinaCMS schema in `tina/config.ts`
1. Update component templates to display new field
1. Existing content without field uses default/optional behavior

### Migration Strategy

For breaking schema changes:

1. Add new field as optional
1. Backfill existing content via script or manual edit
1. Make required once all content updated
1. Update templates to expect new field

## Performance Considerations

### Image Optimization

- All images processed through Astro's image optimization
- Hero images: ~800x600px target
- Gallery images: ~400x400px target
- Format: WebP with JPEG fallback
- Lazy loading on gallery images

### Build Time

Estimated build time per language:

- ~50 equipment items: 2-3 seconds per language
- ~200 equipment items: 8-12 seconds per language

Optimization strategies:

- Use Astro's experimental optimizations
- Consider on-demand image optimization for large catalogues
- Cache equipment queries during build

### Bundle Size

TinaCMS admin interface:

- Only loads on `/admin` route
- Not included in public-facing pages
- No impact on end-user bundle size

## Security Considerations

### Content Security

- All content version-controlled in git
- TinaCMS local mode: no external API calls
- Content changes require git commit access
- No user-uploaded content on public site (admin-only)

### PDF Downloads

Current implementation: direct download
Future: form-gated access

**Considerations for gated downloads:**

- Rate limiting
- CAPTCHA for form submission
- Sanitize user input
- Store form data securely
- GDPR compliance for data collection

## Testing Strategy

### Content Validation

- Astro Content Collections provides runtime validation
- TinaCMS UI prevents invalid input
- Pre-commit hooks run Biome checks

### Visual Testing

- Test category pages with 0, 1, and many equipment items
- Test equipment detail with/without gallery
- Test equipment detail with/without datasheet
- Test all language versions

### Edge Cases

- Category with no equipment (should show empty state)
- Category without metadata (should use fallback)
- Equipment with 0, 1, 2, and 3 specs
- Equipment with no gallery images
- Very long equipment titles/descriptions

## Success Metrics

### Content Management

- Time to add new equipment piece: \< 5 minutes
- Time to add new category: \< 2 minutes
- Number of validation errors during editing: minimal

### Performance

- Page load time (category listing): \< 2s on 3G
- Page load time (equipment detail): \< 2.5s on 3G
- Build time: \< 30s for full catalogue (both languages)

### SEO

- All pages have unique titles/descriptions
- Structured data for products (future enhancement)
- Clean URL structure (`/en/catalogue/checkweighers/hc-m`)

## Appendix: Example Content Files

### Example Category File

**File:** `src/content/categories/checkweighers.en.md`

```markdown
---
title: Checkweighers
description: High-precision dynamic weighing systems for industrial applications, ensuring 100% weight control and compliance.
icon: scale
order: 1
notes: For general industries. For logistics warehouses only, see Catchweighers.
---
```

### Example Equipment File

**File:** `src/content/equipment/checkweighers/hc-m/index.en.md`

```markdown
---
title: HC-M Checkweigher
slug: hc-m-checkweigher
description: The standard for dynamic weighing, offering high precision and reliability for mid-range applications.
heroImage: ./hero.jpg
gallery:
  - ./gallery-1.jpg
  - ./gallery-2.jpg
  - ./gallery-3.jpg
datasheet: ./datasheet.pdf
specs:
  - label: Max Speed
    value: 250 pcs/min
  - label: Display value
    value: 0.1g
---

## Technical Overview

The HC-M Checkweigher represents the industry standard for dynamic weighing applications...

## Key Features

- EMFR (Electro Magnetic Force Restoration) technology
- Stainless steel construction (IP54 rated)
- Integrated rejection system
- Real-time statistical process control

## Specifications

### Weighing Performance
- Weighing range: 0-3000g
- Accuracy: ±0.1g
- Belt speed: up to 60 m/min

### Physical Dimensions
- Belt width: 300mm
- Belt length: 600mm
- Overall dimensions: 1200 x 800 x 1400mm

## Applications

Ideal for pharmaceutical, food, and cosmetics industries where precise weight control is critical.
```

## Conclusion

This design provides a robust, maintainable, and performant catalogue system that leverages Astro's strengths while providing an excellent editing experience through TinaCMS. The architecture is simple enough for quick iteration but extensible for future enhancements.
