# OCS.com.ua Main Page Implementation - Design Specification

**Date:** 2026-05-31
**Project:** OCS.com.ua Industrial Equipment Website - Main Page
**Status:** Draft for Review
**Parent Spec:** [OCS Website Redesign](./2026-05-31-ocs-website-redesign-design.md)

## Executive Summary

Implementation of the main homepage for ocs.com.ua with header, footer, and core content sections. This is the first phase of the website redesign, focusing on establishing the foundational layout, bilingual content structure, and component architecture using Astro + React Islands approach.

**Key Goals:**

- Bilingual homepage (Ukrainian/English) with JSON-based content
- Header with navigation and language switcher
- Hero carousel showcasing three industries (Food, Pharma, Logistics)
- Industry overview, featured equipment, benefits, and contact sections
- Footer with company info and links
- Static HTML generation with minimal JavaScript hydration
- shadcn/ui components with radix-lyra preset

## Architecture Overview

### Technology Stack

**Framework & Build:**

- Astro 6.4.2 for static site generation
- React 19.2.6 for interactive islands
- TypeScript for type safety
- Tailwind CSS v4 for styling

**UI Components:**

- shadcn/ui with radix-lyra preset (already configured)
- Radix UI primitives (base: radix)
- lucide-react for icons
- Framer Motion for carousel animations

**Fonts:**

- IBM Plex Sans Variable (headings)
- Inter Variable (body text)

### Component Architecture

```
Layout.astro (page wrapper)
├── Header.astro (static Astro component)
│   ├── Logo (prominently sized, larger than nav)
│   ├── Navigation (Equipment | Industries | News | Service | Contact)
│   └── LanguageSwitcher.tsx (React island, client:load)
├── HeroCarousel.tsx (React island, client:load)
│   └── 3 slides: Food, Pharma, Logistics industries
├── IndustriesSection.astro (static)
│   └── 3 industry cards with shadcn Card components
├── FeaturedEquipment.astro (static)
│   └── Equipment showcase grid with shadcn Card
├── WhyChooseUs.astro (static)
│   └── Benefits list with lucide-react icons
├── ContactForm.tsx (React island, client:load)
│   └── Form with shadcn Input, Textarea, Button
└── Footer.astro (static)
    ├── Company info & logo
    ├── Quick links (Equipment, Industries, Contact)
    ├── Contact details (phone, email, address)
    ├── Social media icons
    ├── LanguageSwitcher.tsx (React island, client:load)
    └── Copyright notice
```

**React Islands Strategy:**
Only three components require client-side JavaScript:

1. **HeroCarousel.tsx** (~15KB) - Framer Motion transitions, auto-rotate
1. **LanguageSwitcher.tsx** (~2KB) - Toggle between /ua/ and /en/ routes
1. **ContactForm.tsx** (~5KB) - Form validation and submission

Total JavaScript: ~22KB (gzipped ~8KB)

All other components render to pure static HTML with zero JavaScript.

## Content Structure

### JSON Content Files

**Location:** `application/frontend/src/content/{locale}/`

#### 1. `homepage.json` (en/ua)

```json
{
  "hero": {
    "slides": [
      {
        "id": "food-industry",
        "title": "Food Industry Solutions",
        "description": "High-precision equipment for food processing and packaging",
        "ctaText": "Explore Food Solutions",
        "ctaLink": "/en/industries/food",
        "backgroundImage": "/images/hero/food-industry.jpg",
        "accentColor": "blue"
      },
      {
        "id": "pharma-industry",
        "title": "Pharmaceutical Excellence",
        "description": "Compliant weighing and inspection systems",
        "ctaText": "View Pharma Equipment",
        "ctaLink": "/en/industries/pharma",
        "backgroundImage": "/images/hero/pharma-industry.jpg",
        "accentColor": "green"
      },
      {
        "id": "logistics-industry",
        "title": "Logistics & Distribution",
        "description": "Automated sorting and quality control",
        "ctaText": "Discover Logistics Solutions",
        "ctaLink": "/en/industries/logistics",
        "backgroundImage": "/images/hero/logistics-industry.jpg",
        "accentColor": "purple"
      }
    ]
  },
  "industries": {
    "title": "Industries We Serve",
    "description": "Specialized solutions for diverse sectors",
    "cards": [
      {
        "id": "food",
        "name": "Food Industry",
        "description": "Quality control and packaging solutions",
        "icon": "utensils",
        "link": "/en/industries/food",
        "image": "/images/industries/food-thumb.jpg"
      },
      {
        "id": "pharma",
        "name": "Pharmaceutical",
        "description": "Compliant weighing and inspection",
        "icon": "pill",
        "link": "/en/industries/pharma",
        "image": "/images/industries/pharma-thumb.jpg"
      },
      {
        "id": "logistics",
        "name": "Logistics",
        "description": "Automated sorting and distribution",
        "icon": "truck",
        "link": "/en/industries/logistics",
        "image": "/images/industries/logistics-thumb.jpg"
      }
    ]
  },
  "featuredEquipment": {
    "title": "Featured Equipment",
    "description": "Our most popular solutions",
    "equipmentIds": ["checkweigher-ema-300", "metal-detector-md-500", "xray-inspector-xi-700"]
  },
  "whyChooseUs": {
    "title": "Why Choose OCS",
    "benefits": [
      {
        "icon": "award",
        "title": "Industry Leader",
        "description": "Over 30 years of experience in industrial equipment"
      },
      {
        "icon": "shield-check",
        "title": "Quality Assurance",
        "description": "ISO certified with rigorous testing standards"
      },
      {
        "icon": "headphones",
        "title": "Expert Support",
        "description": "24/7 technical support and maintenance services"
      },
      {
        "icon": "globe",
        "title": "Global Reach",
        "description": "Serving clients across Europe and beyond"
      }
    ]
  },
  "contactForm": {
    "title": "Get In Touch",
    "description": "Have questions? We're here to help.",
    "fields": {
      "name": "Full Name",
      "email": "Email Address",
      "phone": "Phone Number",
      "message": "Your Message"
    },
    "submitButton": "Send Message",
    "successMessage": "Thank you! We'll get back to you soon.",
    "errorMessage": "Something went wrong. Please try again."
  }
}
```

#### 2. `navigation.json` (en/ua)

```json
{
  "header": {
    "logo": {
      "src": "/images/ocs-logo.svg",
      "alt": "OCS - Industrial Equipment Solutions"
    },
    "menu": [
      {
        "id": "equipment",
        "label": "Equipment",
        "url": "/en/equipment"
      },
      {
        "id": "industries",
        "label": "Industries",
        "url": "/en/industries"
      },
      {
        "id": "news",
        "label": "News",
        "url": "/en/news"
      },
      {
        "id": "service",
        "label": "Service",
        "url": "/en/service"
      },
      {
        "id": "contact",
        "label": "Contact",
        "url": "/en/contact"
      }
    ]
  },
  "footer": {
    "quickLinks": [
      {
        "label": "Equipment",
        "url": "/en/equipment"
      },
      {
        "label": "Industries",
        "url": "/en/industries"
      },
      {
        "label": "Contact",
        "url": "/en/contact"
      }
    ]
  }
}
```

#### 3. `site-config.json` (en/ua)

```json
{
  "company": {
    "name": "OCS",
    "fullName": "OCS Industrial Equipment Solutions",
    "tagline": "Precision Equipment for Modern Industry",
    "description": "Leading provider of industrial weighing, inspection, and quality control equipment"
  },
  "contact": {
    "phone": "+380 XX XXX XXXX",
    "email": "info@ocs.com.ua",
    "address": {
      "street": "Street Address",
      "city": "Kyiv",
      "country": "Ukraine",
      "postalCode": "XXXXX"
    }
  },
  "social": {
    "facebook": "https://facebook.com/ocs",
    "linkedin": "https://linkedin.com/company/ocs",
    "instagram": "https://instagram.com/ocs",
    "youtube": "https://youtube.com/ocs"
  },
  "seo": {
    "title": "OCS - Industrial Equipment Solutions | Ukraine",
    "description": "Leading provider of industrial weighing, inspection, and quality control equipment for food, pharmaceutical, and logistics industries.",
    "keywords": ["industrial equipment", "checkweighers", "metal detectors", "quality control", "Ukraine"],
    "ogImage": "/images/og-image.jpg"
  },
  "copyright": "© 2026 OCS. All rights reserved."
}
```

### TypeScript Type Definitions

**Location:** `application/frontend/src/types/content.ts`

```typescript
export interface HeroSlide {
  id: string;
  title: string;
  description: string;
  ctaText: string;
  ctaLink: string;
  backgroundImage: string;
  accentColor: string;
}

export interface IndustryCard {
  id: string;
  name: string;
  description: string;
  icon: string;
  link: string;
  image: string;
}

export interface Benefit {
  icon: string;
  title: string;
  description: string;
}

export interface HomepageContent {
  hero: {
    slides: HeroSlide[];
  };
  industries: {
    title: string;
    description: string;
    cards: IndustryCard[];
  };
  featuredEquipment: {
    title: string;
    description: string;
    equipmentIds: string[];
  };
  whyChooseUs: {
    title: string;
    benefits: Benefit[];
  };
  contactForm: {
    title: string;
    description: string;
    fields: Record<string, string>;
    submitButton: string;
    successMessage: string;
    errorMessage: string;
  };
}

export interface NavigationContent {
  header: {
    logo: {
      src: string;
      alt: string;
    };
    menu: Array<{
      id: string;
      label: string;
      url: string;
    }>;
  };
  footer: {
    quickLinks: Array<{
      label: string;
      url: string;
    }>;
  };
}

export interface SiteConfig {
  company: {
    name: string;
    fullName: string;
    tagline: string;
    description: string;
  };
  contact: {
    phone: string;
    email: string;
    address: {
      street: string;
      city: string;
      country: string;
      postalCode: string;
    };
  };
  social: {
    facebook?: string;
    linkedin?: string;
    instagram?: string;
    youtube?: string;
  };
  seo: {
    title: string;
    description: string;
    keywords: string[];
    ogImage: string;
  };
  copyright: string;
}
```

## Routing & Internationalization

### URL Structure

```
/                    → redirects to /ua/ (default Ukrainian)
/ua/                 → Ukrainian homepage
/en/                 → English homepage
/ua/equipment        → Ukrainian equipment page (future)
/en/equipment        → English equipment page (future)
```

### Astro i18n Configuration

**File:** `application/frontend/astro.config.mjs`

```javascript
export default defineConfig({
  i18n: {
    defaultLocale: 'ua',
    locales: ['ua', 'en'],
    routing: {
      prefixDefaultLocale: true
    }
  }
});
```

### Language Switcher Implementation

**Component:** `LanguageSwitcher.tsx`

- Reads current path to determine active language
- Generates alternate language URL by replacing locale prefix
- Renders as toggle button with flag icons
- Placed in both header (top-right) and footer (bottom-right)
- Uses `client:load` directive for immediate interactivity

### Content Loading Utility

**File:** `application/frontend/src/lib/content.ts`

```typescript
import type { HomepageContent, NavigationContent, SiteConfig } from '@/types/content';

export async function loadContent<T>(locale: string, filename: string): Promise<T> {
  try {
    const content = await import(`../content/${locale}/${filename}.json`);
    return content.default;
  } catch (error) {
    // Fallback to English if Ukrainian content missing
    if (locale === 'ua') {
      console.warn(`Content not found for ua/${filename}, falling back to en`);
      const fallback = await import(`../content/en/${filename}.json`);
      return fallback.default;
    }
    throw error;
  }
}

export async function loadHomepage(locale: string): Promise<HomepageContent> {
  return loadContent<HomepageContent>(locale, 'homepage');
}

export async function loadNavigation(locale: string): Promise<NavigationContent> {
  return loadContent<NavigationContent>(locale, 'navigation');
}

export async function loadSiteConfig(locale: string): Promise<SiteConfig> {
  return loadContent<SiteConfig>(locale, 'site-config');
}
```

## Component Implementation Details

### 1. Header Component

**File:** `application/frontend/src/components/Header.astro`

**Features:**

- Logo prominently sized (larger than navigation buttons)
- Horizontal navigation menu: Equipment | Industries | News | Service | Contact
- Language switcher in top-right corner
- Sticky header on scroll with subtle shadow
- Mobile: Hamburger menu (collapsible navigation)

**Styling:**

- Clean, minimal button style with hover effects
- Transparent background with backdrop blur on scroll
- Logo height: ~60px, nav buttons: ~40px
- Mobile breakpoint: \< 768px

**Implementation Notes:**

- Static Astro component (no client-side JS except language switcher)
- Navigation links loaded from `navigation.json`
- Mobile menu toggle uses CSS-only approach (checkbox hack) or minimal vanilla JS

### 2. Hero Carousel Component

**File:** `application/frontend/src/components/HeroCarousel.tsx`

**Features:**

- Full-width carousel with 3 slides (Food, Pharma, Logistics)
- Auto-rotate every 5 seconds
- Pause on hover
- Manual navigation: Previous/Next buttons + dot indicators
- Smooth Framer Motion transitions (slide + fade)
- Background images with overlay gradient for text readability
- Industry-specific accent colors

**Implementation:**

```tsx
"use client";

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { HeroSlide } from '@/types/content';

interface HeroCarouselProps {
  slides: HeroSlide[];
}

export function HeroCarousel({ slides }: HeroCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  // Auto-rotate logic
  useEffect(() => {
    if (isPaused) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % slides.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [isPaused, slides.length]);

  // Navigation handlers
  const goToSlide = (index: number) => setCurrentIndex(index);
  const goToPrevious = () => setCurrentIndex((prev) => (prev - 1 + slides.length) % slides.length);
  const goToNext = () => setCurrentIndex((prev) => (prev + 1) % slides.length);

  return (
    <div
      className="relative h-[600px] overflow-hidden"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={currentIndex}
          initial={{ opacity: 0, x: 100 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -100 }}
          transition={{ duration: 0.5 }}
          className="absolute inset-0"
        >
          {/* Slide content */}
        </motion.div>
      </AnimatePresence>

      {/* Navigation controls */}
      <Button onClick={goToPrevious} className="absolute left-4 top-1/2">
        <ChevronLeft data-icon="inline-start" />
      </Button>
      <Button onClick={goToNext} className="absolute right-4 top-1/2">
        <ChevronRight data-icon="inline-end" />
      </Button>

      {/* Dot indicators */}
      <div className="absolute bottom-4 left-1/2 flex gap-2">
        {slides.map((_, index) => (
          <button
            key={index}
            onClick={() => goToSlide(index)}
            className={cn(
              "size-3 rounded-full transition-colors",
              index === currentIndex ? "bg-primary" : "bg-muted"
            )}
          />
        ))}
      </div>
    </div>
  );
}
```

### 3. Industries Section Component

**File:** `application/frontend/src/components/IndustriesSection.astro`

**Features:**

- Section title and description
- 3 industry cards in responsive grid
- Each card: image, icon, name, description, link
- Hover effects on cards
- Uses shadcn Card component

**Layout:**

- Desktop: 3 columns
- Tablet: 2 columns
- Mobile: 1 column

**shadcn Components:**

- `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`

### 4. Featured Equipment Component

**File:** `application/frontend/src/components/FeaturedEquipment.astro`

**Features:**

- Section title and description
- Equipment grid (3-4 items)
- Each item: image, name, short description, "Learn More" link
- Uses shadcn Card component

**Implementation:**

- Loads equipment data by IDs from `homepage.json`
- Equipment details from separate equipment JSON files (future)
- For now, placeholder data structure

### 5. Why Choose Us Component

**File:** `application/frontend/src/components/WhyChooseUs.astro`

**Features:**

- Section title
- 4 benefit cards in grid
- Each card: lucide-react icon, title, description
- Clean, minimal design

**Layout:**

- Desktop: 4 columns
- Tablet: 2 columns
- Mobile: 1 column

### 6. Contact Form Component

**File:** `application/frontend/src/components/ContactForm.tsx`

**Features:**

- Form fields: Name, Email, Phone, Message
- Client-side validation
- Submit button with loading state
- Success/error feedback using shadcn Alert
- Form submission (placeholder - will connect to backend later)

**shadcn Components:**

- `Input`, `Textarea`, `Button`, `Alert`, `FieldGroup`, `Field`, `FieldLabel`

**Implementation:**

```tsx
"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Alert } from '@/components/ui/alert';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';

export function ContactForm({ content }: { content: any }) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    message: ''
  });
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');

    // Placeholder submission logic
    setTimeout(() => {
      setStatus('success');
    }, 1000);
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="name">{content.fields.name}</FieldLabel>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />
        </Field>
        {/* Other fields... */}
      </FieldGroup>

      <Button type="submit" disabled={status === 'loading'}>
        {status === 'loading' ? 'Sending...' : content.submitButton}
      </Button>

      {status === 'success' && (
        <Alert variant="success">{content.successMessage}</Alert>
      )}
      {status === 'error' && (
        <Alert variant="destructive">{content.errorMessage}</Alert>
      )}
    </form>
  );
}
```

### 7. Footer Component

**File:** `application/frontend/src/components/Footer.astro`

**Features:**

- 4-column layout (desktop) / stacked (mobile)
- Column 1: Company logo, tagline, description
- Column 2: Quick links (Equipment, Industries, Contact)
- Column 3: Contact details (phone, email, address)
- Column 4: Social media icons, language switcher
- Bottom bar: Copyright notice

**Styling:**

- Dark background (bg-muted or bg-background)
- Separator line above footer
- Consistent spacing and typography

## Styling & Design System

### shadcn/ui Configuration

**Current Setup:**

- Style: `radix-lyra`
- Base: `radix` (Radix UI primitives)
- Icon Library: `lucide-react`
- Theme: Pink accent with neutral base
- Chart Color: Teal
- Font: Inter (body), IBM Plex Sans (headings)
- Radius: Default
- Menu: Default translucent with subtle accent

### Required shadcn Components

Components to add via CLI:

```bash
npx shadcn@latest add card badge separator input textarea alert
```

**Component Usage:**

- **Card**: Industry cards, equipment cards
- **Badge**: Tags, labels (if needed)
- **Separator**: Visual dividers between sections
- **Input**: Contact form name, email, phone fields
- **Textarea**: Contact form message field
- **Alert**: Form success/error feedback

### Custom Styling

**Global CSS Variables** (`application/frontend/src/styles/global.css`):

- Already configured with Tailwind v4 and shadcn theme
- Custom brand colors can be added if needed
- Ensure semantic color tokens are used (`bg-primary`, `text-muted-foreground`)

**Responsive Breakpoints:**

- Mobile: \< 640px
- Tablet: 640px - 1024px
- Desktop: > 1024px

**Typography Scale:**

- h1: Hero titles (text-5xl or text-6xl)
- h2: Section titles (text-3xl or text-4xl)
- h3: Card titles (text-xl or text-2xl)
- Body: text-base
- Small: text-sm

### Header Styling Details

- Logo height: 60-80px (prominently sized)
- Navigation buttons: 40-48px height
- Sticky header: `sticky top-0 z-50 backdrop-blur-sm bg-background/80`
- Mobile menu: Full-screen overlay or slide-in drawer

### Hero Carousel Styling

- Full-width: `w-full`
- Height: 600px desktop, 400px mobile
- Background images: Cover with center positioning
- Overlay gradient: `bg-gradient-to-r from-black/60 to-transparent`
- Text: White with drop shadow for readability
- CTA buttons: Primary variant with hover effects

### Section Spacing

- Section padding: `py-16 md:py-24`
- Container max-width: `max-w-7xl mx-auto px-4`
- Section gap: `gap-12 md:gap-16`

## Static Site Generation (SSG)

### Build Process

**Command:** `npm run build`

**Output Structure:**

```
dist/
├── index.html                    (redirects to /ua/)
├── ua/
│   └── index.html               (Ukrainian homepage - static HTML)
├── en/
│   └── index.html               (English homepage - static HTML)
├── _astro/
│   ├── [hash].css               (Tailwind CSS)
│   ├── hero-carousel.[hash].js  (Framer Motion + carousel logic)
│   ├── language-switcher.[hash].js
│   └── contact-form.[hash].js
├── images/
│   ├── hero/
│   ├── industries/
│   └── og-image.jpg
└── favicon.svg
```

### Hydration Strategy

**React Islands with `client:load`:**

1. **HeroCarousel.tsx**: Hydrates immediately for smooth transitions
1. **LanguageSwitcher.tsx**: Hydrates immediately for instant language toggle
1. **ContactForm.tsx**: Hydrates immediately for form interactivity

**Why `client:load`:**

- These components need immediate interactivity
- Small bundle size (~22KB total) justifies immediate hydration
- Alternative `client:visible` could be used for ContactForm if below fold

### Performance Optimization

**Image Optimization:**

- Use Astro's `<Image>` component for automatic optimization
- WebP format with fallbacks
- Lazy loading for below-fold images
- Responsive srcset for different screen sizes

**CSS Optimization:**

- Tailwind CSS purging removes unused styles
- Critical CSS inlined in `<head>`
- Non-critical CSS loaded asynchronously

**JavaScript Optimization:**

- Code splitting per React island
- Tree shaking removes unused code
- Minification and compression

**Font Loading:**

- Preload critical fonts (Inter, IBM Plex Sans)
- Font-display: swap for faster rendering
- Variable fonts for smaller file size

## SEO & Accessibility

### SEO Implementation

**Meta Tags** (from `site-config.json`):

```html
<title>{seo.title}</title>
<meta name="description" content={seo.description} />
<meta name="keywords" content={seo.keywords.join(', ')} />

<!-- Open Graph -->
<meta property="og:title" content={seo.title} />
<meta property="og:description" content={seo.description} />
<meta property="og:image" content={seo.ogImage} />
<meta property="og:type" content="website" />

<!-- Twitter Card -->
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content={seo.title} />
<meta name="twitter:description" content={seo.description} />
<meta name="twitter:image" content={seo.ogImage} />
```

**hreflang Tags:**

```html
<link rel="alternate" hreflang="uk" href="https://ocs.com.ua/ua/" />
<link rel="alternate" hreflang="en" href="https://ocs.com.ua/en/" />
<link rel="alternate" hreflang="x-default" href="https://ocs.com.ua/ua/" />
```

**Structured Data (JSON-LD):**

```json
{
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "OCS Industrial Equipment Solutions",
  "url": "https://ocs.com.ua",
  "logo": "https://ocs.com.ua/images/ocs-logo.svg",
  "contactPoint": {
    "@type": "ContactPoint",
    "telephone": "+380-XX-XXX-XXXX",
    "contactType": "Customer Service",
    "availableLanguage": ["Ukrainian", "English"]
  },
  "sameAs": [
    "https://facebook.com/ocs",
    "https://linkedin.com/company/ocs"
  ]
}
```

**Semantic HTML:**

- `<header>`, `<nav>`, `<main>`, `<section>`, `<footer>`
- Proper heading hierarchy: h1 → h2 → h3
- `<article>` for equipment cards
- `<figure>` and `<figcaption>` for images

### Accessibility (WCAG 2.1 AA)

**Keyboard Navigation:**

- All interactive elements focusable via Tab
- Skip to main content link
- Escape key closes mobile menu
- Arrow keys navigate carousel (optional enhancement)

**ARIA Labels:**

- `aria-label` on icon-only buttons
- `aria-current="page"` on active nav link
- `aria-live="polite"` on carousel for screen readers
- `aria-invalid` on form fields with errors

**Focus Management:**

- Visible focus indicators (outline or ring)
- Focus trap in mobile menu when open
- Focus returns to trigger after closing modals

**Color Contrast:**

- Text on background: minimum 4.5:1 ratio
- Large text (18px+): minimum 3:1 ratio
- Interactive elements: minimum 3:1 ratio
- Test with tools like axe DevTools

**Alt Text:**

- All images have descriptive alt text from JSON
- Decorative images: `alt=""`
- Logo: `alt="OCS - Industrial Equipment Solutions"`

**Form Accessibility:**

- Labels associated with inputs via `htmlFor`/`id`
- Error messages linked via `aria-describedby`
- Required fields marked with `required` attribute
- Clear error messages and validation feedback

## Performance Targets

### Lighthouse Scores (Target: 90+)

**Performance:**

- First Contentful Paint (FCP): \< 1.5s
- Largest Contentful Paint (LCP): \< 2.5s
- Time to Interactive (TTI): \< 3.5s
- Cumulative Layout Shift (CLS): \< 0.1
- Total Blocking Time (TBT): \< 300ms

**Accessibility:** 100
**Best Practices:** 100
**SEO:** 100

### Bundle Size Targets

- HTML (per page): \< 50KB
- CSS (total): \< 30KB
- JavaScript (total): \< 25KB (gzipped \< 10KB)
- Images (hero): \< 200KB each (optimized WebP)
- Fonts: \< 100KB (variable fonts)

### Loading Strategy

1. **Critical Path:**

   - HTML (inline critical CSS)
   - Fonts (preloaded)
   - Hero image (priority)

1. **Deferred:**

   - Non-critical CSS
   - React island JavaScript
   - Below-fold images

1. **Lazy Loaded:**

   - Equipment images
   - Social media icons
   - Footer content

## File Structure

```
application/frontend/
├── src/
│   ├── components/
│   │   ├── Header.astro
│   │   ├── Footer.astro
│   │   ├── HeroCarousel.tsx
│   │   ├── LanguageSwitcher.tsx
│   │   ├── IndustriesSection.astro
│   │   ├── FeaturedEquipment.astro
│   │   ├── WhyChooseUs.astro
│   │   ├── ContactForm.tsx
│   │   └── ui/
│   │       ├── button.tsx (already exists)
│   │       ├── card.tsx (to add)
│   │       ├── badge.tsx (to add)
│   │       ├── separator.tsx (to add)
│   │       ├── input.tsx (to add)
│   │       ├── textarea.tsx (to add)
│   │       ├── alert.tsx (to add)
│   │       └── field.tsx (to add)
│   ├── content/
│   │   ├── en/
│   │   │   ├── homepage.json
│   │   │   ├── navigation.json
│   │   │   └── site-config.json
│   │   └── ua/
│   │       ├── homepage.json
│   │       ├── navigation.json
│   │       └── site-config.json
│   ├── layouts/
│   │   └── Layout.astro (update with SEO meta tags)
│   ├── lib/
│   │   ├── utils.ts (already exists)
│   │   └── content.ts (new - content loading utilities)
│   ├── pages/
│   │   ├── index.astro (redirect to /ua/)
│   │   ├── ua/
│   │   │   └── index.astro (Ukrainian homepage)
│   │   └── en/
│   │       └── index.astro (English homepage)
│   ├── styles/
│   │   └── global.css (already exists, may need updates)
│   └── types/
│       └── content.ts (new - TypeScript types)
├── public/
│   └── images/
│       ├── hero/
│       │   ├── food-industry.jpg
│       │   ├── pharma-industry.jpg
│       │   └── logistics-industry.jpg
│       ├── industries/
│       │   ├── food-thumb.jpg
│       │   ├── pharma-thumb.jpg
│       │   └── logistics-thumb.jpg
│       ├── ocs-logo.svg
│       └── og-image.jpg
├── astro.config.mjs (update with i18n config)
└── package.json (already has dependencies)
```

## Implementation Phases

### Phase 1: Setup & Configuration

1. Update `astro.config.mjs` with i18n configuration
1. Create TypeScript type definitions in `src/types/content.ts`
1. Create content loading utilities in `src/lib/content.ts`
1. Add required shadcn components via CLI

### Phase 2: Content Structure

1. Create JSON content files for both languages:
   - `homepage.json` (en/ua)
   - `navigation.json` (en/ua)
   - `site-config.json` (en/ua)
1. Add placeholder images to `public/images/`

### Phase 3: Layout & Static Components

1. Update `Layout.astro` with SEO meta tags and i18n support
1. Implement `Header.astro` with navigation
1. Implement `Footer.astro` with company info and links
1. Create static section components:
   - `IndustriesSection.astro`
   - `FeaturedEquipment.astro`
   - `WhyChooseUs.astro`

### Phase 4: React Islands

1. Implement `LanguageSwitcher.tsx`
1. Implement `HeroCarousel.tsx` with Framer Motion
1. Implement `ContactForm.tsx` with validation

### Phase 5: Page Assembly

1. Create `ua/index.astro` (Ukrainian homepage)
1. Create `en/index.astro` (English homepage)
1. Update root `index.astro` with redirect logic

### Phase 6: Testing & Optimization

1. Test both language versions
1. Verify all links and navigation
1. Test mobile responsiveness
1. Run Lighthouse audits
1. Fix accessibility issues
1. Optimize images and performance

## Testing Strategy

### Manual Testing Checklist

**Functionality:**

- [ ] Homepage loads in both languages (/ua/, /en/)
- [ ] Root path (/) redirects to /ua/
- [ ] Language switcher toggles between languages
- [ ] Hero carousel auto-rotates every 5 seconds
- [ ] Hero carousel pauses on hover
- [ ] Manual carousel navigation works (prev/next/dots)
- [ ] All navigation links are correct
- [ ] Contact form validation works
- [ ] Contact form submission shows feedback
- [ ] Mobile menu opens/closes correctly

**Responsive Design:**

- [ ] Desktop layout (> 1024px) displays correctly
- [ ] Tablet layout (640-1024px) displays correctly
- [ ] Mobile layout (\< 640px) displays correctly
- [ ] Images scale appropriately
- [ ] Text remains readable at all sizes
- [ ] Touch targets are at least 44x44px on mobile

**Accessibility:**

- [ ] Keyboard navigation works throughout
- [ ] Focus indicators are visible
- [ ] Screen reader announces content correctly
- [ ] Color contrast meets WCAG AA standards
- [ ] All images have alt text
- [ ] Form labels are properly associated

**Performance:**

- [ ] Lighthouse Performance score > 90
- [ ] First Contentful Paint \< 1.5s
- [ ] Largest Contentful Paint \< 2.5s
- [ ] No layout shifts (CLS \< 0.1)
- [ ] JavaScript bundle \< 25KB

**SEO:**

- [ ] Meta tags present and correct
- [ ] hreflang tags for both languages
- [ ] Structured data validates
- [ ] Sitemap includes both languages
- [ ] robots.txt configured correctly

### Browser Testing

Test in:

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)
- Mobile Safari (iOS)
- Chrome Mobile (Android)

## Future Enhancements

### Phase 2 (Post-MVP)

- Equipment detail pages
- Industry pages
- News/blog section
- Service pages
- Advanced search functionality

### Phase 3 (Long-term)

- Admin panel integration
- Dynamic content updates
- Analytics dashboard
- User authentication
- Equipment configurator

## Success Criteria

### Technical Metrics

- ✅ Lighthouse Performance score ≥ 90
- ✅ Lighthouse Accessibility score = 100
- ✅ Lighthouse SEO score = 100
- ✅ Total JavaScript \< 25KB
- ✅ First Contentful Paint \< 1.5s
- ✅ Largest Contentful Paint \< 2.5s

### Functional Requirements

- ✅ Bilingual support (UA/EN) working
- ✅ All navigation links functional
- ✅ Hero carousel auto-rotating smoothly
- ✅ Contact form validation working
- ✅ Mobile responsive design
- ✅ Language switcher in header and footer

### User Experience

- ✅ Page loads feel instant
- ✅ Carousel transitions are smooth
- ✅ Mobile menu is intuitive
- ✅ Forms provide clear feedback
- ✅ Content is readable and well-organized

## Risks & Mitigations

### Risk: Framer Motion Bundle Size

**Impact:** Could increase JavaScript bundle beyond target
**Mitigation:**

- Monitor bundle size during development
- Consider lighter animation library if needed
- Use code splitting to isolate carousel code

### Risk: Content Translation Gaps

**Impact:** Missing Ukrainian translations could break pages
**Mitigation:**

- Implement fallback to English content
- Content validation at build time
- Clear error messages for missing content

### Risk: Mobile Performance

**Impact:** Carousel animations could lag on low-end devices
**Mitigation:**

- Test on real devices early
- Implement reduced motion preference
- Optimize animation performance

### Risk: SEO During Development

**Impact:** Search engines might index development content
**Mitigation:**

- Use robots.txt to block indexing during development
- Implement proper redirects before launch
- Verify hreflang tags are correct

## Conclusion

This design specification provides a complete blueprint for implementing the OCS.com.ua main page with header and footer. The approach balances modern interactivity (React islands) with optimal performance (static HTML generation), while establishing a solid foundation for future pages and features.

The bilingual JSON-based content structure ensures easy content management and future admin panel integration. The shadcn/ui component library provides a consistent, accessible design system that can scale as the website grows.

Next steps: Create implementation plan and begin Phase 1 development.
