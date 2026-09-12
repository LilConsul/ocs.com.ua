# TinaCMS Setup Specification

**Date:** 2026-09-12
**Status:** In Progress
**Scope:** TinaCMS configuration for equipment catalogue (development environment)
**Parent Spec:** [2026-09-12-catalogue-cms-design.md](./2026-09-12-catalogue-cms-design.md)

## Overview

This document specifies the TinaCMS setup for the equipment catalogue system. The CMS will run in local/self-hosted mode during development, with no authentication or external dependencies.

**Out of Scope (for now):**

- Production deployment
- Authentication/authorization
- Admin route protection
- Cloud media management

## Prerequisites

- [x] TinaCMS already installed and running
- [ ] Astro Content Collections configured
- [ ] i18n system in place (en/ua languages)

## Content Structure

### Collections to Configure

1. **Categories Collection** - Equipment categories (Checkweighers, X-Ray, etc.)
1. **Equipment Collection** - Individual equipment items with bilingual content

### File Structure

```
src/content/
  categories/
    checkweighers.en.md
    checkweighers.ua.md
    catchweighers.en.md
    catchweighers.ua.md
    xray.en.md
    xray.ua.md
    metal-detectors.en.md
    metal-detectors.ua.md
    track-and-trace.en.md
    track-and-trace.ua.md
    miscellaneous.en.md
    miscellaneous.ua.md

  equipment/
    {category-slug}/
      {equipment-slug}/
        index.en.md          # English content
        index.ua.md          # Ukrainian content
        hero.jpg             # Shared assets
        gallery-1.jpg
        gallery-2.jpg
        datasheet.pdf

    # Examples:
    checkweighers/
      hc-m/
        index.en.md
        index.ua.md
        hero.jpg
        gallery-1.jpg
        datasheet.pdf
      hc-a/
        index.en.md
        index.ua.md
        hero.jpg
    xray/
      xr-3000/
        index.en.md
        index.ua.md
        hero.jpg
```

## TinaCMS Configuration

### Environment Variables

**File:** `.env.local` (already exists, verify these values)

```env
# Local development mode (no external services)
TINA_CLIENT_ID=local
TINA_TOKEN=local
TINA_BRANCH=main
```

### Configuration File

**File:** `tina/config.ts`

```typescript
import { defineConfig } from 'tinacms';

export default defineConfig({
  // Local mode configuration
  branch: process.env.TINA_BRANCH || 'main',
  clientId: process.env.TINA_CLIENT_ID || '',
  token: process.env.TINA_TOKEN || '',

  // Build configuration
  build: {
    outputFolder: 'admin',
    publicFolder: 'public',
  },

  // Media configuration - colocated with content
  media: {
    tina: {
      mediaRoot: 'src/content/equipment',
      publicFolder: 'src',
    },
  },

  schema: {
    collections: [
      // ========================================
      // CATEGORIES COLLECTION
      // ========================================
      {
        name: 'categories',
        label: 'Categories',
        path: 'src/content/categories',
        format: 'md',

        fields: [
          {
            type: 'string',
            name: 'title',
            label: 'Category Title',
            required: true,
            description: 'Display name (e.g., "Checkweighers")',
          },
          {
            type: 'string',
            name: 'description',
            label: 'Description',
            required: true,
            ui: { component: 'textarea' },
            description: 'Short description for category page',
          },
          {
            type: 'string',
            name: 'icon',
            label: 'Icon',
            description: 'Lucide icon name (e.g., "scale", "scan", "shield")',
            list: false,
          },
          {
            type: 'number',
            name: 'order',
            label: 'Display Order',
            required: true,
            description: 'Numeric sort order for navigation (lower = first)',
          },
          {
            type: 'string',
            name: 'notes',
            label: 'Internal Notes',
            ui: { component: 'textarea' },
            description: 'Internal notes about category requirements (not shown to users)',
          },
        ],

        // Filename handling for language suffix
        ui: {
          filename: {
            readonly: false,
            slugify: (values) => {
              // Create slug from title
              const slug = values.title
                ?.toLowerCase()
                .replace(/\s+/g, '-')
                .replace(/[^a-z0-9-]/g, '');

              // Get language from document metadata or default to 'en'
              // Note: You'll need to manually ensure .en.md or .ua.md suffix
              return slug;
            },
          },
        },
      },

      // ========================================
      // EQUIPMENT COLLECTION
      // ========================================
      {
        name: 'equipment',
        label: 'Equipment',
        path: 'src/content/equipment',
        format: 'md',

        ui: {
          // Allow creating and deleting equipment
          allowedActions: {
            create: true,
            delete: true,
          },

          // Always name content files as "index"
          filename: {
            readonly: false,
            slugify: () => 'index',
          },

          // Custom routing for nested structure
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
          // ========================================
          // BASIC INFORMATION
          // ========================================
          {
            type: 'string',
            name: 'title',
            label: 'Equipment Title',
            required: true,
            description: 'Full equipment name (e.g., "HC-M Checkweigher")',
          },
          {
            type: 'string',
            name: 'slug',
            label: 'URL Slug',
            required: true,
            description: 'URL-friendly identifier (e.g., "hc-m-checkweigher")',
          },
          {
            type: 'string',
            name: 'description',
            label: 'Short Description',
            required: true,
            ui: { component: 'textarea' },
            description: 'Brief description for catalogue card (2-3 sentences max)',
          },

          // ========================================
          // IMAGES
          // ========================================
          {
            type: 'image',
            name: 'heroImage',
            label: 'Hero Image',
            required: true,
            description: 'Main product image (recommended: 800x600px, JPG/PNG)',
          },
          {
            type: 'image',
            name: 'gallery',
            label: 'Gallery Images',
            list: true,
            description: 'Additional product photos (max 10 images)',
            ui: {
              max: 10,
            },
          },

          // ========================================
          // TECHNICAL SPECIFICATIONS (max 3 for cards)
          // ========================================
          {
            type: 'object',
            name: 'specs',
            label: 'Key Specifications',
            list: true,
            description: 'Maximum 3 specifications shown on catalogue cards',
            ui: {
              max: 3,
              itemProps: (item) => ({
                label: item?.label || 'New Specification',
              }),
            },
            fields: [
              {
                type: 'string',
                name: 'label',
                label: 'Label',
                required: true,
                description: 'Specification name (e.g., "Max Speed", "Belt Width")',
              },
              {
                type: 'string',
                name: 'value',
                label: 'Value',
                required: true,
                description: 'Specification value (e.g., "250 pcs/min", "300mm")',
              },
            ],
          },

          // ========================================
          // DOWNLOADABLE RESOURCES
          // ========================================
          {
            type: 'string',
            name: 'datasheet',
            label: 'Datasheet PDF',
            description: 'Path to technical datasheet PDF (e.g., "./datasheet.pdf")',
          },

          // ========================================
          // DETAILED CONTENT (markdown)
          // ========================================
          {
            type: 'rich-text',
            name: 'body',
            label: 'Technical Documentation',
            isBody: true,
            description: 'Detailed technical information, features, specifications (supports markdown)',
            templates: [
              {
                name: 'Heading',
                label: 'Heading',
                fields: [
                  {
                    name: 'text',
                    label: 'Text',
                    type: 'string',
                    required: true,
                  },
                  {
                    name: 'level',
                    label: 'Level',
                    type: 'number',
                    options: [2, 3, 4],
                    required: true,
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
});
```

## NPM Scripts

Verify these scripts exist in `package.json`:

```json
{
  "scripts": {
    "dev": "tinacms dev -c \"astro dev\"",
    "build": "astro build",
    "tina:init": "tinacms init"
  }
}
```

## Initial Category Setup

Create these category files manually (or via TinaCMS) to establish the structure:

### 1. Checkweighers (English)

**File:** `src/content/categories/checkweighers.en.md`

```markdown
---
title: Checkweighers
description: High-precision dynamic weighing systems for industrial applications, ensuring 100% weight control and compliance.
icon: scale
order: 1
notes: For general industries. For logistics warehouses, see Catchweighers.
---
```

### 2. Checkweighers (Ukrainian)

**File:** `src/content/categories/checkweighers.ua.md`

```markdown
---
title: Чекові ваги
description: Високоточні системи динамічного зважування для промислових застосувань, що забезпечують 100% контроль ваги та відповідність вимогам.
icon: scale
order: 1
notes: Для загальних галузей промисловості. Для логістичних складів дивіться Catchweighers.
---
```

### 3. Catchweighers (English)

**File:** `src/content/categories/catchweighers.en.md`

```markdown
---
title: Catchweighers
description: Specialized dynamic weighing systems optimized for high-speed logistics and warehouse operations.
icon: package
order: 2
notes: For logistic warehouses only. Displays max speed and display value.
---
```

### 4. Catchweighers (Ukrainian)

**File:** `src/content/categories/catchweighers.ua.md`

```markdown
---
title: Catchweighers
description: Спеціалізовані системи динамічного зважування, оптимізовані для високошвидкісної логістики та складських операцій.
icon: package
order: 2
notes: Тільки для логістичних складів. Відображає максимальну швидкість та відображуване значення.
---
```

### 5. X-Ray (English)

**File:** `src/content/categories/xray.en.md`

```markdown
---
title: X-Ray Inspection
description: Advanced X-ray inspection systems for foreign body detection and product quality control.
icon: scan
order: 3
notes: Specify belt width, weight category, type of product (bulk flow, standing).
---
```

### 6. X-Ray (Ukrainian)

**File:** `src/content/categories/xray.ua.md`

```markdown
---
title: Рентгенівська інспекція
description: Передові рентгенівські системи інспекції для виявлення сторонніх тіл та контролю якості продукції.
icon: scan
order: 3
notes: Вкажіть ширину стрічки, категорію ваги, тип продукту (сипучий потік, стоячий).
---
```

### 7. Metal Detectors (English)

**File:** `src/content/categories/metal-detectors.en.md`

```markdown
---
title: Metal Detectors
description: Industrial metal detection systems for food safety and product protection across various production environments.
icon: shield
order: 4
notes: Types include conveyor, gravity fall, pipeline, and meatline configurations.
---
```

### 8. Metal Detectors (Ukrainian)

**File:** `src/content/categories/metal-detectors.ua.md`

```markdown
---
title: Металодетектори
description: Промислові системи виявлення металу для безпеки харчових продуктів та захисту продукції в різних виробничих середовищах.
icon: shield
order: 4
notes: Типи включають конвеєрні, гравітаційні, трубопровідні та м'ясолінійні конфігурації.
---
```

### 9. Track & Trace (English)

**File:** `src/content/categories/track-and-trace.en.md`

```markdown
---
title: Track & Trace
description: Serialization and aggregation systems for product traceability, compliance, and supply chain visibility.
icon: qr-code
order: 5
notes: Includes serialization (2D code, 2D+weighing, tamper evidence) and aggregation systems.
---
```

### 10. Track & Trace (Ukrainian)

**File:** `src/content/categories/track-and-trace.ua.md`

```markdown
---
title: Відстеження та трасування
description: Системи серіалізації та агрегації для відстежуваності продукції, відповідності вимогам та видимості ланцюга постачання.
icon: qr-code
order: 5
notes: Включає серіалізацію (2D-код, 2D+зважування, захист від підробки) та системи агрегації.
---
```

### 11. Miscellaneous (English)

**File:** `src/content/categories/miscellaneous.en.md`

```markdown
---
title: Miscellaneous
description: Supporting products including software solutions, test pieces, and accessories for inspection systems.
icon: package-plus
order: 6
notes: Software, test pieces, and other accessories.
---
```

### 12. Miscellaneous (Ukrainian)

**File:** `src/content/categories/miscellaneous.ua.md`

```markdown
---
title: Різне
description: Допоміжні продукти, включаючи програмні рішення, тестові зразки та аксесуари для систем інспекції.
icon: package-plus
order: 6
notes: Програмне забезпечення, тестові зразки та інші аксесуари.
---
```

## Example Equipment Entry

To test the setup, create one sample equipment entry:

### Directory Structure

```
src/content/equipment/checkweighers/hc-m/
  index.en.md
  index.ua.md
  hero.jpg
  gallery-1.jpg
  datasheet.pdf
```

### English Content

**File:** `src/content/equipment/checkweighers/hc-m/index.en.md`

```markdown
---
title: HC-M Checkweigher
slug: hc-m-checkweigher
description: The standard for dynamic weighing, offering high precision and reliability for mid-range applications.
heroImage: ./hero.jpg
gallery:
  - ./gallery-1.jpg
datasheet: ./datasheet.pdf
specs:
  - label: Max Speed
    value: 250 pcs/min
  - label: Display Value
    value: 0.1g
  - label: Belt Width
    value: 300mm
---

## Technical Overview

The HC-M Checkweigher represents the industry standard for dynamic weighing applications, combining precision, reliability, and ease of integration.

## Key Features

- **EMFR Technology** - Electro Magnetic Force Restoration for superior accuracy
- **Stainless Steel Construction** - IP54 rated for harsh environments
- **Integrated Rejection** - Multiple rejection mechanisms available
- **Real-time SPC** - Statistical process control with trend analysis

## Specifications

### Weighing Performance
- Weighing range: 0-3000g
- Accuracy: ±0.1g
- Belt speed: up to 60 m/min
- Throughput: 250 products/minute

### Physical Dimensions
- Belt width: 300mm
- Belt length: 600mm
- Overall dimensions: 1200 x 800 x 1400mm
- Weight: 120kg

## Applications

Ideal for pharmaceutical, food, and cosmetics industries where precise weight control is critical for regulatory compliance and quality assurance.
```

### Ukrainian Content

**File:** `src/content/equipment/checkweighers/hc-m/index.ua.md`

```markdown
---
title: Чекові ваги HC-M
slug: hc-m-checkweigher
description: Стандарт динамічного зважування, що забезпечує високу точність та надійність для застосувань середнього рівня.
heroImage: ./hero.jpg
gallery:
  - ./gallery-1.jpg
datasheet: ./datasheet.pdf
specs:
  - label: Макс. швидкість
    value: 250 шт/хв
  - label: Відображуване значення
    value: 0.1г
  - label: Ширина стрічки
    value: 300мм
---

## Технічний огляд

Чекові ваги HC-M є промисловим стандартом для динамічного зважування, поєднуючи точність, надійність та простоту інтеграції.

## Ключові особливості

- **Технологія EMFR** - Електромагнітне відновлення сили для вищої точності
- **Конструкція з нержавіючої сталі** - Рейтинг IP54 для суворих умов
- **Інтегроване відхилення** - Доступні різні механізми відхилення
- **SPC у реальному часі** - Статистичний контроль процесу з аналізом тенденцій

## Специфікації

### Продуктивність зважування
- Діапазон зважування: 0-3000г
- Точність: ±0.1г
- Швидкість стрічки: до 60 м/хв
- Пропускна здатність: 250 продуктів/хвилину

### Фізичні розміри
- Ширина стрічки: 300мм
- Довжина стрічки: 600мм
- Загальні розміри: 1200 x 800 x 1400мм
- Вага: 120кг

## Застосування

Ідеально підходить для фармацевтичної, харчової та косметичної промисловості, де точний контроль ваги є критичним для відповідності нормативним вимогам та забезпечення якості.
```

## Development Workflow

### 1. Start Development Server

```bash
npm run dev
```

This starts:

- Astro dev server at `http://localhost:4321`
- TinaCMS admin at `http://localhost:4321/admin/index.html`

### 2. Access TinaCMS Admin

Navigate to: `http://localhost:4321/admin/index.html`

You should see:

- **Categories** collection (12 files: 6 categories × 2 languages)
- **Equipment** collection (initially 2 files: 1 equipment × 2 languages)

### 3. Edit Content

1. Click on "Equipment" or "Categories"
1. Select a file to edit
1. Make changes in the visual editor
1. Changes save automatically to markdown files
1. Git tracks all changes

### 4. Create New Equipment

1. Go to Equipment collection
1. Click "Create New"
1. Fill in required fields:
   - Title
   - Slug
   - Description
   - Hero Image (upload)
   - Specs (add 1-3)
1. Write detailed content in rich text editor
1. Save

**Important:** Remember to create BOTH language versions:

- `index.en.md`
- `index.ua.md`

## Validation Checklist

Before considering TinaCMS setup complete:

- [ ] TinaCMS admin loads at `/admin/index.html`
- [ ] Can see both "Categories" and "Equipment" collections
- [ ] Can edit existing category file
- [ ] Can create new equipment entry
- [ ] Can upload images to equipment folder
- [ ] Images colocate in correct folder (e.g., `checkweighers/hc-m/`)
- [ ] Can add/remove specs (max 3 enforced)
- [ ] Rich text editor works for body content
- [ ] Changes save to markdown files in `src/content/`
- [ ] Git shows modified/new files after saving

## Known Limitations (Development Mode)

1. **No authentication** - Anyone with URL can access `/admin`
1. **No content workflow** - Changes commit directly (no draft/publish)
1. **Manual language handling** - Must manually create `.en.md` and `.ua.md` files
1. **No asset optimization** - Images uploaded as-is (optimize externally)
1. **No category validation** - Can create equipment in non-existent category folder

## Troubleshooting

### Issue: TinaCMS admin shows blank page

**Solution:**

- Check `.env.local` has correct values
- Verify `tina/config.ts` has no syntax errors
- Check browser console for errors
- Try clearing cache and hard reload

### Issue: Media uploads don't work

**Solution:**

- Verify `media.tina.mediaRoot` points to existing directory
- Check file permissions on `src/content/equipment/`
- Try uploading smaller file (\<5MB)

### Issue: Changes don't save to files

**Solution:**

- Check file permissions on `src/content/`
- Verify git repository is not in detached HEAD state
- Check for file locks (close editors)

### Issue: Can't find equipment files in TinaCMS

**Solution:**

- Verify folder structure matches `{category}/{equipment}/index.{lang}.md`
- Check frontmatter is valid YAML
- Ensure filename is exactly `index.en.md` or `index.ua.md`

## Next Steps

After TinaCMS is working:

1. **Astro Integration** - Configure Content Collections to read TinaCMS files
1. **Schema Sync Validation** - Add automated check that Astro and TinaCMS schemas match
1. **Content Migration** - Import existing equipment data (if any)
1. **Editor Training** - Document workflow for content team
1. **Production Deployment** - Add authentication and route protection

## Success Criteria

TinaCMS setup is complete when:

✅ Admin interface accessible at `/admin/index.html`
✅ Can create/edit/delete categories in both languages
✅ Can create/edit/delete equipment entries
✅ Images upload and colocate with content
✅ Specs limited to 3 items
✅ Changes persist to markdown files
✅ All 6 categories created (en + ua)
✅ At least 1 sample equipment entry exists

______________________________________________________________________

**Status:** Ready for implementation
**Estimated Time:** 2-3 hours (including category creation and testing)
