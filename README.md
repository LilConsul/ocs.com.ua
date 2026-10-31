<h1 align="center">ocs.com.ua</h1>

<p align="center">
  Corporate website for <b>OS-Technology Ukraine</b> — a bilingual (<code>/ua</code>, <code>/en</code>)
  B2B site for industrial weighing equipment, built with Astro and edited through Decap CMS.
</p>

<p align="center">
  <a href="https://github.com/LilConsul/ocs.com.ua/actions/workflows/deploy-dev.yml"><img alt="Deploy dev" src="https://img.shields.io/github/actions/workflow/status/LilConsul/ocs.com.ua/deploy-dev.yml?branch=main&label=deploy&logo=githubactions&logoColor=white&style=for-the-badge&labelColor=0d1117"></a>
  <a href="https://ocs.com.ua"><img alt="Main site: WIP" src="https://img.shields.io/badge/main%20site-WIP-F59E0B?logo=googlechrome&logoColor=white&style=for-the-badge&labelColor=0d1117"></a>
  <a href="https://dev.ocs.com.ua"><img alt="Dev site" src="https://img.shields.io/website?url=https%3A%2F%2Fdev.ocs.com.ua%2Fua&label=dev%20site&logo=googlechrome&logoColor=white&style=for-the-badge&labelColor=0d1117"></a>
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
.github/        # CI, dev deploy workflow and the server env manifest
application/
├── frontend/   # Astro site: static pages + on-demand API routes (Node adapter)
└── infra/      # Python (uv) tooling: Apache fragment, env renderer/sync, image checker
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

## Documentation

| Guide                                   | Contents                                                                  |
| --------------------------------------- | ------------------------------------------------------------------------- |
| [Development](docs/info/development.md) | Commands, i18n workflow, content and CMS, tests, git hooks, commit format |
| [Environment](docs/info/environment.md) | Every environment variable, feature flags, GitHub OAuth app, `make env`   |
| [Deployment](docs/info/deployment.md)   | CI, the dev.ocs.com.ua deploy pipeline, server layout, GitHub secrets     |

Contributor notes for AI assistants live in [`application/frontend/CLAUDE.md`](application/frontend/CLAUDE.md).
