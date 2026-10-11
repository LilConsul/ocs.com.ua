# Decap CMS Native i18n Collections Design

**Date:** 2026-10-11
**Branch:** denys/chore/deploy
**Status:** Approved for implementation

______________________________________________________________________

## Problem

The current Decap CMS `config.yml` uses a manual bilingual frontmatter approach (`en-title`, `ua-title`, `en-description`, `ua-description`, etc.) stored in combined `.md` files. This has two problems:

1. No native Decap i18n — no side-by-side locale editor, no locale-switching UI.
1. The `categories` collection is a hardcoded `files:` list — adding a new equipment type requires editing `config.yml` manually.

## Goal

- Use Decap's native i18n (`multiple_files` structure: `<slug>.en.md` / `<slug>.ua.md`).
- One nested folder collection that auto-discovers new equipment types — no `config.yml` changes needed when a new type folder is added.
- Category index files (`_index.en.md` / `_index.ua.md`) managed by the same collection via `meta.path.index_file`.
- Use correct Decap widgets throughout, including `richtext` (Beta, replaces deprecated `markdown`).

______________________________________________________________________

## File Structure on Disk

```
application/frontend/src/content/equipment/
  catchweighers/
    _index.en.md          ← category descriptor, EN locale
    _index.ua.md          ← category descriptor, UA locale
    hc-sl.en.md           ← product, EN locale
    hc-sl.ua.md           ← product, UA locale
    hc-warehouse.en.md
    hc-warehouse.ua.md
  checkweighers/
    _index.en.md
    _index.ua.md
    ec-e.en.md
    ec-e.ua.md
    hc-a.en.md
    hc-a.ua.md
    hc-m.en.md
    hc-m.ua.md
```

Adding a new equipment type (e.g. `metal-detectors`) requires only:

1. Create folder `metal-detectors/`
1. Add `_index.en.md` + `_index.ua.md`
1. Add product files as needed

No `config.yml` change required.

### Files to Delete

The following files are made redundant by this design and must be deleted:

**Combined bilingual `.md` files** (the `en-label`/`ua-label` approach):

- `catchweighers/hc-sl.md`
- `catchweighers/hc-warehouse.md`
- `checkweighers/ec-e.md`
- `checkweighers/hc-a.md`
- `checkweighers/hc-m.md`

**Old index files** (replaced by `_index.en.md` / `_index.ua.md`):

- `catchweighers/index.md`
- `catchweighers/index.en.md`
- `catchweighers/index.ua.md`
- `checkweighers/index.md`
- `checkweighers/index.en.md`
- `checkweighers/index.ua.md`

### Files to Keep and Rename

Existing locale-split product files are already in the correct format and only need their frontmatter fields updated to match the new flat schema (remove `en-`/`ua-` prefixed fields, use plain `title`, `description`, `specs`, `body`):

- `catchweighers/hc-sl.en.md` → update frontmatter fields
- `catchweighers/hc-sl.ua.md` → update frontmatter fields
- `catchweighers/hc-warehouse.en.md` → update frontmatter fields
- `catchweighers/hc-warehouse.ua.md` → update frontmatter fields
- `checkweighers/ec-e.en.md` → update frontmatter fields
- `checkweighers/ec-e.ua.md` → update frontmatter fields
- `checkweighers/hc-a.en.md` → update frontmatter fields
- `checkweighers/hc-a.ua.md` → update frontmatter fields
- `checkweighers/hc-m.en.md` → update frontmatter fields
- `checkweighers/hc-m.ua.md` → update frontmatter fields

______________________________________________________________________

## `config.yml` — Full Replacement

```yaml
backend:
  name: test-repo

# Top-level media folder used as fallback; per-field media_folder overrides take precedence
media_folder: "application/frontend/public/assets/equipment"
public_folder: "/assets/equipment"

i18n:
  structure: multiple_files
  locales: [en, ua]
  default_locale: en

collections:
  - name: "equipment"
    label: "Equipment"
    folder: "application/frontend/src/content/equipment"
    create: true
    i18n: true
    nested:
      depth: 2
      summary: "{{title | default('index')}}"
    meta:
      path:
        widget: string
        label: Path
        index_file: "_index"
    fields:
      # Shared across locales (editors fill once, auto-duplicated to other locale)
      - { label: "Icon", name: "icon", widget: "string", required: false, i18n: duplicate }
      # Order controls display sort position.
      # On _index files: sorts equipment type categories relative to each other (e.g. checkweighers=1, catchweighers=2).
      # On product files: sorts products within their category (e.g. hc-sl=1, hc-warehouse=2).
      # Lower numbers appear first. Default 0.
      - { label: "Order", name: "order", widget: "number", value_type: "int", default: 0, required: false, i18n: duplicate }
      - label: "Gallery"
        name: "gallery"
        widget: "list"
        required: false
        i18n: duplicate
        min: 0
        max: 3
        field: { label: "Image", name: "image", widget: "image" }
      - { label: "Datasheet", name: "datasheet", widget: "file", required: false, i18n: duplicate }
      - { label: "Industries", name: "industries", widget: "list", required: false, i18n: duplicate }

      # Translatable fields (side-by-side locale editor)
      - { label: "Title", name: "title", widget: "string", i18n: true }
      - { label: "Description", name: "description", widget: "text", required: false, i18n: true }
      - label: "Specifications"
        name: "specs"
        widget: "list"
        required: false
        i18n: true
        min: 0
        max: 3
        fields:
          - { label: "Label", name: "label", widget: "string" }
          - { label: "Value", name: "value", widget: "string" }
      - { label: "Body", name: "body", widget: "richtext", required: false, i18n: true }
```

### Widget Choices Rationale

| Field         | Widget                  | Constraints | Reason                                                                                                                 |
| ------------- | ----------------------- | ----------- | ---------------------------------------------------------------------------------------------------------------------- |
| `title`       | `string`                | —           | Single-line text input                                                                                                 |
| `description` | `text`                  | —           | Multiline textarea for short paragraph                                                                                 |
| `icon`        | `string`                | —           | Icon name/identifier string                                                                                            |
| `order`       | `number (int)`          | —           | Integer sort order                                                                                                     |
| `gallery`     | `list` + `field: image` | max: 3      | Image picker per item; uploads to top-level `/assets/equipment/`                                                       |
| `datasheet`   | `file`                  | —           | PDF upload/select; uploads to top-level `/assets/equipment/`                                                           |
| `industries`  | `list` (plain)          | —           | Simple comma-separated string tags                                                                                     |
| `specs`       | `list` + `fields`       | max: 3      | Repeatable `{label, value}` pairs                                                                                      |
| `body`        | `richtext`              | —           | Replaces deprecated `markdown`; outputs markdown string; must be named `body` to write file contents after frontmatter |

______________________________________________________________________

## Admin Page — `src/pages/admin/index.astro`

Two changes:

1. **Bump Decap CMS version** from `^3.3.3` to `^3.12.0` — required for `richtext` widget (Beta, available from 3.12.0).
1. **Register remark plugin** to normalize bullet lists to `-` on save.

```html
<script is:inline src="https://unpkg.com/decap-cms@^3.12.0/dist/decap-cms.js"></script>
<script is:inline>
  CMS.registerRemarkPlugin({ settings: { bullet: '-' } });
</script>
```

Existing content files use `*` bullets — no bulk migration needed. Files are normalized to `-` only when an editor saves them through the CMS (normalize-on-save).

______________________________________________________________________

## Astro `content/config.ts` — Schema Update

The schema must match the new flat field names. The `body` field is the markdown file body (not frontmatter), so it does not appear in the schema.

```ts
import { defineCollection, z } from "astro:content";

const equipment = defineCollection({
  type: "content",
  schema: z.object({
    title: z.string().optional(),
    description: z.string().optional(),
    icon: z.string().optional(),
    order: z.number().optional(),
    industries: z.array(z.string()).optional(),
    gallery: z.array(z.string()).optional(),
    datasheet: z.string().optional(),
    specs: z.array(z.object({
      label: z.string(),
      value: z.string(),
    })).optional(),
  }),
});

export const collections = {
  equipment,
};
```

______________________________________________________________________

## Existing Content Frontmatter Migration

Each kept `.en.md` / `.ua.md` product file has its frontmatter migrated from the old prefixed schema to the new flat schema:

**Old (remove these fields):**

```yaml
en-title: HC-SL Catchweigher
ua-title: Кетчвейєр HC-SL
en-description: "..."
ua-description: "..."
en-specs: [...]
ua-specs: [...]
en-body: |
  ...
ua-body: |
  ...
```

**New `.en.md` (keep only EN values, flat names, body moves to file body):**

```yaml
---
order: 2
industries:
  - logistics
gallery:
  - /assets/equipment/hc-sl/image.webp
datasheet: /assets/equipment/hc-sl/datasheet.pdf
title: HC-SL Catchweigher
description: "High-accuracy catchweigher..."
specs:
  - label: Max Speed
    value: 2.9 m/s
---
## High Weighing Accuracy...
```

**New `.ua.md` (keep only UA values, same flat names):**

```yaml
---
order: 2
industries:
  - logistics
gallery:
  - /assets/equipment/hc-sl/image.webp
datasheet: /assets/equipment/hc-sl/datasheet.pdf
title: Кетчвейєр HC-SL
description: "Високоточний кетчвейєр..."
specs:
  - label: Макс. швидкість
    value: 2.9 m/s
---
## Висока точність зважування...
```

> Note: The `category` field present in old files is dropped. The folder name (e.g. `catchweighers/`) already encodes the category — no redundant frontmatter field needed.

Shared fields (`order`, `industries`, `gallery`, `datasheet`) are duplicated into both locale files — Decap's `i18n: duplicate` behaviour ensures they stay in sync when edited through the CMS.

______________________________________________________________________

## New `_index` Files Format

**`_index.en.md`:**

```yaml
---
icon: scale-balanced
order: 1
title: Catchweighers
description: "Advanced catchweighing systems..."
---
```

**`_index.ua.md`:**

```yaml
---
icon: scale-balanced
order: 1
title: Кетчвейєри
description: "Передові системи кетчвейінгу..."
---
```

`icon` and `order` are duplicated (same in both files), `title` and `description` are translated.

______________________________________________________________________

## Out of Scope

- Variable Type Widgets — not needed, all list items are uniform `{label, value}` pairs.
- Dynamic Default Values — no deep-link pre-population use case.
- Any Astro page/component changes — this spec covers CMS config and content files only.
- Bulk normalizing `*` bullets to `-` in existing files.
