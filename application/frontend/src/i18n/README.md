# Internationalization (i18n)

This project uses Astro's native i18n routing system.

## Configuration

The i18n configuration is in `astro.config.mjs`:

```javascript
i18n: {
  defaultLocale: "ua",
  locales: ["ua", "en"],
  routing: { prefixDefaultLocale: true },
}
```

## Structure

```
src/
├── i18n/
│   ├── index.ts      # Main export file
│   ├── ui.ts         # Translation strings
│   └── utils.ts      # Helper functions
└── pages/
    ├── ua/           # Ukrainian pages
    │   └── index.astro
    ├── en/           # English pages
    │   └── index.astro
    └── index.astro   # Root redirect
```

## Usage

### Adding translations

Edit `src/i18n/ui.ts`:

```typescript
export const ui = {
  en: {
    'site.title': 'Hello World',
    'home.title': 'Hello World!',
  },
  ua: {
    'site.title': 'Привіт Світ',
    'home.title': 'Привіт Світ!',
  },
} as const;
```

### Using translations in pages

```astro
---
import { getLangFromUrl, useTranslations } from '@/i18n';

const lang = getLangFromUrl(Astro.url);
const t = useTranslations(lang);
---

<h1>{t('home.title')}</h1>
```

## URLs

- Ukrainian (default): `/ua/`
- English: `/en/`
- Root `/` redirects to `/ua/`

## Adding a new language

1. Add the locale to `astro.config.mjs`:

   ```javascript
   locales: ["ua", "en", "de"],
   ```

1. Add translations to `src/i18n/ui.ts`:

   ```typescript
   de: {
     'site.title': 'Hallo Welt',
   }
   ```

1. Create the pages directory: `src/pages/de/`

1. Update language selector in `src/i18n/ui.ts`:

   ```typescript
   export const languages = {
     en: 'English',
     ua: 'Українська',
     de: 'Deutsch',
   };
   ```
