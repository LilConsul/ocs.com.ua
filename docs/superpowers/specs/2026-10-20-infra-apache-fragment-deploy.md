# Spec: Apache fragment management and infra directory

**Date:** 2026-10-20
**Branch:** denys/feat/appache-deployment

______________________________________________________________________

## Context

The server runs Apache (Virtualmin-managed) in front of an Astro/Node SSR app.
Virtualmin owns the vhost file `/etc/apache2/sites-enabled/dev.ocs.com.ua.conf`
and regenerates it on cert renewal. The OCS-specific proxy rules are maintained
as a separate fragment file that the vhost `Include`s — Virtualmin never touches it.

The one-time server setup (fragment path wired into vhost via `Include`) is already
complete. This spec covers putting that fragment under version control and deploying
it from CI.

______________________________________________________________________

## Goals

1. Store the Apache fragment in the repo under `application/infra/`.
1. Move `render-env.mjs` from `application/frontend/scripts/` to `application/infra/scripts/` — it is deployment infrastructure, not frontend code.
1. Deploy the fragment from CI: rsync → configtest → reload, with automatic rollback on failure.
1. Add `/api/contact` proxy rule (already live on server, now tracked in repo).

______________________________________________________________________

## Non-goals

- Managing the full Virtualmin vhost file.
- Any other environment (prod) — infra for `ocs.com.ua` is out of scope.
- Python rewrite of `render-env.mjs`.

______________________________________________________________________

## Repository layout

```
application/
├── frontend/           # unchanged (render-env.mjs removed from scripts/)
│   └── scripts/
│       └── render-env.mjs   ← DELETED (moved)
└── infra/
    ├── apache/
    │   └── dev.ocs.com.ua.ocs.conf   ← fragment tracked in git
    └── scripts/
        └── render-env.mjs            ← moved here
```

______________________________________________________________________

## Fragment file: `dev.ocs.com.ua.ocs.conf`

Content is the exact fragment already live on the server:

```apache
# OCS-managed proxy rules — do not edit by hand, updated by CI
ProxyPreserveHost On
ProxyPass        /api/auth          http://127.0.0.1:4321/api/auth
ProxyPassReverse /api/auth          http://127.0.0.1:4321/api/auth
ProxyPass        /admin/config.yml  http://127.0.0.1:4321/admin/config.yml
ProxyPassReverse /admin/config.yml  http://127.0.0.1:4321/admin/config.yml
ProxyPass        /api/contact       http://127.0.0.1:4321/api/contact
ProxyPassReverse /api/contact       http://127.0.0.1:4321/api/contact
```

Server path: `/home/ocs/domains/dev.ocs.com.ua/ocs-apache.conf`
(writeable by `ocs`, readable by Apache)

______________________________________________________________________

## CI deploy step: Sync Apache config

Inserted in `deploy-dev.yml` **before** the existing "Sync env file" step, after "Configure SSH".

```
1. rsync fragment to server as .tmp file
2. apache2ctl configtest (with .tmp in place via a symlink swap — see below)
3. on success: mv .tmp to live path, sudo systemctl reload apache2
4. on failure: rm .tmp, fail the step (live file untouched)
```

### Atomic swap with configtest

Apache's `configtest` reads the live `Include` path. To test before committing:

1. Copy live file to `.bak` on server
1. rsync `.tmp` to server
1. `mv live → .bak2`, `mv .tmp → live`
1. `apache2ctl configtest`
   - pass: `rm .bak2`, `sudo systemctl reload apache2`
   - fail: `mv .bak2 → live`, `rm .tmp`, exit 1

This is done entirely in a single SSH command pipeline so there is no partial state.

______________________________________________________________________

## Workflow path changes

`deploy-dev.yml` currently has `working-directory: application/frontend`.
Steps that reference infra scripts use relative paths from that working directory:

| Reference         | Old path                 | New path (from `application/frontend`)    |
| ----------------- | ------------------------ | ----------------------------------------- |
| render-env script | `scripts/render-env.mjs` | `../infra/scripts/render-env.mjs`         |
| Apache fragment   | n/a                      | `../infra/apache/dev.ocs.com.ua.ocs.conf` |

The `working-directory` default stays `application/frontend` — only the two path
strings change.

______________________________________________________________________

## Test file

`application/frontend/tests/scripts/render-env.test.mjs` imports from
`../../scripts/render-env.mjs`. After the move it must import from
`../../../infra/scripts/render-env.mjs`.

The `yaml` devDependency stays in `application/frontend/package.json` — the script
is called by `node` (not `bun`) in CI and `yaml` is available because
`bun install --frozen-lockfile` (all deps) runs before the infra step.

______________________________________________________________________

## Trigger paths

`deploy-dev.yml` `on.push.paths` must include the new infra paths:

```yaml
- "application/infra/**"
```

The old `".github/secrets.dev.yaml"` path entry is removed (file doesn't move,
but the manifest is infra — add `application/infra/**` covers it if it moves later).

______________________________________________________________________

## Server sudo rules (already in place)

```
ocs ALL=(root) NOPASSWD: /usr/bin/systemctl restart ocs-dev
ocs ALL=(root) NOPASSWD: /usr/bin/systemctl reload apache2
```

No further server changes needed.

______________________________________________________________________

## One-time server wiring (already done)

- Fragment file created at `/home/ocs/domains/dev.ocs.com.ua/ocs-apache.conf`
- Two `Include` lines added to the vhost (`:80` and `:443` blocks)
- `apache2ctl configtest && systemctl reload apache2` confirmed clean

______________________________________________________________________

## Out of scope / future

- Production (`ocs.com.ua`) vhost and deploy workflow — separate spec when needed.
- Rollback of the Node app itself (systemd handles `Restart=on-failure`).
