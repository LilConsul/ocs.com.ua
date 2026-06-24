# TinaCMS Global Site Configuration Design

**Date:** 2026-06-24
**Status:** Approved
**Author:** AI Assistant
**Stakeholders:** OCS Development Team

## Executive Summary

Convert the Site Configuration collection to TinaCMS Global Forms, making site configuration accessible from the sidebar when editing any collection (especially Homepage). This provides a unified editing experience where editors can manage both page content and site-wide settings without switching between collections.

## Goals

1. **Unified editing experience** - Access site config while editing homepage
1. **Maintain separation of concerns** - Keep site config in separate JSON files
1. **Zero code changes** - Existing data loading and components work unchanged
1. **Bilingual support** - Each language has its own site config global
1. **Backward compatibility** - No breaking changes to existing functionality

## Non-Goals

- Merging site config into homepage JSON files
- Changing the structure of existing JSON files
- Modifying data loading logic
- Altering frontend components

## Current State

**Site Configuration as Collection:**

- Defined in `tina/config.ts` collections array
- Accessible only via burger menu → "Site Configuration"
- Requires switching away from homepage to edit
- Files: `src/content/en/site-config.json`, `src/content/ua/site-config.json`

**User Pain Point:**
When editing homepage, cannot access site configuration without leaving the homepage editing context.

## Proposed Solution

### Architecture

Convert Site Configuration from a collection to TinaCMS Global Forms:

```
Collections (main editing area)     Globals (sidebar section)
├── Homepage                         ├── Site Configuration (English)
├── Navigation                       └── Site Configuration (Ukrainian)
└── Posts (Demo)
```

**Key Principle:** Globals are site-wide settings accessible from any collection's editing interface.

### File Structure

**No changes to file structure:**

```
src/content/
  en/
    homepage.json          # Homepage content
    site-config.json       # Site config (edited as global)
    navigation.json
  ua/
    homepage.json
    site-config.json       # Site config (edited as global)
    navigation.json
```

### TinaCMS Configuration Changes

**File:** `application/frontend/tina/config.ts`

**Changes:**

1. Remove `siteConfig` from `collections` array
1. Add new `globals` array with two global forms

**Implementation:**

> **Note:** TinaCMS v3.x uses collections with `ui: { global: true }` to create global forms, not a separate `globals` array. This is different from TinaCMS v1.x documentation.

```typescript
export default defineConfig({
  branch,
  clientId: process.env.NEXT_PUBLIC_TINA_CLIENT_ID,
  token: process.env.TINA_TOKEN,
  build: {
    outputFolder: "admin",
    publicFolder: "public",
  },
  media: {
    tina: {
      mediaRoot: "",
      publicFolder: "public",
    },
  },
  schema: {
    collections: [
      // Homepage, Navigation, Posts collections remain unchanged

      // Site Configuration (English) - Global Form
      {
        name: "siteConfigEn",
        label: "Site Configuration (English)",
        path: "src/content/en",
        format: "json",
        ui: {
          global: true,  // Makes this a global form
          allowedActions: {
            create: false,
            delete: false,
          },
        },
        match: {
          include: "site-config",
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
          {
            type: "string",
            name: "copyright",
            label: "Copyright Text",
          },
        ],
      },

      // Site Configuration (Ukrainian) - Global Form
      {
        name: "siteConfigUa",
        label: "Site Configuration (Ukrainian)",
        path: "src/content/ua",
        format: "json",
        ui: {
          global: true,  // Makes this a global form
          allowedActions: {
            create: false,
            delete: false,
          },
        },
        match: {
          include: "site-config",
        },
        fields: [
          // Identical structure to English version
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
          {
            type: "string",
            name: "copyright",
            label: "Copyright Text",
          },
        ],
      },
    ],
  },
});
```

### Code Changes

**No code changes required:**

- `lib/content.ts` - `loadSiteConfig()` function unchanged
- `pages/en/index.astro` - Site config loading unchanged
- `pages/ua/index.astro` - Site config loading unchanged
- `components/Header.astro` - Props unchanged
- `components/Footer.astro` - Props unchanged
- `layouts/Layout.astro` - Props unchanged

**Why no changes needed:**

- Globals edit the same JSON files in the same locations
- File structure remains identical
- Only the editing interface changes

### User Experience

**Before (Current):**

1. Open `/admin/index.html`
1. Click burger menu
1. Select "Site Configuration"
1. Choose language (en or ua)
1. Edit fields
1. To edit homepage, must navigate back via burger menu

**After (With Globals):**

1. Open `/admin/index.html`
1. Click "Homepage" collection
1. Select "en/homepage" or "ua/homepage"
1. **Main editing area:** Homepage fields (hero, industries, etc.)
1. **Sidebar "Globals" section:**
   - "Site Configuration (English)" - collapsible
   - "Site Configuration (Ukrainian)" - collapsible
1. Expand either global to edit site config
1. Save homepage and/or globals independently

**Benefits:**

- No context switching to edit site config
- Both language configs accessible from any collection
- Clear visual separation (main content vs. globals)
- Independent save operations

## Implementation Details

### Field Organization

Both global forms organize fields into collapsible sections:

1. **Company Information**

   - Company Name (required)
   - Full Company Name (required)
   - Tagline
   - Description (textarea)

1. **Contact Details**

   - Phone (required)
   - Email (required)
   - Address (nested object):
     - Street
     - City (required)
     - Country (required)
     - Postal Code

1. **Social Media**

   - Facebook URL
   - LinkedIn URL
   - Instagram URL
   - YouTube URL

1. **SEO Settings**

   - Page Title (required)
   - Meta Description (required, textarea)
   - Keywords (list)
   - OG Image Path (image picker)

1. **Copyright Text** (standalone field)

### Data Flow

```
Editor Action → TinaCMS Global Form → Git Commit →
JSON File Update → Astro Build → Static Site
```

**No changes to data flow** - only the editing interface changes.

### Testing Strategy

**Functional Testing:**

1. Verify globals appear in sidebar when editing Homepage
1. Verify globals appear in sidebar when editing Navigation
1. Verify globals appear in sidebar when editing Posts
1. Test editing English site config
1. Test editing Ukrainian site config
1. Verify JSON files update correctly
1. Confirm frontend loads site config properly
1. Test saving homepage without touching globals
1. Test saving globals without touching homepage
1. Test saving both simultaneously

**Regression Testing:**

1. Verify existing homepage editing works
1. Verify existing navigation editing works
1. Verify all frontend pages render correctly
1. Verify site config data appears in Header
1. Verify site config data appears in Footer
1. Verify SEO meta tags render correctly

**Edge Cases:**

1. What happens if global is open but not saved?
1. Can you edit both language globals simultaneously?
1. Does closing a global discard unsaved changes?

## Migration Path

**No migration needed:**

- Existing JSON files remain unchanged
- No data transformation required
- Configuration change only

**Deployment Steps:**

1. Update `tina/config.ts` with globals configuration
1. Restart dev server
1. Test in TinaCMS admin
1. Commit changes
1. Deploy to production

## Rollback Plan

If issues arise, rollback is simple:

1. Revert `tina/config.ts` changes
1. Restore siteConfig as collection
1. Restart dev server

**No data loss possible** - JSON files never change.

## Success Criteria

1. ✅ Site Configuration accessible from Homepage editing sidebar
1. ✅ Both language configs available as globals
1. ✅ No code changes to data loading or components
1. ✅ JSON files maintain current structure
1. ✅ Frontend renders correctly
1. ✅ All existing functionality preserved
1. ✅ Improved editor experience (no context switching)

## Future Considerations

**Potential Enhancements:**

- Add Navigation as a global (if needed from homepage)
- Create additional globals for other site-wide settings
- Consider context-aware global visibility (show only relevant language)

**Not in Scope:**

- Changing JSON file structure
- Merging collections
- Adding new fields
- Modifying frontend components

## Technical Notes

**TinaCMS Globals Documentation:**

- Globals are defined in `schema.globals` array
- Each global has its own name, label, path, and fields
- Globals appear in sidebar for all collections
- Globals save independently from collections
- Multiple globals can be defined

**Why Two Separate Globals:**

- Each language needs its own editable instance
- Maintains clear separation between English and Ukrainian content
- Allows independent editing and saving
- Follows TinaCMS best practices for multilingual content

## Conclusion

Converting Site Configuration to TinaCMS Global Forms provides the requested unified editing experience without requiring any code changes. The solution is clean, maintainable, and follows TinaCMS best practices for site-wide settings.
