# Decap CMS i18n Migration Plan

## Current State Analysis

### Current Structure (Prefixed Fields)

Your content files use a **manual prefix pattern**:

```yaml
en-title: HC-A Checkweigher
ua-title: Чеквейєр HC-A
en-description: High-speed checkweighers...
ua-description: Високошвидкісні чеквейєри...
en-body: |
  ## Content in English
ua-body: |
  ## Контент українською
```

**Issues with current approach:**

- ❌ No native CMS i18n UI (editors see all languages mixed together)
- ❌ Manual field duplication in config.yml (40+ lines per collection)
- ❌ No language-switching interface in CMS
- ❌ Risk of missing translations (no validation)
- ❌ Poor editor UX (scrolling through long forms)

______________________________________________________________________

## Decap CMS i18n Structures

Decap CMS provides **4 native i18n structures**. Here's the professional analysis:

### 1. **duplicate** - Separate Files Per Language (RECOMMENDED)

#### Configuration

```yaml
i18n:
  structure: duplicate
  locales: [en, ua]
  default_locale: ua

collections:
  - name: "checkweighers"
    label: "Checkweighers"
    folder: "application/frontend/src/content/equipment/checkweighers"
    create: true
    slug: "{{slug}}"
    extension: "md"
    format: "frontmatter"
    i18n: true
    fields:
      - { label: "Title", name: "title", widget: "string", i18n: true }
      - { label: "Order", name: "order", widget: "number", default: 0, i18n: "duplicate" }
      - { label: "Industries", name: "industries", widget: "list", i18n: "duplicate" }
      - { label: "Description", name: "description", widget: "text", i18n: true }
      - { label: "Gallery", name: "gallery", widget: "list", i18n: "duplicate" }
      - { label: "Datasheet", name: "datasheet", widget: "file", i18n: "duplicate" }
      - label: "Specifications"
        name: "specs"
        widget: "list"
        i18n: true
        fields:
          - { label: "Label", name: "label", widget: "string", i18n: true }
          - { label: "Value", name: "value", widget: "string", i18n: "duplicate" }
      - { label: "Body", name: "body", widget: "markdown", i18n: true }
```

#### File Structure

```
src/content/equipment/checkweighers/
├── hc-a.en.md          # English version
├── hc-a.ua.md          # Ukrainian version
├── ec-e.en.md
├── ec-e.ua.md
└── ...
```

#### Example File Content

```yaml
# hc-a.en.md
---
title: HC-A Checkweigher
order: 1
industries:
  - food-beverage
  - pharmaceutical
  - cosmetics
description: High-speed checkweighers for maximum performance...
gallery:
  - /assets/equipment/hc-a/csm_checkweigher-hc-a-right_a7ab8c2ea6.webp
  - /assets/equipment/hc-a/csm_checkweigher-hc-a-front_d6527f5b5a.webp
datasheet: /assets/equipment/hc-a/datasheet.pdf
specs:
  - label: Max Speed
    value: 600 ppm
  - label: Display Value
    value: TODO
---

## High Speed Checkweighers for Maximum Performance

In terms of precision and throughput, HC-A checkweighers are...
```

```yaml
# hc-a.ua.md
---
title: Чеквейєр HC-A
order: 1
industries:
  - food-beverage
  - pharmaceutical
  - cosmetics
description: Високошвидкісні чеквейєри для максимальної продуктивності...
gallery:
  - /assets/equipment/hc-a/csm_checkweigher-hc-a-right_a7ab8c2ea6.webp
  - /assets/equipment/hc-a/csm_checkweigher-hc-a-front_d6527f5b5a.webp
datasheet: /assets/equipment/hc-a/datasheet.pdf
specs:
  - label: Макс. швидкість
    value: 600 ppm
  - label: Дискретність
    value: TODO
---

## Високошвидкісні чеквейєри для максимальної продуктивності

З точки зору точності та продуктивності, чеквейєри HC-A є...
```

#### Pros

✅ **Best Git workflow** - Clean diffs, no merge conflicts between languages
✅ **Independent translations** - Can edit/commit one language without touching others
✅ **Clear file organization** - Easy to see which files exist in which languages
✅ **Native CMS UI** - Language switcher in editor interface
✅ **Best for your use case** - Perfect for bilingual B2B content with infrequent updates
✅ **Astro-friendly** - Can load by locale easily with `getCollection()` filters

#### Cons

⚠️ Minor duplication of non-translatable fields (order, gallery paths)
⚠️ Two commits required when changing shared data like gallery images

#### Migration Impact

- **Frontend code changes**: Update Astro collection loader and queries
- **CMS workflow**: Editors get language picker UI automatically
- **Effort**: Medium (requires content migration script)

______________________________________________________________________

### 2. **single_file** - All Translations in One File

#### Configuration

```yaml
i18n:
  structure: single_file
  locales: [en, ua]
  default_locale: ua
```

#### File Structure

```
src/content/equipment/checkweighers/
├── hc-a.md     # Contains both languages
├── ec-e.md
└── ...
```

#### Example File Content

```yaml
---
title:
  en: HC-A Checkweigher
  ua: Чеквейєр HC-A
order: 1
industries:
  - food-beverage
description:
  en: High-speed checkweighers...
  ua: Високошвидкісні чеквейєри...
specs:
  en:
    - label: Max Speed
      value: 600 ppm
  ua:
    - label: Макс. швидкість
      value: 600 ppm
---

::en
## High Speed Checkweighers
...

::ua
## Високошвидкісні чеквейєри
...
```

#### Pros

✅ Single file per product (conceptually simpler)
✅ Easy to see all translations at once
✅ Shared fields (order, gallery) in one place

#### Cons

❌ **Merge conflicts** - Two editors working on different languages = conflict
❌ **Large files** - Harder to review in Git diffs
❌ **Astro integration complexity** - Nested objects harder to query
❌ **Not standard Markdown** - Body content needs special delimiters

#### Verdict

⛔ **NOT RECOMMENDED** for your project due to Git workflow issues and Astro complexity

______________________________________________________________________

### 3. **multiple_files** - Separate Locale Files with Shared Slug

#### Configuration

Similar to `duplicate` but uses different naming convention

#### File Structure

```
src/content/equipment/checkweighers/
├── en/
│   ├── hc-a.md
│   └── ec-e.md
└── ua/
    ├── hc-a.md
    └── ec-e.md
```

#### Pros

✅ Clean separation by directory
✅ Good Git workflow (no conflicts)
✅ Easy to add new languages (new folder)

#### Cons

⚠️ Deeper nesting (less compatible with Astro content collections)
⚠️ Harder to glob with `astro:content` loaders

#### Verdict

⚠️ **POSSIBLE but not ideal** - The `duplicate` structure is more Astro-native

______________________________________________________________________

### 4. **multiple_folders** - Separate Collections Per Language

#### Configuration

```yaml
collections:
  - name: "checkweighers_en"
    label: "Checkweighers (EN)"
    folder: "content/equipment/checkweighers/en"
    # ...
  - name: "checkweighers_ua"
    label: "Checkweighers (UA)"
    folder: "content/equipment/checkweighers/ua"
    # ...
```

#### Pros

✅ Complete separation
✅ Can have different editors per language

#### Cons

❌ No i18n UI in CMS (manual duplication)
❌ Complex config (duplicate all collections)
❌ Hard to maintain translation parity

#### Verdict

⛔ **NOT RECOMMENDED** - This is essentially your current approach with folders

______________________________________________________________________

## Professional Recommendation: **duplicate** Structure

### Why This Is the Right Choice

1. **Git-Friendly for B2B Workflow**

   - Technical editors may edit English specs
   - Marketing team edits Ukrainian descriptions
   - No merge conflicts between language teams

1. **Astro Content Collections Compatibility**

   - File-based routing works naturally
   - `getCollection('equipment', ({ id }) => id.endsWith('.en.md'))`
   - Clean schema validation per language

1. **Future-Proof**

   - Easy to add Polish, Russian, etc. (new `.pl.md` files)
   - Can deploy per-language builds for CDN optimization
   - Works with Astro's i18n routing out of the box

1. **Editor Experience**

   - Native language switcher in Decap CMS UI
   - See translations side-by-side (optional preview)
   - Field-level i18n configuration (some fields translate, others duplicate)

______________________________________________________________________

## Implementation Plan

### Phase 1: Update Decap CMS Config (30 minutes)

**File**: `public/admin/config.yml`

```yaml
backend:
  name: github
  repo: LilConsul/ocs.com.ua
  branch: main

media_folder: "application/frontend/public/assets/equipment"
public_folder: "/assets/equipment"

# Global i18n configuration
i18n:
  structure: duplicate
  locales: [ua, en]  # Default first
  default_locale: ua

collections:
  - name: "checkweighers"
    label: "Checkweighers"
    folder: "application/frontend/src/content/equipment/checkweighers"
    create: true
    slug: "{{slug}}"
    extension: "md"
    format: "frontmatter"
    i18n: true  # Enable i18n for this collection
    fields:
      # Translatable fields
      - { label: "Title", name: "title", widget: "string", i18n: true }
      - { label: "Description", name: "description", widget: "text", i18n: true }

      # Duplicate (same value in both files, but editable per locale)
      - { label: "Order", name: "order", widget: "number", default: 0, i18n: "duplicate" }
      - { label: "Industries", name: "industries", widget: "list", required: false, i18n: "duplicate" }
      - { label: "Gallery", name: "gallery", widget: "list", required: false, i18n: "duplicate" }
      - { label: "Datasheet", name: "datasheet", widget: "file", required: false, i18n: "duplicate" }

      # Specs with translatable labels
      - label: "Specifications"
        name: "specs"
        widget: "list"
        required: false
        i18n: true
        fields:
          - { label: "Label", name: "label", widget: "string", i18n: true }
          - { label: "Value", name: "value", widget: "string", i18n: "duplicate" }

      # Body content (translatable)
      - { label: "Body", name: "body", widget: "markdown", i18n: true }

  # Repeat for other collections (catchweighers, metal-detectors, etc.)
  - name: "catchweighers"
    label: "Catchweighers"
    folder: "application/frontend/src/content/equipment/catchweighers"
    i18n: true
    # ... (same field structure)
```

### Phase 2: Migrate Content Files (Script)

**Create**: `scripts/migrate-to-i18n.js`

```javascript
import fs from 'fs';
import path from 'path';
import { glob } from 'glob';
import matter from 'gray-matter';

const CONTENT_DIR = 'src/content/equipment';
const CATEGORIES = ['checkweighers', 'catchweighers', 'metal-detectors', 'x-ray-inspection'];

async function migrateFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const { data, content: bodyContent } = matter(content);

  // Skip index.md files (categories)
  if (path.basename(filePath) === 'index.md') {
    console.log(`Skipping category file: ${filePath}`);
    return;
  }

  // Extract language-specific data
  const enData = {
    title: data['en-title'],
    description: data['en-description'],
    order: data.order,
    industries: data.industries,
    gallery: data.gallery,
    datasheet: data.datasheet,
    specs: data.specs?.map(spec => ({
      label: spec['en-label'],
      value: spec.value
    }))
  };

  const uaData = {
    title: data['ua-title'],
    description: data['ua-description'],
    order: data.order,
    industries: data.industries,
    gallery: data.gallery,
    datasheet: data.datasheet,
    specs: data.specs?.map(spec => ({
      label: spec['ua-label'],
      value: spec.value
    }))
  };

  const enBody = data['en-body'] || '';
  const uaBody = data['ua-body'] || '';

  // Generate new filenames
  const dir = path.dirname(filePath);
  const basename = path.basename(filePath, '.md');
  const enPath = path.join(dir, `${basename}.en.md`);
  const uaPath = path.join(dir, `${basename}.ua.md`);

  // Write new files
  fs.writeFileSync(enPath, matter.stringify(enBody, enData));
  fs.writeFileSync(uaPath, matter.stringify(uaBody, uaData));

  console.log(`✅ Migrated: ${basename} → ${basename}.en.md + ${basename}.ua.md`);

  // Remove old file
  fs.unlinkSync(filePath);
}

async function main() {
  for (const category of CATEGORIES) {
    const pattern = path.join(CONTENT_DIR, category, '*.md');
    const files = glob.sync(pattern);

    console.log(`\nMigrating ${category}...`);
    for (const file of files) {
      await migrateFile(file);
    }
  }

  console.log('\n✨ Migration complete!');
}

main();
```

**Run**:

```bash
bun add -D gray-matter glob
bun run scripts/migrate-to-i18n.js
```

### Phase 3: Update Astro Content Config

**File**: `src/content.config.ts`

```typescript
import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

// Simplified schema without language prefixes
const productSchema = z.object({
  title: z.string(),
  description: z.string(),
  order: z.number().optional(),
  gallery: z.array(z.string()).min(1).max(10),
  datasheet: z.string().optional(),
  industries: z.array(z.string()).optional(),
  specs: z.array(
    z.object({
      label: z.string(),
      value: z.string(),
    })
  ).optional(),
  // Body is in markdown content, not frontmatter
});

const equipmentCollection = defineCollection({
  loader: glob({
    pattern: "**/*.{en,ua}.md",  // Match localized files
    base: "./src/content/equipment",
  }),
  schema: productSchema,
});

export const collections = {
  equipment: equipmentCollection,
};
```

### Phase 4: Update Astro Page Queries

**File**: `src/pages/[lang]/catalogue/[category]/[slug].astro`

```typescript
---
import { getCollection } from 'astro:content';

export async function getStaticPaths() {
  const allProducts = await getCollection('equipment');

  return allProducts
    .filter(product => !product.id.includes('index'))  // Skip category files
    .map(product => {
      // Extract locale from filename: "checkweighers/hc-a.en.md" → "en"
      const [category, fileWithExt] = product.id.split('/');
      const locale = fileWithExt.split('.').at(-2);  // Get "en" or "ua"
      const slug = fileWithExt.replace(`.${locale}.md`, '');

      return {
        params: {
          lang: locale,
          category,
          slug
        },
        props: { product }
      };
    });
}

const { product } = Astro.props;
const { Content } = await product.render();
---

<h1>{product.data.title}</h1>
<p>{product.data.description}</p>

<Content />
```

### Phase 5: Testing Checklist

- [ ] CMS loads without errors at `/admin`
- [ ] Language switcher appears in editor UI
- [ ] Can create new English entry
- [ ] Can create Ukrainian translation of existing entry
- [ ] Gallery images render correctly
- [ ] Datasheet links work
- [ ] Specs display properly
- [ ] Markdown body renders
- [ ] Can commit changes via CMS (GitHub integration)
- [ ] Frontend pages load all products
- [ ] `/en/catalogue/checkweighers/hc-a` works
- [ ] `/ua/catalogue/checkweighers/hc-a` works

______________________________________________________________________

## Migration Timeline

| Phase                | Effort       | Risk                        |
| -------------------- | ------------ | --------------------------- |
| 1. Config update     | 30 min       | Low                         |
| 2. Content migration | 1 hour       | Medium (test on copy first) |
| 3. Astro config      | 15 min       | Low                         |
| 4. Page queries      | 30 min       | Medium (test all routes)    |
| 5. Testing           | 1 hour       | -                           |
| **Total**            | **~3 hours** | **Low-Medium**              |

______________________________________________________________________

## Rollback Plan

If issues arise:

1. Revert `public/admin/config.yml`
1. Restore content files from git: `git restore src/content/`
1. Revert Astro changes: `git restore src/`

**Before starting**: Create branch `feat/decap-i18n-migration`

______________________________________________________________________

## Alternative: Hybrid Approach (Not Recommended)

You could keep your current prefixed structure and add a custom CMS widget, but this defeats the purpose of using Decap CMS's native i18n and provides no UX improvement.

______________________________________________________________________

## Next Steps

1. **Backup**: Commit current state
1. **Branch**: `git checkout -b feat/decap-i18n-native`
1. **Execute**: Follow phases 1-5
1. **Test**: Use checklist
1. **Review**: Check CMS editor experience
1. **Deploy**: Merge to main after approval

______________________________________________________________________

## Questions to Answer Before Migrating

1. **Do you need to support more languages in the future?** (Polish, Russian, etc.)

   - If yes: `duplicate` structure scales perfectly

1. **Do different teams edit different languages?**

   - If yes: `duplicate` prevents merge conflicts

1. **Do you need per-language publishing workflows?** (e.g., English published, Ukrainian draft)

   - If yes: Only `duplicate` supports this cleanly

1. **Is there shared media that should never differ between languages?**

   - Current: All images are shared (good)
   - With `duplicate`: Images duplicated in frontmatter but point to same files (acceptable)
   - Alternative: Create a separate "media" field that's not i18n-enabled

______________________________________________________________________

## Conclusion

**Recommended Action**: Migrate to `duplicate` structure with Decap CMS native i18n.

**Benefits**:

- Professional CMS editor experience
- Git-friendly workflow
- Astro-compatible structure
- Future-proof for additional languages
- Clean separation of concerns

**Effort**: ~3 hours for full migration including testing

**Risk**: Low (easily reversible, script-automated)

Let me know if you want me to proceed with the migration or if you have questions about any aspect of this plan.
