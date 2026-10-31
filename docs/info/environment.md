# Environment

All configuration is read through `astro:env` and validated against the schema in [`astro.config.mjs`](../../application/frontend/astro.config.mjs). The build or the server refuses to start when a required value is missing or invalid.

______________________________________________________________________

## Local setup

```bash
make env     # from the repository root
```

- No `.env.local` yet: it is copied from `application/frontend/.env.example`.
- `.env.local` exists: it is rebuilt using the structure of `.env.example` (comments, order, new keys) while every value you already set is kept. Keys that exist only in your file are preserved in a "Custom variables" block at the end.

Re-run `make env` after pulling changes that add variables. The logic lives in [`application/infra/scripts/sync-env.py`](../../application/infra/scripts/sync-env.py) and needs only `uv`.

______________________________________________________________________

## Variables

"Secret" values are only available on the server and never reach the browser. An empty value is treated as unset, so the default applies.

### CMS (Decap)

| Variable               | Required | Default              | Description                                                              |
| ---------------------- | -------- | -------------------- | ------------------------------------------------------------------------ |
| `GITHUB_CLIENT_ID`     | yes      | —                    | GitHub OAuth App client ID (secret)                                      |
| `GITHUB_CLIENT_SECRET` | yes      | —                    | GitHub OAuth App client secret (secret)                                  |
| `GITHUB_OWNER`         | no       | `LilConsul`          | Repository owner Decap reads from and commits to                         |
| `GITHUB_REPO`          | no       | `ocs.com.ua`         | Repository name                                                          |
| `GITHUB_BRANCH`        | no       | `main`               | Branch to read/write content on                                          |
| `SITE_URL`             | no       | `https://ocs.com.ua` | Public site URL, used for `site` in Astro and "View live" links          |
| `CMS_BASE_URL`         | no       | —                    | Host serving `/api/auth`; falls back to the origin `/admin` is opened on |
| `CMS_LOCALE`           | no       | `en`                 | Decap UI language: `en` or `ua`                                          |
| `CMS_SEARCH`           | no       | `false`              | Decap entry search; off to avoid exhausting GitHub API rate limits       |

### Contact form

| Variable               | Required | Default              | Description                                                         |
| ---------------------- | -------- | -------------------- | ------------------------------------------------------------------- |
| `SMTP_HOST`            | yes      | —                    | SMTP server (secret). For local testing use a relay such as Mailpit |
| `SMTP_PORT`            | no       | `587`                | SMTP port (secret)                                                  |
| `SMTP_SECURE`          | no       | `false`              | Use TLS from the start of the connection (secret)                   |
| `SMTP_USER`            | no       | —                    | SMTP username; not needed for a local relay (secret)                |
| `SMTP_PASS`            | no       | —                    | SMTP password (secret)                                              |
| `CONTACT_TO`           | no       | `info@ocs.com.ua`    | Recipient of contact form submissions                               |
| `CONTACT_FROM`         | no       | `noreply@ocs.com.ua` | Sender address created on the mail server                           |
| `RECAPTCHA_SITE_KEY`   | no       | —                    | reCAPTCHA v3 public key, inlined into the client at build time      |
| `RECAPTCHA_SECRET_KEY` | yes      | —                    | reCAPTCHA v3 secret key (secret)                                    |

Register reCAPTCHA keys at <https://www.google.com/recaptcha>. Without `RECAPTCHA_SITE_KEY` the site still starts, but the form cannot pass the server-side check.

### Feature flags

Feature flags are public booleans that default to `false`. They are inlined when the site is built, so changing one needs a rebuild and redeploy.

| Variable                | Default | Effect                                                           |
| ----------------------- | ------- | ---------------------------------------------------------------- |
| `SITE_DEV_NOTICE`       | `false` | Show the "website in active development" banner above the header |
| `SHOW_CLIENT_EQUIPMENT` | `false` | Show per-client equipment counts on the About page cards and map |

______________________________________________________________________

## GitHub OAuth App (CMS login)

Create the app at <https://github.com/settings/developers> and set the **Authorization callback URL** to:

- Local: `http://localhost:4321/api/auth`
- Dev: `https://dev.ocs.com.ua/api/auth`
- Prod: `https://ocs.com.ua/api/auth`

One OAuth app has one callback URL, so each environment uses its own app. GitHub secret names cannot start with `GITHUB_`, which is why the deploy secrets are named `DEV_GITHUB_CLIENT_ID` and `DEV_GITHUB_CLIENT_SECRET` (see [Deployment](deployment.md)).

______________________________________________________________________

## Adding a variable

1. Declare it in the `env.schema` of `astro.config.mjs` with `envField`.
1. Add it, with a comment, to `application/frontend/.env.example`.
1. Document it in the tables above.
1. Pass it to the **Build** job `env:` block in `.github/workflows/deploy-dev.yml` (public/build-time values are inlined there).
1. If the running server needs it too, or you want the GitHub variable to be mandatory, add it to `.github/secrets.dev.yaml` and see [Deployment](deployment.md#server-env-file). The renderer fails the deploy when a listed name is missing or empty.
