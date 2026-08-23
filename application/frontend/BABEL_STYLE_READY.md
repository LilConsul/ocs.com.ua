# Babel-Style i18n System - Complete

## What You Have Now

A complete Babel/gettext-style i18n system that generates `.po` files just like Python's Babel.

## New Files Created

### Core Scripts

- `scripts/i18n-extract-po.js` - Extracts `_()` calls to `.pot` and `.po` files
- `scripts/i18n-compile.js` - Compiles `.po` files to `ui.ts`

### Previous Files (Still There)

- `src/i18n/inline.ts` - Runtime `_()` function
- All migrated components using `_()` pattern
- Documentation files

## Babel-Style Workflow

### 1. Write Code with `_()`

```astro
---
import { getInlineTranslations } from "@/i18n";
const _ = getInlineTranslations(lang);
---
<h1>{_("Welcome to Our Website")}</h1>
```

### 2. Extract to .po Files

```bash
npm run i18n:extract
```

This generates:

- `locales/messages.pot` - Template file
- `locales/en.po` - English translations
- `locales/ua.po` - Ukrainian translations

### 3. Edit .po Files

Open `locales/ua.po` in any text editor or use Poedit:

```po
#: src/components/Header.tsx:15
msgid "Welcome to Our Website"
msgstr "Ласкаво просимо на наш сайт"

#: src/pages/index.astro:42
msgid "Contact Us"
msgstr "Зв'язатися з нами"
```

### 4. Compile to TypeScript

```bash
npm run i18n:compile
```

This generates `src/i18n/ui.ts` from your `.po` files.

### 5. Commit Everything

```bash
git add locales/*.po src/i18n/ui.ts
git commit -m "Add translations"
```

## Available Commands

```bash
npm run i18n:extract      # Extract _() calls to .po files
npm run i18n:compile      # Compile .po files to ui.ts
npm run i18n:init -- pl   # Initialize new language (e.g., Polish)
```

## File Structure

```
locales/
├── messages.pot          # Template (auto-generated, don't edit)
├── en.po                 # English (auto-generated from code)
└── ua.po                 # Ukrainian (EDIT THIS with translations)

src/i18n/
├── inline.ts             # Runtime _() function
├── ui.ts                 # Compiled output (auto-generated, don't edit)
└── utils.ts              # Legacy t() helpers

scripts/
├── i18n-extract-po.js    # Extraction to .po files
└── i18n-compile.js       # Compilation to TypeScript
```

## Complete Workflow Example

```bash
# 1. You write code
code src/components/MyComponent.astro
# Add: {_("Hello World")}

# 2. Extract strings
npm run i18n:extract
# Creates/updates locales/*.po files

# 3. Edit translations
code locales/ua.po
# Or use Poedit GUI: https://poedit.net/

# 4. Compile to TypeScript
npm run i18n:compile
# Updates src/i18n/ui.ts

# 5. Test
npm run dev
# Visit http://localhost:4321/ua

# 6. Commit
git add locales/*.po src/i18n/ui.ts
git commit -m "Add new translations"
```

## Tools You Can Use

### Text Editors

- **Any text editor** - .po files are plain text
- **VS Code** - Install "gettext" extension for syntax highlighting

### GUI Tools

- **Poedit** - https://poedit.net/ (Windows, Mac, Linux)
- **Lokalize** - KDE translation tool
- **Gtranslator** - GNOME translation tool

### Command Line

- **msgfmt** - Validate .po files
- **msgmerge** - Merge translations
- **msginit** - Initialize new languages

## Benefits

- **Industry Standard** - Same .po format as WordPress, Django, Rails, Babel
- **Tool Support** - Use professional translation tools (Poedit, etc.)
- **Version Control** - .po files are text, easy to diff
- **Translator Friendly** - Translators know .po format
- **Context Preserved** - File locations in comments
- **Type Safe** - Compiled to TypeScript

## Integration with Translation Services

.po files are supported by:

- **Crowdin** - Translation management platform
- **Weblate** - Web-based translation
- **Transifex** - Localization platform
- **POEditor** - Online translation editor

Just upload your `.pot` file and get back translated `.po` files!

## Documentation

- **Quick Reference**: `docs/i18n-quick-reference.md`
- **Full Guide**: `docs/i18n-inline-translation.md`
- **Technical Details**: `docs/i18n-implementation-details.md`

## Next Steps

1. **Run extraction** to generate .po files from your migrated code:

   ```bash
   npm run i18n:extract
   ```

1. **Edit `locales/ua.po`** to add Ukrainian translations

1. **Compile** to generate TypeScript:

   ```bash
   npm run i18n:compile
   ```

1. **Test** both languages:

   ```bash
   npm run dev
   ```

______________________________________________________________________

**You now have a professional Babel-style i18n system**

The system generates `.pot` and `.po` files just like Python's Babel, Ruby's i18n, PHP's gettext, and every other modern i18n framework.
