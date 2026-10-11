# Decap CMS Native i18n Collections Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use skills:subagent-driven-development (recommended) or skills:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the manual `en-`/`ua-` prefixed frontmatter approach with Decap CMS native i18n using `multiple_files` structure (`<slug>.en.md` / `<slug>.ua.md`), a single nested folder collection, and correct widget types throughout.

**Architecture:** One nested folder collection in `config.yml` handles all equipment types — products and category index files alike. The `multiple_files` i18n structure writes per-locale files on disk. Category indexes use `_index.en.md` / `_index.ua.md` per folder, auto-discovered via `meta.path.index_file: "_index"`.

**Tech Stack:** Decap CMS `^3.12.0`, Astro content collections, YAML frontmatter, TypeScript (Zod schema)

______________________________________________________________________

## File Map

| Action  | File                                                                          |
| ------- | ----------------------------------------------------------------------------- |
| Replace | `application/frontend/public/admin/config.yml`                                |
| Modify  | `application/frontend/src/pages/admin/index.astro`                            |
| Replace | `application/frontend/src/content/config.ts`                                  |
| Delete  | `application/frontend/src/content/equipment/catchweighers/hc-sl.md`           |
| Delete  | `application/frontend/src/content/equipment/catchweighers/hc-warehouse.md`    |
| Delete  | `application/frontend/src/content/equipment/checkweighers/ec-e.md`            |
| Delete  | `application/frontend/src/content/equipment/checkweighers/hc-a.md`            |
| Delete  | `application/frontend/src/content/equipment/checkweighers/hc-m.md`            |
| Delete  | `application/frontend/src/content/equipment/catchweighers/index.md`           |
| Delete  | `application/frontend/src/content/equipment/catchweighers/index.en.md`        |
| Delete  | `application/frontend/src/content/equipment/catchweighers/index.ua.md`        |
| Delete  | `application/frontend/src/content/equipment/checkweighers/index.md`           |
| Delete  | `application/frontend/src/content/equipment/checkweighers/index.en.md`        |
| Delete  | `application/frontend/src/content/equipment/checkweighers/index.ua.md`        |
| Create  | `application/frontend/src/content/equipment/catchweighers/_index.en.md`       |
| Create  | `application/frontend/src/content/equipment/catchweighers/_index.ua.md`       |
| Create  | `application/frontend/src/content/equipment/checkweighers/_index.en.md`       |
| Create  | `application/frontend/src/content/equipment/checkweighers/_index.ua.md`       |
| Modify  | `application/frontend/src/content/equipment/catchweighers/hc-sl.en.md`        |
| Modify  | `application/frontend/src/content/equipment/catchweighers/hc-sl.ua.md`        |
| Modify  | `application/frontend/src/content/equipment/catchweighers/hc-warehouse.en.md` |
| Modify  | `application/frontend/src/content/equipment/catchweighers/hc-warehouse.ua.md` |
| Modify  | `application/frontend/src/content/equipment/checkweighers/ec-e.en.md`         |
| Modify  | `application/frontend/src/content/equipment/checkweighers/ec-e.ua.md`         |
| Modify  | `application/frontend/src/content/equipment/checkweighers/hc-a.en.md`         |
| Modify  | `application/frontend/src/content/equipment/checkweighers/hc-a.ua.md`         |
| Modify  | `application/frontend/src/content/equipment/checkweighers/hc-m.en.md`         |
| Modify  | `application/frontend/src/content/equipment/checkweighers/hc-m.ua.md`         |

______________________________________________________________________

## Task 1: Replace `config.yml` with native i18n collection

**Files:**

- Replace: `application/frontend/public/admin/config.yml`

- [ ] **Step 1: Write the new `config.yml`**

Replace the entire file with:

```yaml
backend:
  name: test-repo

# All equipment media (images, datasheets) uploads land here
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

- [ ] **Step 2: Verify YAML syntax is valid**

```powershell
# Quick check — no errors should appear
Get-Content application/frontend/public/admin/config.yml | Select-String "widget|i18n|locales"
```

Expected: lines containing `widget`, `i18n`, `locales` appear correctly — no YAML parse errors visible.

- [ ] **Step 3: Commit**

```bash
git add application/frontend/public/admin/config.yml
git commit -m "feat(cms): replace config.yml with native i18n nested collection"
```

______________________________________________________________________

## Task 2: Update admin page — bump Decap version, register remark plugin

**Files:**

- Modify: `application/frontend/src/pages/admin/index.astro`

- [ ] **Step 1: Update the admin page**

Replace the entire file content with:

```astro
---
// Admin page for Decap CMS
---

<!doctype html>
<html lang="en">
	<head>
		<meta charset="utf-8" />
		<meta name="viewport" content="width=device-width, initial-scale=1.0" />
		<meta name="robots" content="noindex" />
		<title>Content Manager</title>
	</head>
	<body>
		<!-- Decap CMS ^3.12.0 required for richtext widget (Beta) -->
		<script is:inline src="https://unpkg.com/decap-cms@^3.12.0/dist/decap-cms.js"></script>
		<!-- Normalize bullet lists to '-' on save (remark@10 compatible) -->
		<script is:inline>
			CMS.registerRemarkPlugin({ settings: { bullet: '-' } });
		</script>
	</body>
</html>
```

- [ ] **Step 2: Commit**

```bash
git add application/frontend/src/pages/admin/index.astro
git commit -m "feat(cms): bump Decap to ^3.12.0, register remark bullet plugin"
```

______________________________________________________________________

## Task 3: Update Astro content schema (`config.ts`)

**Files:**

- Replace: `application/frontend/src/content/config.ts`

- [ ] **Step 1: Replace `config.ts` with the new flat schema**

```typescript
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
		specs: z
			.array(
				z.object({
					label: z.string(),
					value: z.string(),
				}),
			)
			.optional(),
	}),
});

export const collections = {
	equipment,
};
```

- [ ] **Step 2: Verify Astro type-checks cleanly**

```powershell
cd application/frontend
npx astro check
```

Expected: no type errors on `config.ts`. (Existing pages may show errors if they reference old `en-title` etc. fields — that is expected and will be resolved when content files are migrated.)

- [ ] **Step 3: Commit**

```bash
git add application/frontend/src/content/config.ts
git commit -m "feat(cms): update content schema to flat i18n field names"
```

______________________________________________________________________

## Task 4: Create new `_index` files for catchweighers

**Files:**

- Create: `application/frontend/src/content/equipment/catchweighers/_index.en.md`

- Create: `application/frontend/src/content/equipment/catchweighers/_index.ua.md`

- [ ] **Step 1: Create `_index.en.md`**

```markdown
---
icon: inventory_2
order: 2
title: Catchweighers & DWS
description: >-
  Industrial scales and DWS systems for logistics and e-commerce applications.
  High-speed solutions for parcel weighing up to 60 kg at 3.4 m/s with
  exceptional accuracy. Optimized for CEP organizations, warehouses, and
  distribution centers with throughput up to 11,000 parcels per hour.
---
```

- [ ] **Step 2: Create `_index.ua.md`**

```markdown
---
icon: inventory_2
order: 2
title: Кетчвейєри & DWS
description: >-
  Промислові ваги та системи DWS для логістики та електронної комерції.
  Високошвидкісні рішення для зважування посилок до 60 кг при швидкості 3.4 м/с
  з винятковою точністю. Оптимізовано для CEP-організацій, складів та
  розподільчих центрів з продуктивністю до 11,000 посилок на годину.
---
```

- [ ] **Step 3: Commit**

```bash
git add application/frontend/src/content/equipment/catchweighers/_index.en.md
git add application/frontend/src/content/equipment/catchweighers/_index.ua.md
git commit -m "feat(content): add catchweighers _index locale files"
```

______________________________________________________________________

## Task 5: Create new `_index` files for checkweighers

**Files:**

- Create: `application/frontend/src/content/equipment/checkweighers/_index.en.md`

- Create: `application/frontend/src/content/equipment/checkweighers/_index.ua.md`

- [ ] **Step 1: Create `_index.en.md`**

```markdown
---
icon: scale
order: 1
title: Checkweighers
description: >-
  High-precision dynamic checkweighers combining cutting-edge weighing
  technology with unsurpassed accuracy. Systems for food, pharmaceutical, and
  cosmetics industries with throughput rates up to 650 pcs/min, meeting
  international standards. Solutions with metal detection, wash-down design
  (IP69K), and GMP compliance for complete quality control.
---
```

- [ ] **Step 2: Create `_index.ua.md`**

```markdown
---
icon: scale
order: 1
title: Чеквейєри
description: >-
  Високоточні динамічні чеквейєри, що поєднують найсучасніші технології
  зважування з неперевершеною точністю. Обладнання для харчової, фармацевтичної
  та косметичної промисловості з продуктивністю до 650 шт/хв, що відповідає
  міжнародним стандартам. Рішення з металодетекцією, гігієнічним дизайном
  (IP69K) та відповідністю GMP для повного контролю якості.
---
```

- [ ] **Step 3: Commit**

```bash
git add application/frontend/src/content/equipment/checkweighers/_index.en.md
git add application/frontend/src/content/equipment/checkweighers/_index.ua.md
git commit -m "feat(content): add checkweighers _index locale files"
```

______________________________________________________________________

## Task 6: Delete redundant combined and old index files

**Files:**

- Delete: 11 files listed below

> ⚠️ This task must run **after** Tasks 4 and 5. The `index.en.md` / `index.ua.md` files are the source data used to create the `_index.*` files in those tasks. Do not delete them before `_index.*` files exist.

- [ ] **Step 1: Delete all combined bilingual `.md` files and old index files**

```powershell
$base = "application/frontend/src/content/equipment"
Remove-Item "$base/catchweighers/hc-sl.md"
Remove-Item "$base/catchweighers/hc-warehouse.md"
Remove-Item "$base/checkweighers/ec-e.md"
Remove-Item "$base/checkweighers/hc-a.md"
Remove-Item "$base/checkweighers/hc-m.md"
Remove-Item "$base/catchweighers/index.md"
Remove-Item "$base/catchweighers/index.en.md"
Remove-Item "$base/catchweighers/index.ua.md"
Remove-Item "$base/checkweighers/index.md"
Remove-Item "$base/checkweighers/index.en.md"
Remove-Item "$base/checkweighers/index.ua.md"
```

- [ ] **Step 2: Verify only the correct files remain**

```powershell
Get-ChildItem application/frontend/src/content/equipment -Recurse -Filter "*.md" | Select-Object FullName
```

Expected — exactly these files remain (14 total):

```
catchweighers/_index.en.md
catchweighers/_index.ua.md
catchweighers/hc-sl.en.md
catchweighers/hc-sl.ua.md
catchweighers/hc-warehouse.en.md
catchweighers/hc-warehouse.ua.md
checkweighers/_index.en.md
checkweighers/_index.ua.md
checkweighers/ec-e.en.md
checkweighers/ec-e.ua.md
checkweighers/hc-a.en.md
checkweighers/hc-a.ua.md
checkweighers/hc-m.en.md
checkweighers/hc-m.ua.md
```

- [ ] **Step 3: Commit**

```bash
git add -A application/frontend/src/content/equipment
git commit -m "chore(content): delete redundant combined and old index md files"
```

______________________________________________________________________

## Task 7: Migrate catchweighers product files — remove `category` field

**Files:**

- Modify: `application/frontend/src/content/equipment/catchweighers/hc-sl.en.md`
- Modify: `application/frontend/src/content/equipment/catchweighers/hc-sl.ua.md`
- Modify: `application/frontend/src/content/equipment/catchweighers/hc-warehouse.en.md`
- Modify: `application/frontend/src/content/equipment/catchweighers/hc-warehouse.ua.md`

The only change needed to these files is removing the `category: catchweighers` line from the frontmatter. All other fields (`title`, `description`, `specs`, `gallery`, `datasheet`, `order`, `industries`) are already in the correct flat format.

- [ ] **Step 1: Remove `category` from `hc-sl.en.md`**

Remove line `category: catchweighers` from the frontmatter. Result:

```markdown
---
title: HC-SL Catchweigher
order: 2
industries:
  - logistics
description: >-
  High-accuracy catchweigher for parcels up to 60 kg. Achieves speeds up to 2.9
  m/s with ±5g accuracy in calibrated mode. Features sandwich construction for
  rigid platform and noise reduction below 65 dB.
gallery:
  - /assets/equipment/hc-sl/csm_catchweigher-hc-sl-left_b9e714b4cd.webp
  - /assets/equipment/hc-sl/csm_catchweigher-hc-sl-front_0106966235.webp
  - /assets/equipment/hc-sl/csm_catchweigher-hc-sl-right_f0a1215e7f.webp
datasheet: /assets/equipment/hc-sl/datasheet.pdf
specs:
  - label: Max Speed
    value: 2.9 m/s
  - label: Weighing Range
    value: up to 60 kg
  - label: Accuracy
    value: ±5g
---
## High Weighing Accuracy and Throughput of Parcels
```

(The `...` above is a truncation marker — do NOT write `...` in the file. Keep every line of the markdown body after the closing `---` exactly as it is in the current file. Only the `category: catchweighers` frontmatter line is removed.)

- [ ] **Step 2: Remove `category` from `hc-sl.ua.md`**

Remove line `category: catchweighers` from the frontmatter. All other content unchanged.

- [ ] **Step 3: Remove `category` from `hc-warehouse.en.md`**

Remove line `category: catchweighers` from the frontmatter. All other content unchanged.

- [ ] **Step 4: Remove `category` from `hc-warehouse.ua.md`**

Remove line `category: catchweighers` from the frontmatter. All other content unchanged.

- [ ] **Step 5: Commit**

```bash
git add application/frontend/src/content/equipment/catchweighers/
git commit -m "feat(content): migrate catchweighers product files to flat i18n schema"
```

______________________________________________________________________

## Task 8: Migrate checkweighers product files — remove `category` field

**Files:**

- Modify: `application/frontend/src/content/equipment/checkweighers/ec-e.en.md`
- Modify: `application/frontend/src/content/equipment/checkweighers/ec-e.ua.md`
- Modify: `application/frontend/src/content/equipment/checkweighers/hc-a.en.md`
- Modify: `application/frontend/src/content/equipment/checkweighers/hc-a.ua.md`
- Modify: `application/frontend/src/content/equipment/checkweighers/hc-m.en.md`
- Modify: `application/frontend/src/content/equipment/checkweighers/hc-m.ua.md`

The only change needed is removing `category: checkweighers` from each frontmatter.

- [ ] **Step 1: Remove `category` from `ec-e.en.md`**

Remove line `category: checkweighers` from the frontmatter. All other content unchanged.

- [ ] **Step 2: Remove `category` from `ec-e.ua.md`**

Remove line `category: checkweighers` from the frontmatter. All other content unchanged.

- [ ] **Step 3: Remove `category` from `hc-a.en.md`**

Remove line `category: checkweighers` from the frontmatter. All other content unchanged.

- [ ] **Step 4: Remove `category` from `hc-a.ua.md`**

Remove line `category: checkweighers` from the frontmatter. All other content unchanged.

- [ ] **Step 5: Remove `category` from `hc-m.en.md`**

Remove line `category: checkweighers` from the frontmatter. All other content unchanged.

- [ ] **Step 6: Remove `category` from `hc-m.ua.md`**

Remove line `category: checkweighers` from the frontmatter. All other content unchanged.

- [ ] **Step 7: Commit**

```bash
git add application/frontend/src/content/equipment/checkweighers/
git commit -m "feat(content): migrate checkweighers product files to flat i18n schema"
```

______________________________________________________________________

## Task 9: Final verification

- [ ] **Step 1: Verify Astro build has no content collection errors**

```powershell
cd application/frontend
npx astro check
```

Expected: zero errors referencing `en-title`, `ua-title`, or any old prefixed field names. The schema in `config.ts` must validate cleanly against all `.en.md` and `.ua.md` files.

- [ ] **Step 2: Verify all expected files exist and no redundant files remain**

```powershell
Get-ChildItem application/frontend/src/content/equipment -Recurse -Filter "*.md" | Select-Object Name | Sort-Object Name
```

Expected file list:

```
_index.en.md   (×2, one per category)
_index.ua.md   (×2, one per category)
ec-e.en.md
ec-e.ua.md
hc-a.en.md
hc-a.ua.md
hc-m.en.md
hc-m.ua.md
hc-sl.en.md
hc-sl.ua.md
hc-warehouse.en.md
hc-warehouse.ua.md
```

No `index.md`, `index.en.md`, `index.ua.md`, or combined bilingual `*.md` files should appear.

- [ ] **Step 3: Verify `config.yml` YAML is valid**

```powershell
Get-Content application/frontend/public/admin/config.yml
```

Visually confirm: `i18n:`, `structure: multiple_files`, `locales: [en, ua]`, `nested:`, `index_file: "_index"`, `widget: "richtext"` all present.

- [ ] **Step 4: Commit final state**

```bash
git add -A
git commit -m "chore(cms): complete native i18n migration verification"
```
