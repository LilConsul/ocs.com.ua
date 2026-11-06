# Gated Datasheet Download Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use skills:subagent-driven-development (recommended) or skills:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** On a product page the "Technical Datasheet" button opens a lead-form dialog; only after a successful submit does the visitor get a short-lived signed link to the PDF, and the sales team gets an email about the download.

**Architecture:** Datasheet PDFs move from `public/` to `application/frontend/private/datasheets/`, which the build copies to `dist/private/datasheets/` (outside the Apache document root). `POST /api/datasheet-request` reuses the contact form's anti-abuse pipeline, emails the team and returns an HMAC-signed 5-minute URL. `GET /api/datasheet?token=` verifies the token and serves the file as an attachment. The product page renders only a button and a `<dialog>`, never the PDF URL.

**Tech Stack:** Astro 7 (static + Node standalone adapter), Bun test, nodemailer, Decap CMS, Tailwind 4, Biome.

**Spec:** `docs/superpowers/specs/2026-11-06-gated-datasheet-download-design.md`

**Conventions (from `application/frontend/CLAUDE.md`):**

- Run all commands from `application/frontend` unless stated otherwise.
- Tabs, 100-character lines, double quotes. Run `bun run check:fix` before each commit.
- Commit format: `type(scope): subject`, imperative, lowercase, no period, at most 72 characters. No emojis, no `Co-Authored-By`.
- A pre-commit hook that modifies files fails the commit: re-stage and commit again.
- Tests live in `tests/`, mirror `src/`, and use `import { describe, expect, it } from "bun:test"`.

______________________________________________________________________

## File Structure

| File                                                                                            | Action | Responsibility                                                                      |
| ----------------------------------------------------------------------------------------------- | ------ | ----------------------------------------------------------------------------------- |
| `src/lib/datasheet/token.ts`                                                                    | create | Sign and verify download tokens (HMAC, expiry)                                      |
| `src/lib/datasheet/files.ts`                                                                    | create | Parse the `datasheet` reference, locate the private folder, resolve and check files |
| `src/lib/datasheet/mailer.ts`                                                                   | create | Build and send the "datasheet downloaded" email                                     |
| `src/lib/datasheet/templates/datasheet.html` / `.txt`                                           | create | Email bodies (Ukrainian)                                                            |
| `src/lib/contact/validate.ts`                                                                   | modify | Extract `validateLeadFields` shared by both forms                                   |
| `src/lib/contact/form-script.ts`                                                                | modify | Export shared client helpers, move reCAPTCHA into reusable functions                |
| `src/lib/catalogue/datasheet-script.ts`                                                         | create | Client logic of the dialog                                                          |
| `src/pages/api/datasheet-request.ts`                                                            | create | Validate, email, issue token                                                        |
| `src/pages/api/datasheet.ts`                                                                    | create | Verify token, stream the PDF                                                        |
| `src/components/catalogue/DatasheetModal.astro`                                                 | create | Dialog markup, messages, config injection                                           |
| `src/pages/[lang]/catalogue/equipment/[category]/[slug].astro`                                  | modify | Button + modal instead of the PDF link                                              |
| `src/lib/structured-data/product.ts`                                                            | modify | Drop `datasheetUrl` / `subjectOf`                                                   |
| `src/styles/no-js.css`                                                                          | modify | Hide the dead button without JS                                                     |
| `src/pages/admin/_config.template.yml`                                                          | modify | `datasheet` field uploads to the private folder                                     |
| `astro.config.mjs`                                                                              | modify | `DATASHEET_TOKEN_SECRET` env var, copy private folder into `dist/`                  |
| `tests/helpers/mocks.ts`                                                                        | modify | Mock the new env var and `getCollection`                                            |
| `application/infra/apache/dev.ocs.com.ua.ocs.conf`                                              | modify | Proxy the two new routes                                                            |
| `.github/workflows/ci.yml`, `deploy-dev.yml`, `.github/secrets.dev.yaml`                        | modify | Pass the new secret                                                                 |
| `.env.example`, `docs/info/environment.md`, `docs/info/deployment.md`, `CLAUDE.md`, `Agents.md` | modify | Documentation                                                                       |
| `private/datasheets/hc-m.pdf`                                                                   | move   | From `public/assets/equipment/hc-m/datasheet.pdf`                                   |

______________________________________________________________________

### Task 1: Download token

**Files:**

- Create: `src/lib/datasheet/token.ts`

- Test: `tests/lib/datasheet/token.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/lib/datasheet/token.test.ts`:

```ts
import { describe, expect, it } from "bun:test";
import { signToken, TOKEN_TTL_SECONDS, verifyToken } from "@/lib/datasheet/token";

const SECRET = "unit-test-secret-0123456789abcdef";
const NOW = 1_800_000_000_000;

describe("datasheet token", () => {
	it("round-trips the file name", () => {
		const token = signToken("hc-m.pdf", SECRET, NOW);
		expect(verifyToken(token, SECRET, NOW + 1000)).toBe("hc-m.pdf");
	});

	it("is valid until just before the lifetime ends", () => {
		const token = signToken("hc-m.pdf", SECRET, NOW);
		expect(verifyToken(token, SECRET, NOW + (TOKEN_TTL_SECONDS - 1) * 1000)).toBe("hc-m.pdf");
	});

	it("expires after the lifetime", () => {
		const token = signToken("hc-m.pdf", SECRET, NOW);
		expect(verifyToken(token, SECRET, NOW + (TOKEN_TTL_SECONDS + 1) * 1000)).toBeNull();
	});

	it("rejects a different secret", () => {
		const token = signToken("hc-m.pdf", SECRET, NOW);
		expect(verifyToken(token, "another-secret-0123456789abcdefgh", NOW)).toBeNull();
	});

	it("rejects a tampered payload", () => {
		const [, mac] = signToken("hc-m.pdf", SECRET, NOW).split(".");
		const forged = Buffer.from(
			JSON.stringify({ f: "other.pdf", exp: NOW / 1000 + 300 })
		).toString("base64url");
		expect(verifyToken(`${forged}.${mac}`, SECRET, NOW)).toBeNull();
	});

	it("rejects a tampered signature", () => {
		const [body] = signToken("hc-m.pdf", SECRET, NOW).split(".");
		expect(verifyToken(`${body}.AAAA`, SECRET, NOW)).toBeNull();
	});

	it("rejects malformed input", () => {
		for (const bad of ["", "abc", "a.b.c", ".", "a.", ".b", "%%%.%%%"]) {
			expect(verifyToken(bad, SECRET, NOW)).toBeNull();
		}
	});
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `bun test tests/lib/datasheet/token.test.ts`
Expected: FAIL, "Cannot find module '@/lib/datasheet/token'".

- [ ] **Step 3: Write the implementation**

Create `src/lib/datasheet/token.ts`:

```ts
import { createHmac, timingSafeEqual } from "node:crypto";

// Long enough to start (or retry) a download, short enough that a leaked link is useless
export const TOKEN_TTL_SECONDS = 300;

const encode = (value: Buffer | string) => Buffer.from(value).toString("base64url");

function mac(body: string, secret: string): Buffer {
	return createHmac("sha256", secret).update(body).digest();
}

/** `<base64url payload>.<base64url HMAC>`; the payload holds the file name and the expiry. */
export function signToken(file: string, secret: string, nowMs = Date.now()): string {
	const exp = Math.floor(nowMs / 1000) + TOKEN_TTL_SECONDS;
	const body = encode(JSON.stringify({ f: file, exp }));
	return `${body}.${encode(mac(body, secret))}`;
}

/** Returns the file name when the token is genuine and not expired, otherwise null. */
export function verifyToken(token: string, secret: string, nowMs = Date.now()): string | null {
	const [body, signature, ...extra] = token.split(".");
	if (!(body && signature) || extra.length > 0) return null;

	const expected = mac(body, secret);
	const given = Buffer.from(signature, "base64url");
	if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;

	try {
		const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
		if (typeof payload?.f !== "string" || typeof payload?.exp !== "number") return null;
		return payload.exp * 1000 > nowMs ? payload.f : null;
	} catch {
		return null;
	}
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `bun test tests/lib/datasheet/token.test.ts`
Expected: PASS, 7 tests.

- [ ] **Step 5: Commit**

```bash
bun run check:fix
git add src/lib/datasheet/token.ts tests/lib/datasheet/token.test.ts
git commit -m "feat(datasheet): add signed download tokens"
```

______________________________________________________________________

### Task 2: Datasheet file lookup

**Files:**

- Create: `src/lib/datasheet/files.ts`
- Test: `tests/lib/datasheet/files.test.ts`

The CMS stores `/datasheets/<name>.pdf` in the product's `datasheet` field. That value is only a reference. The server accepts one strict format and looks the name up in the private folder, so a value can never point outside it.

- [ ] **Step 1: Write the failing test**

Create `tests/lib/datasheet/files.test.ts`:

```ts
import { afterAll, describe, expect, it, spyOn } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
	datasheetFileName,
	findDatasheetDir,
	hasDatasheet,
	resolveDatasheet,
} from "@/lib/datasheet/files";

const root = mkdtempSync(join(tmpdir(), "datasheets-"));
const dir = join(root, "private", "datasheets");
mkdirSync(dir, { recursive: true });
writeFileSync(join(dir, "hc-m.pdf"), "%PDF-1.4");

afterAll(() => rmSync(root, { recursive: true, force: true }));

describe("datasheetFileName", () => {
	it("accepts /datasheets/<name>.pdf", () => {
		expect(datasheetFileName("/datasheets/hc-m.pdf")).toBe("hc-m.pdf");
		expect(datasheetFileName("/datasheets/HC_A-2.v1.pdf")).toBe("HC_A-2.v1.pdf");
	});

	it("rejects everything else", () => {
		for (const bad of [
			null,
			undefined,
			"",
			"/assets/equipment/hc-m/datasheet.pdf",
			"/assets/image_409a1f1c.webp",
			"/datasheets/hc-m.webp",
			"/datasheets/hc-m",
			"/datasheets/../package.json",
			"/datasheets/a/b.pdf",
			"/datasheets/%2e%2e%2fsecret.pdf",
			"datasheets/hc-m.pdf",
			"https://example.com/datasheets/hc-m.pdf",
		]) {
			expect(datasheetFileName(bad)).toBeNull();
		}
	});
});

describe("findDatasheetDir", () => {
	it("walks up from a nested folder to private/datasheets", () => {
		const nested = join(root, "dist", "server", "chunks");
		mkdirSync(nested, { recursive: true });
		expect(findDatasheetDir(nested)).toBe(dir);
	});

	it("returns null when there is no such folder above", () => {
		const other = mkdtempSync(join(tmpdir(), "no-datasheets-"));
		try {
			expect(findDatasheetDir(other)).toBeNull();
		} finally {
			rmSync(other, { recursive: true, force: true });
		}
	});
});

describe("resolveDatasheet", () => {
	it("returns the absolute path of an existing PDF", () => {
		expect(resolveDatasheet("/datasheets/hc-m.pdf", dir)).toBe(join(dir, "hc-m.pdf"));
	});

	it("returns null for a missing file, an invalid reference or no folder", () => {
		expect(resolveDatasheet("/datasheets/ghost.pdf", dir)).toBeNull();
		expect(resolveDatasheet("/assets/x.pdf", dir)).toBeNull();
		expect(resolveDatasheet("/datasheets/hc-m.pdf", null)).toBeNull();
	});
});

describe("hasDatasheet", () => {
	it("is true for an existing PDF and silent", () => {
		const warn = spyOn(console, "warn").mockImplementation(() => undefined);
		expect(hasDatasheet("/datasheets/hc-m.pdf", dir)).toBe(true);
		expect(warn).not.toHaveBeenCalled();
		warn.mockRestore();
	});

	it("is false and quiet when the field is empty", () => {
		const warn = spyOn(console, "warn").mockImplementation(() => undefined);
		expect(hasDatasheet(null, dir)).toBe(false);
		expect(hasDatasheet("", dir)).toBe(false);
		expect(warn).not.toHaveBeenCalled();
		warn.mockRestore();
	});

	it("is false and warns once for a reference that cannot be served", () => {
		const warn = spyOn(console, "warn").mockImplementation(() => undefined);
		expect(hasDatasheet("/assets/old/datasheet.pdf", dir)).toBe(false);
		expect(hasDatasheet("/assets/old/datasheet.pdf", dir)).toBe(false);
		expect(warn).toHaveBeenCalledTimes(1);
		warn.mockRestore();
	});
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `bun test tests/lib/datasheet/files.test.ts`
Expected: FAIL, "Cannot find module '@/lib/datasheet/files'".

- [ ] **Step 3: Write the implementation**

Create `src/lib/datasheet/files.ts`:

```ts
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

// The only reference format the CMS writes (see the `datasheet` field in _config.template.yml).
// No slash is allowed inside the name, so a reference can never leave the private folder.
const REFERENCE = /^\/datasheets\/([A-Za-z0-9._-]+\.pdf)$/;
const warned = new Set<string>();

/** `/datasheets/hc-m.pdf` -> `hc-m.pdf`; null for anything else. */
export function datasheetFileName(ref: string | null | undefined): string | null {
	return ref ? (REFERENCE.exec(ref)?.[1] ?? null) : null;
}

/**
 * Looks for `private/datasheets` in `start` and its parents. In dev that finds the repo folder
 * (src/lib/datasheet -> frontend); in production it finds dist/private/datasheets above
 * dist/server/chunks, whatever the working directory of the server is.
 */
export function findDatasheetDir(start: string): string | null {
	let current = start;
	for (let depth = 0; depth < 8; depth++) {
		const candidate = join(current, "private", "datasheets");
		if (existsSync(candidate)) return candidate;
		const parent = dirname(current);
		if (parent === current) break;
		current = parent;
	}
	return null;
}

export function datasheetDir(): string | null {
	return (
		findDatasheetDir(dirname(fileURLToPath(import.meta.url))) ?? findDatasheetDir(process.cwd())
	);
}

/** Absolute path of the PDF the reference points at, or null when it cannot be served. */
export function resolveDatasheet(
	ref: string | null | undefined,
	dir: string | null = datasheetDir()
): string | null {
	const name = datasheetFileName(ref);
	if (!(name && dir)) return null;
	const file = join(dir, name);
	return existsSync(file) ? file : null;
}

/** Build-time check for the product page; warns once about a reference that does not resolve. */
export function hasDatasheet(
	ref: string | null | undefined,
	dir: string | null = datasheetDir()
): boolean {
	if (!ref) return false;
	if (resolveDatasheet(ref, dir)) return true;
	if (!warned.has(ref)) {
		warned.add(ref);
		console.warn(`[datasheet] ${ref} is not a PDF in private/datasheets, hiding the button`);
	}
	return false;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `bun test tests/lib/datasheet/files.test.ts`
Expected: PASS, 9 tests.

- [ ] **Step 5: Commit**

```bash
bun run check:fix
git add src/lib/datasheet/files.ts tests/lib/datasheet/files.test.ts
git commit -m "feat(datasheet): resolve datasheet files from the private folder"
```

______________________________________________________________________

### Task 3: Move the PDF and update content and CMS

**Files:**

- Move: `public/assets/equipment/hc-m/datasheet.pdf` -> `private/datasheets/hc-m.pdf`
- Modify: `datasheet:` frontmatter of 14 files under `src/content/equipment/`
- Modify: `src/pages/admin/_config.template.yml:420`

Only `hc-m` has a PDF in the repo. All other `datasheet:` values point at missing files or at `.webp` images, so they become `null`.

- [ ] **Step 1: Move the PDF**

```powershell
New-Item -ItemType Directory -Force private/datasheets | Out-Null
git mv public/assets/equipment/hc-m/datasheet.pdf private/datasheets/hc-m.pdf
```

- [ ] **Step 2: Rewrite the frontmatter**

Save as `scripts/migrate-datasheets.tmp.mjs` (deleted in Step 4):

```js
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const root = "src/content/equipment";
for (const category of readdirSync(root, { withFileTypes: true })) {
	if (!category.isDirectory()) continue;
	for (const name of readdirSync(join(root, category.name))) {
		if (!name.endsWith(".md")) continue;
		const path = join(root, category.name, name);
		const text = readFileSync(path, "utf8");
		const next = text.replace(/^datasheet: .*$/m, () =>
			/^hc-m\.(en|ua)\.md$/.test(name) ? "datasheet: /datasheets/hc-m.pdf" : "datasheet: null"
		);
		if (next !== text) {
			writeFileSync(path, next);
			console.log("updated", path);
		}
	}
}
```

Run: `bun scripts/migrate-datasheets.tmp.mjs`
Expected: 14 `updated` lines (2 for `hc-m`, 12 others) and nothing for files already holding `datasheet: null`.

- [ ] **Step 3: Verify**

Run: `git grep -n "^datasheet:" -- src/content`
Expected: both `hc-m.*.md` files show `/datasheets/hc-m.pdf`; every other file shows `null`; no `/assets/` value remains.

- [ ] **Step 4: Remove the script**

```powershell
Remove-Item scripts/migrate-datasheets.tmp.mjs
```

- [ ] **Step 5: Point the CMS field at the private folder**

In `src/pages/admin/_config.template.yml`, replace line 420:

```yaml
      - { label: "Datasheet", name: "datasheet", widget: "file", required: false, i18n: duplicate, hint: "PDF offered for download on the product page. Shared by both languages." }
```

with:

```yaml
      - label: "Datasheet"
        name: "datasheet"
        widget: "file"
        required: false
        i18n: duplicate
        # A leading slash makes Decap resolve the folder from the repo root. The PDF is committed
        # to the private folder, which the site never serves directly.
        media_folder: "/application/frontend/private/datasheets"
        public_folder: "/datasheets"
        hint: "PDF only. Name the file after the product, e.g. hc-m.pdf. Uploading a file with an existing name replaces it for every product that uses it. Visitors can download it only after filling in the form. Shared by both languages."
```

- [ ] **Step 6: Run the existing tests**

Run: `bun test`
Expected: all existing tests pass (nothing depends on the old datasheet paths).

- [ ] **Step 7: Commit**

```bash
git add private/datasheets src/content src/pages/admin/_config.template.yml
git commit -m "feat(datasheet): move datasheets to the private folder"
```

______________________________________________________________________

### Task 4: Shared lead-field validation

**Files:**

- Modify: `src/lib/contact/validate.ts:37-91`

- Test: `tests/lib/contact/validate.test.ts` (append)

- [ ] **Step 1: Write the failing test**

In `tests/lib/contact/validate.test.ts`, change the import and append a block:

```ts
import {
	type ContactFormData,
	stripHeaderChars,
	validateContactForm,
	validateLeadFields,
} from "@/lib/contact/validate";
```

```ts
describe("validateLeadFields", () => {
	const lead = {
		name: validForm.name,
		jobTitle: validForm.jobTitle,
		company: validForm.company,
		phone: validForm.phone,
		email: validForm.email,
		sector: validForm.sector,
	};

	it("accepts a valid lead without message or equipment", () => {
		expect(validateLeadFields(lead)).toEqual({});
	});

	it("reports each invalid field with the same codes as the contact form", () => {
		const errors = validateLeadFields({
			name: " ",
			jobTitle: "",
			company: "x".repeat(201),
			phone: "abc",
			email: "nope",
			sector: "Mining",
		});
		expect(errors).toEqual({
			name: "required",
			jobTitle: "required",
			company: "too_long",
			phone: "invalid_phone",
			email: "invalid_format",
			sector: "invalid_sector",
		});
	});
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `bun test tests/lib/contact/validate.test.ts`
Expected: FAIL, `validateLeadFields` is not exported.

- [ ] **Step 3: Write the implementation**

In `src/lib/contact/validate.ts`, replace the head of `validateContactForm`:

```ts
export function validateContactForm(data: ContactFormData): ValidationResult {
	const errors: Partial<Record<keyof Omit<ContactFormData, "website">, string>> = {};

	if (!data.name.trim()) {
```

with:

```ts
export type LeadFormData = Pick<
	ContactFormData,
	"name" | "jobTitle" | "company" | "phone" | "email" | "sector"
>;
export type LeadErrors = Partial<Record<keyof LeadFormData, string>>;

// The fields both the contact form and the datasheet dialog collect
export function validateLeadFields(data: LeadFormData): LeadErrors {
	const errors: LeadErrors = {};

	if (!data.name.trim()) {
```

Then replace:

```ts
		errors.sector = "invalid_sector";
	}

	if (data.equipment.length > 0) {
```

with:

```ts
		errors.sector = "invalid_sector";
	}

	return errors;
}

export function validateContactForm(data: ContactFormData): ValidationResult {
	const errors: NonNullable<ValidationResult["errors"]> = validateLeadFields(data);

	if (data.equipment.length > 0) {
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `bun test tests/lib/contact tests/pages/api/contact.test.ts`
Expected: PASS, including every pre-existing contact validation and API test.

- [ ] **Step 5: Commit**

```bash
bun run check:fix
git add src/lib/contact/validate.ts tests/lib/contact/validate.test.ts
git commit -m "refactor(contact): extract shared lead field validation"
```

______________________________________________________________________

### Task 5: Environment variable, build copy step and test mocks

**Files:**

- Modify: `astro.config.mjs`

- Modify: `tests/helpers/mocks.ts`

- Modify: `.env.example`

- Modify: `tests/config/astro-config.test.ts`

- [ ] **Step 1: Write the failing test**

Append to `tests/config/astro-config.test.ts`:

```ts
describe("astro config: gated datasheets", () => {
	it("declares DATASHEET_TOKEN_SECRET as a required server secret", () => {
		const field = config.env?.schema?.DATASHEET_TOKEN_SECRET as Record<string, unknown>;
		expect(field).toMatchObject({ context: "server", access: "secret" });
		expect(field.optional).toBeUndefined();
	});

	it("copies private/datasheets into dist after the build", () => {
		const names = (config.integrations ?? []).flat().map((i) => (i as { name?: string }).name);
		expect(names).toContain("copy-datasheets");
	});
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `bun test tests/config/astro-config.test.ts`
Expected: FAIL on the two new tests.

- [ ] **Step 3: Add the env var and the copy integration**

In `astro.config.mjs`, add imports below the existing ones:

```js
import { cpSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
```

Add above `export default defineConfig({`:

```js
// The datasheet PDFs are not part of public/, so Astro does not emit them. Copy them next to
// dist/client (not into it) so Apache never serves them; the Node server reads them from there.
/** @type {import("astro").AstroIntegration} */
const copyDatasheets = {
	name: "copy-datasheets",
	hooks: {
		"astro:build:done": ({ dir }) => {
			const from = fileURLToPath(new URL("private/datasheets", import.meta.url));
			if (!existsSync(from)) return;
			cpSync(from, fileURLToPath(new URL("../private/datasheets/", dir)), { recursive: true });
		},
	},
};
```

Add `copyDatasheets,` to the `integrations` array after `sitemap({...}),`.

Add to `env.schema`, after `RECAPTCHA_SECRET_KEY`:

```js
			// === Datasheet downloads ===

			// Signs the short-lived download links (server secret, at least 32 characters)
			DATASHEET_TOKEN_SECRET: envField.string({ context: "server", access: "secret", min: 32 }),
```

- [ ] **Step 4: Mock the variable and `getCollection` for unit tests**

In `tests/helpers/mocks.ts`, add `DATASHEET_TOKEN_SECRET` to the `astro:env/server` mock:

```ts
	CONTACT_TO: "info@ocs.test",
	DATASHEET_TOKEN_SECRET: "test-datasheet-secret-0123456789abcdef",
	RECAPTCHA_SECRET_KEY: "test-secret",
```

Replace the `astro:content` mock at the end of the file with:

```ts
// Product entries the datasheet API looks up. IDs follow Astro's slugging: "<category>/<slug><lang>".
export const equipmentEntries: {
	id: string;
	data: { title: string; datasheet?: string | null };
}[] = [
	{ id: "checkweigher/hc-men", data: { title: "HC-M", datasheet: "/datasheets/hc-m.pdf" } },
	{ id: "checkweigher/hc-mua", data: { title: "HC-M UA", datasheet: "/datasheets/hc-m.pdf" } },
	{ id: "checkweigher/nodsen", data: { title: "No datasheet", datasheet: null } },
	{ id: "checkweigher/ghosten", data: { title: "Ghost", datasheet: "/datasheets/ghost.pdf" } },
	{ id: "checkweigher/_indexen", data: { title: "Checkweighers" } },
];

// content.config.ts only needs defineCollection to hand back its config
mock.module("astro:content", () => ({
	defineCollection: (config: unknown) => config,
	getCollection: async () => equipmentEntries,
}));
```

- [ ] **Step 5: Document the variable locally**

In `.env.example`, after the line `RECAPTCHA_SECRET_KEY=your_recaptcha_secret_key_here`, insert:

```
# Signs the datasheet download links. Any random string of 32+ characters, e.g. `openssl rand -hex 32`
DATASHEET_TOKEN_SECRET=change_me_to_a_random_string_of_at_least_32_chars
```

Then sync your local file: from the repository root run `make env`, and check that `application/frontend/.env.local` now has `DATASHEET_TOKEN_SECRET`.

- [ ] **Step 6: Run the tests to verify they pass**

Run: `bun test`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
bun run check:fix
git add astro.config.mjs tests/helpers/mocks.ts tests/config/astro-config.test.ts .env.example
git commit -m "feat(datasheet): add token secret and copy datasheets into dist"
```

______________________________________________________________________

### Task 6: Download email

**Files:**

- Create: `src/lib/datasheet/templates/datasheet.txt`

- Create: `src/lib/datasheet/templates/datasheet.html`

- Create: `src/lib/datasheet/mailer.ts`

- Test: `tests/lib/datasheet/mailer.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/lib/datasheet/mailer.test.ts`:

```ts
import { beforeEach, describe, expect, it } from "bun:test";
import {
	buildDatasheetEmailBody,
	type DatasheetDownload,
	sendDatasheetEmail,
} from "@/lib/datasheet/mailer";
import { resetMailMocks, sentMails } from "../../helpers/mocks";

const lead = {
	name: "Oleksii Kovalenko",
	jobTitle: "Chief Engineer",
	company: "Farmak",
	phone: "+380501234567",
	email: "o.kovalenko@farmak.ua",
	sector: "Food Industry",
};

const download: DatasheetDownload = {
	title: "HC-M Checkweigher",
	category: "checkweigher",
	file: "hc-m.pdf",
	pageUrl: "https://ocs.test/en/catalogue/equipment/checkweigher/hc-m",
	lang: "en",
	ip: "203.0.113.5",
	at: new Date("2026-11-06T19:20:30Z"),
};

const config = {
	host: "smtp.ocs.test",
	port: 587,
	secure: false,
	to: "info@ocs.test",
	from: "noreply@ocs.test",
	siteUrl: "https://ocs.test",
};

beforeEach(resetMailMocks);

describe("buildDatasheetEmailBody", () => {
	it("lists the lead and the download in the text body", () => {
		const { text } = buildDatasheetEmailBody(lead, download, "https://ocs.test");
		for (const part of [
			"Oleksii Kovalenko",
			"Farmak",
			"o.kovalenko@farmak.ua",
			"HC-M Checkweigher",
			"checkweigher",
			"hc-m.pdf",
			"https://ocs.test/en/catalogue/equipment/checkweigher/hc-m",
			"2026-11-06 19:20:30 UTC",
			"203.0.113.5",
			"ocs.test",
		]) {
			expect(text).toContain(part);
		}
	});

	it("translates the sector into Ukrainian", () => {
		const { text } = buildDatasheetEmailBody(lead, download, "https://ocs.test");
		expect(text).not.toContain("Food Industry");
	});

	it("HTML-escapes user supplied values", () => {
		const { html } = buildDatasheetEmailBody(
			{ ...lead, company: "<script>alert(1)</script>" },
			download,
			"https://ocs.test"
		);
		expect(html).not.toContain("<script>");
		expect(html).toContain("&lt;script&gt;");
	});
});

describe("sendDatasheetEmail", () => {
	it("sends one email to the team with the visitor as reply-to", async () => {
		await sendDatasheetEmail(lead, download, config);
		expect(sentMails).toHaveLength(1);
		expect(sentMails[0]).toMatchObject({
			from: "noreply@ocs.test",
			to: "info@ocs.test",
			replyTo: "o.kovalenko@farmak.ua",
		});
		expect(sentMails[0].subject).toContain("HC-M Checkweigher");
		expect(sentMails[0].subject).toContain("Farmak");
	});

	it("strips line breaks from the subject", async () => {
		await sendDatasheetEmail({ ...lead, company: "Farmak\r\nBcc: evil@x.com" }, download, config);
		expect(String(sentMails[0].subject)).not.toMatch(/[\r\n]/);
	});
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `bun test tests/lib/datasheet/mailer.test.ts`
Expected: FAIL, "Cannot find module '@/lib/datasheet/mailer'".

- [ ] **Step 3: Create the templates**

`src/lib/datasheet/templates/datasheet.txt`:

```
Завантажено технічну специфікацію з сайту {{ site }}:

Продукт: {{ product }}
Категорія: {{ category }}
Файл: {{ file }}
Сторінка: {{ pageUrl }}
Мова сторінки: {{ lang }}
Час: {{ at }}
IP: {{ ip }}

Ім'я: {{ name }}
Посада: {{ jobTitle }}
Компанія: {{ company }}
Телефон: {{ phone }}
Email: {{ email }}
Галузь: {{ sector }}
```

`src/lib/datasheet/templates/datasheet.html`:

```html
<!doctype html>
<html lang="uk">
	<head>
		<meta charset="utf-8">
	</head>
	<body style="margin: 0; padding: 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 14px; line-height: 1.5; color: #1f2937;">
		<div style="max-width: 600px;">
			<h2 style="margin: 0 0 16px 0; font-size: 18px; color: #111827;">Завантажено технічну специфікацію з сайту {{ site }}:</h2>

			<table role="presentation" cellpadding="0" cellspacing="0" style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
				<tr>
					<td style="padding: 6px 12px 6px 0; color: #4b5563; width: 140px; vertical-align: top;">Продукт:</td>
					<td style="padding: 6px 0; font-weight: 600; color: #111827;">{{ product }}</td>
				</tr>
				<tr>
					<td style="padding: 6px 12px 6px 0; color: #4b5563; vertical-align: top;">Категорія:</td>
					<td style="padding: 6px 0; color: #111827;">{{ category }}</td>
				</tr>
				<tr>
					<td style="padding: 6px 12px 6px 0; color: #4b5563; vertical-align: top;">Файл:</td>
					<td style="padding: 6px 0; color: #111827;">{{ file }}</td>
				</tr>
				<tr>
					<td style="padding: 6px 12px 6px 0; color: #4b5563; vertical-align: top;">Сторінка:</td>
					<td style="padding: 6px 0; color: #111827;"><a href="{{ pageUrl }}" style="color: #2563eb; text-decoration: none;">{{ pageUrl }}</a></td>
				</tr>
				<tr>
					<td style="padding: 6px 12px 6px 0; color: #4b5563; vertical-align: top;">Мова сторінки:</td>
					<td style="padding: 6px 0; color: #111827;">{{ lang }}</td>
				</tr>
				<tr>
					<td style="padding: 6px 12px 6px 0; color: #4b5563; vertical-align: top;">Час:</td>
					<td style="padding: 6px 0; color: #111827;">{{ at }}</td>
				</tr>
				<tr>
					<td style="padding: 6px 12px 6px 0; color: #4b5563; vertical-align: top;">IP:</td>
					<td style="padding: 6px 0; color: #111827;">{{ ip }}</td>
				</tr>
			</table>

			<table role="presentation" cellpadding="0" cellspacing="0" style="width: 100%; border-collapse: collapse;">
				<tr>
					<td style="padding: 6px 12px 6px 0; color: #4b5563; width: 140px; vertical-align: top;">Ім'я:</td>
					<td style="padding: 6px 0; font-weight: 600; color: #111827;">{{ name }}</td>
				</tr>
				<tr>
					<td style="padding: 6px 12px 6px 0; color: #4b5563; vertical-align: top;">Посада:</td>
					<td style="padding: 6px 0; color: #111827;">{{ jobTitle }}</td>
				</tr>
				<tr>
					<td style="padding: 6px 12px 6px 0; color: #4b5563; vertical-align: top;">Компанія:</td>
					<td style="padding: 6px 0; color: #111827;">{{ company }}</td>
				</tr>
				<tr>
					<td style="padding: 6px 12px 6px 0; color: #4b5563; vertical-align: top;">Телефон:</td>
					<td style="padding: 6px 0; color: #111827;">{{ phone }}</td>
				</tr>
				<tr>
					<td style="padding: 6px 12px 6px 0; color: #4b5563; vertical-align: top;">Email:</td>
					<td style="padding: 6px 0; color: #111827;"><a href="mailto:{{ email }}" style="color: #2563eb; text-decoration: none;">{{ email }}</a></td>
				</tr>
				<tr>
					<td style="padding: 6px 12px 6px 0; color: #4b5563; vertical-align: top;">Галузь:</td>
					<td style="padding: 6px 0; color: #111827;">{{ sector }}</td>
				</tr>
			</table>
		</div>
	</body>
</html>
```

- [ ] **Step 4: Write the mailer**

Create `src/lib/datasheet/mailer.ts`:

```ts
import nodemailer from "nodemailer";
import { getInlineTranslations } from "../../i18n/inline";
import { extractSiteHost, htmlEscape, type MailerConfig } from "../contact/mailer";
import { render } from "../contact/template";
import { type LeadFormData, stripHeaderChars } from "../contact/validate";
import DATASHEET_HTML_TEMPLATE from "./templates/datasheet.html?raw";
import DATASHEET_TEXT_TEMPLATE from "./templates/datasheet.txt?raw";

// Like the contact email, this goes to the Ukrainian-speaking sales team
const t = getInlineTranslations("ua");

export interface DatasheetDownload {
	title: string;
	category: string;
	file: string;
	pageUrl: string;
	lang: string;
	ip: string;
	at: Date;
}

export function buildDatasheetEmailBody(
	lead: LeadFormData,
	download: DatasheetDownload,
	siteUrl: string
): { text: string; html: string } {
	const vars = {
		site: extractSiteHost(siteUrl),
		product: download.title,
		category: download.category,
		file: download.file,
		pageUrl: download.pageUrl,
		lang: download.lang,
		at: `${download.at.toISOString().slice(0, 19).replace("T", " ")} UTC`,
		ip: download.ip,
		name: lead.name,
		jobTitle: lead.jobTitle,
		company: lead.company,
		phone: lead.phone,
		email: lead.email,
		sector: t(lead.sector),
	};

	return {
		text: render(DATASHEET_TEXT_TEMPLATE, vars),
		html: render(DATASHEET_HTML_TEMPLATE, vars, htmlEscape),
	};
}

export async function sendDatasheetEmail(
	lead: LeadFormData,
	download: DatasheetDownload,
	config: MailerConfig
): Promise<void> {
	const transport = nodemailer.createTransport({
		host: config.host,
		port: config.port,
		secure: config.secure,
		...(config.user && config.pass ? { auth: { user: config.user, pass: config.pass } } : {}),
	});

	const { text, html } = buildDatasheetEmailBody(lead, download, config.siteUrl);

	await transport.sendMail({
		from: config.from,
		to: config.to,
		replyTo: stripHeaderChars(lead.email),
		subject: stripHeaderChars(`Завантаження специфікації: ${download.title} — ${lead.company}`),
		text,
		html,
	});
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `bun test tests/lib/datasheet/mailer.test.ts`
Expected: PASS, 5 tests.

- [ ] **Step 6: Commit**

```bash
bun run check:fix
git add src/lib/datasheet/mailer.ts src/lib/datasheet/templates tests/lib/datasheet/mailer.test.ts
git commit -m "feat(datasheet): add download notification email"
```

______________________________________________________________________

### Task 7: `POST /api/datasheet-request`

**Files:**

- Create: `src/pages/api/datasheet-request.ts`
- Test: `tests/pages/api/datasheet-request.test.ts`

The route test reads the real `private/datasheets/hc-m.pdf` (moved in Task 3), so no file mocking is needed.

- [ ] **Step 1: Write the failing test**

Create `tests/pages/api/datasheet-request.test.ts`:

```ts
import { afterAll, beforeEach, describe, expect, it, spyOn } from "bun:test";
import { verifyToken } from "@/lib/datasheet/token";
import { POST } from "@/pages/api/datasheet-request";
import { mailState, resetMailMocks, sentMails } from "../../helpers/mocks";

const ORIGIN = "http://localhost:4321";
const SECRET = "test-datasheet-secret-0123456789abcdef";
const realFetch = globalThis.fetch;

let captcha: Record<string, unknown> | "throw" = {
	success: true,
	action: "datasheet",
	score: 0.9,
};
let ipCounter = 0;

const validBody = () => ({
	name: "Oleksii Kovalenko",
	jobTitle: "Chief Engineer",
	company: "Farmak",
	phone: "+380501234567",
	email: "o.kovalenko@farmak.ua",
	sector: "Food Industry",
	website: "",
	recaptchaToken: "token",
	loadedAt: Date.now() - 5000,
	category: "checkweigher",
	slug: "hc-m",
	lang: "en",
});

interface CallOptions {
	origin?: string | null;
	body?: unknown;
	rawBody?: string;
	headers?: Record<string, string>;
	ip?: string;
}

// Each call gets a fresh IP unless one is given, so the in-memory rate limiter never interferes
async function call({ origin = ORIGIN, body, rawBody, headers = {}, ip }: CallOptions = {}) {
	const request = new Request(`${ORIGIN}/api/datasheet-request`, {
		method: "POST",
		headers: { "content-type": "application/json", ...(origin ? { origin } : {}), ...headers },
		body: rawBody ?? JSON.stringify(body ?? validBody()),
	});
	const response = await POST({ request, clientAddress: ip ?? `10.1.0.${++ipCounter}` } as any);
	return { status: response.status, json: (await response.json()) as Record<string, any> };
}

beforeEach(() => {
	resetMailMocks();
	captcha = { success: true, action: "datasheet", score: 0.9 };
	globalThis.fetch = (async () => {
		if (captcha === "throw") throw new Error("network");
		return new Response(JSON.stringify(captcha));
	}) as unknown as typeof fetch;
});

afterAll(() => {
	globalThis.fetch = realFetch;
});

describe("POST /api/datasheet-request: request checks", () => {
	it("rejects a missing or foreign Origin", async () => {
		expect((await call({ origin: null })).status).toBe(403);
		expect((await call({ origin: "https://evil.example" })).status).toBe(403);
	});

	it("accepts the public SITE_URL origin", async () => {
		expect((await call({ origin: "https://ocs.test" })).status).toBe(200);
	});

	it("rejects an oversized body, invalid JSON and wrong field types", async () => {
		expect((await call({ headers: { "content-length": "99999" } })).status).toBe(413);
		expect((await call({ rawBody: "{nope" })).json.error).toBe("invalid_json");
		const wrong = await call({ body: { ...validBody(), slug: 5 } });
		expect(wrong.status).toBe(400);
		expect(wrong.json.error).toBe("invalid_payload");
	});
});

describe("POST /api/datasheet-request: anti-abuse", () => {
	it("fakes success without a link or an email for a filled honeypot", async () => {
		const res = await call({ body: { ...validBody(), website: "http://spam.example" } });
		expect(res.status).toBe(200);
		expect(res.json).toEqual({ ok: true });
		expect(sentMails).toHaveLength(0);
	});

	it("fakes success for a submission faster than 3 seconds", async () => {
		const res = await call({ body: { ...validBody(), loadedAt: Date.now() - 500 } });
		expect(res.json).toEqual({ ok: true });
		expect(sentMails).toHaveLength(0);
	});

	it("fakes success for disposable email addresses", async () => {
		const res = await call({ body: { ...validBody(), email: "bot@mailinator.com" } });
		expect(res.json).toEqual({ ok: true });
		expect(sentMails).toHaveLength(0);
	});

	it("rate limits the sixth request from the same IP", async () => {
		const ip = "203.0.113.50";
		for (let i = 0; i < 5; i++) expect((await call({ ip })).status).toBe(200);
		const res = await call({ ip });
		expect(res.status).toBe(429);
		expect(res.json.error).toBe("rate_limited");
	});

	it("requires a reCAPTCHA token", async () => {
		const res = await call({ body: { ...validBody(), recaptchaToken: "" } });
		expect(res.status).toBe(400);
		expect(res.json.error).toBe("recaptcha_missing");
	});

	it("rejects a token issued for the contact form action", async () => {
		captcha = { success: true, action: "contact", score: 0.9 };
		expect((await call()).json.error).toBe("recaptcha_failed");
	});

	it("rejects a low score and a failed verification", async () => {
		captcha = { success: true, action: "datasheet", score: 0.1 };
		expect((await call()).json.error).toBe("recaptcha_failed");
		captcha = { success: false };
		expect((await call()).json.error).toBe("recaptcha_failed");
	});

	it("returns 502 when Google is unreachable", async () => {
		captcha = "throw";
		const res = await call();
		expect(res.status).toBe(502);
		expect(res.json.error).toBe("recaptcha_unavailable");
	});
});

describe("POST /api/datasheet-request: validation and product lookup", () => {
	it("returns 422 with per-field codes", async () => {
		const res = await call({ body: { ...validBody(), email: "bad", name: " " } });
		expect(res.status).toBe(422);
		expect(res.json.error).toBe("validation_failed");
		expect(res.json.fields).toEqual({ name: "required", email: "invalid_format" });
		expect(sentMails).toHaveLength(0);
	});

	it("returns 404 for an unknown product, language or category", async () => {
		for (const patch of [{ slug: "nope" }, { lang: "de" }, { category: "catchweigher" }]) {
			const res = await call({ body: { ...validBody(), ...patch } });
			expect(res.status).toBe(404);
			expect(res.json.error).toBe("not_found");
		}
		expect(sentMails).toHaveLength(0);
	});

	it("returns 404 for a category index entry", async () => {
		const res = await call({ body: { ...validBody(), slug: "_index" } });
		expect(res.status).toBe(404);
	});

	it("returns 404 for a product without a datasheet", async () => {
		const res = await call({ body: { ...validBody(), slug: "nods" } });
		expect(res.status).toBe(404);
	});

	it("returns 404 when the referenced PDF is missing on disk", async () => {
		const res = await call({ body: { ...validBody(), slug: "ghost" } });
		expect(res.status).toBe(404);
		expect(sentMails).toHaveLength(0);
	});
});

describe("POST /api/datasheet-request: sending", () => {
	it("returns 502 and no link when the SMTP server fails", async () => {
		mailState.fail = true;
		const consoleError = spyOn(console, "error").mockImplementation(() => undefined);
		try {
			const res = await call();
			expect(res.status).toBe(502);
			expect(res.json.error).toBe("smtp_error");
			expect(res.json.url).toBeUndefined();
			expect(consoleError).toHaveBeenCalledTimes(1);
		} finally {
			consoleError.mockRestore();
		}
	});

	it("emails the team and returns a link that verifies for the product file", async () => {
		const res = await call();
		expect(res.status).toBe(200);
		expect(res.json.ok).toBe(true);

		const url = new URL(res.json.url, ORIGIN);
		expect(url.pathname).toBe("/api/datasheet");
		expect(verifyToken(url.searchParams.get("token") ?? "", SECRET)).toBe("hc-m.pdf");

		expect(sentMails).toHaveLength(1);
		expect(sentMails[0]).toMatchObject({
			from: "noreply@ocs.test",
			to: "info@ocs.test",
			replyTo: "o.kovalenko@farmak.ua",
		});
		expect(String(sentMails[0].text)).toContain("https://ocs.test/en/catalogue/equipment/checkweigher/hc-m");
		expect(String(sentMails[0].text)).toContain("hc-m.pdf");
	});

	it("serves the Ukrainian entry of the same product", async () => {
		const res = await call({ body: { ...validBody(), lang: "ua" } });
		expect(res.status).toBe(200);
		expect(String(sentMails[0].text)).toContain("HC-M UA");
	});
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `bun test tests/pages/api/datasheet-request.test.ts`
Expected: FAIL, "Cannot find module '@/pages/api/datasheet-request'".

- [ ] **Step 3: Write the route**

Create `src/pages/api/datasheet-request.ts`:

```ts
import { getCollection } from "astro:content";
import {
	CONTACT_FROM,
	CONTACT_TO,
	DATASHEET_TOKEN_SECRET,
	RECAPTCHA_SECRET_KEY,
	SITE_URL,
	SMTP_HOST,
	SMTP_PASS,
	SMTP_PORT,
	SMTP_SECURE,
	SMTP_USER,
} from "astro:env/server";
import type { APIRoute } from "astro";
import { productUrl } from "@/lib/catalogue-urls";
import { createRateLimiter } from "@/lib/contact/rateLimit";
import { getClientIp, isSpamSubmission } from "@/lib/contact/spam";
import { type LeadFormData, validateLeadFields } from "@/lib/contact/validate";
import { getCategory, getLocale, getSlug, isProduct } from "@/lib/content-utils";
import { datasheetFileName, resolveDatasheet } from "@/lib/datasheet/files";
import { sendDatasheetEmail } from "@/lib/datasheet/mailer";
import { signToken } from "@/lib/datasheet/token";

export const prerender = false;

// Own limiter, separate from the contact form: 5 requests per IP per 10 minutes.
// Scale-out note: replace with Redis if multiple Node processes are used.
const rateLimiter = createRateLimiter({ max: 5, windowMs: 10 * 60 * 1000 });

const BODY_LIMIT = 32_768; // 32 KB

const STRING_FIELDS = [
	"name",
	"jobTitle",
	"company",
	"phone",
	"email",
	"sector",
	"website",
	"recaptchaToken",
	"category",
	"slug",
	"lang",
] as const;

const json = (body: unknown, status = 200) =>
	new Response(JSON.stringify(body), {
		status,
		headers: { "Content-Type": "application/json" },
	});

type DatasheetPayload = LeadFormData & {
	website: string;
	recaptchaToken: string;
	category: string;
	slug: string;
	lang: string;
	loadedAt?: number | string;
};

function isDatasheetPayload(value: unknown): value is DatasheetPayload {
	if (typeof value !== "object" || value === null) return false;
	const record = value as Record<string, unknown>;
	return STRING_FIELDS.every((key) => typeof record[key] === "string");
}

export const POST: APIRoute = async ({ request, clientAddress }) => {
	// 1. Origin check. Behind a reverse proxy the request URL is the internal http:// one,
	// so also accept the public SITE_URL origin.
	const reqOrigin = request.headers.get("origin");
	const allowedOrigins = [new URL(request.url).origin, new URL(SITE_URL).origin];
	if (!(reqOrigin && allowedOrigins.includes(reqOrigin))) {
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
	if (!isDatasheetPayload(body)) {
		return json({ ok: false, error: "invalid_payload" }, 400);
	}
	const data = body;

	// 3. Anti-spam checks. Bots get a bare success: no link, no email.
	if (isSpamSubmission({ ...data, equipment: [], message: "" })) {
		return json({ ok: true });
	}

	// 4. Rate limit (uses X-Forwarded-For client IP when behind reverse proxy)
	const ip = getClientIp(request, clientAddress);
	if (!rateLimiter.check(ip)) {
		return json({ ok: false, error: "rate_limited" }, 429);
	}

	// 5. reCAPTCHA v3
	if (!data.recaptchaToken) {
		return json({ ok: false, error: "recaptcha_missing" }, 400);
	}
	try {
		const captchaRes = await fetch("https://www.google.com/recaptcha/api/siteverify", {
			method: "POST",
			headers: { "Content-Type": "application/x-www-form-urlencoded" },
			body: new URLSearchParams({
				secret: RECAPTCHA_SECRET_KEY,
				response: data.recaptchaToken,
			}),
		});
		const captchaJson = (await captchaRes.json()) as {
			success: boolean;
			action?: string;
			score?: number;
		};
		if (
			!captchaJson.success ||
			captchaJson.action !== "datasheet" ||
			(captchaJson.score ?? 0) < 0.5
		) {
			return json({ ok: false, error: "recaptcha_failed" }, 400);
		}
	} catch {
		return json({ ok: false, error: "recaptcha_unavailable" }, 502);
	}

	// 6. Validate the lead fields
	const errors = validateLeadFields(data);
	if (Object.keys(errors).length > 0) {
		return json({ ok: false, error: "validation_failed", fields: errors }, 422);
	}

	// 7. Look the product up on the server: the client never sends a file path
	if (data.lang !== "en" && data.lang !== "ua") {
		return json({ ok: false, error: "not_found" }, 404);
	}
	const entries = await getCollection("equipment");
	const product = entries.find(
		(entry) =>
			isProduct(entry) &&
			getLocale(entry) === data.lang &&
			getCategory(entry) === data.category &&
			getSlug(entry) === data.slug
	);
	const file = datasheetFileName(product?.data.datasheet);
	if (!(product && file && resolveDatasheet(product.data.datasheet))) {
		return json({ ok: false, error: "not_found" }, 404);
	}

	// 8. Tell the team. No email, no download.
	try {
		await sendDatasheetEmail(
			data,
			{
				title: product.data.title,
				category: data.category,
				file,
				pageUrl: new URL(productUrl(data.lang, data.category, data.slug), SITE_URL).href,
				lang: data.lang,
				ip,
				at: new Date(),
			},
			{
				host: SMTP_HOST,
				port: SMTP_PORT,
				secure: SMTP_SECURE,
				user: SMTP_USER,
				pass: SMTP_PASS,
				to: CONTACT_TO,
				from: CONTACT_FROM,
				siteUrl: SITE_URL,
			}
		);
	} catch (err) {
		console.error("[datasheet] SMTP error:", err);
		return json({ ok: false, error: "smtp_error" }, 502);
	}

	// 9. Hand out the short-lived download link
	const token = signToken(file, DATASHEET_TOKEN_SECRET);
	return json({ ok: true, url: `/api/datasheet?token=${token}` });
};
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `bun test tests/pages/api/datasheet-request.test.ts`
Expected: PASS, all tests. If the "sixth request" test fails because earlier tests consumed that IP, the fixed IP `203.0.113.50` is unique to it, so check the limiter instance is not shared with `contact.ts`.

- [ ] **Step 5: Commit**

```bash
bun run check:fix
git add src/pages/api/datasheet-request.ts tests/pages/api/datasheet-request.test.ts
git commit -m "feat(datasheet): add lead form endpoint issuing signed links"
```

______________________________________________________________________

### Task 8: `GET /api/datasheet`

**Files:**

- Create: `src/pages/api/datasheet.ts`

- Test: `tests/pages/api/datasheet.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/pages/api/datasheet.test.ts`:

```ts
import { describe, expect, it } from "bun:test";
import { signToken, TOKEN_TTL_SECONDS } from "@/lib/datasheet/token";
import { GET } from "@/pages/api/datasheet";

const SECRET = "test-datasheet-secret-0123456789abcdef";

async function get(token?: string) {
	const url = `http://localhost:4321/api/datasheet${token === undefined ? "" : `?token=${token}`}`;
	return GET({ request: new Request(url) } as any);
}

describe("GET /api/datasheet", () => {
	it("serves the PDF as an attachment for a valid token", async () => {
		const res = await get(signToken("hc-m.pdf", SECRET));
		expect(res.status).toBe(200);
		expect(res.headers.get("content-type")).toBe("application/pdf");
		expect(res.headers.get("content-disposition")).toBe('attachment; filename="hc-m.pdf"');
		expect(res.headers.get("cache-control")).toBe("private, no-store");
		const bytes = new Uint8Array(await res.arrayBuffer());
		expect(new TextDecoder().decode(bytes.slice(0, 4))).toBe("%PDF");
	});

	it("rejects a missing token", async () => {
		expect((await get()).status).toBe(403);
		expect((await get("")).status).toBe(403);
	});

	it("rejects a tampered token", async () => {
		const token = signToken("hc-m.pdf", SECRET);
		expect((await get(`${token}x`)).status).toBe(403);
	});

	it("rejects a token signed with another secret", async () => {
		expect((await get(signToken("hc-m.pdf", "another-secret-0123456789abcdefgh"))).status).toBe(
			403
		);
	});

	it("rejects an expired token", async () => {
		const old = Date.now() - (TOKEN_TTL_SECONDS + 60) * 1000;
		expect((await get(signToken("hc-m.pdf", SECRET, old))).status).toBe(403);
	});

	it("returns 404 when the file is gone", async () => {
		expect((await get(signToken("ghost.pdf", SECRET))).status).toBe(404);
	});

	it("never leaves the datasheet folder, even for a signed path", async () => {
		expect((await get(signToken("../package.json", SECRET))).status).toBe(404);
		expect((await get(signToken("..\\package.json", SECRET))).status).toBe(404);
	});
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `bun test tests/pages/api/datasheet.test.ts`
Expected: FAIL, "Cannot find module '@/pages/api/datasheet'".

- [ ] **Step 3: Write the route**

Create `src/pages/api/datasheet.ts`:

```ts
import { readFile } from "node:fs/promises";
import { DATASHEET_TOKEN_SECRET } from "astro:env/server";
import type { APIRoute } from "astro";
import { resolveDatasheet } from "@/lib/datasheet/files";
import { verifyToken } from "@/lib/datasheet/token";

export const prerender = false;

export const GET: APIRoute = async ({ request }) => {
	const token = new URL(request.url).searchParams.get("token") ?? "";
	const file = verifyToken(token, DATASHEET_TOKEN_SECRET);
	if (!file) return new Response("Forbidden", { status: 403 });

	// The name is re-validated, so even a signed value cannot leave the datasheet folder
	const path = resolveDatasheet(`/datasheets/${file}`);
	if (!path) return new Response("Not found", { status: 404 });

	return new Response(new Uint8Array(await readFile(path)), {
		headers: {
			"Content-Type": "application/pdf",
			"Content-Disposition": `attachment; filename="${file}"`,
			"Cache-Control": "private, no-store",
		},
	});
};
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `bun test tests/pages/api/datasheet.test.ts`
Expected: PASS, 7 tests.

- [ ] **Step 5: Commit**

```bash
bun run check:fix
git add src/pages/api/datasheet.ts tests/pages/api/datasheet.test.ts
git commit -m "feat(datasheet): serve datasheets for valid tokens only"
```

______________________________________________________________________

### Task 9: Remove the PDF URL from structured data

**Files:**

- Modify: `src/lib/structured-data/product.ts`

- Modify: `tests/lib/structured-data.test.ts`

- [ ] **Step 1: Write the failing test**

In `tests/lib/structured-data.test.ts`, inside `describe("structured-data: productSchema", ...)` add this test after the "omits empty gallery..." test (before the closing `});` at line 374):

```ts
	it("never exposes a datasheet URL, even if a caller passes one", () => {
		const leaked = productSchema({
			name: "HC-A",
			description: "Desc",
			url: "https://ocs.com.ua/en/catalogue/equipment/checkweigher/hc-a/",
			lang: "en",
			site: SITE,
			datasheetUrl: "/assets/equipment/hc-a/datasheet.pdf",
		} as never);
		expect(leaked.subjectOf).toBeUndefined();
		expect(JSON.stringify(leaked)).not.toContain("datasheet.pdf");
	});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `bun test tests/lib/structured-data.test.ts`
Expected: FAIL on the new test (`subjectOf` is currently defined).

- [ ] **Step 3: Remove `datasheetUrl` from the implementation**

In `src/lib/structured-data/product.ts`: delete the line `datasheetUrl?: string | null;` from `ProductSchemaInput`, delete `datasheetUrl,` from the destructured parameters, and delete this block:

```ts
		subjectOf: datasheetUrl
			? {
					"@type": "DigitalDocument",
					name: _("Technical Datasheet"),
					url: absUrl(datasheetUrl, site),
				}
			: undefined,
```

- [ ] **Step 4: Update the old tests**

In `tests/lib/structured-data.test.ts`:

1. Remove the line `datasheetUrl: "/assets/equipment/hc-a/datasheet.pdf",` from `productBase` (line 308).
1. In "builds a full product schema...", replace the `expect(product.subjectOf).toEqual({...});` block (lines 329-333) with `expect(product.subjectOf).toBeUndefined();`, and rename the test to `"builds a full product schema with specs, gallery, and presentation-only inquiry offer via i18n"`.
1. In "translates datasheet and offer in Ukrainian locale" rename to `"translates the offer in Ukrainian locale"`, remove the `datasheetUrl: ...` argument and delete the `expect(...subjectOf...)` line.
1. In "omits empty gallery, specs, or datasheet when not present" keep as is.
1. In the integration test "JSON.stringify produces no undefined keys for product graph" remove the `datasheetUrl: "/assets/hc-a.pdf",` line.
1. In `"_('Price on request') and _('Technical Datasheet') translate correctly"` rename to `"_('Price on request') translates correctly"`, remove both `datasheetUrl:` lines and both `subjectOf` expectations.

- [ ] **Step 5: Run the tests to verify they pass**

Run: `bun test tests/lib/structured-data.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
bun run check:fix
git add src/lib/structured-data/product.ts tests/lib/structured-data.test.ts
git commit -m "fix(seo): drop the datasheet URL from product structured data"
```

______________________________________________________________________

### Task 10: Reusable client helpers in `form-script.ts`

**Files:**

- Modify: `src/lib/contact/form-script.ts`
- Test: `tests/lib/contact/form-script.test.ts`

The dialog needs the field validation, error rendering, status box and reCAPTCHA execution of the contact form. Export them instead of copying them. Behavior of the contact form must not change.

- [ ] **Step 1: Write the failing test**

Create `tests/lib/contact/form-script.test.ts`:

```ts
import { describe, expect, it } from "bun:test";
import { EMAIL_REGEX, PHONE_REGEX } from "@/lib/contact/validate";
import { validateField } from "@/lib/contact/form-script";

const data = {
	name: "Oleksii",
	jobTitle: "Engineer",
	company: "Farmak",
	phone: "+380501234567",
	email: "o@farmak.ua",
	sector: "Food Industry",
	message: "",
};

const check = (field: string, patch: Partial<typeof data> = {}) =>
	validateField(field, { ...data, ...patch }, EMAIL_REGEX, PHONE_REGEX);

describe("validateField (shared client validation)", () => {
	it("accepts valid values", () => {
		for (const field of ["name", "jobTitle", "company", "phone", "email", "sector"]) {
			expect(check(field)).toBeNull();
		}
	});

	it("returns the same codes as the server", () => {
		expect(check("name", { name: " " })).toBe("required");
		expect(check("company", { company: "x".repeat(201) })).toBe("too_long");
		expect(check("phone", { phone: "abc" })).toBe("invalid_phone");
		expect(check("email", { email: "nope" })).toBe("invalid_format");
		expect(check("sector", { sector: "" })).toBe("required");
	});

	it("ignores unknown fields", () => {
		expect(check("website")).toBeNull();
	});
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `bun test tests/lib/contact/form-script.test.ts`
Expected: FAIL, `validateField` is not exported.

- [ ] **Step 3: Export the helpers and extract reCAPTCHA**

Edit `src/lib/contact/form-script.ts`:

1. Prefix these declarations with `export`: `function clearErrors`, `function showFieldError`, `function clearFieldError`, `function getFormData`, `function validateField`.
1. Replace `showStatus` (lines 73-88) with a version that takes the status element id:

```ts
export function showStatus(message: string, isError: boolean, statusId = "form-status") {
	const statusEl = document.getElementById(statusId);
	if (!statusEl) return;
	statusEl.textContent = message;
	statusEl.classList.remove(
		"hidden",
		"bg-destructive/10",
		"text-destructive",
		"bg-green-50",
		"text-green-800"
	);
	statusEl.classList.add(
		isError ? "bg-destructive/10" : "bg-green-50",
		isError ? "text-destructive" : "text-green-800"
	);
}
```

3. Insert before `export function initContactForm`:

```ts
let recaptchaLoaded = false;

export function loadRecaptcha(siteKey: string) {
	if (recaptchaLoaded || !siteKey) return;
	recaptchaLoaded = true;
	const script = document.createElement("script");
	script.src = `https://www.google.com/recaptcha/api.js?render=${siteKey}`;
	script.async = true;
	document.head.appendChild(script);
}

/** Loads reCAPTCHA if needed and resolves with a v3 token for `action`; rejects after 5 seconds. */
export function executeRecaptcha(siteKey: string, action: string): Promise<string> {
	loadRecaptcha(siteKey);
	return new Promise<string>((resolve, reject) => {
		const started = Date.now();
		const wait = () => {
			const recaptcha = window.grecaptcha;
			if (recaptcha !== undefined) {
				recaptcha.ready(() => {
					recaptcha.execute(siteKey, { action }).then(resolve, reject);
				});
			} else if (Date.now() - started > 5000) {
				reject(new Error("reCAPTCHA failed to load"));
			} else {
				setTimeout(wait, 100);
			}
		};
		wait();
	});
}
```

4. In `initContactForm`, delete the local `let recaptchaLoaded = false;` and the local `function loadRecaptcha() {...}` (lines 168-177).
1. Replace the lazy-load listener:

```ts
		form.querySelectorAll("input, select, textarea").forEach((el) => {
			el.addEventListener("focus", loadRecaptcha, { once: true });
		});
```

with:

```ts
		form.querySelectorAll("input, select, textarea").forEach((el) => {
			el.addEventListener("focus", () => loadRecaptcha(siteKey), { once: true });
		});
```

6. Replace the whole token block (lines 227-251, from `let recaptchaToken = "";` to the closing `}` of `if (siteKey) {...}`) with:

```ts
			let recaptchaToken = "";
			if (siteKey) {
				try {
					recaptchaToken = await executeRecaptcha(siteKey, "contact");
				} catch {
					showStatus(messages.recaptcha_missing, true);
					return;
				}
			}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `bun test tests/lib/contact tests/config`
Expected: PASS.

- [ ] **Step 5: Check types and lint**

Run: `bun run check:fix`
Expected: no remaining diagnostics.

- [ ] **Step 6: Commit**

```bash
git add src/lib/contact/form-script.ts tests/lib/contact/form-script.test.ts
git commit -m "refactor(contact): export shared client form helpers"
```

______________________________________________________________________

### Task 11: Dialog, button and product page

**Files:**

- Create: `src/lib/catalogue/datasheet-script.ts`

- Create: `src/components/catalogue/DatasheetModal.astro`

- Modify: `src/pages/[lang]/catalogue/equipment/[category]/[slug].astro`

- Modify: `src/styles/no-js.css`

- Modify: `tests/config/no-js.test.ts`

- Modify: `locales/ua.po` (generated, then translated)

- [ ] **Step 1: Write the failing no-JS test**

In `tests/config/no-js.test.ts` add below the `contactForm` constant:

```ts
const productPage = read("pages/[lang]/catalogue/equipment/[category]/[slug].astro");
```

and append a block after the "no-JS fallback: contact form" describe:

```ts
describe("no-JS fallback: datasheet dialog", () => {
	it("hides the dead download button and points to phone and email", () => {
		expect(rules).toMatch(/#datasheet-open\s*\{[^}]*display:\s*none/);
		expect(productPage).toContain('id="datasheet-open"');
		expect(productPage).toMatch(/<noscript>[\s\S]*tel:[\s\S]*mailto:[\s\S]*<\/noscript>/);
	});
});
```

Run: `bun test tests/config/no-js.test.ts`
Expected: FAIL.

- [ ] **Step 2: Hide the button without JS**

Append to `src/styles/no-js.css`:

```css

/* Datasheet: the button opens a script-driven dialog, a noscript notice points to phone and email */
#datasheet-open {
	display: none;
}
```

- [ ] **Step 3: Write the dialog script**

Create `src/lib/catalogue/datasheet-script.ts`:

```ts
import {
	clearErrors,
	clearFieldError,
	executeRecaptcha,
	type FormConfig,
	getFormData,
	loadRecaptcha,
	showFieldError,
	showStatus,
	validateField,
} from "../contact/form-script";

declare global {
	interface Window {
		__datasheetConfig?: FormConfig;
	}
}

const FIELDS = ["name", "jobTitle", "company", "phone", "email", "sector"] as const;
const STATUS_ID = "datasheet-status";
const CLOSE_DELAY_MS = 2500;

export function initDatasheetDialog(config: FormConfig) {
	const { siteKey, messages, emailPattern, phonePattern } = config;
	const EMAIL_RE = new RegExp(emailPattern);
	const PHONE_RE = new RegExp(phonePattern);

	const dialog = document.getElementById("datasheet-dialog") as HTMLDialogElement | null;
	const form = document.getElementById("datasheet-form") as HTMLFormElement | null;
	const opener = document.getElementById("datasheet-open");
	if (!(dialog && form && opener) || form.dataset.bound === "true") return;
	form.dataset.bound = "true";

	let openedAt = Date.now();

	opener.addEventListener("click", () => {
		openedAt = Date.now();
		clearErrors(form);
		document.getElementById(STATUS_ID)?.classList.add("hidden");
		loadRecaptcha(siteKey);
		dialog.showModal();
	});

	document.getElementById("datasheet-close")?.addEventListener("click", () => dialog.close());
	// The dialog has no padding of its own, so a click on it is a click on the backdrop
	dialog.addEventListener("click", (e) => {
		if (e.target === dialog) dialog.close();
	});

	for (const fieldId of FIELDS) {
		form.querySelector(`#${fieldId}`)?.addEventListener("blur", () => {
			const code = validateField(fieldId, getFormData(form), EMAIL_RE, PHONE_RE);
			if (code) {
				showFieldError(form, fieldId, messages[code] ?? messages.default);
			} else {
				clearFieldError(form, fieldId);
			}
		});
	}

	form.addEventListener("submit", async (e) => {
		e.preventDefault();
		clearErrors(form);

		const submitBtn = document.getElementById("datasheet-submit");
		const data = getFormData(form);
		const clientErrors: Record<string, string> = {};
		for (const field of FIELDS) {
			const code = validateField(field, data, EMAIL_RE, PHONE_RE);
			if (code) clientErrors[field] = code;
		}
		if (Object.keys(clientErrors).length > 0) {
			for (const [field, code] of Object.entries(clientErrors)) {
				showFieldError(form, field, messages[code] ?? messages.default);
			}
			showStatus(messages.validation_failed, true, STATUS_ID);
			return;
		}

		let recaptchaToken = "";
		if (siteKey) {
			try {
				recaptchaToken = await executeRecaptcha(siteKey, "datasheet");
			} catch {
				showStatus(messages.recaptcha_missing, true, STATUS_ID);
				return;
			}
		}

		submitBtn?.setAttribute("disabled", "true");
		try {
			const res = await fetch("/api/datasheet-request", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					name: data.name,
					jobTitle: data.jobTitle,
					company: data.company,
					phone: data.phone,
					email: data.email,
					sector: data.sector,
					website: (new FormData(form).get("website") as string) ?? "",
					loadedAt: openedAt,
					recaptchaToken,
					category: form.dataset.category ?? "",
					slug: form.dataset.slug ?? "",
					lang: form.dataset.lang ?? "",
				}),
			});
			const json = await res.json();

			if (json.ok && typeof json.url === "string") {
				showStatus(messages.success, false, STATUS_ID);
				form.reset();
				// The response is an attachment, so the browser downloads it and the page stays put
				window.location.assign(json.url);
				setTimeout(() => dialog.close(), CLOSE_DELAY_MS);
			} else if (json.fields) {
				for (const [field, code] of Object.entries(json.fields)) {
					showFieldError(form, field, messages[code as string] ?? messages.default);
				}
				showStatus(messages.validation_failed, true, STATUS_ID);
			} else {
				showStatus(messages[json.error] ?? messages.default, true, STATUS_ID);
			}
		} catch {
			showStatus(messages.smtp_error, true, STATUS_ID);
		} finally {
			submitBtn?.removeAttribute("disabled");
		}
	});
}
```

- [ ] **Step 4: Write the dialog component**

Create `src/components/catalogue/DatasheetModal.astro`:

```astro
---
import { RECAPTCHA_SITE_KEY } from "astro:env/client";
import FormField from "@/components/contact/FormField.astro";
import { getInlineTranslations, type Lang } from "@/i18n";
import { SECTORS } from "@/lib/contact/options";
import { EMAIL_REGEX, PHONE_REGEX } from "@/lib/contact/validate";

interface Props {
	lang: Lang;
	category: string;
	slug: string;
	title: string;
}

const { lang, category, slug, title } = Astro.props;
const _ = getInlineTranslations(lang);

// Literal _() calls so the i18n extractor picks up every sector label
const sectorLabels: Record<(typeof SECTORS)[number], string> = {
	"Food Industry": _("Food Industry"),
	Pharmaceutical: _("Pharmaceutical"),
	Cosmetics: _("Cosmetics"),
	"Logistics & Distribution": _("Logistics & Distribution"),
	Other: _("Other"),
};
const sectorOptions = SECTORS.map((sector) => ({ value: sector, label: sectorLabels[sector] }));

// Server error / validation codes -> translated display strings, consumed by the client script
const messages = {
	required: _("This field is required."),
	too_long: _("This value is too long."),
	invalid_format: _("Please enter a valid email address."),
	invalid_phone: _("Please enter a valid phone number, e.g. +380 50 123 45 67."),
	invalid_sector: _("Please select a valid sector."),
	rate_limited: _("Too many submissions. Please try again in 10 minutes."),
	recaptcha_missing: _("Security check failed. Please refresh and try again."),
	recaptcha_failed: _("Security check failed. Please refresh and try again."),
	recaptcha_unavailable: _("Could not complete security check. Please try again later."),
	smtp_error: _("Could not send your message. Please try again later or email us directly."),
	validation_failed: _("Please correct the highlighted fields and try again."),
	forbidden: _("Submission not allowed from this origin."),
	not_found: _("This datasheet is not available right now. Please contact us."),
	default: _("An unexpected error occurred. Please try again."),
	success: _("Thank you. Your download is starting."),
};
---

<dialog
	id="datasheet-dialog"
	aria-labelledby="datasheet-heading"
	class="bg-background border-border-subtle/70 text-foreground m-auto w-[min(34rem,calc(100vw-2rem))] rounded-xl border p-0 shadow-xl backdrop:bg-black/50"
>
	<div class="max-h-[90vh] overflow-y-auto p-5 sm:p-8">
		<header class="flex items-start justify-between gap-4 pb-5">
			<div class="min-w-0">
				<h2
					id="datasheet-heading"
					class="font-headline-lg text-foreground m-0 text-xl font-semibold tracking-tight wrap-break-word sm:text-2xl"
				>
					{_("Download Technical Datasheet")}
				</h2>
				<p class="font-technical-data text-secondary mt-1 mb-0 text-sm font-medium wrap-break-word">
					{title}
				</p>
				<p class="text-industrial-gray mt-2 mb-0 text-sm">
					{_("Leave your details and the download will start right away.")}
				</p>
			</div>
			<button
				type="button"
				id="datasheet-close"
				aria-label={_("Close")}
				class="text-industrial-gray hover:text-foreground focus-visible:outline-secondary shrink-0 rounded-lg p-1.5 focus-visible:outline-2"
			>
				<span class="material-symbols-outlined block" aria-hidden="true">close</span>
			</button>
		</header>

		<div
			id="datasheet-status"
			role="status"
			aria-live="polite"
			aria-atomic="true"
			class="font-technical-data text-technical-data mb-5 hidden rounded-lg p-4"
		>
		</div>

		<form
			id="datasheet-form"
			novalidate
			class="space-y-5"
			data-category={category}
			data-slug={slug}
			data-lang={lang}
		>
			{/* Honeypot: must stay hidden and empty */}
			<div class="hidden" aria-hidden="true">
				<label for="datasheet-website">Website</label>
				<input
					type="text"
					id="datasheet-website"
					name="website"
					tabindex="-1"
					autocomplete="off"
				/>
			</div>

			<div class="grid grid-cols-1 gap-5 sm:grid-cols-2">
				<FormField
					id="name"
					label={_("Full Name")}
					required
					autocomplete="name"
					placeholder={_("e.g. Oleksii Kovalenko")}
				/>
				<FormField
					id="jobTitle"
					label={_("Job Title")}
					required
					autocomplete="organization-title"
					placeholder={_("e.g. Chief Engineer")}
				/>
			</div>

			<div class="grid grid-cols-1 gap-5 sm:grid-cols-2">
				<FormField
					id="company"
					label={_("Company")}
					required
					autocomplete="organization"
					placeholder={_("e.g. Farmak PJSC")}
				/>
				<FormField
					id="phone"
					label={_("Phone")}
					type="tel"
					required
					autocomplete="tel"
					placeholder="+380 (50) 000-00-00"
				/>
			</div>

			<FormField
				id="email"
				label={_("Corporate Email")}
				type="email"
				required
				autocomplete="email"
				placeholder="engineer@company.ua"
			/>

			<FormField id="sector" label={_("Industry Sector")} type="select" required>
				<option value="" disabled selected>{_("Select sector…")}</option>
				{sectorOptions.map(({ value, label }) => <option value={value}>{label}</option>)}
			</FormField>

			<p class="text-industrial-gray text-xs">
				{_("This form is protected by reCAPTCHA.")}
				{" "}
				<a
					href="https://policies.google.com/privacy"
					target="_blank"
					rel="noopener noreferrer"
					class="hover:text-foreground underline">{_("Privacy Policy")}</a
				>
				{" "}&amp;{" "}
				<a
					href="https://policies.google.com/terms"
					target="_blank"
					rel="noopener noreferrer"
					class="hover:text-foreground underline">{_("Terms of Service")}</a
				>
			</p>

			<button
				type="submit"
				id="datasheet-submit"
				class="press group bg-primary text-primary-foreground focus-visible:outline-secondary inline-flex w-full items-center justify-center gap-2 rounded-lg px-7 py-3.5 text-[15px] leading-5.5 font-medium shadow-xs transition-[opacity,box-shadow] hover:opacity-90 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-50"
			>
				<span class="material-symbols-outlined text-[18px]" aria-hidden="true">download</span>
				{_("Download")}
			</button>
		</form>
	</div>
</dialog>

<script>
	import { initDatasheetDialog } from "@/lib/catalogue/datasheet-script";
	// Config is injected by the inline bootstrap below, which runs before this deferred module
	const cfg = window.__datasheetConfig;
	if (cfg) initDatasheetDialog(cfg);
</script>

<script
	is:inline
	define:vars={{
		siteKey: RECAPTCHA_SITE_KEY,
		messages,
		emailPattern: EMAIL_REGEX.source,
		phonePattern: PHONE_REGEX.source,
	}}
>
	window.__datasheetConfig = { siteKey, messages, emailPattern, phonePattern };
</script>
```

- [ ] **Step 5: Use it on the product page**

In `src/pages/[lang]/catalogue/equipment/[category]/[slug].astro`:

1. Add after the `CatalogueSidebar` import: `import DatasheetModal from "@/components/catalogue/DatasheetModal.astro";`
1. Replace `import { existingFile } from "@/lib/public-assets";` with `import { hasDatasheet } from "@/lib/datasheet/files";`
1. Replace lines 80-81:

```astro
// A datasheet deleted in the CMS must not leave a dead download button
const datasheet = existingFile(product.data.datasheet);
```

with:

```astro
// The PDF path is never rendered: the file is only reachable through the lead form.
// A datasheet deleted in the CMS must not leave a dead button.
const datasheetAvailable = hasDatasheet(product.data.datasheet);
```

4. Delete the line `	datasheetUrl: datasheet,` from the `productSchema({...})` call.
1. Replace the block `{ datasheet && ( <a href={datasheet} ...> ... </a> ) }` (lines 278-292) with:

```astro
								{
									datasheetAvailable && (
										<>
											<button
												id="datasheet-open"
												type="button"
												class="press border-secondary text-secondary hover:bg-secondary/5 focus-visible:outline-secondary font-technical-data inline-flex w-full items-center justify-center gap-2 rounded-lg border-2 px-7 py-3 text-[15px] leading-5.5 font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2"
											>
												<span class="material-symbols-outlined text-[18px]" aria-hidden="true">
													download
												</span>
												{_("Technical Datasheet")}
											</button>
											<noscript>
												<p class="font-technical-data text-industrial-gray m-0 text-xs">
													{_("JavaScript is required to send this form. Please call or email us instead:")}
													{" "}
													<a
														href={`tel:${companyData.phone.replace(/[^\d+]/g, "")}`}
														class="font-semibold underline"
													>
														{companyData.phone}
													</a>
													{" · "}
													<a href={`mailto:${companyData.email}`} class="font-semibold underline">
														{companyData.email}
													</a>
												</p>
											</noscript>
											<DatasheetModal
												lang={lang as Lang}
												category={category}
												slug={getSlug(product)}
												title={title}
											/>
										</>
									)
								}
```

- [ ] **Step 6: Extract and translate the new strings**

Run: `bun run i18n:extract`

Open `locales/ua.po` and fill the `msgstr` for the new entries (skip any that already have a translation):

| msgid                                                           | msgstr                                                             |
| --------------------------------------------------------------- | ------------------------------------------------------------------ |
| `Download Technical Datasheet`                                  | `Завантажити технічну специфікацію`                                |
| `Leave your details and the download will start right away.`    | `Залиште свої дані, і завантаження розпочнеться одразу.`           |
| `Download`                                                      | `Завантажити`                                                      |
| `Close`                                                         | `Закрити`                                                          |
| `Thank you. Your download is starting.`                         | `Дякуємо. Завантаження розпочинається.`                            |
| `This datasheet is not available right now. Please contact us.` | `Ця специфікація зараз недоступна. Будь ласка, зв'яжіться з нами.` |

Run: `bun run i18n`
Expected: compile succeeds; `src/i18n/ui.ts` now contains the Ukrainian strings.

- [ ] **Step 7: Run the tests**

Run: `bun test`
Expected: PASS, including `tests/config/no-js.test.ts` and `tests/i18n/*`.

- [ ] **Step 8: Commit**

```bash
bun run check:fix
git add src/lib/catalogue src/components/catalogue/DatasheetModal.astro "src/pages/[lang]/catalogue/equipment/[category]/[slug].astro" src/styles/no-js.css tests/config/no-js.test.ts locales src/i18n/ui.ts
git commit -m "feat(catalogue): gate datasheet download behind a lead form"
```

______________________________________________________________________

### Task 12: Apache proxy, CI, secrets and docs

**Files:**

- Modify: `application/infra/apache/dev.ocs.com.ua.ocs.conf`

- Modify: `.github/workflows/ci.yml`, `.github/workflows/deploy-dev.yml`, `.github/secrets.dev.yaml`

- Modify: `docs/info/environment.md`, `docs/info/deployment.md`

- Modify: `application/frontend/CLAUDE.md`, `application/frontend/Agents.md`

- [ ] **Step 1: Proxy the new routes**

Append to `application/infra/apache/dev.ocs.com.ua.ocs.conf`:

```apache
ProxyPass        /api/datasheet-request http://127.0.0.1:4321/api/datasheet-request
ProxyPassReverse /api/datasheet-request http://127.0.0.1:4321/api/datasheet-request
ProxyPass        /api/datasheet         http://127.0.0.1:4321/api/datasheet
ProxyPassReverse /api/datasheet         http://127.0.0.1:4321/api/datasheet
```

The more specific `/api/datasheet-request` rule comes first. `/api/datasheet` is a prefix match and would cover both, but the explicit pair keeps the file self-documenting.

- [ ] **Step 2: Pass the secret in CI and deploy**

`.github/workflows/ci.yml`, in `fe-e2e-test` `env:` (the build needs every required variable), after `RECAPTCHA_SECRET_KEY: ci`:

```yaml
      DATASHEET_TOKEN_SECRET: ci-datasheet-secret-0123456789abcdef
```

`.github/workflows/deploy-dev.yml`, in the `build` job `env:` after the `RECAPTCHA_SECRET_KEY` line:

```yaml
      DATASHEET_TOKEN_SECRET: ${{ secrets.DEV_DATASHEET_TOKEN_SECRET }}
```

`.github/secrets.dev.yaml`, under `secrets:` after `DEV_RECAPTCHA_SECRET_KEY: RECAPTCHA_SECRET_KEY`:

```yaml
  DEV_DATASHEET_TOKEN_SECRET: DATASHEET_TOKEN_SECRET
```

- [ ] **Step 3: Update the docs**

`docs/info/environment.md`: add a section after the "Contact form" table (before "Feature flags"):

```markdown
### Datasheet downloads

| Variable                 | Required | Default | Description                                                                         |
| ------------------------ | -------- | ------- | ----------------------------------------------------------------------------------- |
| `DATASHEET_TOKEN_SECRET` | yes      | —       | Signs the 5-minute download links, at least 32 characters, e.g. `openssl rand -hex 32` (secret) |

Datasheet PDFs live in `application/frontend/private/datasheets/`, outside `public/`. The build copies them to `dist/private/datasheets/`, beside `dist/client`, so Apache never serves them; they are only reachable through `/api/datasheet` with a valid token.
```

`docs/info/deployment.md`:

- In "Static vs on-demand" replace the list and the sentence below it with five routes: add `- /api/datasheet-request — datasheet lead form, emails the team and returns a signed link` and `- /api/datasheet — streams a datasheet PDF for a valid signed link`, and change "proxies these three paths" to "proxies these paths".
- In the GitHub secrets table add a row after `DEV_RECAPTCHA_SECRET_KEY`: `| DEV_DATASHEET_TOKEN_SECRET | Datasheet link signing key → DATASHEET_TOKEN_SECRET |`.

`application/frontend/CLAUDE.md` and `application/frontend/Agents.md`: replace the sentence

```
Only three routes run on demand (`export const prerender = false`): `src/pages/api/auth.ts`, `src/pages/api/contact.ts` and `src/pages/admin/config.yml.ts`.
```

with

```
Only five routes run on demand (`export const prerender = false`): `src/pages/api/auth.ts`, `src/pages/api/contact.ts`, `src/pages/api/datasheet-request.ts`, `src/pages/api/datasheet.ts` and `src/pages/admin/config.yml.ts`.
```

In `CLAUDE.md` "Deployment Notes" change "for the three on-demand routes" to "for the on-demand routes". Add one line to "Content and CMS" in both files: `- Product datasheet PDFs live in \`private/datasheets/\` (not \`public/\`) and are served only through \`/api/datasheet\` after the lead form.\`

- [ ] **Step 4: Run the infra tests**

Run (from `application/infra`): `uv run pytest tests/ -v`
Expected: PASS (they do not assert the fragment content or `secrets.dev.yaml` keys).

- [ ] **Step 5: Commit**

```bash
git add application/infra/apache .github docs/info application/frontend/CLAUDE.md application/frontend/Agents.md
git commit -m "chore(datasheet): proxy new routes and document the secret"
```

Reminder for the repository owner: create the GitHub repository secret `DEV_DATASHEET_TOKEN_SECRET` (a random string of 32+ characters) before this branch is merged to `main`; the deploy fails without it. Do not reuse another secret.

______________________________________________________________________

### Task 13: Full verification

- [ ] **Step 1: Unit tests**

Run: `bun test`
Expected: all pass, no new warnings.

- [ ] **Step 2: Lint and format**

Run: `bun run ci`
Expected: no diagnostics.

- [ ] **Step 3: Production build**

Run (needs `DATASHEET_TOKEN_SECRET` in `.env.local`): `bun run build`
Expected: build succeeds with no new warnings.

- [ ] **Step 4: The PDF is not served and not linked**

```powershell
Test-Path dist/private/datasheets/hc-m.pdf
Get-ChildItem dist/client -Recurse -Filter "*datasheet*"
Select-String -Path dist/client/en/catalogue/equipment/checkweigher/hc-m/index.html -Pattern "datasheet-open"
Select-String -Path dist/client/en/catalogue/equipment/checkweigher/hc-m/index.html -Pattern "\.pdf"
Select-String -Path dist/client/en/catalogue/equipment/checkweigher/hc-a/index.html -Pattern "datasheet-open"
```

Expected, in order: `True`; no files; at least one match; no match; no match (hc-a has `null`).

If `dist/private/datasheets/hc-m.pdf` is missing, the `astro:build:done` `dir` argument is not the client folder: print `dir` in the hook and adjust the relative URL in `astro.config.mjs`, then rebuild.

- [ ] **Step 5: Production bundle finds the files**

```powershell
$env:DATASHEET_TOKEN_SECRET = "local-check-secret-0123456789abcdef"
node -e "import('./dist/server/entry.mjs').then(() => console.log('bundle ok'))"
```

Expected: `bundle ok`. (The path lookup itself is covered by `findDatasheetDir` tests; Step 6 exercises it end to end.)

- [ ] **Step 6: Manual end-to-end check**

Run a local SMTP catcher (for example Mailpit on `localhost:1025`, with `SMTP_HOST=localhost`, `SMTP_PORT=1025` in `.env.local`) and `bun run dev`. Open `http://localhost:4321/en/catalogue/equipment/checkweigher/hc-m`.

Expected:

1. Clicking "Technical Datasheet" opens the dialog; Esc, the close button and a backdrop click close it.
1. Submitting empty shows the field errors in the dialog.
1. A valid submit (wait 3+ seconds after opening) downloads `hc-m.pdf` and the page stays on the product; the catcher shows one email with the product, file, page URL, language, time and IP.
1. Opening the returned `/api/datasheet?token=...` URL after 5 minutes gives 403; `/api/datasheet` without a token gives 403.
1. In the Ukrainian page (`/ua/...`) the dialog text is Ukrainian.
1. With JavaScript disabled the button is gone and the phone and email note shows.

For production-like reCAPTCHA behavior use real keys in `.env.local`; with an empty `RECAPTCHA_SITE_KEY` the server rejects the request with `recaptcha_missing`, which is expected.

- [ ] **Step 7: Manual CMS check**

Open `/admin`, edit the `hc-m` product, clear and re-upload a PDF in the Datasheet field. Confirm the editorial-workflow commit adds `application/frontend/private/datasheets/<name>.pdf` and the saved value is `/datasheets/<name>.pdf`.

- [ ] **Step 8: Final state**

Run: `git status --short`
Expected: clean working tree. If any step above needed a fix, commit it with a `fix(datasheet): ...` message and re-run Steps 1-4.

______________________________________________________________________

## Spec coverage

| Spec section                                                  | Task     |
| ------------------------------------------------------------- | -------- |
| Storage: private folder, `git mv`, build copy, runtime lookup | 2, 3, 5  |
| CMS upload, strict reference format                           | 2, 3     |
| Content migration (`hc-m`, others to `null`)                  | 3        |
| Product page button + dialog, no PDF URL                      | 11       |
| JSON-LD without `datasheetUrl`                                | 9        |
| Modal fields, honeypot, time-trap, reCAPTCHA `datasheet`      | 10, 11   |
| `POST /api/datasheet-request` pipeline and 404/502 behavior   | 7        |
| `GET /api/datasheet` token check and attachment headers       | 1, 8     |
| Email template and subject                                    | 6        |
| Shared validation split                                       | 4        |
| Env var, schema, secrets mapping, CI                          | 5, 12    |
| Apache fragment                                               | 12       |
| Documentation                                                 | 12       |
| No-JS fallback                                                | 11       |
| Tests, build checks, manual CMS check                         | 1-11, 13 |

Spec deviation, on purpose: the spec says "stream the PDF". The route reads the file into memory and returns it, which is simpler and fine for datasheet-sized PDFs. Revisit only if files grow past a few MB.
