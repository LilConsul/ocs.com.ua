# Design Spec: Comprehensive Interconnected JSON-LD Structured Data

## Context & Objectives

OS-Technology Ukraine (`ocs.com.ua`) is a B2B industrial equipment distributor (Wipotec, Mesutronic) specializing in checkweighers, catchweighers, metal detectors, x-ray inspection, and serialization systems.

This design establishes an interconnected Schema.org Knowledge Graph structure across all pages using JSON-LD (`@graph`), maximizing SEO indexing, entity recognition, and AI search discoverability.

______________________________________________________________________

## 1. Architecture & Graph Model

### 1.1 Canonical Entity URI Strategy

Every entity across all locales (`ua`, `en`) references stable canonical URIs:

- **Organization**: `{origin}/#organization` (shared between locales to represent one corporate entity)
- **LocalBusiness**: `{origin}/#localbusiness`
- **WebSite**: `{origin}/{lang}/#website`
- **WebPage**: `{canonicalPageUrl}#webpage`
- **BreadcrumbList**: `{canonicalPageUrl}#breadcrumb`
- **MainEntity**: `{canonicalPageUrl}#{entityType}` (e.g. `#product`, `#article`, `#itemlist`)

### 1.2 Interconnected Graph Flow

```
Organization / LocalBusiness (#organization)
       ▲                    ▲
       │ publisher          │ about / brand / seller
   WebSite (#website)       │
       ▲                    │
       │ isPartOf           │
    WebPage (#webpage) ─────┤
       │                    │
       ├── breadcrumb ──────► BreadcrumbList (#breadcrumb)
       └── mainEntity ──────► Product / Article / ItemList (#mainEntity)
```

______________________________________________________________________

## 2. Directory & Module Structure

Modular utilities located in [`src/lib/structured-data/`](../../application/frontend/src/lib/structured-data/):

```
application/frontend/src/lib/structured-data/
├── index.ts              # Public API & createPageGraph() helper
├── graph.ts              # Graph composer & canonical @id helpers
├── clean.ts              # Recursively strips undefined/null/empty keys
├── organization.ts       # Organization & LocalBusiness schema builders
├── website.ts            # WebSite schema builder
├── breadcrumb.ts         # BreadcrumbList schema builder
├── webpage.ts            # WebPage / AboutPage / ContactPage / CollectionPage builders
├── product.ts            # Product & inquiry offer builders
└── article.ts            # TechArticle schema builder
```

______________________________________________________________________

## 3. Entity Builders & Specifications

### 3.1 Organization & LocalBusiness (`organization.ts`)

- **Sources**: `data/company.json`, `data/documents.json`, `data/partners.json`
- **Fields**:
  - `@type`: `["Organization", "LocalBusiness"]`
  - `@id`: `{origin}/#organization`
  - `name`: Localized company name ("OS-Technology Ukraine" / "ОС-Технолоджи Україна")
  - `url`: `{origin}/{lang}/`
  - `logo`: Absolute URL to `/apple-touch-icon.png`
  - `telephone`, `email`: Sourced from `company.json`
  - `address`: `PostalAddress` localized by language
  - `geo`: `GeoCoordinates` (`latitude: 50.4578`, `longitude: 30.4024` for Beresteiskyi Ave 67, Kyiv)
  - `openingHoursSpecification`: Mon–Fri 09:00–18:00
  - `contactPoint`: `ContactPoint` (sales, contact person name, languages: `uk`, `en`)
  - `hasCredential`: Official distributor authorizations (Wipotec, Mesutronic) with absolute document URLs
  - `knowsAbout`: Core competencies (dynamic weighing, metal detection, x-ray inspection, track and trace)
  - `areaServed`: `{"@type": "Country", "name": "Ukraine"}`

### 3.2 WebSite (`website.ts`)

- **Fields**:
  - `@type`: `WebSite`
  - `@id`: `{origin}/{lang}/#website`
  - `name`: Localized name
  - `url`: `{origin}/{lang}/`
  - `inLanguage`: ISO lang (`uk` or `en`)
  - `publisher`: `{"@id": "{origin}/#organization"}`

### 3.3 BreadcrumbList (`breadcrumb.ts`)

- **Fields**:
  - `@type`: `BreadcrumbList`
  - `@id`: `{canonicalPageUrl}#breadcrumb`
  - `itemListElement`: Array of `ListItem`s (position, name, item URL)

### 3.4 Product Schema (`product.ts`)

- **Usage**: Equipment detail pages (`/[lang]/catalogue/equipment/[category]/[slug]`)
- **Fields**:
  - `@type`: `Product`
  - `@id`: `{canonicalPageUrl}#product`
  - `name`: Product title
  - `description`: Product overview / summary
  - `category`: Category title
  - `image`: Array of absolute image URLs from product gallery
  - `model`: Product model identifier
  - `brand` & `manufacturer`: `{"@id": "{origin}/#organization"}`
  - `additionalProperty`: Mapped technical specifications as `PropertyValue` array (`name`, `value`)
  - `subjectOf`: Linked technical datasheet `DigitalDocument` (when available)
  - `offers`: Inquiry presentation offer (`PriceSpecification`: "Price on request", `seller: {"@id": "{origin}/#organization"}`)

### 3.5 Article / TechArticle Schema (`article.ts`)

- **Usage**: Knowledge Base / Wiki pages (`/[lang]/wiki/[slug]`)
- **Fields**:
  - `@type`: `TechArticle`
  - `@id`: `{canonicalPageUrl}#article`
  - `headline`: Article title
  - `description`: Article summary
  - `image`: Cover image absolute URL
  - `inLanguage`: ISO lang (`uk` or `en`)
  - `mainEntityOfPage`: `{"@id": "{canonicalPageUrl}#webpage"}`
  - `author` & `publisher`: `{"@id": "{origin}/#organization"}`
  - `timeRequired`: ISO 8601 duration string (e.g. `PT4M` for 4 minutes read)
  - `wordCount`: Word count computed from markdown body

### 3.6 Collections & ItemLists (`webpage.ts`)

- **Usage**:
  - Category pages (`/[lang]/catalogue/equipment/[category]`)
  - Industry pages (`/[lang]/catalogue/industry/[slug]`)
  - Knowledge Base index (`/[lang]/wiki`)
- **Fields**:
  - `CollectionPage` (`@id: {canonicalPageUrl}#webpage`)
  - `mainEntity`: `ItemList` (`@id: {canonicalPageUrl}#itemlist`) with indexed `ListItem` entries linking to products or articles

______________________________________________________________________

## 4. Integration with Layout & Pages

### 4.1 Layout Component Integration (`Layout.astro`)

- Add optional `structuredData?: Record<string, unknown>` prop to `Layout.astro`.
- When provided, serialize inside `<head>`:
  ```astro
  {structuredData && (
    <script is:inline type="application/ld+json" set:html={JSON.stringify(structuredData)} />
  )}
  ```

### 4.2 Page Implementation Matrix

Every localized route will call `createPageGraph`:

1. `/[lang]/index.astro`: Homepage WebPage + WebSite + Organization
1. `/[lang]/about.astro`: AboutPage + Organization + Credentials
1. `/[lang]/contact.astro`: ContactPage + LocalBusiness + GeoCoordinates + ContactPoint
1. `/[lang]/catalogue/equipment/[category]/index.astro`: CollectionPage + Product ItemList
1. `/[lang]/catalogue/equipment/[category]/[slug].astro`: WebPage + Product (Specs, Gallery, Datasheet)
1. `/[lang]/catalogue/industry/[slug].astro`: CollectionPage + Industry Products ItemList
1. `/[lang]/wiki/index.astro`: CollectionPage + Articles ItemList
1. `/[lang]/wiki/[slug].astro`: TechArticle + WebPage

______________________________________________________________________

## 5. Verification & Testing

1. **Unit Tests**: `application/frontend/tests/structured-data.test.ts`
   - Test graph output for each page type in both `ua` and `en` locales.
   - Verify all `@id` cross-references and absence of empty/undefined fields.
   - Validate absolute URLs for images, datasheets, and credentials.
1. **Build & Type Check**:
   - `bun run typecheck` / `bun run check`
   - `bun run build`
   - `bun test`
