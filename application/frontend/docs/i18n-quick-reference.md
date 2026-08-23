# i18n Quick Reference

## Usage

```astro
---
import { getInlineTranslations } from "@/i18n";
const _ = getInlineTranslations(lang);
---
<h1>{_("Your English text here")}</h1>
```

## Commands

```bash
npm run i18n:extract      # Extract and translate
npm run i18n:extract:dry  # Preview only
```

## How It Works

1. Write: `_("Contact Us")`
1. Extract: `npm run i18n:extract`
1. Translate: Enter Ukrainian when prompted
1. Result: Auto-updates `src/i18n/ui.ts`

## Key Generation

```
"Contact Us"           → inline.contact_us
"24/7 Support"         → inline.24_7_support
"E-commerce Platform"  → inline.e_commerce_platform
```

## ✅ DO

```astro
✅ _("Complete English sentence")
✅ _("Contact Us")
✅ const text = _("Hello") + ", " + userName
```

## ❌ DON'T

```astro
❌ _(variable)
❌ _(`Template ${literal}`)
❌ _("Part 1") + _("Part 2")
```

## Documentation

- 📘 User Guide: `docs/i18n-inline-translation.md`
- 🔧 Technical Details: `docs/i18n-implementation-details.md`
- 📋 Implementation Summary: `docs/i18n-implementation-summary.md`
- 💡 Example: `src/components/examples/InlineTranslationExample.astro`
