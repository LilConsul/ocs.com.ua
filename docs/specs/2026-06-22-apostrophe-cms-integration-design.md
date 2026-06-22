# Apostrophe CMS Integration Design

**Date:** 2026-06-22
**Author:** AI Assistant
**Status:** Approved for Implementation

## Executive Summary

This specification outlines the integration of Apostrophe CMS 4 into the existing Astro-based OCS.com.ua website to provide full in-place WYSIWYG editing capabilities. The solution replaces the current static Astro site with an Apostrophe-first architecture while maintaining performance, SEO quality, and the existing shadcn/React component library.

## Goals

1. Enable true in-place WYSIWYG content editing for non-technical editors
1. Maintain bilingual support (Ukrainian/English) with Apostrophe's i18n module
1. Preserve existing design quality and shadcn component library
1. Implement automatic JSON export for version-controlled content backups
1. Achieve excellent performance through SSR with aggressive caching
1. Simplify deployment with Docker Compose (MongoDB + App)

## Non-Goals

- Static site generation (using SSR instead)
- Public user authentication (admin-only)
- Dynamic section addition/removal (structured editing only)
- Contact form functionality (removed for now)

## Architecture Overview

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                     Apostrophe 4 (Express)                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   Nunjucks   │  │    React     │  │   shadcn     │     │
│  │  Templates   │  │  Components  │  │     UI       │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              Widget System                           │  │
│  │  • Hero (shadcn Carousel)                           │  │
│  │  • Industries                                        │  │
│  │  • Featured Equipment                                │  │
│  │  • Why Choose Us                                     │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │         JSON Export Module (Auto Git Commit)         │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            ↓
                    ┌───────────────┐
                    │   MongoDB     │
                    │  (Docker)     │
                    └───────────────┘
                            ↓
                    ┌───────────────┐
                    │ JSON Backups  │
                    │  (Git Repo)   │
                    └───────────────┘
```

### Technology Stack

- **CMS:** Apostrophe 4.x
- **Runtime:** Node.js 22.12.0+
- **Database:** MongoDB 7.x (Docker)
- **Templating:** Nunjucks (Apostrophe default)
- **UI Framework:** React 19.x
- **Component Library:** shadcn/ui
- **Styling:** Tailwind CSS 4.x
- **Localization:** Apostrophe i18n module
- **Deployment:** Docker Compose

## Project Structure

```
application/
├── backend/                          # DELETE - Remove Python backend
├── frontend/                         # NEW - Apostrophe 4 project
│   ├── app.js                       # Apostrophe entry point
│   ├── package.json                 # Node dependencies
│   ├── Dockerfile                   # Container definition
│   ├── modules/                     # Apostrophe modules
│   │   ├── @apostrophecms/         # Core modules (auto-installed)
│   │   ├── asset/                  # Custom asset module
│   │   │   ├── index.js            # Asset configuration
│   │   │   └── ui/                 # React components
│   │   │       └── src/
│   │   │           ├── components/ # shadcn components
│   │   │           ├── HeroCarousel.tsx
│   │   │           └── index.tsx   # Entry point
│   │   ├── homepage-page/          # Homepage piece type
│   │   │   ├── index.js            # Module config
│   │   │   └── views/
│   │   │       └── page.html       # Page template
│   │   ├── hero-widget/            # Hero carousel widget
│   │   │   ├── index.js            # Widget schema
│   │   │   └── views/
│   │   │       └── widget.html     # Widget template
│   │   ├── industries-widget/      # Industries section
│   │   ├── featured-equipment-widget/
│   │   ├── why-choose-us-widget/
│   │   └── json-export/            # Auto-export module
│   │       ├── index.js            # Export logic
│   │       └── lib/
│   │           ├── exporter.js     # JSON export
│   │           └── git-commit.js   # Auto-commit
│   ├── views/                      # Global templates
│   │   ├── layout.html             # Base layout
│   │   └── components/
│   │       ├── header.html
│   │       └── footer.html
│   ├── public/                     # Static assets (keep existing)
│   │   ├── images/
│   │   └── favicon.svg
│   └── lib/                        # Utility functions
│       └── utils.js
├── frontend-old/                    # MOVED - Original Astro project (reference)
├── content-backups/                 # NEW - JSON exports
│   ├── en/
│   │   ├── homepage.json
│   │   ├── navigation.json
│   │   └── site-config.json
│   └── ua/
│       ├── homepage.json
│       ├── navigation.json
│       └── site-config.json
└── docker-compose.yml               # NEW - Docker services
```

## Content Model

### Piece Types

#### Homepage Piece (`homepage-page`)

Single instance per locale containing an area field with predefined widgets in fixed order.

**Schema:**

```javascript
{
  title: { type: 'string', required: true },
  slug: { type: 'slug', required: true },
  main: {
    type: 'area',
    options: {
      widgets: {
        'hero': {},
        'industries': {},
        'featured-equipment': {},
        'why-choose-us': {}
      }
    }
  }
}
```

### Widget Types

#### 1. Hero Widget (`hero-widget`)

Displays a carousel of hero slides using shadcn Carousel component.

**Schema:**

```javascript
{
  slides: {
    type: 'array',
    titleField: 'title',
    max: 3,  // Fixed 3 slides
    fields: {
      add: {
        title: {
          type: 'string',
          required: true,
          label: 'Slide Title'
        },
        description: {
          type: 'string',
          textarea: true,
          label: 'Slide Description'
        },
        ctaText: {
          type: 'string',
          label: 'Button Text'
        },
        ctaLink: {
          type: 'url',
          label: 'Button Link'
        },
        backgroundImage: {
          type: 'attachment',
          fileGroup: 'images',
          label: 'Background Image'
        },
        accentColor: {
          type: 'select',
          label: 'Accent Color',
          choices: [
            { label: 'Blue', value: 'blue' },
            { label: 'Green', value: 'green' },
            { label: 'Purple', value: 'purple' }
          ]
        }
      }
    }
  }
}
```

**Template Integration:**

- Nunjucks template renders container div with data attributes
- React component mounts and reads data from attributes
- Uses shadcn Carousel component for slide transitions

#### 2. Industries Widget (`industries-widget`)

Displays industry cards in a grid layout.

**Schema:**

```javascript
{
  title: { type: 'string', required: true },
  description: { type: 'string', textarea: true },
  cards: {
    type: 'array',
    titleField: 'name',
    max: 3,  // Fixed 3 cards
    fields: {
      add: {
        name: { type: 'string', required: true },
        description: { type: 'string', textarea: true },
        icon: {
          type: 'select',
          choices: [
            { label: 'Utensils', value: 'utensils' },
            { label: 'Pill', value: 'pill' },
            { label: 'Truck', value: 'truck' }
          ]
        },
        link: { type: 'url' },
        image: { type: 'attachment', fileGroup: 'images' }
      }
    }
  }
}
```

**Rendering:**

- Pure Nunjucks template (no React needed)
- Uses shadcn Card components via CSS classes
- Lucide icons rendered server-side

#### 3. Featured Equipment Widget (`featured-equipment-widget`)

Displays featured equipment items.

**Schema:**

```javascript
{
  title: { type: 'string', required: true },
  description: { type: 'string', textarea: true },
  equipmentIds: {
    type: 'array',
    titleField: 'id',
    fields: {
      add: {
        id: { type: 'string', required: true }
      }
    }
  }
}
```

**Note:** Equipment IDs reference future equipment piece type (not implemented in initial phase).

#### 4. Why Choose Us Widget (`why-choose-us-widget`)

Displays benefit cards with icons.

**Schema:**

```javascript
{
  title: { type: 'string', required: true },
  benefits: {
    type: 'array',
    titleField: 'title',
    max: 4,  // Fixed 4 benefits
    fields: {
      add: {
        icon: {
          type: 'select',
          choices: [
            { label: 'Award', value: 'award' },
            { label: 'Shield Check', value: 'shield-check' },
            { label: 'Headphones', value: 'headphones' },
            { label: 'Globe', value: 'globe' }
          ]
        },
        title: { type: 'string', required: true },
        description: { type: 'string', textarea: true }
      }
    }
  }
}
```

## Localization Strategy

### Apostrophe i18n Configuration

```javascript
// app.js
modules: {
  '@apostrophecms/i18n': {
    options: {
      locales: {
        ua: {
          label: 'Українська',
          prefix: '/ua'
        },
        en: {
          label: 'English',
          prefix: '/en'
        }
      },
      defaultLocale: 'ua'
    }
  }
}
```

### Content Management

- Each piece/widget stores content per locale in MongoDB
- Editors switch language in admin UI via locale selector
- URLs: `/ua/` (default), `/en/` (English)
- Automatic locale detection from URL path
- `hreflang` tags for SEO

### Translation Workflow

1. Editor logs into Apostrophe admin
1. Switches to Ukrainian locale
1. Edits content in-place
1. Switches to English locale
1. Edits English content
1. Both versions saved independently in MongoDB

## Technical Implementation

### Apostrophe Configuration

**`app.js`:**

```javascript
require('apostrophe')({
  shortName: 'ocs-cms',

  modules: {
    // Core modules
    '@apostrophecms/i18n': {
      options: {
        locales: {
          ua: { label: 'Українська', prefix: '/ua' },
          en: { label: 'English', prefix: '/en' }
        },
        defaultLocale: 'ua'
      }
    },

    // Asset bundling
    'asset': {},

    // Custom modules
    'homepage-page': {},
    'hero-widget': {},
    'industries-widget': {},
    'featured-equipment-widget': {},
    'why-choose-us-widget': {},
    'json-export': {}
  }
});
```

### Asset Pipeline

**React Component Integration:**

1. **Component Location:** `modules/asset/ui/src/`
1. **Build Process:** Apostrophe's webpack bundles React + Tailwind
1. **Output:** Fingerprinted bundles in `public/apos-frontend/`
1. **Loading:** Automatic script/style injection in templates

**Example Component Mount:**

```html
<!-- Nunjucks template -->
<div
  data-hero-carousel
  data-slides="{{ data.widget.slides | json | escape }}"
></div>

<!-- Client-side initialization -->
<script>
  document.querySelectorAll('[data-hero-carousel]').forEach(el => {
    const slides = JSON.parse(el.dataset.slides);
    ReactDOM.render(
      <HeroCarousel slides={slides} />,
      el
    );
  });
</script>
```

### Performance Optimization

#### Caching Strategy

**1. Fragment Caching**

- Cache individual widget renders in memory
- Key: `widget-${type}-${id}-${locale}`
- TTL: 1 hour
- Invalidation: On widget save

**2. Page Caching**

- Full HTML cache for anonymous users
- Key: `page-${url}-${locale}`
- TTL: 1 hour
- Bypass: Logged-in users (editors)
- Invalidation: On any content save

**3. Asset Caching**

- Webpack generates fingerprinted filenames
- Far-future expires headers (1 year)
- Browser caching for static assets

**4. Database Optimization**

- MongoDB indexes on: `slug`, `type`, `locale`
- Connection pooling (10 connections)
- Projection queries (fetch only needed fields)

#### Performance Targets

- **First Contentful Paint:** \< 1.5s
- **Time to Interactive:** \< 3s
- **Lighthouse Score:** > 90
- **Core Web Vitals:** All "Good"

### JSON Export Module

**Purpose:** Automatically export content to JSON files for version control.

**Implementation:**

**`modules/json-export/index.js`:**

```javascript
module.exports = {
  options: {
    exportPath: 'content-backups',
    autoCommit: true,
    debounceMs: 30000  // Max 1 export per 30 seconds
  },

  handlers(self) {
    return {
      // Listen to all piece/widget saves
      'apostrophe:afterSave': {
        async handleSave(req, piece) {
          await self.exportContent(req.locale);
        }
      }
    };
  },

  methods(self) {
    return {
      async exportContent(locale) {
        // Export homepage content
        const homepage = await self.apos.doc.find(req, {
          type: 'homepage-page',
          locale
        }).toObject();

        // Transform to JSON format
        const json = self.transformToJson(homepage);

        // Write to file
        const path = `${self.options.exportPath}/${locale}/homepage.json`;
        await fs.writeFile(path, JSON.stringify(json, null, 2));

        // Auto-commit to git
        if (self.options.autoCommit) {
          await self.gitCommit(locale, 'homepage');
        }
      },

      transformToJson(doc) {
        // Transform Apostrophe format to original JSON structure
        return {
          hero: {
            slides: doc.main.items
              .find(w => w.type === 'hero')
              .slides
          },
          industries: {
            title: doc.main.items
              .find(w => w.type === 'industries')
              .title,
            description: doc.main.items
              .find(w => w.type === 'industries')
              .description,
            cards: doc.main.items
              .find(w => w.type === 'industries')
              .cards
          },
          featuredEquipment: {
            title: doc.main.items
              .find(w => w.type === 'featured-equipment')
              .title,
            description: doc.main.items
              .find(w => w.type === 'featured-equipment')
              .description,
            equipmentIds: doc.main.items
              .find(w => w.type === 'featured-equipment')
              .equipmentIds
          },
          whyChooseUs: {
            title: doc.main.items
              .find(w => w.type === 'why-choose-us')
              .title,
            benefits: doc.main.items
              .find(w => w.type === 'why-choose-us')
              .benefits
          }
        };
      },

      async gitCommit(locale, type) {
        const timestamp = new Date().toISOString();
        const message = `Content update: ${type} ${locale} ${timestamp}`;

        await exec(`git add content-backups/${locale}/`);
        await exec(`git commit -m "${message}"`);
        // Optional: await exec('git push');
      }
    };
  }
};
```

**Export Structure:**

```json
// content-backups/en/homepage.json
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
    "description": "Specialized solutions for diverse sectors",
    "cards": [
      {
        "id": "food",
        "name": "Food Industry",
        "description": "Quality control and packaging solutions",
        "icon": "utensils",
        "link": "/en/industries/food",
        "image": "/images/industries/food.webp"
      },
      {
        "id": "pharma",
        "name": "Pharmaceutical",
        "description": "Compliant weighing and inspection",
        "icon": "pill",
        "link": "/en/industries/pharma",
        "image": "/images/industries/pharma.webp"
      },
      {
        "id": "logistics",
        "name": "Logistics",
        "description": "Automated sorting and distribution",
        "icon": "truck",
        "link": "/en/industries/logistics",
        "image": "/images/industries/logistics.webp"
      }
    ]
  },
  "featuredEquipment": {
    "title": "Featured Equipment",
    "description": "Our most popular solutions",
    "equipmentIds": ["checkweigher-ema-300", "metal-detector-md-500", "xray-inspector-xi-700"]
  },
  "whyChooseUs": {
    "title": "Why Choose OCS",
    "benefits": [
      {
        "icon": "award",
        "title": "Industry Leader",
        "description": "Over 30 years of experience in industrial equipment"
      },
      {
        "icon": "shield-check",
        "title": "Quality Assurance",
        "description": "ISO certified with rigorous testing standards"
      },
      {
        "icon": "headphones",
        "title": "Expert Support",
        "description": "24/7 technical support and maintenance services"
      },
      {
        "icon": "globe",
        "title": "Global Reach",
        "description": "Serving clients across Europe and beyond"
      }
    ]
  }
}
```

**Import on Startup:**

```javascript
// CLI command: npm run import-content
async function importContent() {
  for (const locale of ['ua', 'en']) {
    const json = await fs.readFile(`content-backups/${locale}/homepage.json`);
    const data = JSON.parse(json);

    // Create/update homepage piece
    await apos.doc.insert(req, {
      type: 'homepage-page',
      locale,
      title: 'Homepage',
      slug: '/',
      main: {
        items: [
          {
            _id: 'hero-widget-1',
            type: 'hero',
            slides: data.hero.slides
          },
          {
            _id: 'industries-widget-1',
            type: 'industries',
            title: data.industries.title,
            description: data.industries.description,
            cards: data.industries.cards
          },
          {
            _id: 'featured-equipment-widget-1',
            type: 'featured-equipment',
            title: data.featuredEquipment.title,
            description: data.featuredEquipment.description,
            equipmentIds: data.featuredEquipment.equipmentIds
          },
          {
            _id: 'why-choose-us-widget-1',
            type: 'why-choose-us',
            title: data.whyChooseUs.title,
            benefits: data.whyChooseUs.benefits
          }
        ]
      }
    });
  }
}
```

## Docker Compose Setup

**`docker-compose.yml`:**

```yaml
version: '3.8'

services:
  mongodb:
    image: mongo:7
    container_name: ocs-mongodb
    restart: unless-stopped
    environment:
      MONGO_INITDB_ROOT_USERNAME: admin
      MONGO_INITDB_ROOT_PASSWORD: ${MONGO_PASSWORD}
      MONGO_INITDB_DATABASE: ocs_cms
    ports:
      - "27017:27017"
    volumes:
      - mongodb_data:/data/db
      - mongodb_config:/data/configdb
    networks:
      - ocs-network
    healthcheck:
      test: echo 'db.runCommand("ping").ok' | mongosh localhost:27017/test --quiet
      interval: 10s
      timeout: 5s
      retries: 5

  app:
    build:
      context: ./application/frontend
      dockerfile: Dockerfile
    container_name: ocs-app
    restart: unless-stopped
    environment:
      NODE_ENV: ${NODE_ENV:-development}
      APOS_MONGODB_URI: mongodb://admin:${MONGO_PASSWORD}@mongodb:27017/ocs_cms?authSource=admin
      PORT: 3000
    ports:
      - "3000:3000"
    volumes:
      - ./application/frontend:/app
      - /app/node_modules
      - ./content-backups:/app/content-backups
    depends_on:
      mongodb:
        condition: service_healthy
    networks:
      - ocs-network

volumes:
  mongodb_data:
    driver: local
  mongodb_config:
    driver: local

networks:
  ocs-network:
    driver: bridge
```

**`.env`:**

```
MONGO_PASSWORD=your_secure_password_here
NODE_ENV=development
```

**`application/frontend/Dockerfile`:**

```dockerfile
FROM node:22-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy application
COPY . .

# Build assets
RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
```

### Development Workflow

```bash
# Start services
docker-compose up -d

# View logs
docker-compose logs -f app

# Access application
open http://localhost:3000

# Stop services (data persists)
docker-compose down

# Reset database
docker-compose down -v
```

## Migration Strategy

### Phase 1: Setup Foundation (Day 1, Morning)

**Tasks:**

1. Move `application/frontend/` → `application/frontend-old/`
1. Delete `application/backend/` (Python)
1. Initialize new Apostrophe 4 project in `application/frontend/`
1. Configure `docker-compose.yml` with MongoDB service
1. Set up `.env` file with credentials
1. Install dependencies: `npm install apostrophe@4`
1. Configure i18n module with Ukrainian/English locales
1. Test basic Apostrophe startup

**Verification:**

- `docker-compose up` starts successfully
- Access `http://localhost:3000` shows Apostrophe welcome
- Can create admin user
- Locale switcher appears in admin UI

### Phase 2: Create Content Model (Day 1, Afternoon)

**Tasks:**

1. Create `modules/homepage-page/` with piece type definition
1. Create widget modules:
   - `modules/hero-widget/`
   - `modules/industries-widget/`
   - `modules/featured-equipment-widget/`
   - `modules/why-choose-us-widget/`
1. Define schemas matching existing JSON structure
1. Configure area field with fixed widget order
1. Test widget creation in admin UI

**Verification:**

- Can create homepage piece in admin
- All widgets appear in area editor
- Widget schemas match requirements (fixed counts, required fields)
- Can save content in both locales

### Phase 3: Build Templates (Day 2, Morning)

**Tasks:**

1. Create `views/layout.html` base template
1. Port Header and Footer from Astro to Nunjucks
1. Create widget templates:
   - `modules/hero-widget/views/widget.html`
   - `modules/industries-widget/views/widget.html`
   - `modules/featured-equipment-widget/views/widget.html`
   - `modules/why-choose-us-widget/views/widget.html`
1. Set up asset module for React/Tailwind
1. Port shadcn components to `modules/asset/ui/src/components/`
1. Create React HeroCarousel component using shadcn Carousel
1. Implement component mounting logic
1. Port existing CSS/Tailwind configuration

**Verification:**

- Homepage renders correctly
- All widgets display content
- React components mount and function
- Styles match original design
- Responsive layout works

### Phase 4: Implement JSON Export (Day 2, Afternoon)

**Tasks:**

1. Create `modules/json-export/` module
1. Implement event hooks for `afterSave`
1. Write transformation logic (Apostrophe → JSON)
1. Implement file writing to `content-backups/`
1. Add git auto-commit functionality
1. Implement debouncing (30-second window)
1. Create import script for seeding database
1. Test export/import cycle

**Verification:**

- Editing content triggers JSON export
- Files appear in `content-backups/{locale}/`
- Git commits are created automatically
- JSON structure matches original format
- Import script successfully seeds database

### Phase 5: Content Migration (Day 3, Morning)

**Tasks:**

1. Log into Apostrophe admin
1. Switch to Ukrainian locale
1. Manually enter all Ukrainian content:
   - Hero slides (3)
   - Industry cards (3)
   - Featured equipment IDs
   - Why Choose Us benefits (4)
1. Switch to English locale
1. Enter all English content
1. Verify exports match original JSON files
1. Test in-place editing for all widgets

**Verification:**

- All content entered in both locales
- Exports match original JSON structure
- In-place editing works for all fields
- Images upload and display correctly
- Links work correctly

### Phase 6: Testing & Optimization (Day 3, Afternoon)

**Tasks:**

1. Implement caching strategy:
   - Fragment caching for widgets
   - Page caching for anonymous users
   - Asset fingerprinting
1. Run Lighthouse performance audit
1. Verify SEO elements:
   - Meta tags
   - Structured data
   - `hreflang` tags
   - Sitemap
1. Cross-browser testing (Chrome, Firefox, Safari)
1. Mobile responsiveness testing
1. Test locale switching
1. Performance optimization based on audit results

**Verification:**

- Lighthouse score > 90
- All Core Web Vitals in "Good" range
- SEO elements present and correct
- Works in all major browsers
- Mobile layout perfect
- Locale switching seamless

### Phase 7: Cleanup & Documentation (Day 3, End)

**Tasks:**

1. Review `application/frontend-old/` for any missed components
1. Update `README.md` with new setup instructions
1. Document admin user creation process
1. Document content editing workflow
1. Create backup/restore documentation
1. Final git commit with all changes
1. Tag release: `v2.0.0-apostrophe`

**Verification:**

- Documentation complete and accurate
- All old files reviewed
- Git history clean
- Ready for production deployment

## Testing Strategy

### Unit Tests

**Not required for initial implementation.** Apostrophe's core is well-tested. Focus on integration testing.

### Integration Tests

**Manual testing checklist:**

1. **Content Editing:**

   - [ ] Can create/edit homepage in both locales
   - [ ] In-place editing works for all widgets
   - [ ] Image uploads work correctly
   - [ ] Changes save successfully
   - [ ] Locale switching preserves edits

1. **JSON Export:**

   - [ ] Exports trigger on content save
   - [ ] JSON structure matches original
   - [ ] Git commits created automatically
   - [ ] Import script works correctly

1. **Performance:**

   - [ ] Page load \< 3s
   - [ ] Lighthouse score > 90
   - [ ] Caching works (check response headers)
   - [ ] Images optimized

1. **SEO:**

   - [ ] Meta tags present
   - [ ] Structured data valid
   - [ ] `hreflang` tags correct
   - [ ] Sitemap generated

1. **Localization:**

   - [ ] URLs correct (`/ua/`, `/en/`)
   - [ ] Content displays in correct language
   - [ ] Locale switcher works
   - [ ] Fallback to English works

### Browser Testing

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Mobile Safari (iOS)
- Chrome Mobile (Android)

## Deployment

### Development

```bash
# Start services
docker-compose up -d

# View logs
docker-compose logs -f app

# Access application
open http://localhost:3000

# Create admin user (first time)
npm run create-admin-user
```

### Production

**Prerequisites:**

- Docker and Docker Compose installed
- Domain configured (ocs.com.ua)
- SSL certificates ready

**Steps:**

1. **Clone repository:**

   ```bash
   git clone <repo-url>
   cd ocs.com.ua
   ```

1. **Configure environment:**

   ```bash
   cp .env.example .env
   # Edit .env with production values
   ```

1. **Start services:**

   ```bash
   docker-compose -f docker-compose.prod.yml up -d
   ```

1. **Create admin user:**

   ```bash
   docker-compose exec app npm run create-admin-user
   ```

1. **Import initial content:**

   ```bash
   docker-compose exec app npm run import-content
   ```

1. **Configure nginx reverse proxy** (separate server):

   ```nginx
   server {
     listen 443 ssl http2;
     server_name ocs.com.ua;

     ssl_certificate /path/to/cert.pem;
     ssl_certificate_key /path/to/key.pem;

     location / {
       proxy_pass http://localhost:3000;
       proxy_set_header Host $host;
       proxy_set_header X-Real-IP $remote_addr;
       proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
       proxy_set_header X-Forwarded-Proto $scheme;
     }
   }
   ```

### Backup Strategy

**MongoDB Backups:**

```bash
# Daily backup (cron job)
docker-compose exec mongodb mongodump \
  --uri="mongodb://admin:${MONGO_PASSWORD}@localhost:27017/ocs_cms?authSource=admin" \
  --out=/backup/$(date +%Y%m%d)

# Restore from backup
docker-compose exec mongodb mongorestore \
  --uri="mongodb://admin:${MONGO_PASSWORD}@localhost:27017/ocs_cms?authSource=admin" \
  /backup/20260622
```

**JSON Backups:**

- Automatic via git commits
- Manual: `git pull` to sync latest content
- Restore: `npm run import-content`

## Security Considerations

1. **MongoDB:**

   - Strong password in `.env`
   - Not exposed to public internet
   - Regular backups

1. **Apostrophe:**

   - HTTPS only in production
   - Strong admin passwords
   - Session security enabled
   - CSRF protection enabled

1. **Docker:**

   - Non-root user in containers
   - Minimal base images
   - Regular security updates

1. **Git:**

   - `.env` in `.gitignore`
   - No secrets in repository
   - Private repository recommended

## Success Criteria

1. **Functionality:**

   - ✅ In-place editing works for all content
   - ✅ Bilingual support (Ukrainian/English)
   - ✅ JSON exports to git automatically
   - ✅ All widgets render correctly
   - ✅ shadcn components work

1. **Performance:**

   - ✅ Lighthouse score > 90
   - ✅ Page load \< 3s
   - ✅ Core Web Vitals "Good"

1. **SEO:**

   - ✅ Meta tags present
   - ✅ Structured data valid
   - ✅ `hreflang` tags correct

1. **Developer Experience:**

   - ✅ Docker Compose setup works
   - ✅ Documentation complete
   - ✅ Easy to deploy

1. **Editor Experience:**

   - ✅ Intuitive admin UI
   - ✅ Fast in-place editing
   - ✅ Easy locale switching

## Future Enhancements

**Not in scope for initial implementation:**

1. **Equipment Catalog:**

   - Create equipment piece type
   - Add equipment detail pages
   - Link from featured equipment widget

1. **Blog/News:**

   - Add blog piece type
   - Create blog listing page
   - Add blog widget to homepage

1. **Contact Form:**

   - Re-implement contact form widget
   - Add form submission handling
   - Email notifications

1. **Advanced Caching:**

   - CDN integration (Cloudflare)
   - Redis for session storage
   - Edge caching

1. **Analytics:**

   - Google Analytics integration
   - Admin dashboard with stats
   - Content performance tracking

## Risks & Mitigations

| Risk                                  | Impact | Probability | Mitigation                                |
| ------------------------------------- | ------ | ----------- | ----------------------------------------- |
| Performance slower than Astro static  | Medium | Low         | Aggressive caching, CDN, optimization     |
| Learning curve for Apostrophe         | Low    | Medium      | Good documentation, simple content model  |
| MongoDB data loss                     | High   | Low         | Automated backups, JSON exports to git    |
| React component integration issues    | Medium | Low         | Test early, use proven patterns           |
| Migration takes longer than estimated | Low    | Medium      | Phased approach, can pause between phases |

## Appendix

### Key Dependencies

```json
{
  "dependencies": {
    "apostrophe": "^4.x",
    "react": "^19.2.6",
    "react-dom": "^19.2.6",
    "tailwindcss": "^4.3.0",
    "shadcn": "^4.10.0",
    "lucide-react": "^1.17.0"
  }
}
```

### Useful Commands

```bash
# Development
npm run dev                    # Start dev server
npm run build                  # Build assets
npm run create-admin-user      # Create admin user
npm run import-content         # Import JSON to MongoDB
npm run export-content         # Export MongoDB to JSON

# Docker
docker-compose up -d           # Start services
docker-compose down            # Stop services
docker-compose logs -f app     # View logs
docker-compose exec app bash   # Shell into app container
docker-compose exec mongodb mongosh  # MongoDB shell

# Git
git add content-backups/       # Stage content changes
git commit -m "Content update" # Commit changes
git push                       # Push to remote
```

### References

- [Apostrophe 4 Documentation](https://docs.apostrophecms.org/)
- [Apostrophe i18n Guide](https://docs.apostrophecms.org/guide/localization.html)
- [shadcn/ui Documentation](https://ui.shadcn.com/)
- [Tailwind CSS Documentation](https://tailwindcss.com/)
- [MongoDB Documentation](https://docs.mongodb.com/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)

______________________________________________________________________

**End of Specification**
