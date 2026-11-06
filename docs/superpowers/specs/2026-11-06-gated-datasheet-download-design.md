# Gated datasheet download — design

Target app: `application/frontend` (Astro, static output, Node standalone adapter).
Builds on the contact form: `src/pages/api/contact.ts`, `src/lib/contact/*`,
`src/components/contact/*`.

## Goal

On a product page, "Technical Datasheet" no longer links to the PDF. The visitor first fills in a
short lead form in a modal. After a successful submit the team gets an email describing the
download, and the browser downloads the PDF.

The gate is hard: the PDF URL is not in the HTML or JSON-LD, and the files are not served as
static assets.

## Scope

### In

- Datasheet PDFs move out of `public/` into `application/frontend/private/datasheets/`.
- Product page: the datasheet `<a>` becomes a `<button>` that opens a `<dialog>` with the lead form.
- `POST /api/datasheet-request`: validates, checks spam, emails the team, returns a signed download URL.
- `GET /api/datasheet?token=…`: verifies the token and streams the PDF as an attachment.
- Email template (HTML and text, Ukrainian, like the contact email).
- Removal of `datasheetUrl` from the product JSON-LD.
- Decap CMS `datasheet` field points at the private folder.
- Apache proxy fragment, env schema, secrets mapping and deployment docs for the new route and secret.
- EN/UA translations for the new strings through the inline `_()` workflow.

### Out

- Confirmation email to the visitor.
- Download counters or a stored lead list.
- Gating of other documents (`DocumentsCard`).
- A free-text message field and the equipment field in the modal.
- Non-PDF datasheets (see Content migration).

## Storage

- New folder `application/frontend/private/datasheets/`. Neither Apache (`dist/client`) nor Astro's
  static handler serves it.
- The only datasheet PDF in the repo today is `public/assets/equipment/hc-m/datasheet.pdf`. It is
  moved with `git mv` to `private/datasheets/hc-m.pdf`, and the `datasheet:` frontmatter of both
  `hc-m` language files is updated.
- Other products (`hc-a`, `ec-e`, `hc-sl`, `hc-warehouse`) reference `/assets/equipment/<p>/datasheet.pdf`
  files that are not in the repo, so they already show no button. Their frontmatter `datasheet`
  is set to `null` in the migration. Otherwise the old references would all end in
  `datasheet.pdf` and could match one shared file later. The button appears once a PDF is
  uploaded through the CMS.
- The build copies `private/datasheets/` to `dist/private/datasheets/`. The deploy already
  `rsync --delete`s `dist/`, so the files ship with the build. The runtime resolves the folder
  relative to the server bundle location (not `process.cwd()`), so the systemd working directory
  does not matter. In `astro dev` it resolves to `private/datasheets/` in the repo.
- CMS: see "CMS upload" below.

### CMS upload

An editor uploads a datasheet through the `datasheet` file field of a product, as today. The
field in `src/pages/admin/_config.template.yml` changes to:

```yaml
- label: "Datasheet"
  name: "datasheet"
  widget: "file"
  required: false
  i18n: duplicate
  media_folder: "/application/frontend/private/datasheets"
  public_folder: "/datasheets"
  hint: "PDF only. Name the file after the product, e.g. hc-m.pdf. Uploading a file with an existing name replaces it for every product that uses it. Visitors can download it only after filling in the form."
```

- A field-level `media_folder` starting with `/` is resolved from the repo root by Decap
  (`selectMediaFolder` in `decap-cms-core`). The upload is committed to
  `application/frontend/private/datasheets/<name>.pdf` on the editorial-workflow branch, in the
  same flow as the product text.
- The saved frontmatter value is `/datasheets/<name>.pdf`. This is a reference, not a URL
  (nothing serves `/datasheets/`). The accepted format is strict:
  `^/datasheets/[A-Za-z0-9._-]+\.pdf$`. The name part is looked up in the private folder, so a
  value can never point outside it, and legacy values like `/assets/...` are ignored.
- The media library for this field lists the private folder through the GitHub API (the existing
  recursive `getMedia` patch in `src/cms/github-media.ts`), so editors can pick, reuse or
  replace an uploaded file. This does not depend on the site serving the file. Image previews do
  not apply to PDFs, so a failed preview in the CMS is expected.
- Decap cannot restrict a `file` widget to PDFs. A value that does not match the format above
  (for example an image picked from another folder) gives no button and a build warning like the
  one `existingFile` logs today. The hint tells editors PDF only.
- Files are not put in per-product sub-folders, because Decap cannot template a field folder
  from `file_name` on a product that is not saved yet.
- Publishing: the PDF reaches production like any content change. The merged PR triggers the
  build, and the build copies `private/datasheets/` into `dist`. Until then the old state stays.
- Clearing the field or deleting the PDF removes the button on the next build. The download
  endpoint re-checks the file on disk, so a request for a file that is gone returns 404.

### Content migration

Three products (`hc-a-md`, `hc-m-mdi` in both languages) hold a `.webp` image in `datasheet`.
Only existing `.pdf` files in the private folder count as datasheets, so those products show no
button until a PDF is uploaded. Their frontmatter `datasheet` is set to `null`, and the existing
images are left in place (they may be used elsewhere).

## Product page

File: `src/pages/[lang]/catalogue/equipment/[category]/[slug].astro`.

- `existingFile()` for the datasheet is replaced by a build-time check that a `.pdf` with that
  base name exists in `private/datasheets/`. The result is a boolean `hasDatasheet`; the PDF path
  is never passed to the template.
- `datasheetUrl` is removed from `productSchema()` and from `subjectOf` in
  `src/lib/structured-data/product.ts` (and its test).
- If `hasDatasheet`, render the existing button styling as `<button type="button">` plus a
  `DatasheetModal` component (new, in `src/components/catalogue/`).

### DatasheetModal

- Native `<dialog>` (focus trap, Esc, `::backdrop` for free), opened by the button and closed
  by a close button or Esc.
- Fields: name, job title, company, phone, email, sector, using `FormField`. Same labels,
  placeholders and autocomplete values as `ContactForm`. Honeypot `website` and a `loadedAt`
  timestamp, as in the contact form.
- Hidden context sent with the form: `category`, `slug`, `lang`.
- Client logic lives in `src/lib/catalogue/datasheet-script.ts`, which reuses the field
  validation and reCAPTCHA execution helpers from `form-script.ts`. If those are not exported
  yet, the shared parts are extracted into one module instead of copying them. reCAPTCHA action is `datasheet`.
- Flow: validate → get token → `fetch("/api/datasheet-request")` → on `{ok, url}` set
  `window.location.href = url`. The response is an attachment, so the page stays on the product.
  Then show a success message and close the dialog.
- Errors use the same translated messages map as the contact form
  (rate limit, reCAPTCHA, SMTP, validation, unexpected).
- `<noscript>` note with phone and email, as in `ContactForm`.
- The reCAPTCHA script loads when the dialog opens, not on page load, and uses the existing
  `RECAPTCHA_SITE_KEY`.

## API

### `POST /api/datasheet-request` (`src/pages/api/datasheet-request.ts`, `prerender = false`)

Body: `name, jobTitle, company, phone, email, sector, website, loadedAt, recaptchaToken, category, slug, lang`.

Order, mirroring `/api/contact`:

1. Origin check (request origin or `SITE_URL` origin) → 403.
1. Body cap 32 KB → 413. JSON parse → 400. Type guard → 400.
1. Spam checks (`isSpamSubmission`): honeypot, time-trap, disposable email, etc. A hit returns
   `{ok:true}` with no `url` and no email, so bots learn nothing. The client shows the generic
   error if `url` is missing.
1. Rate limit: own limiter instance, 5 per IP per 10 minutes → 429.
1. reCAPTCHA v3, action `datasheet`, score ≥ 0.5 → 400/502.
1. Validation: the contact validation minus `message` and `equipment` → 422 with field codes.
   Implemented by splitting `validateContactForm` into reusable field checks. The contact
   behavior and its tests do not change.
1. Product lookup: `getCollection("equipment")` finds the entry for `lang`, `category`, `slug`
   on the server. Unknown product, or a product without a `.pdf` that exists on disk → 404.
1. Email the team (`sendDatasheetEmail`); SMTP failure → 502 and no URL is issued.
1. Return `{ok:true, url:"/api/datasheet?token=<token>"}`.

### `GET /api/datasheet?token=…` (`src/pages/api/datasheet.ts`, `prerender = false`)

- Token = `base64url(payload).base64url(hmac)`. Payload = `{f: "<file base name>", exp: <unix seconds>}`,
  HMAC-SHA256 with `DATASHEET_TOKEN_SECRET`, compared with `timingSafeEqual`.
- Token lifetime: 5 minutes. Reusable within that time (a retried or resumed download should work).
- Invalid, tampered or expired token → 403. Missing file → 404.
- Success: stream the PDF with `Content-Type: application/pdf`,
  `Content-Disposition: attachment; filename="<name>.pdf"`, `Cache-Control: private, no-store`.

Token helpers live in `src/lib/datasheet/token.ts` (`signToken`, `verifyToken`, with an
injectable clock for tests). File resolution lives in `src/lib/datasheet/files.ts`
(`resolveDatasheet(baseName)`: basename-only, `.pdf`-only, inside the private folder).

## Email

- `sendDatasheetEmail` in `src/lib/datasheet/mailer.ts`, reusing `MailerConfig`, `htmlEscape`,
  `extractSiteHost`, `render` and `stripHeaderChars`.
- Templates `src/lib/datasheet/templates/datasheet.html` and `datasheet.txt`, Ukrainian like the
  contact email.
- To: `CONTACT_TO`. Reply-To: the visitor's email.
- Subject: `Завантаження специфікації: <product title> — <company>` (header chars stripped).
- Body: name, job title, company, phone, email, sector, product title, category, datasheet file
  name, product page URL (built from `SITE_URL`), page language, UTC timestamp, client IP.

## Configuration

- `astro.config.mjs` env schema: `DATASHEET_TOKEN_SECRET` (`context: "server"`, `access: "secret"`).
- `.github/secrets.*.yaml` maps the new secret into the env file; `docs/info/deployment.md` and
  `docs/info/environment.md` document it. A random value of at least 32 bytes is required.
- `application/infra/apache/dev.ocs.com.ua.ocs.conf` gets `ProxyPass`/`ProxyPassReverse` for
  `/api/datasheet-request` and `/api/datasheet`. `ProxyPass /api/datasheet` is a prefix match and
  would already cover `/api/datasheet-request`, but both lines are written explicitly for
  clarity. The infra tests are updated if they assert the fragment content.
- `.env.example` / local env docs get the new variable.

## Errors and edge cases

- JS disabled: the button does nothing; the `<noscript>` note offers phone and email.
- Token expires while the dialog is open: the download link returns 403; the user submits again.
- Same visitor submits repeatedly: rate limit applies, each success sends one email.
- A product has a datasheet in only one language file: the lookup is per language entry, so
  the button appears only where that entry has one.

## Testing (TDD, Vitest like the existing suites)

- `tests/lib/datasheet/token.test.ts`: round trip, tampering, expiry, wrong secret, malformed input.
- `tests/lib/datasheet/files.test.ts`: traversal attempts (`..`, absolute path, encoded), non-PDF,
  missing file.
- `tests/lib/datasheet/mailer.test.ts`: template variables, HTML escaping, header-injection stripping.
- `tests/pages/api/datasheet-request.test.ts`: origin, size, spam silent-success, rate limit,
  reCAPTCHA failure, validation errors, unknown product, SMTP failure (no URL), success returns a
  verifiable URL and sends one email.
- `tests/pages/api/datasheet.test.ts`: valid token streams the PDF with attachment headers;
  tampered, expired and missing-file cases.
- Validation split: existing `validate` tests stay green unchanged; new tests cover the
  message-less variant.
- `tests/lib/structured-data/product` test updated: no `subjectOf` datasheet entry.
- Client script test for the datasheet flow if the logic lives in `src/lib`, like `form-script`.
- Reference format test: `/datasheets/x.pdf` accepted; `/assets/...`, `..`, encoded traversal,
  other extensions and `null` rejected.
- Final checks: `bun run test`, lint, typecheck and `bun run build`. Confirm `dist/client`
  contains no `.pdf` and that the product HTML has no datasheet URL.
- Manual CMS check (Decap behavior cannot be unit tested): in the admin, upload a PDF to a
  product's datasheet field, confirm the commit path is `application/frontend/private/datasheets/`
  and the saved value is `/datasheets/<name>.pdf`. Then build and confirm the button appears.

## Open decisions (resolved)

- Modal on the product page, not a redirect to the contact page.
- Email goes to the team only.
- Hard gate with signed, short-lived download URLs.
- Products whose `datasheet` is an image lose the button until a PDF is uploaded.
- New secret `DATASHEET_TOKEN_SECRET`.
