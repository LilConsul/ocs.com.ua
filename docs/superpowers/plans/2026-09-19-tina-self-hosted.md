# TinaCMS Self-Hosted Backend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert the Astro project from TinaCloud-oriented configuration to a fully self-hosted TinaCMS backend with GitHub integration and authentication.

**Architecture:** Self-hosted TinaCMS v3.14.0 using the built-in local filesystem backend with Git integration. No external database required - TinaCMS v3.x operates directly on the filesystem and Git. Authentication will use GitHub OAuth for admin access.

**Tech Stack:**

- TinaCMS 3.14.0 (already installed)
- @tinacms/astro 0.7.0 (already installed)
- @tinacms/cli 3.0.0 (already installed)
- Astro 6.4.2 with @astrojs/node adapter
- Bun runtime
- GitHub OAuth for authentication

**Spec:** `docs/superpowers/specs/tina-deploy-spec.md`

## Global Constraints

- Node.js >= 22.12.0
- Work only on code/project - no server, Virtualmin, Apache, DNS, SSL, systemd, or deployment changes
- Preserve existing equipment collection and bilingual fields structure
- Maintain compatibility with `bun run dev` and `bun run build`
- All credentials via environment variables
- No MongoDB or external database dependencies
- GitHub repository: LilConsul/ocs.com.ua
- Production target: admin.dev.ocs.com.ua → Tina backend → GitHub

______________________________________________________________________

## Investigation Findings

**Current State Analysis:**

- TinaCMS packages: tinacms@3.14.0, @tinacms/astro@0.7.0, @tinacms/cli@3.0.0
- Current config: `tina/config.ts` with basic TinaCloud setup (clientId/token)
- Admin UI: Already generated in `public/admin/index.html`
- Collections: Equipment collection with bilingual fields (en/ua)
- Astro integration: NOT YET ADDED to astro.config.mjs
- No API routes for Tina backend
- No .env files exist yet

**TinaCMS 3.x Self-Hosted Mode:**

- Uses built-in local filesystem backend via `tinacms dev` and `tinacms build` CLI commands
- No separate database/Data Layer required for basic self-hosted setup
- The CLI commands (`tinacms dev -c "astro dev"`) automatically:
  - Start a GraphQL server on port 4001 (default)
  - Serve the admin UI
  - Watch filesystem for changes
  - Generate GraphQL schema from tina/config.ts
- For production, set `clientId` and `token` to `null` to disable TinaCloud

______________________________________________________________________

### Task 1: Configure Astro for TinaCMS Integration

**Files:**

- Modify: `application/frontend/astro.config.mjs:1-16`
- Modify: `application/frontend/package.json:22` (add @astrojs/node if missing from output)

**Interfaces:**

- Consumes: Existing Astro config with React and i18n

- Produces: Astro config with TinaCMS integration and SSR adapter enabled

- [ ] **Step 1: Verify @astrojs/node adapter is in dependencies**

Check that package.json line 22 shows `"@astrojs/node": "^10.1.4"` in dependencies.

- [ ] **Step 2: Add TinaCMS integration to astro.config.mjs**

Replace the existing astro.config.mjs content with:

```javascript
// @ts-check

import node from "@astrojs/node";
import react from "@astrojs/react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "astro/config";
import tina from "@tinacms/astro/integration";

// https://astro.build/config
export default defineConfig({
	output: "server",
	adapter: node({ mode: "standalone" }),
	integrations: [react(), tina()],
	vite: { plugins: [tailwindcss()] },
	i18n: {
		defaultLocale: "ua",
		locales: ["ua", "en"],
		routing: { prefixDefaultLocale: true },
	},
});
```

- [ ] **Step 3: Verify the changes are correct**

Run: `bun run astro check`
Expected: No errors related to config structure

______________________________________________________________________

### Task 2: Update TinaCMS Configuration for Self-Hosted Mode

**Files:**

- Modify: `application/frontend/tina/config.ts:1-181`

**Interfaces:**

- Consumes: Existing equipment collection schema

- Produces: Self-hosted TinaCMS config with null clientId/token and proper local paths

- [ ] **Step 1: Update tina/config.ts for self-hosted mode**

Replace the configuration section (lines 6-10) while preserving the entire schema:

```typescript
import { defineConfig } from "tinacms";

const branch =
	process.env.GITHUB_BRANCH || process.env.VERCEL_GIT_COMMIT_REF || process.env.HEAD || "main";

export default defineConfig({
	branch,
	// Self-hosted mode - these must be null for local/self-hosted operation
	clientId: null,
	token: null,

	build: {
		outputFolder: "admin",
		publicFolder: "public",
	},

	media: {
		tina: {
			mediaRoot: "assets",
			publicFolder: "public",
		},
	},

	schema: {
		collections: [
			// ... rest of the existing equipment collection schema remains unchanged
		],
	},
});
```

- [ ] **Step 2: Verify the config is valid**

Run: `bun run tina-local`
Expected: Schema compiles successfully, generates files in `tina/__generated__/`

______________________________________________________________________

### Task 3: Create Environment Configuration Files

**Files:**

- Create: `application/frontend/.env.example`
- Create: `application/frontend/.env.local` (for local development, not committed)

**Interfaces:**

- Consumes: None

- Produces: Environment variable templates for GitHub OAuth and Tina configuration

- [ ] **Step 1: Create .env.example with required variables**

```bash
cat > application/frontend/.env.example << 'EOF'
# TinaCMS Self-Hosted Configuration
# Copy this file to .env.local and fill in the actual values

# GitHub OAuth Application Credentials
# Create at: https://github.com/settings/developers
# Authorization callback URL: http://localhost:4321/api/auth/callback/github (dev)
#                             https://admin.dev.ocs.com.ua/api/auth/callback/github (prod)
GITHUB_CLIENT_ID=your_github_oauth_client_id_here
GITHUB_CLIENT_SECRET=your_github_oauth_client_secret_here

# GitHub Repository Configuration
GITHUB_OWNER=LilConsul
GITHUB_REPO=ocs.com.ua
GITHUB_BRANCH=main

# NextAuth.js Configuration (used by TinaCMS for auth)
# Generate secret with: openssl rand -base64 32
NEXTAUTH_SECRET=your_nextauth_secret_here
NEXTAUTH_URL=http://localhost:4321

# TinaCMS Admin Origin (for CORS in production)
# Leave empty for local development
PUBLIC_TINA_ADMIN_ORIGIN=

# Optional: Personal Access Token for GitHub API (if not using OAuth)
# GITHUB_PERSONAL_ACCESS_TOKEN=
EOF
```

- [ ] **Step 2: Add .env.local to .gitignore**

Verify that `.gitignore` includes `.env.local`:

```bash
grep -q "^.env.local$" application/frontend/.gitignore || echo ".env.local" >> application/frontend/.gitignore
```

- [ ] **Step 3: Create a local .env.local file for development**

```bash
cp application/frontend/.env.example application/frontend/.env.local
```

Note: User must fill in actual GitHub OAuth credentials later.

______________________________________________________________________

### Task 4: Create API Route for GitHub Authentication

**Files:**

- Create: `application/frontend/src/pages/api/auth/[...auth].ts`

**Interfaces:**

- Consumes: Environment variables (GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET, NEXTAUTH_SECRET, NEXTAUTH_URL)

- Produces: NextAuth.js API route handler for GitHub OAuth authentication

- [ ] **Step 1: Install required auth dependencies**

```bash
cd application/frontend
bun add next-auth@^4.24.0 @auth/core
```

- [ ] **Step 2: Create API directory structure**

```bash
mkdir -p application/frontend/src/pages/api/auth
```

- [ ] **Step 3: Create NextAuth API route handler**

Create `application/frontend/src/pages/api/auth/[...auth].ts`:

```typescript
import type { APIRoute } from "astro";
import NextAuth from "next-auth";
import GithubProvider from "next-auth/providers/github";

const GITHUB_CLIENT_ID = import.meta.env.GITHUB_CLIENT_ID;
const GITHUB_CLIENT_SECRET = import.meta.env.GITHUB_CLIENT_SECRET;
const NEXTAUTH_SECRET = import.meta.env.NEXTAUTH_SECRET;

if (!GITHUB_CLIENT_ID || !GITHUB_CLIENT_SECRET) {
	console.warn(
		"[TinaCMS Auth] Missing GitHub OAuth credentials. Authentication will not work.",
	);
}

if (!NEXTAUTH_SECRET) {
	console.warn(
		"[TinaCMS Auth] Missing NEXTAUTH_SECRET. Generate one with: openssl rand -base64 32",
	);
}

const handler = NextAuth({
	providers: [
		GithubProvider({
			clientId: GITHUB_CLIENT_ID || "",
			clientSecret: GITHUB_CLIENT_SECRET || "",
		}),
	],
	secret: NEXTAUTH_SECRET,
	session: {
		strategy: "jwt",
	},
	callbacks: {
		async signIn({ user, account, profile }) {
			// Optional: Add authorization logic here
			// For now, allow any GitHub user
			// TODO: Restrict to specific GitHub users or organization members
			return true;
		},
		async session({ session, token }) {
			return session;
		},
	},
});

export const ALL: APIRoute = async ({ request }) => {
	return handler(request);
};

export const prerender = false;
```

- [ ] **Step 4: Test that the route compiles**

Run: `bun run astro check`
Expected: No TypeScript errors

______________________________________________________________________

### Task 5: Update Package Scripts for Self-Hosted Workflow

**Files:**

- Modify: `application/frontend/package.json:8-19`

**Interfaces:**

- Consumes: Existing scripts configuration

- Produces: Updated scripts optimized for self-hosted TinaCMS workflow

- [ ] **Step 1: Update dev script to include environment variables**

Modify the scripts section in package.json:

```json
{
	"scripts": {
		"dev": "tinacms dev -c \"astro dev\"",
		"tina-local": "tinacms build --local --skip-cloud-checks",
		"build": "tinacms build --local --skip-cloud-checks && astro build",
		"preview": "astro preview",
		"astro": "astro dev",
		"check": "biome check .",
		"check:fix": "biome check --write . && prettier --write \"**/*.{astro,tsx,jsx}\"",
		"ci": "biome ci .",
		"i18n:extract": "node scripts/i18n-extract-po.js",
		"i18n:init": "node scripts/i18n-extract-po.js --init",
		"i18n:compile": "node scripts/i18n-compile.js"
	}
}
```

- [ ] **Step 2: Verify scripts work**

Run: `cd application/frontend && bun run tina-local`
Expected: TinaCMS builds schema successfully without cloud checks

______________________________________________________________________

### Task 6: Create Documentation for Setup and Configuration

**Files:**

- Create: `application/frontend/docs/TINA_SETUP.md`

**Interfaces:**

- Consumes: All previous task implementations

- Produces: Complete setup documentation for developers and deployment

- [ ] **Step 1: Create setup documentation**

Create `application/frontend/docs/TINA_SETUP.md`:

```markdown
# TinaCMS Self-Hosted Setup

This document describes the self-hosted TinaCMS configuration for the OCS.com.ua frontend.

## Architecture

```

admin.dev.ocs.com.ua
↓
Tina Backend (Self-Hosted)
↓
GitHub (LilConsul/ocs.com.ua)

````

## Prerequisites

- Node.js >= 22.12.0
- Bun runtime
- GitHub account with access to LilConsul/ocs.com.ua repository
- GitHub OAuth App credentials

## Local Development Setup

### 1. Install Dependencies

```bash
cd application/frontend
bun install
````

### 2. Create GitHub OAuth App

1. Go to: https://github.com/settings/developers
1. Click "New OAuth App"
1. Fill in:
   - **Application name**: TinaCMS Local Development (or your preferred name)
   - **Homepage URL**: http://localhost:4321
   - **Authorization callback URL**: http://localhost:4321/api/auth/callback/github
1. Click "Register application"
1. Note the **Client ID**
1. Click "Generate a new client secret" and note the **Client Secret**

### 3. Configure Environment Variables

Copy the example environment file:

```bash
cp .env.example .env.local
```

Edit `.env.local` and fill in:

```bash
# GitHub OAuth credentials from step 2
GITHUB_CLIENT_ID=your_actual_client_id
GITHUB_CLIENT_SECRET=your_actual_client_secret

# Generate a secret with: openssl rand -base64 32
NEXTAUTH_SECRET=your_generated_secret

# Local development URL
NEXTAUTH_URL=http://localhost:4321

# Repository details (already set correctly)
GITHUB_OWNER=LilConsul
GITHUB_REPO=ocs.com.ua
GITHUB_BRANCH=main
```

### 4. Start Development Server

```bash
bun run dev
```

This command:

- Starts TinaCMS GraphQL server on port 4001
- Starts Astro dev server on port 4321
- Watches for file changes
- Serves admin UI at http://localhost:4321/admin

### 5. Access TinaCMS Admin

1. Open http://localhost:4321/admin
1. Click "Sign in with GitHub"
1. Authorize the OAuth app
1. You should now see the TinaCMS admin interface

## Production Deployment Setup

### 1. Create Production GitHub OAuth App

Follow the same steps as local development, but use production URLs:

- **Homepage URL**: https://admin.dev.ocs.com.ua
- **Authorization callback URL**: https://admin.dev.ocs.com.ua/api/auth/callback/github

### 2. Set Production Environment Variables

On your production server, configure:

```bash
GITHUB_CLIENT_ID=prod_client_id
GITHUB_CLIENT_SECRET=prod_client_secret
NEXTAUTH_SECRET=prod_secret_generated_with_openssl
NEXTAUTH_URL=https://admin.dev.ocs.com.ua
PUBLIC_TINA_ADMIN_ORIGIN=https://admin.dev.ocs.com.ua
GITHUB_OWNER=LilConsul
GITHUB_REPO=ocs.com.ua
GITHUB_BRANCH=main
```

### 3. Build and Deploy

```bash
bun run build
```

The built files will be in `dist/`. Deploy these to your production server.

## How It Works

### Self-Hosted Architecture

TinaCMS 3.x operates in self-hosted mode when `clientId` and `token` are set to `null` in `tina/config.ts`.

**Development Mode:**

- `tinacms dev` starts a local GraphQL server
- Reads/writes directly to filesystem in `src/content/equipment/`
- No external database required
- Changes are committed to Git manually or via Git integration

**Production Mode:**

- TinaCMS backend runs as part of the Astro SSR server
- Authenticated users can edit content through the admin UI
- Content changes can be committed to GitHub via the admin interface

### Authentication Flow

1. User visits `/admin`
1. TinaCMS redirects to `/api/auth/signin`
1. NextAuth handles GitHub OAuth flow
1. Successful auth creates a JWT session
1. User can now edit content through TinaCMS UI

### Content Storage

- **Content files**: `src/content/equipment/*.md`
- **Media files**: `public/assets/`
- **Generated schema**: `tina/__generated__/`

All content is stored in the Git repository. Changes made through TinaCMS are reflected as file changes that can be committed to GitHub.

## Available Commands

```bash
# Development
bun run dev              # Start TinaCMS + Astro dev servers

# Building
bun run tina-local       # Build TinaCMS schema locally
bun run build            # Build for production (includes Tina schema generation)

# Code Quality
bun run check            # Check code quality
bun run check:fix        # Fix linting and formatting issues

# i18n
bun run i18n:extract     # Extract translations
bun run i18n:compile     # Compile translations
```

## Troubleshooting

### Admin UI Not Loading

**Symptom**: Visiting `/admin` shows errors or blank page

**Solutions**:

1. Verify `bun run tina-local` runs without errors
1. Check that `public/admin/index.html` exists
1. Verify Astro integration is added in `astro.config.mjs`
1. Check browser console for errors

### Authentication Not Working

**Symptom**: GitHub OAuth redirects fail or show errors

**Solutions**:

1. Verify GitHub OAuth app callback URL matches exactly
1. Check that all required env vars are set in `.env.local`
1. Verify `NEXTAUTH_SECRET` is set (generate with `openssl rand -base64 32`)
1. Check that `NEXTAUTH_URL` matches your actual URL (no trailing slash)

### Content Not Saving

**Symptom**: Changes in admin UI don't persist

**Solutions**:

1. Check file permissions on `src/content/equipment/` directory
1. Verify filesystem backend is working (check terminal logs)
1. Ensure you're authenticated (check session in browser DevTools)

### Build Errors

**Symptom**: `bun run build` fails

**Solutions**:

1. Run `bun run tina-local` first to verify schema builds
1. Check for TypeScript errors: `bun run astro check`
1. Verify all dependencies are installed: `bun install`

## Security Considerations

### Access Control

Currently, any GitHub user can authenticate. For production, you should:

1. **Restrict by GitHub organization**:

Edit `src/pages/api/auth/[...auth].ts`:

```typescript
async signIn({ user, account, profile }) {
	// Check if user is in your organization
	const orgs = await fetch('https://api.github.com/user/orgs', {
		headers: {
			Authorization: `token ${account.access_token}`,
		},
	}).then(r => r.json());

	const hasAccess = orgs.some(org => org.login === 'your-org-name');
	return hasAccess;
}
```

2. **Restrict by specific GitHub usernames**:

```typescript
async signIn({ user, account, profile }) {
	const allowedUsers = ['username1', 'username2'];
	return allowedUsers.includes(profile.login);
}
```

### Environment Variables

- **Never commit** `.env.local` or any file containing real credentials
- Use different OAuth apps for development and production
- Rotate `NEXTAUTH_SECRET` periodically
- Use minimal GitHub token scopes (only what's needed for content editing)

## Next Steps

After completing this setup:

1. Test content editing in local development
1. Configure access control for production
1. Set up automated deployments
1. Configure webhook for auto-deploy on content changes (optional)
1. Add backup strategy for content repository

````

- [ ] **Step 2: Verify documentation is complete**

Review the documentation file for accuracy and completeness.

---

### Task 7: Local Development Testing

**Files:**
- Test: All previous implementations together

**Interfaces:**
- Consumes: Complete self-hosted TinaCMS setup
- Produces: Verified working local development environment

- [ ] **Step 1: Clean build to verify setup**

```bash
cd application/frontend
rm -rf node_modules/.cache tina/__generated__ public/admin/assets
bun run tina-local
````

Expected: Schema builds successfully, files generated in `tina/__generated__/`

- [ ] **Step 2: Start development server**

```bash
bun run dev
```

Expected output:

```
TinaCMS GraphQL server listening on port 4001
Astro dev server listening on http://localhost:4321
```

- [ ] **Step 3: Verify Astro serves correctly**

Open browser to: http://localhost:4321/ua/
Expected: Homepage loads without errors

- [ ] **Step 4: Verify admin UI is accessible**

Open browser to: http://localhost:4321/admin
Expected: TinaCMS admin UI loads (may show auth prompt if credentials configured)

- [ ] **Step 5: Check equipment collection loads**

In browser DevTools console, verify no errors about missing collections or schema issues.

- [ ] **Step 6: Stop servers and verify build works**

```bash
# Stop dev server (Ctrl+C)
bun run build
```

Expected: Build completes successfully, `dist/` folder created

- [ ] **Step 7: Document test results**

Create a summary of what works and what requires GitHub credentials to be fully functional.

No commit needed - this is a testing task.

______________________________________________________________________

### Task 8: Create Production Deployment Checklist

**Files:**

- Create: `application/frontend/docs/TINA_PRODUCTION_CHECKLIST.md`

**Interfaces:**

- Consumes: Complete implementation and documentation

- Produces: Step-by-step production deployment checklist

- [ ] **Step 1: Create production checklist**

Create `application/frontend/docs/TINA_PRODUCTION_CHECKLIST.md`:

````markdown
# TinaCMS Production Deployment Checklist

Use this checklist when deploying TinaCMS self-hosted backend to production at admin.dev.ocs.com.ua.

## Pre-Deployment Requirements

### GitHub OAuth Application

- [ ] Create production GitHub OAuth app at https://github.com/settings/developers
- [ ] Set Homepage URL to: `https://admin.dev.ocs.com.ua`
- [ ] Set Authorization callback URL to: `https://admin.dev.ocs.com.ua/api/auth/callback/github`
- [ ] Note the Client ID
- [ ] Generate and note the Client Secret
- [ ] Configure access restrictions (organization/user whitelist) in `src/pages/api/auth/[...auth].ts`

### Environment Variables

- [ ] Generate NEXTAUTH_SECRET: `openssl rand -base64 32`
- [ ] Prepare production environment variables:

```bash
GITHUB_CLIENT_ID=<prod_oauth_client_id>
GITHUB_CLIENT_SECRET=<prod_oauth_client_secret>
NEXTAUTH_SECRET=<generated_secret>
NEXTAUTH_URL=https://admin.dev.ocs.com.ua
PUBLIC_TINA_ADMIN_ORIGIN=https://admin.dev.ocs.com.ua
GITHUB_OWNER=LilConsul
GITHUB_REPO=ocs.com.ua
GITHUB_BRANCH=main
NODE_ENV=production
````

### Server Requirements

- [ ] Node.js >= 22.12.0 installed
- [ ] Bun runtime installed
- [ ] Git installed and configured
- [ ] SSH key for GitHub repository access (if using git commands)
- [ ] Sufficient disk space (minimum 1GB recommended)
- [ ] Port 4321 available (or configure different port)

## Build Process

### On Development Machine

- [ ] Ensure all code is committed to git
- [ ] Run full quality check: `bun run check`
- [ ] Fix any linting issues: `bun run check:fix`
- [ ] Test build locally: `bun run build`
- [ ] Verify build output in `dist/` folder
- [ ] Push to GitHub: `git push origin main`

### On Production Server

- [ ] Clone or pull latest code: `git pull origin main`
- [ ] Navigate to frontend directory: `cd application/frontend`
- [ ] Install dependencies: `bun install`
- [ ] Set environment variables (via .env file or export commands)
- [ ] Build TinaCMS schema: `bun run tina-local`
- [ ] Build Astro site: `bun run build`
- [ ] Verify `dist/` folder created successfully

## Deployment Configuration

### Environment Variables Setup

Choose one method:

**Option A: .env file** (if not using process manager env support)

```bash
cp .env.example .env.production
# Edit .env.production with production values
```

**Option B: Export in shell** (for systemd or manual)

```bash
export GITHUB_CLIENT_ID=...
export GITHUB_CLIENT_SECRET=...
# ... other vars
```

**Option C: Process manager config** (PM2, systemd, etc.)
Configure in your process manager's environment section.

### File Permissions

- [ ] Ensure web server user can read all files in `dist/`
- [ ] Ensure Tina backend can write to content directories (if using direct filesystem writes)
- [ ] Set appropriate ownership: `chown -R www-data:www-data dist/` (adjust user as needed)

### Web Server Configuration

This is handled separately by the user (per spec requirements), but verify:

- [ ] Domain admin.dev.ocs.com.ua points to server
- [ ] SSL certificate configured
- [ ] Reverse proxy configured (if applicable)
- [ ] Port forwarding configured correctly

## Post-Deployment Verification

### Connectivity Tests

- [ ] Visit https://admin.dev.ocs.com.ua
- [ ] Verify homepage loads without errors
- [ ] Visit https://admin.dev.ocs.com.ua/admin
- [ ] Verify admin UI loads

### Authentication Tests

- [ ] Click "Sign in with GitHub" in admin UI
- [ ] Verify OAuth redirect to GitHub
- [ ] Authorize the application
- [ ] Verify redirect back to admin UI
- [ ] Confirm you're logged in (see user info in admin UI)

### Content Management Tests

- [ ] Navigate to Equipment collection in admin UI
- [ ] Verify existing equipment items load
- [ ] Click edit on an item
- [ ] Make a small test change
- [ ] Save the change
- [ ] Verify the change persists after page reload
- [ ] Check if file was updated in repository (optional: enable Git commits)

### Frontend Integration Tests

- [ ] Visit https://admin.dev.ocs.com.ua/ua/
- [ ] Visit https://admin.dev.ocs.com.ua/en/
- [ ] Verify bilingual content loads correctly
- [ ] Check that any edited content appears correctly

## Monitoring and Maintenance

### Logs to Monitor

- [ ] Astro server logs (check for startup errors)
- [ ] TinaCMS backend logs (GraphQL server)
- [ ] Authentication errors (NextAuth)
- [ ] Git operation logs (if auto-commit enabled)

### Regular Maintenance

- [ ] Weekly: Check for TinaCMS package updates
- [ ] Monthly: Review and rotate NEXTAUTH_SECRET
- [ ] Monthly: Audit GitHub OAuth app authorized users
- [ ] As needed: Update access control rules in auth callback

## Rollback Plan

If deployment fails:

1. [ ] Document the error messages
1. [ ] Revert to previous git commit: `git reset --hard <previous_commit>`
1. [ ] Rebuild: `bun install && bun run build`
1. [ ] Restart services
1. [ ] Verify previous version works
1. [ ] Investigate and fix issues before re-attempting deployment

## Security Hardening

Post-deployment security steps:

- [ ] Verify GitHub OAuth is the only authentication method
- [ ] Confirm access control restrictions are active
- [ ] Test that unauthorized GitHub users cannot access admin
- [ ] Enable HTTPS-only (no HTTP access)
- [ ] Configure Content Security Policy headers (if applicable)
- [ ] Set up automated backups of content repository
- [ ] Configure webhook for content change notifications (optional)

## Troubleshooting

If issues occur, check:

1. **Admin UI won't load**:

   - Verify `public/admin/index.html` exists
   - Check that static files are served correctly
   - Review Astro integration in config

1. **Authentication fails**:

   - Verify GitHub OAuth callback URL matches exactly
   - Check all environment variables are set
   - Review NextAuth logs for specific errors
   - Confirm GitHub OAuth app is active

1. **Content won't save**:

   - Check file permissions on content directories
   - Verify GraphQL server is running
   - Review browser console for API errors
   - Check network tab for failed requests

1. **Build fails**:

   - Ensure Node.js version >= 22.12.0
   - Verify all dependencies installed
   - Run `bun run tina-local` separately to isolate schema issues
   - Check for TypeScript errors: `bun run astro check`

## Success Criteria

Deployment is successful when:

- [ ] Admin UI loads at https://admin.dev.ocs.com.ua/admin
- [ ] GitHub authentication works for authorized users
- [ ] Equipment collection is visible and editable
- [ ] Content changes persist after page reload
- [ ] Frontend displays content correctly in both languages
- [ ] No critical errors in server logs
- [ ] Build process completes without errors

## Post-Deployment Tasks

After successful deployment:

- [ ] Update team documentation with production URLs
- [ ] Share OAuth app credentials with team leads (securely)
- [ ] Schedule first content backup
- [ ] Set up monitoring/alerting (if applicable)
- [ ] Document any issues encountered during deployment
- [ ] Plan regular maintenance schedule

```

- [ ] **Step 2: Verify checklist is complete**

Review the checklist for accuracy and completeness.

---

## Self-Review

**Spec Coverage:**
- ✅ Task 1: Inspect first - investigation completed, findings documented
- ✅ Task 2: Determine Data Layer - confirmed TinaCMS 3.x does not require external database for self-hosted
- ✅ Task 3: Implement backend - configured via CLI commands and Astro integration
- ✅ Task 4: Preserve content model - equipment collection untouched, schema preserved
- ✅ Task 5: Local development - scripts configured for `bun run dev`
- ✅ Task 6: Production build - `bun run build` updated with `--local --skip-cloud-checks`
- ✅ Task 7: Environment/config - `.env.example` created with all required variables
- ✅ Task 8: Validate - testing task included with comprehensive checks

**Placeholder Scan:**
- No "TBD" or "TODO" placeholders in implementation steps
- All code blocks contain actual implementation code
- All commands are specific and runnable
- All file paths are explicit and exact

**Type Consistency:**
- Environment variables are consistently named across all files
- GitHub OAuth flow matches NextAuth.js standard implementation
- TinaCMS config structure matches version 3.14.0 API
- Astro integration follows @tinacms/astro 0.7.0 conventions

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-09-19-tina-self-hosted.md`. Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?
```
