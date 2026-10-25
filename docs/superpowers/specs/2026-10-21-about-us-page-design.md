# About Us Page — Design Specification

Source Mockup: `docs/design/about-us/` (`code.html`, `DESIGN.md`, `screen.png`).
Target App: `application/frontend` (Astro static site, Node standalone adapter).

______________________________________________________________________

## 1. Goal

Build a high-performance, bilingual (`/en/about`, `/ua/about`) **About Us** page that communicates OS-Technology Ukraine's authority as the official exclusive distributor and engineering integration partner of **WIPOTEC GmbH** and **MESUTRONIC Gerätebau GmbH**.

The page is heavily optimized for **SEO and LLM indexing**, dynamically calculating all metrics, city hubs, and client equipment counts from `src/data/partners.json` and manufacturer documents from `src/data/documents.json`.

______________________________________________________________________

## 2. Scope

### In Scope

- **Hero Section (`AboutHero.astro`):**
  - Breadcrumbs (`Home` > `About Us`), H1 title, mission statement, partner badges (WIPOTEC, MESUTRONIC).
  - Dynamic KPI summary counters calculated from `partners.json` (Total Installed Systems, Checkweighers `cw`, Metal Detectors `md`, Track & Trace `tqs`).
- **Official Manufacturer Credentials (`ManufacturerCredentials.astro`):**
  - Dedicated cards for **WIPOTEC GmbH** (Kaiserslautern, Germany) and **MESUTRONIC Gerätebau GmbH** (Kirchberg im Wald, Germany).
  - Key technical capabilities list for each manufacturer.
  - Direct download links for official factory authorization letters from `src/data/documents.json` (`documents.wipotec` and `documents.mesutronic`).
- **Engineering Infrastructure Highlights (`InfrastructureHighlights.astro`):**
  - 3 core pillars: Certified Factory Engineers, Turnkey Line Commissioning (IFS/GMP compliant), Domestic Parts & Spare Warehouse in Kyiv.
- **Interactive Leaflet Ukraine Installation Map (`InteractiveUkraineMap.astro`):**
  - Interactive map centered on Ukraine utilizing clean industrial map tiles (CartoDB Positron / Voyager).
  - Lazy-loaded via `IntersectionObserver` when scrolled into view (0 impact on initial page load / Core Web Vitals).
  - Custom brand-styled pulsating city pins (`#b8006d`) representing aggregated city hubs (`Kyiv`, `Lviv`, `Odesa`, `Sumy`, `Cherkasy`, `Vinnytsia`, `Zhytomyr`).
  - Interactive **City Hub Inspection Drawer** updating dynamically upon clicking city pins, showing active equipment units and client facilities in that hub.
  - Sector statistics matrix side card (Food & Beverage, Pharma, Household & Packaging breakdown).
- **Enterprise Client Directory (`ClientDirectory.astro`):**
  - Sector filter tabs: `All Sectors`, `Food & Beverage`, `Pharmaceuticals`, `Household & Packaging`.
  - Static SSR-rendered client cards with partner logo, localized company name, sector badge, verified equipment breakdown counts (`MD`, `CW`, `TQS`), and plant locations.
  - Client-side tab filtering for fast visual switching without re-fetching.
- **Consultation CTA (`AboutCta.astro`):**
  - High-impact call to action directing users to the Contact page (`/[lang]/contact`) and sales consultation.
- **Bilingual i18n & Translation Workflow:**
  - Full EN/UA localization using `getInlineTranslations(lang)` and `src/i18n/ui.ts`.
- **SEO & Structured Data (JSON-LD):**
  - `AboutPage` and `Organization` / `LocalBusiness` structured schemas with credentials, areas served, and technical proficiencies (`knowsAbout`).

### Out of Scope

- Direct Leaflet map rendering for individual secret / imprecise facility addresses (grouped strictly by city hub).
- Modifying backend `/api/contact` (reuses existing endpoint and contact links).
- Hardcoding fake or unverified stats not backed by `partners.json`.

______________________________________________________________________

## 3. Architecture & Data Flow

### 3.1 Data Module (`src/lib/about/partners-data.ts`) & Automated Geocoding

Pure TypeScript helper module parsing and aggregating `partners.json`:

- **`EquipmentStats` interface:** `{ md: number; cw: number; tqs: number; total: number }`
- **`CityHub` interface:** `{ id: string; name: { en: string; ua: string }; coords: [number, number]; stats: EquipmentStats; clients: string[] }`
- **`calculateGlobalStats(partnersData)`:** Computes aggregate sums across all sectors (`food`, `household`, `pharma`).
- **`getCityCoordinates(city)` & Automated Geocoding Resolver (`src/lib/about/geocoding.ts`):**
  - Resolves city coordinates and localized names using a local cache in `src/data/city-coordinates.json`.
  - Automatically fetches coordinates via OpenStreetMap Nominatim / Geocoding API if a new city is added to `partners.json` and updates the cache, ensuring zero runtime latency, no API key exposure, and 100% build-time reliability.
- **`aggregateCityHubs(partnersData, coordinatesMap)`:** Dynamically aggregates equipment counts, partner client names, and coordinates per Ukrainian city discovered in `partners.json`.
- **`getSectorBreakdowns(partnersData)`:** Returns categorized statistics for Food, Pharma, and Household sectors.

### 3.2 Page Routing & Template (`src/pages/[lang]/about.astro`)

Static route utilizing `getStaticPaths` over supported languages (`en`, `ua`).

```astro
---
import AboutHero from "@/components/about/AboutHero.astro";
import ManufacturerCredentials from "@/components/about/ManufacturerCredentials.astro";
import InfrastructureHighlights from "@/components/about/InfrastructureHighlights.astro";
import InteractiveUkraineMap from "@/components/about/InteractiveUkraineMap.astro";
import ClientDirectory from "@/components/about/ClientDirectory.astro";
import AboutCta from "@/components/about/AboutCta.astro";
import Layout from "@/layouts/Layout.astro";
// Precomputed data passed down as props
---
```

______________________________________________________________________

## 4. Component Specifications

### 4.1 `AboutHero.astro`

- Renders semantic breadcrumbs and primary `<h1>`.
- Displays dynamic KPI stat grid:
  - Total Installed Systems (`stats.total`+)
  - 100% German Hardware (WIPOTEC & MESUTRONIC)
  - Dynamic Checkweighers count (`stats.cw`)
  - Metal Detectors count (`stats.md`)
  - Track & Trace serialization systems (`stats.tqs`)

### 4.2 `ManufacturerCredentials.astro`

- Displays two side-by-side cards for WIPOTEC GmbH and MESUTRONIC Gerätebau GmbH.
- Includes badge "Tier 1 Official Distributor" / "Authorized Partner".
- Includes verified technical capability checkmarks.
- Includes PDF download action button linking to `documentsData.wipotec` and `documentsData.mesutronic` from `src/data/documents.json`.

### 4.3 `InfrastructureHighlights.astro`

- 3-column card grid detailing:
  1. Factory-Certified Engineers (Trained at Kaiserslautern & Kirchberg).
  1. Turnkey Line Commissioning (IFS, GMP, HACCP compliant).
  1. 24/7 Domestic Parts Warehouse (Kyiv central depot).

### 4.4 `InteractiveUkraineMap.astro`

- Container with Leaflet map canvas and side/bottom hub info drawer.
- Injects city hub data as JSON `<script type="application/json" id="city-hubs-data">`.
- Lazy loads Leaflet CSS (`leaflet/dist/leaflet.css`) and JS via `IntersectionObserver`.
- Rendered with CartoDB Positron tiles for high-contrast, clean industrial look.
- Pulsing SVG markers with badge counters.
- Clicking a city pin updates the inspection card with active unit totals and local enterprise client plants.

### 4.5 `ClientDirectory.astro`

- Filter buttons for `all`, `food`, `pharma`, `household`.
- Responsive grid (1 col mobile, 2 col tablet, 3 col desktop) of client cards.
- Each card contains:
  - Client logo image with fallback container.
  - Sector category badge.
  - Localized client title (`name[lang]`).
  - Equipment tags: `X Checkweighers`, `Y Metal Detectors`, `Z Track & Trace` (if present).
  - Facility locations list.
  - Optional website link if available.

### 4.6 `AboutCta.astro`

- Banner with call to action: "Consult with Our Factory-Certified Engineers".
- Link button to `/${lang}/contact` and direct phone consultation link.

______________________________________________________________________

## 5. SEO & LLM Structured Data

Included inside `<Layout>` on `src/pages/[lang]/about.astro`:

1. **`AboutPage` Schema:**
   - URL, language (`en` / `uk`), name, breadcrumbs.
1. **`Organization` Schema:**
   - Legal name, official website, phone, email, headquarters address.
   - `knowsAbout`: Detailed list of industrial inspection domains (EMFR Checkweighers, X-Ray Scanners, Metal Detectors, Serialization).
   - `hasCredential`: Downloadable official manufacturer authorization certificates.
   - `areaServed`: Ukraine nationwide.

______________________________________________________________________

## 6. Testing & Validation Plan

1. **Unit / Helper Tests (`tests/lib/partners-data.test.ts`):**
   - Verify `calculateGlobalStats` correctly sums all items in `partners.json`.
   - Verify `aggregateCityHubs` correctly groups cities and calculates city-level stats.
   - Verify correct fallback handling for missing equipment or address fields.
1. **Page Build & Static Rendering:**
   - Verify `astro build` passes without errors and generates static `/en/about/index.html` and `/ua/about/index.html`.
1. **Interactive Functionality:**
   - Verify client filter buttons toggle client cards correctly.
   - Verify map initializes on scroll and pin clicks update the active city details drawer.
   - Verify PDF download buttons link to valid files.
