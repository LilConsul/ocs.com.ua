import type { MiddlewareHandler } from "astro";

// Required by `i18n.routing: "manual"` (see astro.config.mjs), which lets locale-less pages
// such as /admin render. Locale validation lives in the src/pages/[lang] pages.
export const onRequest: MiddlewareHandler = (_context, next) => next();
