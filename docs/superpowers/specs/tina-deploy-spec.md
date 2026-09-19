# Implement Self-Hosted TinaCMS

Work only on the code/project. **Do not make any server, Virtualmin, Apache, DNS, SSL, systemd, or deployment changes.** I will handle deployment separately.

## Goal

Convert the existing Astro project from TinaCloud-oriented configuration to a **self-hosted TinaCMS backend**.

Target production setup later:

```text
admin.dev.ocs.com.ua
        ↓
Tina backend
        ↓
GitHub
```

GitHub repository:

```text
LilConsul/ocs.com.ua
```

## 1. Inspect first

Before changing anything, inspect:

- `package.json` / lockfile
- `tina/config.ts`
- existing Tina/Astro integration
- installed Tina packages

Verify the actual installed APIs for:

- `@tinacms/datalayer`
- `tinacms-gitprovider-github`
- `tinacms-authjs`
- `TinaNodeBackend`
- Auth.js/GitHub provider
- Data Layer/database adapters

Do not rely on outdated examples.

## 2. Determine the Data Layer

Find out whether the current Tina version actually requires a database/Data Layer for this self-hosted setup.

If required, determine the officially supported option.

**Do not assume MongoDB Atlas.**

Do not add MongoDB or other database dependencies until the investigation confirms they are needed.

Document the conclusion briefly.

## 3. Implement the backend

Implement the minimal working self-hosted Tina backend using the APIs actually available in the installed version.

It must support:

- Tina API
- GitHub repository integration
- GitHub OAuth authentication
- Data Layer, if required

Use environment variables for all credentials/secrets.

Do not manually parse HTTP request bodies unless required by the actual Tina API.

## 4. Preserve the existing content model

Keep the existing `equipment` collection and its current bilingual fields/media/specification structure.

Avoid unrelated changes to the Astro project.

Reuse the existing Tina configuration where possible rather than unnecessarily duplicating schemas.

## 5. Local development

Make sure the project can run Tina + Astro locally with Bun.

Verify/update the existing scripts as necessary.

Do not introduce undocumented or unsupported CLI flags.

## 6. Production build

Verify:

```bash
bun run build
```

works with the self-hosted configuration.

Keep the existing Astro build behavior unless Tina requires a documented change.

## 7. Environment/config

Add/update `.env.example` with only the variables actually required by the verified implementation.

Ensure real secrets are ignored by Git.

## 8. Validate

Actually test:

```text
[ ] Tina backend starts
[ ] Astro starts
[ ] Tina UI works
[ ] GitHub authentication configuration works
[ ] Equipment collection loads
[ ] Content can be edited
[ ] Git changes are generated correctly
[ ] Data Layer works, if required
[ ] Production build succeeds
[ ] Existing project checks pass
```

## Final response

When finished, report only:

1. Tina package versions/API findings
1. Whether a database/Data Layer is required
1. What you implemented
1. Files changed
1. Commands to run locally
1. Any remaining secrets/configuration I need to provide
1. Any issues that still need to be resolved before server deployment

Do not perform server deployment.
