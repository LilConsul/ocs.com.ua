# ocs.com.ua

Corporate website for OCS — built with Astro (frontend) and FastAPI (backend).

______________________________________________________________________

## Project structure

```
application/
├── frontend/   # Astro SSR site (Node adapter)
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

| Variable               | Description                                       |
| ---------------------- | ------------------------------------------------- |
| `GITHUB_CLIENT_ID`     | GitHub OAuth App client ID                        |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth App client secret                    |
| `GITHUB_OWNER`         | Repository owner (default: `LilConsul`)           |
| `GITHUB_REPO`          | Repository name (default: `ocs.com.ua`)           |
| `GITHUB_BRANCH`        | Branch to read/write content on (default: `main`) |

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

The build output lands in `application/frontend/dist/`. Run it with:

```bash
node dist/server/entry.mjs
```

### Other commands

| Command                | Description                          |
| ---------------------- | ------------------------------------ |
| `bun run check`        | Lint with Biome                      |
| `bun run check:fix`    | Lint + auto-fix + Prettier           |
| `bun run i18n:extract` | Extract translation keys to PO files |
| `bun run i18n:compile` | Compile PO files to JSON             |
| `bun run remark:check` | Lint content Markdown files          |
| `bun run remark:write` | Auto-fix content Markdown files      |

______________________________________________________________________

## CMS (Decap CMS)

The CMS is available at `/admin` when the dev server or production site is running.

Configuration lives in [`application/frontend/public/admin/config.yml`](application/frontend/public/admin/config.yml).
Update `site_url` and `display_url` in that file when deploying to a new environment.

To use the CMS locally, set `backend.name` to `test-repo` in `config.yml` (the commented-out line) — this uses an in-memory test backend with no GitHub writes.
