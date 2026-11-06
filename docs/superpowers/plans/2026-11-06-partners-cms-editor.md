# Partners CMS Editor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use skills:subagent-driven-development (recommended) or skills:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let editors maintain `partners.json` and the map cities (`city-coordinates.json`) from the existing Decap CMS at `/admin`.

**Architecture:** `city-coordinates.json` is reshaped from a key-to-object map into a `{ cities: [...] }` list, because Decap cannot edit objects with dynamic keys. `geocoding.ts` builds its lookup from that list keyed by `name.en`. Two new Decap file collections (Partners, Cities) are added to `_config.template.yml`; the partner `adres` field is a `relation` widget over the Cities file.

**Tech Stack:** Astro 7, Decap CMS 3, Bun test, Biome, `yaml` (test-side template parsing).

Spec: `docs/superpowers/specs/2026-11-06-partners-cms-editor-design.md`

All paths below are relative to the repository root. Run `bun` commands from `application/frontend`.

______________________________________________________________________

## File Structure

- Modify `application/frontend/src/data/city-coordinates.json`: reshape to `{ "cities": [...] }`.
- Modify `application/frontend/src/lib/about/geocoding.ts`: build the lookup map from the list.
- Modify `application/frontend/src/pages/admin/_config.template.yml`: add the `partners` and `cities` collections.
- Modify `application/frontend/tests/data/integrity.test.ts`: data integrity and template tests.
- Modify `docs/info/development.md` and `application/frontend/CLAUDE.md`: short notes.

______________________________________________________________________

### Task 1: Reshape city data and geocoding (with integrity tests)

**Files:**

- Modify: `application/frontend/tests/data/integrity.test.ts`

- Modify: `application/frontend/src/data/city-coordinates.json`

- Modify: `application/frontend/src/lib/about/geocoding.ts`

- [ ] **Step 1: Write the failing tests**

In `application/frontend/tests/data/integrity.test.ts` add two imports. Biome sorts imports by path, so place them exactly here:

- `import cityData from "@/data/city-coordinates.json";` directly before `import companyData from "@/data/company.json";`
- `import partnersData from "@/data/partners.json";` directly after `import industries from "@/data/industries.json";`

Append at the end of the file:

```ts
describe("city coordinates data", () => {
	const cities = (cityData as any).cities as {
		name: { en: string; ua: string };
		lat: number;
		lng: number;
	}[];

	it("is a non-empty list under a cities key", () => {
		expect(Array.isArray(cities)).toBe(true);
		expect(cities.length).toBeGreaterThan(0);
	});

	it("has unique English names (partners reference a city by name.en)", () => {
		const names = cities.map((c) => c.name.en);
		expect(new Set(names).size).toBe(names.length);
	});

	it("has English and Ukrainian names for every city", () => {
		for (const c of cities) {
			expect(c.name.en.trim()).not.toBe("");
			expect(c.name.ua.trim()).not.toBe("");
		}
	});

	it("places every city inside Ukraine's bounding box", () => {
		for (const c of cities) {
			expect(c.lat).toBeGreaterThan(44);
			expect(c.lat).toBeLessThan(53);
			expect(c.lng).toBeGreaterThan(22);
			expect(c.lng).toBeLessThan(41);
		}
	});
});

describe("partners data", () => {
	const sectors = Object.entries(partnersData) as [string, any[]][];

	it("has exactly the food, household and pharma sectors", () => {
		expect(Object.keys(partnersData).sort()).toEqual(["food", "household", "pharma"]);
	});

	it("has English and Ukrainian names for every partner", () => {
		for (const [, partners] of sectors) {
			for (const p of partners) {
				expect(p.name.en.trim()).not.toBe("");
				expect(p.name.ua.trim()).not.toBe("");
			}
		}
	});

	it("only references cities that exist in city-coordinates.json", () => {
		const known = new Set(((cityData as any).cities as { name: { en: string } }[]).map((c) => c.name.en));
		const unknown = sectors.flatMap(([sector, partners]) =>
			partners.flatMap((p) =>
				((p.adres ?? []) as string[])
					.filter((city) => !known.has(city))
					.map((city) => `${sector}/${p.name.en}: ${city}`)
			)
		);
		expect(unknown).toEqual([]);
	});
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run (in `application/frontend`): `bun test tests/data/integrity.test.ts tests/lib/about`
Expected: FAIL. The "city coordinates data" tests fail with `undefined` (`cities` does not exist yet) and the partner city test fails because `(cityData as any).cities` is undefined.

- [ ] **Step 3: Reshape the JSON**

Overwrite `application/frontend/src/data/city-coordinates.json` (tabs for indentation):

```json
{
	"cities": [
		{ "name": { "en": "Kyiv", "ua": "Київ" }, "lat": 50.4501, "lng": 30.5234 },
		{ "name": { "en": "Vinnytsia", "ua": "Вінниця" }, "lat": 49.2331, "lng": 28.4682 },
		{ "name": { "en": "Sumy", "ua": "Суми" }, "lat": 50.9077, "lng": 34.7981 },
		{ "name": { "en": "Lviv", "ua": "Львів" }, "lat": 49.8397, "lng": 24.0297 },
		{ "name": { "en": "Cherkasy", "ua": "Черкаси" }, "lat": 49.4444, "lng": 32.0598 },
		{ "name": { "en": "Odesa", "ua": "Одеса" }, "lat": 46.4825, "lng": 30.7233 },
		{ "name": { "en": "Zhytomyr", "ua": "Житомир" }, "lat": 50.2547, "lng": 28.6587 },
		{ "name": { "en": "Dnipro", "ua": "Дніпро" }, "lat": 48.4647, "lng": 35.0462 },
		{ "name": { "en": "Kharkiv", "ua": "Харків" }, "lat": 49.9935, "lng": 36.2304 },
		{ "name": { "en": "Poltava", "ua": "Полтава" }, "lat": 49.5883, "lng": 34.5514 },
		{ "name": { "en": "Rivne", "ua": "Рівне" }, "lat": 50.6199, "lng": 26.2516 },
		{ "name": { "en": "Kryvyi Rih", "ua": "Кривий Ріг" }, "lat": 47.9105, "lng": 33.3918 },
		{ "name": { "en": "Zakarpattia", "ua": "Закарпаття" }, "lat": 48.4439, "lng": 22.7178 }
	]
}
```

- [ ] **Step 4: Update `geocoding.ts`**

Replace lines 1-6 of `application/frontend/src/lib/about/geocoding.ts`:

```ts
import cityCoordinatesData from "@/data/city-coordinates.json";
import type { CityCoordinate } from "./types";

const coordinatesCache: Record<string, CityCoordinate> = Object.fromEntries(
	(cityCoordinatesData.cities as CityCoordinate[]).map((city) => [city.name.en, city])
);
```

The rest of the file is unchanged.

- [ ] **Step 5: Run the tests to verify they pass**

Run: `bun test tests/data/integrity.test.ts tests/lib/about tests/pages/about.test.ts`
Expected: PASS (including the unchanged `geocoding.test.ts` and `partners-data.test.ts`).

- [ ] **Step 6: Lint and commit**

Run: `bun run check:fix` then `bun run check`
Expected: no errors. If `check:fix` reformatted the new test (long `known` line), keep its output.

```bash
git add application/frontend/src/data/city-coordinates.json application/frontend/src/lib/about/geocoding.ts application/frontend/tests/data/integrity.test.ts
git commit -m "refactor(about): store map cities as an editable list"
```

If a pre-commit hook modifies files and fails the commit, re-stage and commit again.

______________________________________________________________________

### Task 2: Decap collections for partners and cities

**Files:**

- Modify: `application/frontend/tests/data/integrity.test.ts`

- Modify: `application/frontend/src/pages/admin/_config.template.yml` (insert after the "Company" collection, before the "Equipment Categories & Industries" comment, around line 171)

- [ ] **Step 1: Write the failing test**

Append to `application/frontend/tests/data/integrity.test.ts`:

```ts
describe("decap cms partners and cities collections", () => {
	const templatePath = join(import.meta.dir, "../../src/pages/admin/_config.template.yml");
	const parsed = parse(readFileSync(templatePath, "utf8").replace(/__[A-Z0-9_]+__/g, '""'));
	const partners = parsed.collections?.find((c: any) => c.name === "partners");
	const cities = parsed.collections?.find((c: any) => c.name === "cities");

	it("edits partners.json with one list per sector", () => {
		expect(partners).toBeDefined();
		const file = partners.files[0];
		expect(file.file).toBe("application/frontend/src/data/partners.json");
		expect(file.format).toBe("json");
		expect(file.fields.map((f: any) => f.name)).toEqual(["food", "household", "pharma"]);
	});

	it("gives every sector the same partner fields", () => {
		const [food, household, pharma] = partners.files[0].fields;
		expect(food.fields.map((f: any) => f.name)).toEqual([
			"name",
			"website",
			"logo",
			"equipment",
			"adres",
		]);
		expect(household.fields).toEqual(food.fields);
		expect(pharma.fields).toEqual(food.fields);
	});

	it("picks partner cities from the cities file through a relation", () => {
		const adres = partners.files[0].fields[0].fields.find((f: any) => f.name === "adres");
		expect(adres.widget).toBe("relation");
		expect(adres.multiple).toBe(true);
		expect(adres.collection).toBe("cities");
		expect(adres.file).toBe(cities.files[0].name);
		expect(adres.value_field).toBe("cities.*.name.en");
	});

	it("edits city-coordinates.json as a list of cities", () => {
		expect(cities).toBeDefined();
		const file = cities.files[0];
		expect(file.file).toBe("application/frontend/src/data/city-coordinates.json");
		expect(file.format).toBe("json");
		expect(file.fields[0].name).toBe("cities");
		const names = file.fields[0].fields.map((f: any) => f.name);
		expect(names).toEqual(["name", "lat", "lng"]);
	});

	it("keeps partner logos under public/assets/partners", () => {
		const file = partners.files[0];
		expect(file.media_folder).toBe("../../public/assets/partners");
		expect(file.public_folder).toBe("/assets/partners");
	});

	it("never allows deleting the data files", () => {
		expect(partners.delete).toBe(false);
		expect(cities.delete).toBe(false);
	});
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `bun test tests/data/integrity.test.ts -t "partners and cities"`
Expected: FAIL (`partners` is undefined, so `partners.files` throws `TypeError`).

- [ ] **Step 3: Add the collections to the template**

Insert this block in `application/frontend/src/pages/admin/_config.template.yml` right after the Company collection (after the `sameAs` field, before the `# ── Equipment Categories & Industries` comment). Keep one blank line before and after:

```yaml
  # ── Partners ──────────────────────────────────────────────────────────────
  # The three sector lists share one field set through a YAML anchor. Cities are
  # picked from the "Cities" collection below, so the name there must match.
  - name: "partners"
    label: "Partners"
    delete: false
    editor:
      preview: false
    files:
      - name: "partner-list"
        label: "Partners and Clients"
        file: "application/frontend/src/data/partners.json"
        format: json
        media_folder: "../../public/assets/partners"
        public_folder: "/assets/partners"
        fields:
          - label: "Food & Beverage"
            name: "food"
            widget: "list"
            summary: "{{fields.name.en}}"
            fields: &partner_fields
              - label: "Name"
                name: "name"
                widget: "object"
                fields:
                  - { label: "English", name: "en", widget: "string" }
                  - { label: "Ukrainian", name: "ua", widget: "string" }
              - { label: "Website", name: "website", widget: "string", required: false, pattern: ['^https?://\S+$', "Must start with http:// or https://"], hint: "e.g. https://roshen.com" }
              - { label: "Logo", name: "logo", widget: "image", required: false, hint: "Shown in the homepage carousel and the client directory. Without a website or logo the partner is not in the carousel." }
              - label: "Equipment"
                name: "equipment"
                widget: "object"
                required: false
                hint: "Number of installed systems. Counts feed the totals on the home and About pages."
                fields:
                  - { label: "Metal detectors (MD)", name: "md", widget: "number", value_type: "int", min: 0, default: 0 }
                  - { label: "Checkweighers (CW)", name: "cw", widget: "number", value_type: "int", min: 0, default: 0 }
                  - { label: "Track & Trace (TQS)", name: "tqs", widget: "number", value_type: "int", min: 0, default: 0 }
              - label: "Cities"
                name: "adres"
                widget: "relation"
                collection: "cities"
                file: "city-list"
                search_fields: ["cities.*.name.en"]
                value_field: "cities.*.name.en"
                display_fields: ["cities.*.name.en"]
                multiple: true
                required: false
                hint: "Where the equipment is installed. Add a missing city in Cities first."
          - label: "Chemicals & Packaging"
            name: "household"
            widget: "list"
            summary: "{{fields.name.en}}"
            fields: *partner_fields
          - label: "Pharmaceuticals"
            name: "pharma"
            widget: "list"
            summary: "{{fields.name.en}}"
            fields: *partner_fields

  # ── Cities (map pins) ─────────────────────────────────────────────────────
  - name: "cities"
    label: "Cities"
    delete: false
    editor:
      preview: false
    files:
      - name: "city-list"
        label: "Map Cities"
        file: "application/frontend/src/data/city-coordinates.json"
        format: json
        fields:
          - label: "Cities"
            name: "cities"
            widget: "list"
            summary: "{{fields.name.en}}"
            hint: "A partner city is shown on the map only if it is listed here."
            fields:
              - label: "Name"
                name: "name"
                widget: "object"
                fields:
                  - { label: "English", name: "en", widget: "string", hint: "Partners reference the city by this name. Renaming it needs the partners updated too." }
                  - { label: "Ukrainian", name: "ua", widget: "string" }
              - { label: "Latitude", name: "lat", widget: "number", value_type: "float" }
              - { label: "Longitude", name: "lng", widget: "number", value_type: "float" }
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `bun test tests/data/integrity.test.ts`
Expected: PASS, including the older `decap cms ...` tests (the template still parses).

- [ ] **Step 5: Verify the rendered config**

Run in `application/frontend`:

```bash
bun -e "import {parse} from 'yaml'; import {readFileSync} from 'node:fs'; const c=parse(readFileSync('src/pages/admin/_config.template.yml','utf8').replace(/__[A-Z0-9_]+__/g,'\"\"')); console.log(c.collections.map(x=>x.name).join(', '))"
```

Expected: `documents, company, partners, cities, equipment-categories, equipment, wiki`.

- [ ] **Step 6: Manual check of the relation widget in the CMS**

Run `bun run dev`, open `http://localhost:4321/admin` (needs `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` in `.env.local`, see `docs/info/environment.md`). Check:

1. Partners > Partners and Clients: the three lists show all existing partners with their names; `Roshen` shows `Kyiv` and `Vinnytsia` in Cities.
1. The Cities field offers all 13 cities and lets you pick several.
1. Cities > Map Cities lists 13 cities with lat/lng.

If the relation picker shows no options, apply the fallback from the spec: add `CITY_OPTIONS: cities.map(...)` to `tokens` in `application/frontend/src/pages/admin/config.yml.ts` (read the list from `@/data/city-coordinates.json`), change the `adres` field to `widget: "select"`, `multiple: true`, `options: __CITY_OPTIONS__`, and adjust the "picks partner cities" test accordingly. Report this deviation to the user before doing so.

If the CMS cannot be run (no OAuth credentials), say so in the final report instead of claiming the widget works.

- [ ] **Step 7: Lint and commit**

Run: `bun run check:fix` then `bun run check`
Expected: no errors.

```bash
git add application/frontend/src/pages/admin/_config.template.yml application/frontend/tests/data/integrity.test.ts
git commit -m "feat(cms): add partners and cities collections"
```

______________________________________________________________________

### Task 3: Docs and full verification

**Files:**

- Modify: `docs/info/development.md` (section "Content and CMS", after the bullet about the generated Decap config, line ~75)

- Modify: `application/frontend/CLAUDE.md` (line 119, structured data bullet)

- [ ] **Step 1: Update `docs/info/development.md`**

Insert after the bullet "The Decap config is generated by ...":

```md
- Partners and clients (`src/data/partners.json`) and the map cities they refer to (`src/data/city-coordinates.json`) are edited under **Partners** and **Cities** in the CMS. A partner city appears on the About map only if it is listed under Cities, so add the city there first. A city's English name is its identifier: renaming it means updating the partners that use it.
```

- [ ] **Step 2: Update `application/frontend/CLAUDE.md`**

Change the line `- Structured data lives in \`src/data/\*.json\` (...)\` by appending a sentence on the next line:

```md
- `src/data/city-coordinates.json` is `{ cities: [{ name: { en, ua }, lat, lng }] }`; partners reference a city by `name.en` in `adres`. Both `partners.json` and this file are edited in the CMS (Partners, Cities).
```

- [ ] **Step 3: Run full verification**

Run in `application/frontend`:

```bash
bun test
bun run check
bun run build
```

Expected: all tests pass, no Biome errors, build succeeds with no `[about] No coordinates` warnings.

- [ ] **Step 4: Commit**

```bash
git add docs/info/development.md application/frontend/CLAUDE.md
git commit -m "docs(cms): document the partners and cities editors"
```
