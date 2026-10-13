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

| Variable                                                          | Access        | Notes                                              |
| ----------------------------------------------------------------- | ------------- | -------------------------------------------------- |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS` | server secret | `SMTP_USER`/`SMTP_PASS` optional for a local relay |
| `CONTACT_TO`                                                      | server public | default `info@ocs.com.ua`                          |
| `CONTACT_FROM`                                                    | server public | sender address, to be created                      |
| `RECAPTCHA_SITE_KEY`                                              | client public |                                                    |
| `RECAPTCHA_SECRET_KEY`                                            | server secret |                                                    |

New dependencies: `nodemailer`, `@types/nodemailer`.

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
