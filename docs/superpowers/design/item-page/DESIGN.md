______________________________________________________________________

## name: Industrial Precision colors: surface: '#fdf8f8' surface-dim: '#ddd9d8' surface-bright: '#fdf8f8' surface-container-lowest: '#ffffff' surface-container-low: '#f7f3f2' surface-container: '#f1edec' surface-container-high: '#ebe7e6' surface-container-highest: '#e5e2e1' on-surface: '#1c1b1b' on-surface-variant: '#444748' inverse-surface: '#313030' inverse-on-surface: '#f4f0ef' outline: '#747878' outline-variant: '#c4c7c7' surface-tint: '#5f5e5e' primary: '#000000' on-primary: '#ffffff' primary-container: '#1c1b1b' on-primary-container: '#858383' inverse-primary: '#c8c6c5' secondary: '#b8006d' on-secondary: '#ffffff' secondary-container: '#ff4da3' on-secondary-container: '#5c0034' tertiary: '#000000' on-tertiary: '#ffffff' tertiary-container: '#00201d' on-tertiary-container: '#0c9488' error: '#ba1a1a' on-error: '#ffffff' error-container: '#ffdad6' on-error-container: '#93000a' primary-fixed: '#e5e2e1' primary-fixed-dim: '#c8c6c5' on-primary-fixed: '#1c1b1b' on-primary-fixed-variant: '#474746' secondary-fixed: '#ffd9e4' secondary-fixed-dim: '#ffb0cd' on-secondary-fixed: '#3e0021' on-secondary-fixed-variant: '#8d0052' tertiary-fixed: '#89f5e7' tertiary-fixed-dim: '#6bd8cb' on-tertiary-fixed: '#00201d' on-tertiary-fixed-variant: '#005049' background: '#fdf8f8' on-background: '#1c1b1b' surface-variant: '#e5e2e1' industrial-gray: '#64748B' surface-muted: '#F8FAFC' border-subtle: '#E2E8F0' typography: display-lg: fontFamily: IBM Plex Sans fontSize: 64px fontWeight: '600' lineHeight: 72px letterSpacing: -0.02em display-lg-mobile: fontFamily: IBM Plex Sans fontSize: 40px fontWeight: '600' lineHeight: 48px letterSpacing: -0.02em headline-xl: fontFamily: IBM Plex Sans fontSize: 36px fontWeight: '500' lineHeight: 44px headline-lg: fontFamily: IBM Plex Sans fontSize: 28px fontWeight: '500' lineHeight: 36px body-lg: fontFamily: Inter fontSize: 18px fontWeight: '400' lineHeight: 28px body-md: fontFamily: Inter fontSize: 16px fontWeight: '400' lineHeight: 24px label-caps: fontFamily: JetBrains Mono fontSize: 12px fontWeight: '500' lineHeight: 16px letterSpacing: 0.05em technical-data: fontFamily: JetBrains Mono fontSize: 14px fontWeight: '400' lineHeight: 20px rounded: sm: 0.25rem DEFAULT: 0.5rem md: 0.75rem lg: 1rem xl: 1.5rem full: 9999px spacing: container-max: 1280px gutter: 1.5rem section-gap-lg: 8rem section-gap-sm: 4rem edge-margin: 2rem

## Brand & Style

The design system is engineered for a premium B2B industrial environment, positioning the product as a leader in high-precision inspection systems. The brand personality is **technical, authoritative, and sophisticated**, evoking the reliability of global engineering giants like Siemens or ABB.

The visual style is a refined mix of **Corporate Modern** and **Glassmorphism**. It utilizes a "White Space First" philosophy to ensure clarity and focus on technical details.

- **Minimalism:** Massive margins and deep breathing room between sections to signify premium positioning.
- **Glassmorphism:** Reserved exclusively for navigation and floating action panels to provide a sense of depth and modernity without compromising the "industrial" sturdiness.
- **Technical Precision:** Use of fine lines (0.5px - 1px), subtle dot-grid backgrounds, and monospaced numerical data points to reinforce the engineering narrative.

The emotional response should be one of absolute trust and professional calm. There is no urgency; only the quiet confidence of superior technology.

## Colors

The palette is strictly restrained to maintain a "high-tech" enterprise aesthetic.

- **Primary:** A deep neutral black (#171717) used for high-contrast typography and core structural elements.
- **Secondary (The Accent):** A refined Pink (#C71978), derived from the brand's heritage but used sparingly. It is reserved for high-value interactions like "Request Consultation" or indicating a precise active state. It should never dominate the layout.
- **Tertiary:** A technical Teal (#0D9488) used exclusively for data visualization, charts, and technical status indicators.
- **Neutral/Base:** A vast landscape of whites and cool grays. Surfaces use subtle layering of `#FFFFFF` and `#F8FAFC` to differentiate content blocks without the use of heavy borders.

The default mode is **Light**, emphasizing cleanliness and the "laboratory-grade" precision of the equipment.

## Typography

The typography system balances human-centric readability with technical rigor.

- **Headings:** **IBM Plex Sans** provides a structured, engineered feel with its semi-grotesque terminals. Use generous tracking for large display headers to enhance the "premium" feel.
- **Body:** **Inter** is utilized for its supreme legibility in complex B2B information environments.
- **Technical/Labels:** **JetBrains Mono** (or a clean monospace equivalent) is introduced for specifications, model numbers, and small labels. This reinforces the "high-precision engineering" theme.

Scale headings aggressively on desktop to create a sense of scale, but collapse them into readable, punchy sizes for mobile devices.

## Layout & Spacing

This design system uses a **12-column fixed-grid model** on desktop to ensure a controlled, editorial-like presentation of industrial products.

- **Desktop (1280px+):** Elements align to a 12-column grid with 24px (1.5rem) gutters. Large technical diagrams or product renders may break the grid to bleed off the edge of the screen, suggesting "limitless" scale.
- **Section Rhythm:** Vertical rhythm is extremely spacious. Use `8rem` (128px) between major sections to prevent the "catalogue clutter" common in industrial websites.
- **Micro-spacing:** Built on a 4px baseline. All component internal padding should be multiples of 8px to maintain a rigid, "engineered" alignment.
- **Reflow:** On mobile, the grid collapses to a single column with `1.25rem` horizontal margins, ensuring technical tables are wrapped in a horizontal scroll container to maintain data integrity.

## Elevation & Depth

Hierarchy is established through **Tonal Layering** and **Glassmorphism** rather than traditional shadows.

- **The Base Layer:** The primary background is pure `#FFFFFF`.
- **The Raised Layer:** Large product cards or industry sections use a subtle `#F8FAFC` background with a `1px` border in `#E2E8F0`.
- **The Floating Layer:** Used for the main navigation and "Contact Sales" sticky bars. This uses a high-blur backdrop (20px+) with a semi-transparent white fill (`rgba(255, 255, 255, 0.7)`).
- **Shadows:** Avoid heavy shadows. When necessary, use a "technical shadow": a very low-opacity, high-spread neutral tint that suggests the object is barely hovering above the surface.

## Shapes

The shape language reflects the physical product design of high-end machinery—where sharp engineering meets ergonomic safety.

- **Primary Radius:** `0.5rem` (8px) is the standard for cards and input fields. It is soft enough to feel modern but rigid enough to remain "industrial."
- **Interactive Radius:** Buttons follow the standard radius; do not use pill-shapes as they feel too "consumer-oriented" for an enterprise equipment distributor.
- **Iconography:** Use **Lucide** icons with a consistent `1.5px` stroke weight. Icons should be placed within small, subtly rounded squares to act as "technical badges."

## Components

### Buttons

- **Primary:** Solid `#171717` with white text. High-contrast, no-nonsense.
- **Secondary (Lead Gen):** Outline style using the brand Pink (#C71978). This is the "Consultation" button.
- **Ghost:** For low-priority navigation, using an industrial gray text that turns primary on hover.

### Product Cards

Cards are not "shop tiles." They feature a large, high-resolution product render against a neutral background. The typography inside the card is small and precise, utilizing the "label-caps" style for categories. No price is ever shown; the CTA is always "Technical Details" or "Request Info."

### Input Fields

Strictly rectangular with a subtle 8px radius. Use a `1px` border that thickens slightly and changes to the primary color on focus. Labels must always be visible (never placeholder-only) to maintain accessibility.

### Navigation

A top-docked glassmorphic bar. The language switcher and "Contact Sales" button are the only high-contrast elements in the header.

### Specification Tables

Used on product pages to display engineering data. Use a "Zebra" row style with a very light gray (#F8FAFC) to ensure readability across long rows of technical metrics. Use monospaced font for all numerical values.
