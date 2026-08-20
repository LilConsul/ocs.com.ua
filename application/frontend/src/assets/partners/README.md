# Partner Logos

This directory contains logo images for partners displayed in the Partners section of the homepage.

## Adding Partner Logos

1. **Add logo image** to this directory:

   - Format: PNG with transparent background (recommended)
   - Naming: `company-name.png` (lowercase, hyphens for spaces)
   - Size: Minimum 200px height (will be scaled to h-12 / 48px)
   - Example: `roshen.png`, `coca-cola.png`, `darnitsa.png`

1. **Update partners data** in `src/data/partners.json`:

   ```json
   {
     "food": [
       {
         "name": "Company Name",
         "website": "https://company.com",
         "logo": "/src/assets/partners/company-name.png"
       }
     ]
   }
   ```

1. **Logo will automatically**:

   - Display in grayscale by default
   - Show in color on hover
   - Scale to consistent height (48px)
   - Be part of infinite scroll animation

## Current Partners Structure

Partners are organized by industry:

- **food**: Food industry partners
- **pharma**: Pharmaceutical partners
- **cosmetics**: Cosmetics industry partners
- **logistics**: Logistics partners

All categories are merged and displayed together in the scrolling logo section.

## Technical Notes

- Images are processed by Astro's image optimization
- Lazy loading is applied automatically
- Logo paths must use `/src/assets/partners/` prefix
- Supported formats: PNG, JPG, SVG, WEBP
