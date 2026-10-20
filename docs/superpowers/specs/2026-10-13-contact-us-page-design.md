# Contact Us page — design

Source mockup: `docs/design/contact-us/` (`code.html`, `screen.png`, `DESIGN.md`).
Target app: `application/frontend` (Astro, static output, Node standalone adapter).

## Goal

A bilingual (`/en/contact`, `/ua/contact`) contact page with a working inquiry form.
Submissions are emailed to `info@ocs.com.ua` and protected against spam. The page is
optimized for SEO and LLM indexing.

## Scope

### In

- Hero with breadcrumb, H1, intro and partner badges (Wipotec, Mesutronic).
- Inquiry form (see Fields).
- Contact info card: one phone, one email, working hours, address.
- Kyiv office panel with address, embedded map and a "Get route" link.
- "Authorized Documentation" card with placeholder `#` links (layout parity with the mockup).
- "Contact Us" button in the header (desktop and mobile menu).
- `/api/contact` endpoint with spam protection and SMTP delivery.
- Full EN/UA translation through the inline `_()` workflow.
- SEO metadata and JSON-LD.

### Out

- Regional hubs (Lviv, Dnipro, Odesa), emergency hotline, FAQ section.
- Second phone, `service@` email, "Copy GPS" button and invented coordinates.
- File upload, NDA text, consent checkbox, speed/mass/accuracy block.
- Unverified claims from the mockup: "Est. 2015", "\< 2h response", "SLA Tier 1",
  "ISO/IEC 17025", "MID Certified", "Class E2/F1 weights". These are not stored anywhere.

## Page structure

Route: `src/pages/[lang]/contact.astro`, static, `getStaticPaths` over `languages`,
same lang validation as `[lang]/index.astro`. Uses `Layout`.

New components in `src/components/contact/`:

| Component               | Responsibility                                             |
| ----------------------- | ---------------------------------------------------------- |
| `ContactHero.astro`     | Breadcrumb, H1, intro, partner badges                      |
| `ContactForm.astro`     | Form markup and client submit script                       |
| `ContactInfoCard.astro` | Phone, email, hours, address from `company.json`           |
| `OfficeLocation.astro`  | Address panel, lazy Google Maps iframe, route link         |
| `DocumentsCard.astro`   | Placeholder documentation links                            |
| `FormField.astro`       | Label + input/select/textarea + error slot (reusable atom) |
| `CheckboxCard.astro`    | Checkbox tile used for equipment choices (reusable atom)   |

Reused as is: `Layout`, `Badge`, `company.json`, `getInlineTranslations`.
Styling follows the design tokens already in `global.css` (primary, secondary pink,
`industrial-gray`, `surface-*`, `font-technical-data`).

## Form fields

Required unless noted. Labels are always visible (design system rule).

| Field       | Control               | Notes                                                                       |
| ----------- | --------------------- | --------------------------------------------------------------------------- |
| `name`      | text                  | Full name                                                                   |
| `jobTitle`  | text                  |                                                                             |
| `company`   | text                  |                                                                             |
| `phone`     | tel                   |                                                                             |
| `email`     | email                 | Hint: use a company email, not a personal one                               |
| `sector`    | select                | Food & Beverage, Pharmaceutical, Cosmetics, Logistics & Distribution, Other |
| `equipment` | checkboxes (optional) | The six categories from `equipment-types.json`                              |
| `message`   | textarea              |                                                                             |
| `website`   | hidden honeypot       | Must stay empty                                                             |

The sector and equipment lists live in one small module (`src/lib/contact/options.ts`)
so the form and the server validate against the same values.

## Data: `src/data/company.json`

Single source of truth. Add:

```json
"address": {
  "en": { "street": "67 Beresteiskyi Ave", "city": "Kyiv", "postalCode": "03062", "country": "Ukraine" },
  "ua": { "street": "Берестейський просп., 67", "city": "Київ", "postalCode": "03062", "country": "Україна" }
},
"partners": ["Wipotec GmbH", "Mesutronic GmbH"]
```

Existing keys stay (`phone`, `emails.info`, `emails.sales`, `contactPerson`, `workingHours`).
`emails.sales` and `contactPerson` remain because `ProductSidebar` and the product page use them.
The contact page uses only `phone`, `emails.info`, `workingHours`, `address`, `partners`.

## Backend: `src/pages/api/contact.ts`

`export const prerender = false`, POST only, JSON body. Checks run in this order:

1. Origin header must match the site origin. Body size capped.
1. Honeypot `website` filled: return a fake 200, send nothing.
1. In-memory rate limit per client IP (5 requests per 10 minutes). Single Node process only;
   a code comment notes Redis as the path if the app is scaled out.
1. reCAPTCHA v3: POST token to Google `siteverify`; require `success`, `action === "contact"`,
   `score >= 0.5`.
1. Validation (pure functions in `src/lib/contact/validate.ts`): required fields, max lengths,
   email format, free-mail domain rejection (gmail, ukr.net, yahoo, outlook, hotmail, icloud,
   mail.ru and similar), `sector` and `equipment` values in the allowed lists, CR/LF stripped from
   any value that reaches a mail header.
1. Send with nodemailer (`src/lib/contact/mailer.ts`): `to` is `CONTACT_TO`, `from` is
   `CONTACT_FROM`, `replyTo` is the submitter. Plain text body plus an HTML body with every value
   HTML-escaped.

Responses are JSON `{ ok: boolean, error?: code }`. The client maps error codes to translated
messages, so the server never returns raw SMTP or Google errors.

### Environment (`astro.config.mjs` `env.schema` and `.env.example`)

| Variable                                                          | Access        | Notes                                                                                             |
| ----------------------------------------------------------------- | ------------- | ------------------------------------------------------------------------------------------------- |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS` | server secret | `SMTP_USER`/`SMTP_PASS` optional in the app schema (local relay); required by the deploy manifest |
| `CONTACT_TO`                                                      | server public | default `info@ocs.com.ua`                                                                         |
| `CONTACT_FROM`                                                    | server public | sender address, to be created                                                                     |
| `RECAPTCHA_SITE_KEY`                                              | client public |                                                                                                   |
| `RECAPTCHA_SECRET_KEY`                                            | server secret |                                                                                                   |

New dependencies: `nodemailer`, `@types/nodemailer`.

## Secret management

All runtime secrets live in GitHub and are written to the server's env file by the deploy
workflow. There is no manual SSH step to update a secret — the env file is a generated artifact.

### `.github/secrets.dev.yaml` (committed, no values)

A manifest committed to the repo that declares which GitHub secrets and variables map to which env
var names on the server. It contains no values. Structure:

```yaml
# Maps GitHub repository secrets/variables to the server env file.
# All values are injected by the deploy workflow; this file contains no secrets.
env_file: /home/ocs/domains/dev.ocs.com.ua/ocs-dev.env

secrets:
  # key: GitHub secret name  →  value: env var name written to the env file
  DEV_GITHUB_CLIENT_ID: GITHUB_CLIENT_ID
  DEV_GITHUB_CLIENT_SECRET: GITHUB_CLIENT_SECRET
  DEV_RECAPTCHA_SECRET_KEY: RECAPTCHA_SECRET_KEY
  SMTP_USER: SMTP_USER
  SMTP_PASS: SMTP_PASS

variables:
  # key: GitHub variable name  →  value: env var name written to the env file
  DEV_CONTACT_TO: CONTACT_TO
  DEV_RECAPTCHA_SITE_KEY: RECAPTCHA_SITE_KEY
  CONTACT_FROM: CONTACT_FROM
  SMTP_HOST: SMTP_HOST
  SMTP_PORT: SMTP_PORT
  SMTP_SECURE: SMTP_SECURE
```

Naming: values that differ per environment carry an environment prefix (`DEV_`, later `PROD_`),
matching the existing `DEV_SSH_*` secrets: the GitHub OAuth app (one callback URL per app), the
reCAPTCHA key pair, and `CONTACT_TO` (dev submissions go to a developer mailbox, not
`info@ocs.com.ua`). Values shared by dev and prod have no prefix: the SMTP connection and
`CONTACT_FROM`. The env var names on the server are always unprefixed, so the app code does not
change. GitHub also forbids secret names starting with `GITHUB_`; the `DEV_` prefix avoids that for
the OAuth pair.

### Deploy step: "Sync env file"

After the Upload step and before Restart, the workflow:

1. Actions cannot look up a secret by a dynamic name, so the step passes the whole `secrets` and
   `vars` contexts as JSON through its `env:` block (`${{ toJSON(secrets) }}`,
   `${{ toJSON(vars) }}`). GitHub masks the values in logs.
1. `scripts/render-env.mjs` (uses the `yaml` package) reads `.github/secrets.dev.yaml`, picks only the
   listed names from those two JSON objects, and prints the env file content. It fails the job if
   a listed name is missing or empty, so a typo or a forgotten secret stops the deploy before the
   server file is touched.
1. Each line is `NAME="value"` with `\` and `"` escaped (and newlines rejected) so systemd's
   `EnvironmentFile` parses it safely.
1. The content is streamed over SSH on stdin to `umask 077; cat > file.tmp && mv file.tmp file`,
   so the file is replaced atomically with owner-only permissions and values never appear in a
   command line.
1. The existing Restart step re-reads the new env file.

The renderer's pure logic (`renderEnv`) is covered by `bun test`.

Public `astro:env` values are inlined at build time. Today the Build step passes only `SITE_URL`
and `CMS_BASE_URL`; this change adds `RECAPTCHA_SITE_KEY` (`vars.DEV_RECAPTCHA_SITE_KEY`),
`CONTACT_TO` (`vars.DEV_CONTACT_TO`) and `CONTACT_FROM` (`vars.CONTACT_FROM`) there too. They are
also in the generated env file so the running server sees the
same values. `package.json` gains `yaml` as a devDependency for `render-env.mjs` (it is installed
only transitively today).

### Migration note

Before the first deploy with this change, add every name listed in the manifest to the GitHub
repository settings (secrets under Secrets, the rest under Variables). The OAuth values currently
only exist in the server's `ocs-dev.env`; copy them from there
into `DEV_GITHUB_CLIENT_ID` / `DEV_GITHUB_CLIENT_SECRET`, otherwise the first sync overwrites the
file without them and CMS login breaks.

### Out of scope for now

- The Apache vhost rule that proxies `/api/contact` to Node on the server is skipped for now.
  Until it is added, the form works only where Node serves the request directly (local dev).

### Future: production

When a production server is added, create the `PROD_*` secrets and variables (the shared SMTP and
`CONTACT_FROM` names are reused) and a second manifest, `.github/secrets.prod.yaml`, with its own
`env_file` path. The workflow gains a `deploy-prod` job that points `render-env.mjs` at that
manifest.

## Client behavior

- The reCAPTCHA script loads on the first focus of any form field, not on page load, to protect
  page speed.
- Submit: get token for action `contact`, `fetch` POST to `/api/contact`, disable the button while
  pending, show inline success or error. Per-field errors use `aria-describedby` and
  `aria-invalid`; the status region uses `role="status"` / `aria-live`.
- The reCAPTCHA badge is hidden by CSS, so the form shows Google's required privacy/terms
  notice text.
- Written as an Astro component with a `<script>` tag (project rule: no React for interactive
  parts). The same validation rules run client-side for fast feedback; the server remains the
  authority.

## Header and links

- `Header.astro`: add a "Contact Us" primary button to the right-side actions (desktop) and to the
  mobile drawer, linking to `/{lang}/contact`. Active state when the path contains `/contact`.
- `HeroSection.astro` and `ProductSidebar.astro`: change the dead `/{lang}#contact` links to
  `/{lang}/contact`.

## SEO and LLM optimization

- `Layout` (which already wraps `astro-seo`) receives a unique translated `title` and
  `description`. Canonical and hreflang come from `Layout`. No new SEO library.
- One H1, ordered H2/H3 hierarchy, semantic `<nav aria-label="Breadcrumb">`, `<address>`,
  real `tel:` and `mailto:` links, descriptive link text.
- JSON-LD in the page (same pattern as `[slug].astro`), all built from `company.json`:
  - `ContactPage` with `inLanguage`.
  - `Organization` / `LocalBusiness` with `PostalAddress`, `telephone`, `email`,
    `openingHoursSpecification`, `areaServed: "UA"`.
  - `BreadcrumbList`.
- The map iframe is `loading="lazy"` and has a `title`.

## i18n

All copy is written as `_("English text")` in the components. After implementation run
`bun run i18n:extract`, fill `locales/ua.po`, run `bun run i18n:compile`. Server error codes are
mapped to `_()` strings on the client.

## Testing and validation

The frontend has no test runner. Pure logic in `src/lib/contact/` (validation, free-mail check,
header sanitizing, rate limiter, reCAPTCHA response check) is tested with `bun test`
(`*.test.ts` next to the module). Before completion run `bun run check`, `bunx astro check`
and `bun run build`, and check both language pages in the dev server.

## Open items

- Real documents for the "Authorized Documentation" card (links stay `#` for now).
- The English spelling of the address needs owner confirmation.
- The SMTP host and the dedicated sender address are deployment-time values.
