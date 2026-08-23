# Inline Translation System (Gettext-style Workflow)

This project uses a **gettext-style i18n workflow** where you write English text directly in your code using the `_()` function, then extract it to generate translation files.

## Quick Start

### 1. Use `_()` in your code

Import and use the inline translation function:

```astro
---
import { getInlineTranslations } from "@/i18n";

const { lang } = Astro.props;
const _ = getInlineTranslations(lang);
---

<h1>{_("Welcome to Our Website")}</h1>
<p>{_("We provide industrial weighing solutions")}</p>
<button>{_("Contact Us")}</button>
```

Or in React components:

```tsx
import { getInlineTranslations } from "@/i18n";

export function MyComponent({ lang }: { lang: "en" | "ua" }) {
  const _ = getInlineTranslations(lang);

  return (
    <div>
      <h1>{_("Product Catalog")}</h1>
      <p>{_("Browse our complete range")}</p>
    </div>
  );
}
```

### 2. Extract translations

Run the extraction command to find all `_()` calls and add translations:

```bash
npm run i18n:extract
```

This will:

- Scan all `.astro`, `.tsx`, and `.ts` files for `_()` calls
- Show you each English string found
- Prompt you to enter the Ukrainian translation
- Update `src/i18n/ui.ts` automatically

### 3. Preview before extracting (optional)

See what would be extracted without modifying files:

```bash
npm run i18n:extract:dry
```

## How It Works

### Key Generation

English text is automatically converted to translation keys:

```
"Welcome to Our Website" → "inline.welcome_to_our_website"
"Contact Us"            → "inline.contact_us"
"24/7 Support"          → "inline.24_7_support"
```

Rules:

- Lowercase
- Non-alphanumeric characters become underscores
- Prefixed with `inline.` to distinguish from manual keys
- Limited to 80 characters

### Runtime Behavior

At runtime, the `_()` function:

1. Converts English text to a key
1. Looks up the translation in `ui.ts`
1. Falls back to the English text if translation is missing

This means **untranslated strings still display** (in English) rather than showing a key like `"inline.contact_us"`.

### TypeScript Safety

Full type safety is maintained:

```typescript
// src/i18n/ui.ts (auto-generated)
export const ui = {
  en: {
    "inline.welcome_to_our_website": "Welcome to Our Website",
    "inline.contact_us": "Contact Us",
  },
  ua: {
    "inline.welcome_to_our_website": "Ласкаво просимо на наш сайт",
    "inline.contact_us": "Зв'язатися з нами",
  },
} as const;
```

All keys are type-checked at compile time.

## Coexistence with Manual Keys

Both translation patterns work together:

```astro
---
import { getTranslations, getInlineTranslations } from "@/i18n";

const { lang } = Astro.props;
const t = getTranslations(lang);  // Manual keys
const _ = getInlineTranslations(lang);  // Inline text
---

<!-- Manual key (old way) -->
<h1>{t("hero.title")}</h1>

<!-- Inline text (new way) -->
<p>{_("Discover our premium products")}</p>
```

You can gradually migrate from `t()` to `_()` as you work on files.

## Best Practices

### ✅ DO

- **Use descriptive English text**: `_("Submit Contact Form")` not `_("Submit")`
- **Keep strings complete**: `_("Added to cart")` not `_("Added to") + " cart"`
- **Extract after adding new strings**: Run `npm run i18n:extract` before committing
- **Review dry-run first**: Use `npm run i18n:extract:dry` to preview changes

### ❌ DON'T

- **Don't use variables**: `_("Hello " + name)` won't extract correctly
- **Don't split strings**: `_("Part 1") + _("Part 2")` loses context
- **Don't use computed strings**: `_(someVariable)` can't be extracted
- **Don't commit untranslated strings**: Always run extraction after adding `_()`

## Migration Guide

### From Manual Keys to Inline Text

**Before:**

```astro
---
const t = getTranslations(lang);
---
<h1>{t("hero.title")}</h1>
<p>{t("hero.description")}</p>
```

**After:**

```astro
---
const _ = getInlineTranslations(lang);
---
<h1>{_("High-Speed Dynamic Weighing Systems")}</h1>
<p>{_("Precision equipment for quality control")}</p>
```

**Steps:**

1. Replace `getTranslations` with `getInlineTranslations`
1. Replace `t("key")` with `_("English text")`
1. Copy English text from `src/i18n/ui.ts`
1. Run `npm run i18n:extract`
1. Enter Ukrainian translations when prompted
1. Delete old manual keys from `ui.ts` if no longer used

## Advanced Usage

### Dynamic Content

For dynamic content, use template strings **outside** the `_()` function:

```tsx
// ❌ Wrong - variable inside _()
{_(`Hello, ${userName}`)}

// ✅ Correct - variable outside _()
{_("Hello") + ", " + userName}

// ✅ Better - separate format
{_("Hello,")} {userName}
```

### Pluralization

For plural forms, use separate strings:

```tsx
const count = items.length;
const text = count === 1
  ? _("1 item in cart")
  : `${count} ${_("items in cart")}`;
```

### Context-Specific Translations

If the same English text needs different translations based on context, add a context suffix:

```tsx
{_("Close")}              // "Закрити" (verb - close window)
{_("Close (adj)")}        // "Близько" (adjective - close distance)
```

Then manually edit the keys in `ui.ts` if needed.

## Troubleshooting

### "No \_() calls found"

- Check that you're using `_()` not `t()`
- Ensure files are in `src/` directory
- Verify file extensions are `.astro`, `.tsx`, or `.ts`

### "Could not parse ui.ts"

- The extraction script expects a specific format
- Don't manually modify the structure of `export const ui = {...}`
- Run `npm run check:fix` to ensure valid syntax

### "Translation cannot be empty"

- All translations must have a value
- Press Ctrl+C to cancel and restart if needed
- You can add a temporary translation and update it later

### Extraction misses some strings

- Extraction looks for the pattern `_("text")` or `_('text')`
- Template strings `` _(`text`) `` are supported
- Dynamic content like `_(variable)` cannot be extracted

## Files Reference

### Core Files

- `src/i18n/inline.ts` - Runtime `_()` function and key generator
- `src/i18n/ui.ts` - Translation storage (auto-updated by extraction)
- `scripts/i18n-extract.js` - Extraction tool

### Configuration

No configuration needed - it works out of the box!

## Examples

See `src/components/homepage/` for examples of components using both `t()` and `_()` patterns.

______________________________________________________________________

**Need help?** Check the extraction script with `npm run i18n:extract:dry` first to understand what it will do.
