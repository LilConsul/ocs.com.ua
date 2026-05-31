# OCS.com.ua Component Library - Design Specification

**Date:** 2026-05-31
**Project:** OCS.com.ua Component Library
**Status:** Approved for Implementation

## Executive Summary

This specification defines a comprehensive component library for the OCS.com.ua website redesign. The library consists of 14 reusable components built with a hybrid Astro + React Islands architecture, styled with Tailwind CSS, and animated with Framer Motion. All components are designed to be SEO-friendly, AI-optimized, responsive, and visually appealing while maintaining the OCS brand identity.

**Key Goals:**

- Create 14 production-ready components
- Hybrid architecture (Astro + React Islands)
- Full TypeScript type safety
- Framer Motion animations
- Tailwind CSS + custom CSS styling
- WCAG 2.1 AA accessibility compliance
- Mobile-first responsive design
- SEO and performance optimized

## Architecture Overview

### Technology Stack

**Framework:** Astro 4.0+ with React integration
**Styling:** Tailwind CSS 3.4+ with custom CSS for complex components
**Animation:** Framer Motion 11.0+
**Type Safety:** TypeScript 5.3+
**Color Scheme:** OCS Brand Colors from [`tailwind.config.mjs`](../../application/frontend/tailwind.config.mjs)

### Component Strategy

**Hybrid Approach:**

- **Astro Components** (`.astro`): Static content, layout, SEO components
- **React Components** (`.tsx`): Interactive elements requiring client-side state
- **Selective Hydration**: Use `client:*` directives only where needed

**Benefits:**

- Zero JavaScript for static content (optimal SEO)
- Rich interactivity where needed
- Best performance characteristics
- Type-safe props throughout

## Component Categories

### 1. Layout Components (4)

- Header - Top bar with logo and contact info
- Navigation - Multi-level mega menu
- Footer - Site footer with links and social
- Breadcrumbs - Navigation path with schema.org markup

### 2. Content Components (6)

- Hero Section - Main banner with CTA
- About Section - Company description with image
- Industry Selector - Interactive industry cards
- News & Events Section - Tabbed content display
- Equipment Card - Product display card
- Equipment Grid - Filterable product grid

### 3. UI Components (3)

- CTA Button - Call-to-action button with variants
- Contact Form - Lead generation form
- Language Switcher - EN/UA toggle

### 4. SEO Components (1)

- SEO Head - Meta tags and structured data

## Detailed Component Specifications

### LAYOUT COMPONENTS

#### 1. Header Component

**File:** [`src/components/layout/Header.astro`](../../application/frontend/src/components/layout/Header.astro)
**Type:** Astro Component (Static)
**Purpose:** Top header with logo, contact info, and language switcher

**Props Interface:**

```typescript
interface HeaderProps {
  phone: string;
  email: string;
  logoUrl: string;
  logoAlt: string;
  currentLang: 'en' | 'ua';
}
```

**Structure:**

- Container with max-width constraint
- Left section: Contact info (phone icon + number, email icon + address)
- Right section: Logo (centered, clickable, links to home)
- Responsive behavior: Hide contact on mobile, show only logo

**Styling Guidelines:**

- Background: `bg-white`
- Text color: `text-ocs-primary` for contact info
- Font size: `text-xl` for contact (desktop), `text-base` (mobile)
- Padding: `py-3 md:py-4`
- Icons: Pink (#c71978) with 8px margin-right

**Accessibility Requirements:**

- Semantic HTML: `<header>` tag
- Alt text for logo
- Proper link labels for phone/email
- Phone/email as clickable links with appropriate protocols

______________________________________________________________________

#### 2. Navigation Component

**File:** [`src/components/layout/Navigation.tsx`](../../application/frontend/src/components/layout/Navigation.tsx)
**Type:** React Component (Interactive)
**Purpose:** Multi-level mega menu with equipment categories and industries

**Props Interface:**

```typescript
interface MenuItem {
  label: string;
  href: string;
  children?: MenuItem[];
}

interface NavigationProps {
  menuItems: MenuItem[];
  currentPath: string;
  sticky?: boolean;
}
```

**Structure:**

- Horizontal menu bar for desktop
- Top-level items with hover-triggered dropdowns
- Multi-level support (2-3 levels deep)
- Mobile: Hamburger menu with slide-out drawer from right
- Optional sticky header behavior

**Styling Guidelines:**

- Background: `bg-ocs-primary` (pink #c71978)
- Text: `text-white`
- Hover state: `bg-ocs-accent` (blue #66afe9) with smooth transition
- Active item: Underline or bold weight
- Dropdown: White background, shadow, `text-ocs-secondary`
- Mobile menu: Full-height drawer from right side

**Animations (Framer Motion):**

- Desktop dropdown: Fade in + slide down (200ms duration)
- Mobile drawer: Slide from right (300ms duration)
- Menu items: Stagger animation (50ms delay between items)
- Hover effect: Scale 1.02 on menu items

**Interactivity Requirements:**

- Full keyboard navigation (Tab, Enter, Escape)
- Click outside to close dropdowns
- Mobile: Swipe gesture to close drawer
- Sticky scroll behavior: Hide on scroll down, show on scroll up

**Accessibility Requirements:**

- ARIA labels for menu buttons
- `role="navigation"` on container
- Focus management for keyboard users
- Screen reader announcements for state changes

______________________________________________________________________

#### 3. Footer Component

**File:** [`src/components/layout/Footer.astro`](../../application/frontend/src/components/layout/Footer.astro)
**Type:** Astro Component (Static)
**Purpose:** Site footer with contact info, social links, and sitemap

**Props Interface:**

```typescript
interface FooterProps {
  companyName: string;
  address: string;
  phone: string;
  email: string;
  socialLinks: {
    platform: 'facebook' | 'linkedin' | 'youtube' | 'instagram';
    url: string;
  }[];
  sitemapLinks: {
    title: string;
    links: { label: string; href: string }[];
  }[];
  copyrightYear: number;
}
```

**Structure:**

- 4-column grid layout (desktop), stacked (mobile)
- Column 1: Company info + contact details
- Columns 2-3: Sitemap sections
- Column 4: Social media links
- Bottom row: Copyright notice

**Styling Guidelines:**

- Background: `bg-ocs-secondary` (dark gray #555555)
- Text: `text-white`
- Links: `text-ocs-light` with `hover:text-ocs-primary` transition
- Padding: `py-12 md:py-16`
- Grid gap: `gap-8`
- Social icons: 40x40px, circular, hover scale effect

**Accessibility Requirements:**

- Semantic `<footer>` tag
- Proper heading hierarchy (h2, h3)
- Descriptive link labels
- Alt text for social icons

______________________________________________________________________

#### 4. Breadcrumbs Component

**File:** [`src/components/layout/Breadcrumbs.astro`](../../application/frontend/src/components/layout/Breadcrumbs.astro)
**Type:** Astro Component (Static)
**Purpose:** Navigation path with schema.org structured data markup

**Props Interface:**

```typescript
interface BreadcrumbItem {
  label: string;
  href: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  currentPage: string;
}
```

**Structure:**

- Horizontal list with separators
- Home icon + text links for each level
- Current page (non-clickable, visually distinct)
- JSON-LD structured data for SEO

**Styling Guidelines:**

- Text: `text-sm text-ocs-secondary`
- Links: `hover:text-ocs-primary` transition
- Separator: `/` or `›` in `text-ocs-border`
- Current page: `text-ocs-primary font-semibold`
- Padding: `py-4`

**SEO Requirements:**

- BreadcrumbList schema.org markup
- Proper itemscope/itemprop attributes
- JSON-LD script tag for structured data

______________________________________________________________________

### CONTENT COMPONENTS

#### 5. Hero Section Component

**File:** [`src/components/content/HeroSection.tsx`](../../application/frontend/src/components/content/HeroSection.tsx)
**Type:** React Component (Interactive)
**Purpose:** Main banner with headline, description, CTA buttons, and background media

**Props Interface:**

```typescript
interface HeroSectionProps {
  title: string;
  subtitle?: string;
  description: string;
  primaryCTA: {
    label: string;
    href: string;
  };
  secondaryCTA?: {
    label: string;
    href: string;
  };
  backgroundImage?: string;
  backgroundVideo?: string;
  overlay?: boolean;
  alignment?: 'left' | 'center' | 'right';
}
```

**Structure:**

- Full-width container
- Background image/video with optional overlay
- Content container with max-width
- Headline (H1 tag)
- Optional subtitle
- Description paragraph
- CTA buttons in horizontal layout

**Styling Guidelines:**

- Min height: `min-h-[500px] md:min-h-[600px]`
- Background: Image with `bg-cover bg-center`
- Overlay: `bg-black/50` if enabled
- Text: `text-white` with text shadow for readability
- Title: `text-4xl md:text-6xl font-bold`
- Description: `text-lg md:text-xl`
- Padding: `py-20 md:py-32`

**Animations (Framer Motion):**

- Title: Fade in + slide up (delay 0ms)
- Subtitle: Fade in + slide up (delay 200ms)
- Description: Fade in + slide up (delay 400ms)
- CTAs: Fade in + slide up (delay 600ms)
- Background: Subtle parallax scroll effect

**Responsive Behavior:**

- Mobile: Stack content vertically, reduce text sizes
- Tablet: Adjust spacing and padding
- Desktop: Full layout with optimal spacing

______________________________________________________________________

#### 6. About Section Component

**File:** [`src/components/content/AboutSection.tsx`](../../application/frontend/src/components/content/AboutSection.tsx)
**Type:** React Component (Interactive)
**Purpose:** Company description with image in two-column layout

**Props Interface:**

```typescript
interface AboutSectionProps {
  title: string;
  content: string; // HTML string or markdown
  image: {
    src: string;
    alt: string;
  };
  imagePosition?: 'left' | 'right';
  features?: string[]; // Bullet points
}
```

**Structure:**

- Two-column grid (desktop), stacked (mobile)
- Text column: Title, content, optional features list
- Image column: Responsive image with maintained aspect ratio
- Reversible layout based on imagePosition prop

**Styling Guidelines:**

- Container: `max-w-7xl mx-auto px-4`
- Grid: `grid md:grid-cols-2 gap-8 md:gap-12`
- Title: `text-3xl md:text-4xl font-bold text-ocs-primary`
- Content: `text-base md:text-lg text-ocs-secondary leading-relaxed`
- Image: `rounded-lg shadow-lg`
- Features: Checkmark icons with `text-ocs-secondary`

**Animations (Framer Motion):**

- Scroll trigger: Animate when 20% of component is visible
- Text: Fade in + slide from left
- Image: Fade in + slide from right
- Features list: Stagger animation (100ms delay between items)

**Responsive Behavior:**

- Mobile: Image first, then text (regardless of imagePosition)
- Desktop: Side-by-side layout respecting imagePosition

______________________________________________________________________

#### 7. Industry Selector Component

**File:** [`src/components/content/IndustrySelector.tsx`](../../application/frontend/src/components/content/IndustrySelector.tsx)
**Type:** React Component (Interactive)
**Purpose:** Interactive card grid showing industries with images and hover effects

**Props Interface:**

```typescript
interface Industry {
  id: string;
  name: string;
  image: string;
  description?: string;
  href: string;
}

interface IndustrySelectorProps {
  title: string;
  industries: Industry[];
  columns?: 2 | 3 | 4;
}
```

**Structure:**

- Section title
- Grid of industry cards
- Each card: Image, gradient overlay, title
- Hover state: Show description, scale effect
- Mobile: Swipeable carousel with navigation dots

**Styling Guidelines:**

- Grid: `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6`
- Card: `relative overflow-hidden rounded-lg shadow-md`
- Image: `aspect-[16/9] object-cover`
- Overlay: `absolute inset-0 bg-gradient-to-t from-black/70 to-transparent`
- Title: `absolute bottom-4 left-4 text-white text-xl font-bold`
- Hover overlay: `bg-ocs-primary/90`

**Animations (Framer Motion):**

- Card hover: Scale 1.05, lift shadow
- Image: Zoom 1.1 on hover
- Title: Slide up on hover
- Description: Fade in on hover
- Grid: Stagger children on scroll (100ms delay between cards)

**Interactivity Requirements:**

- Click to navigate to industry page
- Full keyboard navigation support
- Mobile: Swipe carousel with dot indicators

______________________________________________________________________

#### 8. News & Events Section Component

**File:** [`src/components/content/NewsEventsSection.tsx`](../../application/frontend/src/components/content/NewsEventsSection.tsx)
**Type:** React Component (Interactive)
**Purpose:** Tabbed interface displaying news articles and event listings

**Props Interface:**

```typescript
interface NewsItem {
  id: string;
  title: string;
  date: string;
  excerpt: string;
  image?: string;
  href: string;
}

interface NewsEventsSectionProps {
  title: string;
  newsItems: NewsItem[];
  eventItems: NewsItem[];
  defaultTab?: 'news' | 'events';
}
```

**Structure:**

- Section title
- Tab buttons (News / Events)
- Content area with item cards
- 3-column grid (desktop), 1-column (mobile)
- "View All" link at bottom

**Styling Guidelines:**

- Tabs: Pill style, `bg-ocs-light` inactive, `bg-ocs-primary text-white` active
- Cards: `bg-white rounded-lg shadow-md overflow-hidden`
- Image: `aspect-[16/9] object-cover`
- Title: `text-lg font-semibold text-ocs-secondary`
- Date: `text-sm text-ocs-placeholder`
- Excerpt: `text-sm text-ocs-secondary line-clamp-3`

**Animations (Framer Motion):**

- Tab switch: Fade out old content, fade in new (200ms)
- Cards: Slide in from bottom with stagger effect
- Card hover: Lift shadow, scale 1.02

**Interactivity Requirements:**

- Tab switching with state management
- Keyboard navigation between tabs
- Card click to navigate to full article

______________________________________________________________________

#### 9. Equipment Card Component

**File:** [`src/components/content/EquipmentCard.tsx`](../../application/frontend/src/components/content/EquipmentCard.tsx)
**Type:** React Component (Interactive)
**Purpose:** Product display card with image, specifications, and CTA

**Props Interface:**

```typescript
interface EquipmentCardProps {
  id: string;
  name: string;
  category: string;
  shortDescription: string;
  image: string;
  specifications?: {
    label: string;
    value: string;
  }[];
  href: string;
  variant?: 'default' | 'compact' | 'featured';
}
```

**Structure:**

- Card container
- Image section at top
- Content section: Category badge, title, description
- Optional specifications list
- CTA button at bottom

**Styling Guidelines:**

- Card: `bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transition`
- Image: `aspect-[4/3] object-cover`
- Category badge: `inline-block px-3 py-1 bg-ocs-primary text-white text-xs rounded-full`
- Title: `text-xl font-bold text-ocs-secondary`
- Description: `text-sm text-ocs-secondary line-clamp-2`
- Specifications: Grid layout with `text-xs`
- CTA: Full-width button at bottom

**Animations (Framer Motion):**

- Hover: Lift shadow, image zoom 1.1
- Image: Fade in on load
- Content: Slide up on scroll trigger

**Variants:**

- **Default**: Full card with all details
- **Compact**: Smaller size, minimal specifications
- **Featured**: Larger size, highlighted border

______________________________________________________________________

#### 10. Equipment Grid Component

**File:** [`src/components/content/EquipmentGrid.tsx`](../../application/frontend/src/components/content/EquipmentGrid.tsx)
**Type:** React Component (Interactive)
**Purpose:** Responsive grid layout for equipment listings with filtering and sorting

**Props Interface:**

```typescript
interface EquipmentGridProps {
  equipment: EquipmentCardProps[];
  columns?: 2 | 3 | 4;
  showFilters?: boolean;
  filters?: {
    categories: string[];
    industries: string[];
  };
  sortOptions?: ('name' | 'category' | 'newest')[];
}
```

**Structure:**

- Optional filter bar at top
- Sort dropdown (right-aligned)
- Grid of EquipmentCard components
- Pagination or "Load More" button
- Empty state message

**Styling Guidelines:**

- Grid: `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6`
- Filters: Horizontal pills, multi-select capability
- Sort dropdown: Right-aligned, clean design
- Pagination: Centered, numbered pages

**Animations (Framer Motion):**

- Grid items: Stagger on initial load (50ms delay)
- Filter change: Fade out old items, fade in new
- Sort: Smooth reorder animation

**Interactivity Requirements:**

- Multi-select filter functionality
- Sort dropdown with state management
- Pagination with URL parameter support
- Full keyboard navigation

______________________________________________________________________

### UI COMPONENTS

#### 11. CTA Button Component

**File:** [`src/components/ui/CTAButton.tsx`](../../application/frontend/src/components/ui/CTAButton.tsx)
**Type:** React Component (Interactive)
**Purpose:** Versatile call-to-action button with multiple variants and states

**Props Interface:**

```typescript
interface CTAButtonProps {
  label: string;
  href?: string;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
  disabled?: boolean;
  loading?: boolean;
}
```

**Structure:**

- Button or link element (based on href prop)
- Optional icon (left or right)
- Label text
- Optional loading spinner

**Styling Guidelines:**

- **Primary**: `bg-ocs-primary text-white hover:bg-ocs-primary/90`
- **Secondary**: `bg-ocs-secondary text-white hover:bg-ocs-secondary/90`
- **Outline**: `border-2 border-ocs-primary text-ocs-primary hover:bg-ocs-primary hover:text-white`
- **Ghost**: `text-ocs-primary hover:bg-ocs-primary/10`
- **Sizes**:
  - sm: `px-4 py-2 text-sm`
  - md: `px-6 py-3 text-base`
  - lg: `px-8 py-4 text-lg`
- Border radius: `rounded-md`
- Transition: `transition-all duration-200`

**Animations (Framer Motion):**

- Hover: Scale 1.05
- Tap/Click: Scale 0.95
- Loading: Spinner rotation animation
- Icon: Subtle slide on hover (if present)

**Accessibility Requirements:**

- Proper button/link semantics
- Disabled state with reduced opacity
- Loading state announcement for screen readers
- Visible focus indicator

______________________________________________________________________

#### 12. Contact Form Component

**File:** [`src/components/ui/ContactForm.tsx`](../../application/frontend/src/components/ui/ContactForm.tsx)
**Type:** React Component (Interactive)
**Purpose:** Lead generation form with validation and submission handling

**Props Interface:**

```typescript
interface ContactFormProps {
  title?: string;
  fields: {
    name: boolean;
    email: boolean;
    phone: boolean;
    company: boolean;
    message: boolean;
    industry?: string[];
    equipment?: string[];
  };
  submitLabel?: string;
  onSubmit: (data: FormData) => Promise<void>;
  successMessage?: string;
  errorMessage?: string;
}
```

**Structure:**

- Optional form title
- Dynamic input fields based on configuration
- Inline validation messages
- Submit button with loading state
- Success/error state displays

**Styling Guidelines:**

- Container: `max-w-2xl mx-auto`
- Inputs: `w-full px-4 py-3 border border-ocs-border rounded-md focus:border-ocs-primary focus:ring-2 focus:ring-ocs-primary/20`
- Labels: `text-sm font-medium text-ocs-secondary mb-2`
- Error messages: `text-red-600 text-sm mt-1`
- Success message: `bg-green-50 border border-green-200 text-green-800 p-4 rounded-md`

**Animations (Framer Motion):**

- Field focus: Smooth border color transition
- Validation error: Shake animation
- Success message: Fade in + slide down
- Submit button: Loading spinner animation

**Validation Requirements:**

- Required field validation
- Email format validation
- Phone format validation (optional)
- Character limits enforcement
- Real-time validation feedback

**Interactivity Requirements:**

- Form submission with loading state
- Success/error handling
- Form reset after successful submission
- Prevent double submission

______________________________________________________________________

#### 13. Language Switcher Component

**File:** [`src/components/ui/LanguageSwitcher.tsx`](../../application/frontend/src/components/ui/LanguageSwitcher.tsx)
**Type:** React Component (Interactive)
**Purpose:** EN/UA language toggle with flag icons

**Props Interface:**

```typescript
interface LanguageSwitcherProps {
  currentLang: 'en' | 'ua';
  onLanguageChange: (lang: 'en' | 'ua') => void;
  variant?: 'dropdown' | 'toggle' | 'flags';
}
```

**Structure:**

- Toggle button or dropdown (based on variant)
- Flag icons for each language
- Optional language labels
- Visual indicator for current language

**Styling Guidelines:**

- Toggle: `flex items-center gap-2 px-3 py-2 rounded-md bg-ocs-light`
- Active state: `bg-ocs-primary text-white`
- Flag icons: 24x24px
- Dropdown: White background with shadow

**Animations (Framer Motion):**

- Language switch: Slide indicator animation
- Dropdown: Fade + slide down
- Hover: Scale 1.05

**Interactivity Requirements:**

- Click to switch languages
- Keyboard navigation support
- Persist preference in localStorage
- Update URL with hreflang parameter

______________________________________________________________________

### SEO COMPONENTS

#### 14. SEO Head Component

**File:** [`src/components/seo/SEOHead.astro`](../../application/frontend/src/components/seo/SEOHead.astro)
**Type:** Astro Component (Static)
**Purpose:** Comprehensive meta tags, Open Graph, Twitter Cards, and JSON-LD structured data

**Props Interface:**

```typescript
interface SEOHeadProps {
  title: string;
  description: string;
  canonical: string;
  ogImage?: string;
  ogType?: 'website' | 'article' | 'product';
  twitterCard?: 'summary' | 'summary_large_image';
  keywords?: string[];
  author?: string;
  publishedTime?: string;
  modifiedTime?: string;
  locale?: 'en_US' | 'uk_UA';
  alternateLocale?: 'en_US' | 'uk_UA';
  structuredData?: object; // JSON-LD
}
```

**Structure:**

- Basic meta tags (title, description, keywords)
- Open Graph tags for social sharing
- Twitter Card tags
- Canonical URL
- Alternate language links (hreflang)
- JSON-LD structured data script

**Implementation Requirements:**

- All tags rendered in `<head>` section
- Proper HTML escaping for security
- Conditional rendering based on provided props
- Sensible default values

**SEO Best Practices:**

- Title: 50-60 characters optimal length
- Description: 150-160 characters optimal length
- Unique content per page
- Proper hreflang implementation
- Valid schema.org markup

______________________________________________________________________

## Design Principles

### Responsiveness

**Mobile-First Approach:**

- Design for mobile screens first
- Progressive enhancement for larger screens
- Breakpoints: sm (640px), md (768px), lg (1024px), xl (1280px)
- Fluid typography scaling
- Touch-friendly interaction targets (minimum 44x44px)

### Accessibility

**WCAG 2.1 AA Compliance:**

- Semantic HTML5 elements
- ARIA labels where semantic HTML insufficient
- Full keyboard navigation support
- Focus management and visible indicators
- Screen reader compatibility
- Color contrast ratios meeting standards
- Alternative text for images
- Form labels and error messages

### Performance

**Optimization Strategies:**

- Lazy loading for images below fold
- Code splitting for React components
- Minimal JavaScript footprint
- GPU-accelerated animations only
- Preload critical assets
- Responsive images with srcset
- Efficient re-renders in React components

### SEO

**Search Engine Optimization:**

- Semantic HTML5 structure
- Proper heading hierarchy (single H1, logical H2-H6)
- Descriptive meta tags
- Schema.org structured data
- Fast loading times (\< 3s)
- Mobile-friendly design
- Clean URL structure

______________________________________________________________________

## Color Usage Guidelines

**Brand Colors from [`tailwind.config.mjs`](../../application/frontend/tailwind.config.mjs):**

- **Primary (#c71978)**: CTAs, links, headings, active states, brand emphasis
- **Secondary (#555555)**: Body text, secondary UI elements, subtle emphasis
- **Accent (#66afe9)**: Hover states, focus rings, interactive highlights
- **Light (#eeeeee)**: Backgrounds, subtle borders, disabled states
- **Border (#ccc)**: Dividers, input borders, card outlines
- **White (#fff)**: Card backgrounds, text on dark backgrounds
- **Black (#000)**: High contrast text (use sparingly)

**Usage Rules:**

- Maintain 4.5:1 contrast ratio for text
- Use primary color for primary actions
- Reserve accent color for interactive feedback
- Ensure sufficient contrast on all backgrounds

______________________________________________________________________

## Animation Guidelines

### Timing Standards

- **Fast (150-200ms)**: Micro-interactions, button hovers, simple transitions
- **Medium (300-400ms)**: Component transitions, dropdown menus, modals
- **Slow (500-600ms)**: Complex animations, page transitions, carousels

### Easing Functions

- **Default**: `ease-in-out` for most transitions
- **Enter**: `ease-out` for elements appearing
- **Exit**: `ease-in` for elements disappearing
- **Spring**: For natural, physics-based motion

### Performance Considerations

- **Animate only**: `transform` and `opacity` properties
- **Avoid animating**: `width`, `height`, `top`, `left`, `margin`, `padding`
- **Use `will-change`**: Sparingly and only during animation
- **Respect user preferences**: Implement `prefers-reduced-motion` media query

______________________________________________________________________

## Component File Structure

```
application/frontend/src/
├── components/
│   ├── layout/
│   │   ├── Header.astro
│   │   ├── Navigation.tsx
│   │   ├── Footer.astro
│   │   └── Breadcrumbs.astro
│   ├── content/
│   │   ├── HeroSection.tsx
│   │   ├── AboutSection.tsx
│   │   ├── IndustrySelector.tsx
│   │   ├── NewsEventsSection.tsx
│   │   ├── EquipmentCard.tsx
│   │   └── EquipmentGrid.tsx
│   ├── ui/
│   │   ├── CTAButton.tsx
│   │   ├── ContactForm.tsx
│   │   └── LanguageSwitcher.tsx
│   └── seo/
│       └── SEOHead.astro
├── types/
│   └── components.ts          # Shared TypeScript interfaces
└── styles/
    └── components.css         # Custom CSS for complex components
```

______________________________________________________________________

## Dependencies

**Required Package Versions:**

```json
{
  "dependencies": {
    "astro": "^4.0.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "framer-motion": "^11.0.0",
    "tailwindcss": "^3.4.0",
    "@tailwindcss/typography": "^0.5.10"
  },
  "devDependencies": {
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "typescript": "^5.3.0"
  }
}
```

**Installation Command:**

```bash
npm install react react-dom framer-motion
npm install -D @types/react @types/react-dom
```

______________________________________________________________________

## Testing Requirements

### Component Testing

- **Unit Tests**: Test individual component logic and props
- **Integration Tests**: Test component interactions
- **Visual Regression**: Ensure consistent rendering
- **Accessibility Tests**: Automated a11y checks

### Browser Compatibility

- **Modern Browsers**: Chrome, Firefox, Safari, Edge (latest 2 versions)
- **Mobile Browsers**: iOS Safari, Chrome Mobile
- **Graceful Degradation**: Fallbacks for older browsers

### Performance Targets

- **Lighthouse Score**: 95+ for Performance
- **First Contentful Paint**: \< 1.5s
- **Largest Contentful Paint**: \< 2.5s
- **Time to Interactive**: \< 3.5s
- **Cumulative Layout Shift**: \< 0.1

______________________________________________________________________

## Implementation Phases

### Phase 1: Foundation (Week 1)

1. Set up project dependencies
1. Configure Astro + React integration
1. Set up Tailwind CSS with custom colors
1. Create TypeScript type definitions
1. Build Layout components (Header, Navigation, Footer, Breadcrumbs)

### Phase 2: Content Components (Week 2)

1. Build Hero Section
1. Build About Section
1. Build Industry Selector
1. Build News & Events Section
1. Build Equipment Card
1. Build Equipment Grid

### Phase 3: UI Components (Week 3)

1. Build CTA Button
1. Build Contact Form
1. Build Language Switcher
1. Build SEO Head component

### Phase 4: Integration & Testing (Week 4)

1. Create component showcase page
1. Test all components for responsiveness
1. Accessibility audit and fixes
1. Performance optimization
1. Cross-browser testing
1. Documentation finalization

______________________________________________________________________

## Success Criteria

### Technical Metrics

- All 14 components implemented and functional
- TypeScript type safety throughout
- Zero accessibility violations (WCAG 2.1 AA)
- Lighthouse Performance score 95+
- Mobile-responsive on all screen sizes
- Cross-browser compatibility verified

### Quality Metrics

- Components follow design specification exactly
- Animations smooth and performant (60fps)
- Code is maintainable and well-documented
- Props interfaces are clear and type-safe
- Styling is consistent with brand guidelines

### User Experience Metrics

- Components are intuitive to use
- Interactive elements provide clear feedback
- Loading states are handled gracefully
- Error states are user-friendly
- Keyboard navigation works seamlessly

______________________________________________________________________

## Maintenance & Updates

### Version Control

- All components versioned in Git
- Semantic versioning for releases
- Changelog maintained for updates

### Documentation

- Component props documented inline
- Usage examples provided
- Storybook or similar for component showcase

### Future Enhancements

- Additional component variants as needed
- Animation refinements based on user feedback
- Performance optimizations
- Accessibility improvements
- New components as requirements evolve

______________________________________________________________________

## Appendix

### Related Documents

- [Website Redesign Design Specification](./2026-05-31-ocs-website-redesign-design.md)
- [Tailwind Configuration](../../application/frontend/tailwind.config.mjs)
- [Project README](../../README.md)

### References

- [Astro Documentation](https://docs.astro.build)
- [React Documentation](https://react.dev)
- [Framer Motion Documentation](https://www.framer.com/motion/)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [Schema.org Documentation](https://schema.org)

______________________________________________________________________

**Document Status:** Approved for Implementation
**Next Step:** Create Implementation Plan
**Estimated Timeline:** 4 weeks for complete implementation
