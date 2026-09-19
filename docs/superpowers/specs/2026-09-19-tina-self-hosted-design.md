# TinaCMS Self-Hosted Deployment Design

**Date:** 2026-09-19
**Status:** Design - Pending Investigation & Approval

**⚠️ IMPORTANT:** This design contains assumptions that must be verified before implementation. Do not make any server changes until Phase 1 investigation is complete.

## Next Steps (Before Implementation)

1. **Investigate database requirement** (Section 4: Database Investigation)

   - Does our TinaCMS setup actually require a database adapter?
   - Can `createLocalDatabase()` work in production?
   - If database required, which adapter is simplest for our small deployment?

1. **Verify all package APIs** (Phase 1 of Migration Plan)

   - Inspect installed Tina package type definitions
   - Document actual API signatures
   - Update this spec with verified implementation details

1. **Build and test backend locally** against verified APIs

1. **Update this spec** with findings before server deployment

1. **Get final approval** on updated spec

1. **Then** proceed with server deployment (Phase 2+)

______________________________________________________________________

## Overview

Deploy TinaCMS in self-hosted mode with a separate backend service on `dev.ocs.com.ua`. Content editors authenticate via GitHub OAuth, edit content through TinaCMS admin UI, and changes automatically trigger Astro site rebuilds via GitHub Actions.

**Status:** This design contains assumptions that require verification before implementation. See "Decisions Pending Verification" section below.

______________________________________________________________________

## Architecture

```
Internet
  │
  ▼
Virtualmin-managed Apache
  │
  ├── dev.ocs.com.ua
  │    └── Astro Static Site (/en, /ua, /assets)
  │
  └── admin.dev.ocs.com.ua
       └── Reverse Proxy → http://127.0.0.1:4001
           │
           └── TinaCMS Backend Service (systemd)
               ├── TinaNodeBackend
               ├── Auth.js (GitHub OAuth)
               ├── GitHub Provider (Git operations)
               └── Tina Data Layer
                   │
                   ├── Database Adapter (TBD - pending investigation)
                   │   └── Options: MongoDB, file-based, or other supported adapter
                   │
                   └── GitHub Repository (source of truth)
                       │
                       └── Push Event
                           │
                           └── GitHub Actions
                               ├── Build Astro
                               └── Deploy to dev.ocs.com.ua
```

### Architecture Layers

**Content Source of Truth:**

- **GitHub repository** - All content files (Markdown, images) stored in Git
- Versioned, backed up, auditable history

**TinaCMS Data Layer:**

- Query/index layer that TinaCMS uses to serve GraphQL API
- **May** require a database adapter depending on TinaCMS version and configuration
- Database choice pending investigation (see below)

**Generated Website:**

- **Astro static site** - Built from Git content
- Served by Apache as static HTML/CSS/JS
- No runtime dependency on TinaCMS or database

### Virtualmin Responsibilities

**Virtualmin owns:**

- Virtual server/domain creation for `dev.ocs.com.ua` and `admin.dev.ocs.com.ua`
- Apache virtual host configuration
- SSL certificate management (Let's Encrypt or manual)
- DNS records for both domains
- HTTP → HTTPS redirects
- DocumentRoot configuration

**Important:** Do not replace Virtualmin-generated virtual hosts with manually maintained Apache configuration files. Application-specific directives (such as the Tina reverse proxy) are added through Virtualmin's web configuration interface or by editing the Virtualmin-managed virtual host files.

### Key Architectural Decisions

1. **Separate Backend Service** - TinaCMS backend runs as standalone systemd service, not embedded in Astro
1. **Subdomain for Admin** - `admin.dev.ocs.com.ua` keeps admin separate from public site
1. **Git as Source of Truth** - All content in GitHub; any database is only for TinaCMS Data Layer indexing
1. **GitHub Actions for Deployment** - Automated build/deploy on content changes
1. **Virtualmin for Infrastructure** - Virtualmin manages Apache, SSL, DNS (no manual vhost files)
1. **Atomic Deployments** - Symlink-based releases for instant rollback

### Decisions Pending Verification

⚠️ **The following must be investigated before implementation:**

1. **Tina Data Layer Database Requirement**

   - Does TinaNodeBackend with our installed versions actually require a database adapter?
   - What happens with `createLocalDatabase()` in production? (filesystem-only option?)
   - Are there file-based alternatives to external databases?

1. **Database Adapter Choice** (if required)

   - MongoDB Atlas (managed, free tier 512MB, adds external dependency)
   - Self-hosted MongoDB (more control, more ops overhead)
   - Vercel KV or other officially supported adapters
   - File-based/local alternatives if they exist

1. **Installed Package APIs**

   - Exact API signatures for TinaNodeBackend
   - GitHub provider configuration options
   - Database adapter requirements and configuration
   - Auth.js integration pattern
   - CLI build commands and flags

1. **GitHub OAuth Integration**

   - Actual callback URL format
   - Authorization mechanism (Tina users vs custom allowlist)
   - Session management approach

1. **Deployment to Virtualmin-managed DocumentRoot**

   - How symlink strategy interacts with Virtualmin's structure
   - Permissions and ownership requirements

**Investigation Steps (before any implementation):**

1. Read installed package type definitions
1. Check TinaCMS self-hosted documentation for our exact versions
1. Test minimal backend locally with different database configurations
1. Document findings and update this spec
1. Only then proceed to server deployment

### Critical Constraints

⚠️ **Production WordPress Isolation:**

The existing `ocs.com.ua` WordPress virtual server and `/home/ocs/public_html` must not be modified during development deployment. All work is isolated to:

- `dev.ocs.com.ua` (Astro static site)
- `admin.dev.ocs.com.ua` (TinaCMS backend)

No changes to production WordPress infrastructure.

______________________________________________________________________

## Component Breakdown

### 1. Apache Configuration via Virtualmin

**Virtualmin manages:**

- `dev.ocs.com.ua` virtual host
- `admin.dev.ocs.com.ua` virtual host
- SSL certificates (Let's Encrypt auto-renewal)
- HTTP → HTTPS redirects
- DocumentRoot configuration
- Log file locations

**Application-specific Apache configuration:**

#### Public Site: `dev.ocs.com.ua`

**DocumentRoot:** `/home/ocs/domains/dev.ocs.com.ua/public_html` (symlink to current release)

**Configuration notes:**

- Static file serving (Astro pre-rendered pages)
- No SPA rewrite rules needed (Astro generates static HTML files)
- Security headers (added via Virtualmin or Apache config)
- Gzip compression (standard Apache config)

#### TinaCMS Admin: `admin.dev.ocs.com.ua`

**Purpose:** Reverse proxy to TinaCMS backend service

**Required directives** (added to Virtualmin-managed vhost):

```apache
ProxyPreserveHost On
ProxyRequests Off
ProxyPass / http://127.0.0.1:4001/
ProxyPassReverse / http://127.0.0.1:4001/
```

**WebSocket support** (only if needed, validate during implementation):

```apache
RewriteEngine on
RewriteCond %{HTTP:Upgrade} websocket [NC]
RewriteCond %{HTTP:Connection} upgrade [NC]
RewriteRule ^/?(.*) "ws://127.0.0.1:4001/$1" [P,L]
```

**⚠️ Important:**

- Do not manually create `/etc/apache2/sites-available/dev.ocs.com.ua.conf`
- Use Virtualmin UI to edit virtual host configuration
- Application directives added through Virtualmin interface

**Required Apache modules:**

Verify that required modules are enabled (Virtualmin may have already enabled them):

```bash
# Required for reverse proxy
sudo a2enmod proxy
sudo a2enmod proxy_http

# Only if WebSocket support is actually needed (validate first)
# sudo a2enmod proxy_wstunnel
```

______________________________________________________________________

### 2. TinaCMS Backend Service

#### Directory Structure

```
/home/ocs/domains/dev.ocs.com.ua/app/ocs.com.ua/application/tina-backend/
├── package.json
├── bun.lockb
├── .env                    # Environment variables (not in Git)
├── .gitignore
├── server.js               # HTTP server wrapper
├── tina/
│   ├── config.ts           # TinaCMS schema
│   ├── database.ts         # Database client setup
│   └── __generated__/
│       └── databaseClient.ts   # Auto-generated by tinacms build
└── .env.example            # Template for environment variables
```

**Note:** Avoid maintaining two independent `tina/config.ts` files (frontend and backend). Determine the supported configuration layout and reuse the frontend Tina schema/configuration where possible to prevent schema drift.

#### File: `package.json`

**Important:** Package versions and dependencies must be verified against current Tina ecosystem before implementation. The versions shown below are indicative.

**Note:** Database adapter packages (mongodb, mongodb-level) are shown as examples. Actual dependencies will be determined after investigating what the installed TinaCMS version requires.

```json
{
  "name": "tina-backend",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "bun run server.js",
    "build": "tinacms build --local --skip-cloud-checks",
    "generate": "tinacms build --local --skip-cloud-checks"
  },
  "dependencies": {
    "@tinacms/cli": "^3.0.0",
    "@tinacms/datalayer": "^2.0.30",
    "tinacms": "^3.14.0",
    "tinacms-gitprovider-github": "^4.1.17",
    "tinacms-authjs": "^24.0.4",
    "next-auth": "^4.24.15"

    // Database adapter dependencies (TBD based on investigation):
    // "mongodb": "^7.6.0",
    // "mongodb-level": "^0.0.4",
    // OR other adapter as determined by package inspection
  }
}
```

**Verification required before implementation:**

- Confirm compatible versions of `@tinacms/datalayer`
- Verify `tinacms-gitprovider-github` API
- Verify `tinacms-authjs` integration API
- **Investigate database adapter requirement:** Does TinaNodeBackend require a database adapter, or can it use `createLocalDatabase()` in production?
- **If database required:** Verify which adapters are officially supported and their APIs
- Check for any peer dependency warnings

#### File: `tina/database.ts`

**Purpose:** Configure Git provider and database adapter

**Note:** This implementation is conceptual pending investigation of:

1. Whether a database adapter is required
1. Which adapter to use if required
1. Actual API signatures from installed packages

```typescript
import { createDatabase, createLocalDatabase } from '@tinacms/datalayer'
import { GitHubProvider } from 'tinacms-gitprovider-github'
// Database adapter import TBD based on investigation

const isLocal = process.env.TINA_PUBLIC_IS_LOCAL === 'true'
const branch = process.env.GITHUB_BRANCH || 'main'

if (!isLocal && !branch) {
  throw new Error('GITHUB_BRANCH environment variable is required in production')
}

export default isLocal
  ? // Local development: in-memory database, writes to filesystem
    createLocalDatabase()
  : // Production: Database adapter (if required) + GitHub for storage
    createDatabase({
      gitProvider: new GitHubProvider({
        owner: process.env.GITHUB_OWNER!,
        repo: process.env.GITHUB_REPO!,
        token: process.env.GITHUB_PERSONAL_ACCESS_TOKEN!,
        branch,
        commitMessage: process.env.GIT_COMMIT_MESSAGE || 'chore: update content via TinaCMS',
        rootPath: 'application/frontend', // Path within repo to content root
      }),

      // Database adapter configuration (TBD)
      // Options under investigation:
      // 1. MongoDB via mongodb-level adapter
      // 2. Vercel KV or similar
      // 3. File-based local storage (if supported)
      // 4. Other officially supported adapters

      // Example if MongoDB is chosen:
      // databaseAdapter: new MongodbLevel<string, Record<string, any>>({
      //   mongoUri: process.env.MONGODB_URI!,
      //   dbName: process.env.MONGODB_DATABASE || 'ocs-cms',
      //   collectionName: process.env.MONGODB_COLLECTION || 'tinacms',
      // }),
    })
```

**Key configuration:**

- `rootPath: 'application/frontend'` - Points to where content lives in the monorepo
- Git commits go directly to `main` branch (triggers GitHub Actions)
- **Database role (if required):** Used by Tina's Data Layer as the query/index layer; Git/Markdown remains the source of truth

**Investigation priority:**

1. Check if `createLocalDatabase()` can be used in production (filesystem-only)
1. If database required, compare operational complexity of different adapters
1. Choose simplest option that meets requirements

#### File: `server.js`

**Purpose:** HTTP server wrapper for TinaNodeBackend

```javascript
import http from 'http'

const PORT = process.env.PORT || 4001
const HOST = process.env.HOST || '127.0.0.1'

// Parse request body for POST/PUT requests
async function parseBody(req) {
  return new Promise((resolve, reject) => {
    if (req.method !== 'POST' && req.method !== 'PUT' && req.method !== 'PATCH') {
      resolve(null)
      return
    }

    let body = ''
    req.on('data', chunk => { body += chunk.toString() })
    req.on('end', () => {
      try {
        req.body = body ? JSON.parse(body) : {}
        resolve(req.body)
      } catch (e) {
        // Not JSON, leave as string
        req.body = body
        resolve(req.body)
      }
    })
    req.on('error', reject)
  })
}

const server = http.createServer(async (req, res) => {
  try {
    // Health check endpoint
    if (req.url === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV,
      }))
      return
    }

    // Parse body before passing to TinaCMS handler
    await parseBody(req)

    // Import and invoke TinaCMS handler
    // The actual handler setup will be determined from installed Tina versions
    const { default: handler } = await import('./handler.js')
    await handler(req, res)
  } catch (error) {
    console.error('[TinaCMS Server Error]', error)

    if (!res.headersSent) {
      res.writeHead(500, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({
        error: 'Internal Server Error',
        message: process.env.NODE_ENV === 'development' ? error.message : undefined
      }))
    }
  }
})

server.listen(PORT, HOST, () => {
  console.log(`[TinaCMS Backend] Server listening on http://${HOST}:${PORT}`)
  console.log(`[TinaCMS Backend] Mode: ${process.env.NODE_ENV || 'development'}`)
  console.log(`[TinaCMS Backend] Local: ${process.env.TINA_PUBLIC_IS_LOCAL === 'true'}`)
})

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('[TinaCMS Backend] SIGTERM received, shutting down gracefully')
  server.close(() => {
    console.log('[TinaCMS Backend] Server closed')
    process.exit(0)
  })
})

process.on('SIGINT', () => {
  console.log('[TinaCMS Backend] SIGINT received, shutting down gracefully')
  server.close(() => {
    console.log('[TinaCMS Backend] Server closed')
    process.exit(0)
  })
})
```

**Why a wrapper:**

- TinaNodeBackend expects Node.js `req`/`res`, not Web API `Request`/`Response`
- Handles body parsing for POST requests
- Provides health check endpoint at `/health` (separate from Tina's `/api/tina/*`)
- Provides graceful shutdown
- Simple HTTP server without framework overhead

#### File: `handler.js`

**Purpose:** TinaCMS backend handler with Auth.js authentication

**Note:** The exact implementation must be determined from the installed Tina package versions. The structure below is conceptual.

```javascript
import { TinaNodeBackend, LocalBackendAuthProvider } from '@tinacms/datalayer'
import { AuthJsBackendAuthProvider, TinaAuthJSOptions } from 'tinacms-authjs'
import GithubProvider from 'next-auth/providers/github'

// Import the generated database client
// This file is created by `tinacms build --local --skip-cloud-checks`
import databaseClient from './tina/__generated__/databaseClient.js'

const isLocal = process.env.TINA_PUBLIC_IS_LOCAL === 'true'

// Create TinaCMS backend handler
// Use Tina's documented Auth.js backend provider and user collection for authorization
// Do NOT implement custom TINA_ALLOWED_USERS authorization mechanism
const handler = TinaNodeBackend({
  authProvider: isLocal
    ? LocalBackendAuthProvider()
    : AuthJsBackendAuthProvider({
        authOptions: TinaAuthJSOptions({
          databaseClient,
          secret: process.env.NEXTAUTH_SECRET!,
          providers: [
            GithubProvider({
              clientId: process.env.GITHUB_OAUTH_CLIENT_ID!,
              clientSecret: process.env.GITHUB_OAUTH_CLIENT_SECRET!,
            }),
          ],
          // Use Tina's documented authorization mechanism
          // Exact API to be verified from installed package versions
        }),
      }),

  databaseClient,

  options: {
    basePath: '/api/tina', // API routes available at /api/tina/*
  },
})

export default handler
```

**Authentication approach:**

- Use Tina's documented Auth.js integration
- Verify the actual API from `tinacms-authjs` package documentation
- Do not implement custom allowlist mechanism until Tina's approach is understood

**GitHub OAuth callback URL:**
Provisionally: `https://admin.dev.ocs.com.ua/api/auth/callback/github`
(Must be verified against actual Auth.js/Tina configuration)

#### File: `.env` (Production)

**Not committed to Git - stored securely on server**

```bash
# Runtime mode
NODE_ENV=production
TINA_PUBLIC_IS_LOCAL=false
PORT=4001
HOST=127.0.0.1

# GitHub Repository Access
GITHUB_OWNER=your-org
GITHUB_REPO=ocs.com.ua
GITHUB_BRANCH=main
GITHUB_PERSONAL_ACCESS_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxx
GIT_COMMIT_MESSAGE=chore: update content via TinaCMS

# Database configuration (TBD - pending investigation)
# If MongoDB is chosen:
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/?retryWrites=true&w=majority
# MONGODB_DATABASE=ocs-cms
# MONGODB_COLLECTION=tinacms
#
# If file-based/local storage is chosen:
# (configuration TBD based on adapter)

# Auth.js
NEXTAUTH_SECRET=your-random-secret-generated-with-openssl
NEXTAUTH_URL=https://admin.dev.ocs.com.ua

# GitHub OAuth App
GITHUB_OAUTH_CLIENT_ID=Iv1.xxxxxxxxxxxxxxxx
GITHUB_OAUTH_CLIENT_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

**Note:** Database-related environment variables will be finalized after database adapter investigation.

**Generating secrets:**

```bash
# NEXTAUTH_SECRET
openssl rand -hex 32
```

**Credential separation:**

```
GitHub Repository Deploy Key
    └── Read-only access for server Git clone

GitHub Personal Access Token
    └── Tina backend → GitHub API → commits content

GitHub Actions Deploy SSH Key
    └── GitHub Actions → server → deploy dist/ only
```

Do not reuse the GitHub repository deploy key for multiple purposes.

______________________________________________________________________

### 3. systemd Service Configuration

**File:** `/etc/systemd/system/tina-backend.service`

```ini
[Unit]
Description=TinaCMS Self-Hosted Backend for ocs.com.ua
Documentation=https://tina.io/docs/self-hosted/overview/
After=network.target
Wants=network-online.target

[Service]
Type=simple
User=ocs
Group=ocs
WorkingDirectory=/home/ocs/domains/dev.ocs.com.ua/app/ocs.com.ua/application/tina-backend

# Use Bun runtime
ExecStart=/home/ocs/.bun/bin/bun run server.js

# Restart policy
Restart=on-failure
RestartSec=10s
StartLimitInterval=5min
StartLimitBurst=3

# Environment variables
Environment="NODE_ENV=production"
Environment="PORT=4001"
EnvironmentFile=/home/ocs/domains/dev.ocs.com.ua/app/ocs.com.ua/application/tina-backend/.env

# Security hardening (validate during testing)
NoNewPrivileges=true

# Logging
StandardOutput=journal
StandardError=journal
SyslogIdentifier=tina-backend

[Install]
WantedBy=multi-user.target
```

**Note on security directives:**

- `ProtectHome=read-only` and similar directives are omitted initially
- The service runs under `/home/ocs/...` as user `ocs`
- Advanced systemd sandboxing should be validated during testing, not assumed

**Service management commands:**

```bash
# Enable service to start on boot
sudo systemctl enable tina-backend

# Start service
sudo systemctl start tina-backend

# Check status
sudo systemctl status tina-backend

# View logs
journalctl -u tina-backend -f

# Restart after config changes
sudo systemctl restart tina-backend

# Stop service
sudo systemctl stop tina-backend

# Reload systemd after editing service file
sudo systemctl daemon-reload
```

**Health check:**

```bash
curl http://127.0.0.1:4001/health
```

______________________________________________________________________

### 4. Database Investigation (Pending)

⚠️ **This section must be completed before proceeding with implementation.**

#### Investigation Questions

1. **Is a database adapter required?**

   - Can `createLocalDatabase()` be used in production with TinaNodeBackend?
   - What does `createLocalDatabase()` actually store/persist?
   - Does it work for a small self-hosted production deployment?

1. **If database required, what are the options?**

   Compare the following officially supported adapters:

   **Option A: MongoDB (via mongodb-level)**

   - **Managed (Atlas):**
     - Free tier: 512MB storage
     - Automatic backups
     - External managed dependency
     - Adds authentication/network complexity
   - **Self-hosted:**
     - Full control
     - More operational overhead
     - Backup responsibility

   **Option B: Vercel KV or similar**

   - Check if supported by our TinaCMS version
   - Typically Redis-based
   - May be overkill for our use case

   **Option C: File-based/local storage**

   - Check if officially supported
   - Simplest operational model
     - No external service
     - Filesystem-based
     - Standard Unix backup tools

   **Option D: Other officially supported adapters**

   - Check TinaCMS docs for current adapter list
   - Evaluate based on operational simplicity

#### Decision Criteria

Rank options by:

1. **Operational simplicity** - Fewer moving parts = less that can break
1. **Cost** - Prefer zero-cost options for small deployment
1. **Backup/recovery** - Simpler is better (filesystem > external DB)
1. **Official support** - Only use documented/supported adapters

**Goal:** Choose the simplest option that actually works for our deployment size (~50-100 equipment items, 1-2 concurrent editors).

#### Investigation Steps

```bash
# 1. Inspect installed package APIs
cd application/frontend
cat node_modules/@tinacms/datalayer/dist/index.d.ts
cat node_modules/@tinacms/datalayer/README.md

# 2. Check what createDatabase() actually requires
# Look for required vs optional parameters

# 3. Check what createLocalDatabase() does
# Can it work in production? What does it persist?

# 4. Review TinaCMS self-hosted docs for our versions
# https://tina.io/docs/self-hosted/overview/

# 5. Test minimal backend locally without database
# Try running with just GitHub provider, no database adapter

# 6. Document findings and update this spec
```

#### Database Role (if required)

**GitHub repository:**

- **Primary source of truth**
- All content files, images, history
- Backed up, versioned, auditable

**Database (if required):**

- **TinaCMS Data Layer index only**
- Enables GraphQL queries over content
- Ephemeral - can be rebuilt from Git anytime
- Never treated as source of truth

**Astro production site:**

- Built from Git content
- No dependency on TinaCMS or database

______________________________________________________________________

### 5. GitHub OAuth App Configuration

**Purpose:** Authenticate TinaCMS users via their GitHub accounts

#### Create OAuth App

1. **Navigate to GitHub:**

   - Go to https://github.com/settings/developers
   - Click "OAuth Apps" → "New OAuth App"

1. **Application settings:**

   - **Application name:** `TinaCMS - OCS Admin`
   - **Homepage URL:** `https://dev.ocs.com.ua`
   - **Authorization callback URL:** `https://admin.dev.ocs.com.ua/api/auth/callback/github`
     *(This URL is provisional and must be verified against actual Auth.js/Tina configuration)*
   - **Enable Device Flow:** No

1. **Save and note credentials:**

   - **Client ID:** `Iv1.xxxxxxxxxxxxxxxx`
   - **Client Secret:** Click "Generate a new client secret"

1. **Add to backend `.env`:**

   ```bash
   GITHUB_OAUTH_CLIENT_ID=Iv1.xxxxxxxxxxxxxxxx
   GITHUB_OAUTH_CLIENT_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   ```

#### Authorization Strategy

Use Tina's documented Auth.js backend provider and user collection for authorization. Do not implement a custom `TINA_ALLOWED_USERS` environment variable mechanism until the actual Tina API is verified from installed package versions.

______________________________________________________________________

### 6. Frontend Configuration Updates

#### File: `application/frontend/tina/config.ts`

**Update for production backend:**

```typescript
import { defineConfig } from "tinacms";

const branch =
	process.env.GITHUB_BRANCH || process.env.VERCEL_GIT_COMMIT_REF || process.env.HEAD || "main";

// Detect environment
const isProduction = process.env.NODE_ENV === 'production'
const isLocal = process.env.TINA_PUBLIC_IS_LOCAL === 'true'

export default defineConfig({
	branch,

	// Self-hosted: these are null for local dev
	clientId: process.env.NEXT_PUBLIC_TINA_CLIENT_ID || null,
	token: process.env.TINA_TOKEN || null,

	// Point to self-hosted backend in production
	contentApiUrlOverride: isLocal
		? undefined  // Use default local URL
		: 'https://admin.dev.ocs.com.ua/api/tina/gql',

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
			{
				name: "equipment",
				label: "Equipment Catalogue",
				path: "src/content/equipment",
				format: "md",
				// ... existing equipment schema
			},
		],
	},
});
```

**Key changes:**

- `contentApiUrlOverride` points to production backend
- No need for custom `authProvider` in frontend config (handled by backend)

#### Update Build Script

**File: `application/frontend/package.json`**

```json
{
  "scripts": {
    "dev": "tinacms dev -c \"astro dev\"",
    "build": "tinacms build --local --skip-cloud-checks && astro build",
    "preview": "astro preview"
  }
}
```

**Build flags verified:**

- `--local` - Build for self-hosted backend
- `--skip-cloud-checks` - Don't validate against TinaCloud

______________________________________________________________________

### 7. GitHub Actions Deployment Workflow

**File:** `.github/workflows/deploy-frontend.yml`

**Purpose:** Build and deploy Astro site when content changes

```yaml
name: Deploy Astro Site to dev.ocs.com.ua

on:
  push:
    branches: [main]
    paths:
      - 'application/frontend/**'
      - '.github/workflows/deploy-frontend.yml'
  workflow_dispatch:

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest

    env:
      RELEASE_DIR: /home/ocs/domains/dev.ocs.com.ua/releases/${{ github.sha }}
      PUBLIC_HTML: /home/ocs/domains/dev.ocs.com.ua/public_html

    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Setup Bun
        uses: oven-sh/setup-bun@v1
        with:
          bun-version: latest

      - name: Install dependencies
        working-directory: ./application/frontend
        run: bun install --frozen-lockfile

      - name: Build TinaCMS and Astro site
        working-directory: ./application/frontend
        run: |
          bun run tinacms build --local --skip-cloud-checks
          bun run astro build
        env:
          TINA_PUBLIC_IS_LOCAL: false
          NODE_ENV: production

      - name: Create release directory on server
        uses: appleboy/ssh-action@v1.0.0
        with:
          host: ${{ secrets.DEPLOY_HOST }}
          username: ocs
          key: ${{ secrets.DEPLOY_SSH_KEY }}
          script: |
            mkdir -p /home/ocs/domains/dev.ocs.com.ua/releases/${{ github.sha }}

      - name: Upload build artifacts
        uses: appleboy/scp-action@v0.1.7
        with:
          host: ${{ secrets.DEPLOY_HOST }}
          username: ocs
          key: ${{ secrets.DEPLOY_SSH_KEY }}
          source: "application/frontend/dist/*"
          target: "${{ env.RELEASE_DIR }}"
          strip_components: 3

      - name: Set permissions and switch symlink
        uses: appleboy/ssh-action@v1.0.0
        with:
          host: ${{ secrets.DEPLOY_HOST }}
          username: ocs
          key: ${{ secrets.DEPLOY_SSH_KEY }}
          script: |
            # Set appropriate permissions
            find ${{ env.RELEASE_DIR }} -type d -exec chmod 755 {} \;
            find ${{ env.RELEASE_DIR }} -type f -exec chmod 644 {} \;

            # Atomic symlink switch
            ln -sfn ${{ env.RELEASE_DIR }} ${{ env.PUBLIC_HTML }}.tmp
            mv -Tf ${{ env.PUBLIC_HTML }}.tmp ${{ env.PUBLIC_HTML }}

            # Clean up old releases (keep last 5)
            cd /home/ocs/domains/dev.ocs.com.ua/releases
            ls -1dt */ | tail -n +6 | xargs -r rm -rf

            echo "Deployment completed successfully"

      - name: Verify deployment
        run: |
          sleep 5
          curl -f https://dev.ocs.com.ua || exit 1
          echo "Site is accessible"

      - name: Rollback on failure
        if: failure()
        uses: appleboy/ssh-action@v1.0.0
        with:
          host: ${{ secrets.DEPLOY_HOST }}
          username: ocs
          key: ${{ secrets.DEPLOY_SSH_KEY }}
          script: |
            # Find previous release
            cd /home/ocs/domains/dev.ocs.com.ua/releases
            PREVIOUS=$(ls -1dt */ | sed -n 2p)
            if [ -n "$PREVIOUS" ]; then
              ln -sfn "/home/ocs/domains/dev.ocs.com.ua/releases/$PREVIOUS" ${{ env.PUBLIC_HTML }}
              echo "Rolled back to $PREVIOUS"
            fi
```

**Deployment strategy:**

- Atomic symlink-based deployments
- Each deployment creates a new release directory with commit SHA
- `public_html` is a symlink to the current release
- Instant rollback by switching symlink
- Automatic cleanup of old releases (keeps last 5)

**File permissions:**

- Directories: `755`
- Files: `644`
- No blanket `chmod -R 755`

**GitHub Secrets to configure:**

```bash
DEPLOY_HOST       # Server hostname or IP
DEPLOY_SSH_KEY    # Private SSH key for deployment (dedicated key)
```

**SSH key setup:**

```bash
# On your local machine, generate deployment key
ssh-keygen -t ed25519 -C "github-actions-deploy" -f ~/.ssh/github-deploy

# Add public key to server
ssh-copy-id -i ~/.ssh/github-deploy.pub ocs@your-server

# Add private key to GitHub Secrets
# Go to repo Settings → Secrets → Actions → New secret
# Name: DEPLOY_SSH_KEY
# Value: Contents of ~/.ssh/github-deploy (private key)
```

**Workflow triggers:**

- Push to `main` branch
- Changes in `application/frontend/` directory
- Manual trigger via GitHub Actions UI

**Deployment flow:**
A GitHub push generated by Tina triggers the configured GitHub Actions workflow. There is no separate Tina webhook; the standard GitHub push event is used.

______________________________________________________________________

### 8. Content Update Flow (End-to-End)

```
Editor opens https://admin.dev.ocs.com.ua
  ↓
Login with GitHub OAuth
  ↓
Edit equipment content, upload images
  ↓
Click "Save"
  ↓
TinaCMS Backend (127.0.0.1:4001)
  ├── MongoDB: Update content index
  └── GitHub Provider: Commit changes to repo
       ↓
       Git Push to GitHub main branch
         ↓
         GitHub Actions Triggered (standard push event)
           ↓
           Build Astro Site
             ↓
             Deploy to releases/<commit-sha>/
               ↓
               Switch public_html symlink
                 ↓
                 Users see new content
```

**Timing:**

- Save in TinaCMS → Git commit: ~1-2 seconds
- Git push → Actions start: ~5-10 seconds
- Build + Deploy: ~2-4 minutes
- **Total: ~3-5 minutes from save to live**

______________________________________________________________________

## Server File Structure

```
/home/ocs/domains/dev.ocs.com.ua/
├── app/
│   └── ocs.com.ua/
│       └── application/
│           ├── frontend/                   # Git clone (source reference)
│           │   ├── src/
│           │   ├── tina/
│           │   └── package.json
│           └── tina-backend/               # Backend service
│               ├── package.json
│               ├── server.js
│               ├── handler.js
│               ├── .env                    # Not in Git
│               └── tina/
│                   ├── config.ts
│                   ├── database.ts
│                   └── __generated__/
├── releases/                               # Deployment releases
│   ├── <commit-sha-1>/
│   ├── <commit-sha-2>/
│   └── <commit-sha-3>/
└── public_html -> releases/<latest-sha>/   # Symlink to current release
    ├── index.html                          # Astro build output
    ├── en/
    ├── ua/
    ├── assets/                             # Media files (from Git)
    │   └── equipment/
    └── _astro/                             # JS/CSS bundles
```

**Separation of concerns:**

- `app/ocs.com.ua/` - Application code and services (Git clone + backend)
- `releases/` - Immutable deployment releases (by commit SHA)
- `public_html/` - Symlink to current release (Apache serves this)
- Git repo cloned for reference and backend config reuse

______________________________________________________________________

## Security Considerations

### 1. TinaCMS Backend

**Network isolation:**

- Bound to `127.0.0.1:4001` (not `0.0.0.0`)
- Only accessible via Apache reverse proxy
- No direct external access

**Authentication:**

- GitHub OAuth (industry standard)
- Tina's documented authorization mechanism
- Session cookies with secure flags
- HTTPS enforced

**Environment variables:**

- Stored in `.env` file (not in Git)
- File permissions: `chmod 600 .env`
- Owned by `ocs` user only

### 2. Apache Configuration

**SSL/TLS:**

- Managed by Virtualmin (Let's Encrypt)
- HTTP → HTTPS redirect enforced
- Modern TLS protocols only (TLS 1.2+)

**Security headers** (added via Virtualmin or Apache config):

```apache
Header always set X-Frame-Options "SAMEORIGIN"
Header always set X-Content-Type-Options "nosniff"
Header always set Referrer-Policy "strict-origin-when-cross-origin"
Header always set Strict-Transport-Security "max-age=31536000; includeSubDomains"
```

### 3. GitHub Personal Access Token

**Scope:**

- Repository: Contents (Read/Write)
- No admin, workflow, or other scopes

**Storage:**

- Backend `.env` file only
- Never in Git, logs, or client-side code
- Rotate periodically (every 90 days)

**Rotation procedure:**

1. Generate new PAT in GitHub
1. Update backend `.env`
1. Restart systemd service: `sudo systemctl restart tina-backend`
1. Revoke old PAT in GitHub

### 4. MongoDB

**Authentication:**

- Database-specific user (not admin)
- Strong password (32+ characters)
- IP whitelist (server IP only)

**Network:**

- TLS/SSL connection enforced
- Connection string in `.env` only

**Backup:**

- MongoDB Atlas: Automatic daily backups

### 5. GitHub Actions

**SSH key:**

- Dedicated key for deployment only
- No passphrase (required for automation)
- Stored as GitHub encrypted secret
- Server accepts key for `ocs` user only

**Permissions:**

- Deployment user cannot sudo
- Write access to deployment directories only
- No access to backend `.env` or systemd

### 6. File Permissions

```bash
# Backend service
chown -R ocs:ocs /home/ocs/domains/dev.ocs.com.ua/app/ocs.com.ua/application/tina-backend
chmod 700 /home/ocs/domains/dev.ocs.com.ua/app/ocs.com.ua/application/tina-backend
chmod 600 /home/ocs/domains/dev.ocs.com.ua/app/ocs.com.ua/application/tina-backend/.env

# Releases and public site
chown -R ocs:www-data /home/ocs/domains/dev.ocs.com.ua/releases
find /home/ocs/domains/dev.ocs.com.ua/releases -type d -exec chmod 755 {} \;
find /home/ocs/domains/dev.ocs.com.ua/releases -type f -exec chmod 644 {} \;
```

______________________________________________________________________

## Monitoring & Logging

### systemd Service Logs

**View live logs:**

```bash
journalctl -u tina-backend -f
```

**View logs from specific time:**

```bash
journalctl -u tina-backend --since "2026-09-19 10:00:00"
```

**Check service status:**

```bash
systemctl status tina-backend
```

### Apache Logs

**Access via Virtualmin** or directly:

```bash
# Locations managed by Virtualmin
tail -f /var/log/virtualmin/dev.ocs.com.ua_error_log
tail -f /var/log/virtualmin/admin.dev.ocs.com.ua_error_log
```

### Health Check

**Backend health:**

```bash
curl http://127.0.0.1:4001/health
```

**Response:**

```json
{
  "status": "healthy",
  "timestamp": "2026-09-19T12:00:00.000Z",
  "uptime": 86400,
  "environment": "production"
}
```

**Monitoring:** Use systemd's built-in restart mechanism (`Restart=on-failure`). Do not add cron-based health check restart mechanisms initially.

### MongoDB Monitoring

**Atlas:** Built-in monitoring dashboard

______________________________________________________________________

## Error Handling & Recovery

### Scenario 1: TinaCMS Backend Crash

**Symptoms:**

- `admin.dev.ocs.com.ua` returns 502 Bad Gateway
- Apache logs show "Connection refused to 127.0.0.1:4001"

**Recovery:**

```bash
# Check service status
sudo systemctl status tina-backend

# View logs for error
journalctl -u tina-backend --since "10 minutes ago"

# Restart service (systemd should do this automatically)
sudo systemctl restart tina-backend

# Verify health
curl http://127.0.0.1:4001/health
```

**systemd auto-restart:** Service configured to restart automatically on failure.

### Scenario 2: MongoDB Connection Lost

**Symptoms:**

- TinaCMS admin loads but content queries fail
- Backend logs show "MongoNetworkError"

**Recovery:**

```bash
# Check MongoDB connection
# If Atlas: Check network access whitelist in Atlas UI
# Check service logs
journalctl -u tina-backend --since "10 minutes ago"

# Restart backend after MongoDB is restored
sudo systemctl restart tina-backend
```

**Fallback:** MongoDB is an index, not source of truth. Rebuild from Git:

```bash
cd /home/ocs/domains/dev.ocs.com.ua/app/ocs.com.ua/application/tina-backend
bun run build
```

### Scenario 3: Deployment Failed

**Symptoms:**

- GitHub Actions workflow shows red ❌
- Old version still live on site

**Rollback:**

```bash
# SSH to server
ssh ocs@your-server
cd /home/ocs/domains/dev.ocs.com.ua/releases

# List available releases
ls -ldt */

# Switch symlink to previous release
ln -sfn /home/ocs/domains/dev.ocs.com.ua/releases/<previous-sha> \
        /home/ocs/domains/dev.ocs.com.ua/public_html
```

**Atomic rollback:** Instant - just switch the symlink.

______________________________________________________________________

## Backup & Disaster Recovery

### What to Backup

1. **Git repository (primary source of truth):**

   - Already backed up on GitHub
   - Clone to local machine periodically

1. **MongoDB database:**

   - Atlas: Automatic daily backups (no action needed)

1. **Backend configuration:**

   - `/home/ocs/domains/dev.ocs.com.ua/app/ocs.com.ua/application/tina-backend/.env`
   - Store encrypted copy off-server

1. **Apache configuration:**

   - Managed by Virtualmin (included in Virtualmin backups)

1. **systemd service file:**

   - `/etc/systemd/system/tina-backend.service`

### Disaster Recovery Procedure

**RTO (Recovery Time Objective):** 30 minutes
**RPO (Recovery Point Objective):** 24 hours (last backup)

**Full system restore:**

1. **Restore server basics:**

   ```bash
   # Install dependencies
   sudo apt-get update
   sudo apt-get install -y apache2
   # Install Bun
   curl -fsSL https://bun.sh/install | bash
   ```

1. **Restore Virtualmin configuration** (from Virtualmin backup)

1. **Restore TinaCMS backend:**

   ```bash
   # Clone Git repo
   cd /home/ocs/domains/dev.ocs.com.ua/app
   git clone https://github.com/your-org/ocs.com.ua.git

   # Create backend directory
   cd ocs.com.ua/application
   # Backend files would be committed or recreated from spec

   # Restore .env
   cp /backups/tina/latest/backend.env tina-backend/.env
   chmod 600 tina-backend/.env

   # Install dependencies
   cd tina-backend
   bun install
   bun run build
   ```

1. **Restore systemd service:**

   ```bash
   sudo cp /backups/tina/latest/tina-backend.service /etc/systemd/system/
   sudo systemctl daemon-reload
   sudo systemctl enable tina-backend
   sudo systemctl start tina-backend
   ```

1. **Restore latest deployment:**

   ```bash
   # Trigger GitHub Actions manually or deploy locally
   cd /home/ocs/domains/dev.ocs.com.ua/app/ocs.com.ua/application/frontend
   bun install
   bun run build
   mkdir -p /home/ocs/domains/dev.ocs.com.ua/releases/restore
   cp -r dist/* /home/ocs/domains/dev.ocs.com.ua/releases/restore/
   ln -sfn /home/ocs/domains/dev.ocs.com.ua/releases/restore \
           /home/ocs/domains/dev.ocs.com.ua/public_html
   ```

______________________________________________________________________

## Testing Strategy

### Phase 1: Verify Package APIs (Before Deployment)

**✅ Test 1: Confirm package versions and APIs**

```bash
cd application/frontend
# Verify installed versions
bun pm ls | grep -E "(tinacms|@tinacms)"
# Check peer dependencies
npm view tinacms-authjs@24.0.4 peerDependencies
```

**✅ Test 2: Verify self-hosted build works locally**

```bash
bun run tinacms build --local --skip-cloud-checks
# Check for errors, verify output
```

**✅ Test 3: Inspect TinaCMS package APIs**

- Read `node_modules/@tinacms/datalayer/dist/index.d.ts`
- Read `node_modules/tinacms-gitprovider-github/dist/index.d.ts`
- Read `node_modules/tinacms-authjs/dist/index.d.ts`
- Read `node_modules/mongodb-level/dist/index.d.ts`
- Verify import signatures match design spec

### Phase 2: Local Backend Testing

**✅ Test 4: Backend setup**

```bash
# Create test backend directory
mkdir -p ~/test-tina-backend
cd ~/test-tina-backend
# Create files based on verified APIs
bun install
bun run build
```

**✅ Test 5: Backend server with local database**

```bash
# Set TINA_PUBLIC_IS_LOCAL=true
bun run dev
curl http://127.0.0.1:4001/health
```

**✅ Test 6: MongoDB connection test**

```bash
# Create test .env with MongoDB Atlas credentials
# Verify connection in backend logs
```

### Phase 3: Server Deployment Testing

**✅ Test 7: Virtualmin virtual server setup**

- Create `admin.dev.ocs.com.ua` sub-server via Virtualmin
- Verify DNS propagation
- Verify SSL certificate installation

**✅ Test 8: Apache reverse proxy**

- Add proxy directives via Virtualmin
- Test: `curl -I https://admin.dev.ocs.com.ua`
- Verify proxy headers

**✅ Test 9: systemd service**

```bash
sudo systemctl start tina-backend
sudo systemctl status tina-backend
curl http://127.0.0.1:4001/health
```

**✅ Test 10: End-to-end content flow**

1. Login to TinaCMS at `https://admin.dev.ocs.com.ua`
1. Edit equipment item
1. Save changes
1. Check GitHub for new commit
1. Wait for GitHub Actions
1. Verify changes on `https://dev.ocs.com.ua`

### Phase 4: Verification

**✅ Test 11: Authorization**

- Test GitHub OAuth login flow
- Verify authorized users can access
- Test unauthorized account rejection (if applicable)

**✅ Test 12: Atomic deployment rollback**

```bash
# Note current release SHA
# Deploy new release
# Manually switch symlink back to previous release
# Verify site shows old version immediately
```

______________________________________________________________________

## Migration Plan

### Prerequisites

- [x] Frontend packages updated (tinacms@3.14.0, CLI@3.0.0)
- [x] Local TinaCMS working with `--local --skip-cloud-checks`
- [ ] **Database adapter investigation complete** (see Section 4 above)
- [ ] Verify current Tina self-hosting package versions and APIs
- [ ] Verify Auth.js integration API from installed packages
- [ ] Verify GitHub provider API from installed packages
- [ ] Verify TinaNodeBackend standalone usage from installed packages
- [ ] Database infrastructure created (if required after investigation)
- [ ] GitHub OAuth App created
- [ ] SSL certificates for both domains
- [ ] SSH access to production server
- [ ] Virtualmin access

### Phase 1: API Verification and Database Decision

**Estimated time:** 2-3 days

**⚠️ THIS PHASE MUST BE COMPLETED BEFORE ANY SERVER WORK**

**1.1 Inspect Installed Package APIs**

```bash
cd application/frontend
# Document actual APIs from installed packages
cat node_modules/@tinacms/datalayer/dist/index.d.ts
cat node_modules/tinacms-gitprovider-github/dist/index.d.ts
cat node_modules/tinacms-authjs/dist/index.d.ts

# Compare with design spec assumptions
# Update design spec if APIs differ
```

**1.2 Investigate Database Requirement**

- Read `@tinacms/datalayer` documentation
- Test `createLocalDatabase()` - what does it persist?
- Can it work in production for our use case?
- If database required, evaluate options from Section 4
- **Document decision and rationale**

**1.3 Create Backend Service Locally**

- Create `tina-backend/` directory structure
- Implement `server.js` with verified APIs
- Implement `handler.js` using actual TinaNodeBackend API
- Implement `tina/database.ts` with verified provider APIs
- Use chosen database solution (or no database if not needed)
- Determine schema reuse strategy (avoid duplicate configs)

**1.4 Test Backend Locally**

- Test with local database (`TINA_PUBLIC_IS_LOCAL=true`)
- Test production database config (if required)
- Test GitHub provider (read operations first)
- Verify health endpoint
- Test graceful shutdown

**Validation:**

- [ ] Database requirement understood and documented
- [ ] Database choice made (if required) with rationale
- [ ] Backend starts without errors
- [ ] Health check returns 200
- [ ] Database connection successful (if applicable)
- [ ] No import errors or type mismatches
- [ ] Design spec updated with actual implementation details

### Phase 2: Set Up Infrastructure

**Estimated time:** 1 day (conditional on Phase 1 findings)

**2.1 Database Setup** (if required after Phase 1 investigation)

- [ ] Set up chosen database solution
- [ ] Create credentials
- [ ] Configure network access
- [ ] Test connection from local machine
- [ ] Document connection details

**2.2 GitHub OAuth App**

- [ ] Create OAuth App in GitHub
- [ ] Set callback URL (verify against Auth.js docs)
- [ ] Generate client secret
- [ ] Document client ID and secret

**2.3 GitHub Personal Access Token**

- [ ] Generate PAT with `repo` scope
- [ ] Test PAT with GitHub API
- [ ] Document token securely

**2.4 Virtualmin Setup**

- [ ] Create `admin.dev.ocs.com.ua` virtual server/sub-server
- [ ] Configure SSL certificate (Let's Encrypt)
- [ ] Verify DNS propagation
- [ ] Test HTTPS access

**Validation:**

- [ ] Database accessible from server (if applicable)
- [ ] GitHub OAuth App created
- [ ] PAT works: `curl -H "Authorization: token $PAT" https://api.github.com/user`
- [ ] `admin.dev.ocs.com.ua` resolves with valid SSL

### Phase 3: Deploy Backend Service

**Estimated time:** 1 day

**3.1 Create backend directory on server**

```bash
ssh ocs@your-server
mkdir -p /home/ocs/domains/dev.ocs.com.ua/app/ocs.com.ua/application/tina-backend
```

**3.2 Deploy backend files**

- [ ] Copy `package.json`
- [ ] Copy `server.js`
- [ ] Copy `handler.js`
- [ ] Copy `tina/database.ts`
- [ ] Copy or symlink `tina/config.ts` (determine reuse strategy)
- [ ] Create `.env` with production credentials
- [ ] Create `.gitignore`

**3.3 Install and build**

```bash
cd tina-backend
bun install
bun run build
```

**3.4 Test backend**

```bash
bun run dev
# In another terminal:
curl http://127.0.0.1:4001/health
```

**Validation:**

- [ ] Health check returns 200
- [ ] No errors in console
- [ ] MongoDB connection successful
- [ ] Tina GraphQL endpoint accessible

### Phase 4: Configure systemd Service

**Estimated time:** 2 hours

**4.1 Create service file**

- [ ] Create `/etc/systemd/system/tina-backend.service`
- [ ] Set correct paths and user
- [ ] Configure environment variables

**4.2 Enable and start**

```bash
sudo systemctl daemon-reload
sudo systemctl enable tina-backend
sudo systemctl start tina-backend
```

**4.3 Verify**

```bash
sudo systemctl status tina-backend
journalctl -u tina-backend -f
curl http://127.0.0.1:4001/health
```

**Validation:**

- [ ] Service starts without errors
- [ ] Service survives reboot
- [ ] Logs show successful startup
- [ ] Health check accessible

### Phase 5: Configure Apache via Virtualmin

**Estimated time:** 2 hours

**5.1 Add reverse proxy directives**

- [ ] Access Virtualmin UI
- [ ] Edit `admin.dev.ocs.com.ua` virtual host
- [ ] Add ProxyPass directives
- [ ] Test configuration: `sudo apachectl configtest`

**5.2 Verify modules**

```bash
# Check if modules are enabled
apache2ctl -M | grep proxy
```

**5.3 Test proxy**

```bash
curl -I https://admin.dev.ocs.com.ua
curl https://admin.dev.ocs.com.ua/health
```

**Validation:**

- [ ] `admin.dev.ocs.com.ua` returns 200
- [ ] No SSL warnings
- [ ] Reverse proxy works (check headers)
- [ ] Health endpoint accessible via domain

### Phase 6: Configure Deployment Pipeline

**Estimated time:** 2 hours

**6.1 Set up deployment structure**

```bash
ssh ocs@your-server
mkdir -p /home/ocs/domains/dev.ocs.com.ua/releases
```

**6.2 Generate deployment SSH key**

```bash
ssh-keygen -t ed25519 -C "github-actions-deploy" -f ~/.ssh/github-deploy
ssh-copy-id -i ~/.ssh/github-deploy.pub ocs@your-server
```

**6.3 Add GitHub Secrets**

- [ ] Add `DEPLOY_HOST`
- [ ] Add `DEPLOY_SSH_KEY`

**6.4 Create workflow file**

- [ ] Create `.github/workflows/deploy-frontend.yml`
- [ ] Verify build commands match local testing
- [ ] Test manual workflow trigger

**Validation:**

- [ ] GitHub Actions workflow runs
- [ ] Build succeeds
- [ ] Deployment creates release directory
- [ ] Symlink switches correctly

### Phase 7: End-to-End Testing

**Estimated time:** 2-3 hours

**7.1 Test complete content workflow**

1. [ ] Navigate to `https://admin.dev.ocs.com.ua`
1. [ ] Click "Login with GitHub"
1. [ ] Authorize OAuth app
1. [ ] Successfully logged in to TinaCMS
1. [ ] Browse equipment collection
1. [ ] Create test equipment item
1. [ ] Upload test image
1. [ ] Fill in fields
1. [ ] Save content
1. [ ] Check GitHub for new commit
1. [ ] Monitor GitHub Actions workflow
1. [ ] Wait for deployment
1. [ ] Verify content on `https://dev.ocs.com.ua`

**7.2 Test error recovery**

- [ ] Stop backend: `sudo systemctl stop tina-backend`
- [ ] Visit admin (should show 502)
- [ ] Verify systemd restarts service automatically
- [ ] Verify admin loads after restart

**7.3 Test deployment rollback**

- [ ] Note current release
- [ ] Make a change and deploy
- [ ] Manually rollback symlink
- [ ] Verify old content shows immediately

**Validation:**

- [ ] Complete save → deploy → live cycle works
- [ ] Both languages render correctly
- [ ] Images display properly
- [ ] Services auto-recover
- [ ] Rollback is instant

### Phase 8: Documentation and Handoff

**Estimated time:** 1 day

**8.1 Document actual implementation**

- [ ] Record any deviations from design spec
- [ ] Document actual package versions used
- [ ] Document actual API signatures
- [ ] Create operations runbook

**8.2 Security review**

- [ ] Verify `.env` permissions: `chmod 600`
- [ ] Verify backend bound to localhost
- [ ] Check SSL certificates
- [ ] Review Apache security headers

**8.3 Team handoff**

- [ ] Share admin URL
- [ ] Document login procedure
- [ ] Provide support contact
- [ ] Schedule team training

**Validation:**

- [ ] Documentation complete
- [ ] Team has access
- [ ] Security checklist complete

______________________________________________________________________

## Known Limitations

1. **CLI 3.0.0 requires flags:** Must use `--local --skip-cloud-checks` for self-hosted builds
1. **No real-time collaboration:** Multiple editors can conflict if editing same file simultaneously
1. **Build time:** 3-5 minutes from save to live (acceptable for content updates)
1. **MongoDB required:** TinaCMS Data Layer requires Level-compatible database adapter
1. **Next Auth dependency:** Backend requires next-auth even though frontend is Astro
1. **Schema synchronization:** Must keep frontend and backend Tina configs in sync

______________________________________________________________________

## Future Enhancements

1. **Staging environment:** Preview changes before deploying to production
1. **Content approval workflow:** Require review before publishing
1. **Image optimization:** Add sharp for automatic image resizing/optimization
1. **CDN integration:** Serve media from CDN for better performance
1. **Monitoring dashboard:** Unified view of service health, logs, and metrics
1. **Backup automation:** Automated encrypted backups to off-site storage
1. **Multi-branch support:** Edit content on feature branches before merging

______________________________________________________________________

## Related Documents

- **Original TinaCMS Decision:** `2026-09-12-tina-final-decision.md`
- **Multilingual Spike:** `2026-09-12-tina-multilingual-spike-results.md`
- **Catalogue CMS Design:** `2026-09-12-catalogue-cms-design.md`
- **Frontend CLAUDE.md:** `application/frontend/CLAUDE.md`

______________________________________________________________________

## Approval Checklist

Before implementation:

- [ ] Architecture reviewed and approved
- [ ] Virtualmin integration understood
- [ ] Package API verification strategy clear
- [ ] Security considerations addressed
- [ ] Infrastructure costs acceptable (MongoDB Atlas free tier)
- [ ] Team understands content workflow
- [ ] Maintenance responsibilities assigned
- [ ] Disaster recovery plan acceptable
- [ ] Deployment strategy (atomic releases) understood

______________________________________________________________________

**Status:** Design complete - awaiting user approval
**Next step:** User reviews design → Invoke `writing-plans` skill to create implementation plan

**Important:** Before implementation begins, verify all TinaCMS package APIs against installed versions. Do not assume the code examples in this spec are final - they must be validated against actual package documentation and type definitions.
