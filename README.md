<h1 align="center">ocs.com.ua</h1>

<p align="center">
  Corporate website for <b>OS-Technology Ukraine</b> — a bilingual (<code>/ua</code>, <code>/en</code>)
  B2B site for industrial weighing equipment, built with Astro and edited through Decap CMS.
</p>

<p align="center">
  <a href="https://github.com/LilConsul/ocs.com.ua/actions/workflows/deploy-prod.yml"><img alt="Deploy prod" src="https://img.shields.io/github/actions/workflow/status/LilConsul/ocs.com.ua/deploy-prod.yml?branch=main&label=deploy&logo=githubactions&logoColor=white&style=for-the-badge&labelColor=0d1117"></a>
  <a href="https://ocs.com.ua"><img alt="Main site" src="https://img.shields.io/website?url=https%3A%2F%2Focs.com.ua%2Fua%2F&label=ocs.com.ua&logo=googlechrome&logoColor=white&style=for-the-badge&labelColor=0d1117"></a>
  <a href="https://dev.ocs.com.ua"><img alt="Dev site" src="https://img.shields.io/website?url=https%3A%2F%2Fdev.ocs.com.ua%2Fua%2F&label=dev%20site&logo=googlechrome&logoColor=white&style=for-the-badge&labelColor=0d1117"></a>
  <a href="https://github.com/LilConsul/ocs.com.ua/commits/main"><img alt="Last commit" src="https://img.shields.io/github/last-commit/LilConsul/ocs.com.ua?logo=git&logoColor=white&style=for-the-badge&labelColor=0d1117&color=6e40c9"></a>
</p>

<p align="center">
  <a href="https://astro.build"><img alt="Astro 7" src="https://img.shields.io/badge/Astro-7-BC52EE?logo=astro&logoColor=white&style=flat-square&labelColor=0d1117"></a>
  <a href="https://react.dev"><img alt="React 19" src="https://img.shields.io/badge/React-19-149ECA?logo=react&logoColor=white&style=flat-square&labelColor=0d1117"></a>
  <a href="https://tailwindcss.com"><img alt="Tailwind CSS 4" src="https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss&logoColor=white&style=flat-square&labelColor=0d1117"></a>
  <a href="https://www.typescriptlang.org"><img alt="TypeScript 6" src="https://img.shields.io/badge/TypeScript-6-3178C6?logo=typescript&logoColor=white&style=flat-square&labelColor=0d1117"></a>
  <a href="https://bun.sh"><img alt="Bun" src="https://img.shields.io/badge/Bun-runtime-F9F1E1?logo=bun&logoColor=white&style=flat-square&labelColor=0d1117"></a>
  <a href="https://decapcms.org"><img alt="Decap CMS 3" src="https://img.shields.io/badge/Decap_CMS-3-FF0082?logo=netlify&logoColor=white&style=flat-square&labelColor=0d1117"></a>
</p>

<p align="center">
  <a href="https://www.python.org"><img alt="Python 3.11+" src="https://img.shields.io/badge/Python-3.11+-3776AB?logo=python&logoColor=white&style=flat-square&labelColor=0d1117"></a>
  <a href="https://docs.astral.sh/uv/"><img alt="uv" src="https://img.shields.io/badge/uv-managed-DE5FE9?logo=uv&logoColor=white&style=flat-square&labelColor=0d1117"></a>
  <a href="https://biomejs.dev"><img alt="Biome" src="https://img.shields.io/badge/lint-Biome-60A5FA?logo=biome&logoColor=white&style=flat-square&labelColor=0d1117"></a>
  <a href="https://pre-commit.com"><img alt="pre-commit" src="https://img.shields.io/badge/pre--commit-enabled-FAB040?logo=precommit&logoColor=white&style=flat-square&labelColor=0d1117"></a>
  <a href="docs/info/development.md#translations"><img alt="i18n ua | en" src="https://img.shields.io/badge/i18n-ua%20%7C%20en-2EA043?logo=googletranslate&logoColor=white&style=flat-square&labelColor=0d1117"></a>
</p>

______________________________________________________________________

## Project structure

```
.github/        # CI, prod and dev deploys, rollback, uptime monitor, server env manifests
application/
├── frontend/   # Astro site: static pages + on-demand API routes (Node adapter)
└── infra/      # Python (uv) tooling and server files: Apache fragments, env renderer/sync,
                #   image checker, IndexNow submitter, server setup/launch scripts
docs/
├── info/       # Setup, environment and deployment guides (start here)
├── design/     # Page designs exported from Stitch
└── superpowers/# Feature specs and implementation plans
Makefile        # Shortcuts for setup, env sync and tests
```

______________________________________________________________________

## Quick start

Requirements: **Node.js** ≥ 22.12, **Bun**, **uv**, **make** and **pre-commit**.

```bash
make install-dev    # bun install, uv sync, install git hooks
make env            # create/sync application/frontend/.env.local from .env.example
cd application/frontend
bun run dev         # http://localhost:4321
```

Fill in `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET` in `.env.local` to use the CMS locally. See [Environment](docs/info/environment.md).

______________________________________________________________________

## Make targets

Run from the repository root.

| Target             | Description                                                                             |
| ------------------ | --------------------------------------------------------------------------------------- |
| `make install-dev` | Install frontend deps (`bun`), infra deps (`uv sync`) and the pre-commit/pre-push hooks |
| `make env`         | Create `.env.local` from `.env.example`, or merge new keys into it keeping your values  |
| `make test`        | Run frontend and infra tests                                                            |
| `make test-fe`     | Frontend tests only (`bun test`)                                                        |
| `make test-infra`  | Infra tests only (`pytest`)                                                             |

______________________________________________________________________

## Deployment

| Site                                     | Deployed                                           | Indexed                             |
| ---------------------------------------- | -------------------------------------------------- | ----------------------------------- |
| [ocs.com.ua](https://ocs.com.ua)         | Every push to `main`, CMS publishes included       | Yes: sitemap, `/llms.txt`, IndexNow |
| [dev.ocs.com.ua](https://dev.ocs.com.ua) | By hand from any branch (Actions → **Deploy dev**) | No: closed to all crawlers          |

Each deploy keeps the previous releases on the server: a failed health check switches back on its own, and **Rollback** in the Actions tab does it by hand. See [Deployment](docs/info/deployment.md).

______________________________________________________________________

## Documentation

| Guide                                               | Contents                                                                                 |
| --------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| [Development](docs/info/development.md)             | Commands, i18n workflow, content and CMS, tests, git hooks, commit format                |
| [Environment](docs/info/environment.md)             | Every environment variable, feature flags, indexing, GitHub OAuth app, `make env`        |
| [Deployment](docs/info/deployment.md)               | CI, the prod and dev pipelines, releases and rollback, server layout, GitHub secrets     |
| [LLM indexing](docs/info/llm-indexing.md)           | `/llms.txt`, Markdown page copies, crawler rules, page coverage, old WordPress redirects |
| [Production launch](docs/info/production-launch.md) | How ocs.com.ua was switched from WordPress, and what to watch in the first weeks         |

Contributor notes for AI assistants live in [`application/frontend/CLAUDE.md`](application/frontend/CLAUDE.md).
