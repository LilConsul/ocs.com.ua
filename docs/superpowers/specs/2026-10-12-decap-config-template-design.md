# Decap CMS config template — design

## Problem

`application/frontend/src/pages/admin/config.yml.ts` holds the entire Decap CMS
config as a ~210-line JS template literal. YAML has no syntax highlighting or
linting, and the dynamic lists (icons, categories) are built with
`.map().join("\n")` strings that hard-code indentation and break if a label
contains a `"`.

## Goal

Move the static YAML into a real `.yml` template file. The endpoint only loads
data, fills tokens, and responds. The served config must be semantically
identical to today's output.

## Design

### Files

```
src/pages/admin/
├── config.yml.ts           ← endpoint (~30 lines)
└── _config.template.yml    ← plain YAML; `_` prefix = ignored by Astro router
```

### Loading

```ts
import template from "./_config.template.yml?raw";
```

Vite inlines the file as a string at build time. No `fs`/cwd dependency for the
template, and HMR works in dev.

### Token syntax

Tokens look like `__NAME__` and always stand for a **whole YAML value**:

```yaml
backend:
  repo: __GITHUB_REPO__
  branch: __GITHUB_BRANCH__
  base_url: __BASE_URL__
...
                options: __ICON_OPTIONS__
```

We use `__NAME__` instead of the originally discussed `%NAME%` because a plain
scalar can't start with `%` in YAML. With `__NAME__` the template stays valid
YAML, so editor highlighting and linting work. It also can't clash with Decap's
own `{{slug}}`-style placeholders.

Each token is replaced with `JSON.stringify(value)`:

- strings become `"..."`, which is a valid quoted YAML scalar with safe escaping
- arrays become JSON flow sequences, which are valid YAML

This gets rid of all indentation-sensitive string building.

### Tokens

| Token                  | Value                                                    |
| ---------------------- | -------------------------------------------------------- |
| `__GITHUB_REPO__`      | `` `${GITHUB_OWNER}/${GITHUB_REPO}` ``                   |
| `__GITHUB_BRANCH__`    | `GITHUB_BRANCH`                                          |
| `__BASE_URL__`         | `CMS_BASE_URL ?? url.origin`                             |
| `__SITE_URL__`         | `SITE_URL` (used for both `site_url` and `display_url`)  |
| `__CMS_LOCALE__`       | `CMS_LOCALE`                                             |
| `__ICON_OPTIONS__`     | `icons.map(({label, value}) => ({label, value}))`        |
| `__CATEGORY_OPTIONS__` | `categories.map(c => ({label: c.title, value: c.slug}))` |

`GITHUB_OWNER` and `GITHUB_REPO` are combined into one token so that every
token stays a whole value.

### Endpoint

The `readJson` helper, the data types, and the
`equipmentData.en?.categories ?? equipmentData.categories` fallback stay as
they are. The template literal and `.map().join()` blocks are replaced by:

```ts
const config = Object.entries(tokens).reduce(
	(yml, [key, value]) => yml.replaceAll(`__${key}__`, JSON.stringify(value)),
	template,
);
```

The response headers stay the same.

### Error handling

No changes. Missing or invalid JSON data still falls back to empty lists through
`readJson`. There is no check for unreplaced tokens (out of scope, YAGNI).

## Verification

There's no test framework in the frontend. Verification is a one-off comparison:

1. Before the change, save `GET /admin/config.yml` from `astro dev` to a temp file.
1. After the change, fetch it again.
1. Parse both with the `yaml` package already in `node_modules` (a Decap
   dependency) and deep-compare. They must be equal.
1. `npm run check` (biome) and `npm run build` must pass.

## Out of scope

- Moving the static industries list into JSON data
- Validating unreplaced tokens
- Splitting the template into per-collection files
