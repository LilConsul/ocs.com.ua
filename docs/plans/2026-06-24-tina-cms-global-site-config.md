# TinaCMS Global Site Configuration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use skills:subagent-driven-development (recommended) or skills:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert Site Configuration from a TinaCMS collection to Global Forms, making it accessible from the sidebar when editing any collection.

**Architecture:** Remove siteConfig from the collections array and add it to a new globals array with two separate global forms (English and Ukrainian). This is a pure configuration change with zero code modifications.

**Tech Stack:** TinaCMS 3.9.3, TypeScript

______________________________________________________________________

## File Structure

**Files to Modify:**

- `application/frontend/tina/config.ts` - TinaCMS schema configuration

**Files to Review (no changes expected):**

- `application/frontend/src/content/en/site-config.json` - Verify structure unchanged
- `application/frontend/src/content/ua/site-config.json` - Verify structure unchanged

______________________________________________________________________

## Task 1: Backup Current Configuration

**Files:**

- Read: `application/frontend/tina/config.ts`

- [ ] **Step 1: Read current siteConfig collection**

Read lines 200-233 of `application/frontend/tina/config.ts` to understand the current siteConfig collection structure.

Expected: Collection with fields for siteName, siteUrl, description, contact (object), and social (object)

- [ ] **Step 2: Note the current JSON file structure**

Check `application/frontend/src/content/en/site-config.json` to see the actual data structure.

Expected: JSON with company, contact (with nested address), social, seo, and copyright fields

- [ ] **Step 3: Create backup branch**

```bash
git checkout -b backup/tina-config-before-globals
git push origin backup/tina-config-before-globals
git checkout denys/cms
```

Expected: Backup branch created and pushed

______________________________________________________________________

## Task 2: Remove siteConfig from Collections

**Files:**

- Modify: `application/frontend/tina/config.ts:200-233`

- [ ] **Step 1: Locate the siteConfig collection**

Find the siteConfig collection definition in the collections array (around line 200).

Expected: Found collection starting with `name: "siteConfig"`

- [ ] **Step 2: Delete the entire siteConfig collection**

Remove the entire siteConfig collection object from the collections array, including:

- The opening brace
- All fields
- The closing brace and comma

Lines to delete: approximately 200-233

Expected: siteConfig collection removed, collections array now contains only homepage, navigation, and post

- [ ] **Step 3: Verify syntax**

Check that the collections array is still valid TypeScript:

- Proper comma separation between remaining collections
- No trailing commas after the last collection
- Closing bracket for collections array intact

Expected: No syntax errors, collections array properly formatted

______________________________________________________________________

## Task 3: Add Globals Array with English Site Config

**Files:**

- Modify: `application/frontend/tina/config.ts:36-37`

- [ ] **Step 1: Add globals array after collections**

After the closing bracket of the `collections` array (around line 282), add a new `globals` array:

```typescript
    ],
    globals: [

    ],
  },
});
```

Expected: Empty globals array added to schema

- [ ] **Step 2: Add English site config global**

Inside the globals array, add the first global form:

```typescript
    globals: [
      {
        name: "siteConfigEn",
        label: "Site Configuration (English)",
        path: "src/content/en",
        format: "json",
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
    ],
```

Expected: English site config global added with all field sections

- [ ] **Step 3: Verify TypeScript syntax**

Check for:

- Proper comma after the closing brace of siteConfigEn
- All nested objects properly closed
- No syntax errors

Expected: No TypeScript errors

______________________________________________________________________

## Task 4: Add Ukrainian Site Config Global

**Files:**

- Modify: `application/frontend/tina/config.ts` (after siteConfigEn global)

- [ ] **Step 1: Add Ukrainian site config global**

After the siteConfigEn global (after its closing brace and comma), add the Ukrainian version:

```typescript
      {
        name: "siteConfigUa",
        label: "Site Configuration (Ukrainian)",
        path: "src/content/ua",
        format: "json",
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
```

Expected: Ukrainian site config global added with identical field structure

- [ ] **Step 2: Verify no trailing comma**

Check that siteConfigUa does NOT have a comma after its closing brace (it's the last item in the globals array).

Expected: No comma after siteConfigUa closing brace

- [ ] **Step 3: Save the file**

Save `application/frontend/tina/config.ts`.

Expected: File saved successfully

______________________________________________________________________

## Task 5: Test Configuration in Admin Panel

**Files:**

- Test: TinaCMS admin interface

- [ ] **Step 1: Restart dev server**

Stop the current dev server (Ctrl+C) and restart:

```bash
cd application/frontend
npm run dev
```

Expected: Server starts without errors, TinaCMS compiles successfully

- [ ] **Step 2: Open TinaCMS admin**

Navigate to `http://localhost:4321/admin/index.html` in browser.

Expected: Admin panel loads, shows collections list

- [ ] **Step 3: Verify collections list**

Check that the collections list shows:

- Homepage
- Navigation
- Posts (Demo)

And does NOT show "Site Configuration" as a collection.

Expected: Site Configuration removed from collections

- [ ] **Step 4: Open Homepage collection**

Click "Homepage" collection, then select "en/homepage".

Expected: Homepage editing interface opens

- [ ] **Step 5: Verify Globals section appears**

In the sidebar, look for a "Globals" section (may be collapsible).

Expected: "Globals" section visible in sidebar

- [ ] **Step 6: Expand Globals section**

Click to expand the Globals section.

Expected: Shows two items:

- "Site Configuration (English)"

- "Site Configuration (Ukrainian)"

- [ ] **Step 7: Open English site config global**

Click "Site Configuration (English)" to expand it.

Expected: Form shows five collapsible sections:

- Company Information
- Contact Details
- Social Media
- SEO Settings
- Copyright Text (standalone field)

______________________________________________________________________

## Task 6: Test Editing English Site Config

**Files:**

- Test: `application/frontend/src/content/en/site-config.json`

- [ ] **Step 1: Expand Company Information section**

In the English site config global, expand "Company Information".

Expected: Shows fields: Company Name, Full Company Name, Tagline, Description

- [ ] **Step 2: Make a test edit**

Change "Company Name" from current value to "Test Company Name".

Expected: Field updates in the form

- [ ] **Step 3: Save the global**

Click the "Save" button for the global (not the homepage).

Expected: Success message, global saved

- [ ] **Step 4: Verify JSON file updated**

Check `application/frontend/src/content/en/site-config.json` - the company.name field should now be "Test Company Name".

Expected: JSON file updated with new value

- [ ] **Step 5: Revert the test change**

Change "Company Name" back to original value and save.

Expected: JSON file reverted to original value

______________________________________________________________________

## Task 7: Test Editing Ukrainian Site Config

**Files:**

- Test: `application/frontend/src/content/ua/site-config.json`

- [ ] **Step 1: Open Ukrainian site config global**

In the Globals section, click "Site Configuration (Ukrainian)" to expand it.

Expected: Form shows same five sections as English version

- [ ] **Step 2: Verify Ukrainian content**

Check that the fields contain Ukrainian text (e.g., company name in Ukrainian).

Expected: Ukrainian content displayed correctly

- [ ] **Step 3: Make a test edit**

Change any field (e.g., tagline) to a test value.

Expected: Field updates in the form

- [ ] **Step 4: Save the global**

Click "Save" for the Ukrainian global.

Expected: Success message, global saved

- [ ] **Step 5: Verify JSON file updated**

Check `application/frontend/src/content/ua/site-config.json` - the changed field should have the new value.

Expected: JSON file updated correctly

- [ ] **Step 6: Revert the test change**

Change the field back to original value and save.

Expected: JSON file reverted

______________________________________________________________________

## Task 8: Test Globals Accessibility from Other Collections

**Files:**

- Test: TinaCMS admin interface

- [ ] **Step 1: Navigate to Navigation collection**

Click "Navigation" collection in the sidebar.

Expected: Navigation collection opens

- [ ] **Step 2: Verify Globals section present**

Check that the "Globals" section appears in the sidebar.

Expected: Globals section visible with both site config globals

- [ ] **Step 3: Navigate to Posts collection**

Click "Posts (Demo)" collection.

Expected: Posts collection opens

- [ ] **Step 4: Verify Globals section present**

Check that the "Globals" section appears in the sidebar.

Expected: Globals section visible with both site config globals

- [ ] **Step 5: Confirm globals are accessible everywhere**

Verify that you can expand and view (but don't edit) the site config globals from any collection.

Expected: Globals accessible from all collections

______________________________________________________________________

## Task 9: Verify Frontend Still Works

**Files:**

- Test: Frontend pages

- [ ] **Step 1: Navigate to English homepage**

Open `http://localhost:4321/en/` in browser.

Expected: Homepage loads correctly

- [ ] **Step 2: Verify site config data in Header**

Check that the header shows correct company name and navigation.

Expected: Header displays site config data correctly

- [ ] **Step 3: Verify site config data in Footer**

Scroll to footer and check that contact info, social links, and copyright appear correctly.

Expected: Footer displays site config data correctly

- [ ] **Step 4: Navigate to Ukrainian homepage**

Open `http://localhost:4321/ua/` in browser.

Expected: Ukrainian homepage loads correctly

- [ ] **Step 5: Verify Ukrainian site config data**

Check header and footer for Ukrainian content.

Expected: Ukrainian site config data displays correctly

- [ ] **Step 6: Check browser console**

Open browser console (F12) and check for any errors.

Expected: No errors related to site config loading

______________________________________________________________________

## Task 10: Commit Changes

**Files:**

- Commit: `application/frontend/tina/config.ts`

- [ ] **Step 1: Review changes**

```bash
git diff application/frontend/tina/config.ts
```

Expected: Shows removal of siteConfig collection and addition of globals array with two global forms

- [ ] **Step 2: Stage changes**

```bash
git add application/frontend/tina/config.ts
```

Expected: File staged for commit

- [ ] **Step 3: Commit with descriptive message**

```bash
git commit -m "refactor(tina): convert site config to global forms

- Remove siteConfig from collections array
- Add globals array with siteConfigEn and siteConfigUa
- Enable site config editing from any collection sidebar
- Maintain existing JSON file structure
- No code changes required"
```

Expected: Changes committed successfully

- [ ] **Step 4: Verify commit**

```bash
git log -1 --stat
```

Expected: Shows commit with tina/config.ts modified

______________________________________________________________________

## Task 11: Final Verification

**Files:**

- Test: Complete system

- [ ] **Step 1: Restart dev server one more time**

Stop and restart the dev server to ensure clean state:

```bash
cd application/frontend
npm run dev
```

Expected: Server starts without errors

- [ ] **Step 2: Test complete editing workflow**

1. Open admin at `/admin/index.html`
1. Open Homepage collection
1. Edit a homepage field (e.g., hero title)
1. Edit English site config (e.g., company tagline)
1. Save both
1. Refresh frontend page
1. Verify both changes appear

Expected: Both homepage and site config changes reflected on frontend

- [ ] **Step 3: Verify no regressions**

Check that:

- All collections still work
- Navigation editing works
- Posts editing works
- No console errors
- No TypeScript errors

Expected: All functionality working as before

- [ ] **Step 4: Document the change**

Add a note to project documentation (if exists) about the new globals feature.

Expected: Documentation updated (or skip if no docs exist)

______________________________________________________________________

## Success Criteria

- ✅ Site Configuration removed from collections array
- ✅ Globals array added with siteConfigEn and siteConfigUa
- ✅ Both globals accessible from any collection sidebar
- ✅ English site config edits update en/site-config.json correctly
- ✅ Ukrainian site config edits update ua/site-config.json correctly
- ✅ Frontend loads and displays site config data correctly
- ✅ No code changes required (only config)
- ✅ No TypeScript or runtime errors
- ✅ Changes committed with clear message

______________________________________________________________________

## Rollback Plan

If issues arise:

1. **Revert the commit:**

```bash
git revert HEAD
```

2. **Or restore from backup branch:**

```bash
git checkout backup/tina-config-before-globals -- application/frontend/tina/config.ts
git commit -m "revert: restore site config as collection"
```

3. **Restart dev server:**

```bash
cd application/frontend
npm run dev
```

Expected: Site Configuration back as a collection, globals removed
