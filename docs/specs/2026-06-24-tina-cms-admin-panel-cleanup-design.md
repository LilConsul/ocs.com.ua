# TinaCMS Admin Panel Cleanup Design

**Date:** 2026-06-24
**Status:** Draft
**Author:** AI Assistant
**Stakeholders:** OCS Development Team

## Executive Summary

This document specifies the cleanup and reorganization of the TinaCMS admin panel to provide a clean, intuitive interface for editing website content. The focus is on restructuring the existing collections (Site Configuration, Navigation, and Homepage) to use collapsible sections that group related fields logically, making content management easier for non-technical users while maintaining the existing JSON file structure.

## Goals

1. **Simplify content editing** - Organize fields into logical, collapsible sections
1. **Improve admin UX** - Clear labels, helpful grouping, and intuitive navigation
1. **Support bilingual content** - Easy switching between English and Ukrainian content
1. **Maintain compatibility** - Preserve existing JSON structure and file paths
1. **Clean up configuration** - Remove complexity from TinaCMS schema definitions

## Non-Goals

- Visual in-place editing on actual pages (future enhancement)
- Changing JSON file structure or locations
- Adding new content types or collections
- Modifying authentication or deployment workflows

## Current State Analysis

### Existing Setup

The project currently has TinaCMS configured with three collections:

1. **Homepage Collection** - Hero slides, industries, equipment, benefits, contact form
1. **Navigation Collection** - Header menu and footer links
1. **Site Config Collection** - Company info, contact details, social media, SEO

**Current Issues:**

- Fields are not well-organized into logical groups
- Some nested structures are confusing to navigate
- No clear visual separation between different content areas
- Admin panel feels cluttered and overwhelming

**What Works Well:**

- Bilingual support through `{en,ua}` file matching
- JSON format for easy version control
- Existing authentication via Tina Cloud
- Build process integration

## System Architecture

### Admin Panel Structure

```
/admin/
├── English Content (/admin/#/~/en/)
│   ├── Site Configuration (en/site-config.json)
│   ├── Navigation (en/navigation.json)
│   └── Homepage (en/homepage.json)
│
└── Ukrainian Content (/admin/#/~/ua/)
    ├── Site Configuration (ua/site-config.json)
    ├── Navigation (ua/navigation.json)
    └── Homepage (ua/homepage.json)
```

### Content Organization

```
src/content/
├── en/
│   ├── site-config.json    (Company, Contact, Social, SEO)
│   ├── navigation.json     (Header Menu, Footer Links)
│   └── homepage.json       (Hero, Industries, Equipment, Benefits, Contact Form)
└── ua/
    ├── site-config.json    (Same structure, Ukrainian content)
    ├── navigation.json     (Same structure, Ukrainian content)
    └── homepage.json       (Same structure, Ukrainian content)
```

### Language Handling

- TinaCMS automatically creates separate entries per language based on file matching
- Users navigate to `/admin/#/~/en/` or `/admin/#/~/ua/` to edit language-specific content
- Each language shows the same three collections in the sidebar
- No cross-language editing in a single view

## Detailed Design

### Collection 1: Site Configuration

**Purpose:** Manage company information, contact details, social media links, and SEO metadata.

**File Pattern:** `{en,ua}/site-config.json`

**Field Structure:**

```
Site Configuration
│
├── Company Information (collapsible object)
│   ├── Company Name (string, required)
│   ├── Full Company Name (string, required)
│   ├── Tagline (string)
│   └── Description (textarea)
│
├── Contact Details (collapsible object)
│   ├── Phone (string, required)
│   ├── Email (string, required)
│   └── Address (nested object)
│       ├── Street (string)
│       ├── City (string, required)
│       ├── Country (string, required)
│       └── Postal Code (string)
│
├── Social Media (collapsible object)
│   ├── Facebook URL (string)
│   ├── LinkedIn URL (string)
│   ├── Instagram URL (string)
│   └── YouTube URL (string)
│
└── SEO Settings (collapsible object)
    ├── Page Title (string, required)
    ├── Meta Description (textarea, required)
    ├── Keywords (list of strings)
    ├── OG Image Path (image)
    └── Copyright Text (string)
```

**TinaCMS Schema Configuration:**

```typescript
{
  name: "siteConfig",
  label: "Site Configuration",
  path: "src/content",
  format: "json",
  match: {
    include: "{en,ua}/site-config",
  },
  fields: [
    {
      type: "object",
      name: "company",
      label: "Company Information",
      fields: [
        {
          type: "string",
          name: "name",
          label: "Company Name",
          required: true,
        },
        {
          type: "string",
          name: "fullName",
          label: "Full Company Name",
          required: true,
        },
        {
          type: "string",
          name: "tagline",
          label: "Tagline",
        },
        {
          type: "string",
          name: "description",
          label: "Description",
          ui: {
            component: "textarea",
          },
        },
      ],
    },
    {
      type: "object",
      name: "contact",
      label: "Contact Details",
      fields: [
        {
          type: "string",
          name: "phone",
          label: "Phone",
          required: true,
        },
        {
          type: "string",
          name: "email",
          label: "Email",
          required: true,
        },
        {
          type: "object",
          name: "address",
          label: "Address",
          fields: [
            {
              type: "string",
              name: "street",
              label: "Street",
            },
            {
              type: "string",
              name: "city",
              label: "City",
              required: true,
            },
            {
              type: "string",
              name: "country",
              label: "Country",
              required: true,
            },
            {
              type: "string",
              name: "postalCode",
              label: "Postal Code",
            },
          ],
        },
      ],
    },
    {
      type: "object",
      name: "social",
      label: "Social Media",
      fields: [
        {
          type: "string",
          name: "facebook",
          label: "Facebook URL",
        },
        {
          type: "string",
          name: "linkedin",
          label: "LinkedIn URL",
        },
        {
          type: "string",
          name: "instagram",
          label: "Instagram URL",
        },
        {
          type: "string",
          name: "youtube",
          label: "YouTube URL",
        },
      ],
    },
    {
      type: "object",
      name: "seo",
      label: "SEO Settings",
      fields: [
        {
          type: "string",
          name: "title",
          label: "Page Title",
          required: true,
        },
        {
          type: "string",
          name: "description",
          label: "Meta Description",
          required: true,
          ui: {
            component: "textarea",
          },
        },
        {
          type: "string",
          list: true,
          name: "keywords",
          label: "Keywords",
        },
        {
          type: "image",
          name: "ogImage",
          label: "OG Image Path",
        },
      ],
    },
  ],
}
```

**JSON Output Structure (unchanged):**

```json
{
  "company": {
    "name": "OC-Technology Ukraine",
    "fullName": "Innovator for Weighing Technology & Inspection Solutions",
    "tagline": "Precision Equipment for Modern Industry",
    "description": "Leading provider of industrial weighing, inspection, and quality control equipment"
  },
  "contact": {
    "phone": "+380 95 106 1192",
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
    "keywords": [
      "industrial equipment",
      "checkweighers",
      "metal detectors",
      "quality control",
      "Ukraine"
    ],
    "ogImage": "/images/og-image.jpg"
  },
  "copyright": "© 2026 OCS. All rights reserved."
}
```

______________________________________________________________________

### Collection 2: Navigation

**Purpose:** Manage header menu items and footer links.

**File Pattern:** `{en,ua}/navigation.json`

**Field Structure:**

```
Navigation
│
├── Header Menu (collapsible object)
│   ├── Logo (nested object)
│   │   ├── Source Path (string)
│   │   └── Alt Text (string)
│   │
│   └── Menu Items (list of objects)
│       ├── ID (string, required)
│       ├── Label (string, required)
│       └── URL (string, required)
│
└── Footer (collapsible object)
    └── Quick Links (list of objects)
        ├── Label (string, required)
        └── URL (string, required)
```

**TinaCMS Schema Configuration:**

```typescript
{
  name: "navigation",
  label: "Navigation",
  path: "src/content",
  format: "json",
  match: {
    include: "{en,ua}/navigation",
  },
  fields: [
    {
      type: "object",
      name: "header",
      label: "Header Menu",
      fields: [
        {
          type: "object",
          name: "logo",
          label: "Logo",
          fields: [
            {
              type: "string",
              name: "src",
              label: "Source Path",
            },
            {
              type: "string",
              name: "alt",
              label: "Alt Text",
            },
          ],
        },
        {
          type: "object",
          list: true,
          name: "menu",
          label: "Menu Items",
          fields: [
            {
              type: "string",
              name: "id",
              label: "ID",
              required: true,
            },
            {
              type: "string",
              name: "label",
              label: "Label",
              required: true,
            },
            {
              type: "string",
              name: "url",
              label: "URL",
              required: true,
            },
          ],
        },
      ],
    },
    {
      type: "object",
      name: "footer",
      label: "Footer",
      fields: [
        {
          type: "object",
          list: true,
          name: "quickLinks",
          label: "Quick Links",
          fields: [
            {
              type: "string",
              name: "label",
              label: "Label",
              required: true,
            },
            {
              type: "string",
              name: "url",
              label: "URL",
              required: true,
            },
          ],
        },
      ],
    },
  ],
}
```

**JSON Output Structure (unchanged):**

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
      }
    ]
  }
}
```

______________________________________________________________________

### Collection 3: Homepage

**Purpose:** Manage all homepage content sections.

**File Pattern:** `{en,ua}/homepage.json`

**Field Structure:**

```
Homepage
│
├── Hero Section (collapsible object)
│   └── Slides (list of objects)
│       ├── ID (string, required)
│       ├── Title (string, required)
│       ├── Description (textarea)
│       ├── CTA Text (string)
│       ├── CTA Link (string)
│       ├── Background Image (image)
│       └── Accent Color (string)
│
├── Industries Section (collapsible object)
│   ├── Section Title (string, required)
│   ├── Section Description (textarea)
│   └── Industry Cards (list of objects)
│       ├── ID (string, required)
│       ├── Name (string, required)
│       ├── Description (textarea)
│       ├── Icon (string)
│       ├── Link (string)
│       └── Image (image)
│
├── Featured Equipment (collapsible object)
│   ├── Section Title (string, required)
│   ├── Section Description (textarea)
│   └── Equipment IDs (list of strings)
│
├── Why Choose Us (collapsible object)
│   ├── Section Title (string, required)
│   └── Benefits (list of objects)
│       ├── Icon (string, required)
│       ├── Title (string, required)
│       └── Description (textarea)
│
└── Contact Form (collapsible object)
    ├── Form Title (string, required)
    ├── Form Description (textarea)
    ├── Field Labels (nested object)
    │   ├── Name Label (string, required)
    │   ├── Email Label (string, required)
    │   ├── Phone Label (string, required)
    │   └── Message Label (string, required)
    ├── Submit Button Text (string, required)
    ├── Success Message (string, required)
    └── Error Message (string, required)
```

**TinaCMS Schema Configuration:**

```typescript
{
  name: "homepage",
  label: "Homepage",
  path: "src/content",
  format: "json",
  match: {
    include: "{en,ua}/homepage",
  },
  fields: [
    {
      type: "object",
      name: "hero",
      label: "Hero Section",
      fields: [
        {
          type: "object",
          list: true,
          name: "slides",
          label: "Hero Slides",
          fields: [
            {
              type: "string",
              name: "id",
              label: "ID",
              required: true,
            },
            {
              type: "string",
              name: "title",
              label: "Title",
              required: true,
            },
            {
              type: "string",
              name: "description",
              label: "Description",
              ui: {
                component: "textarea",
              },
            },
            {
              type: "string",
              name: "ctaText",
              label: "CTA Text",
            },
            {
              type: "string",
              name: "ctaLink",
              label: "CTA Link",
            },
            {
              type: "image",
              name: "backgroundImage",
              label: "Background Image",
            },
            {
              type: "string",
              name: "accentColor",
              label: "Accent Color",
            },
          ],
        },
      ],
    },
    {
      type: "object",
      name: "industries",
      label: "Industries Section",
      fields: [
        {
          type: "string",
          name: "title",
          label: "Section Title",
          required: true,
        },
        {
          type: "string",
          name: "description",
          label: "Section Description",
          ui: {
            component: "textarea",
          },
        },
        {
          type: "object",
          list: true,
          name: "cards",
          label: "Industry Cards",
          fields: [
            {
              type: "string",
              name: "id",
              label: "ID",
              required: true,
            },
            {
              type: "string",
              name: "name",
              label: "Industry Name",
              required: true,
            },
            {
              type: "string",
              name: "description",
              label: "Description",
              ui: {
                component: "textarea",
              },
            },
            {
              type: "string",
              name: "icon",
              label: "Icon Name",
            },
            {
              type: "string",
              name: "link",
              label: "Link",
            },
            {
              type: "image",
              name: "image",
              label: "Image",
            },
          ],
        },
      ],
    },
    {
      type: "object",
      name: "featuredEquipment",
      label: "Featured Equipment Section",
      fields: [
        {
          type: "string",
          name: "title",
          label: "Section Title",
          required: true,
        },
        {
          type: "string",
          name: "description",
          label: "Section Description",
          ui: {
            component: "textarea",
          },
        },
        {
          type: "string",
          list: true,
          name: "equipmentIds",
          label: "Equipment IDs",
        },
      ],
    },
    {
      type: "object",
      name: "whyChooseUs",
      label: "Why Choose Us Section",
      fields: [
        {
          type: "string",
          name: "title",
          label: "Section Title",
          required: true,
        },
        {
          type: "object",
          list: true,
          name: "benefits",
          label: "Benefits",
          fields: [
            {
              type: "string",
              name: "icon",
              label: "Icon Name",
              required: true,
            },
            {
              type: "string",
              name: "title",
              label: "Benefit Title",
              required: true,
            },
            {
              type: "string",
              name: "description",
              label: "Description",
              ui: {
                component: "textarea",
              },
            },
          ],
        },
      ],
    },
    {
      type: "object",
      name: "contactForm",
      label: "Contact Form Section",
      fields: [
        {
          type: "string",
          name: "title",
          label: "Form Title",
          required: true,
        },
        {
          type: "string",
          name: "description",
          label: "Form Description",
          ui: {
            component: "textarea",
          },
        },
        {
          type: "object",
          name: "fields",
          label: "Field Labels",
          fields: [
            {
              type: "string",
              name: "name",
              label: "Name Field Label",
              required: true,
            },
            {
              type: "string",
              name: "email",
              label: "Email Field Label",
              required: true,
            },
            {
              type: "string",
              name: "phone",
              label: "Phone Field Label",
              required: true,
            },
            {
              type: "string",
              name: "message",
              label: "Message Field Label",
              required: true,
            },
          ],
        },
        {
          type: "string",
          name: "submitButton",
          label: "Submit Button Text",
          required: true,
        },
        {
          type: "string",
          name: "successMessage",
          label: "Success Message",
          required: true,
        },
        {
          type: "string",
          name: "errorMessage",
          label: "Error Message",
          required: true,
        },
      ],
    },
  ],
  ui: {
    router: ({ document }) => {
      const locale = document._sys.filename.split('/')[0];
      return `/${locale}`;
    },
  },
}
```

**JSON Output Structure (unchanged):**

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
        "image": "/images/industries/food.webp"
      }
    ]
  },
  "featuredEquipment": {
    "title": "Featured Equipment",
    "description": "Our most popular solutions",
    "equipmentIds": ["checkweigher-ema-300", "metal-detector-md-500"]
  },
  "whyChooseUs": {
    "title": "Why Choose OCS",
    "benefits": [
      {
        "icon": "award",
        "title": "Industry Leader",
        "description": "Over 30 years of experience in industrial equipment"
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

## Implementation Details

### Files to Modify

1. **Primary Configuration File:**

   - `application/frontend/tina/config.ts` - Update all three collection schemas

1. **Files to Review (may need cleanup):**

   - `application/frontend/src/components/TinaProvider.tsx` - Check if still needed
   - `application/frontend/src/components/TinaWrapper.tsx` - Check if still needed
   - `application/frontend/src/lib/tina-client.ts` - Verify compatibility

1. **Files to Keep Unchanged:**

   - All JSON content files in `src/content/{en,ua}/`
   - Build scripts in `package.json`
   - Authentication configuration

### Implementation Steps

1. **Backup Current Configuration**

   - Create a backup of `tina/config.ts` before making changes
   - Commit current state to git

1. **Update Site Config Collection**

   - Replace existing `siteConfig` collection definition
   - Test in admin panel at `/admin/#/~/en/`
   - Verify JSON output matches expected structure

1. **Update Navigation Collection**

   - Replace existing `navigation` collection definition
   - Test menu editing functionality
   - Verify both header and footer sections work

1. **Update Homepage Collection**

   - Replace existing `homepage` collection definition
   - Test all five sections (hero, industries, equipment, benefits, contact)
   - Verify list items (slides, cards, benefits) work correctly

1. **Remove Demo Post Collection (Optional)**

   - If not needed, remove the `post` collection from schema
   - Or keep it for testing purposes

1. **Test Bilingual Functionality**

   - Edit English content at `/admin/#/~/en/`
   - Edit Ukrainian content at `/admin/#/~/ua/`
   - Verify changes save to correct files
   - Test switching between languages

1. **Verify Build Process**

   - Run `npm run dev` to test development mode
   - Run `npm run build` to test production build
   - Verify no errors in TinaCMS compilation

### Testing Checklist

- [ ] Admin panel loads at `/admin`
- [ ] Can navigate to `/admin/#/~/en/` and see three collections
- [ ] Can navigate to `/admin/#/~/ua/` and see three collections
- [ ] Site Configuration collection shows all four sections (Company, Contact, Social, SEO)
- [ ] Navigation collection shows header and footer sections
- [ ] Homepage collection shows all five sections
- [ ] All collapsible sections expand/collapse correctly
- [ ] Can edit text fields and see changes
- [ ] Can add/remove list items (menu items, slides, cards, benefits)
- [ ] Can upload images where applicable
- [ ] Changes save to correct JSON files
- [ ] JSON structure remains unchanged
- [ ] No errors in browser console
- [ ] Build process completes successfully

## Rollback Plan

If issues arise during implementation:

1. **Immediate Rollback:**

   - Restore backup of `tina/config.ts`
   - Run `npm run dev` to verify admin panel works
   - Commit rollback to git

1. **Partial Rollback:**

   - If only one collection has issues, revert just that collection
   - Keep working collections in new format
   - Debug and fix problematic collection separately

1. **Data Safety:**

   - JSON files are never modified by schema changes
   - All content remains safe in version control
   - Can always access files directly if admin panel fails

## Future Enhancements

After this cleanup is complete and stable, consider:

1. **Visual In-Place Editing**

   - Add click-to-edit functionality on actual pages
   - Requires TinaProvider/TinaWrapper integration with Astro components

1. **Additional Collections**

   - Equipment catalog pages
   - News/blog posts
   - Industry-specific pages

1. **Advanced Features**

   - Image optimization and management
   - Draft/publish workflow
   - Content preview before publishing

1. **UI Improvements**

   - Custom field components for specific needs
   - Conditional field visibility
   - Field validation and help text

## Success Criteria

This implementation will be considered successful when:

1. All three collections (Site Config, Navigation, Homepage) are reorganized with collapsible sections
1. Content editors can easily find and edit all text fields
1. Both English and Ukrainian content can be edited independently
1. JSON file structure remains unchanged
1. No errors in admin panel or build process
1. All existing functionality continues to work
1. Content editors report improved usability

## Appendix

### TinaCMS Field Types Reference

- `string` - Single-line text input
- `textarea` - Multi-line text input (via `ui.component`)
- `image` - Image upload/selection
- `object` - Nested group of fields (collapsible)
- `list: true` - Repeatable items

### Useful TinaCMS Documentation

- [Content Modeling](https://tina.io/docs/schema/)
- [Field Types](https://tina.io/docs/reference/schema/fields/)
- [UI Customization](https://tina.io/docs/extending-tina/custom-field-components/)
- [Collections](https://tina.io/docs/reference/schema/collections/)

### Related Documents

- [TinaCMS Integration Design](./2026-06-22-tina-cms-integration-design.md) - Original integration specification
