# TinaCMS Multilingual Catalogue - Final Decision

**Date:** 2026-09-12
**Status:** ✅ Approved for Implementation

______________________________________________________________________

## Selected Approach

**Option 4 (Modified) + Option A File Structure**

### File Structure

```
src/content/equipment/
  checkweighers/
    hc-m.md                          ← Content file (both languages)
    hc-a.md
    hc-wd.md

public/assets/                       ← All media files (TinaCMS managed)
  equipment/
    checkweighers/
      hc-m/
        hero.jpg
        gallery-1.jpg
        datasheet.pdf
      hc-a/
        hero.jpg
  partners/                          ← Partner logos
    logo-1.png
  logos/                             ← Company logos
    company-logo.svg
```

### Content File Structure

```yaml
---
# Multilingual fields (nested objects)
title:
  en: HC-M Checkweigher
  ua: Чекові ваги HC-M

description:
  en: The standard for dynamic weighing, offering high precision...
  ua: Стандарт динамічного зважування, що забезпечує високу точність...

specs:
  - label:
      en: Max Speed
      ua: Макс. швидкість
    value: 250 pcs/min
  - label:
      en: Display Value
      ua: Відображуване значення
    value: 0.1g
  - label:
      en: Belt Width
      ua: Ширина стрічки
    value: 300mm

# Shared fields (language-independent)
heroImage: ./_assets/hc-m/hero.jpg
gallery:
  - ./_assets/hc-m/gallery-1.jpg
  - ./_assets/hc-m/gallery-2.jpg
datasheet: ./_assets/hc-m/datasheet.pdf
---

[bodyEn - English rich text content]
[bodyUa - Ukrainian rich text content]
```

______________________________________________________________________

## Key Decisions

### 1. ✅ One File Per Equipment (Both Languages)

**Pros:**

- Both languages visible side-by-side
- Can't forget to create translations
- Guaranteed consistency
- Single source of truth
- Simpler content management

### 2. ✅ Equipment Name as Filename (Not `index.md`)

**Filename:** `hc-m.md` instead of `hc-m/index.md`

**TinaCMS displays:**

```
Equipment Collection
├─ checkweighers/hc-m.md    ← Clear!
├─ checkweighers/hc-a.md
└─ xray/xr-3000.md
```

**Benefits:**

- Easy to scan equipment names
- No "index.md" confusion
- Direct editing experience

### 3. ✅ Separate Rich Text Fields for Body Content

**Two fields instead of language blocks:**

- `bodyEn` - Technical Documentation (🇬🇧 English)
- `bodyUa` - Technical Documentation (🇺🇦 Ukrainian)

**Benefits:**

- Full WYSIWYG editor for each language
- No custom markdown syntax needed
- Content team friendly
- Clear separation

### 4. ✅ Assets in `_assets/{slug}/` Subfolder

**Structure:** `checkweighers/_assets/hc-m/hero.jpg`

**Benefits:**

- Assets organized by equipment
- All equipment files in parent folder
- Clear asset ownership
- Easy cleanup when equipment removed

### 5. ✅ Auto-Generated Slugs from Filename

**Example:**

- File: `checkweighers/hc-m.md`
- Category: `checkweighers`
- Slug: `hc-m`
- URL: `/en/catalogue/checkweighers/hc-m`

**Benefits:**

- No manual slug field needed
- Predictable URL structure
- Same slug for both languages

______________________________________________________________________

## TinaCMS Schema Summary

```typescript
{
  name: "equipment",
  label: "Equipment Catalogue",
  path: "src/content/equipment",
  format: "md",

  ui: {
    filename: {
      slugify: (values) => {
        const title = values?.title?.en || 'untitled';
        return title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      },
    },
  },

  fields: [
    // Nested multilingual objects
    {
      type: "object",
      name: "title",
      label: "Title (Multilingual)",
      fields: [
        { type: "string", name: "en", label: "🇬🇧 English", required: true },
        { type: "string", name: "ua", label: "🇺🇦 Ukrainian", required: true },
      ],
    },

    {
      type: "object",
      name: "description",
      label: "Short Description (Multilingual)",
      fields: [
        { type: "string", name: "en", label: "🇬🇧 English", required: true, ui: { component: "textarea" } },
        { type: "string", name: "ua", label: "🇺🇦 Ukrainian", required: true, ui: { component: "textarea" } },
      ],
    },

    // Shared fields
    { type: "image", name: "heroImage", label: "Hero Image", required: true },
    { type: "image", name: "gallery", label: "Gallery Images", list: true },
    { type: "string", name: "datasheet", label: "Datasheet PDF Path" },

    // Specs with multilingual labels
    {
      type: "object",
      name: "specs",
      label: "Specifications (Max 3)",
      list: true,
      ui: { max: 3 },
      fields: [
        {
          type: "object",
          name: "label",
          fields: [
            { type: "string", name: "en", label: "🇬🇧 English", required: true },
            { type: "string", name: "ua", label: "🇺🇦 Ukrainian", required: true },
          ],
        },
        { type: "string", name: "value", label: "Value", required: true },
      ],
    },

    // Separate body fields
    {
      type: "rich-text",
      name: "bodyEn",
      label: "Technical Documentation (🇬🇧 English)",
    },
    {
      type: "rich-text",
      name: "bodyUa",
      label: "Technical Documentation (🇺🇦 Ukrainian)",
    },
  ],
}
```

______________________________________________________________________

## Astro Content Collections Schema

```typescript
import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const equipmentCollection = defineCollection({
  loader: glob({ pattern: '**/[^_]*.md', base: './src/content/equipment' }),
  schema: ({ image }) =>
    z.object({
      title: z.object({
        en: z.string(),
        ua: z.string(),
      }),
      description: z.object({
        en: z.string(),
        ua: z.string(),
      }),
      heroImage: image(),
      gallery: z.array(image()).max(10).default([]),
      datasheet: z.string().optional(),
      specs: z.array(
        z.object({
          label: z.object({
            en: z.string(),
            ua: z.string(),
          }),
          value: z.string(),
        }),
      ).max(3),
    }),
});

export const collections = {
  equipment: equipmentCollection,
};
```

______________________________________________________________________

## URL Structure

### File Mapping

```
checkweighers/hc-m.md → /en/catalogue/checkweighers/hc-m
                      → /ua/catalogue/checkweighers/hc-m

xray/xr-3000.md       → /en/catalogue/xray/xr-3000
                      → /ua/catalogue/xray/xr-3000
```

### Slug Extraction Logic

```typescript
// src/pages/[lang]/catalogue/[category]/[slug].astro

export async function getStaticPaths() {
  const paths = [];

  for (const lang of ['en', 'ua'] as Lang[]) {
    const equipment = await getCollection('equipment');

    for (const item of equipment) {
      // Extract from file path: "checkweighers/hc-m.md"
      const parts = item.id.split('/');
      const category = parts[0];              // "checkweighers"
      const filename = parts[1];              // "hc-m.md"
      const slug = filename.replace('.md', ''); // "hc-m"

      paths.push({
        params: { lang, category, slug },
        props: { item, lang },
      });
    }
  }

  return paths;
}
```

______________________________________________________________________

## Content Editor Workflow

### Creating New Equipment

1. Go to `/admin/index.html`
1. Click "Equipment Catalogue"
1. Click "Create New"
1. TinaCMS shows form with:
   - Title (🇬🇧 English / 🇺🇦 Ukrainian)
   - Description (🇬🇧 / 🇺🇦)
   - Hero Image upload
   - Gallery images upload
   - Specs (max 3, with multilingual labels)
   - Technical Documentation (🇬🇧 English) - rich text
   - Technical Documentation (🇺🇦 Ukrainian) - rich text
1. Fill in all fields
1. Save

**Result:**

- Creates `equipment/{category}/{slug}.md`
- Assets saved to `equipment/{category}/_assets/{slug}/`
- Both language versions published together

### Editing Existing Equipment

1. Go to `/admin/index.html`
1. Click "Equipment Catalogue"
1. Navigate to category folder
1. Click equipment file (e.g., `hc-m.md`)
1. Edit any field
1. Save

**Result:** Both language versions updated instantly

______________________________________________________________________

## Benefits Summary

| Feature                         | Benefit                           |
| ------------------------------- | --------------------------------- |
| **One file per equipment**      | Can't forget translations         |
| **Side-by-side editing**        | Keep languages in sync            |
| **Clear filenames**             | Easy to find equipment in TinaCMS |
| **Nested multilingual objects** | Type-safe, validated              |
| **Separate body fields**        | Full WYSIWYG editing              |
| **Auto-generated slugs**        | No manual slug management         |
| **Organized assets**            | Clear folder structure            |

______________________________________________________________________

## Related Documents

- **Spike Results:** `2026-09-12-tina-multilingual-spike-results.md`
- **UI Preview:** `2026-09-12-tina-ui-preview.md`
- **Original Design Spec:** `2026-09-12-catalogue-cms-design.md`
- **TinaCMS Setup Spec:** `2026-09-12-tina-setup.md` (to be updated)

______________________________________________________________________

## Next Steps

1. ✅ **Write Implementation Plan** - Use `writing-plans` skill
1. Update existing prototype files to match new structure
1. Create categories collection schema
1. Build Astro rendering components
1. Test full workflow in TinaCMS

______________________________________________________________________

**Status:** Ready for implementation planning
**Approved by:** User (2026-09-12)
