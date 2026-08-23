# i18n Quick Reference (Babel-style)

## Usage

```astro
---
import { getInlineTranslations } from "@/i18n";
const _ = getInlineTranslations(lang);
---
<h1>{_("Your English text here")}</h1>
```

## Babel-Style Workflow

```bash
# 1. Extract strings to .po files
npm run i18n:extract

# 2. Edit locales/ua.po file to add translations

# 3. Compile .po files to TypeScript
npm run i18n:compile

# 4. Commit both .po files and compiled ui.ts
```

## File Structure

```
locales/
├── messages.pot    # Template (auto-generated)
├── en.po           # English translations (auto-generated)
└── ua.po           # Ukrainian translations (EDIT THIS)

src/i18n/ui.ts      # Compiled output (auto-generated, don't edit)
```

## PO File Format

```po
#: src/components/Header.tsx:15
msgid "Contact Us"
msgstr "Зв'язатися з нами"

#: src/pages/index.astro:42
msgid "Welcome to our website"
msgstr "Ласкаво просимо на наш сайт"
```

## Adding New Language

```bash
npm run i18n:init -- pl  # Initialize Polish translations
# Edit locales/pl.po
npm run i18n:compile
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

## Workflow Example

1. Write code with `_("English text")`
1. Run `npm run i18n:extract` → generates/updates `.po` files
1. Edit `locales/ua.po` in your text editor or with Poedit
1. Run `npm run i18n:compile` → generates `src/i18n/ui.ts`
1. Commit both `.po` files and `ui.ts`

## Tools

- **Poedit**: GUI editor for .po files (https://poedit.net/)
- **VS Code**: Extensions like "gettext" for .po syntax highlighting
- **Command line**: Edit .po files in any text editor

## Documentation

- 📘 Full Guide: `docs/i18n-inline-translation.md`
- 🔧 Technical: `docs/i18n-implementation-details.md`
- 💡 Example: `src/components/examples/InlineTranslationExample.astro`
