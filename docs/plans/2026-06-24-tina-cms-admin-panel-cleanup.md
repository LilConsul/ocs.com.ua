# TinaCMS Admin Panel Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use skills:subagent-driven-development (recommended) or skills:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reorganize TinaCMS admin panel collections (Site Config, Navigation, Homepage) with collapsible sections for improved content editing UX while maintaining existing JSON structure.

**Architecture:** Update TinaCMS schema configuration in `tina/config.ts` to restructure three collections using object fields with clear labels for collapsible sections. Each collection maintains its existing file paths and JSON output structure while providing better organization in the admin UI.

**Tech Stack:** TinaCMS 3.9.3, TypeScript, Astro 6.4.2

______________________________________________________________________

## File Structure

**Files to Modify:**

- `application/frontend/tina/config.ts` - Update all three collection schemas

**Files to Review (no changes expected):**

- `application/frontend/src/content/en/site-config.json` - Verify structure unchanged
- `application/frontend/src/content/ua/site-config.json` - Verify structure unchanged
- `application/frontend/src/content/en/navigation.json` - Verify structure unchanged
- `application/frontend/src/content/ua/navigation.json` - Verify structure unchanged
- `application/frontend/src/content/en/homepage.json` - Verify structure unchanged
- `application/frontend/src/content/ua/homepage.json` - Verify structure unchanged

______________________________________________________________________

## Task 1: Backup and Prepare

**Files:**

- Read: `application/frontend/tina/config.ts`

- [ ] **Step 1: Create git backup branch**

```bash
git checkout -b backup/tina-config-before-cleanup
git push origin backup/tina-config-before-cleanup
git checkout denys/cms
```

Expected: Backup branch created and pushed

- [ ] **Step 2: Read current config to understand structure**

Read the entire `application/frontend/tina/config.ts` file to understand current schema.

Expected: File contains three collections: homepage, navigation, siteConfig

- [ ] **Step 3: Verify admin panel is currently working**

```bash
cd application/frontend
npm run dev
```

Then navigate to `http://localhost:4321/admin` in browser.

Expected: Admin panel loads without errors, shows collections

- [ ] **Step 4: Stop dev server**

Press Ctrl+C in terminal to stop the dev server.

Expected: Server stopped

______________________________________________________________________

## Task 2: Update Site Configuration Collection

**Files:**

- Modify: `application/frontend/tina/config.ts:200-233`

- [ ] **Step 1: Replace siteConfig collection definition**

In `application/frontend/tina/config.ts`, find the `siteConfig` collection (around line 200) and replace it with:

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
    {
      type: "string",
      name: "copyright",
      label: "Copyright Text",
    },
  ],
},
```

- [ ] **Step 2: Save the file**

Save `application/frontend/tina/config.ts`.

Expected: File saved with updated siteConfig collection

- [ ] **Step 3: Test siteConfig collection in admin**

```bash
cd application/frontend
npm run dev
```

Navigate to `http://localhost:4321/admin/#/~/en/` and click on "Site Configuration".

Expected: Form shows four collapsible sections: Company Information, Contact Details, Social Media, SEO Settings

- [ ] **Step 4: Verify English site-config edits work**

In the admin panel:

1. Expand "Company Information" section
1. Change "Company Name" to "Test Company"
1. Click Save
1. Check that `application/frontend/src/content/en/site-config.json` was updated

Expected: JSON file updated with new company name, structure unchanged

- [ ] **Step 5: Verify Ukrainian site-config edits work**

Navigate to `http://localhost:4321/admin/#/~/ua/` and click on "Site Configuration".

1. Expand "Company Information" section
1. Verify Ukrainian content is shown
1. Make a small edit and save

Expected: Ukrainian JSON file updated, structure unchanged

- [ ] **Step 6: Revert test changes**

Manually revert the test changes in both JSON files to original values.

Expected: Files restored to original state

- [ ] **Step 7: Stop dev server**

Press Ctrl+C to stop the dev server.

Expected: Server stopped

- [ ] **Step 8: Commit siteConfig changes**

```bash
git add application/frontend/tina/config.ts
git commit -m "refactor(tina): reorganize site-config collection with collapsible sections

- Add Company Information section
- Add Contact Details section with nested Address
- Add Social Media section
- Add SEO Settings section
- Maintain existing JSON structure"
```

Expected: Changes committed

______________________________________________________________________

## Task 3: Update Navigation Collection

**Files:**

- Modify: `application/frontend/tina/config.ts:158-198`

- [ ] **Step 1: Replace navigation collection definition**

In `application/frontend/tina/config.ts`, find the `navigation` collection (around line 158) and replace it with:

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
},
```

- [ ] **Step 2: Save the file**

Save `application/frontend/tina/config.ts`.

Expected: File saved with updated navigation collection

- [ ] **Step 3: Test navigation collection in admin**

```bash
cd application/frontend
npm run dev
```

Navigate to `http://localhost:4321/admin/#/~/en/` and click on "Navigation".

Expected: Form shows two collapsible sections: Header Menu, Footer

- [ ] **Step 4: Verify menu items list works**

In the admin panel:

1. Expand "Header Menu" section
1. Expand "Menu Items" list
1. Click on first menu item
1. Change the label
1. Click Save

Expected: JSON file updated with new label, structure unchanged

- [ ] **Step 5: Verify adding/removing menu items works**

In the admin panel:

1. Click "Add Menu Items" button
1. Fill in ID, Label, URL
1. Save
1. Delete the newly added item
1. Save again

Expected: Can add and remove items successfully

- [ ] **Step 6: Verify Ukrainian navigation edits work**

Navigate to `http://localhost:4321/admin/#/~/ua/` and click on "Navigation".

1. Verify Ukrainian content is shown
1. Make a small edit and save

Expected: Ukrainian JSON file updated, structure unchanged

- [ ] **Step 7: Revert test changes**

Manually revert all test changes in both JSON files to original values.

Expected: Files restored to original state

- [ ] **Step 8: Stop dev server**

Press Ctrl+C to stop the dev server.

Expected: Server stopped

- [ ] **Step 9: Commit navigation changes**

```bash
git add application/frontend/tina/config.ts
git commit -m "refactor(tina): reorganize navigation collection with collapsible sections

- Add Header Menu section with Logo and Menu Items
- Add Footer section with Quick Links
- Maintain existing JSON structure"
```

Expected: Changes committed

______________________________________________________________________

## Task 4: Update Homepage Collection

**Files:**

- Modify: `application/frontend/tina/config.ts:37-156`

- [ ] **Step 1: Replace homepage collection definition**

In `application/frontend/tina/config.ts`, find the `homepage` collection (around line 37) and replace it with:

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
},
```

- [ ] **Step 2: Save the file**

Save `application/frontend/tina/config.ts`.

Expected: File saved with updated homepage collection

- [ ] **Step 3: Test homepage collection in admin**

```bash
cd application/frontend
npm run dev
```

Navigate to `http://localhost:4321/admin/#/~/en/` and click on "Homepage".

Expected: Form shows five collapsible sections: Hero Section, Industries Section, Featured Equipment Section, Why Choose Us Section, Contact Form Section

- [ ] **Step 4: Verify hero slides list works**

In the admin panel:

1. Expand "Hero Section"
1. Expand "Hero Slides" list
1. Click on first slide
1. Change the title
1. Click Save

Expected: JSON file updated with new title, structure unchanged

- [ ] **Step 5: Verify industries cards list works**

In the admin panel:

1. Expand "Industries Section"
1. Expand "Industry Cards" list
1. Click on first card
1. Change the name
1. Click Save

Expected: JSON file updated with new name, structure unchanged

- [ ] **Step 6: Verify benefits list works**

In the admin panel:

1. Expand "Why Choose Us Section"
1. Expand "Benefits" list
1. Click on first benefit
1. Change the title
1. Click Save

Expected: JSON file updated with new title, structure unchanged

- [ ] **Step 7: Verify contact form fields work**

In the admin panel:

1. Expand "Contact Form Section"
1. Expand "Field Labels"
1. Change "Name Field Label"
1. Click Save

Expected: JSON file updated with new label, structure unchanged

- [ ] **Step 8: Verify Ukrainian homepage edits work**

Navigate to `http://localhost:4321/admin/#/~/ua/` and click on "Homepage".

1. Verify Ukrainian content is shown
1. Make a small edit in any section and save

Expected: Ukrainian JSON file updated, structure unchanged

- [ ] **Step 9: Revert test changes**

Manually revert all test changes in both JSON files to original values.

Expected: Files restored to original state

- [ ] **Step 10: Stop dev server**

Press Ctrl+C to stop the dev server.

Expected: Server stopped

- [ ] **Step 11: Commit homepage changes**

```bash
git add application/frontend/tina/config.ts
git commit -m "refactor(tina): reorganize homepage collection with collapsible sections

- Add Hero Section with slides list
- Add Industries Section with cards list
- Add Featured Equipment Section
- Add Why Choose Us Section with benefits list
- Add Contact Form Section with field labels
- Maintain existing JSON structure and router"
```

Expected: Changes committed

______________________________________________________________________

## Task 5: Final Verification and Cleanup

**Files:**

- Read: `application/frontend/tina/config.ts`

- Read: All JSON content files

- [ ] **Step 1: Verify all collections in admin panel**

```bash
cd application/frontend
npm run dev
```

Navigate to `http://localhost:4321/admin/#/~/en/` and verify:

1. Site Configuration shows 4 sections
1. Navigation shows 2 sections
1. Homepage shows 5 sections

Navigate to `http://localhost:4321/admin/#/~/ua/` and verify:

1. All three collections show Ukrainian content
1. All sections are collapsible and expandable

Expected: All collections work correctly for both languages

- [ ] **Step 2: Test full editing workflow**

In English admin:

1. Edit Site Configuration - change company name
1. Edit Navigation - change a menu label
1. Edit Homepage - change hero title
1. Save all changes

Expected: All three JSON files updated correctly

- [ ] **Step 3: Verify website still renders correctly**

Navigate to `http://localhost:4321/en/` in browser.

Expected: Website displays with updated content, no errors in console

- [ ] **Step 4: Revert test changes**

Manually revert all test changes in JSON files to original values.

Expected: Files restored to original state

- [ ] **Step 5: Test production build**

```bash
npm run build
```

Expected: Build completes successfully with no errors

- [ ] **Step 6: Stop dev server**

Press Ctrl+C to stop the dev server.

Expected: Server stopped

- [ ] **Step 7: Review final config file**

Read `application/frontend/tina/config.ts` and verify:

1. All three collections are updated
1. No syntax errors
1. Field names match JSON structure
1. All required fields are marked

Expected: Config file is clean and correct

- [ ] **Step 8: Check for unused components**

Check if `TinaProvider.tsx` and `TinaWrapper.tsx` are still used in the codebase:

```bash
cd application/frontend
grep -r "TinaProvider" src/
grep -r "TinaWrapper" src/
```

Expected: If not used, note for potential future cleanup (not part of this task)

- [ ] **Step 9: Final commit**

```bash
git add -A
git commit -m "chore(tina): complete admin panel cleanup

All three collections now use collapsible sections:
- Site Configuration: 4 sections
- Navigation: 2 sections
- Homepage: 5 sections

Verified:
- Both languages (en/ua) work correctly
- JSON structure unchanged
- Website renders correctly
- Production build succeeds"
```

Expected: Final commit created

- [ ] **Step 10: Push changes**

```bash
git push origin denys/cms
```

Expected: Changes pushed to remote

______________________________________________________________________

## Success Criteria

- [ ] All three collections (Site Config, Navigation, Homepage) reorganized with collapsible sections
- [ ] Admin panel at `/admin/#/~/en/` shows organized forms for English content
- [ ] Admin panel at `/admin/#/~/ua/` shows organized forms for Ukrainian content
- [ ] All JSON files maintain their original structure
- [ ] Website renders correctly with no console errors
- [ ] Production build completes successfully
- [ ] All changes committed and pushed to git

## Rollback Plan

If issues occur:

1. **Immediate rollback:**

   ```bash
   git checkout backup/tina-config-before-cleanup -- application/frontend/tina/config.ts
   git commit -m "rollback: revert tina config changes"
   ```

1. **Partial rollback:**

   - Revert specific collection by copying from backup branch
   - Keep working collections, fix problematic one separately

1. **Data safety:**

   - JSON files are never modified by schema changes
   - All content remains safe in version control
