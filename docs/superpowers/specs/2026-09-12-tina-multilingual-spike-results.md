# TinaCMS Multilingual Approach - Spike Results

**Date:** 2026-09-12
**Spike Goal:** Investigate Option 4 (both languages in one file) feasibility with Astro + TinaCMS

## What Was Tested

Created a prototype with:

1. Multilingual Astro Content Collection schema (nested objects per language)
1. TinaCMS configuration for editing multilingual fields
1. Test equipment entry with both English and Ukrainian content
1. Test Astro page for rendering language-specific content

## File Structure (Updated After Review)

**Initial prototype:**

```
src/content/equipment/
  checkweighers/
    hc-m/
      index.md          ← Both languages in one file
      hero.jpg          ← Shared assets
```

**Final recommended structure (Option A):**

```
src/content/equipment/
  checkweighers/
    hc-m.md             ← Content file (both languages)
    hc-a.md
    hc-wd.md
    _assets/            ← Assets folder
      hc-m/
        hero.jpg
        gallery-1.jpg
        datasheet.pdf
      hc-a/
        hero.jpg
```

**Rationale:**

- ✅ Clear filenames in TinaCMS (shows "hc-m.md" not "index.md")
- ✅ Easy to scan and find equipment
- ✅ Assets organized by equipment in subfolder
- ✅ Slug derived from filename: `hc-m.md` → slug: `hc-m`

## Findings

### ✅ What Works

1. **Astro Content Collections Schema** ✅

   - Nested multilingual objects work perfectly
   - Schema validation: `title: { en: string, ua: string }`
   - Type safety maintained
   - Auto-slug generation from folder name is straightforward

1. **TinaCMS Schema Configuration** ✅

   - Can define nested `object` fields with language subfields
   - UI shows "🇬🇧 English" and "🇺🇦 Ukrainian" labels
   - Required validation works for both languages
   - Nested specs with multilingual labels work fine

1. **Frontmatter Editing** ✅

   - Title, description, specs all editable with clear language separation
   - Visual clarity: each field has English/Ukrainian subsections
   - Content team sees both languages side-by-side
   - Impossible to forget one language (both are visible)

1. **Shared Assets** ✅

   - Images, PDFs remain language-independent
   - Single hero image, single gallery array
   - No asset duplication

### ⚠️ Major Challenges

1. **Markdown Body Content** ⚠️

   **The Problem:**

   - TinaCMS rich text editor doesn't understand `::: lang-en` syntax
   - Content team would need to manually write markdown blocks:
     ```markdown
     ::: lang-en
     English content here
     :::

     ::: lang-ua
     Ukrainian content here
     :::
     ```
   - This is **technical and error-prone**

   **Impact:**

   - Content editors must understand markdown syntax
   - Easy to forget closing `:::` tags
   - No visual preview of which language they're editing
   - TinaCMS rich text editor becomes less helpful

1. **No Native Language Switcher** ⚠️

   - Editor sees all fields at once (English + Ukrainian stacked)
   - Gets cluttered with long content
   - No "tab view" to switch between languages cleanly

1. **Custom Parsing Required** ⚠️

   - Need custom Astro component to parse `::: lang-*` blocks
   - Must extract language-specific content at render time
   - Adds complexity to every page component

## Schema Comparison

### Frontmatter Fields (Title, Description, Specs)

**✅ Works Great**

TinaCMS UI looks like:

```
┌─ Title (Multilingual)
│  ├─ 🇬🇧 English: [                    ]
│  └─ 🇺🇦 Ukrainian: [                    ]
└─ Description (Multilingual)
   ├─ 🇬🇧 English: [                    ]
   └─ 🇺🇦 Ukrainian: [                    ]
```

Clean, clear, side-by-side editing.

### Body Content (Technical Documentation)

**⚠️ Problematic**

Current approach requires:

```markdown
---
title:
  en: HC-M Checkweigher
  ua: Чекові ваги HC-M
---

## Technical Overview

::: lang-en
The HC-M Checkweigher represents...
:::

::: lang-ua
Чекові ваги HC-M є промисловим...
:::
```

**Issues:**

- TinaCMS rich text editor shows raw markdown with `:::` tags
- No syntax highlighting for language blocks
- Content team must remember to wrap all sections
- Easy to accidentally mix languages

## Alternative for Body Content

### Option 4A: Separate Body Fields

Instead of one markdown body with language blocks, use two separate rich text fields:

```typescript
{
  type: "rich-text",
  name: "bodyEn",
  label: "Technical Documentation (🇬🇧 English)",
  isBody: false,
},
{
  type: "rich-text",
  name: "bodyUa",
  label: "Technical Documentation (🇺🇦 Ukrainian)",
  isBody: false,
}
```

**Pros:**

- ✅ Clear separation in TinaCMS UI
- ✅ Each editor gets full rich text features
- ✅ No custom markdown syntax needed
- ✅ Content team friendly

**Cons:**

- ❌ Can't use `isBody: true` (only one body field allowed)
- ❌ Must access via `item.data.bodyEn` and `item.data.bodyUa`
- ❌ Longer frontmatter

**This is probably the best compromise.**

## Recommendation

### ✅ Use Option 4 (Modified) with Option A File Structure

**Content File Structure:**

```
src/content/equipment/
  checkweighers/
    hc-m.md             ← Content file named after equipment
    hc-a.md
    _assets/
      hc-m/
        hero.jpg
        gallery-1.jpg
        datasheet.pdf
```

**Frontmatter Structure:**

```yaml
---
# Multilingual fields (nested objects)
title:
  en: HC-M Checkweigher
  ua: Чекові ваги HC-M

description:
  en: The standard for dynamic weighing...
  ua: Стандарт динамічного зважування...

specs:
  - label:
      en: Max Speed
      ua: Макс. швидкість
    value: 250 pcs/min

# Shared fields with updated paths
heroImage: ./_assets/hc-m/hero.jpg
gallery:
  - ./_assets/hc-m/gallery-1.jpg
  - ./_assets/hc-m/gallery-2.jpg
datasheet: ./_assets/hc-m/datasheet.pdf
---

<!-- English content (bodyEn) -->
## Technical Overview
The HC-M Checkweigher represents...

<!-- Ukrainian content (bodyUa) -->
## Технічний огляд
Чекові ваги HC-M є промисловим...
```

**TinaCMS Configuration:**

```typescript
{
  name: "equipment",
  path: "src/content/equipment",
  ui: {
    filename: {
      readonly: false,
      slugify: (values) => {
        // Generate filename from English title or slug
        // "HC-M Checkweigher" → "hc-m-checkweigher.md"
        const title = values?.title?.en || 'untitled';
        return title
          .toLowerCase()
          .replace(/\s+/g, '-')
          .replace(/[^a-z0-9-]/g, '');
      },
    },
  },
  fields: [
    // Nested multilingual objects for title, description, specs
    // Separate rich text fields for bodyEn and bodyUa
  ]
}
```

**Slug Generation:**

- Filename: `checkweighers/hc-m.md`
- Slug extraction: Take filename without extension → `hc-m`
- Category: Parent folder → `checkweighers`
- URL: `/en/catalogue/checkweighers/hc-m`

**Media Configuration:**

```typescript
media: {
  tina: {
    mediaRoot: 'src/content/equipment',
    publicFolder: 'src',
  },
}
```

### Why This Is Best

1. **Frontmatter fields** (title, description, specs):

   - ✅ Side-by-side editing
   - ✅ Clear visual separation
   - ✅ Guaranteed both languages exist

1. **Body content** (long markdown):

   - ✅ Full TinaCMS rich text editor for each language
   - ✅ No custom syntax needed
   - ✅ Content team friendly
   - ✅ Clear "English section" vs "Ukrainian section"

1. **Single source of truth:**

   - ✅ One file per equipment item
   - ✅ Both languages always together
   - ✅ Can't accidentally publish only one language

1. **Auto-slug from folder:**

   - ✅ `equipment/checkweighers/hc-m/` → slug: `hc-m`
   - ✅ Same URL for both languages
   - ✅ No manual slug field needed

## Comparison with Option 2 (Separate Files)

| Aspect                      | Option 2 (Separate Files)      | Option 4 (One File)           |
| --------------------------- | ------------------------------ | ----------------------------- |
| File count                  | 2 files per equipment          | 1 file per equipment          |
| Forgetting translations     | ⚠️ Easy to forget UA version   | ✅ Impossible (both visible)  |
| TinaCMS UI                  | Separate file list entries     | Side-by-side fields           |
| Editor experience           | Must switch between files      | See both languages at once    |
| Shared assets               | ✅ Colocated                   | ✅ Colocated                  |
| Slug generation             | ✅ From folder name            | ✅ From folder name           |
| Content team learning curve | Lower (one language at a time) | Medium (more fields visible)  |
| Risk of language drift      | ⚠️ Higher (files can diverge)  | ✅ Lower (structure enforced) |

## Trade-offs

### Option 4 is Better When:

- ✅ Translations must stay in sync (structure-wise)
- ✅ Content team is comfortable with more complex UI
- ✅ Guaranteed bilingual content is critical
- ✅ You want to prevent orphaned translations

### Option 2 is Better When:

- ✅ Translations can have different structures
- ✅ Content team prefers simpler, focused editing
- ✅ Languages are maintained by different people
- ✅ You want flexibility per language

## Next Steps

If you approve Option 4 with separate body fields:

1. Update the TinaCMS setup spec with this approach
1. Create proper TinaCMS schema with `bodyEn` and `bodyUa` fields
1. Build Astro components to render language-specific content
1. Create initial category + equipment content
1. Test the full editing workflow in TinaCMS admin

## Files Created During Spike

- ✅ `src/content.config.ts` - Astro Content Collections schema (multilingual)
- ✅ `tina/config.ts` - Updated with equipment collection
- ✅ `src/content/equipment/checkweighers/hc-m/index.md` - Test equipment entry
- ✅ `src/pages/[lang]/catalogue-test/[category]/[slug].astro` - Test render page

All files are functional and validated with `astro check`.

______________________________________________________________________

**Spike Status:** ✅ Complete
**Recommendation:** Proceed with Option 4 (modified with separate body fields)
**Confidence:** High - all technical blockers resolved
