# ocs.com.ua

Corporate website for OCS — built with Astro (frontend) and FastAPI (backend).

______________________________________________________________________

## Project structure

```
application/
├── frontend/   # Astro site: static pages + on-demand CMS routes (Node adapter)
└── backend/    # FastAPI service (Python 3.14)
```

______________________________________________________________________

## Frontend

### Requirements

- **Node.js** ≥ 22.12.0
- **Bun** (used as package manager)

### Install

```bash
cd application/frontend
bun install
```

### Environment

Copy the example env file and fill in your values:

```bash
cp .env.example .env.local
```

| Variable               | Description                                                                      |
| ---------------------- | -------------------------------------------------------------------------------- |
| `GITHUB_CLIENT_ID`     | GitHub OAuth App client ID (**required**)                                        |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth App client secret (**required**)                                    |
| `GITHUB_OWNER`         | Repository owner (default: `LilConsul`)                                          |
| `GITHUB_REPO`          | Repository name (default: `ocs.com.ua`)                                          |
| `GITHUB_BRANCH`        | Branch to read/write content on (default: `main`)                                |
| `SITE_URL`             | Public site URL for "View live" links in the CMS (default: `https://ocs.com.ua`) |
| `CMS_BASE_URL`         | Host serving `/api/auth` (default: the origin `/admin` is opened on)             |
| `CMS_LOCALE`           | Decap UI language: `en` or `ua` (default: `en`)                                  |
| `CMS_SEARCH`           | Enable Decap entry search (default: `false`, saves GitHub API rate limit)        |

Variables are validated at startup via `astro:env`. The server refuses to start if the required secrets are missing or a value is invalid.

Create the GitHub OAuth App at <https://github.com/settings/developers>.
Set the **Authorization callback URL** to:

- Dev: `http://localhost:4321/api/auth`
- Prod: `https://ocs.com.ua/api/auth`

### Dev server

```bash
bun dev        # http://localhost:4321
```

### Build

```bash
bun run build
```

The build output lands in `application/frontend/dist/`. All public pages are prerendered to static HTML. Only the CMS routes (`/admin/config.yml` and `/api/auth`) are rendered on demand by the Node server. Run it with:

```bash
node dist/server/entry.mjs
```

### Other commands

| Command                | Description                                                           |
| ---------------------- | --------------------------------------------------------------------- |
| `bun run check`        | Lint with Biome                                                       |
| `bun run check:fix`    | Lint + auto-fix + Prettier                                            |
| `bun run i18n`         | Extract + compile translations in one step                            |
| `bun run i18n:extract` | Extract `_("…")` strings to `locales/messages.pot` and `locales/*.po` |
| `bun run i18n:init`    | Create a PO file for a new language                                   |
| `bun run i18n:compile` | Compile PO files into `src/i18n/ui.ts`                                |
| `bun run remark:check` | Lint content Markdown files                                           |
| `bun run remark:write` | Auto-fix content Markdown files                                       |

______________________________________________________________________

## CMS (Decap CMS)

The CMS is available at `/admin` when the dev server or production site is running. Sign in with GitHub. The account needs write access to the repository. Edits go through the editorial workflow (draft → review → publish) and are committed as `[CMS] …` commits.
