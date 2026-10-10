# TinaCMS Production Deployment Checklist

Use this checklist when deploying TinaCMS self-hosted backend to production at dev.ocs.com.ua/admin.

## Pre-Deployment Requirements

### GitHub OAuth Application

- [ ] Create production GitHub OAuth app at https://github.com/settings/developers
- [ ] Set Homepage URL to: `https://dev.ocs.com.ua`
- [ ] Set Authorization callback URL to: `https://dev.ocs.com.ua/api/auth/callback/github`
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
NEXTAUTH_URL=https://dev.ocs.com.ua
PUBLIC_TINA_ADMIN_ORIGIN=https://dev.ocs.com.ua
GITHUB_OWNER=LilConsul
GITHUB_REPO=ocs.com.ua
GITHUB_BRANCH=main
NODE_ENV=production
```

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

- [ ] Domain dev.ocs.com.ua points to server
- [ ] SSL certificate configured
- [ ] Reverse proxy configured (if applicable)
- [ ] Port forwarding configured correctly

## Post-Deployment Verification

### Connectivity Tests

- [ ] Visit https://dev.ocs.com.ua
- [ ] Verify homepage loads without errors
- [ ] Visit https://dev.ocs.com.ua/admin
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

- [ ] Visit https://dev.ocs.com.ua/ua/
- [ ] Visit https://dev.ocs.com.ua/en/
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

- [ ] Admin UI loads at https://dev.ocs.com.ua/admin
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
