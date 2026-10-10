# TinaCMS Self-Hosted Setup

This document describes the self-hosted TinaCMS configuration for the OCS.com.ua frontend.

## Architecture

```
dev.ocs.com.ua
├── /           → Astro site (bilingual pages)
└── /admin      → TinaCMS admin UI
```

This single-domain setup means:

- Main site and admin UI share the same origin (no CORS issues)
- Simpler authentication flow (same-site cookies)
- Easier deployment (one domain, one SSL cert)
- Admin UI accessible at https://dev.ocs.com.ua/admin

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
```

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

- **Homepage URL**: https://dev.ocs.com.ua
- **Authorization callback URL**: https://dev.ocs.com.ua/api/auth/callback/github

### 2. Set Production Environment Variables

On your production server, configure:

```bash
GITHUB_CLIENT_ID=prod_client_id
GITHUB_CLIENT_SECRET=prod_client_secret
NEXTAUTH_SECRET=prod_secret_generated_with_openssl
NEXTAUTH_URL=https://dev.ocs.com.ua
PUBLIC_TINA_ADMIN_ORIGIN=https://dev.ocs.com.ua
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
