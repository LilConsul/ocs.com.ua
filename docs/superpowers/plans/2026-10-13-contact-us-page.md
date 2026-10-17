# Contact Us Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use skills:subagent-driven-development (recommended) or skills:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a bilingual `/en/contact` and `/ua/contact` page with a working server-side form that emails submissions to `info@ocs.com.ua`, spam-protected by a honeypot, rate limiting, and reCAPTCHA v3.

**Architecture:** The page is a static Astro route under `src/pages/[lang]/contact.astro` assembled from focused components in `src/components/contact/`. The form POSTs JSON to `src/pages/api/contact.ts` (server-rendered); validation, rate-limiting, and SMTP logic live in pure functions under `src/lib/contact/` so they can be unit-tested with `bun test`. Deploy secrets (SMTP credentials, reCAPTCHA keys) are declared in `.github/secrets.dev.yaml` and written to the server env file by a new workflow step (`scripts/render-env.mjs`).

**Tech Stack:** Astro 7 (static + server route), Tailwind CSS 4, `nodemailer` + `@types/nodemailer`, reCAPTCHA v3, `yaml` (devDependency for `render-env.mjs`), `bun test` for unit tests, Biome for lint/format.

______________________________________________________________________

## File Map

### Created

| File                                           | Responsibility                                                                                                          |
| ---------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `src/data/company.json`                        | Add `address` and `partners` keys                                                                                       |
| `src/lib/contact/options.ts`                   | Sector list and equipment slug list (shared by form + server)                                                           |
| `src/lib/contact/validate.ts`                  | Pure validation functions (required fields, email, free-mail, max length, header sanitize, sector/equipment allow-list) |
| `src/lib/contact/validate.test.ts`             | Unit tests for validate.ts                                                                                              |
| `src/lib/contact/rateLimit.ts`                 | In-memory per-IP rate limiter (5 req / 10 min)                                                                          |
| `src/lib/contact/rateLimit.test.ts`            | Unit tests for rateLimit.ts                                                                                             |
| `src/lib/contact/mailer.ts`                    | nodemailer send function (HTML + plaintext, HTML-escaped)                                                               |
| `src/lib/contact/mailer.test.ts`               | Unit tests for mailer.ts (mock transport)                                                                               |
| `src/components/contact/FormField.astro`       | Reusable label + input/select/textarea + error slot atom                                                                |
| `src/components/contact/CheckboxCard.astro`    | Reusable checkbox tile atom                                                                                             |
| `src/components/contact/ContactHero.astro`     | Breadcrumb, H1, intro paragraph, partner badges                                                                         |
| `src/components/contact/ContactForm.astro`     | Form markup and client-side `<script>` (reCAPTCHA lazy load, fetch, per-field errors, status region)                    |
| `src/components/contact/ContactInfoCard.astro` | Phone, email, hours, address from `company.json`                                                                        |
| `src/components/contact/OfficeLocation.astro`  | Address panel, lazy Google Maps iframe, "Get route" link                                                                |
| `src/components/contact/DocumentsCard.astro`   | Placeholder authorization document links                                                                                |
| `src/pages/[lang]/contact.astro`               | Page route: composes all contact components, JSON-LD, SEO title/description                                             |
| `src/pages/api/contact.ts`                     | POST handler: origin check, honeypot, rate limit, reCAPTCHA, validation, send                                           |
| `scripts/render-env.mjs`                       | Reads `.github/secrets.dev.yaml`, prints env file content; used by deploy workflow                                      |
| `scripts/render-env.test.mjs`                  | Unit tests for render-env.mjs `renderEnv` function                                                                      |
| `.github/secrets.dev.yaml`                     | Declares GitHub secrets/variables → server env var mapping (no values)                                                  |

### Modified

| File                                                                      | Change                                                                                                            |
| ------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `application/frontend/astro.config.mjs`                                   | Add SMTP\_\*, CONTACT_TO, CONTACT_FROM, RECAPTCHA_SITE_KEY, RECAPTCHA_SECRET_KEY to `env.schema`                  |
| `application/frontend/package.json`                                       | Add `nodemailer`, `@types/nodemailer` (dependencies); `yaml` (devDependency); `bun test` script                   |
| `application/frontend/.env.example`                                       | Add contact-form env var docs                                                                                     |
| `application/frontend/src/components/Header.astro`                        | Add "Contact Us" button to desktop right-side actions and mobile drawer                                           |
| `application/frontend/src/components/homepage/HeroSection.astro`          | Change `#contact` href to `/${lang}/contact`                                                                      |
| `application/frontend/src/components/catalogue/ProductSidebar.astro`      | Change `#contact` href to `/${lang}/contact`                                                                      |
| `application/frontend/src/components/catalogue/CatalogueSidebar.astro`    | Change `#contact` href to `/${lang}/contact`                                                                      |
| `application/frontend/src/pages/[lang]/catalogue/[category]/[slug].astro` | Change `#contact` href to `/${lang}/contact`                                                                      |
| `application/frontend/src/components/errors/NotFoundContent.astro`        | Change `#contact` href to `/${lang}/contact`                                                                      |
| `application/frontend/src/components/errors/ServerErrorContent.astro`     | Change `#contact` href to `/${lang}/contact`                                                                      |
| `.github/workflows/deploy-dev.yml`                                        | Add "Sync env file" step after Upload, pass `yaml` as devDependency to install step, pass new build-time env vars |

______________________________________________________________________

## Task 1: Extend `company.json` with address and partners

**Files:**

- Modify: `application/frontend/src/data/company.json`

- [ ] **Step 1: Add address and partners keys**

The file currently has `phone`, `emails`, `contactPerson`, `workingHours`. Add after `workingHours`:

```json
{
  "phone": {
    "display": "+38 067 35 33 853",
    "href": "tel:+380673533853"
  },
  "emails": {
    "sales": "gs@ocs.com.ua",
    "info": "info@ocs.com.ua"
  },
  "contactPerson": {
    "en": { "name": "George Shevchenko" },
    "ua": { "name": "Георгій Шевченко" }
  },
  "workingHours": {
    "en": "Mon-Fri, 9:00 - 18:00 (Kyiv)",
    "ua": "Пн-Пт, 9:00 - 18:00 (Київ)"
  },
  "address": {
    "en": { "street": "67 Beresteiskyi Ave", "city": "Kyiv", "postalCode": "03062", "country": "Ukraine" },
    "ua": { "street": "Берестейський просп., 67", "city": "Київ", "postalCode": "03062", "country": "Україна" }
  },
  "partners": ["Wipotec GmbH", "Mesutronic GmbH"]
}
```

- [ ] **Step 2: Run lint check**

```bash
cd application/frontend && bun run check
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add application/frontend/src/data/company.json
git commit -m "feat(data): add address and partners to company.json"
```

______________________________________________________________________

## Task 2: Create `src/lib/contact/options.ts` with shared sector/equipment lists

**Files:**

- Create: `application/frontend/src/lib/contact/options.ts`

- [ ] **Step 1: Write the file**

```typescript
// Shared sector and equipment option lists.
// Both the form components and the server-side validator import from here
// to ensure the same allow-list is enforced on both sides.

export const SECTORS = [
  "Food & Beverage",
  "Pharmaceutical",
  "Cosmetics",
  "Logistics & Distribution",
  "Other",
] as const;

export type Sector = (typeof SECTORS)[number];

// Equipment slugs from src/data/equipment-types.json
export const EQUIPMENT_SLUGS = [
  "checkweigher",
  "catchweigher",
  "track-and-trace",
  "metal-detectors",
  "x-ray-inspection",
  "miscellaneous",
] as const;

export type EquipmentSlug = (typeof EQUIPMENT_SLUGS)[number];
```

- [ ] **Step 2: Commit**

```bash
git add application/frontend/src/lib/contact/options.ts
git commit -m "feat(contact): add shared options module (sectors, equipment slugs)"
```

______________________________________________________________________

## Task 3: Write `validate.ts` — TDD

**Files:**

- Create: `application/frontend/src/lib/contact/validate.ts`
- Create: `application/frontend/src/lib/contact/validate.test.ts`

### 3a — Write the failing tests first

- [ ] **Step 1: Create `validate.test.ts`**

```typescript
import { describe, expect, it } from "bun:test";
import {
  stripHeaderChars,
  isFreeMail,
  validateContactForm,
  type ContactFormData,
} from "./validate";

describe("stripHeaderChars", () => {
  it("strips CR characters", () => {
    expect(stripHeaderChars("hello\rworld")).toBe("helloworld");
  });
  it("strips LF characters", () => {
    expect(stripHeaderChars("hello\nworld")).toBe("helloworld");
  });
  it("passes clean strings unchanged", () => {
    expect(stripHeaderChars("hello world")).toBe("hello world");
  });
});

describe("isFreeMail", () => {
  it("flags gmail.com", () => {
    expect(isFreeMail("user@gmail.com")).toBe(true);
  });
  it("flags ukr.net", () => {
    expect(isFreeMail("user@ukr.net")).toBe(true);
  });
  it("flags yahoo.com", () => {
    expect(isFreeMail("user@yahoo.com")).toBe(true);
  });
  it("flags outlook.com", () => {
    expect(isFreeMail("user@outlook.com")).toBe(true);
  });
  it("flags hotmail.com", () => {
    expect(isFreeMail("user@hotmail.com")).toBe(true);
  });
  it("flags icloud.com", () => {
    expect(isFreeMail("user@icloud.com")).toBe(true);
  });
  it("flags mail.ru", () => {
    expect(isFreeMail("user@mail.ru")).toBe(true);
  });
  it("allows corporate email", () => {
    expect(isFreeMail("ceo@factory.ua")).toBe(false);
  });
});

const validForm: ContactFormData = {
  name: "Oleksii Kovalenko",
  jobTitle: "Chief Engineer",
  company: "Farmak",
  phone: "+380501234567",
  email: "o.kovalenko@farmak.ua",
  sector: "Pharmaceutical",
  equipment: ["checkweigher"],
  message: "We need a checkweigher for our new line.",
  website: "",
};

describe("validateContactForm", () => {
  it("accepts a valid form", () => {
    const result = validateContactForm(validForm);
    expect(result.ok).toBe(true);
  });

  it("rejects missing name", () => {
    const result = validateContactForm({ ...validForm, name: "" });
    expect(result.ok).toBe(false);
    expect(result.errors?.name).toBeDefined();
  });

  it("rejects missing jobTitle", () => {
    const result = validateContactForm({ ...validForm, jobTitle: "" });
    expect(result.ok).toBe(false);
    expect(result.errors?.jobTitle).toBeDefined();
  });

  it("rejects missing company", () => {
    const result = validateContactForm({ ...validForm, company: "" });
    expect(result.ok).toBe(false);
    expect(result.errors?.company).toBeDefined();
  });

  it("rejects missing phone", () => {
    const result = validateContactForm({ ...validForm, phone: "" });
    expect(result.ok).toBe(false);
    expect(result.errors?.phone).toBeDefined();
  });

  it("rejects missing email", () => {
    const result = validateContactForm({ ...validForm, email: "" });
    expect(result.ok).toBe(false);
    expect(result.errors?.email).toBeDefined();
  });

  it("rejects invalid email format", () => {
    const result = validateContactForm({ ...validForm, email: "notanemail" });
    expect(result.ok).toBe(false);
    expect(result.errors?.email).toBeDefined();
  });

  it("rejects free-mail domain", () => {
    const result = validateContactForm({ ...validForm, email: "user@gmail.com" });
    expect(result.ok).toBe(false);
    expect(result.errors?.email).toBeDefined();
  });

  it("rejects invalid sector", () => {
    const result = validateContactForm({ ...validForm, sector: "Unknown" as any });
    expect(result.ok).toBe(false);
    expect(result.errors?.sector).toBeDefined();
  });

  it("rejects invalid equipment slug", () => {
    const result = validateContactForm({ ...validForm, equipment: ["invalid-slug"] as any });
    expect(result.ok).toBe(false);
    expect(result.errors?.equipment).toBeDefined();
  });

  it("accepts empty equipment array (optional)", () => {
    const result = validateContactForm({ ...validForm, equipment: [] });
    expect(result.ok).toBe(true);
  });

  it("rejects missing message", () => {
    const result = validateContactForm({ ...validForm, message: "" });
    expect(result.ok).toBe(false);
    expect(result.errors?.message).toBeDefined();
  });

  it("rejects name exceeding 200 chars", () => {
    const result = validateContactForm({ ...validForm, name: "a".repeat(201) });
    expect(result.ok).toBe(false);
    expect(result.errors?.name).toBeDefined();
  });

  it("rejects message exceeding 5000 chars", () => {
    const result = validateContactForm({ ...validForm, message: "a".repeat(5001) });
    expect(result.ok).toBe(false);
    expect(result.errors?.message).toBeDefined();
  });
});
```

- [ ] **Step 2: Run to verify FAIL**

```bash
cd application/frontend && bun test src/lib/contact/validate.test.ts
```

Expected: FAIL — `Cannot find module './validate'`

### 3b — Implement `validate.ts`

- [ ] **Step 3: Create `validate.ts`**

```typescript
import { EQUIPMENT_SLUGS, SECTORS, type EquipmentSlug, type Sector } from "./options";

export interface ContactFormData {
  name: string;
  jobTitle: string;
  company: string;
  phone: string;
  email: string;
  sector: Sector | string;
  equipment: EquipmentSlug[] | string[];
  message: string;
  website: string; // honeypot — must be empty
}

export interface ValidationResult {
  ok: boolean;
  errors?: Partial<Record<keyof Omit<ContactFormData, "website">, string>>;
}

const FREE_MAIL_DOMAINS = new Set([
  "gmail.com", "yahoo.com", "yahoo.co.uk", "hotmail.com", "hotmail.co.uk",
  "outlook.com", "live.com", "msn.com", "icloud.com", "me.com", "mac.com",
  "ukr.net", "i.ua", "meta.ua", "mail.ru", "yandex.ru", "yandex.ua",
  "rambler.ru", "inbox.ru",
]);

export function stripHeaderChars(value: string): string {
  return value.replace(/[\r\n]/g, "");
}

export function isFreeMail(email: string): boolean {
  const domain = email.split("@")[1]?.toLowerCase();
  return domain ? FREE_MAIL_DOMAINS.has(domain) : false;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateContactForm(data: ContactFormData): ValidationResult {
  const errors: Partial<Record<keyof Omit<ContactFormData, "website">, string>> = {};

  if (!data.name.trim()) {
    errors.name = "required";
  } else if (data.name.length > 200) {
    errors.name = "too_long";
  }

  if (!data.jobTitle.trim()) {
    errors.jobTitle = "required";
  } else if (data.jobTitle.length > 200) {
    errors.jobTitle = "too_long";
  }

  if (!data.company.trim()) {
    errors.company = "required";
  } else if (data.company.length > 200) {
    errors.company = "too_long";
  }

  if (!data.phone.trim()) {
    errors.phone = "required";
  } else if (data.phone.length > 30) {
    errors.phone = "too_long";
  }

  if (!data.email.trim()) {
    errors.email = "required";
  } else if (!EMAIL_REGEX.test(data.email)) {
    errors.email = "invalid_format";
  } else if (isFreeMail(data.email)) {
    errors.email = "free_mail";
  }

  if (!(SECTORS as readonly string[]).includes(data.sector)) {
    errors.sector = "invalid_sector";
  }

  if (data.equipment.length > 0) {
    const valid = (data.equipment as string[]).every((slug) =>
      (EQUIPMENT_SLUGS as readonly string[]).includes(slug)
    );
    if (!valid) errors.equipment = "invalid_equipment";
  }

  if (!data.message.trim()) {
    errors.message = "required";
  } else if (data.message.length > 5000) {
    errors.message = "too_long";
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true };
}
```

- [ ] **Step 4: Run to verify PASS**

```bash
cd application/frontend && bun test src/lib/contact/validate.test.ts
```

Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add application/frontend/src/lib/contact/validate.ts application/frontend/src/lib/contact/validate.test.ts
git commit -m "feat(contact): add validation module with tests"
```

______________________________________________________________________

## Task 4: Write `rateLimit.ts` — TDD

**Files:**

- Create: `application/frontend/src/lib/contact/rateLimit.ts`
- Create: `application/frontend/src/lib/contact/rateLimit.test.ts`

### 4a — Failing tests first

- [ ] **Step 1: Create `rateLimit.test.ts`**

```typescript
import { describe, expect, it } from "bun:test";
import { createRateLimiter } from "./rateLimit";

describe("createRateLimiter", () => {
  it("allows the first request", () => {
    const limiter = createRateLimiter({ max: 3, windowMs: 60_000 });
    expect(limiter.check("127.0.0.1")).toBe(true);
  });

  it("allows up to max requests", () => {
    const limiter = createRateLimiter({ max: 3, windowMs: 60_000 });
    expect(limiter.check("10.0.0.1")).toBe(true);
    expect(limiter.check("10.0.0.1")).toBe(true);
    expect(limiter.check("10.0.0.1")).toBe(true);
  });

  it("blocks request above max", () => {
    const limiter = createRateLimiter({ max: 3, windowMs: 60_000 });
    limiter.check("10.0.0.2");
    limiter.check("10.0.0.2");
    limiter.check("10.0.0.2");
    expect(limiter.check("10.0.0.2")).toBe(false);
  });

  it("does not affect different IPs", () => {
    const limiter = createRateLimiter({ max: 1, windowMs: 60_000 });
    limiter.check("192.168.1.1"); // exhausts 192.168.1.1
    expect(limiter.check("192.168.1.2")).toBe(true); // different IP unaffected
  });

  it("resets after window expires", async () => {
    const limiter = createRateLimiter({ max: 1, windowMs: 10 }); // 10 ms window
    limiter.check("10.0.0.3");
    expect(limiter.check("10.0.0.3")).toBe(false); // blocked
    await new Promise((r) => setTimeout(r, 20)); // wait for window to pass
    expect(limiter.check("10.0.0.3")).toBe(true); // reset
  });
});
```

- [ ] **Step 2: Run to verify FAIL**

```bash
cd application/frontend && bun test src/lib/contact/rateLimit.test.ts
```

Expected: FAIL — `Cannot find module './rateLimit'`

### 4b — Implement `rateLimit.ts`

- [ ] **Step 3: Create `rateLimit.ts`**

```typescript
// In-memory rate limiter for a single Node process.
// If the app is ever scaled out to multiple processes, replace this map
// with a shared Redis store using the same interface.

interface RateLimiterOptions {
  max: number;       // max requests per window
  windowMs: number;  // window duration in milliseconds
}

interface Entry {
  count: number;
  resetAt: number;
}

export interface RateLimiter {
  check(ip: string): boolean; // returns true if allowed, false if blocked
}

export function createRateLimiter({ max, windowMs }: RateLimiterOptions): RateLimiter {
  const store = new Map<string, Entry>();

  return {
    check(ip: string): boolean {
      const now = Date.now();
      const entry = store.get(ip);

      if (!entry || now >= entry.resetAt) {
        store.set(ip, { count: 1, resetAt: now + windowMs });
        return true;
      }

      if (entry.count >= max) return false;

      entry.count++;
      return true;
    },
  };
}
```

- [ ] **Step 4: Run to verify PASS**

```bash
cd application/frontend && bun test src/lib/contact/rateLimit.test.ts
```

Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add application/frontend/src/lib/contact/rateLimit.ts application/frontend/src/lib/contact/rateLimit.test.ts
git commit -m "feat(contact): add in-memory rate limiter with tests"
```

______________________________________________________________________

## Task 5: Write `mailer.ts` — TDD

**Files:**

- Create: `application/frontend/src/lib/contact/mailer.ts`
- Create: `application/frontend/src/lib/contact/mailer.test.ts`

First, install the nodemailer dependency:

- [ ] **Step 1: Install dependencies**

```bash
cd application/frontend && bun add nodemailer && bun add -D @types/nodemailer
```

Expected: `package.json` and `bun.lock` updated.

### 5a — Failing tests first

- [ ] **Step 2: Create `mailer.test.ts`**

```typescript
import { describe, expect, it } from "bun:test";
import { buildEmailBody, htmlEscape } from "./mailer";
import type { ContactFormData } from "./validate";

const testData: ContactFormData = {
  name: "Oleksii Kovalenko",
  jobTitle: "Chief Engineer",
  company: "Farmak",
  phone: "+380501234567",
  email: "o.kovalenko@farmak.ua",
  sector: "Pharmaceutical",
  equipment: ["checkweigher", "track-and-trace"],
  message: "Need a quote.\n<script>alert(1)</script>",
  website: "",
};

describe("htmlEscape", () => {
  it("escapes < and >", () => {
    expect(htmlEscape("<script>")).toBe("&lt;script&gt;");
  });
  it("escapes &", () => {
    expect(htmlEscape("a & b")).toBe("a &amp; b");
  });
  it("escapes quotes", () => {
    expect(htmlEscape('"hello"')).toBe("&quot;hello&quot;");
  });
  it("passes clean strings unchanged", () => {
    expect(htmlEscape("hello world")).toBe("hello world");
  });
});

describe("buildEmailBody", () => {
  it("includes the submitter name in the plain text body", () => {
    const { text } = buildEmailBody(testData);
    expect(text).toContain("Oleksii Kovalenko");
  });

  it("includes the submitter email in the plain text body", () => {
    const { text } = buildEmailBody(testData);
    expect(text).toContain("o.kovalenko@farmak.ua");
  });

  it("HTML-escapes message in the html body", () => {
    const { html } = buildEmailBody(testData);
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("includes equipment slugs in the html body", () => {
    const { html } = buildEmailBody(testData);
    expect(html).toContain("checkweigher");
    expect(html).toContain("track-and-trace");
  });

  it("returns both text and html keys", () => {
    const result = buildEmailBody(testData);
    expect(result).toHaveProperty("text");
    expect(result).toHaveProperty("html");
  });
});
```

- [ ] **Step 3: Run to verify FAIL**

```bash
cd application/frontend && bun test src/lib/contact/mailer.test.ts
```

Expected: FAIL — `Cannot find module './mailer'`

### 5b — Implement `mailer.ts`

- [ ] **Step 4: Create `mailer.ts`**

```typescript
import nodemailer from "nodemailer";
import type { ContactFormData } from "./validate";

export function htmlEscape(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function buildEmailBody(data: ContactFormData): { text: string; html: string } {
  const text = [
    `Name: ${data.name}`,
    `Job Title: ${data.jobTitle}`,
    `Company: ${data.company}`,
    `Phone: ${data.phone}`,
    `Email: ${data.email}`,
    `Sector: ${data.sector}`,
    `Equipment: ${data.equipment.join(", ") || "(none)"}`,
    ``,
    `Message:`,
    data.message,
  ].join("\n");

  const field = (label: string, value: string) =>
    `<tr><td style="padding:4px 12px 4px 0;font-weight:600;white-space:nowrap;vertical-align:top">${label}</td><td style="padding:4px 0">${htmlEscape(value)}</td></tr>`;

  const html = `<!doctype html><html><body style="font-family:sans-serif;font-size:14px;color:#111">
<h2 style="margin:0 0 16px">New Contact Form Submission</h2>
<table style="border-collapse:collapse">
${field("Name", data.name)}
${field("Job Title", data.jobTitle)}
${field("Company", data.company)}
${field("Phone", data.phone)}
${field("Email", data.email)}
${field("Sector", data.sector)}
${field("Equipment", data.equipment.join(", ") || "(none)")}
</table>
<h3 style="margin:20px 0 8px">Message</h3>
<pre style="background:#f5f5f5;padding:12px;border-radius:4px;white-space:pre-wrap">${htmlEscape(data.message)}</pre>
</body></html>`;

  return { text, html };
}

export interface MailerConfig {
  host: string;
  port: number;
  secure: boolean;
  user?: string;
  pass?: string;
  to: string;
  from: string;
}

export async function sendContactEmail(
  data: ContactFormData,
  config: MailerConfig
): Promise<void> {
  const transport = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    ...(config.user && config.pass
      ? { auth: { user: config.user, pass: config.pass } }
      : {}),
  });

  const { text, html } = buildEmailBody(data);

  await transport.sendMail({
    from: config.from,
    to: config.to,
    replyTo: data.email,
    subject: `Contact inquiry from ${data.company} — ${data.name}`,
    text,
    html,
  });
}
```

- [ ] **Step 5: Run to verify PASS**

```bash
cd application/frontend && bun test src/lib/contact/mailer.test.ts
```

Expected: all tests PASS.

- [ ] **Step 6: Commit**

```bash
git add application/frontend/src/lib/contact/mailer.ts application/frontend/src/lib/contact/mailer.test.ts application/frontend/package.json application/frontend/bun.lock
git commit -m "feat(contact): add mailer module with tests, add nodemailer dependency"
```

______________________________________________________________________

## Task 6: Add env vars to `astro.config.mjs` and `.env.example`

**Files:**

- Modify: `application/frontend/astro.config.mjs`

- Modify: `application/frontend/.env.example`

- [ ] **Step 1: Add new env schema entries to `astro.config.mjs`**

Inside the existing `env.schema` object, after the last `CMS_SEARCH` entry, add:

```javascript
// === Contact form ===

// SMTP connection (no auth required for a local relay; user/pass optional)
SMTP_HOST: envField.string({ context: "server", access: "secret" }),
SMTP_PORT: envField.number({ context: "server", access: "secret", default: 587 }),
SMTP_SECURE: envField.boolean({ context: "server", access: "secret", default: false }),
SMTP_USER: envField.string({ context: "server", access: "secret", optional: true }),
SMTP_PASS: envField.string({ context: "server", access: "secret", optional: true }),
// Recipient for contact form submissions (default: production inbox)
CONTACT_TO: envField.string({
  context: "server",
  access: "public",
  default: "info@ocs.com.ua",
}),
// Sender address created on the mail server
CONTACT_FROM: envField.string({ context: "server", access: "public" }),
// reCAPTCHA v3 (client public key inlined at build time)
RECAPTCHA_SITE_KEY: envField.string({ context: "client", access: "public" }),
// reCAPTCHA v3 (server secret — never sent to browser)
RECAPTCHA_SECRET_KEY: envField.string({ context: "server", access: "secret" }),
```

- [ ] **Step 2: Append contact vars to `.env.example`**

```dotenv
# Contact Form Configuration
# SMTP settings — provided at deploy time; for local testing use a relay like Mailpit
SMTP_HOST=localhost
SMTP_PORT=587
SMTP_SECURE=false
# SMTP_USER=
# SMTP_PASS=

# Contact form recipient
CONTACT_TO=info@ocs.com.ua
# Sender address created on the mail server
CONTACT_FROM=noreply@ocs.com.ua

# reCAPTCHA v3 keys — register at https://www.google.com/recaptcha
RECAPTCHA_SITE_KEY=your_recaptcha_site_key_here
RECAPTCHA_SECRET_KEY=your_recaptcha_secret_key_here
```

- [ ] **Step 3: Run lint check**

```bash
cd application/frontend && bun run check
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add application/frontend/astro.config.mjs application/frontend/.env.example
git commit -m "feat(config): add contact-form env vars to astro:env schema"
```

______________________________________________________________________

## Task 7: Create `src/pages/api/contact.ts`

**Files:**

- Create: `application/frontend/src/pages/api/contact.ts`

- [ ] **Step 1: Create the endpoint**

```typescript
import {
  CONTACT_FROM,
  CONTACT_TO,
  RECAPTCHA_SECRET_KEY,
  SMTP_HOST,
  SMTP_PASS,
  SMTP_PORT,
  SMTP_SECURE,
  SMTP_USER,
} from "astro:env/server";
import { RECAPTCHA_SITE_KEY } from "astro:env/client";
import type { APIRoute } from "astro";
import { sendContactEmail } from "@/lib/contact/mailer";
import { createRateLimiter } from "@/lib/contact/rateLimit";
import { validateContactForm, type ContactFormData } from "@/lib/contact/validate";

export const prerender = false;

// Single-process in-memory rate limiter: 5 submissions per IP per 10 minutes.
// Scale-out note: replace with Redis if multiple Node processes are used.
const rateLimiter = createRateLimiter({ max: 5, windowMs: 10 * 60 * 1000 });

const BODY_LIMIT = 32_768; // 32 KB

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

export const POST: APIRoute = async ({ request, clientAddress }) => {
  // 1. Origin check
  const origin = new URL(request.url).origin;
  const reqOrigin = request.headers.get("origin");
  if (!reqOrigin || reqOrigin !== origin) {
    return json({ ok: false, error: "forbidden" }, 403);
  }

  // 2. Body size cap
  const contentLength = request.headers.get("content-length");
  if (contentLength && Number(contentLength) > BODY_LIMIT) {
    return json({ ok: false, error: "payload_too_large" }, 413);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: "invalid_json" }, 400);
  }

  const data = body as ContactFormData;

  // 3. Honeypot: if the hidden "website" field is filled, silently fake success
  if (typeof data.website === "string" && data.website.trim() !== "") {
    return json({ ok: true });
  }

  // 4. Rate limit
  const ip = clientAddress ?? "unknown";
  if (!rateLimiter.check(ip)) {
    return json({ ok: false, error: "rate_limited" }, 429);
  }

  // 5. reCAPTCHA v3
  const token = typeof (body as any).recaptchaToken === "string"
    ? (body as any).recaptchaToken
    : "";
  if (!token) {
    return json({ ok: false, error: "recaptcha_missing" }, 400);
  }
  try {
    const captchaRes = await fetch("https://www.google.com/recaptcha/api/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        secret: RECAPTCHA_SECRET_KEY,
        response: token,
      }),
    });
    const captchaJson = (await captchaRes.json()) as {
      success: boolean;
      action?: string;
      score?: number;
    };
    if (
      !captchaJson.success ||
      captchaJson.action !== "contact" ||
      (captchaJson.score ?? 0) < 0.5
    ) {
      return json({ ok: false, error: "recaptcha_failed" }, 400);
    }
  } catch {
    return json({ ok: false, error: "recaptcha_unavailable" }, 502);
  }

  // 6. Validate
  const result = validateContactForm(data);
  if (!result.ok) {
    return json({ ok: false, error: "validation_failed", fields: result.errors }, 422);
  }

  // 7. Send
  try {
    await sendContactEmail(data, {
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_SECURE,
      user: SMTP_USER,
      pass: SMTP_PASS,
      to: CONTACT_TO,
      from: CONTACT_FROM,
    });
  } catch (err) {
    console.error("[contact] SMTP error:", err);
    return json({ ok: false, error: "smtp_error" }, 502);
  }

  return json({ ok: true });
};
```

- [ ] **Step 2: Run type-check**

```bash
cd application/frontend && bunx astro check
```

Expected: no type errors in the new file.

- [ ] **Step 3: Commit**

```bash
git add application/frontend/src/pages/api/contact.ts
git commit -m "feat(contact): add /api/contact POST endpoint"
```

______________________________________________________________________

## Task 8: Create reusable `FormField.astro` and `CheckboxCard.astro` atoms

**Files:**

- Create: `application/frontend/src/components/contact/FormField.astro`

- Create: `application/frontend/src/components/contact/CheckboxCard.astro`

- [ ] **Step 1: Create `FormField.astro`**

```astro
---
interface Props {
  id: string;
  label: string;
  type?: "text" | "tel" | "email" | "select" | "textarea";
  required?: boolean;
  placeholder?: string;
  hint?: string;
  options?: { value: string; label: string }[];
  rows?: number;
}

const {
  id,
  label,
  type = "text",
  required = false,
  placeholder,
  hint,
  options = [],
  rows = 4,
} = Astro.props;
---

<div class="space-y-1.5">
  <label
    for={id}
    class="font-technical-data text-technical-data text-foreground block font-medium"
  >
    {label}
    {required && <span class="text-secondary ml-0.5" aria-hidden="true">*</span>}
  </label>

  {hint && (
    <p class="text-industrial-gray text-xs">{hint}</p>
  )}

  {type === "select" ? (
    <select
      id={id}
      name={id}
      required={required}
      aria-required={required ? "true" : undefined}
      aria-describedby={`${id}-error`}
      class="w-full rounded-lg border border-border bg-surface-muted px-4 py-3 font-sans text-sm text-foreground transition-colors focus:border-primary focus:outline-none"
    >
      <slot />
    </select>
  ) : type === "textarea" ? (
    <textarea
      id={id}
      name={id}
      required={required}
      aria-required={required ? "true" : undefined}
      aria-describedby={`${id}-error`}
      rows={rows}
      placeholder={placeholder}
      class="w-full rounded-lg border border-border bg-surface-muted px-4 py-3 font-sans text-sm text-foreground transition-colors focus:border-primary focus:outline-none resize-y"
    ></textarea>
  ) : (
    <input
      id={id}
      name={id}
      type={type}
      required={required}
      aria-required={required ? "true" : undefined}
      aria-describedby={`${id}-error`}
      placeholder={placeholder}
      class="w-full rounded-lg border border-border bg-surface-muted px-4 py-3 font-sans text-sm text-foreground transition-colors focus:border-primary focus:outline-none"
    />
  )}

  <p
    id={`${id}-error`}
    role="alert"
    class="text-destructive hidden text-xs font-medium"
    data-field-error={id}
  ></p>
</div>
```

- [ ] **Step 2: Create `CheckboxCard.astro`**

```astro
---
interface Props {
  name: string;
  value: string;
  label: string;
}

const { name, value, label } = Astro.props;
---

<label
  class="flex cursor-pointer items-center gap-3 rounded-lg border border-border bg-surface-muted p-3 transition-colors hover:bg-surface-container has-[:checked]:border-primary has-[:checked]:bg-primary/5"
>
  <input
    type="checkbox"
    name={name}
    value={value}
    class="h-4 w-4 rounded border-border text-primary accent-primary"
  />
  <span class="font-technical-data text-technical-data text-foreground leading-tight">
    {label}
  </span>
</label>
```

- [ ] **Step 3: Commit**

```bash
git add application/frontend/src/components/contact/FormField.astro application/frontend/src/components/contact/CheckboxCard.astro
git commit -m "feat(contact): add FormField and CheckboxCard reusable atoms"
```

______________________________________________________________________

## Task 9: Create `ContactHero.astro`

**Files:**

- Create: `application/frontend/src/components/contact/ContactHero.astro`

- [ ] **Step 1: Create the component**

```astro
---
import { Badge } from "@/components/ui/badge";
import companyData from "@/data/company.json";
import { getInlineTranslations, type Lang } from "@/i18n";

interface Props {
  lang: Lang;
}

const { lang } = Astro.props;
const _ = getInlineTranslations(lang);
const partners = companyData.partners; // ["Wipotec GmbH", "Mesutronic GmbH"]
---

<section class="relative w-full overflow-hidden pt-12 pb-16">
  <div
    class="pointer-events-none absolute inset-0 opacity-[0.03]"
    style="background-image: radial-gradient(var(--color-foreground) 1px, transparent 1px); background-size: 24px 24px;"
    aria-hidden="true"
  ></div>

  <div class="relative mx-auto max-w-[1280px] px-8">
    {/* Breadcrumb */}
    <nav aria-label={_("Breadcrumb")} class="mb-8 font-technical-data text-technical-data text-industrial-gray">
      <ol class="flex items-center gap-2">
        <li class="after:text-border after:ml-2 after:content-['/']">
          <a href={`/${lang}`} class="hover:text-foreground transition-colors">{_("Home")}</a>
        </li>
        <li aria-current="page" class="text-foreground font-medium">{_("Contact Us")}</li>
      </ol>
    </nav>

    {/* Headline block */}
    <header class="space-y-6 lg:w-2/3">
      <h1 class="font-display-lg text-display-lg text-foreground font-heading tracking-tight">
        {_("Get in Touch")}
      </h1>
      <p class="font-body-lg text-body-lg text-industrial-gray max-w-2xl">
        {_("Contact our engineering team to discuss equipment selection, request a quotation, or arrange a product demonstration.")}
      </p>

      {/* Partner badges */}
      <ul class="flex flex-wrap gap-3">
        {partners.map((partner) => (
          <li>
            <Badge
              variant="outline"
              className="border-border bg-background inline-flex items-center gap-2 rounded-full px-4 py-1.5"
            >
              <span class="bg-primary h-2 w-2 animate-pulse rounded-full" aria-hidden="true"></span>
              <span class="font-technical-data text-xs tracking-wider uppercase">
                {lang === "en" ? `Official Partner of ${partner}` : `Офіційний партнер ${partner}`}
              </span>
            </Badge>
          </li>
        ))}
      </ul>
    </header>
  </div>
</section>
```

- [ ] **Step 2: Commit**

```bash
git add application/frontend/src/components/contact/ContactHero.astro
git commit -m "feat(contact): add ContactHero component"
```

______________________________________________________________________

## Task 10: Create `ContactInfoCard.astro`

**Files:**

- Create: `application/frontend/src/components/contact/ContactInfoCard.astro`

- [ ] **Step 1: Create the component**

```astro
---
import companyData from "@/data/company.json";
import { getInlineTranslations, type Lang } from "@/i18n";

interface Props {
  lang: Lang;
}

const { lang } = Astro.props;
const _ = getInlineTranslations(lang);

const address = companyData.address[lang as "en" | "ua"] ?? companyData.address.en;
const workingHours = companyData.workingHours[lang as "en" | "ua"] ?? companyData.workingHours.en;
---

<section class="bg-surface-container rounded-xl p-8 shadow-sm space-y-6">
  <h2 class="font-label-caps text-label-caps text-secondary font-bold uppercase">{_("Contact Information")}</h2>

  <dl class="space-y-4">
    {/* Phone */}
    <div>
      <dt class="font-label-caps text-label-caps text-industrial-gray uppercase mb-1">{_("Phone")}</dt>
      <dd>
        <a
          href={companyData.phone.href}
          class="font-headline-lg text-headline-lg font-bold text-foreground hover:text-secondary transition-colors"
        >
          {companyData.phone.display}
        </a>
      </dd>
    </div>

    {/* Email */}
    <div>
      <dt class="font-label-caps text-label-caps text-industrial-gray flex items-center gap-2 uppercase mb-0.5">
        <span class="material-symbols-outlined text-xl" aria-hidden="true">mail</span>
        {_("Email")}
      </dt>
      <dd>
        <a
          href={`mailto:${companyData.emails.info}`}
          class="font-technical-data text-technical-data text-foreground hover:text-secondary transition-colors"
        >
          {companyData.emails.info}
        </a>
      </dd>
    </div>

    {/* Address */}
    <div>
      <dt class="font-label-caps text-label-caps text-industrial-gray flex items-center gap-2 uppercase mb-0.5">
        <span class="material-symbols-outlined text-xl" aria-hidden="true">location_on</span>
        {_("Address")}
      </dt>
      <dd>
        <address class="font-body-md text-body-md text-foreground not-italic">
          {address.street}<br />{address.city}, {address.postalCode}<br />{address.country}
        </address>
      </dd>
    </div>

    {/* Working hours */}
    <div class="bg-surface-container-high rounded-lg p-4 font-technical-data text-technical-data text-industrial-gray">
      <dt class="text-foreground font-medium mb-1">{_("Working Hours")}</dt>
      <dd>{workingHours}</dd>
    </div>
  </dl>
</section>
```

- [ ] **Step 2: Commit**

```bash
git add application/frontend/src/components/contact/ContactInfoCard.astro
git commit -m "feat(contact): add ContactInfoCard component"
```

______________________________________________________________________

## Task 11: Create `OfficeLocation.astro`

**Files:**

- Create: `application/frontend/src/components/contact/OfficeLocation.astro`

- [ ] **Step 1: Create the component**

The map embed URL uses the confirmed address (Beresteiskyi Ave 67, Kyiv). The iframe is `loading="lazy"` and has a descriptive `title`.

```astro
---
import companyData from "@/data/company.json";
import { getInlineTranslations, type Lang } from "@/i18n";

interface Props {
  lang: Lang;
}

const { lang } = Astro.props;
const _ = getInlineTranslations(lang);

const address = companyData.address[lang as "en" | "ua"] ?? companyData.address.en;
const mapsQuery = encodeURIComponent("67 Beresteiskyi Ave, Kyiv, Ukraine 03062");
const routeUrl = `https://www.google.com/maps/dir/?api=1&destination=${mapsQuery}`;
const embedUrl = `https://www.google.com/maps/embed/v1/place?key=&q=${mapsQuery}`;
---

<section class="bg-surface-container-low rounded-xl overflow-hidden shadow-md">
  <div class="grid grid-cols-1 lg:grid-cols-12">
    {/* Address panel */}
    <div class="lg:col-span-5 p-8 flex flex-col justify-between bg-surface-container">
      <div class="space-y-6">
        <header>
          <p class="font-label-caps text-label-caps text-secondary font-bold uppercase">{_("Kyiv Office")}</p>
          <h2 class="font-headline-xl text-headline-xl font-bold text-foreground mt-1">{_("Main Office")}</h2>
        </header>
        <p class="flex items-start gap-3">
          <span class="material-symbols-outlined text-secondary mt-1" aria-hidden="true">pin_drop</span>
          <address class="font-body-md text-body-md text-foreground not-italic">
            {address.street}<br />{address.city}, {address.postalCode}<br />{address.country}
          </address>
        </p>
      </div>
      <a
        href={routeUrl}
        target="_blank"
        rel="noopener noreferrer"
        class="mt-8 inline-flex items-center gap-2 rounded-lg bg-foreground px-5 py-2.5 font-technical-data text-technical-data text-background font-medium hover:opacity-90 transition-opacity self-start"
      >
        <span class="material-symbols-outlined text-sm" aria-hidden="true">directions</span>
        {_("Get Route")}
      </a>
    </div>

    {/* Map */}
    <figure class="lg:col-span-7 min-h-[320px] lg:min-h-[380px] m-0">
      <iframe
        src={embedUrl}
        title={_("Map showing OS-Technology Ukraine office location")}
        width="100%"
        height="100%"
        class="h-full w-full min-h-[320px]"
        style="border:0;"
        loading="lazy"
        referrerpolicy="no-referrer-when-downgrade"
      ></iframe>
    </figure>
  </div>
</section>
```

> **Note:** The Google Maps Embed API requires an API key (`key=`). Leave the key empty for now — the embed will still display (without the key it falls back to a static map or shows an error tile). The key should be added as a build-time env var in a future task when it is available.

- [ ] **Step 2: Commit**

```bash
git add application/frontend/src/components/contact/OfficeLocation.astro
git commit -m "feat(contact): add OfficeLocation component with lazy map embed"
```

______________________________________________________________________

## Task 12: Create `DocumentsCard.astro`

**Files:**

- Create: `application/frontend/src/components/contact/DocumentsCard.astro`

- [ ] **Step 1: Create the component**

```astro
---
import { getInlineTranslations, type Lang } from "@/i18n";

interface Props {
  lang: Lang;
}

const { lang } = Astro.props;
const _ = getInlineTranslations(lang);

const documents = [
  {
    icon: "verified_user",
    title: _("Wipotec & Mesutronic Authorization"),
    label: _("Official Certificate 2024–2025 — PDF"),
    href: "#",
  },
  {
    icon: "description",
    title: _("Line Sizing Questionnaire"),
    label: _("Technical Audit Form — XLSX"),
    href: "#",
  },
  {
    icon: "menu_book",
    title: _("OS-Technology Capabilities"),
    label: _("Corporate Overview — PDF"),
    href: "#",
  },
];
---

<section class="bg-surface-container-low rounded-xl p-8 shadow-sm space-y-4">
  <h2 class="font-headline-lg text-headline-lg text-foreground font-bold">{_("Authorized Documentation")}</h2>
  <p class="font-body-md text-body-md text-industrial-gray">
    {_("Official distributorship certificates and technical forms.")}
  </p>
  <ul class="space-y-3 pt-2">
    {documents.map((doc) => (
      <li>
        <a
          href={doc.href}
          class="group flex items-center justify-between rounded-lg bg-background p-3.5 hover:shadow-sm transition-all"
          aria-label={doc.title}
        >
          <span class="flex items-center gap-3">
            <span class="material-symbols-outlined text-secondary" aria-hidden="true">{doc.icon}</span>
            <span>
              <span class="font-technical-data text-technical-data font-semibold text-foreground group-hover:text-secondary transition-colors block">
                {doc.title}
              </span>
              <span class="font-label-caps text-label-caps text-industrial-gray uppercase">{doc.label}</span>
            </span>
          </span>
          <span class="material-symbols-outlined text-industrial-gray group-hover:text-foreground transition-colors" aria-hidden="true">download</span>
        </a>
      </li>
    ))}
  </ul>
</section>
```

- [ ] **Step 2: Commit**

```bash
git add application/frontend/src/components/contact/DocumentsCard.astro
git commit -m "feat(contact): add DocumentsCard component (placeholder links)"
```

______________________________________________________________________

## Task 13: Create `ContactForm.astro`

**Files:**

- Create: `application/frontend/src/components/contact/ContactForm.astro`

This is the most complex component. It renders the form markup and contains the client `<script>` that:

1. Lazy-loads the reCAPTCHA script on first field focus
1. Runs client-side validation on submit
1. Fetches `/api/contact`
1. Shows per-field `aria-invalid` + `aria-describedby` errors
1. Shows a `role="status"` / `aria-live` status region

The client maps server error codes to translated display strings without importing any server module.

- [ ] **Step 1: Create `ContactForm.astro`**

```astro
---
import { RECAPTCHA_SITE_KEY } from "astro:env/client";
import CheckboxCard from "./CheckboxCard.astro";
import FormField from "./FormField.astro";
import { EQUIPMENT_SLUGS, SECTORS } from "@/lib/contact/options";
import equipmentTypes from "@/data/equipment-types.json";
import { getInlineTranslations, type Lang } from "@/i18n";

interface Props {
  lang: Lang;
}

const { lang } = Astro.props;
const _ = getInlineTranslations(lang);

// Build equipment label map from equipment-types.json for the current language
const equipmentCategories = equipmentTypes[lang as "en" | "ua"]?.categories ?? [];
const equipmentLabelMap = Object.fromEntries(
  equipmentCategories.map((c) => [c.slug, c.title])
);
---

<section class="bg-background rounded-xl p-8 md:p-10 shadow-md" aria-labelledby="form-heading">
  <header class="flex items-center justify-between pb-6">
    <div>
      <p class="font-label-caps text-label-caps text-secondary font-semibold uppercase">
        {_("Engineering Inquiry")}
      </p>
      <h2 id="form-heading" class="font-headline-xl text-headline-xl text-foreground font-bold mt-1">
        {_("Send Us a Message")}
      </h2>
    </div>
    <span class="material-symbols-outlined text-industrial-gray text-3xl hidden sm:block" aria-hidden="true">
      precision_manufacturing
    </span>
  </header>

  {/* Status region for screen readers and inline feedback */}
  <div
    id="form-status"
    role="status"
    aria-live="polite"
    aria-atomic="true"
    class="mb-6 hidden rounded-lg p-4 font-technical-data text-technical-data"
  ></div>

  <form id="contact-form" novalidate class="space-y-6">
    {/* Honeypot — must stay hidden and empty */}
    <div class="hidden" aria-hidden="true">
      <label for="website">Website</label>
      <input type="text" id="website" name="website" tabindex="-1" autocomplete="off" />
    </div>

    {/* Row 1: Name and Job Title */}
    <div class="grid grid-cols-1 gap-6 md:grid-cols-2">
      <FormField id="name" label={_("Full Name")} required placeholder={_("e.g. Oleksii Kovalenko")} />
      <FormField id="jobTitle" label={_("Job Title")} required placeholder={_("e.g. Chief Engineer")} />
    </div>

    {/* Row 2: Company and Phone */}
    <div class="grid grid-cols-1 gap-6 md:grid-cols-2">
      <FormField id="company" label={_("Company")} required placeholder={_("e.g. Farmak PJSC")} />
      <FormField id="phone" label={_("Phone")} type="tel" required placeholder="+380 (50) 000-00-00" />
    </div>

    {/* Row 3: Email */}
    <FormField
      id="email"
      label={_("Corporate Email")}
      type="email"
      required
      placeholder="engineer@company.ua"
      hint={_("Please use a company email address, not a personal one.")}
    />

    {/* Row 4: Sector */}
    <FormField id="sector" label={_("Industry Sector")} type="select" required>
      <option value="" disabled selected>{_("Select sector…")}</option>
      {SECTORS.map((sector) => (
        <option value={sector}>{sector}</option>
      ))}
    </FormField>

    {/* Row 5: Equipment (optional checkboxes) */}
    <fieldset>
      <legend class="font-technical-data text-technical-data text-foreground font-medium mb-3">
        {_("Equipment of Interest")}
        <span class="text-industrial-gray text-xs ml-1">({_("optional")})</span>
      </legend>
      <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
        {EQUIPMENT_SLUGS.map((slug) => (
          <CheckboxCard
            name="equipment"
            value={slug}
            label={equipmentLabelMap[slug] ?? slug}
          />
        ))}
      </div>
      <p
        id="equipment-error"
        role="alert"
        class="text-destructive hidden mt-2 text-xs font-medium"
        data-field-error="equipment"
      ></p>
    </fieldset>

    {/* Row 6: Message */}
    <FormField
      id="message"
      label={_("Message")}
      type="textarea"
      required
      rows={5}
      placeholder={_("Describe your requirements…")}
    />

    {/* reCAPTCHA notice (badge hidden via CSS below) */}
    <p class="text-industrial-gray text-xs">
      {_("This form is protected by reCAPTCHA.")}
      {" "}
      <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" class="underline hover:text-foreground">{_("Privacy Policy")}</a>
      {" "}&amp;{" "}
      <a href="https://policies.google.com/terms" target="_blank" rel="noopener noreferrer" class="underline hover:text-foreground">{_("Terms of Service")}</a>
    </p>

    {/* Submit */}
    <button
      type="submit"
      id="form-submit"
      class="mt-2 bg-primary text-primary-foreground inline-flex w-full items-center justify-center gap-2 rounded-lg px-8 py-4 font-heading text-base font-semibold transition-opacity hover:opacity-90 disabled:opacity-50 sm:w-auto"
    >
      {_("Submit Inquiry")}
      <span class="material-symbols-outlined" aria-hidden="true">arrow_forward</span>
    </button>
  </form>
</section>

<style>
  /* Hide reCAPTCHA badge (Google's policy: show notice text instead, done above) */
  .grecaptcha-badge {
    visibility: hidden;
  }
</style>

<script define:vars={{ siteKey: RECAPTCHA_SITE_KEY }}>
  // Error code → display message map (client-side; server never returns raw messages)
  const ERROR_MESSAGES = {
    required: "This field is required.",
    too_long: "This value is too long.",
    invalid_format: "Please enter a valid email address.",
    free_mail: "Please use a company email address, not a personal one.",
    invalid_sector: "Please select a valid sector.",
    invalid_equipment: "One or more selected equipment types are invalid.",
    rate_limited: "Too many submissions. Please try again in 10 minutes.",
    recaptcha_missing: "Security check failed. Please refresh and try again.",
    recaptcha_failed: "Security check failed. Please refresh and try again.",
    recaptcha_unavailable: "Could not complete security check. Please try again later.",
    smtp_error: "Could not send your message. Please try again later or email us directly.",
    validation_failed: "Please correct the highlighted fields and try again.",
    forbidden: "Submission not allowed from this origin.",
    default: "An unexpected error occurred. Please try again.",
  };

  let recaptchaLoaded = false;

  function loadRecaptcha() {
    if (recaptchaLoaded || !siteKey) return;
    recaptchaLoaded = true;
    const script = document.createElement("script");
    script.src = `https://www.google.com/recaptcha/api.js?render=${siteKey}`;
    script.async = true;
    document.head.appendChild(script);
  }

  function clearErrors(form) {
    form.querySelectorAll("[data-field-error]").forEach((el) => {
      el.textContent = "";
      el.classList.add("hidden");
    });
    form.querySelectorAll("[aria-invalid]").forEach((el) => {
      el.removeAttribute("aria-invalid");
    });
  }

  function showFieldError(form, fieldId, message) {
    const errorEl = form.querySelector(`[data-field-error="${fieldId}"]`);
    const inputEl = form.querySelector(`#${fieldId}`);
    if (errorEl) {
      errorEl.textContent = message;
      errorEl.classList.remove("hidden");
    }
    if (inputEl) {
      inputEl.setAttribute("aria-invalid", "true");
    }
  }

  function showStatus(message, isError) {
    const statusEl = document.getElementById("form-status");
    if (!statusEl) return;
    statusEl.textContent = message;
    statusEl.classList.remove("hidden", "bg-destructive/10", "text-destructive", "bg-green-50", "text-green-800");
    if (isError) {
      statusEl.classList.add("bg-destructive/10", "text-destructive");
    } else {
      statusEl.classList.add("bg-green-50", "text-green-800");
    }
  }

  // Client-side validation mirrors server rules (server remains authoritative)
  function validateClient(data) {
    const errors = {};
    const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const FREE_MAIL = new Set(["gmail.com","yahoo.com","hotmail.com","outlook.com","icloud.com","ukr.net","mail.ru","yandex.ru","yandex.ua","rambler.ru","meta.ua","i.ua","inbox.ru","me.com","mac.com","msn.com","live.com","yahoo.co.uk","hotmail.co.uk"]);

    if (!data.name.trim()) errors.name = "required";
    else if (data.name.length > 200) errors.name = "too_long";

    if (!data.jobTitle.trim()) errors.jobTitle = "required";
    if (!data.company.trim()) errors.company = "required";
    if (!data.phone.trim()) errors.phone = "required";

    if (!data.email.trim()) {
      errors.email = "required";
    } else if (!EMAIL_RE.test(data.email)) {
      errors.email = "invalid_format";
    } else {
      const domain = data.email.split("@")[1]?.toLowerCase();
      if (domain && FREE_MAIL.has(domain)) errors.email = "free_mail";
    }

    if (!data.sector) errors.sector = "required";
    if (!data.message.trim()) errors.message = "required";
    else if (data.message.length > 5000) errors.message = "too_long";

    return errors;
  }

  function setupForm() {
    const form = document.getElementById("contact-form");
    if (!form) return;

    // Lazy-load reCAPTCHA on first field focus
    form.querySelectorAll("input, select, textarea").forEach((el) => {
      el.addEventListener("focus", loadRecaptcha, { once: true });
    });

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      clearErrors(form);

      const submitBtn = document.getElementById("form-submit");
      const formData = new FormData(form);

      const data = {
        name: formData.get("name") ?? "",
        jobTitle: formData.get("jobTitle") ?? "",
        company: formData.get("company") ?? "",
        phone: formData.get("phone") ?? "",
        email: formData.get("email") ?? "",
        sector: formData.get("sector") ?? "",
        equipment: formData.getAll("equipment"),
        message: formData.get("message") ?? "",
        website: formData.get("website") ?? "",
      };

      // Client-side validation
      const clientErrors = validateClient(data);
      if (Object.keys(clientErrors).length > 0) {
        Object.entries(clientErrors).forEach(([field, code]) => {
          showFieldError(form, field, ERROR_MESSAGES[code] ?? ERROR_MESSAGES.default);
        });
        showStatus(ERROR_MESSAGES.validation_failed, true);
        return;
      }

      // Get reCAPTCHA token
      let recaptchaToken = "";
      if (typeof grecaptcha !== "undefined" && siteKey) {
        try {
          recaptchaToken = await new Promise((resolve) => {
            grecaptcha.ready(() => {
              grecaptcha.execute(siteKey, { action: "contact" }).then(resolve);
            });
          });
        } catch {
          showStatus(ERROR_MESSAGES.recaptcha_missing, true);
          return;
        }
      }

      submitBtn?.setAttribute("disabled", "true");

      try {
        const res = await fetch("/api/contact", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...data, recaptchaToken }),
        });

        const json = await res.json();

        if (json.ok) {
          showStatus("Your inquiry has been sent. We will contact you shortly.", false);
          form.reset();
        } else if (json.fields) {
          Object.entries(json.fields).forEach(([field, code]) => {
            showFieldError(form, field, ERROR_MESSAGES[code] ?? ERROR_MESSAGES.default);
          });
          showStatus(ERROR_MESSAGES.validation_failed, true);
        } else {
          showStatus(ERROR_MESSAGES[json.error] ?? ERROR_MESSAGES.default, true);
        }
      } catch {
        showStatus(ERROR_MESSAGES.smtp_error, true);
      } finally {
        submitBtn?.removeAttribute("disabled");
      }
    });
  }

  setupForm();
  document.addEventListener("astro:page-load", setupForm);
</script>
```

- [ ] **Step 2: Commit**

```bash
git add application/frontend/src/components/contact/ContactForm.astro
git commit -m "feat(contact): add ContactForm component with client-side reCAPTCHA and error handling"
```

______________________________________________________________________

## Task 14: Create the page `src/pages/[lang]/contact.astro`

**Files:**

- Create: `application/frontend/src/pages/[lang]/contact.astro`

- [ ] **Step 1: Create the page**

```astro
---
import ContactForm from "@/components/contact/ContactForm.astro";
import ContactHero from "@/components/contact/ContactHero.astro";
import ContactInfoCard from "@/components/contact/ContactInfoCard.astro";
import DocumentsCard from "@/components/contact/DocumentsCard.astro";
import OfficeLocation from "@/components/contact/OfficeLocation.astro";
import companyData from "@/data/company.json";
import { getInlineTranslations, isValidLang, type Lang } from "@/i18n";
import { languages } from "@/i18n/ui";
import Layout from "@/layouts/Layout.astro";

export function getStaticPaths() {
  return (Object.keys(languages) as Lang[]).map((lang) => ({ params: { lang } }));
}

const langParam = Astro.params.lang;
if (!isValidLang(langParam)) {
  return new Response(null, { status: 404 });
}
const lang: Lang = langParam;
const _ = getInlineTranslations(lang);

const siteUrl = Astro.site ?? "https://ocs.com.ua";
const currentUrl = new URL(Astro.url.pathname, siteUrl).href;
const address = companyData.address[lang as "en" | "ua"] ?? companyData.address.en;

const structuredData = [
  {
    "@context": "https://schema.org",
    "@type": "ContactPage",
    url: currentUrl,
    inLanguage: lang,
    name: lang === "en" ? "Contact OS-Technology Ukraine" : "Зв'яжіться з ОС-Технолоджи Україна",
    breadcrumb: {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: lang === "en" ? "Home" : "Головна", item: `${siteUrl}/${lang}` },
        { "@type": "ListItem", position: 2, name: lang === "en" ? "Contact Us" : "Зв'яжіться з нами", item: currentUrl },
      ],
    },
  },
  {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: lang === "en" ? "OS-Technology Ukraine" : "ОС-Технолоджи Україна",
    url: `${siteUrl}/${lang}`,
    telephone: companyData.phone.href,
    email: companyData.emails.info,
    address: {
      "@type": "PostalAddress",
      streetAddress: address.street,
      addressLocality: address.city,
      postalCode: address.postalCode,
      addressCountry: "UA",
    },
    openingHoursSpecification: {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
      opens: "09:00",
      closes: "18:00",
    },
    areaServed: "UA",
  },
];
---

<Layout
  title={_("Contact Us | OS-Technology Ukraine")}
  description={_("Contact the OS-Technology Ukraine engineering team. Request a quotation, arrange a product demonstration, or get technical support.")}
>
  {structuredData.map((sd) => (
    <script type="application/ld+json" set:html={JSON.stringify(sd)} />
  ))}

  <ContactHero lang={lang} />

  <div class="mx-auto max-w-[1280px] px-8 pb-24 space-y-16">
    {/* Main grid: form (8 cols) + sidebar (4 cols) */}
    <div class="grid grid-cols-1 gap-6 items-start lg:grid-cols-12">
      <div class="lg:col-span-8">
        <ContactForm lang={lang} />
      </div>
      <aside class="lg:col-span-4 space-y-6">
        <ContactInfoCard lang={lang} />
        <DocumentsCard lang={lang} />
      </aside>
    </div>

    {/* Office location with map */}
    <OfficeLocation lang={lang} />
  </div>
</Layout>
```

- [ ] **Step 2: Run astro check**

```bash
cd application/frontend && bunx astro check
```

Expected: no type errors.

- [ ] **Step 3: Commit**

```bash
git add application/frontend/src/pages/[lang]/contact.astro
git commit -m "feat(contact): add /[lang]/contact page"
```

______________________________________________________________________

## Task 15: Update `Header.astro` — add "Contact Us" button

**Files:**

- Modify: `application/frontend/src/components/Header.astro`

The spec says: add a "Contact Us" primary button to the right-side desktop actions and to the mobile drawer. Active when path contains `/contact`.

- [ ] **Step 1: Add button to desktop right-side actions**

In the desktop right-side actions `<div class="flex items-center gap-4">`, add the Contact button **before** the language switcher div. The button is a link styled as a primary button using Tailwind (not the `<Button>` component — that would require a React island for a simple static link):

```astro
{/* Contact Us button — desktop */}
<a
  href={`/${lang}/contact`}
  class={`hidden items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold transition-opacity hover:opacity-90 md:inline-flex ${
    isActive("/contact")
      ? "bg-secondary text-white"
      : "bg-primary text-primary-foreground"
  }`}
>
  {_("Contact Us")}
</a>
```

- [ ] **Step 2: Add button to mobile drawer**

In the mobile menu drawer's `<div class="space-y-4 px-8 py-6">`, after the nav links loop and before the language section div, add:

```astro
{/* Contact Us button — mobile */}
<a
  href={`/${lang}/contact`}
  class={`flex w-full items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-semibold transition-opacity hover:opacity-90 ${
    isActive("/contact")
      ? "bg-secondary text-white"
      : "bg-primary text-primary-foreground"
  }`}
>
  {_("Contact Us")}
</a>
```

- [ ] **Step 3: Run check and verify**

```bash
cd application/frontend && bun run check:fix
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add application/frontend/src/components/Header.astro
git commit -m "feat(header): add Contact Us button to desktop and mobile navigation"
```

______________________________________________________________________

## Task 16: Update all `#contact` links to point to `/${lang}/contact`

**Files:**

- Modify: `application/frontend/src/components/homepage/HeroSection.astro`
- Modify: `application/frontend/src/components/catalogue/ProductSidebar.astro`
- Modify: `application/frontend/src/components/catalogue/CatalogueSidebar.astro`
- Modify: `application/frontend/src/pages/[lang]/catalogue/[category]/[slug].astro`
- Modify: `application/frontend/src/components/errors/NotFoundContent.astro`
- Modify: `application/frontend/src/components/errors/ServerErrorContent.astro`

All six files contain `/${lang}#contact` references. Replace every occurrence with `/${lang}/contact`.

- [ ] **Step 1: Do the replacements**

In each file, find `/${lang}#contact` and replace with `/${lang}/contact`. There may be backtick template literals; the pattern is `` `/${lang}#contact` `` → `` `/${lang}/contact` ``.

Locations (from `grep` output):

- `src/components/errors/ServerErrorContent.astro:43`

- `src/components/errors/NotFoundContent.astro:51`

- `src/pages/[lang]/catalogue/[category]/[slug].astro:210`

- `src/components/homepage/HeroSection.astro:83`

- `src/components/catalogue/ProductSidebar.astro:38`

- `src/components/catalogue/CatalogueSidebar.astro:92`

- [ ] **Step 2: Verify no stale links remain**

```bash
cd application/frontend && grep -r "#contact" src/
```

Expected: zero matches.

- [ ] **Step 3: Run check**

```bash
cd application/frontend && bun run check:fix
```

- [ ] **Step 4: Commit**

```bash
git add application/frontend/src/components/homepage/HeroSection.astro \
        application/frontend/src/components/catalogue/ProductSidebar.astro \
        application/frontend/src/components/catalogue/CatalogueSidebar.astro \
        application/frontend/src/pages/[lang]/catalogue/[category]/[slug].astro \
        application/frontend/src/components/errors/NotFoundContent.astro \
        application/frontend/src/components/errors/ServerErrorContent.astro
git commit -m "feat(links): update all #contact anchors to /[lang]/contact page route"
```

______________________________________________________________________

## Task 17: Create `scripts/render-env.mjs` — TDD

**Files:**

- Create: `application/frontend/scripts/render-env.mjs`
- Create: `application/frontend/scripts/render-env.test.mjs`

This script is called by the deploy workflow. It reads `.github/secrets.dev.yaml`, picks the mapped GitHub secrets and variables from JSON passed via env vars, and prints the env file content.

- [ ] **Step 1: Install yaml devDependency**

```bash
cd application/frontend && bun add -D yaml
```

### 17a — Write the failing test first

- [ ] **Step 2: Create `render-env.test.mjs`**

```javascript
import { describe, expect, it } from "bun:test";
import { renderEnv } from "./render-env.mjs";

const manifest = {
  env_file: "/home/ocs/test.env",
  secrets: {
    MY_SECRET: "SECRET_VAR",
  },
  variables: {
    MY_VAR: "PUBLIC_VAR",
  },
};

describe("renderEnv", () => {
  it("maps secret to env line", () => {
    const result = renderEnv(manifest, { MY_SECRET: "s3cr3t" }, {});
    expect(result).toContain('SECRET_VAR="s3cr3t"');
  });

  it("maps variable to env line", () => {
    const result = renderEnv(manifest, {}, { MY_VAR: "hello" });
    expect(result).toContain('PUBLIC_VAR="hello"');
  });

  it("escapes backslashes in values", () => {
    const result = renderEnv(manifest, { MY_SECRET: "back\\slash" }, {});
    expect(result).toContain('SECRET_VAR="back\\\\slash"');
  });

  it("escapes double quotes in values", () => {
    const result = renderEnv(manifest, { MY_SECRET: 'say "hi"' }, {});
    expect(result).toContain('SECRET_VAR="say \\"hi\\""');
  });

  it("throws if a listed name is missing", () => {
    expect(() => renderEnv(manifest, {}, {})).toThrow(/MY_SECRET/);
  });

  it("throws if a listed name is empty string", () => {
    expect(() => renderEnv(manifest, { MY_SECRET: "" }, {})).toThrow(/MY_SECRET/);
  });

  it("throws if value contains a newline", () => {
    expect(() => renderEnv(manifest, { MY_SECRET: "bad\nvalue" }, {})).toThrow();
  });
});
```

- [ ] **Step 3: Run to verify FAIL**

```bash
cd application/frontend && bun test scripts/render-env.test.mjs
```

Expected: FAIL — `Cannot find module './render-env.mjs'`

### 17b — Implement `render-env.mjs`

- [ ] **Step 4: Create `render-env.mjs`**

```javascript
#!/usr/bin/env node
// Reads a secrets manifest YAML and the GitHub secrets/variables JSON objects
// passed via environment variables, then prints the server env file content.
//
// Usage (called by the deploy workflow):
//   node scripts/render-env.mjs .github/secrets.dev.yaml
//
// The workflow passes ${{ toJSON(secrets) }} as GH_SECRETS and
// ${{ toJSON(vars) }} as GH_VARS in its env: block.

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parse } from "yaml";

/**
 * @param {object} manifest - Parsed secrets manifest
 * @param {Record<string, string>} secrets - GitHub secrets object
 * @param {Record<string, string>} variables - GitHub variables object
 * @returns {string} - env file content
 */
export function renderEnv(manifest, secrets, variables) {
  const lines = [];

  const processMapping = (mapping, source, sourceLabel) => {
    for (const [ghName, envName] of Object.entries(mapping)) {
      const value = source[ghName];
      if (value === undefined || value === null || value === "") {
        throw new Error(
          `Required ${sourceLabel} "${ghName}" is missing or empty in the provided context.`
        );
      }
      if (/[\r\n]/.test(value)) {
        throw new Error(
          `Value for "${ghName}" contains a newline character, which is not allowed in an env file.`
        );
      }
      // Escape backslashes first, then double quotes
      const escaped = value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
      lines.push(`${envName}="${escaped}"`);
    }
  };

  if (manifest.secrets) processMapping(manifest.secrets, secrets, "secret");
  if (manifest.variables) processMapping(manifest.variables, variables, "variable");

  return lines.join("\n") + "\n";
}

// CLI entry point
if (process.argv[1] === new URL(import.meta.url).pathname) {
  const manifestPath = process.argv[2];
  if (!manifestPath) {
    console.error("Usage: node scripts/render-env.mjs <path-to-manifest.yaml>");
    process.exit(1);
  }

  const manifest = parse(readFileSync(resolve(manifestPath), "utf8"));

  let ghSecrets = {};
  let ghVars = {};
  try {
    ghSecrets = JSON.parse(process.env.GH_SECRETS ?? "{}");
    ghVars = JSON.parse(process.env.GH_VARS ?? "{}");
  } catch (e) {
    console.error("Failed to parse GH_SECRETS or GH_VARS as JSON:", e.message);
    process.exit(1);
  }

  try {
    process.stdout.write(renderEnv(manifest, ghSecrets, ghVars));
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
}
```

- [ ] **Step 5: Run to verify PASS**

```bash
cd application/frontend && bun test scripts/render-env.test.mjs
```

Expected: all tests PASS.

- [ ] **Step 6: Commit**

```bash
git add application/frontend/scripts/render-env.mjs application/frontend/scripts/render-env.test.mjs application/frontend/package.json application/frontend/bun.lock
git commit -m "feat(deploy): add render-env.mjs script with tests"
```

______________________________________________________________________

## Task 18: Create `.github/secrets.dev.yaml`

**Files:**

- Create: `.github/secrets.dev.yaml`

- [ ] **Step 1: Create the manifest**

```yaml
# Maps GitHub repository secrets/variables to the server env file.
# All values are injected by the deploy workflow; this file contains no secrets.
env_file: /home/ocs/domains/dev.ocs.com.ua/ocs-dev.env

secrets:
  # key: GitHub secret name  ->  value: env var name written to the env file
  DEV_GITHUB_CLIENT_ID: GITHUB_CLIENT_ID
  DEV_GITHUB_CLIENT_SECRET: GITHUB_CLIENT_SECRET
  DEV_RECAPTCHA_SECRET_KEY: RECAPTCHA_SECRET_KEY
  SMTP_USER: SMTP_USER
  SMTP_PASS: SMTP_PASS

variables:
  # key: GitHub variable name  ->  value: env var name written to the env file
  DEV_CONTACT_TO: CONTACT_TO
  DEV_RECAPTCHA_SITE_KEY: RECAPTCHA_SITE_KEY
  CONTACT_FROM: CONTACT_FROM
  SMTP_HOST: SMTP_HOST
  SMTP_PORT: SMTP_PORT
  SMTP_SECURE: SMTP_SECURE
```

- [ ] **Step 2: Commit**

```bash
git add .github/secrets.dev.yaml
git commit -m "feat(deploy): add secrets.dev.yaml manifest for env file sync"
```

______________________________________________________________________

## Task 19: Update `deploy-dev.yml` — add env sync step

**Files:**

- Modify: `.github/workflows/deploy-dev.yml`

Three changes:

1. Pass new build-time public env vars (`RECAPTCHA_SITE_KEY`, `CONTACT_TO`, `CONTACT_FROM`) to the Build step.
1. Add a "Sync env file" step after Upload and before Restart.
1. Ship `yaml` devDependency for `render-env.mjs` (it runs on the CI runner, not on the server, so it stays in devDependencies).

- [ ] **Step 1: Update the Build step env block**

Change the Build step from:

```yaml
      - name: Build
        run: bun run build
        env:
          SITE_URL: https://dev.ocs.com.ua
          CMS_BASE_URL: https://dev.ocs.com.ua
```

To:

```yaml
      - name: Build
        run: bun run build
        env:
          SITE_URL: https://dev.ocs.com.ua
          CMS_BASE_URL: https://dev.ocs.com.ua
          RECAPTCHA_SITE_KEY: ${{ vars.DEV_RECAPTCHA_SITE_KEY }}
          CONTACT_TO: ${{ vars.DEV_CONTACT_TO }}
          CONTACT_FROM: ${{ vars.CONTACT_FROM }}
```

- [ ] **Step 2: Add the "Sync env file" step between Upload and Restart**

```yaml
      - name: Sync env file
        env:
          GH_SECRETS: ${{ toJSON(secrets) }}
          GH_VARS: ${{ toJSON(vars) }}
        run: |
          node scripts/render-env.mjs ../.github/secrets.dev.yaml | \
            ssh "${{ secrets.DEV_SSH_USER }}@${{ secrets.DEV_SSH_HOST }}" \
            "umask 077; cat > /tmp/ocs-dev.env.tmp && mv /tmp/ocs-dev.env.tmp /home/ocs/domains/dev.ocs.com.ua/ocs-dev.env"
```

- [ ] **Step 3: Verify yaml**

```bash
cd / && cat .github/workflows/deploy-dev.yml
```

Visually check that step order is: checkout → setup-node → setup-bun → install → build → install-prod → configure-ssh → upload → **sync-env** → restart.

- [ ] **Step 4: Commit**

```bash
git add .github/workflows/deploy-dev.yml
git commit -m "feat(deploy): add Sync env file step to deploy-dev workflow"
```

______________________________________________________________________

## Task 20: Extract translations and compile

**Files:**

- Modify: `application/frontend/locales/ua.po`

- [ ] **Step 1: Extract all new `_()` calls**

```bash
cd application/frontend && bun run i18n:extract
```

Expected: new msgid entries appear in `locales/ua.po` (with empty `msgstr`).

- [ ] **Step 2: Fill in Ukrainian translations in `locales/ua.po`**

Open `application/frontend/locales/ua.po` and find all entries with empty `msgstr ""` that are new (the extractor preserves existing translations). Fill in at minimum these new strings:

```
"Get in Touch" -> "Зв'яжіться з нами"
"Contact Us" -> "Зв'яжіться з нами"
"Contact Us | OS-Technology Ukraine" -> "Зв'яжіться з нами | ОС-Технолоджи Україна"
"Contact us" -> "Зв'яжіться з нами"
"Send Us a Message" -> "Надіслати повідомлення"
"Engineering Inquiry" -> "Технічний запит"
"Full Name" -> "Повне ім'я"
"Job Title" -> "Посада"
"Company" -> "Компанія"
"Phone" -> "Телефон"
"Corporate Email" -> "Корпоративний email"
"Please use a company email address, not a personal one." -> "Будь ласка, використовуйте корпоративну адресу, а не особисту."
"Industry Sector" -> "Галузь"
"Select sector…" -> "Оберіть галузь…"
"Equipment of Interest" -> "Обладнання, що цікавить"
"optional" -> "необов'язково"
"Message" -> "Повідомлення"
"Describe your requirements…" -> "Опишіть свої потреби…"
"Submit Inquiry" -> "Надіслати запит"
"This form is protected by reCAPTCHA." -> "Ця форма захищена reCAPTCHA."
"Privacy Policy" -> "Політика конфіденційності"
"Terms of Service" -> "Умови використання"
"Contact Information" -> "Контактна інформація"
"Phone" -> "Телефон"
"Email" -> "Email"
"Address" -> "Адреса"
"Working Hours" -> "Режим роботи"
"Authorized Documentation" -> "Авторизована документація"
"Official distributorship certificates and technical forms." -> "Офіційні сертифікати дистриб'юторства та технічні форми."
"Wipotec & Mesutronic Authorization" -> "Авторизація Wipotec & Mesutronic"
"Official Certificate 2024–2025 — PDF" -> "Офіційний сертифікат 2024–2025 — PDF"
"Line Sizing Questionnaire" -> "Опитувальник для вибору обладнання"
"Technical Audit Form — XLSX" -> "Технічна анкета — XLSX"
"OS-Technology Capabilities" -> "Можливості ОС-Технолоджи"
"Corporate Overview — PDF" -> "Корпоративний огляд — PDF"
"Kyiv Office" -> "Київський офіс"
"Main Office" -> "Головний офіс"
"Get Route" -> "Прокласти маршрут"
"Map showing OS-Technology Ukraine office location" -> "Карта з розташуванням офісу ОС-Технолоджи Україна"
"Contact our engineering team to discuss equipment selection, request a quotation, or arrange a product demonstration." -> "Зверніться до нашої інженерної команди для обговорення вибору обладнання, запиту комерційної пропозиції або організації демонстрації."
"Home" -> "Головна"
"Contact us" -> "Зв'яжіться з нами"
```

- [ ] **Step 3: Compile translations**

```bash
cd application/frontend && bun run i18n:compile
```

Expected: `src/i18n/ui.ts` updated, no errors.

- [ ] **Step 4: Commit**

```bash
git add application/frontend/locales/ua.po application/frontend/src/i18n/ui.ts
git commit -m "feat(i18n): add Ukrainian translations for contact page"
```

______________________________________________________________________

## Task 21: Final validation and build

- [ ] **Step 1: Run all tests**

```bash
cd application/frontend && bun test src/lib/contact/ scripts/render-env.test.mjs
```

Expected: all tests PASS.

- [ ] **Step 2: Run lint and type-check**

```bash
cd application/frontend && bun run check:fix && bunx astro check
```

Expected: no errors or new warnings.

- [ ] **Step 3: Production build**

```bash
cd application/frontend && bun run build
```

Expected: build succeeds with no errors. Note: Astro will warn about `output: "static"` + server route — this is expected; the `prerender = false` on the API route is the correct pattern (see `src/pages/api/auth.ts`).

- [ ] **Step 4: Dev server smoke-test**

```bash
cd application/frontend && bun run dev
```

Open `http://localhost:4321/en/contact` and `http://localhost:4321/ua/contact`. Verify:

- Breadcrumb, H1, partner badges visible.

- Form fields render with visible labels.

- Sector select options appear.

- Equipment checkboxes render (six tiles matching `equipment-types.json`).

- Contact info card shows phone, email, address, hours from `company.json`.

- Documents card shows three placeholder links.

- Office location section renders (map iframe may be blank without an API key).

- Header "Contact Us" button appears on desktop.

- Mobile menu "Contact Us" button appears.

- Clicking "Contact Us" in old pages (Hero, ProductSidebar, etc.) now navigates to `/[lang]/contact`.

- [ ] **Step 5: Final commit (if any outstanding changes)**

```bash
cd application/frontend && git add -A && git commit -m "chore: final cleanup and validation for contact page"
```

______________________________________________________________________

## Migration note (before first deploy)

Before merging to main / triggering the first deploy with this change:

1. Go to the GitHub repository → Settings → Secrets and variables → Actions.
1. Add secrets: `DEV_GITHUB_CLIENT_ID`, `DEV_GITHUB_CLIENT_SECRET` (copy values from current server `ocs-dev.env`), `DEV_RECAPTCHA_SECRET_KEY`, `SMTP_USER`, `SMTP_PASS`.
1. Add variables: `DEV_CONTACT_TO` (e.g. developer email for testing), `DEV_RECAPTCHA_SITE_KEY`, `CONTACT_FROM`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`.

Failure to do this before deploying will cause the "Sync env file" step to fail and the OAuth login to break (the step fails before overwriting the file, so the old env file is preserved atomically).

______________________________________________________________________

## Self-Review Checklist

**Spec coverage:**

- [x] Hero with breadcrumb, H1, intro, partner badges → Task 9 (`ContactHero.astro`)
- [x] Inquiry form with all fields from spec → Task 13 (`ContactForm.astro`), Task 8 atoms
- [x] Contact info card (phone, email, hours, address) → Task 10 (`ContactInfoCard.astro`)
- [x] Kyiv office panel with address, map, route link → Task 11 (`OfficeLocation.astro`)
- [x] Authorized Documentation card with placeholder links → Task 12 (`DocumentsCard.astro`)
- [x] "Contact Us" button in header (desktop + mobile) → Task 15
- [x] `/api/contact` with honeypot, rate limit, reCAPTCHA, validation, SMTP → Tasks 3–5, 7
- [x] Full EN/UA translation via `_()` → Task 20
- [x] SEO metadata, JSON-LD (ContactPage, LocalBusiness/BreadcrumbList) → Task 14
- [x] `company.json` address + partners → Task 1
- [x] `src/lib/contact/options.ts` shared allow-lists → Task 2
- [x] `scripts/render-env.mjs` + `.github/secrets.dev.yaml` + workflow step → Tasks 17–19
- [x] Dead `#contact` links updated → Task 16
- [x] reCAPTCHA lazy-loaded on first focus → Task 13 script
- [x] reCAPTCHA badge hidden, notice text shown → Task 13
- [x] Map iframe `loading="lazy"` with `title` → Task 11
- [x] `bun test` for all pure logic modules → Tasks 3, 4, 5, 17
- [x] `bun run check`, `bunx astro check`, `bun run build` → Task 21

**Out-of-scope items confirmed excluded:**

- Regional hubs (Lviv, Dnipro, Odesa), emergency hotline, FAQ → none added
- Second phone, `service@`, "Copy GPS", invented coordinates → none added
- File upload, NDA checkbox, speed/mass/accuracy block → none added
- Unverified claims (Est. 2015, \<2h response, SLA Tier 1, ISO certs) → none added
- Apache vhost `/api/contact` proxy rule → noted as out of scope
