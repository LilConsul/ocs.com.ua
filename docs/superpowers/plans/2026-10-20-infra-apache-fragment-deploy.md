# Infra Apache Fragment Deploy — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use skills:subagent-driven-development (recommended) or skills:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move `render-env.mjs` into `application/infra/scripts/`, add the Apache proxy fragment as `application/infra/apache/dev.ocs.com.ua.ocs.conf`, and update the deploy workflow to sync the fragment with atomic configtest + rollback.

**Architecture:** `application/infra/` holds all deployment-side assets (scripts and Apache configs). CI rsyncs the fragment to the server, atomically swaps it into the live path, runs `apache2ctl configtest`, reloads on success or rolls back on failure — all in a single SSH command. The frontend `working-directory` default is kept; infra paths are referenced relatively.

**Tech Stack:** Node.js (render-env.mjs), Apache Include fragment, GitHub Actions (rsync + SSH), Bun (tests).

______________________________________________________________________

## File map

| Action        | Path                                                                          |
| ------------- | ----------------------------------------------------------------------------- |
| Create        | `application/infra/apache/dev.ocs.com.ua.ocs.conf`                            |
| Move (create) | `application/infra/scripts/render-env.mjs`                                    |
| Delete        | `application/frontend/scripts/render-env.mjs`                                 |
| Modify        | `application/frontend/tests/scripts/render-env.test.mjs` — fix import path    |
| Modify        | `.github/workflows/deploy-dev.yml` — new step + updated paths + trigger paths |

______________________________________________________________________

## Task 1: Create the infra directory structure and Apache fragment

**Files:**

- Create: `application/infra/apache/dev.ocs.com.ua.ocs.conf`

- Create: `application/infra/scripts/.gitkeep` (placeholder so scripts/ is tracked before render-env.mjs moves in Task 2)

- [ ] **Step 1: Create the Apache fragment**

```bash
mkdir -p application/infra/apache application/infra/scripts
```

Create `application/infra/apache/dev.ocs.com.ua.ocs.conf` with this exact content (matches what is already live on the server):

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

- [ ] **Step 2: Commit**

```bash
git add application/infra/
git commit -m "feat(infra): add apache proxy fragment for dev.ocs.com.ua"
```

Expected: 1 new file committed.

______________________________________________________________________

## Task 2: Move render-env.mjs to application/infra/scripts/

**Files:**

- Create: `application/infra/scripts/render-env.mjs` (copy of frontend version with updated comment)

- Delete: `application/frontend/scripts/render-env.mjs`

- Modify: `application/frontend/tests/scripts/render-env.test.mjs` line 2

- [ ] **Step 1: Copy the file to its new location**

Create `application/infra/scripts/render-env.mjs` with this content (identical to the original except the Usage comment path is updated):

```js
#!/usr/bin/env node
// Reads a secrets manifest YAML and the GitHub secrets/variables JSON objects
// passed via environment variables, then prints the server env file content.
//
// Usage (called by the deploy workflow):
//   node ../infra/scripts/render-env.mjs ../../.github/secrets.dev.yaml
//
// The workflow passes ${{ toJSON(secrets) }} as GH_SECRETS and
// ${{ toJSON(vars) }} as GH_VARS in its env: block.

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "yaml";

/**
 * @param {{ secrets?: Record<string, string>, variables?: Record<string, string> }} manifest - Parsed secrets manifest
 * @param {Record<string, string>} secrets - GitHub secrets object
 * @param {Record<string, string>} variables - GitHub variables object
 * @returns {string} - env file content
 */
export function renderEnv(manifest, secrets, variables) {
	const lines = [];

	const processMapping = (mapping, source, sourceLabel) => {
		for (const [ghName, envName] of Object.entries(mapping)) {
			const value = source[ghName];
			if (value === undefined || value === null || value === "") {
				throw new Error(
					`Required ${sourceLabel} "${ghName}" is missing or empty in the provided context.`
				);
			}
			if (/[\r\n]/.test(value)) {
				throw new Error(
					`Value for "${ghName}" contains a newline character, which is not allowed in an env file.`
				);
			}
			// Escape backslashes first, then double quotes
			const escaped = value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
			lines.push(`${envName}="${escaped}"`);
		}
	};

	if (manifest.secrets) processMapping(manifest.secrets, secrets, "secret");
	if (manifest.variables) processMapping(manifest.variables, variables, "variable");

	return `${lines.join("\n")}\n`;
}

// CLI entry point
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
	const manifestPath = process.argv[2];
	if (!manifestPath) {
		console.error("Usage: node ../infra/scripts/render-env.mjs <path-to-manifest.yaml>");
		process.exit(1);
	}

	const manifest = parse(readFileSync(resolve(manifestPath), "utf8"));

	let ghSecrets = {};
	let ghVars = {};
	try {
		ghSecrets = JSON.parse(process.env.GH_SECRETS ?? "{}");
		ghVars = JSON.parse(process.env.GH_VARS ?? "{}");
	} catch (e) {
		console.error("Failed to parse GH_SECRETS or GH_VARS as JSON:", e.message);
		process.exit(1);
	}

	try {
		process.stdout.write(renderEnv(manifest, ghSecrets, ghVars));
	} catch (e) {
		console.error(e.message);
		process.exit(1);
	}
}
```

- [ ] **Step 2: Delete the old file**

```bash
git rm application/frontend/scripts/render-env.mjs
```

- [ ] **Step 3: Fix the import in the test file**

In `application/frontend/tests/scripts/render-env.test.mjs` line 2, change:

```js
import { renderEnv } from "../../scripts/render-env.mjs";
```

to:

```js
import { renderEnv } from "../../../infra/scripts/render-env.mjs";
```

- [ ] **Step 4: Run tests to confirm the import resolves**

```bash
cd application/frontend
bun test tests/scripts/render-env.test.mjs
```

Expected: 7 tests pass, 0 fail.

- [ ] **Step 5: Commit**

```bash
git add application/infra/scripts/render-env.mjs \
        application/frontend/tests/scripts/render-env.test.mjs
git commit -m "refactor(infra): move render-env.mjs from frontend/scripts to infra/scripts"
```

______________________________________________________________________

## Task 3: Update deploy-dev.yml

**Files:**

- Modify: `.github/workflows/deploy-dev.yml`

Three changes:

1. Add `application/infra/**` to `on.push.paths`, remove `.github/secrets.dev.yaml` (now covered by infra trigger).
1. Update the `render-env` node call path from `scripts/render-env.mjs` → `../infra/scripts/render-env.mjs`.
1. Add a "Sync Apache config" step after "Configure SSH" and before "Sync env file".

- [ ] **Step 1: Update trigger paths**

In `.github/workflows/deploy-dev.yml`, change the `paths:` block from:

```yaml
    paths:
      - "application/frontend/**"
      - ".github/workflows/deploy-dev.yml"
      - ".github/secrets.dev.yaml"
```

to:

```yaml
    paths:
      - "application/frontend/**"
      - "application/infra/**"
      - ".github/workflows/deploy-dev.yml"
```

- [ ] **Step 2: Update the render-env script path**

Change line 72 from:

```yaml
          node scripts/render-env.mjs ../../.github/secrets.dev.yaml \
```

to:

```yaml
          node ../infra/scripts/render-env.mjs ../../.github/secrets.dev.yaml \
```

- [ ] **Step 3: Add the "Sync Apache config" step**

Insert this step between "Configure SSH" (ends at the `known_hosts` line) and "Sync env file":

```yaml
      # Atomically swap the Apache fragment on the server, run configtest, reload on success,
      # or roll back to the previous file on failure — all in one SSH session.
      - name: Sync Apache config
        env:
          APACHE_CONF: /home/ocs/domains/dev.ocs.com.ua/ocs-apache.conf
        run: |
          rsync -az --no-owner --no-group \
            ../infra/apache/dev.ocs.com.ua.ocs.conf \
            "${{ secrets.DEV_SSH_USER }}@${{ secrets.DEV_SSH_HOST }}:${APACHE_CONF}.tmp"
          ssh "${{ secrets.DEV_SSH_USER }}@${{ secrets.DEV_SSH_HOST }}" bash -s << EOF
            set -euo pipefail
            CONF="${APACHE_CONF}"
            cp "\$CONF" "\$CONF.bak"
            mv "\$CONF.tmp" "\$CONF"
            if apache2ctl configtest 2>/dev/null; then
              rm -f "\$CONF.bak"
              sudo /usr/bin/systemctl reload apache2
            else
              mv "\$CONF.bak" "\$CONF"
              rm -f "\$CONF.tmp"
              apache2ctl configtest
              exit 1
            fi
          EOF
```

- [ ] **Step 4: Run the full test suite to confirm nothing is broken locally**

```bash
cd application/frontend
bun test
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add .github/workflows/deploy-dev.yml
git commit -m "feat(ci): sync apache fragment with configtest and rollback"
```

______________________________________________________________________

## Task 4: Full run-through verification

- [ ] **Step 1: Confirm repo structure is correct**

```bash
ls application/infra/apache/
ls application/infra/scripts/
ls application/frontend/scripts/
```

Expected:

- `application/infra/apache/` contains `dev.ocs.com.ua.ocs.conf`

- `application/infra/scripts/` contains `render-env.mjs`

- `application/frontend/scripts/` does NOT contain `render-env.mjs`

- [ ] **Step 2: Run the full frontend test suite one more time**

```bash
cd application/frontend
bun test
```

Expected: all tests pass, no import errors.

- [ ] **Step 3: Verify workflow YAML parses cleanly**

```bash
cd ../..
python3 -c "import yaml; yaml.safe_load(open('.github/workflows/deploy-dev.yml'))" \
  && echo "YAML OK"
```

Expected: `YAML OK`

- [ ] **Step 4: Confirm git log looks right**

```bash
git log --oneline -5
```

Expected: three new commits on top — apache fragment, render-env move, CI update.
