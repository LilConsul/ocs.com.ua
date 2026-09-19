# TinaCMS Self-Hosted Deployment Design

**Date:** 2026-09-19
**Status:** Design - Awaiting Approval

______________________________________________________________________

## Overview

Deploy TinaCMS in self-hosted mode with a separate backend service on `dev.ocs.com.ua`. Content editors authenticate via GitHub OAuth, edit content through TinaCMS admin UI, and changes automatically trigger Astro site rebuilds via GitHub Actions.

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
               └── MongoDB Adapter (content index)
                   │
                   ├── MongoDB Atlas (Tina Data Layer index)
                   └── GitHub Repository (source of truth)
                       │
                       └── Push Event
                           │
                           └── GitHub Actions
                               ├── Build Astro
                               └── Deploy to dev.ocs.com.ua
```

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
1. **Git as Source of Truth** - All content in GitHub, MongoDB is Tina's Data Layer index
1. **GitHub Actions for Deployment** - Automated build/deploy on content changes
1. **Virtualmin for Infrastructure** - Virtualmin manages Apache, SSL, DNS (no manual vhost files)
1. **Atomic Deployments** - Symlink-based releases for instant rollback

### Critical Constraints

⚠️ **Production WordPress Isolation:**

The existing `ocs.com.ua` WordPress virtual server and `/home/ocs/public_html` must not be modified during development deployment. All work is isolated to:

- `dev.ocs.com.ua` (Astro static site)
- `admin.dev.ocs.com.ua` (TinaCMS backend)

No changes to production WordPress infrastructure.

______________________________________________________________________

## Component Breakdown

### 1. Apache Virtual Hosts

#### Public Site: `dev.ocs.com.ua`

**Purpose:** Serve static Astro build output

**Configuration:**

```apache
<VirtualHost *:443>
    ServerName dev.ocs.com.ua
    DocumentRoot /home/ocs/domains/dev.ocs.com.ua/public_html

    <Directory /home/ocs/domains/dev.ocs.com.ua/public_html>
        Options -Indexes +FollowSymLinks
        AllowOverride All
        Require all granted

        # Astro SPA routing
        RewriteEngine On
        RewriteCond %{REQUEST_FILENAME} !-f
        RewriteCond %{REQUEST_FILENAME} !-d
        RewriteRule ^ /index.html [L]
    </Directory>

    # Security headers
    Header always set X-Frame-Options "SAMEORIGIN"
    Header always set X-Content-Type-Options "nosniff"
    Header always set Referrer-Policy "strict-origin-when-cross-origin"

    # SSL configuration
    SSLEngine on
    SSLCertificateFile /path/to/dev.ocs.com.ua.crt
    SSLCertificateKeyFile /path/to/dev.ocs.com.ua.key

    # Logging
    ErrorLog ${APACHE_LOG_DIR}/dev.ocs.com.ua-error.log
    CustomLog ${APACHE_LOG_DIR}/dev.ocs.com.ua-access.log combined
</VirtualHost>

# HTTP to HTTPS redirect
<VirtualHost *:80>
    ServerName dev.ocs.com.ua
    Redirect permanent / https://dev.ocs.com.ua/
</VirtualHost>
```

#### TinaCMS Admin: `admin.dev.ocs.com.ua`

**Purpose:** Reverse proxy to TinaCMS backend service

**Configuration:**

```apache
<VirtualHost *:443>
    ServerName admin.dev.ocs.com.ua

    # Enable proxy modules
    ProxyPreserveHost On
    ProxyRequests Off

    # Reverse proxy all traffic to TinaCMS backend
    ProxyPass / http://127.0.0.1:4001/
    ProxyPassReverse / http://127.0.0.1:4001/

    # WebSocket support for live preview (if needed)
    RewriteEngine on
    RewriteCond %{HTTP:Upgrade} websocket [NC]
    RewriteCond %{HTTP:Connection} upgrade [NC]
    RewriteRule ^/?(.*) "ws://127.0.0.1:4001/$1" [P,L]

    # Proxy timeout settings
    ProxyTimeout 300

    # Security headers
    Header always set X-Frame-Options "SAMEORIGIN"
    Header always set X-Content-Type-Options "nosniff"

    # SSL configuration
    SSLEngine on
    SSLCertificateFile /path/to/admin.dev.ocs.com.ua.crt
    SSLCertificateKeyFile /path/to/admin.dev.ocs.com.ua.key

    # Logging
    ErrorLog ${APACHE_LOG_DIR}/admin.dev.ocs.com.ua-error.log
    CustomLog ${APACHE_LOG_DIR}/admin.dev.ocs.com.ua-access.log combined
</VirtualHost>

# HTTP to HTTPS redirect
<VirtualHost *:80>
    ServerName admin.dev.ocs.com.ua
    Redirect permanent / https://admin.dev.ocs.com.ua/
</VirtualHost>
```

**Required Apache modules:**

```bash
sudo a2enmod proxy
sudo a2enmod proxy_http
sudo a2enmod proxy_wstunnel
sudo a2enmod rewrite
sudo a2enmod headers
sudo a2enmod ssl
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
│   ├── config.ts           # TinaCMS schema (copied from frontend)
│   ├── database.ts         # Database client setup
│   └── __generated__/
│       └── databaseClient.ts   # Auto-generated by tinacms build
└── api/
    └── tina/
        └── handler.ts      # TinaNodeBackend setup
```

#### File: `package.json`

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
    "mongodb": "^7.6.0",
    "mongodb-level": "^0.0.4",
    "next-auth": "^4.24.15"
  }
}
```

#### File: `tina/database.ts`

**Purpose:** Configure Git provider and database adapter

```typescript
import { createDatabase, createLocalDatabase } from '@tinacms/datalayer'
import { GitHubProvider } from 'tinacms-gitprovider-github'
import { MongodbLevel } from 'mongodb-level'

const isLocal = process.env.TINA_PUBLIC_IS_LOCAL === 'true'
const branch = process.env.GITHUB_BRANCH || 'main'

if (!isLocal && !branch) {
  throw new Error('GITHUB_BRANCH environment variable is required in production')
}

export default isLocal
  ? // Local development: in-memory database, writes to filesystem
    createLocalDatabase()
  : // Production: MongoDB index + GitHub for storage
    createDatabase({
      gitProvider: new GitHubProvider({
        owner: process.env.GITHUB_OWNER!,
        repo: process.env.GITHUB_REPO!,
        token: process.env.GITHUB_PERSONAL_ACCESS_TOKEN!,
        branch,
        commitMessage: process.env.GIT_COMMIT_MESSAGE || 'chore: update content via TinaCMS',
        rootPath: 'application/frontend', // Path within repo to content root
      }),

      databaseAdapter: new MongodbLevel<string, Record<string, any>>({
        mongoUri: process.env.MONGODB_URI!,
        dbName: process.env.MONGODB_DATABASE || 'ocs-cms',
        collectionName: process.env.MONGODB_COLLECTION || 'tinacms',
      }),
    })
```

**Key configuration:**

- `rootPath: 'application/frontend'` - Points to where content lives in the monorepo
- Git commits go directly to `main` branch
- MongoDB stores indexed content for GraphQL queries

#### File: `api/tina/handler.ts`

**Purpose:** TinaCMS backend handler with Auth.js authentication

```typescript
import { TinaNodeBackend, LocalBackendAuthProvider } from '@tinacms/datalayer'
import { AuthJsBackendAuthProvider, TinaAuthJSOptions } from 'tinacms-authjs'
import GithubProvider from 'next-auth/providers/github'
import type { IncomingMessage, ServerResponse } from 'http'

// Import the generated database client
// This file is created by `tinacms build --local --skip-cloud-checks`
import databaseClient from '../../tina/__generated__/databaseClient'

const isLocal = process.env.TINA_PUBLIC_IS_LOCAL === 'true'

// Parse allowed users from environment
const allowedUsers = process.env.TINA_ALLOWED_USERS?.split(',').map(u => u.trim()) || []

if (!isLocal && allowedUsers.length === 0) {
  throw new Error('TINA_ALLOWED_USERS must be configured in production')
}

// Create TinaCMS backend handler
const handler = TinaNodeBackend({
  authProvider: isLocal
    ? // Local development: no authentication
      LocalBackendAuthProvider()
    : // Production: Auth.js with GitHub OAuth
      AuthJsBackendAuthProvider({
        authOptions: TinaAuthJSOptions({
          databaseClient,
          secret: process.env.NEXTAUTH_SECRET!,

          providers: [
            GithubProvider({
              clientId: process.env.GITHUB_OAUTH_CLIENT_ID!,
              clientSecret: process.env.GITHUB_OAUTH_CLIENT_SECRET!,
            }),
          ],

          callbacks: {
            // Authorization: check if user is in allowed list
            async signIn({ user, account, profile }) {
              const email = user.email?.toLowerCase()
              const username = (profile as any)?.login?.toLowerCase()

              const isAllowed = allowedUsers.some(allowed => {
                const normalizedAllowed = allowed.toLowerCase()
                return email === normalizedAllowed || username === normalizedAllowed
              })

              if (!isAllowed) {
                console.warn(`[TinaCMS Auth] Rejected sign-in attempt: ${email || username}`)
                return false
              }

              console.log(`[TinaCMS Auth] Authorized user: ${email || username}`)
              return true
            },

            // Session callback to add user info
            async session({ session, token }) {
              if (token?.sub) {
                session.user.id = token.sub
              }
              return session
            },
          },
        }),
      }),

  databaseClient,

  options: {
    basePath: '/api/tina', // API routes available at /api/tina/*
  },
})

export default handler
```

**Authentication flow:**

1. User visits `https://admin.dev.ocs.com.ua`
1. Redirected to GitHub OAuth consent screen
1. After approval, Auth.js validates against `TINA_ALLOWED_USERS`
1. If authorized, user gets TinaCMS admin access

#### File: `server.js`

**Purpose:** HTTP server wrapper for TinaNodeBackend

```javascript
import http from 'http'
import handler from './api/tina/handler.ts'

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
    // Parse body before passing to handler
    await parseBody(req)

    // TinaNodeBackend expects Node.js IncomingMessage/ServerResponse
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

**Why a wrapper?**

- TinaNodeBackend expects Node.js `req`/`res`, not Web API `Request`/`Response`
- Handles body parsing for POST requests
- Provides graceful shutdown
- Simple HTTP server without framework overhead

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

# MongoDB Atlas
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/?retryWrites=true&w=majority
MONGODB_DATABASE=ocs-cms
MONGODB_COLLECTION=tinacms

# Auth.js
NEXTAUTH_SECRET=your-random-secret-generated-with-openssl
NEXTAUTH_URL=https://admin.dev.ocs.com.ua

# GitHub OAuth App
GITHUB_OAUTH_CLIENT_ID=Iv1.xxxxxxxxxxxxxxxx
GITHUB_OAUTH_CLIENT_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Authorization
TINA_ALLOWED_USERS=editor@ocs.com.ua,denys@example.com,github-username
```

**Generating secrets:**

```bash
# NEXTAUTH_SECRET
openssl rand -hex 32
```

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

# Security hardening
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=read-only
ReadWritePaths=/home/ocs/domains/dev.ocs.com.ua/app/ocs.com.ua/application/tina-backend

# Logging
StandardOutput=journal
StandardError=journal
SyslogIdentifier=tina-backend

[Install]
WantedBy=multi-user.target
```

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
curl http://127.0.0.1:4001/api/tina/health
```

______________________________________________________________________

### 4. MongoDB Setup

#### Option A: MongoDB Atlas (Recommended)

**Why Atlas:**

- Free tier: 512MB storage (sufficient for content index)
- Automatic backups
- Global CDN with low latency
- No server maintenance
- Built-in monitoring

**Setup steps:**

1. **Create MongoDB Atlas account** at https://www.mongodb.com/cloud/atlas

1. **Create free tier cluster:**

   - Choose M0 (Free)
   - Region: Closest to your server
   - Cluster name: `ocs-cms`

1. **Create database user:**

   - Username: `tina-backend`
   - Password: Generate strong password
   - Built-in Role: `Read and write to any database`

1. **Configure network access:**

   - Add server IP address
   - Or `0.0.0.0/0` for testing (not recommended for production)

1. **Get connection string:**

   ```
   mongodb+srv://tina-backend:<password>@cluster.mongodb.net/?retryWrites=true&w=majority
   ```

1. **Set in `.env`:**

   ```bash
   MONGODB_URI=mongodb+srv://tina-backend:your-password@cluster.mongodb.net/?retryWrites=true&w=majority
   MONGODB_DATABASE=ocs-cms
   MONGODB_COLLECTION=tinacms
   ```

#### Database Structure

**Database:** `ocs-cms`
**Collection:** `tinacms`

**Document schema:**

```javascript
{
  _id: ObjectId("..."),
  key: "application/frontend/src/content/equipment/checkweighers/hc-m.md",
  value: {
    // Parsed content from markdown file
    "en-title": "HC-M Checkweigher",
    "ua-title": "Чекові ваги HC-M",
    // ... rest of frontmatter
  },
  sha: "abc123...",  // Git commit SHA
  updatedAt: ISODate("2026-09-19T12:00:00Z")
}
```

**Index requirements:**

```javascript
db.tinacms.createIndex({ key: 1 }, { unique: true })
```

**Important:** MongoDB is an ephemeral cache. It can be rebuilt from Git at any time by running:

```bash
cd /home/ocs/domains/dev.ocs.com.ua/app/ocs.com.ua/application/tina-backend
bun run build
```

#### Option B: Self-Hosted MongoDB

If you prefer to host MongoDB yourself:

```bash
# Install MongoDB on Ubuntu/Debian
sudo apt-get install -y mongodb-org

# Start MongoDB
sudo systemctl start mongod
sudo systemctl enable mongod

# Create database and user
mongosh
use ocs-cms
db.createUser({
  user: "tina-backend",
  pwd: "strong-password",
  roles: [{ role: "readWrite", db: "ocs-cms" }]
})

# Connection string
MONGODB_URI=mongodb://tina-backend:password@localhost:27017/ocs-cms
```

**Backup strategy:**

```bash
# Daily backup cron job
0 2 * * * mongodump --uri="mongodb://..." --out=/backups/mongodb/$(date +\%Y-\%m-\%d)
```

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

**Environment variable:** `TINA_ALLOWED_USERS`

```bash
# Comma-separated list of GitHub usernames or email addresses
TINA_ALLOWED_USERS=editor@ocs.com.ua,denys@example.com,github-username
```

**Authorization flow:**

1. User clicks "Login with GitHub" at `https://admin.dev.ocs.com.ua`
1. Redirected to GitHub OAuth consent screen
1. User approves access
1. GitHub redirects back to TinaCMS with auth code
1. Auth.js exchanges code for access token
1. Backend checks if user email/username is in `TINA_ALLOWED_USERS`
1. If authorized → user gets session cookie, accesses TinaCMS
1. If not authorized → "Access Denied" message

**Benefits:**

- Granular control independent of GitHub repository permissions
- Can authorize users without giving them Git push access
- Easy to revoke access (update environment variable, restart service)
- Audit trail in system logs

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
- No need for custom `authProvider` (handled by backend)

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

**Build flags:**

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

      - name: Build TinaCMS schema
        working-directory: ./application/frontend
        run: bun run tinacms build --local --skip-cloud-checks
        env:
          TINA_PUBLIC_IS_LOCAL: false
          NODE_ENV: production

      - name: Build Astro site
        working-directory: ./application/frontend
        run: bun run astro build
        env:
          NODE_ENV: production

      - name: Prepare deployment package
        working-directory: ./application/frontend
        run: |
          # Create deployment archive
          tar -czf ../../frontend-dist.tar.gz dist/

      - name: Deploy to server via SSH
        uses: appleboy/ssh-action@v1.0.0
        with:
          host: ${{ secrets.DEPLOY_HOST }}
          username: ocs
          key: ${{ secrets.DEPLOY_SSH_KEY }}
          script: |
            # Backup current deployment
            cd /home/ocs/domains/dev.ocs.com.ua
            if [ -d public_html ]; then
              mv public_html public_html.backup.$(date +%Y%m%d-%H%M%S)
              # Keep only last 3 backups
              ls -dt public_html.backup.* | tail -n +4 | xargs rm -rf
            fi

            # Create new deployment directory
            mkdir -p public_html

      - name: Upload build artifacts
        uses: appleboy/scp-action@v0.1.7
        with:
          host: ${{ secrets.DEPLOY_HOST }}
          username: ocs
          key: ${{ secrets.DEPLOY_SSH_KEY }}
          source: "frontend-dist.tar.gz"
          target: "/home/ocs/domains/dev.ocs.com.ua/"

      - name: Extract and finalize deployment
        uses: appleboy/ssh-action@v1.0.0
        with:
          host: ${{ secrets.DEPLOY_HOST }}
          username: ocs
          key: ${{ secrets.DEPLOY_SSH_KEY }}
          script: |
            cd /home/ocs/domains/dev.ocs.com.ua
            tar -xzf frontend-dist.tar.gz -C public_html --strip-components=1
            rm frontend-dist.tar.gz

            # Set permissions
            chmod -R 755 public_html

            echo "Deployment completed successfully"

      - name: Verify deployment
        run: |
          sleep 5
          curl -f https://dev.ocs.com.ua || exit 1
          echo "Site is accessible"

      - name: Notify on failure
        if: failure()
        run: |
          echo "Deployment failed. Check logs above."
          # Add notification service here (Slack, email, etc.)
```

**GitHub Secrets to configure:**

```bash
DEPLOY_HOST       # Server hostname or IP
DEPLOY_SSH_KEY    # Private SSH key for deployment
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

1. Content editor saves changes in TinaCMS
1. TinaCMS backend commits to GitHub
1. GitHub webhook triggers Actions workflow
1. Workflow builds Astro site
1. Deploys to `dev.ocs.com.ua`
1. Total time: 2-5 minutes from save to live

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
         GitHub Actions Triggered
           ↓
           Build Astro Site
             ↓
             Deploy dist/ to dev.ocs.com.ua
               ↓
               Apache serves updated site
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
│           ├── frontend/                   # Git clone (reference only)
│           │   ├── src/
│           │   ├── tina/
│           │   └── package.json
│           └── tina-backend/               # Backend service
│               ├── package.json
│               ├── server.js
│               ├── .env                    # Not in Git
│               ├── tina/
│               │   ├── config.ts           # Copy of frontend config
│               │   ├── database.ts
│               │   └── __generated__/
│               └── api/
│                   └── tina/
│                       └── handler.ts
└── public_html/                            # Apache DocumentRoot
    ├── index.html                          # Astro build output
    ├── en/
    ├── ua/
    ├── assets/                             # Media files (from Git)
    │   └── equipment/
    └── _astro/                             # JS/CSS bundles
```

**Separation of concerns:**

- `app/ocs.com.ua/` - Application code and services
- `public_html/` - Static files served by Apache
- Git repo cloned for reference, but not used directly in production

______________________________________________________________________

## Security Considerations

### 1. TinaCMS Backend

**Network isolation:**

- Bound to `127.0.0.1:4001` (not `0.0.0.0`)
- Only accessible via Apache reverse proxy
- No direct external access

**Authentication:**

- GitHub OAuth (industry standard)
- Explicit user allowlist
- Session cookies with secure flags
- HTTPS enforced

**Environment variables:**

- Stored in `.env` file (not in Git)
- File permissions: `chmod 600 .env`
- Owned by `ocs` user only

### 2. Apache Configuration

**SSL/TLS:**

- Valid SSL certificates (Let's Encrypt or commercial)
- HTTP → HTTPS redirect enforced
- Modern TLS protocols only (TLS 1.2+)

**Security headers:**

```apache
Header always set X-Frame-Options "SAMEORIGIN"
Header always set X-Content-Type-Options "nosniff"
Header always set Referrer-Policy "strict-origin-when-cross-origin"
Header always set Strict-Transport-Security "max-age=31536000; includeSubDomains"
```

**Rate limiting (optional):**

```apache
<Location /api/tina>
    # Limit to 100 requests per minute per IP
    # Requires mod_ratelimit or mod_evasive
</Location>
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
- Self-hosted: Daily `mongodump` to off-server location

### 5. GitHub Actions

**SSH key:**

- Dedicated key for deployment only
- No passphrase (required for automation)
- Stored as GitHub encrypted secret
- Server accepts key for `ocs` user only

**Permissions:**

- Deployment user cannot sudo
- Write access to `public_html/` only
- No access to backend `.env` or systemd

### 6. File Permissions

```bash
# Backend service
chown -R ocs:ocs /home/ocs/domains/dev.ocs.com.ua/app/ocs.com.ua/application/tina-backend
chmod 700 /home/ocs/domains/dev.ocs.com.ua/app/ocs.com.ua/application/tina-backend
chmod 600 /home/ocs/domains/dev.ocs.com.ua/app/ocs.com.ua/application/tina-backend/.env

# Public site
chown -R ocs:www-data /home/ocs/domains/dev.ocs.com.ua/public_html
chmod -R 755 /home/ocs/domains/dev.ocs.com.ua/public_html
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

**Error logs:**

```bash
tail -f /var/log/apache2/dev.ocs.com.ua-error.log
tail -f /var/log/apache2/admin.dev.ocs.com.ua-error.log
```

**Access logs:**

```bash
tail -f /var/log/apache2/dev.ocs.com.ua-access.log
tail -f /var/log/apache2/admin.dev.ocs.com.ua-access.log
```

### Health Check Endpoint

**Add to `api/tina/handler.ts`:**

```typescript
// Health check route
if (req.url === '/api/tina/health') {
  res.writeHead(200, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
  }))
  return
}
```

**Monitor from cron:**

```bash
# /etc/cron.d/tina-health-check
*/5 * * * * ocs curl -f http://127.0.0.1:4001/api/tina/health || systemctl restart tina-backend
```

### MongoDB Monitoring

**Atlas:** Built-in monitoring dashboard

**Self-hosted:**

```bash
# Connection status
mongosh --eval "db.adminCommand({ connectionStatus: 1 })"

# Collection stats
mongosh ocs-cms --eval "db.tinacms.stats()"
```

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

# Restart service
sudo systemctl restart tina-backend

# Verify health
curl http://127.0.0.1:4001/api/tina/health
```

**systemd auto-restart:** Service configured to restart automatically on failure.

### Scenario 2: MongoDB Connection Lost

**Symptoms:**

- TinaCMS admin loads but content queries fail
- Backend logs show "MongoNetworkError"

**Recovery:**

```bash
# Check MongoDB connection from backend
cd /home/ocs/domains/dev.ocs.com.ua/app/ocs.com.ua/application/tina-backend
bun run -e "import('mongodb').then(m => new m.MongoClient(process.env.MONGODB_URI).connect())"

# If Atlas: Check network access whitelist in Atlas UI
# If self-hosted: Check mongod service
sudo systemctl status mongod

# Restart backend after MongoDB is restored
sudo systemctl restart tina-backend
```

**Fallback:** MongoDB is an index, not source of truth. Rebuild from Git:

```bash
cd /home/ocs/domains/dev.ocs.com.ua/app/ocs.com.ua/application/tina-backend
bun run build
```

### Scenario 3: GitHub API Rate Limit

**Symptoms:**

- Saving content fails with "API rate limit exceeded"
- Backend logs show 403 from GitHub API

**Recovery:**

```bash
# Check rate limit status
curl -H "Authorization: token $GITHUB_PERSONAL_ACCESS_TOKEN" \
  https://api.github.com/rate_limit

# Wait for limit reset (shown in response)
# Or use a different PAT with higher limits
```

**Prevention:** GitHub PAT has 5,000 requests/hour limit. Normal TinaCMS usage won't hit this.

### Scenario 4: Deployment Failed

**Symptoms:**

- GitHub Actions workflow shows red ❌
- Old version still live on site

**Recovery:**

```bash
# View deployment logs in GitHub Actions UI
# If build succeeded but deployment failed:

# SSH to server and check
ssh ocs@your-server
cd /home/ocs/domains/dev.ocs.com.ua
ls -lh  # Check if frontend-dist.tar.gz exists

# Manual deployment
tar -xzf frontend-dist.tar.gz -C public_html --strip-components=1

# If build failed: fix issue locally, push again
```

**Rollback to previous version:**

```bash
# On server
cd /home/ocs/domains/dev.ocs.com.ua
rm -rf public_html
mv public_html.backup.YYYYMMDD-HHMMSS public_html
```

### Scenario 5: Disk Space Full

**Symptoms:**

- MongoDB writes fail
- Apache logs show "No space left on device"

**Check disk usage:**

```bash
df -h
du -sh /home/ocs/domains/dev.ocs.com.ua/*
```

**Clean up:**

```bash
# Remove old deployment backups
cd /home/ocs/domains/dev.ocs.com.ua
rm -rf public_html.backup.*

# Clean logs
sudo journalctl --vacuum-time=7d

# Apache logs
sudo rm /var/log/apache2/*.log.*.gz
```

______________________________________________________________________

## Backup & Disaster Recovery

### What to Backup

1. **Git repository (primary source of truth):**

   - Already backed up on GitHub
   - Clone to local machine periodically

1. **MongoDB database:**

   - Atlas: Automatic daily backups
   - Self-hosted: Daily exports

1. **Backend configuration:**

   - `/home/ocs/domains/dev.ocs.com.ua/app/ocs.com.ua/application/tina-backend/.env`
   - Store encrypted copy off-server

1. **Apache configuration:**

   - `/etc/apache2/sites-available/dev.ocs.com.ua.conf`
   - `/etc/apache2/sites-available/admin.dev.ocs.com.ua.conf`

1. **systemd service file:**

   - `/etc/systemd/system/tina-backend.service`

### Backup Script

```bash
#!/bin/bash
# /home/ocs/bin/backup-tina.sh

BACKUP_DIR="/backups/tina/$(date +%Y-%m-%d)"
mkdir -p "$BACKUP_DIR"

# Backend .env file
cp /home/ocs/domains/dev.ocs.com.ua/app/ocs.com.ua/application/tina-backend/.env \
   "$BACKUP_DIR/backend.env"

# MongoDB (if self-hosted)
if [ "$MONGODB_SELF_HOSTED" = "true" ]; then
  mongodump --uri="$MONGODB_URI" --out="$BACKUP_DIR/mongodb"
fi

# Apache configs
cp /etc/apache2/sites-available/dev.ocs.com.ua.conf "$BACKUP_DIR/"
cp /etc/apache2/sites-available/admin.dev.ocs.com.ua.conf "$BACKUP_DIR/"

# systemd service
cp /etc/systemd/system/tina-backend.service "$BACKUP_DIR/"

# Encrypt backup
tar -czf - "$BACKUP_DIR" | gpg --encrypt --recipient you@example.com > "$BACKUP_DIR.tar.gz.gpg"

# Upload to off-site storage (S3, rsync, etc.)
# aws s3 cp "$BACKUP_DIR.tar.gz.gpg" s3://your-bucket/backups/

# Clean up old backups (keep 30 days)
find /backups/tina -type d -mtime +30 -exec rm -rf {} \;
```

**Cron schedule:**

```bash
# /etc/cron.d/tina-backup
0 3 * * * ocs /home/ocs/bin/backup-tina.sh
```

### Disaster Recovery Procedure

**RTO (Recovery Time Objective):** 30 minutes
**RPO (Recovery Point Objective):** 24 hours (last backup)

**Full system restore:**

1. **Restore server (if needed):**

   ```bash
   # Install dependencies
   sudo apt-get update
   sudo apt-get install -y apache2 bun

   # Enable Apache modules
   sudo a2enmod proxy proxy_http ssl rewrite headers
   ```

1. **Restore Apache configuration:**

   ```bash
   sudo cp backups/dev.ocs.com.ua.conf /etc/apache2/sites-available/
   sudo cp backups/admin.dev.ocs.com.ua.conf /etc/apache2/sites-available/
   sudo a2ensite dev.ocs.com.ua admin.dev.ocs.com.ua
   sudo systemctl restart apache2
   ```

1. **Restore TinaCMS backend:**

   ```bash
   # Clone Git repo
   cd /home/ocs/domains/dev.ocs.com.ua/app
   git clone https://github.com/your-org/ocs.com.ua.git

   # Create backend directory
   mkdir -p ocs.com.ua/application/tina-backend
   cd ocs.com.ua/application/tina-backend

   # Copy backend code from design spec
   # ... (create files as documented above)

   # Restore .env
   cp /backups/tina/latest/backend.env .env
   chmod 600 .env

   # Install dependencies
   bun install

   # Build TinaCMS
   bun run build
   ```

1. **Restore systemd service:**

   ```bash
   sudo cp /backups/tina/latest/tina-backend.service /etc/systemd/system/
   sudo systemctl daemon-reload
   sudo systemctl enable tina-backend
   sudo systemctl start tina-backend
   ```

1. **Restore MongoDB (if self-hosted):**

   ```bash
   mongorestore --uri="$MONGODB_URI" /backups/tina/latest/mongodb
   ```

1. **Deploy latest Astro build:**

   ```bash
   # Trigger GitHub Actions manually
   # Or build locally and copy:
   cd /home/ocs/domains/dev.ocs.com.ua/app/ocs.com.ua/application/frontend
   bun install
   bun run build
   cp -r dist/* /home/ocs/domains/dev.ocs.com.ua/public_html/
   ```

1. **Verify services:**

   ```bash
   curl https://dev.ocs.com.ua
   curl https://admin.dev.ocs.com.ua
   curl http://127.0.0.1:4001/api/tina/health
   ```

______________________________________________________________________

## Testing Strategy

### Phase 1: Local Testing (Before Deployment)

**✅ Test 1: Package installation**

```bash
cd application/frontend
bun install
bun run tinacms build --local --skip-cloud-checks
bun run dev
# Visit http://localhost:4321/admin/index.html
```

**✅ Test 2: Content creation**

- Create new equipment item
- Upload images
- Fill in all fields
- Save and verify in Git

**✅ Test 3: Content editing**

- Edit existing equipment
- Change images
- Update translations
- Save and verify changes in Git

**✅ Test 4: Build production assets**

```bash
bun run build
# Check dist/ folder
ls -lh dist/
```

### Phase 2: Backend Service Testing (Local)

**✅ Test 5: Backend setup**

```bash
# In new directory (not frontend)
mkdir -p ~/test-tina-backend
cd ~/test-tina-backend
# Create files as documented
bun install
bun run build
```

**✅ Test 6: Backend server**

```bash
# Create .env with test credentials
bun run dev
curl http://127.0.0.1:4001/api/tina/health
```

**✅ Test 7: MongoDB connection**

```bash
# Check MongoDB logs for successful connection
journalctl -u tina-backend -f
```

**✅ Test 8: GitHub OAuth flow (local)**

- Set `NEXTAUTH_URL=http://localhost:4001`
- Visit admin UI
- Test login flow

### Phase 3: Server Deployment Testing

**✅ Test 9: systemd service**

```bash
sudo systemctl start tina-backend
sudo systemctl status tina-backend
curl http://127.0.0.1:4001/api/tina/health
```

**✅ Test 10: Apache configuration**

```bash
sudo apachectl configtest
sudo systemctl reload apache2
curl -I https://admin.dev.ocs.com.ua
```

**✅ Test 11: SSL certificates**

```bash
curl -vI https://admin.dev.ocs.com.ua 2>&1 | grep "SSL certificate"
```

**✅ Test 12: End-to-end content flow**

1. Login to TinaCMS at `https://admin.dev.ocs.com.ua`
1. Edit equipment item
1. Save changes
1. Check GitHub for new commit
1. Wait for GitHub Actions
1. Verify changes on `https://dev.ocs.com.ua`

### Phase 4: Production Verification

**✅ Test 13: Authorization**

- Try login with unauthorized GitHub account (should fail)
- Try login with authorized account (should succeed)

**✅ Test 14: Media uploads**

- Upload images through TinaCMS
- Verify files appear in Git
- Verify images display on site after deployment

**✅ Test 15: Error handling**

- Stop MongoDB → verify graceful error
- Stop backend service → verify 502 error page
- Restart services → verify recovery

**✅ Test 16: Performance**

- Check page load times
- Check TinaCMS admin responsiveness
- Monitor server resource usage

______________________________________________________________________

## Migration Plan

### Prerequisites

- [x] Frontend packages updated (tinacms@3.14.0, CLI@3.0.0)
- [x] Local TinaCMS working with `--local --skip-cloud-checks`
- [ ] MongoDB Atlas cluster created
- [ ] GitHub OAuth App created
- [ ] SSL certificates for both domains
- [ ] SSH access to production server

### Phase 1: Finalize Local Configuration ✅

**Estimated time:** 1-2 days

**Tasks:**

1. Complete equipment catalogue schema
1. Test all content types in TinaCMS
1. Verify media uploads work correctly
1. Test i18n workflow (both languages)
1. Create sample content for testing
1. Verify Astro pages render correctly
1. Test build process locally

**Validation:**

- [ ] All equipment fields editable in TinaCMS
- [ ] Images upload to `public/assets/`
- [ ] Content queries work in Astro pages
- [ ] `bun run build` succeeds
- [ ] `dist/` contains expected files

### Phase 2: Set Up Infrastructure

**Estimated time:** 1 day

**2.1 MongoDB Atlas**

- [ ] Create cluster
- [ ] Create database user
- [ ] Whitelist server IP
- [ ] Test connection from local machine
- [ ] Document connection string

**2.2 GitHub OAuth App**

- [ ] Create OAuth App in GitHub
- [ ] Set callback URL: `https://admin.dev.ocs.com.ua/api/auth/callback/github`
- [ ] Generate client secret
- [ ] Document client ID and secret

**2.3 GitHub Personal Access Token**

- [ ] Generate PAT with `repo` scope
- [ ] Test PAT with GitHub API
- [ ] Document token securely

**2.4 SSL Certificates**

- [ ] Obtain certificate for `dev.ocs.com.ua`
- [ ] Obtain certificate for `admin.dev.ocs.com.ua`
- [ ] Install certificates on server

**Validation:**

- [ ] Can connect to MongoDB Atlas from server
- [ ] GitHub OAuth App shows in settings
- [ ] PAT works: `curl -H "Authorization: token $PAT" https://api.github.com/user`
- [ ] SSL certificates valid: `openssl s_client -connect admin.dev.ocs.com.ua:443`

### Phase 3: Deploy Backend Service

**Estimated time:** 1 day

**3.1 Create backend directory**

```bash
ssh ocs@your-server
mkdir -p /home/ocs/domains/dev.ocs.com.ua/app/ocs.com.ua/application/tina-backend
cd /home/ocs/domains/dev.ocs.com.ua/app/ocs.com.ua/application/tina-backend
```

**3.2 Create backend files**

- [ ] Create `package.json`
- [ ] Create `server.js`
- [ ] Create `api/tina/handler.ts`
- [ ] Create `tina/database.ts`
- [ ] Copy `tina/config.ts` from frontend
- [ ] Create `.env` with production credentials
- [ ] Create `.gitignore`

**3.3 Install dependencies and build**

```bash
bun install
bun run build
```

**3.4 Test backend locally (on server)**

```bash
bun run dev
# In another terminal:
curl http://127.0.0.1:4001/api/tina/health
```

**Validation:**

- [ ] Health check returns 200
- [ ] No errors in console
- [ ] MongoDB connection successful
- [ ] Can access GraphQL playground (if enabled)

### Phase 4: Configure systemd Service

**Estimated time:** 2 hours

**4.1 Create service file**

- [ ] Create `/etc/systemd/system/tina-backend.service`
- [ ] Set correct paths and user
- [ ] Configure environment variables

**4.2 Enable and start service**

```bash
sudo systemctl daemon-reload
sudo systemctl enable tina-backend
sudo systemctl start tina-backend
sudo systemctl status tina-backend
```

**4.3 Verify service**

```bash
journalctl -u tina-backend -f
curl http://127.0.0.1:4001/api/tina/health
```

**Validation:**

- [ ] Service starts without errors
- [ ] Service survives reboot: `sudo reboot`
- [ ] Logs show successful startup
- [ ] Health check accessible

### Phase 5: Configure Apache

**Estimated time:** 2 hours

**5.1 Create virtual hosts**

- [ ] Create `/etc/apache2/sites-available/dev.ocs.com.ua.conf`
- [ ] Create `/etc/apache2/sites-available/admin.dev.ocs.com.ua.conf`
- [ ] Enable required Apache modules
- [ ] Test configuration: `sudo apachectl configtest`

**5.2 Enable sites**

```bash
sudo a2ensite dev.ocs.com.ua
sudo a2ensite admin.dev.ocs.com.ua
sudo systemctl reload apache2
```

**5.3 Test reverse proxy**

```bash
curl -I https://admin.dev.ocs.com.ua
curl -I https://dev.ocs.com.ua
```

**Validation:**

- [ ] `admin.dev.ocs.com.ua` returns 200 (or login page)
- [ ] No SSL certificate warnings
- [ ] Reverse proxy works: check response headers
- [ ] HTTPS enforced (HTTP redirects)

### Phase 6: Configure GitHub Actions

**Estimated time:** 2 hours

**6.1 Generate deployment SSH key**

```bash
ssh-keygen -t ed25519 -C "github-actions-deploy" -f ~/.ssh/github-deploy
ssh-copy-id -i ~/.ssh/github-deploy.pub ocs@your-server
```

**6.2 Add GitHub Secrets**

- [ ] Add `DEPLOY_HOST` (server IP/hostname)
- [ ] Add `DEPLOY_SSH_KEY` (private key contents)

**6.3 Create workflow file**

- [ ] Create `.github/workflows/deploy-frontend.yml`
- [ ] Test SSH connection from Actions (manual trigger)

**6.4 Test deployment**

```bash
# Make a small change and push
echo "test" >> application/frontend/README.md
git add application/frontend/README.md
git commit -m "test: trigger deployment"
git push origin main
```

**Validation:**

- [ ] GitHub Actions workflow runs
- [ ] Build succeeds
- [ ] Deployment completes
- [ ] Site accessible at `https://dev.ocs.com.ua`

### Phase 7: End-to-End Testing

**Estimated time:** 2 hours

**7.1 Test complete content workflow**

1. [ ] Navigate to `https://admin.dev.ocs.com.ua`
1. [ ] Click "Login with GitHub"
1. [ ] Authorize OAuth app
1. [ ] Successfully logged in to TinaCMS
1. [ ] Browse equipment collection
1. [ ] Create new equipment item
1. [ ] Upload hero image
1. [ ] Fill in all multilingual fields
1. [ ] Save content
1. [ ] Check GitHub for new commit
1. [ ] Monitor GitHub Actions workflow
1. [ ] Wait for deployment to complete
1. [ ] Visit `https://dev.ocs.com.ua/en/catalogue/...`
1. [ ] Verify new equipment appears
1. [ ] Check both EN and UA versions

**7.2 Test authorization**

- [ ] Log out of TinaCMS
- [ ] Try accessing admin with unauthorized GitHub account
- [ ] Verify access denied
- [ ] Check logs for denial: `journalctl -u tina-backend -n 50`

**7.3 Test media workflow**

- [ ] Upload multiple images
- [ ] Verify images in Git under `public/assets/`
- [ ] Verify images display on site after deployment
- [ ] Test image gallery

**7.4 Test error recovery**

- [ ] Stop backend: `sudo systemctl stop tina-backend`
- [ ] Visit admin (should show 502)
- [ ] Start backend: `sudo systemctl start tina-backend`
- [ ] Verify admin loads again

**Validation:**

- [ ] Complete save → deploy → live cycle works
- [ ] Both languages render correctly
- [ ] Images display properly
- [ ] Authorization working
- [ ] Services auto-recover

### Phase 8: Production Hardening

**Estimated time:** 2 hours

**8.1 Security audit**

- [ ] Verify `.env` file permissions: `chmod 600 .env`
- [ ] Verify backend bound to localhost only
- [ ] Check SSL certificate expiry dates
- [ ] Review Apache security headers
- [ ] Verify GitHub PAT has minimal permissions
- [ ] Check MongoDB network access (IP whitelist)

**8.2 Monitoring setup**

- [ ] Set up health check cron job
- [ ] Configure log rotation for Apache
- [ ] Set up disk space alerts
- [ ] Test systemd service restart on failure

**8.3 Backup setup**

- [ ] Create backup script
- [ ] Schedule daily backups via cron
- [ ] Test backup restoration

**8.4 Documentation**

- [ ] Document all credentials (in password manager)
- [ ] Create runbook for common issues
- [ ] Document recovery procedures
- [ ] Share access with team

**Validation:**

- [ ] Security checklist complete
- [ ] Monitoring active
- [ ] Backups running
- [ ] Team has documentation

### Phase 9: Go Live

**Estimated time:** 30 minutes

**9.1 Final checks**

- [ ] All services running: `systemctl status tina-backend apache2`
- [ ] DNS configured correctly
- [ ] SSL certificates valid
- [ ] GitHub Actions last run successful
- [ ] Test content update end-to-end

**9.2 Announce to team**

- [ ] Send email with admin URL
- [ ] Share login instructions (GitHub OAuth)
- [ ] Share content editing workflow
- [ ] Provide support contact

**9.3 Monitor first 24 hours**

- [ ] Check logs periodically
- [ ] Monitor resource usage
- [ ] Be available for issues
- [ ] Document any problems

**Validation:**

- [ ] Content editors can successfully edit
- [ ] No service interruptions
- [ ] Performance acceptable
- [ ] No security issues

______________________________________________________________________

## Post-Deployment Maintenance

### Daily

- [ ] Check service status: `systemctl status tina-backend`
- [ ] Review error logs for anomalies

### Weekly

- [ ] Review GitHub Actions runs for failures
- [ ] Check disk space: `df -h`
- [ ] Verify backups completed successfully

### Monthly

- [ ] Review authorized users list
- [ ] Check SSL certificate expiry (if not automated)
- [ ] Review and rotate logs
- [ ] Update packages if security patches available

### Quarterly

- [ ] Rotate GitHub Personal Access Token
- [ ] Review MongoDB access logs (Atlas dashboard)
- [ ] Test disaster recovery procedure
- [ ] Update documentation

______________________________________________________________________

## Known Limitations

1. **CLI 3.0.0 requires flags:** Must use `--local --skip-cloud-checks` for self-hosted builds
1. **No real-time collaboration:** Multiple editors can conflict if editing same file
1. **Build time:** 3-5 minutes from save to live (acceptable for content updates)
1. **MongoDB required:** Can't use simpler database; TinaCMS requires Level-compatible adapter
1. **Next Auth dependency:** Even though we're using Astro, backend needs Next Auth for Auth.js
1. **No media CDN:** Images served from Apache, not CDN (can add Cloudflare in front)

______________________________________________________________________

## Future Enhancements

1. **Image optimization:** Add sharp/imgproxy for automatic image resizing
1. **Content approval workflow:** Require review before publishing
1. **Staging environment:** Preview changes before deploying to production
1. **CDN integration:** Serve media from Cloudflare R2 or similar
1. **Search indexing:** Index content for site search feature
1. **Webhooks:** Notify Slack/Discord when content published
1. **Analytics:** Track which content is edited most frequently
1. **Multi-environment:** Support dev/staging/production with separate backends

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
- [ ] Security considerations addressed
- [ ] Infrastructure costs acceptable (MongoDB Atlas free tier)
- [ ] Team understands content workflow
- [ ] Maintenance responsibilities assigned
- [ ] Disaster recovery plan acceptable

______________________________________________________________________

**Status:** Design complete - awaiting user approval
**Next step:** User reviews design → Invoke `writing-plans` skill to create implementation plan
