# Spike Prototype Refactored to Option A Structure

**Date:** 2026-09-12
**Status:** ✅ Complete

______________________________________________________________________

## What Was Changed

### Before (Initial Spike)

```
src/content/equipment/
  checkweighers/
    hc-m/
      index.md          ← Confusing filename
      hero.jpg
      gallery-1.jpg
```

### After (Option A - Refactored)

```
src/content/equipment/
  checkweighers/
    hc-m.md             ← Clear equipment filename!
    _assets/
      hc-m/
        hero.jpg
        gallery-1.jpg
        gallery-2.jpg
        datasheet.pdf
```

______________________________________________________________________

## Files Updated

### 1. ✅ Content File Renamed

- **From:** `checkweighers/hc-m/index.md`
- **To:** `checkweighers/hc-m.md`

### 2. ✅ Frontmatter Updated

```yaml
# Old paths
heroImage: ./hero.jpg
gallery:
  - ./gallery-1.jpg

# New paths (Option A)
heroImage: ./_assets/hc-m/hero.jpg
gallery:
  - ./_assets/hc-m/gallery-1.jpg
  - ./_assets/hc-m/gallery-2.jpg
datasheet: ./_assets/hc-m/datasheet.pdf
```

### 3. ✅ Body Content Restructured

```yaml
# Old (language blocks)
---
...markdown with ::: lang-en blocks...

# New (separate fields)
bodyEn: |
  ## Technical Overview
  English content...

bodyUa: |
  ## Технічний огляд
  Ukrainian content...
```

### 4. ✅ Astro Content Collections Schema Updated

```typescript
// Added separate body fields
schema: z.object({
  // ... multilingual fields ...
  bodyEn: z.string(),
  bodyUa: z.string(),
})
```

### 5. ✅ TinaCMS Config Updated

```typescript
{
  ui: {
    filename: {
      slugify: (values) => {
        // Generate from title: "HC-M Checkweigher" → "hc-m-checkweigher"
        const title = values?.title?.en || 'untitled';
        return title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      },
    },
  },
  fields: [
    // ... multilingual nested objects ...
    { type: "rich-text", name: "bodyEn", label: "Technical Documentation (🇬🇧 English)" },
    { type: "rich-text", name: "bodyUa", label: "Technical Documentation (🇺🇦 Ukrainian)" },
  ],
}
```

### 6. ✅ Test Page Updated

```typescript
// Old slug extraction
const parts = item.id.split('/');
const category = parts[0];
const slug = parts[1]; // "hc-m" from folder

// New slug extraction (Option A)
const parts = item.id.split('/');
const category = parts[0];                // "checkweighers"
const filename = parts[1];                // "hc-m.md"
const slug = filename.replace('.md', ''); // "hc-m"
```

### 7. ✅ Assets Created

- `_assets/hc-m/hero.jpg` - SVG placeholder (800x600)
- `_assets/hc-m/gallery-1.jpg` - SVG placeholder (400x400)
- `_assets/hc-m/gallery-2.jpg` - SVG placeholder (400x400)
- `_assets/hc-m/datasheet.pdf` - Text placeholder

______________________________________________________________________

## Verification

### ✅ Astro Check Passed

```bash
bun astro check
# Result: 0 errors, 0 warnings
```

### ✅ File Structure Correct

```
src/content/equipment/
└── checkweighers/
    ├── hc-m.md                    ← Content file
    └── _assets/
        └── hc-m/
            ├── hero.jpg
            ├── gallery-1.jpg
            ├── gallery-2.jpg
            └── datasheet.pdf
```

### ✅ TinaCMS Display

When editor opens Equipment Collection, they see:

```
Equipment Catalogue
└─ checkweighers
   └─ hc-m.md          ← Clear filename! (not index.md)
```

### ✅ URL Structure

```
File: checkweighers/hc-m.md
URLs:
  - /en/catalogue-test/checkweighers/hc-m
  - /ua/catalogue-test/checkweighers/hc-m
```

______________________________________________________________________

## Testing the Prototype

### 1. Start Dev Server

```bash
bun run dev
```

### 2. View Test Page

Navigate to:

- English: `http://localhost:4321/en/catalogue-test/checkweighers/hc-m`
- Ukrainian: `http://localhost:4321/ua/catalogue-test/checkweighers/hc-m`

### 3. Edit in TinaCMS

Navigate to:

- Admin: `http://localhost:4321/admin/index.html`
- Collection: Equipment Catalogue
- File: `checkweighers/hc-m.md`

______________________________________________________________________

## What You'll See

### In TinaCMS File List

```
📁 Equipment Catalogue
  📁 checkweighers
    📄 hc-m.md          ← Click to edit (NOT "index.md"!)
```

### In TinaCMS Editor

```
Title (Multilingual)
  🇬🇧 English:  [HC-M Checkweigher]
  🇺🇦 Ukrainian: [Чекові ваги HC-M]

Short Description (Multilingual)
  🇬🇧 English:  [The standard for dynamic weighing...]
  🇺🇦 Ukrainian: [Стандарт динамічного зважування...]

Hero Image: ./_assets/hc-m/hero.jpg

Gallery Images:
  1. ./_assets/hc-m/gallery-1.jpg
  2. ./_assets/hc-m/gallery-2.jpg

Specifications (Max 3):
  1. Max Speed / Макс. швидкість: 250 pcs/min
  2. Display Value / Відображуване значення: 0.1g
  3. Belt Width / Ширина стрічки: 300mm

Technical Documentation (🇬🇧 English)
  [Rich text editor with English content...]

Technical Documentation (🇺🇦 Ukrainian)
  [Rich text editor with Ukrainian content...]
```

### On Test Page

You'll see:

- ✅ Title rendered in selected language
- ✅ Description in selected language
- ✅ Specifications with multilingual labels
- ✅ Image paths displayed
- ✅ Body content in selected language
- ✅ File structure info showing Option A paths

______________________________________________________________________

## Comparison: Before vs After

| Aspect            | Before (Initial Spike)       | After (Option A)                |
| ----------------- | ---------------------------- | ------------------------------- |
| Content filename  | `hc-m/index.md`              | `hc-m.md` ✅                    |
| TinaCMS display   | "index.md" everywhere        | "hc-m.md" (clear) ✅            |
| Assets location   | `hc-m/hero.jpg`              | `_assets/hc-m/hero.jpg` ✅      |
| Body content      | Language blocks `::: lang-*` | Separate `bodyEn` / `bodyUa` ✅ |
| Slug extraction   | From folder name             | From filename ✅                |
| Editor experience | Confusing                    | Clear and direct ✅             |

______________________________________________________________________

## Key Improvements

### 1. Clear Filenames in TinaCMS

**Before:** All equipment files named "index.md"
**After:** Each equipment has descriptive filename

### 2. Better Asset Organization

**Before:** Assets mixed with content in equipment folders
**After:** Assets in dedicated `_assets/{slug}/` subfolder

### 3. Content Team Friendly

**Before:** Markdown with custom language block syntax
**After:** Two separate rich text fields (WYSIWYG)

### 4. Predictable Slug Generation

**Before:** Based on folder structure
**After:** Based on filename (more explicit)

______________________________________________________________________

## What's Next

With the refactored prototype working:

1. ✅ **Implementation Plan** - Write detailed plan with `writing-plans` skill
1. Create categories collection (same multilingual pattern)
1. Build production Astro rendering components
1. Add all 6 categories (checkweighers, xray, metal-detectors, etc.)
1. Create initial equipment content
1. Test full editing workflow

______________________________________________________________________

## Success Criteria Met

- ✅ Files named by equipment (not "index.md")
- ✅ Assets organized in `_assets/` subfolder
- ✅ Separate body fields per language
- ✅ Astro validation passes
- ✅ TinaCMS config updated
- ✅ Test page renders correctly
- ✅ Slug extraction works
- ✅ All paths relative and correct

______________________________________________________________________

**Status:** ✅ Refactored and validated
**Ready for:** Implementation planning
