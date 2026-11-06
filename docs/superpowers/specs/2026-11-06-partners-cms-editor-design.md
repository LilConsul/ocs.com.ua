# Partners CMS editor design

## Goal

Let editors maintain the client/partner list (`src/data/partners.json`) and the map cities
(`src/data/city-coordinates.json`) from the existing Decap CMS at `/admin`, with the same GitHub
login and editorial workflow as the rest of the site.

## Current state

- `partners.json` is `{ food: [], household: [], pharma: [] }`. Each item has `name.{en,ua}`,
  optional `website`, `logo`, `equipment.{md,cw,tqs}` and `adres` (list of city names).
- `city-coordinates.json` is a map keyed by city name: `{ "Kyiv": { lat, lng, name: {en, ua} } }`.
  `getCityCoordinates()` in `src/lib/about/geocoding.ts` is its only consumer. A partner city
  missing from this file is skipped on the map with a build warning.
- Decap file collections cannot edit objects with dynamic keys, so the cities file must become a
  list to be editable.

## Design

### 1. Cities data reshape

`city-coordinates.json` becomes:

```json
{ "cities": [{ "name": { "en": "Kyiv", "ua": "Київ" }, "lat": 50.4501, "lng": 30.5234 }] }
```

`name.en` is the identifier partners reference in `adres` (same value as the old key).
`geocoding.ts` builds its lookup map from this array, keyed by `name.en`. The public API
(`getCityCoordinates`, `resolveCityCoordinates`) does not change.

### 2. CMS collections (`_config.template.yml`)

Two new file collections, styled like "Company" (`delete: false`, `editor.preview: false`,
`format: json`, no i18n structure because the JSON already holds both languages inline):

- **Partners** (`partners.json`), one file entry with three list fields: `food` ("Food &
  Beverage"), `household` ("Chemicals & Packaging"), `pharma` ("Pharmaceuticals"). Each list
  shares one field set through a YAML anchor:
  - `name` object: `en`, `ua` (both required)
  - `website` string with a URL pattern (optional)
  - `logo` image (optional), stored in `public/assets/partners`, WebP processing like other images
  - `equipment` object: `md`, `cw`, `tqs` integers, min 0 (optional, hints name each type)
  - `adres` list of cities, `relation` widget pointing at the Cities file, `value_field: cities.*.name.en`, `search_fields`/`display_fields` on the English name, `multiple: true`
  - list `summary`: `{{fields.name.en}}`
- **Cities** (`city-coordinates.json`), one file entry with a `cities` list: `name` object
  (`en`, `ua`), `lat` and `lng` floats. The `name.en` hint states that partners reference the
  city by this name, so renaming a city requires updating its partners.

A city added in the CMS is available in the partner picker without a rebuild.

### 3. Out of scope

- Adding or removing sectors: pages hard-code the three categories, so this is a code change.
- Renaming the `adres` key.
- Reformatting: Decap rewrites JSON with 2-space indentation on first save, as it does for the
  existing JSON collections.

### 4. Tests

- `geocoding.test.ts` keeps passing against the reshaped file.
- `integrity.test.ts` additions:
  - cities have unique `name.en`, non-empty `name.ua`, and `lat`/`lng` inside Ukraine's bounds
  - every `adres` entry in `partners.json` exists in the cities file
  - every partner has non-empty `name.en` and `name.ua`
  - the template defines the `partners` and `cities` file collections with the right files,
    `format: json` and the sector list names; `adres` uses `relation` on the cities file
- `bun run check` and `bun test` pass.

### 5. Docs

Add the two collections to the "Content and CMS" section of `docs/info/development.md`, and a
line to `application/frontend/CLAUDE.md` noting that `city-coordinates.json` is a list keyed by
`name.en`.

## Risks

- Decap `relation` with `file:` against a file collection inside list items: verify in the dev
  CMS before finishing. Fallback: generated select options (`__CITY_OPTIONS__` in
  `config.yml.ts`), at the cost of a deploy before a new city appears in the picker.
