# OCS.com.ua Website Redesign - Design Specification

**Date:** 2026-05-31  
**Project:** OCS.com.ua Industrial Equipment Website  
**Status:** Draft for Review

## Executive Summary

Complete redesign of ocs.com.ua from scratch using modern web technologies to create a fast, SEO-friendly, AI-optimized bilingual (Ukrainian/English) industrial equipment catalog website with an integrated admin panel for content management.

**Key Goals:**
- Maximum SEO and AI discoverability
- Static HTML generation for performance (Lighthouse 95+)
- Visual inline content editing
- Equipment configurator with industry-based navigation
- Bilingual support (UA/EN)
- Self-hosted deployment
- Mini-CRM for analytics and user management

## Architecture Overview

### Three-Tier Architecture

**1. Public Website (Astro Static Site)**
- Pure static HTML/CSS with minimal JavaScript
- Deployed to self-hosted server via Nginx
- Bilingual routing: `/en/*` and `/ua/*`
- Content sourced from JSON files in repository
- Zero JS on public pages for optimal SEO

**2. Admin Panel (React SPA)**
- Separate React application served from `/admin`
- Visual inline editor for content management
- Equipment configurator CRUD operations
- Analytics dashboard
- Media library with image optimization
- Triggers rebuild via API webhook

**3. Backend API (FastAPI)**
- User authentication and session management
- Content management endpoints (read/write JSON files)
- Analytics and metrics storage (PostgreSQL)
- Webhook to trigger CI/CD rebuild
- CORS configured for admin panel
- Image upload and optimization

### Deployment Flow

```
Admin edits content → 
FastAPI saves to JSON files → 
Commits to Git repository → 
GitHub webhook triggers → 
GitHub Action runs:
  1. npm run build (Astro)
  2. rsync/scp to server
  3. Reload Nginx
Total time: 2-3 minutes
```

## Content Structure

### JSON Content Organization

```
/application/frontend/src/content/
├── /en/
│   ├── site-config.json          # Global settings, meta tags, contact info
│   ├── navigation.json            # Menu structure
│   ├── homepage.json              # Hero, sections, CTAs
│   ├── /industries/
│   │   ├── food.json              # Food industry page
│   │   ├── pharma.json            # Pharmaceutical industry page
│   │   └── logistics.json         # Logistics industry page
│   └── /equipment/
│       ├── checkweighers.json     # Category page
│       ├── metal-detectors.json   # Category page
│       └── [equipment-id].json    # Individual equipment pages
└── /ua/                           # Mirror structure for Ukrainian
```

### Equipment Data Model

```json
{
  "id": "checkweigher-ema-300",
  "category": "checkweighers",
  "industries": ["food", "pharma"],
  "name": "E-M-A 300",
  "shortDescription": "High-precision dynamic checkweigher",
  "description": "Detailed description with rich text support...",
  "specifications": {
    "speed": "650 pc/min",
    "accuracy": "±0.1g",
    "weightRange": "5g - 6000g",
    "beltWidth": "300mm"
  },
  "features": [
    "Maximum reliability and precision",
    "Unlimited modularity",
    "Suitable for complex multilane applications"
  ],
  "images": [
    "/images/equipment/ema-300-main.jpg",
    "/images/equipment/ema-300-detail.jpg"
  ],
  "datasheets": [
    "/downloads/ema-300-datasheet-en.pdf"
  ],
  "seo": {
    "title": "E-M-A 300 Checkweigher | High-Precision Weighing",
    "description": "High-precision dynamic checkweigher with 650 pc/min speed...",
    "keywords": ["checkweigher", "dynamic weighing", "quality control"]
  },
  "structuredData": {
    "@type": "Product",
    "brand": "WIPOTEC-OCS",
    "category": "Industrial Equipment"
  }
}
```

### Editable Content Model

Each text element in the system has:
- `id` - Unique identifier for targeting
- `type` - Element type (heading, paragraph, button, etc.)
- `content` - The actual text content
- `metadata` - SEO hints, styling preferences

## User Flows

### Public Website User Flow

**Dual Entry Points:**

1. **Browse by Industry:**
   - Homepage → Select Industry (Food/Pharma/Logistics)
   - Industry page with overview and equipment categories
   - Category page with filtered equipment list
   - Individual equipment detail page

2. **Browse All Equipment:**
   - Homepage → "All Equipment" link
   - Equipment catalog with filters (industry, category, specifications)
   - Individual equipment detail page

**Equipment Detail Page Includes:**
- Hero image and name
- Short description
- Detailed specifications table
- Features list
- Image gallery
- Downloadable datasheets
- Related equipment suggestions
- Contact/inquiry CTA

### Admin Panel User Flow

**1. Login:**
- Simple password authentication
- Session-based with JWT tokens
- Designed for future role-based expansion

**2. Dashboard:**
- Quick stats (page views, popular equipment)
- Recent changes log
- Pending deployments status

**3. Visual Content Editor:**
- Navigate to any public page
- Toggle "Edit Mode"
- Hover over text elements → highlight with edit icon
- Click to edit inline with rich text editor
- Save changes → queued for deployment
- Preview changes before publishing

**4. Equipment Management:**
- List view with search/filter
- Add new equipment (form with all fields)
- Edit existing equipment
- Delete equipment (with confirmation)
- Bulk import/export (CSV/JSON)

**5. Media Library:**
- Upload images
- Auto-optimization (resize, WebP conversion)
- Organize by folders/tags
- Usage tracking (which pages use which images)

**6. Deployment Control:**
- View pending changes
- Preview changes in staging environment
- Trigger manual rebuild
- View build status and logs
- Rollback to previous version if needed

## Admin Panel Features

### 1. Visual Inline Editor
- Hover highlighting of editable elements
- Click-to-edit with rich text toolbar
- Live preview of changes
- Undo/redo functionality
- Auto-save drafts

### 2. Equipment Configurator Management
- **List View**: Searchable, filterable equipment table
- **Add New**: Comprehensive form for all equipment fields
- **Edit**: Modify existing equipment details
- **Delete**: Remove equipment with confirmation dialog
- **Bulk Operations**: Import/export equipment data (CSV/JSON)
- **Duplicate**: Clone equipment for similar products

### 3. Content Management
- Edit homepage sections (hero, features, industries)
- Manage navigation menu structure
- Update industry pages
- Configure site-wide settings (meta tags, contact info, social links)
- Manage translations (EN/UA content side-by-side)

### 4. Media Library
- Drag-and-drop image upload
- Automatic image optimization (WebP, multiple sizes)
- Organize by folders and tags
- Search and filter images
- Usage tracking (where images are used)
- Bulk operations (delete, move, tag)

### 5. Analytics Dashboard
- Page views by URL
- Popular equipment (most viewed)
- User behavior metrics (bounce rate, time on page)
- Search queries (if search implemented)
- Geographic distribution
- Device/browser statistics

### 6. Deployment Control
- View pending changes (diff view)
- Preview changes before publishing
- Trigger manual rebuild
- View build status and logs
- Deployment history with rollback capability
- Scheduled deployments (optional future feature)

## SEO & AI Optimization Strategy

### 1. Technical SEO

**Semantic HTML5:**
- Proper use of `<header>`, `<nav>`, `<main>`, `<article>`, `<section>`, `<aside>`, `<footer>`
- Heading hierarchy (single `<h1>` per page, proper `<h2>`-`<h6>` nesting)
- Descriptive link text (no "click here")
- Accessible forms with proper labels

**URL Structure:**
- Clean, descriptive URLs: `/en/equipment/checkweighers/ema-300`
- Consistent pattern across languages
- No query parameters for content pages
- Proper use of hyphens (not underscores)

**Site Architecture:**
- XML sitemap auto-generated via `@astrojs/sitemap`
- robots.txt with proper directives
- Canonical URLs for bilingual content
- Breadcrumb navigation on all pages

### 2. Meta Tags & Open Graph

**Per-Page Meta Tags:**
```html
<title>E-M-A 300 Checkweigher | High-Precision Weighing | OCS</title>
<meta name="description" content="...">
<meta name="keywords" content="...">
<link rel="canonical" href="https://ocs.com.ua/en/equipment/checkweighers/ema-300">
<link rel="alternate" hreflang="en" href="https://ocs.com.ua/en/equipment/checkweighers/ema-300">
<link rel="alternate" hreflang="uk" href="https://ocs.com.ua/ua/equipment/checkweighers/ema-300">
```

**Open Graph Tags:**
```html
<meta property="og:title" content="...">
<meta property="og:description" content="...">
<meta property="og:image" content="...">
<meta property="og:url" content="...">
<meta property="og:type" content="website">
<meta property="og:locale" content="en_US">
<meta property="og:locale:alternate" content="uk_UA">
```

**Twitter Card:**
```html
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="...">
<meta name="twitter:description" content="...">
<meta name="twitter:image" content="...">
```

### 3. Structured Data (JSON-LD)

**Organization Schema:**
```json
{
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "WIPOTEC-OCS",
  "url": "https://ocs.com.ua",
  "logo": "https://ocs.com.ua/images/logo.png",
  "contactPoint": {
    "@type": "ContactPoint",
    "telephone": "+38-095-106-11-92",
    "contactType": "sales",
    "email": "info@ocs.com.ua"
  }
}
```

**Product Schema (per equipment):**
```json
{
  "@context": "https://schema.org",
  "@type": "Product",
  "name": "E-M-A 300 Checkweigher",
  "description": "...",
  "brand": {
    "@type": "Brand",
    "name": "WIPOTEC-OCS"
  },
  "category": "Industrial Equipment",
  "image": ["..."],
  "offers": {
    "@type": "Offer",
    "availability": "https://schema.org/InStock",
    "priceSpecification": {
      "@type": "PriceSpecification",
      "priceCurrency": "USD",
      "price": "Contact for pricing"
    }
  }
}
```

**BreadcrumbList Schema:**
```json
{
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": [
    {
      "@type": "ListItem",
      "position": 1,
      "name": "Home",
      "item": "https://ocs.com.ua/en"
    },
    {
      "@type": "ListItem",
      "position": 2,
      "name": "Equipment",
      "item": "https://ocs.com.ua/en/equipment"
    },
    {
      "@type": "ListItem",
      "position": 3,
      "name": "Checkweighers",
      "item": "https://ocs.com.ua/en/equipment/checkweighers"
    }
  ]
}
```

### 4. Performance Optimization

**Target Metrics:**
- Lighthouse Performance: 95+
- First Contentful Paint (FCP): < 1.5s
- Largest Contentful Paint (LCP): < 2.5s
- Time to Interactive (TTI): < 3.5s
- Cumulative Layout Shift (CLS): < 0.1

**Optimization Strategies:**
- Static HTML generation (no client-side rendering)
- Image optimization (WebP format, responsive images, lazy loading)
- Minimal CSS (critical CSS inlined, rest deferred)
- Zero JavaScript on public pages (except optional analytics)
- CDN delivery via self-hosted server with Nginx
- HTTP/2 and compression (gzip/brotli)
- Resource hints (preconnect, prefetch for critical resources)

### 5. AI-Friendly Content Structure

**Clear Content Hierarchy:**
- Logical heading structure (H1 → H2 → H3)
- Descriptive section titles
- Structured data for machine readability

**Rich Descriptions:**
- Comprehensive equipment descriptions
- Technical specifications in structured format
- Feature lists with clear benefits
- Use cases and applications

**Semantic Markup:**
- Proper use of HTML5 semantic elements
- ARIA labels where appropriate
- Descriptive alt text for all images
- Structured tables for specifications

**Content Quality:**
- Original, unique content for each equipment
- No duplicate content across languages (proper translations)
- Regular content updates (tracked in admin panel)
- FAQ sections where relevant

## Technology Stack

### Frontend (Astro Static Site)

**Core:**
- Astro 6.x - Static site generator
- TypeScript - Type safety
- Tailwind CSS or vanilla CSS - Styling (to be decided during implementation)

**Astro Integrations:**
- `@astrojs/sitemap` - Automatic sitemap generation
- `@astrojs/react` - React integration for admin panel components
- `astro-i18n` or `astro-i18next` - Internationalization
- `@astrojs/image` or `astro-imagetools` - Image optimization

**Additional Libraries:**
- Schema-dts - TypeScript types for structured data
- date-fns - Date formatting
- clsx - Conditional CSS classes

### Admin Panel (React SPA)

**Core:**
- React 18+ with TypeScript
- Vite - Build tool and dev server
- React Router v6 - Client-side routing

**State Management:**
- TanStack Query (React Query) - Server state management
- Zustand or Context API - Local UI state

**UI Components:**
- Headless UI or Radix UI - Accessible component primitives
- Tailwind CSS - Styling
- React Hook Form - Form handling and validation
- Zod - Schema validation

**Rich Text Editor:**
- TipTap or Slate - WYSIWYG editor
- Markdown support for technical content

**API & Data:**
- Axios - HTTP client
- React Query - Caching and synchronization

**Utilities:**
- date-fns - Date manipulation
- lodash-es - Utility functions
- react-dropzone - File uploads

### Backend (FastAPI)

**Core:**
- FastAPI - Python web framework
- Python 3.14+ - Programming language
- Uvicorn - ASGI server
- Gunicorn - Process manager (production)

**Database:**
- SQLAlchemy - ORM
- Alembic - Database migrations
- asyncpg - Async PostgreSQL driver
- PostgreSQL - Database

**Authentication:**
- python-jose - JWT tokens
- passlib[bcrypt] - Password hashing
- python-multipart - File uploads

**Validation:**
- Pydantic v2 - Data validation and serialization

**Utilities:**
- python-dotenv - Environment variables
- httpx - Async HTTP client (for webhooks)
- Pillow - Image processing
- GitPython - Git operations (for committing JSON changes)

### Database

**PostgreSQL Schema:**

```sql
-- Users table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    hashed_password VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    is_superuser BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Sessions table
CREATE TABLE sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Analytics table
CREATE TABLE page_views (
    id SERIAL PRIMARY KEY,
    url VARCHAR(500) NOT NULL,
    referrer VARCHAR(500),
    user_agent TEXT,
    ip_address VARCHAR(45),
    country VARCHAR(2),
    viewed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Deployment history
CREATE TABLE deployments (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    status VARCHAR(50) NOT NULL, -- pending, building, success, failed
    commit_hash VARCHAR(40),
    build_log TEXT,
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP
);
```

### DevOps & Deployment

**Version Control:**
- Git - Source control
- GitHub - Repository hosting
- GitHub Actions - CI/CD

**CI/CD Pipeline:**
```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  repository_dispatch:
    types: [content-update]
  push:
    branches: [main]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '22'
      - name: Install dependencies
        run: cd application/frontend && npm ci
      - name: Build Astro site
        run: cd application/frontend && npm run build
      - name: Deploy to server
        run: |
          rsync -avz --delete \
            application/frontend/dist/ \
            ${{ secrets.SERVER_USER }}@${{ secrets.SERVER_HOST }}:/var/www/ocs.com.ua/
      - name: Reload Nginx
        run: |
          ssh ${{ secrets.SERVER_USER }}@${{ secrets.SERVER_HOST }} \
            'sudo systemctl reload nginx'
```

**Server Configuration:**
- Ubuntu 22.04 LTS or similar
- Nginx - Web server and reverse proxy
- PostgreSQL 15+ - Database
- Systemd - Service management
- Let's Encrypt - SSL certificates

**Server Directory Structure:**
```
/var/www/ocs.com.ua/          # Static site (Astro build output)
/opt/ocs-api/                 # FastAPI backend
  ├── app/                    # Application code
  ├── venv/                   # Python virtual environment
  └── .env                    # Environment variables
/var/lib/postgresql/          # PostgreSQL data
/var/log/nginx/               # Nginx logs
/var/log/ocs-api/             # FastAPI logs
```

**Nginx Configuration:**
```nginx
# /etc/nginx/sites-available/ocs.com.ua
server {
    listen 80;
    server_name ocs.com.ua www.ocs.com.ua;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name ocs.com.ua www.ocs.com.ua;

    ssl_certificate /etc/letsencrypt/live/ocs.com.ua/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/ocs.com.ua/privkey.pem;

    # Static site
    location / {
        root /var/www/ocs.com.ua;
        try_files $uri $uri/ /index.html;
        
        # Cache static assets
        location ~* \.(jpg|jpeg|png|gif|ico|css|js|svg|woff|woff2)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }

    # Admin panel
    location /admin {
        alias /var/www/ocs.com.ua/admin;
        try_files $uri $uri/ /admin/index.html;
    }

    # API
    location /api {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

**Systemd Service (FastAPI):**
```ini
# /etc/systemd/system/ocs-api.service
[Unit]
Description=OCS FastAPI Backend
After=network.target postgresql.service

[Service]
Type=notify
User=www-data
Group=www-data
WorkingDirectory=/opt/ocs-api
Environment="PATH=/opt/ocs-api/venv/bin"
ExecStart=/opt/ocs-api/venv/bin/gunicorn \
    -k uvicorn.workers.UvicornWorker \
    -w 4 \
    -b 127.0.0.1:8000 \
    app.main:app
Restart=always

[Install]
WantedBy=multi-user.target
```

## Project Structure

```
ocs.com.ua/
├── .github/
│   └── workflows/
│       ├── deploy.yml              # CI/CD pipeline
│       └── test.yml                # Automated tests
│
├── application/
│   ├── frontend/                   # Astro static site
│   │   ├── src/
│   │   │   ├── components/         # Reusable Astro components
│   │   │   │   ├── Header.astro
│   │   │   │   ├── Footer.astro
│   │   │   │   ├── EquipmentCard.astro
│   │   │   │   └── ...
│   │   │   ├── layouts/            # Page layouts
│   │   │   │   ├── BaseLayout.astro
│   │   │   │   ├── EquipmentLayout.astro
│   │   │   │   └── IndustryLayout.astro
│   │   │   ├── pages/              # Routes (file-based routing)
│   │   │   │   ├── en/
│   │   │   │   │   ├── index.astro
│   │   │   │   │   ├── equipment/
│   │   │   │   │   │   ├── index.astro
│   │   │   │   │   │   ├── [category].astro
│   │   │   │   │   │   └── [category]/[id].astro
│   │   │   │   │   └── industries/
│   │   │   │   │       ├── food.astro
│   │   │   │   │       ├── pharma.astro
│   │   │   │   │       └── logistics.astro
│   │   │   │   └── ua/             # Mirror structure
│   │   │   ├── content/            # JSON content files
│   │   │   │   ├── en/
│   │   │   │   │   ├── site-config.json
│   │   │   │   │   ├── navigation.json
│   │   │   │   │   ├── homepage.json
│   │   │   │   │   ├── industries/
│   │   │   │   │   └── equipment/
│   │   │   │   └── ua/             # Mirror structure
│   │   │   ├── lib/                # Utilities and helpers
│   │   │   │   ├── content.ts      # Content loading utilities
│   │   │   │   ├── seo.ts          # SEO helpers
│   │   │   │   └── i18n.ts         # Internationalization
│   │   │   └── styles/             # Global CSS
│   │   │       └── global.css
│   │   ├── public/                 # Static assets
│   │   │   ├── images/
│   │   │   ├── fonts/
│   │   │   ├── favicon.ico
│   │   │   └── robots.txt
│   │   ├── astro.config.mjs        # Astro configuration
│   │   ├── tsconfig.json
│   │   └── package.json
│   │
│   ├── admin/                      # React SPA admin panel
│   │   ├── src/
│   │   │   ├── components/         # React components
│   │   │   │   ├── Layout/
│   │   │   │   ├── Editor/
│   │   │   │   ├── EquipmentForm/
│   │   │   │   └── ...
│   │   │   ├── pages/              # Admin routes
│   │   │   │   ├── Dashboard.tsx
│   │   │   │   ├── Login.tsx
│   │   │   │   ├── ContentEditor.tsx
│   │   │   │   ├── EquipmentManager.tsx
│   │   │   │   ├── MediaLibrary.tsx
│   │   │   │   └── Analytics.tsx
│   │   │   ├── hooks/              # Custom React hooks
│   │   │   │   ├── useAuth.ts
│   │   │   │   ├── useContent.ts
│   │   │   │   └── useEquipment.ts
│   │   │   ├── services/           # API calls
│   │   │   │   ├── api.ts
│   │   │   │   ├── auth.ts
│   │   │   │   ├── content.ts
│   │   │   │   └── equipment.ts
│   │   │   ├── stores/             # State management
│   │   │   │   ├── authStore.ts
│   │   │   │   └── uiStore.ts
│   │   │   ├── types/              # TypeScript types
│   │   │   ├── utils/              # Utility functions
│   │   │   ├── App.tsx
│   │   │   └── main.tsx
│   │   ├── index.html
│   │   ├── vite.config.ts
│   │   ├── tsconfig.json
│   │   └── package.json
│   │
│   └── backend/                    # FastAPI
│       ├── app/
│       │   ├── api/                # API routes
│       │   │   ├── __init__.py
│       │   │   ├── auth.py         # Authentication endpoints
│       │   │   ├── content.py      # Content management
│       │   │   ├── equipment.py    # Equipment CRUD
│       │   │   ├── media.py        # Image uploads
│       │   │   ├── analytics.py    # Analytics endpoints
│       │   │   └── deploy.py       # Deployment triggers
│       │   ├── models/             # Database models
│       │   │   ├── __init__.py
│       │   │   ├── user.py
│       │   │   ├── session.py
│       │   │   ├── analytics.py
│       │   │   └── deployment.py
│       │   ├── schemas/            # Pydantic schemas
│       │   │   ├── __init__.py
│       │   │   ├── user.py
│       │   │   ├── content.py
│       │   │   ├── equipment.py
│       │   │   └── analytics.py
│       │   ├── services/           # Business logic
│       │   │   ├── __init__.py
│       │   │   ├── auth.py
│       │   │   ├── content.py      # JSON file operations
│       │   │   ├── git.py          # Git operations
│       │   │   ├── image.py        # Image processing
│       │   │   └── deploy.py       # Deployment triggers
│       │   ├── core/               # Configuration
│       │   │   ├── __init__.py
│       │   │   ├── config.py       # Settings
│       │   │   ├── security.py     # Auth utilities
│       │   │   └── database.py     # DB connection
│       │   └── main.py             # FastAPI app
│       ├── alembic/                # Database migrations
│       ├── tests/                  # Backend tests
│       ├── .env.example
│       ├── pyproject.toml
│       └── README.md
│
├── docs/                           # Documentation
│   ├── specs/                      # Design specifications
│   ├── description/                # Project descriptions
│   └── research/                   # Research materials
│
├── .gitignore
├── .gitmessage
├── .pre-commit-config.yaml
└── README.md
```

## Data Flow

### Content Editing Flow

```
1. Admin logs into /admin
2. Navigates to content editor or equipment manager
3. Makes changes (edit text, add equipment, upload images)
4. Clicks "Save" → API call to FastAPI
5. FastAPI validates and saves JSON to filesystem
6. FastAPI commits changes to Git repository
7. FastAPI triggers GitHub webhook
8. GitHub Action starts:
   - Pulls latest code
   - Runs npm run build (Astro)
   - Deploys to server via rsync
   - Reloads Nginx
9. Changes live in 2-3 minutes
10. Admin receives notification of deployment status
```

### Public Website Request Flow

```
1. User visits ocs.com.ua/en/equipment/checkweighers/ema-300
2. Nginx serves static HTML file
3. Browser renders page (no JavaScript needed)
4. Images lazy-load as user scrolls
5. Optional: Analytics beacon fires (minimal JS)
```

### Analytics Collection Flow

```
1. Page load triggers analytics beacon (optional minimal JS)
2. Beacon sends data to /api/analytics endpoint
3. FastAPI logs page view to PostgreSQL
4. Admin views aggregated data in dashboard
```

## Security Considerations

### Authentication
- Password hashing with bcrypt (cost factor 12)
- JWT tokens with short expiration (1 hour)
- Refresh tokens for extended sessions
- HTTPS only (enforced by Nginx)
- CSRF protection for admin panel

### Authorization
- Simple password auth initially
- Designed for future role-based access control (RBAC)
- API endpoints protected with JWT verification
- File system operations restricted to content directory

### Data Protection
- Environment variables for secrets
- Database credentials not in code
- API keys stored securely
- Regular backups of PostgreSQL
- Git history for content versioning

### Input Validation
- Pydantic schemas for all API inputs
- File upload restrictions (type, size)
- XSS prevention in rich text editor
- SQL injection prevention via ORM
- Path traversal prevention in file operations

## Performance Targets

### Public Website
- Lighthouse Performance: 95+
- First Contentful Paint: < 1.5s
- Largest Contentful Paint: < 2.5s
- Time to Interactive: < 3.5s
- Cumulative Layout Shift: < 0.1
- Total Blocking Time: < 200ms

### Admin Panel
- Initial load: < 2s
- Route transitions: < 500ms
- Form submissions: < 1s
- Image uploads: Progress indicator, < 5s for typical images

### API
- Response time: < 200ms for most endpoints
- Image processing: < 2s for typical images
- Deployment trigger: < 500ms (async operation)

## Internationalization (i18n)

### Language Support
- English (en) - Primary
- Ukrainian (ua) - Secondary

### Implementation Strategy
- File-based routing: `/en/*` and `/ua/*`
- Separate JSON content files for each language
- Language switcher in header
- `hreflang` tags for SEO
- Locale detection (optional, defaults to English)

### Content Translation Workflow
1. Admin edits English content
2. Admin panel shows "Translation needed" indicator for Ukrainian
3. Admin can edit Ukrainian version side-by-side
4. Both versions saved independently
5. Language switcher shows only available languages per page

## Testing Strategy

### Frontend Testing
- Unit tests for utility functions (Vitest)
- Component tests for Astro components (Astro test utils)
- E2E tests for critical user flows (Playwright)
- Visual regression tests (optional, Chromatic or Percy)

### Admin Panel Testing
- Unit tests for hooks and utilities (Vitest)
- Component tests (React Testing Library)
- Integration tests for API interactions
- E2E tests for admin workflows (Playwright)

### Backend Testing
- Unit tests for services and utilities (pytest)
- Integration tests for API endpoints (pytest + httpx)
- Database tests with test fixtures
- Load testing for API endpoints (Locust or k6)

### Manual Testing Checklist
- [ ] All pages render correctly in both languages
- [ ] SEO meta tags present and correct
- [ ] Structured data validates (Google Rich Results Test)
- [ ] Images optimized and lazy-loaded
- [ ] Forms work and validate properly
- [ ] Admin panel CRUD operations work
- [ ] Deployment pipeline completes successfully
- [ ] Analytics tracking works
- [ ] Mobile responsive on all pages
- [ ] Cross-browser compatibility (Chrome, Firefox, Safari, Edge)

## Monitoring & Analytics

### Application Monitoring
- Server logs (Nginx access/error logs)
- Application logs (FastAPI logs)
- Database performance (PostgreSQL slow query log)
- Deployment status tracking

### User Analytics
- Page views and unique visitors
- Popular equipment and pages
- User flow through configurator
- Geographic distribution
- Device and browser statistics
- Bounce rate and time on page

### Performance Monitoring
- Lighthouse CI in GitHub Actions
- Core Web Vitals tracking
- API response times
- Database query performance
- Build times and deployment duration

## Future Enhancements

### Phase 2 (Post-MVP)
- User accounts for customers (save favorites, request quotes)
- Advanced search with filters and facets
- Equipment comparison tool
- Interactive 3D product viewers
- Live chat integration
- Newsletter subscription
- Blog/news section

### Phase 3 (Long-term)
- Multi-language support (add more languages)
- Role-based access control (multiple admin roles)
- Workflow approvals (content review before publish)
- A/B testing framework
- Advanced analytics (heatmaps, session recordings)
- Integration with CRM systems
- API for third-party integrations

## Success Criteria

### Technical Metrics
- ✅ Lighthouse score 95+ on all pages
- ✅ Page load time < 2s on 3G connection
- ✅ Zero JavaScript on public pages (except optional analytics)
- ✅ 100% mobile responsive
- ✅ All structured data validates
- ✅ Deployment time < 3 minutes

### Business Metrics
- ✅ Admin can edit any text element visually
- ✅ Admin can add/edit/delete equipment without developer
- ✅ Content changes go live within 3 minutes
- ✅ Website ranks in top 10 for target keywords (6 months)
- ✅ Increased organic traffic (baseline TBD)
- ✅ Reduced bounce rate (baseline TBD)

### User Experience
- ✅ Intuitive navigation (both industry and equipment paths)
- ✅ Fast page loads (perceived performance)
- ✅ Clear equipment information and specifications
- ✅ Easy contact/inquiry process
- ✅ Accessible to users with disabilities (WCAG 2.1 AA)

## Risks & Mitigations

### Risk: Deployment Failures
**Mitigation:** 
- Comprehensive testing before deployment
- Rollback capability in deployment pipeline
- Staging environment for testing changes
- Deployment status monitoring and alerts

### Risk: Content Corruption
**Mitigation:**
- Git version control for all content
- Validation before saving (Pydantic schemas)
- Backup strategy for JSON files
- Easy rollback to previous versions

### Risk: Performance Degradation
**Mitigation:**
- Lighthouse CI in pipeline (fails if score drops)
- Image optimization automated
- Regular performance audits
- Caching strategy for static assets

### Risk: Security Vulnerabilities
**Mitigation:**
- Regular dependency updates
- Security scanning in CI/CD
- Input validation on all endpoints
- HTTPS only, secure headers
- Regular security audits

### Risk: SEO Ranking Loss
**Mitigation:**
- Proper redirects from old site
- Maintain URL structure where possible
- Submit new sitemap to search engines
- Monitor rankings and traffic closely
- Rich structured data for better indexing

## Conclusion

This design provides a comprehensive blueprint for rebuilding ocs.com.ua as a modern, performant, SEO-optimized industrial equipment catalog website. The architecture balances simplicity with scalability, using proven technologies and best practices.

**Key Strengths:**
- Static HTML for maximum SEO and performance
- Visual content editing for non-technical users
- Bilingual support built-in from the start
- Self-hosted deployment with full control
- Clear separation of concerns (public site, admin, API)
- Extensible architecture for future enhancements

**Next Steps:**
1. Review and approve this design specification
2. Create detailed implementation plan
3. Set up development environment
4. Begin Phase 1 implementation (core features)
5. Iterative development with regular reviews

---

**Document Version:** 1.0  
**Last Updated:** 2026-05-31  
**Status:** Ready for Review