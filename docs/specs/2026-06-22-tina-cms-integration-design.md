# Tina CMS Integration Design for OCS Website

**Date:** 2026-06-22
**Status:** Approved
**Author:** AI Assistant
**Stakeholders:** OCS Development Team

## Executive Summary

This document specifies the integration of Tina CMS into the OCS multilingual Astro website to enable non-technical content editors to manage website content through visual in-place editing while maintaining perfect SEO through static site generation.

## Goals

1. **Enable non-technical content editing** - Provide intuitive visual editing interface
1. **Maintain perfect SEO** - 100% static HTML generation with zero JavaScript for public visitors
1. **Support bilingual content** - Seamless editing for English and Ukrainian content
1. **Manage product catalog** - Rich product pages with specifications, images, and downloadable resources
1. **Implement lead generation** - Email capture for PDF downloads
1. **Git-based workflow** - All content changes version-controlled in GitHub
1. **Self-hosted deployment** - Complete control over infrastructure

## Non-Goals

- Real-time content updates (static regeneration is acceptable)
- E-commerce functionality (products are informational only)
- User-generated content or comments
- Multi-tenant or white-label capabilities

## System Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Content Editor                           │
│  (Non-technical user with GitHub account)                    │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│              Tina CMS Visual Editor                          │
│  - In-place editing on actual pages                          │
│  - Real-time preview                                         │
│  - Form-based editing for structured data                    │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│              Tina Cloud Authentication                       │
│  - GitHub OAuth                                              │
│  - Free tier (up to 2 users)                                │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│              GitHub Repository                               │
│  - Content stored as JSON/Markdown                           │
│  - Full version history                                      │
│  - Branch: main (production)                                 │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│              GitHub Actions CI/CD                            │
│  - Triggered on push to main                                 │
│  - Builds Astro static site                                  │
│  - Runs tests and linting                                    │
│  - Deploys to production server                              │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│              Self-Hosted Server                              │
│  - Serves static HTML/CSS/JS                                 │
│  - Nginx or similar web server                               │
│  - CDN for assets (optional)                                 │
└─────────────────────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│              Public Visitors                                 │
│  - Receive 100% static HTML                                  │
│  - Zero Tina JavaScript loaded                               │
│  - Perfect SEO and performance                               │
└─────────────────────────────────────────────────────────────┘
```

### Content Flow

```
Editor Action → Tina UI → Git Commit → GitHub Actions →
Astro Build → Static Site → Deploy → Live (2-3 min)
```

### SEO Architecture

**For Public Visitors:**

- 100% static HTML pre-rendered at build time
- Zero Tina CMS JavaScript loaded
- All content in HTML for search engine crawlers
- Perfect for LLM indexing

**For Authenticated Editors:**

- Tina CMS JavaScript loads only after authentication
- Visual editing overlay on actual pages
- Real-time preview of changes
- No impact on public site performance

## Content Structure

### Directory Organization

```
application/frontend/src/content/
├── en/                              # English content
│   ├── homepage.json               # Homepage sections
│   ├── navigation.json             # Navigation menu
│   ├── site-config.json            # Site metadata & SEO
│   ├── products/                   # Product catalog
│   │   ├── checkweigher-ema-300.md
│   │   ├── metal-detector-md-500.md
│   │   └── xray-inspector-xi-700.md
│   ├── categories/                 # Product categories
│   │   ├── checkweighers.json
│   │   ├── metal-detectors.json
│   │   └── xray-systems.json
│   ├── industries/                 # Industry pages
│   │   ├── food.md
│   │   ├── pharma.md
│   │   └── logistics.md
│   └── pages/                      # Additional pages
│       ├── about.md
│       └── contact.md
└── ua/                              # Ukrainian content (mirror structure)
    ├── homepage.json
    ├── navigation.json
    ├── site-config.json
    ├── products/
    ├── categories/
    ├── industries/
    └── pages/
```

### Content Type Strategy

**JSON Files (Structured Data):**

- `homepage.json` - Homepage sections with hero, industries, features
- `navigation.json` - Menu structure with links and submenus
- `site-config.json` - Site metadata, SEO defaults, contact info
- `categories/*.json` - Product category definitions

**Markdown Files (Rich Content):**

- `products/*.md` - Product pages with descriptions and specifications
- `industries/*.md` - Industry-specific landing pages
- `pages/*.md` - About, contact, and other content pages

**Rationale:**

- JSON excels at structured, repeating data (menus, config, lists)
- Markdown excels at long-form content (product descriptions, articles)
- Both are fully editable through Tina's visual interface
- Tina provides appropriate UI for each format

### Product Content Model

Each product is a Markdown file with YAML frontmatter:

```markdown
---
# Core Information
id: "checkweigher-ema-300"
name: "EMA-300 High-Precision Checkweigher"
slug: "checkweigher-ema-300"
category: "checkweighers"
industries: ["food", "pharma", "logistics"]
featured: true
status: "published"

# Media
images:
  - url: "/images/products/ema-300-main.jpg"
    alt: "EMA-300 Checkweigher front view"
    caption: "High-precision weighing system"
  - url: "/images/products/ema-300-detail.jpg"
    alt: "EMA-300 control panel"

# Technical Specifications
specifications:
  - label: "Weighing Range"
    value: "10g - 50kg"
  - label: "Accuracy"
    value: "±0.1g"
  - label: "Speed"
    value: "Up to 300 products/min"

# Downloadable Resources
datasheets:
  - title: "Technical Datasheet"
    description: "Complete specifications"
    file: "/downloads/ema-300-datasheet.pdf"
    requiresEmail: true
  - title: "User Manual"
    file: "/downloads/ema-300-manual.pdf"
    requiresEmail: false

# Relationships
relatedProducts:
  - "metal-detector-md-500"
  - "xray-inspector-xi-700"

# SEO
seo:
  title: "EMA-300 High-Precision Checkweigher | OCS Equipment"
  description: "Industrial checkweigher with ±0.1g accuracy..."
  keywords: ["checkweigher", "industrial weighing"]
  ogImage: "/images/products/ema-300-og.jpg"
---

# Product Overview

The EMA-300 is a state-of-the-art high-precision checkweigher...

## Key Features

- High-speed operation up to 300 products per minute
- Advanced rejection systems
- Easy integration with existing production lines

## Applications

Perfect for food processing, pharmaceutical packaging...
```

### Homepage Content Model (JSON)

```json
{
  "hero": {
    "slides": [
      {
        "id": "food-industry",
        "title": "Food Industry Solutions",
        "description": "High-precision equipment...",
        "ctaText": "Explore Food Solutions",
        "ctaLink": "/en/industries/food",
        "backgroundImage": "/images/hero/food-industry.jpg",
        "accentColor": "blue"
      }
    ]
  },
  "industries": {
    "title": "Industries We Serve",
    "description": "Specialized solutions...",
    "cards": [
      {
        "id": "food",
        "name": "Food Industry",
        "description": "Quality control solutions",
        "icon": "utensils",
        "link": "/en/industries/food",
        "image": "/images/industries/food.webp"
      }
    ]
  },
  "whyChooseUs": {
    "title": "Why Choose OCS",
    "benefits": [
      {
        "icon": "award",
        "title": "Industry Leader",
        "description": "Over 30 years of experience"
      }
    ]
  }
}
```

## Tina CMS Configuration

### Schema Definition

The Tina schema defines how content is structured and edited. Key collections:

1. **Homepage Collection** (JSON)

   - Hero slides with images, titles, CTAs
   - Industries section with cards
   - Featured equipment references
   - Why Choose Us benefits
   - Contact form configuration

1. **Products Collection** (Markdown)

   - Product metadata (name, category, industries)
   - Image gallery with alt text
   - Technical specifications list
   - Downloadable resources with email gating
   - Related products
   - SEO metadata
   - Rich text description body

1. **Navigation Collection** (JSON)

   - Main menu with nested submenus
   - Footer links
   - Language switcher configuration

1. **Site Config Collection** (JSON)

   - Site name and URL
   - Default SEO settings
   - Contact information
   - Social media links

1. **Categories Collection** (JSON)

   - Category metadata
   - SEO settings per category
   - Display order

1. **Industries Collection** (Markdown)

   - Industry overview
   - Key benefits
   - Featured products
   - Case studies (future)

### Visual Editing Configuration

Each Astro page/component will include `data-tina-field` attributes to enable in-place editing:

```astro
<h1 data-tina-field={tinaProps.hero.slides[0].title}>
  {homepage.hero.slides[0].title}
</h1>
```

When an authenticated editor visits the page:

1. Tina detects the `data-tina-field` attributes
1. Adds visual editing indicators (pencil icons)
1. Clicking opens the appropriate field editor
1. Changes preview in real-time
1. Save commits to GitHub

## Astro Integration

### Required Packages

```json
{
  "dependencies": {
    "@tinacms/astro": "^0.5.0",
    "tinacms": "^3.9.3"
  },
  "devDependencies": {
    "@tinacms/cli": "^2.5.1"
  }
}
```

### Astro Configuration

```javascript
// astro.config.mjs
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import node from '@astrojs/node';

export default defineConfig({
  output: 'hybrid', // Enable SSR for Tina admin routes
  adapter: node({ mode: 'standalone' }),
  integrations: [react()],
  // ... rest of config
});
```

### Page Integration Pattern

```astro
---
// src/pages/[locale]/index.astro
import Layout from '@/layouts/Layout.astro';
import { loadHomepage } from '@/lib/content';
import { useTina } from 'tinacms/dist/react';

const { locale } = Astro.params;
const homepage = await loadHomepage(locale);

// Enable Tina editing
const { data } = useTina({
  query: `...GraphQL query...`,
  variables: { relativePath: `${locale}/homepage.json` },
  data: homepage,
});
---

<Layout>
  <section data-tina-field={data.hero}>
    <h1 data-tina-field={data.hero.slides[0].title}>
      {data.hero.slides[0].title}
    </h1>
  </section>
</Layout>
```

## Email Capture for PDF Downloads

### API Route

```typescript
// src/pages/api/download.ts
import type { APIRoute } from 'astro';

export const POST: APIRoute = async ({ request }) => {
  const { email, productId, fileUrl } = await request.json();

  // Validate email
  if (!email || !email.includes('@')) {
    return new Response(
      JSON.stringify({ error: 'Invalid email' }),
      { status: 400 }
    );
  }

  // Store lead in database/CRM
  await storeLead({ email, productId, fileUrl });

  // Return download URL
  return new Response(
    JSON.stringify({
      success: true,
      downloadUrl: fileUrl
    }),
    { status: 200 }
  );
};
```

### Frontend Component

```tsx
// src/components/DownloadButton.tsx
export function DownloadButton({
  fileUrl,
  fileName,
  productId,
  requiresEmail
}) {
  const [showModal, setShowModal] = useState(false);
  const [email, setEmail] = useState('');

  const handleDownload = async () => {
    if (!requiresEmail) {
      window.open(fileUrl, '_blank');
      return;
    }

    const response = await fetch('/api/download', {
      method: 'POST',
      body: JSON.stringify({ email, productId, fileUrl })
    });

    const data = await response.json();
    if (data.success) {
      window.open(data.downloadUrl, '_blank');
      setShowModal(false);
    }
  };

  return (
    <>
      <button onClick={() =>
        requiresEmail ? setShowModal(true) : handleDownload()
      }>
        Download {fileName}
      </button>

      {showModal && (
        <EmailCaptureModal
          onSubmit={handleDownload}
          email={email}
          setEmail={setEmail}
        />
      )}
    </>
  );
}
```

## SEO Optimization

### Technical SEO Implementation

1. **Static HTML Generation**

   - All pages pre-rendered at build time
   - Zero client-side rendering for content
   - Perfect for search engine crawlers

1. **Structured Data**

   ```json
   {
     "@context": "https://schema.org",
     "@type": "Product",
     "name": "EMA-300 Checkweigher",
     "description": "...",
     "image": [...],
     "brand": { "@type": "Brand", "name": "OCS" }
   }
   ```

1. **Meta Tags**

   - Unique title and description per page
   - Open Graph tags for social sharing
   - Twitter Card tags
   - Canonical URLs
   - Hreflang tags for bilingual content

1. **Sitemap Generation**

   - Automatic XML sitemap via `@astrojs/sitemap`
   - Includes all pages and products
   - Bilingual URL structure

1. **Performance Optimization**

   - Minimal JavaScript (only for interactivity)
   - Optimized images (WebP format)
   - Lazy loading for images
   - Critical CSS inlining
   - Fast server response times

### SEO-Friendly URL Structure

```
/en/                              # English homepage
/en/products/checkweigher-ema-300 # Product page
/en/industries/food               # Industry page
/en/about                         # About page

/ua/                              # Ukrainian homepage
/ua/products/checkweigher-ema-300 # Same product, Ukrainian
/ua/industries/food               # Same industry, Ukrainian
```

### LLM Optimization

- Clean, semantic HTML structure
- Descriptive headings and subheadings
- Structured data for entities
- Clear content hierarchy
- Comprehensive product information
- Natural language descriptions

## Authentication & Access Control

### Tina Cloud Authentication

**Setup:**

1. Create account at tina.io
1. Connect GitHub repository
1. Configure OAuth app in GitHub
1. Add environment variables to project

**Environment Variables:**

```env
NEXT_PUBLIC_TINA_CLIENT_ID=your_client_id
TINA_TOKEN=your_token
TINA_BRANCH=main
```

**Editor Access Flow:**

1. Editor visits `yoursite.com/admin`
1. Clicks "Login with GitHub"
1. Tina Cloud authenticates via GitHub OAuth
1. Only authorized GitHub users can edit
1. Changes commit with editor's GitHub identity

**Free Tier Limits:**

- Up to 2 users
- Unlimited content
- Unlimited API requests
- No credit card required

**Paid Tier (if needed):**

- $29/month for up to 5 users
- $99/month for up to 20 users
- Custom pricing for larger teams

## CI/CD Pipeline

### GitHub Actions Workflow

```yaml
# .github/workflows/deploy.yml
name: Build and Deploy

on:
  push:
    branches: [main]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci
        working-directory: application/frontend

      - name: Build Tina
        run: npx tinacms build
        working-directory: application/frontend
        env:
          NEXT_PUBLIC_TINA_CLIENT_ID: ${{ secrets.TINA_CLIENT_ID }}
          TINA_TOKEN: ${{ secrets.TINA_TOKEN }}

      - name: Build Astro
        run: npm run build
        working-directory: application/frontend

      - name: Deploy to server
        uses: easingthemes/ssh-deploy@v4
        with:
          SSH_PRIVATE_KEY: ${{ secrets.SSH_PRIVATE_KEY }}
          REMOTE_HOST: ${{ secrets.REMOTE_HOST }}
          REMOTE_USER: ${{ secrets.REMOTE_USER }}
          SOURCE: "application/frontend/dist/"
          TARGET: "/var/www/ocs.com.ua/"
```

### Build Process

1. **Trigger:** Push to main branch
1. **Install:** Dependencies via npm ci
1. **Build Tina:** Generate admin interface
1. **Build Astro:** Generate static site
1. **Test:** Run linting and tests (optional)
1. **Deploy:** SSH to server and copy files
1. **Notify:** Send deployment notification (optional)

**Build Time:** ~2-3 minutes for typical site

## Development Workflow

### Local Development

```bash
# Start development server with Tina
cd application/frontend
npm run dev

# This runs: tinacms dev -c "astro dev"
# Access:
# - Site: http://localhost:4321
# - Tina Admin: http://localhost:4321/admin
```

### Content Editing Workflow

**For Editors:**

1. Visit production site
1. Click "Edit" button (visible only when logged in)
1. Tina overlay loads on the page
1. Edit content with real-time preview
1. Click "Save" to commit changes
1. Wait 2-3 minutes for site to rebuild
1. Refresh to see live changes

**For Developers:**

1. Create feature branch for structural changes
1. Update Tina schema if adding new content types
1. Test locally with `npm run dev`
1. Commit and push to GitHub
1. Create pull request for review
1. Merge to main → auto-deploys

### Content vs Structure Changes

**Content Changes (Editors):**

- Text, images, descriptions
- Product specifications
- Navigation menu items
- Contact information
- Committed directly to main branch

**Structure Changes (Developers):**

- New page templates
- Component modifications
- Tina schema updates
- Styling changes
- Go through PR review process

## Migration Plan

### Phase 1: Setup (Week 1)

**Day 1-2: Tina Installation**

- Install Tina packages
- Configure Tina schema for existing content
- Set up Tina Cloud authentication
- Test admin interface locally

**Day 3-4: Content Integration**

- Add Tina integration to Astro pages
- Add `data-tina-field` attributes to components
- Configure visual editing for homepage
- Test editing flow locally

**Day 5: CI/CD Setup**

- Configure GitHub Actions workflow
- Set up deployment to staging server
- Test full build and deploy process
- Verify production build works

### Phase 2: Content Migration (Week 2)

**Day 1-2: Homepage & Navigation**

- Configure Tina schema for homepage.json
- Configure Tina schema for navigation.json
- Test editing homepage sections
- Test editing navigation menu

**Day 3-4: Products**

- Create product Markdown templates
- Migrate existing product references to full products
- Configure product schema in Tina
- Test product editing and creation

**Day 5: Additional Pages**

- Configure industry pages
- Configure about/contact pages
- Test all page types
- Verify bilingual content works

### Phase 3: Training & Launch (Week 3)

**Day 1-2: Editor Training**

- Create editor documentation
- Record video tutorials
- Train editors on Tina interface
- Practice editing workflow

**Day 3-4: Staging Testing**

- Deploy to staging environment
- Editors test all functionality
- Fix any issues discovered
- Verify SEO remains optimal

**Day 5: Production Launch**

- Deploy to production
- Monitor for issues
- Gather editor feedback
- Plan improvements

## Maintenance & Operations

### Ongoing Maintenance

**Weekly:**

- Monitor build times
- Check for failed deployments
- Review editor feedback

**Monthly:**

- Update Tina CMS packages
- Review and optimize build process
- Analyze site performance
- Check SEO metrics

**Quarterly:**

- Major dependency updates
- Security audit
- Performance optimization
- Feature enhancements

### Monitoring

**Build Monitoring:**

- GitHub Actions notifications
- Build time tracking
- Failure alerts

**Site Monitoring:**

- Uptime monitoring
- Performance metrics (Lighthouse)
- SEO ranking tracking
- Traffic analytics

### Backup Strategy

**Automatic Backups:**

- Git history (complete version control)
- GitHub repository backups
- Server-level backups (if applicable)

**Recovery:**

- Rollback via Git revert
- Rebuild from any commit
- Fast recovery time (\<5 minutes)

## Scalability Considerations

### Content Scale

**Current Capacity:**

- Unlimited pages and products
- Build time scales linearly
- ~100 pages = ~2 minute build
- ~1000 pages = ~10 minute build

**Optimization Strategies:**

- Incremental builds (future Astro feature)
- Parallel builds for different locales
- CDN for static assets
- Image optimization pipeline

### Editor Scale

**Tina Cloud Limits:**

- Free tier: 2 users
- Paid tier: 5-20 users
- Enterprise: Unlimited users

**Collaboration:**

- Git-based workflow prevents conflicts
- Each editor commits separately
- Merge conflicts rare (different files)
- Clear content ownership recommended

### Traffic Scale

**Static Site Benefits:**

- Handles unlimited traffic
- No database bottlenecks
- CDN-friendly
- Fast response times

**Recommended Infrastructure:**

- Nginx web server
- CDN (Cloudflare, CloudFront)
- HTTP/2 enabled
- Gzip compression

## Security Considerations

### Authentication Security

- GitHub OAuth (industry standard)
- No passwords stored in application
- Token-based API access
- Automatic token rotation

### Content Security

- All changes tracked in Git
- Audit trail via commit history
- Easy rollback of malicious changes
- Branch protection rules

### Deployment Security

- SSH key authentication
- Secrets stored in GitHub Secrets
- No credentials in code
- HTTPS enforced

### Application Security

- Static site (minimal attack surface)
- No database to compromise
- No server-side code execution
- Regular dependency updates

## Success Metrics

### Editor Experience

- Time to edit content: \<2 minutes
- Time to publish: \<5 minutes (including build)
- Editor satisfaction: >4/5 rating
- Training time: \<1 hour

### Technical Performance

- Build time: \<3 minutes
- Page load time: \<2 seconds
- Lighthouse score: >90
- Zero JavaScript for content

### SEO Performance

- Maintain or improve search rankings
- Structured data validation: 100%
- Mobile-friendly: Yes
- Core Web Vitals: All green

### Business Metrics

- Lead capture rate: Track downloads
- Content update frequency: Track commits
- Editor adoption: Track active users
- Site traffic: Monitor analytics

## Risks & Mitigation

### Risk: Build Failures

**Mitigation:**

- Comprehensive testing in CI/CD
- Staging environment for validation
- Automatic rollback on failure
- Monitoring and alerts

### Risk: Editor Mistakes

**Mitigation:**

- Git version control (easy rollback)
- Preview before publish (future enhancement)
- Editor training and documentation
- Content review process (optional)

### Risk: Tina Cloud Dependency

**Mitigation:**

- Self-hosted auth option available
- Content stored in Git (portable)
- Can migrate to other CMS if needed
- Open source core (tinacms)

### Risk: Build Time Growth

**Mitigation:**

- Monitor build times
- Optimize as needed
- Incremental builds (future)
- Parallel builds for locales

## Future Enhancements

### Phase 4: Advanced Features (Future)

1. **Preview Deployment**

   - Separate preview environment
   - Preview changes before publishing
   - Share preview links with stakeholders

1. **Content Scheduling**

   - Schedule content publication
   - Automated publish at specific times
   - Draft/published workflow

1. **Media Management**

   - Advanced image editing
   - Automatic image optimization
   - Asset library organization

1. **Analytics Integration**

   - Content performance tracking
   - Popular products dashboard
   - Editor activity metrics

1. **Advanced SEO**

   - Automated SEO suggestions
   - Keyword tracking
   - Competitor analysis

1. **Multilingual Expansion**

   - Add more languages
   - Translation workflow
   - Language fallbacks

## Conclusion

This design provides a comprehensive solution for content management that balances:

- **Editor Experience:** Visual, intuitive editing interface
- **Developer Experience:** Modern, maintainable architecture
- **SEO Performance:** Perfect static site generation
- **Business Goals:** Lead generation and content control
- **Operational Efficiency:** Automated workflows and monitoring

The Tina CMS integration enables non-technical editors to manage all website content while maintaining the technical excellence required for optimal SEO and performance.

## Appendices

### Appendix A: Tina Schema Reference

See `application/frontend/tina/config.ts` for complete schema definition.

### Appendix B: Content Type Examples

See content structure section for detailed examples of each content type.

### Appendix C: API Endpoints

- `/api/download` - PDF download with email capture
- `/admin` - Tina CMS admin interface
- `/admin/index.html` - Tina admin entry point

### Appendix D: Environment Variables

```env
# Tina Cloud
NEXT_PUBLIC_TINA_CLIENT_ID=<from tina.io>
TINA_TOKEN=<from tina.io>
TINA_BRANCH=main

# Deployment
SSH_PRIVATE_KEY=<for deployment>
REMOTE_HOST=<your server>
REMOTE_USER=<ssh user>
```

### Appendix E: Useful Commands

```bash
# Development
npm run dev                    # Start dev server with Tina
npx tinacms dev -c "astro dev" # Alternative dev command

# Building
npm run build                  # Build for production
npx tinacms build              # Build Tina admin only

# Deployment
npm run preview                # Preview production build locally

# Maintenance
npm update tinacms             # Update Tina CMS
npm audit                      # Security audit
```

### Appendix F: Resources

- Tina CMS Documentation: https://tina.io/docs/
- Astro Documentation: https://docs.astro.build/
- GitHub Actions: https://docs.github.com/actions
- Schema.org: https://schema.org/
