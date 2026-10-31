# Wiki Pages Design Specification

## Overview

The Wiki section is a statically-generated, multi-language technical knowledge base and documentation library for OS-Technology Ukraine. It enables prospective and existing clients to learn about industrial weighing, metal detection, inspection systems, and operational best practices.

Content is authored and managed as flat Markdown files via Decap CMS and rendered using Astro 5 Content Collections (Content Layer). The design conforms strictly to the industrial aesthetic and typography system defined in `application/frontend/src/styles/global.css`.

______________________________________________________________________

## Architecture & Data Flow

```mermaid
graph TD
    CMS[Decap CMS /admin] -->|Commits Markdown| Repo[src/content/wiki/*.md]
    Repo -->|Astro Content Layer| Collection[Content Collection: wiki]
    Collection --> Helper[src/lib/wiki-utils.ts]
    Helper --> IndexPage[src/pages/[lang]/wiki/index.astro]
    Helper --> ArticlePage[src/pages/[lang]/wiki/[slug].astro]
    ArticlePage --> Render[Astro render entry: Content + Headings]
    Render --> ArticleView[Article + Mobile/Desktop TOC + Sidebar]
```

### Routing Structure

- `/[lang]/wiki` — Wiki index page displaying all articles.
- `/[lang]/wiki/[slug]` — Individual wiki article page.
- Available for both supported locales: `ua` (default) and `en`.

______________________________________________________________________

## 1. Decap CMS & Content Collection Schema

### File Organization

Articles live directly in `application/frontend/src/content/wiki/` as flat localized markdown files:

- Ukrainian: `src/content/wiki/<slug>.ua.md`
- English: `src/content/wiki/<slug>.en.md`

### Decap CMS Configuration (`_config.template.yml`)

Added as a new top-level collection:

```yaml
- name: "wiki"
  label: "Wiki"
  label_singular: "Wiki Article"
  description: "Knowledge base and technical articles."
  folder: "application/frontend/src/content/wiki"
  create: true
  delete: true
  i18n: true
  preview_path: "{{locale}}/wiki/{{filename}}"
  sortable_fields: ["commit_date", "order", "title"]
  fields:
    - { label: "Title", name: "title", widget: "string", i18n: true }
    - { label: "Description / Summary", name: "description", widget: "text", required: false, i18n: true, hint: "Brief summary shown on index cards and in SEO meta tags" }
    - label: "Cover Image"
      name: "coverImage"
      widget: "image"
      required: false
      i18n: duplicate
      media_processing:
        enabled: true
        format:
          enabled: true
          default: webp
        quality: 85
        strip_metadata: true
        width: 1400
        height: null
        aspect_ratio: 16x9
    - { label: "Order", name: "order", widget: "number", value_type: "int", default: 0, required: false, i18n: duplicate, hint: "Sorting priority (lower numbers appear first)" }
    - { label: "Related Articles", name: "related", widget: "relation", collection: "wiki", search_fields: ["title"], value_field: "{{slug}}", display_fields: ["title"], multiple: true, required: false, i18n: duplicate }
    - { label: "Body", name: "body", widget: "markdown", required: true, i18n: true }
```

### Astro Content Collection Schema (`src/content.config.ts`)

```typescript
import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

const wiki = defineCollection({
  loader: glob({
    pattern: "**/!(_index)*.md",
    base: "./src/content/wiki",
  }),
  schema: z.object({
    title: z.string(),
    description: z.string().nullish(),
    coverImage: z.string().nullish(),
    order: z.number().nullish(),
    related: z.array(z.string()).nullish(),
  }),
});

export const collections = {
  equipment,
  wiki,
};
```

______________________________________________________________________

## 2. Utility Layer (`src/lib/wiki-utils.ts`)

Dedicated helpers mirroring `src/lib/content-utils.ts`:

- `getWikiLocale(entry: WikiEntry): Locale`: Extracts locale (`ua` or `en`) from entry ID based on suffix.
- `getWikiSlug(entry: WikiEntry): string`: Extracts base slug (e.g. `hc-a-calibration` from `hc-a-calibrationua`).
- `filterWikiByLocale(entries: WikiEntry[], locale: Locale): WikiEntry[]`: Filters entries by active locale.
- `sortWikiArticles(entries: WikiEntry[]): WikiEntry[]`: Sorts articles primarily by `order` (ascending, default 999), secondarily by `title`.
- `calculateReadingMinutes(content: string): number`: Computes estimated read time (default 200 words per minute, min 1 min).
- `findWikiTranslation(entry: WikiEntry, targetLocale: Locale, allEntries: WikiEntry[]): WikiEntry | undefined`: Locates corresponding translated file for language switching.
- `getWikiCoverImage(entry: WikiEntry, allEntries: WikiEntry[]): string | undefined`: Returns entry's cover image or falls back to `ua` default locale.

______________________________________________________________________

## 3. UI Component Structure (`src/components/wiki/`)

```
src/components/wiki/
├── WikiCard.astro          # Card used in Wiki index grid & related articles
├── WikiSidebar.astro       # Sticky desktop sidebar / mobile drawer for article browsing
├── WikiToc.astro           # Table of contents (desktop sticky right rail + mobile accordion)
├── WikiProgressBar.astro   # Viewport top reading progress bar
├── WikiPagination.astro    # Prev/Next article navigation buttons
└── WikiCta.astro           # Consultation/Contact callout banner
```

### Component Details

1. **`WikiCard.astro`**

   - **Props:** `entry: WikiEntry`, `lang: Lang`, `readMinutes: number`.
   - **Visuals:** Industrial card container (`bg-surface-lowest border border-border-subtle hover:border-secondary/40 rounded-xl transition-all`).
   - **Elements:** Optional 16:9 cover image with subtle border, reading time badge with Clock icon, article title (`font-headline-lg`), summary (`font-body-md text-industrial-gray`), and "Read article" footer link with ArrowRight icon.

1. **`WikiSidebar.astro`**

   - **Props:** `articles: WikiEntry[]`, `currentSlug: string`, `lang: Lang`.
   - **Desktop (`lg`+):** Sticky left column (`sticky top-24 self-start`).
   - **Mobile (\<`lg`):** `<details>` collapsible accordion with summary label.
   - **Active State:** Highlights current article with `border-secondary bg-secondary/5 font-semibold text-foreground`.

1. **`WikiToc.astro`**

   - **Props:** `headings: MarkdownHeading[]`, `mobile?: boolean`, `lang: Lang`.
   - Filters headings (`depth: 2` and `depth: 3`).
   - **Mobile:** Embedded inside collapsible `<details>` card above article body.
   - **Desktop:** Sticky right column (`xl:block sticky top-24`).
   - **Scrollspy Script:** `IntersectionObserver` observing heading anchors and applying active link highlight (`border-secondary text-secondary font-medium`).

1. **`WikiProgressBar.astro`**

   - Fixed top bar (`fixed top-0 left-0 h-1 bg-secondary z-50 origin-left scale-x-0`).
   - Window scroll listener throttled with `requestAnimationFrame` tracking `article` bounding rect.

1. **`WikiPagination.astro`**

   - **Props:** `prev?: WikiEntry`, `next?: WikiEntry`, `lang: Lang`.
   - 2-column grid linking to previous and next articles in the sort sequence.

1. **`WikiCta.astro`**

   - **Props:** `lang: Lang`.
   - High-contrast industrial CTA card (`bg-primary text-primary-foreground rounded-xl p-6 sm:p-8`) inviting technical consultations, linking to `/[lang]/contact`.

______________________________________________________________________

## 4. Pages & Layout

### Wiki Index (`src/pages/[lang]/wiki/index.astro`)

- **Static Paths:** Generates `lang: "ua"` and `lang: "en"`.
- **SEO:** Title "База знань" / "Knowledge Base", canonical URL, language alternates.
- **Header / Hero:**
  - Eyebrow label with animated rule (`eyebrow-rule`).
  - Display title: `font-display-lg text-foreground`.
  - Descriptive lead paragraph: `font-body-md text-industrial-gray max-w-2xl`.
- **Content Grid:**
  - Responsive grid (`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6`).
  - Renders `WikiCard` for each sorted article.

### Wiki Article Page (`src/pages/[lang]/wiki/[slug].astro`)

- **Static Paths:** Generates routes for all slugs across both languages.
- **Layout Grid:**
  - Mobile: Single column.
  - Large (`lg`): 2 columns (`[16rem_minmax(0,1fr)]`).
  - Extra Large (`xl`): 3 columns (`[16rem_minmax(0,1fr)_14rem]`).
- **Reading Progress:** Includes `<WikiProgressBar />`.
- **Left Column:** `<WikiSidebar articles={allArticles} currentSlug={currentSlug} lang={lang} />`.
- **Center Column:**
  - Breadcrumb: `Головна (Home) / База знань (Wiki) / <Article Title>`.
  - Header: Title (`font-display-lg`), summary (`font-body-md`), estimated read time badge.
  - Cover Image: If present, displayed with `rounded-xl border border-border-subtle`.
  - Mobile TOC: `<WikiToc headings={headings} mobile lang={lang} />`.
  - Content: `<Content />` inside `.prose .wiki-content`.
  - Navigation: `<WikiPagination prev={prevArticle} next={nextArticle} lang={lang} />`.
  - Related: Optional 2-column grid of `<WikiCard>` for articles listed in `related`.
  - CTA: `<WikiCta lang={lang} />`.
- **Right Column:** `<WikiToc headings={headings} lang={lang} />`.

______________________________________________________________________

## 5. Styling & Visual System

- Typography and color tokens align with `src/styles/global.css`:
  - Headings: `IBM Plex Sans Variable` (`--font-heading`).
  - Body: `Inter Variable` (`--font-sans`).
  - Monospace & Technical badges: `JetBrains Mono` (`--font-technical-data`).
  - Accents: `--color-secondary` (`oklch(0.485 0.215 343)` / industrial magenta/red accent).
  - Backgrounds: `--color-surface-container`, `--color-surface-lowest`, `--color-surface-muted`.
- Inline images within Markdown body automatically receive:
  - `border: 1px solid var(--color-border-subtle)`
  - `border-radius: var(--radius-lg)`
  - `max-width: 100%`
  - Responsive spacing (`my-6`).
- Responsive tables inside Markdown wrap in horizontally scrollable containers.

______________________________________________________________________

## 6. Internationalization (i18n)

- UI translation keys added to `src/i18n/ui.ts` for `"en"` and `"ua"`:
  - `wiki.title`: "База знань" / "Knowledge Base"
  - `wiki.description`: "Технічні статті, інструкції та керівництва з експлуатації промислового обладнання." / "Technical articles, guides, and operational documentation for industrial equipment."
  - `wiki.readTime`: "хв читання" / "min read"
  - `wiki.toc`: "Зміст статті" / "On this page"
  - `wiki.allArticles`: "Всі статті" / "All articles"
  - `wiki.previous`: "Попередня стаття" / "Previous article"
  - `wiki.next`: "Наступна стаття" / "Next article"
  - `wiki.related`: "Схожі статті" / "Related articles"
  - `wiki.ctaTitle`: "Потрібна консультація щодо обладнання?" / "Need technical consultation?"
  - `wiki.ctaText`: "Наші інженери допоможуть підібрати оптимальне рішення для вашої виробничої лінії." / "Our engineers will help you choose the optimal solution for your production line."
  - `wiki.ctaButton`: "Зв'язатися з нами" / "Contact us"
