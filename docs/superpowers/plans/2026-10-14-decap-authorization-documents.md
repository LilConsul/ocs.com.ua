# Authorization Documents Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use skills:subagent-driven-development (recommended) or skills:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable managing Wipotec and Mesutronic authorization letter PDFs via Decap CMS and dynamically link to them from the Contact Us page's Documents card.

**Architecture:** A single JSON data file `src/data/documents.json` holds the relative public paths to the authorization PDFs. Decap CMS manages this file via a `documents` file collection in `_config.template.yml` and uploads files to `public/assets/documents/`. The `DocumentsCard.astro` component imports `documents.json` to provide download/view links (`target="_blank"`, `rel="noopener noreferrer"`) for both partners.

**Tech Stack:** Astro 7, Decap CMS, TypeScript, `bun test` for integrity tests, Biome for lint/formatting.

______________________________________________________________________

## File Map

### Created

| File                                                    | Responsibility                                                         |
| ------------------------------------------------------- | ---------------------------------------------------------------------- |
| `application/frontend/src/data/documents.json`          | Stores the file paths for Wipotec and Mesutronic authorization letters |
| `application/frontend/public/assets/documents/.gitkeep` | Ensures the assets destination directory exists in git                 |

### Modified

| File                                                              | Change                                                                                  |
| ----------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| `application/frontend/src/pages/admin/_config.template.yml`       | Add `documents` file collection configuring `authorization-letters` file entry          |
| `application/frontend/src/components/contact/DocumentsCard.astro` | Import `documents.json`, bind hrefs, and add target/rel attributes for active links     |
| `application/frontend/tests/data/integrity.test.ts`               | Add data integrity tests for `documents.json` schema and Decap CMS documents collection |

______________________________________________________________________

## Task 1: Create Documents Data Schema & Assets Directory

**Files:**

- Create: `application/frontend/src/data/documents.json`

- Create: `application/frontend/public/assets/documents/.gitkeep`

- Modify: `application/frontend/tests/data/integrity.test.ts`

- [ ] **Step 1: Write failing data integrity tests in `integrity.test.ts`**

Edit `application/frontend/tests/data/integrity.test.ts` to add tests for `documents.json`:

```typescript
import documentsData from "@/data/documents.json";

// ... (existing imports)

describe("authorization documents data", () => {
	it("has wipotec and mesutronic string keys", () => {
		expect(typeof documentsData.wipotec).toBe("string");
		expect(typeof documentsData.mesutronic).toBe("string");
	});

	it("points to files that exist when path is non-empty", () => {
		const publicDir = join(import.meta.dir, "../../public");
		for (const [key, path] of Object.entries(documentsData)) {
			if (path) {
				const filePath = join(publicDir, path);
				const exists = existsSync(filePath);
				expect(exists).toBe(true);
			}
		}
	});
});
```

Ensure `existsSync` is imported from `node:fs`.

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test tests/data/integrity.test.ts` (inside `application/frontend`)
Expected: FAIL due to missing `@/data/documents.json` module.

- [ ] **Step 3: Create `documents.json` and `.gitkeep`**

Create `application/frontend/src/data/documents.json`:

```json
{
  "wipotec": "",
  "mesutronic": ""
}
```

Create `application/frontend/public/assets/documents/.gitkeep` (empty file).

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test tests/data/integrity.test.ts` (inside `application/frontend`)
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add application/frontend/src/data/documents.json application/frontend/public/assets/documents/.gitkeep application/frontend/tests/data/integrity.test.ts
git commit -m "feat(data): add documents.json and assets directory"
```

______________________________________________________________________

## Task 2: Configure Decap CMS Documents Collection

**Files:**

- Modify: `application/frontend/src/pages/admin/_config.template.yml`

- Modify: `application/frontend/tests/data/integrity.test.ts`

- [ ] **Step 1: Add CMS collection integrity test to `integrity.test.ts`**

In `application/frontend/tests/data/integrity.test.ts`, add a test to verify `_config.template.yml` parses and contains the `documents` collection:

```typescript
describe("decap cms documents collection", () => {
	it("configures documents file collection in _config.template.yml", () => {
		const templatePath = join(import.meta.dir, "../../src/pages/admin/_config.template.yml");
		const raw = readFileSync(templatePath, "utf8");
		// Replace template tokens with dummy values so it parses valid YAML
		const parsed = parse(raw.replace(/__[A-Z0-9_]+__/g, '""'));
		const documentsCollection = parsed.collections?.find((c: any) => c.name === "documents");
		expect(documentsCollection).toBeDefined();
		expect(documentsCollection.label).toBe("Documents");
		expect(documentsCollection.files?.[0]?.name).toBe("authorization-letters");
		expect(documentsCollection.files?.[0]?.file).toBe("application/frontend/src/data/documents.json");
		expect(documentsCollection.files?.[0]?.media_folder).toBe("application/frontend/public/assets/documents");
		expect(documentsCollection.files?.[0]?.public_folder).toBe("/assets/documents");
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test tests/data/integrity.test.ts` (inside `application/frontend`)
Expected: FAIL because `documents` collection is not yet in `_config.template.yml`.

- [ ] **Step 3: Add `documents` collection to `_config.template.yml`**

In `application/frontend/src/pages/admin/_config.template.yml`, add the collection to `collections`:

```yaml
  # ── Authorization Documents ───────────────────────────────────────────────
  - name: "documents"
    label: "Documents"
    delete: false
    editor:
      preview: false
    files:
      - name: "authorization-letters"
        label: "Authorization Letters"
        file: "application/frontend/src/data/documents.json"
        format: json
        media_folder: "application/frontend/public/assets/documents"
        public_folder: "/assets/documents"
        fields:
          - label: "Wipotec Authorization Letter (PDF)"
            name: "wipotec"
            widget: "file"
            required: false
            hint: "Upload the official Wipotec Authorization Letter (PDF)"
          - label: "Mesutronic Authorization Letter (PDF)"
            name: "mesutronic"
            widget: "file"
            required: false
            hint: "Upload the official Mesutronic Authorization Letter (PDF)"
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test tests/data/integrity.test.ts` (inside `application/frontend`)
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add application/frontend/src/pages/admin/_config.template.yml application/frontend/tests/data/integrity.test.ts
git commit -m "feat(cms): add authorization documents collection to decap config"
```

______________________________________________________________________

## Task 3: Update `DocumentsCard.astro` Component

**Files:**

- Modify: `application/frontend/src/components/contact/DocumentsCard.astro`

- [ ] **Step 1: Update `DocumentsCard.astro` to consume `documents.json`**

Edit `application/frontend/src/components/contact/DocumentsCard.astro`:

```astro
---
import documentsData from "@/data/documents.json";
import { getInlineTranslations, type Lang } from "@/i18n";

interface Props {
	lang: Lang;
}

const { lang } = Astro.props;
const _ = getInlineTranslations(lang);

const documents = [
	{
		icon: "verified_user",
		title: _("Wipotec Authorization Letter"),
		label: _("Authorization Letter — PDF"),
		href: documentsData.wipotec || "#",
	},
	{
		icon: "verified_user",
		title: _("Mesutronic Authorization Letter"),
		label: _("Authorization Letter — PDF"),
		href: documentsData.mesutronic || "#",
	},
];
---

<section class="bg-surface-container space-y-4 rounded-xl p-8 shadow-sm">
	<h2 class="font-headline-lg text-headline-lg text-foreground font-bold">
		{_("Authorized Documentation")}
	</h2>
	<p class="font-body-md text-body-md text-industrial-gray">
		{_("Official distributorship certificates.")}
	</p>
	<ul class="space-y-3 pt-2">
		{
			documents.map((doc) => (
				<li>
					<a
						href={doc.href}
						target={doc.href !== "#" ? "_blank" : undefined}
						rel={doc.href !== "#" ? "noopener noreferrer" : undefined}
						class="group bg-background flex items-center justify-between rounded-lg p-3.5 transition-all hover:shadow-sm"
						aria-label={doc.title}
					>
						<span class="flex items-center gap-3">
							<span class="material-symbols-outlined text-secondary" aria-hidden="true">
								{doc.icon}
							</span>
							<span>
								<span class="font-technical-data text-technical-data text-foreground group-hover:text-secondary block font-semibold transition-colors">
									{doc.title}
								</span>
								<span class="font-label-caps text-label-caps text-industrial-gray uppercase">
									{doc.label}
								</span>
							</span>
						</span>
						<span
							class="material-symbols-outlined text-industrial-gray group-hover:text-foreground transition-colors"
							aria-hidden="true"
						>
							download
						</span>
					</a>
				</li>
			))
		}
	</ul>
</section>
```

- [ ] **Step 2: Run tests and typecheck**

Run: `bun test` (inside `application/frontend`)
Run: `bun run check` (inside `application/frontend`)
Run: `bun x astro check` (inside `application/frontend`)
Expected: All tests pass, no lint/type errors.

- [ ] **Step 3: Commit**

```bash
git add application/frontend/src/components/contact/DocumentsCard.astro
git commit -m "feat(contact): dynamically link authorization documents in DocumentsCard"
```

______________________________________________________________________

## Task 4: Full Suite Verification & Build Check

**Files:**

- None (verification only)

- [ ] **Step 1: Run full test suite**

Run: `bun test` (inside `application/frontend`)
Expected: All tests pass.

- [ ] **Step 2: Run Biome check and format**

Run: `bun run check` (inside `application/frontend`)
Expected: No errors or warnings.

- [ ] **Step 3: Run production build check**

Run: `bun run build` (inside `application/frontend`)
Expected: Build succeeds cleanly.
