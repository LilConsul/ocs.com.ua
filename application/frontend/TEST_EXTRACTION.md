# Testing i18n Extraction

## Files Migrated

✅ `src/components/homepage/HeroSection.astro`
✅ `src/components/homepage/StatsSection.astro`
✅ `src/components/homepage/IndustriesSection.astro`
✅ `src/pages/[lang]/index.astro`
✅ `src/layouts/Layout.astro`
✅ `src/components/examples/InlineTranslationExample.astro`

## Next Steps

Run the extraction script to generate all translations:

```bash
npm run i18n:extract
```

This will find all `_()` calls and prompt for Ukrainian translations.

## Expected Strings to Extract

From the code migration, these strings should be extracted:

### HeroSection

- "Industrial checkweigher equipment"
- "Official Wipotec Partner"
- "Official Mesutronic Partner"
- "High-Speed Dynamic Weighing Systems"
- "German Quality in Ukraine"
- "Precision dynamic checkweighers, serialization and aggregation systems for food, pharma, and logistics. Over 300 installations across Ukraine since 2013."
- "Contact Us"
- "View Products"

### StatsSection

- "Clients"
- "Years in Ukraine"
- "Systems Installed"

### IndustriesSection

- "Industries We Serve"
- "Equipment for Every Industry"
- "Weighing and inspection systems that meet FDA, IFS, BRC, and GMP standards for Ukrainian manufacturers."
- "Food Production"
- "Hygienic checkweighers and inspection systems for food safety compliance (FDA, IFS, BRC)."
- "Learn More"
- "Pharmaceutical"
- "Precision weighing and Track & Trace serialization systems for pharma industry compliance."
- "Cosmetics"
- "Filling control and quality inspection systems."
- "Logistics"
- "High-speed weighing for distribution centers."
- "All Industries"
- "View specialized solutions"

### PartnersSection (from index.astro)

- "Our Clients"
- "Trusted by Leading Ukrainian Manufacturers"
- "We supply and service weighing systems for major food, pharmaceutical, and chemical companies across Ukraine since 2013."
- "Food Industry"
- "Household Products"
- "Pharmaceutical"
- "Installations"
- "Systems installed at manufacturing facilities across Ukraine."
- "Years Experience"
- "Technical expertise and service support since 2013."
- "Client Retention"
- "Long-term partnerships through reliable support and service."

### Site Metadata (from index.astro)

- "OS-Technology Ukraine | Industrial Weighing & Inspection Systems"
- "Dynamic checkweighers, serialization and aggregation systems for food, pharmaceutical, and logistics industries in Ukraine"

### Navigation (from Layout.astro)

- "Products"
- "Solutions"
- "Industries"
- "About"
- "Language"

### Example Component

- "Example Component with Inline Translations"
- "This component demonstrates the new gettext-style i18n workflow. Write English text directly in your code, then extract and translate."
- "How to use"
- "Import getInlineTranslations from @/i18n"
- "Call it with the current language"
- "Use \_() with English text"
- "Run npm run i18n:extract"
- "Benefits"
- "No manual key naming"
- "Readable source code"
- "Type-safe translations"
- "Automatic extraction"
- "Learn More" (duplicate)

**Total:** ~50 unique strings to translate
