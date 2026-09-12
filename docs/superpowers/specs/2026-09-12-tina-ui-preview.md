# Option 4 (Modified) with Option A File Structure - TinaCMS UI Preview

## What Content Editors Will See

### File Structure in TinaCMS

**Equipment Collection List:**

```
📁 Equipment Catalogue
  📁 checkweighers
    📄 hc-m.md          ← Click to edit
    📄 hc-a.md
    📄 hc-wd.md
  📁 xray
    📄 xr-3000.md
  📁 metal-detectors
    📄 md-conveyor.md
```

**Benefits:**

- ✅ Clear equipment names visible immediately
- ✅ No confusing "index.md" everywhere
- ✅ Easy to scan and find what you need

______________________________________________________________________

### Creating New Equipment

**Step 1:** Click "Create New" in Equipment Collection

**Step 2:** TinaCMS asks for initial info to generate filename

```
┌─────────────────────────────────────────────┐
│ Create New Equipment                        │
├─────────────────────────────────────────────┤
│ Equipment Name (English):                   │
│ ┌─────────────────────────────────────────┐ │
│ │ HC-M Checkweigher                       │ │
│ └─────────────────────────────────────────┘ │
│                                             │
│ Category:                                   │
│ ┌─────────────────────────────────────────┐ │
│ │ ▼ checkweighers                         │ │
│ └─────────────────────────────────────────┘ │
│                                             │
│ → Will create: checkweighers/hc-m-checkweigher.md
│                                             │
│              [Create Equipment]             │
└─────────────────────────────────────────────┘
```

**Step 3:** Fill in the full form (see below)

______________________________________________________________________

### 📝 Title (Multilingual)

```
┌─────────────────────────────────────────────┐
│ 🇬🇧 English                                  │
│ ┌─────────────────────────────────────────┐ │
│ │ HC-M Checkweigher                       │ │
│ └─────────────────────────────────────────┘ │
│                                             │
│ 🇺🇦 Ukrainian                                │
│ ┌─────────────────────────────────────────┐ │
│ │ Чекові ваги HC-M                        │ │
│ └─────────────────────────────────────────┘ │
└─────────────────────────────────────────────┘
```

______________________________________________________________________

### 📝 Short Description (Multilingual)

```
┌─────────────────────────────────────────────┐
│ 🇬🇧 English                                  │
│ ┌─────────────────────────────────────────┐ │
│ │ The standard for dynamic weighing,      │ │
│ │ offering high precision and reliability │ │
│ │ for mid-range applications.             │ │
│ └─────────────────────────────────────────┘ │
│                                             │
│ 🇺🇦 Ukrainian                                │
│ ┌─────────────────────────────────────────┐ │
│ │ Стандарт динамічного зважування, що     │ │
│ │ забезпечує високу точність та           │ │
│ │ надійність для застосувань...           │ │
│ └─────────────────────────────────────────┘ │
└─────────────────────────────────────────────┘
```

______________________________________________________________________

### 🖼️ Hero Image

```
┌─────────────────────────────────────────────┐
│ [Upload Image] or [Browse...]              │
│                                             │
│ 📁 ./_assets/hc-m/hero.jpg                  │
│ ┌────────────────┐                          │
│ │                │                          │
│ │  [Image        │                          │
│ │   Preview]     │                          │
│ │                │                          │
│ └────────────────┘                          │
└─────────────────────────────────────────────┘
```

**Note:** TinaCMS media picker automatically saves to `./_assets/hc-m/` folder

______________________________________________________________________

### 🖼️ Gallery Images (Max 10)

```
┌─────────────────────────────────────────────┐
│ [+ Add Image]                               │
│                                             │
│ 1. 📁 ./_assets/hc-m/gallery-1.jpg [Remove] │
│ 2. 📁 ./_assets/hc-m/gallery-2.jpg [Remove] │
│ 3. [Add another image...]                   │
└─────────────────────────────────────────────┘
```

______________________________________________________________________

### ⚙️ Specifications (Max 3)

```
┌─────────────────────────────────────────────┐
│ [+ Add Specification]                       │
│                                             │
│ ─── Specification 1 ───                     │
│   Label (Multilingual)                      │
│   🇬🇧 English:  [Max Speed            ]     │
│   🇺🇦 Ukrainian: [Макс. швидкість      ]     │
│   Value:        [250 pcs/min          ]     │
│   [Remove]                                  │
│                                             │
│ ─── Specification 2 ───                     │
│   Label (Multilingual)                      │
│   🇬🇧 English:  [Display Value        ]     │
│   🇺🇦 Ukrainian: [Відображуване значення]    │
│   Value:        [0.1g                 ]     │
│   [Remove]                                  │
│                                             │
│ ─── Specification 3 ───                     │
│   Label (Multilingual)                      │
│   🇬🇧 English:  [Belt Width           ]     │
│   🇺🇦 Ukrainian: [Ширина стрічки       ]     │
│   Value:        [300mm                ]     │
│   [Remove]                                  │
└─────────────────────────────────────────────┘
```

______________________________________________________________________

### 📄 Datasheet PDF Path

```
┌─────────────────────────────────────────────┐
│ Path to PDF:                                │
│ ┌─────────────────────────────────────────┐ │
│ │ ./_assets/hc-m/datasheet.pdf            │ │
│ └─────────────────────────────────────────┘ │
└─────────────────────────────────────────────┘
```

______________________________________________________________________

### 📝 Technical Documentation (🇬🇧 English)

```
┌─────────────────────────────────────────────┐
│ [B] [I] [U] [H1] [H2] [H3] [•] [1.]        │ ← Rich text toolbar
├─────────────────────────────────────────────┤
│                                             │
│ ## Technical Overview                       │
│                                             │
│ The HC-M Checkweigher represents the        │
│ industry standard for dynamic weighing      │
│ applications, combining precision,          │
│ reliability, and ease of integration.       │
│                                             │
│ ## Key Features                             │
│                                             │
│ - **EMFR Technology** - Electro Magnetic    │
│   Force Restoration for superior accuracy   │
│ - **Stainless Steel Construction** - IP54   │
│   rated for harsh environments              │
│                                             │
│ [... continues ...]                         │
│                                             │
└─────────────────────────────────────────────┘
```

______________________________________________________________________

### 📝 Technical Documentation (🇺🇦 Ukrainian)

```
┌─────────────────────────────────────────────┐
│ [B] [I] [U] [H1] [H2] [H3] [•] [1.]        │ ← Rich text toolbar
├─────────────────────────────────────────────┤
│                                             │
│ ## Технічний огляд                          │
│                                             │
│ Чекові ваги HC-M є промисловим стандартом   │
│ для динамічного зважування, поєднуючи       │
│ точність, надійність та простоту            │
│ інтеграції.                                 │
│                                             │
│ ## Ключові особливості                      │
│                                             │
│ - **Технологія EMFR** - Електромагнітне     │
│   відновлення сили для вищої точності       │
│ - **Конструкція з нержавіючої сталі** -     │
│   Рейтинг IP54 для суворих умов             │
│                                             │
│ [... continues ...]                         │
│                                             │
└─────────────────────────────────────────────┘
```

______________________________________________________________________

### 💾 Save Button

```
┌─────────────────────────────────────────────┐
│              [Save Changes]                 │
└─────────────────────────────────────────────┘
```

______________________________________________________________________

## What Happens When Editor Saves

1. ✅ TinaCMS validates all required fields
1. ✅ Writes to `src/content/equipment/checkweighers/hc-m.md`
1. ✅ Saves assets to `src/content/equipment/checkweighers/_assets/hc-m/`
1. ✅ Git tracks the changes
1. ✅ Astro rebuilds the site
1. ✅ Both `/en/catalogue/checkweighers/hc-m` and `/ua/catalogue/checkweighers/hc-m` are updated

______________________________________________________________________

## TinaCMS File Browser View

When editor opens "Equipment Catalogue" they see:

```
📂 Equipment Catalogue (24 items)

  📁 catchweighers (5 items)
    📄 cwl-series.md
    📄 cwm-series.md
    📄 industrial-scale.md
    📄 logistics-checkweigher.md
    📄 warehouse-system.md

  📁 checkweighers (8 items)
    📄 hc-a.md               ← Clear equipment names!
    📄 hc-m.md
    📄 hc-wd.md
    📄 precision-lab.md
    📄 pharmaceutical-line.md
    📄 food-grade-system.md
    📄 compact-model.md
    📄 heavy-duty.md

  📁 metal-detectors (4 items)
    📄 md-conveyor.md
    📄 md-gravity.md
    📄 md-pipeline.md
    📄 md-meatline.md

  📁 xray (3 items)
    📄 xr-3000.md
    📄 xr-5000.md
    📄 xr-bulk-flow.md

  📁 track-and-trace (3 items)
    📄 serialization-2d.md
    📄 aggregation-system.md
    📄 tamper-evidence.md

  📁 miscellaneous (1 item)
    📄 test-pieces.md
```

**Benefits:**

- ✅ Scan equipment names at a glance
- ✅ No "index.md" confusion
- ✅ Category organization clear
- ✅ File count visible per category

______________________________________________________________________

## Editor Checklist (Built Into UI)

Content editor sees this flow:

1. ✅ **Title** - Fill in both English and Ukrainian
1. ✅ **Description** - Fill in both English and Ukrainian
1. ✅ **Hero Image** - Upload once (shared between languages)
1. ✅ **Gallery** - Upload images (shared between languages)
1. ✅ **Specs** - Add 1-3 specs with multilingual labels
1. ✅ **English Documentation** - Write full technical content
1. ✅ **Ukrainian Documentation** - Write full technical content
1. ✅ **Save** - Both languages published together

______________________________________________________________________

## Key Benefits for Content Team

### ✅ Can't Forget Translations

- Both languages are visible in one form
- Can't save without filling in required fields
- No "oops, I forgot to create the Ukrainian version"

### ✅ Side-by-Side Comparison

- Easy to see if English/Ukrainian are in sync
- Can check that content length is similar
- Spot missing translations immediately

### ✅ Full Rich Text Editing

- Both language sections get full WYSIWYG editor
- No manual markdown syntax needed
- Bold, italic, headings, lists all work

### ✅ Single File Management

- One file to find, edit, delete
- Assets colocated in same folder
- Simpler content organization

______________________________________________________________________

## Example: Editing Existing Equipment

**Scenario:** Update the "Max Speed" specification value for HC-M

1. Navigate to TinaCMS admin: `/admin/index.html`
1. Click "Equipment Catalogue"
1. Navigate to `checkweighers` folder
1. Click `hc-m.md` (not "index.md"! ✅)
1. Scroll to "Specifications" section
1. Find "Max Speed / Макс. швидкість" row
1. Change value from `250 pcs/min` to `300 pcs/min`
1. Click "Save Changes"

**Result:** Both English and Ukrainian pages now show 300 pcs/min

______________________________________________________________________

## Comparison: What This Looks Like vs Separate Files

### With Separate Files (Option 2):

```
Files in TinaCMS:
├─ checkweighers/hc-m/index.en.md   ← Edit English here
└─ checkweighers/hc-m/index.ua.md   ← Edit Ukrainian here

Editor must:
1. Open index.en.md
2. Update content
3. Save
4. Go back to file list
5. Open index.ua.md
6. Update content (remember what you changed!)
7. Save
```

### With One File (Option 4 + Option A):

```
Files in TinaCMS:
└─ checkweighers/hc-m.md            ← Edit both languages here

Editor does:
1. Open hc-m.md (clear filename!)
2. See English and Ukrainian side-by-side
3. Update both at once
4. Save
```

**Time saved:** ~50% fewer clicks, guaranteed consistency, clearer filenames

______________________________________________________________________

## How URLs Work

### File Structure

```
equipment/
  checkweighers/
    hc-m.md          ← Filename becomes the slug
    _assets/
      hc-m/
        hero.jpg
```

### Generated URLs

- English: `/en/catalogue/checkweighers/hc-m`
- Ukrainian: `/ua/catalogue/checkweighers/hc-m`

**Slug extraction:**

- File: `checkweighers/hc-m.md`
- Category: `checkweighers` (parent folder)
- Slug: `hc-m` (filename without extension)

**Same slug, different language content rendered**

______________________________________________________________________

## Technical Implementation (For Developers)

### Astro Page Component Pseudo-code

```typescript
// src/pages/[lang]/catalogue/[category]/[slug].astro

const { item, lang } = Astro.props;

// Render language-specific content
<h1>{item.data.title[lang]}</h1>
<p>{item.data.description[lang]}</p>

// Render language-specific body
const englishBody = await item.data.bodyEn.render();
const ukrainianBody = await item.data.bodyUa.render();
const content = lang === 'en' ? englishBody : ukrainianBody;

<Content content={content} />
```

Simple, clean, no complex parsing needed.

______________________________________________________________________

**Summary:** This approach gives content editors a clean, intuitive UI with both languages visible at once, full rich text editing, and guaranteed synchronization between translations.
