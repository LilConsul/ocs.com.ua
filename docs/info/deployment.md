# Deployment

______________________________________________________________________

## Pipelines

| Workflow                                                     | Trigger                                                                                                                               | What it does                                                                                                                       |
| ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| [`ci.yml`](../../.github/workflows/ci.yml)                   | Pull requests touching `frontend/`, `infra/` or the workflow                                                                          | Biome, frontend unit tests, e2e (one job per browser, WebKit in three shards), trailing-slash link check, image check, infra tests |
| [`deploy-prod.yml`](../../.github/workflows/deploy-prod.yml) | Push to `main` touching `frontend/`, `infra/`, the deploy workflows, `.github/actions/` or `.github/secrets.prod.yaml`, or manual run | Deploys https://ocs.com.ua. Needs the `PROD_ENABLED` variable; staged on the server until `PROD_LIVE` is set                       |
| [`deploy-dev.yml`](../../.github/workflows/deploy-dev.yml)   | Manual run only, on any branch                                                                                                        | Deploys that branch to https://dev.ocs.com.ua to try it on the real server (no CMS there: `/admin` redirects to ocs.com.ua)        |
| [`rollback.yml`](../../.github/workflows/rollback.yml)       | Manual run                                                                                                                            | Puts an earlier release of prod or dev back live, without a build                                                                  |
| [`monitor.yml`](../../.github/workflows/monitor.yml)         | Every 30 minutes, once `PROD_LIVE` is set                                                                                             | Uptime check of ocs.com.ua (home, Node server, `llms.txt`)                                                                         |

`main` is production: every merged PR and every CMS publish (a commit to `main`) deploys ocs.com.ua. To try a branch on a real server first, run **Deploy dev** on it (Actions tab → **Deploy dev** → **Run workflow**, or `gh workflow run deploy-dev.yml --ref <branch>`).

Both deploy workflows call the shared [`_deploy.yml`](../../.github/workflows/_deploy.yml) with their site's inputs (URL, server directory, service, port, Apache fragment, env manifest, indexing).

Common to all workflows:

- The Bun version comes from [`application/frontend/.bun-version`](../../application/frontend/.bun-version). Update it together with your local Bun.
- Actions are pinned to commit SHAs with the tag in a comment. [Dependabot](../../.github/dependabot.yml) opens a weekly PR to update them.
- The GitHub token is read-only (`permissions: contents: read`) and every job has a `timeout-minutes`.
- Caches: Bun packages (keyed by `bun.lock`), uv, Playwright browsers (per browser and version) and Astro's resized images (keyed by `src/assets/` and `bun.lock`).

______________________________________________________________________

## Deploy pipeline (`_deploy.yml`)

### Test job

Runs next to the build job: Biome (`bun run ci`), `bun test` and the infra `pytest` suite. The deploy job waits for both, so a failing test still blocks the deploy.

### Build job

1. The checkout has the full commit history without file contents (`fetch-depth: 0`, `filter: blob:none`), so the sitemap `<lastmod>` dates can come from git. A shallow clone leaves them out.
1. `bun run build` produces `application/frontend/dist/`. Dev builds with `LLMS_INDEXING=false`, prod with indexing on and the IndexNow key (see [Environment](environment.md#search-and-ai-indexing)).
1. The server bundle is imported once with `node_modules` removed, to prove it is self-contained. Server dependencies are bundled into `dist/server` (`ssr.noExternal` in `astro.config.mjs`); only `sharp` stays external and is never loaded at runtime because images are processed at build time.
1. `dist/` and `package.json` are uploaded as an artifact (hidden files included, for `dist/client/.htaccess`).

### Deploy job

1. **Render env file** — on the runner first, so a missing secret or variable stops the job before the server is touched (see below).
1. **Configure SSH** — writes the key and `known_hosts` ([`configure-ssh`](../../.github/actions/configure-ssh/action.yml)).
1. **Sync Apache config** — copies the site's proxy fragment from `application/infra/apache/` to the server, runs `apache2ctl configtest`, reloads Apache on success and restores the previous file on failure.
1. **Sync env file** — streams the rendered file to `<service>.env` on the server.
1. **Upload release** — `dist/`, `package.json` and a `release.json` (commit, branch, commit message, deploy time, link to the run) go into a new directory `releases/<UTC date>-<commit>/`. Files that did not change are hard links to the live release (`rsync --link-dest`), so the upload stays small.
1. **Activate release** — switches the `app` symlink to the new release in one atomic step and restarts the service.
1. **Health check** — polls `http://127.0.0.1:<port>/admin/config.yml` for up to 20 seconds. On failure it prints service status and logs, **switches `app` back to the previous release** and fails the job.
1. **Remove old releases** — keeps the newest five (the live one always stays) and writes the table of releases left on the server, live one marked, to the run summary ([`releases-summary.py`](../../application/infra/scripts/releases-summary.py)).

The deploy job runs in the GitHub environment `prod` or `dev` (the same names as the workflow input), so every deploy shows up under **Deployments** on the repository page (and at `/deployments`): commit, time, result, a link to the site, and which commit each site runs now.

### Verify jobs

- **verify** (the public URL serves this deployment: dev always, prod after launch) runs [`verify-site.py`](../../application/infra/scripts/verify-site.py) against the site through Apache. It checks:

  - the pages, the CMS config (Node server) and the LLM files answer;
  - `.md` served as `text/markdown`, `/_astro/` files with `Cache-Control: immutable`, and the security headers (HSTS, `nosniff`, `frame-ancestors`);
  - three old WordPress addresses, plain http (and www on prod) answer one `301` to the right page;
  - indexing matches the build: dev closed (`Disallow: /`, `noindex`, `X-Robots-Tag`), prod open (sitemap in `robots.txt`, `index, follow`, no `X-Robots-Tag`);
  - dev has no CMS (`/admin/` points to ocs.com.ua, `/api/auth` answers 404).

  Run it by hand the same way: `uv run application/infra/scripts/verify-site.py https://ocs.com.ua --environment prod --indexing true`. Then the job runs the Playwright e2e suite (chromium) against the live site, by setting `E2E_BASE_URL`. The header checks need Apache's `mod_headers`.

Checks and summaries live in Python scripts under `application/infra/scripts/` with tests in `application/infra/tests/`; the workflow keeps only the short commands that run on the server (switch the release, restart, clean up).

- **verify-staged** (prod before launch) checks over SSH that the release has the built site and that the Node server answers on its port, since ocs.com.ua still serves WordPress.

- **indexnow** (prod after launch) submits the pages whose `<lastmod>` is newer than the commit before the push to IndexNow (Bing, and through it ChatGPT search and Copilot).

### Static vs on-demand

All public pages are prerendered. The Node server (`node dist/server/entry.mjs`) only handles:

- `/api/auth` — Decap GitHub OAuth
- `/api/contact` — contact form submission
- `/api/datasheet-request` — datasheet lead form, emails the team and returns a signed link
- `/api/datasheet` — streams a datasheet PDF for a valid signed link
- `/admin/config.yml` — generated Decap config

Apache serves everything else from `dist/client` and proxies these paths to Node. A new on-demand route must be added to **both** fragments in `application/infra/apache/` (`dev.ocs.com.ua.ocs.conf` with port 4321, `ocs.com.ua.ocs.conf` with port 4322); `tests/test_apache_fragments.py` fails when they differ.

______________________________________________________________________

## Server layout

Debian 13 with Virtualmin. Both sites belong to the user `ocs` and run on the same server.

|                      | dev.ocs.com.ua                                    | ocs.com.ua                                                                      |
| -------------------- | ------------------------------------------------- | ------------------------------------------------------------------------------- |
| Site directory       | `/home/ocs/domains/dev.ocs.com.ua/`               | `/home/ocs/domains/ocs.com.ua/`                                                 |
| Releases             | `releases/<date>-<commit>/`, `app` → the live one | same                                                                            |
| Apache document root | `public_html` → `app/dist/client`                 | `/home/ocs/public_html` → `app/dist/client` after launch (WordPress until then) |
| Env file             | `ocs-dev.env`                                     | `ocs-prod.env`                                                                  |
| Proxy fragment       | `ocs-apache.conf`, `Include`d from the vhost      | `ocs-apache.conf`, `Include`d from the vhost on launch day                      |
| systemd unit         | `ocs-dev.service`, port 4321                      | `ocs-prod.service`, port 4322                                                   |

Virtualmin owns the vhost files, so OCS-specific rules live in the separate fragment it never touches. The env file and fragment sit outside the releases, so a deploy never removes them.

The `ocs` user may run these commands as root without a password:

```
/usr/bin/systemctl restart ocs-dev
/usr/bin/systemctl restart ocs-prod
/usr/bin/systemctl reload apache2
/usr/sbin/apache2ctl configtest
```

Apache needs `mod_headers` for the headers in `public/.htaccess`. The rules sit in `<IfModule mod_headers.c>`, so without the module they are skipped silently and only the verify job notices. It was enabled on this server on 2026-11-13; on a new server run once as root:

```bash
a2enmod headers && apache2ctl configtest && systemctl reload apache2
```

Reading the service log needs `journalctl` access. Add the user to the journal group once so the health check can print logs on failure:

```bash
sudo usermod -aG systemd-journal ocs
```

### Server scripts

Run as root from the repository root, for example `ssh root@<server> 'bash -s' < application/infra/server/setup-prod.sh`.

| Script                                                                        | When                                 | What it does                                                                                                                                                                                                        |
| ----------------------------------------------------------------------------- | ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`setup-prod.sh`](../../application/infra/server/setup-prod.sh)               | Once, before the first prod deploy   | Site directory, `ocs-prod.service`, empty fragment and env file, the sudo rule. Does not touch WordPress.                                                                                                           |
| [`launch-prod.sh`](../../application/infra/server/launch-prod.sh)             | Launch day                           | Includes the fragment in the ocs.com.ua vhost, moves WordPress to `/home/ocs/public_html.wordpress` and points `public_html` at the new site, then checks the site through Apache. Any failure puts WordPress back. |
| [`restore-wordpress.sh`](../../application/infra/server/restore-wordpress.sh) | If the launch has to be undone later | Serves WordPress again; the new site's releases stay.                                                                                                                                                               |

______________________________________________________________________

## GitHub configuration

Set these under **Settings → Secrets and variables → Actions**. Both sites run on the same server as the same user, so they share almost everything.

### Secrets

| Name                                                 | Used for                                                                 |
| ---------------------------------------------------- | ------------------------------------------------------------------------ |
| `DEV_SSH_HOST`, `DEV_SSH_KEY`, `DEV_SSH_KNOWN_HOSTS` | SSH to the server (both sites)                                           |
| `DEV_GITHUB_CLIENT_ID`, `DEV_GITHUB_CLIENT_SECRET`   | OAuth app of dev.ocs.com.ua → `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` |
| `PROD_GITHUB_CLIENT_ID`, `PROD_GITHUB_CLIENT_SECRET` | OAuth app of ocs.com.ua (callback `https://ocs.com.ua/api/auth`)         |
| `DEV_RECAPTCHA_SECRET_KEY`                           | reCAPTCHA secret (both sites) → `RECAPTCHA_SECRET_KEY`                   |
| `DEV_DATASHEET_TOKEN_SECRET`                         | Datasheet link signing key (both sites) → `DATASHEET_TOKEN_SECRET`       |
| `SMTP_USER`, `SMTP_PASS`                             | SMTP account (both sites)                                                |

A GitHub OAuth app accepts callbacks for one host only, which is why the CMS login is the one thing each site has its own of.

### Variables

| Name                                               | Used for                                                                                                                                                                     |
| -------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `SSH_USER`                                         | SSH user on the server (`ocs`, both sites). A variable, not a secret: GitHub masks secret values in every log, and a secret `ocs` turned each `ocs.com.ua` into `***.com.ua` |
| `PROD_ENABLED`                                     | `true` to let `deploy-prod.yml` run (set once the `PROD_GITHUB_*` secrets exist)                                                                                             |
| `PROD_LIVE`                                        | `true` once `launch-prod.sh` has switched ocs.com.ua (public checks, IndexNow, uptime monitor)                                                                               |
| `DEV_RECAPTCHA_SITE_KEY`                           | reCAPTCHA public key (both sites; the key must list both domains)                                                                                                            |
| `CONTACT_FROM`                                     | Contact form sender (both sites)                                                                                                                                             |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`            | SMTP server (both sites)                                                                                                                                                     |
| `DEV_CONTACT_TO`                                   | Contact form recipient on dev; prod uses the default `info@ocs.com.ua`                                                                                                       |
| `DEV_SHOW_CLIENT_EQUIPMENT`, `DEV_SITE_DEV_NOTICE` | Feature flags on dev (listed in the dev manifest, so they must be set); off on prod                                                                                          |

Feature flags are build-time only. An unset variable resolves to an empty string, which `astro:env` treats as unset, so the default applies.

### Server env file

[`.github/secrets.dev.yaml`](../../.github/secrets.dev.yaml) and [`.github/secrets.prod.yaml`](../../.github/secrets.prod.yaml) map GitHub secret and variable names to the environment variable names written to `ocs-dev.env` / `ocs-prod.env`. They hold no values.

On each deploy, [`render-env.py`](../../application/infra/scripts/render-env.py) reads the manifest and the `secrets` / `vars` contexts (passed as JSON), and prints one `NAME="value"` line per entry. The output is written to a temporary file on the runner, so a failed render or an empty result stops the job before the server is touched. It is then streamed over SSH to a temporary file on the server and renamed into place with owner-only permissions. Values never appear on a command line.

Every name listed in a manifest must exist and be non-empty, otherwise the deploy fails before the server is touched.

______________________________________________________________________

## Manual operations

- **Deploy again:** Actions → **Deploy prod** (or **Deploy dev**) → **Run workflow**.
- **Roll back:** Actions → **Rollback** → pick the site. Empty "release" means the one before the live one; release names are in the summary of each deploy run.
- **See what runs where:** the **Deployments** section of the repository page, or `cat /home/ocs/domains/ocs.com.ua/app/release.json` on the server.
- **Launch / undo the launch:** see [Production launch](production-launch.md).

On the server:

```bash
sudo systemctl status ocs-prod --no-pager        # or ocs-dev
sudo journalctl -u ocs-prod -n 100 --no-pager
ls -l /home/ocs/domains/ocs.com.ua/app /home/ocs/domains/ocs.com.ua/releases
sudo apache2ctl configtest
```

Run the production build locally:

```bash
cd application/frontend
bun run build
node dist/server/entry.mjs     # needs the runtime variables from docs/info/environment.md
```
