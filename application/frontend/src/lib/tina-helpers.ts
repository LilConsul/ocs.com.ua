/**
 * Generate Tina field path for visual editing
 * This creates the data-tina-field attribute value
 *
 * @example
 * tinaField(homepage, 'hero', 'slides', 0, 'title')
 * // Returns path for homepage.hero.slides[0].title
 */
export function tinaField(data: any, ...path: (string | number)[]): string {
  return path.join('.');
}

/**
 * Create data-tina-field attribute object
 * Use this in Astro components to enable visual editing
 *
 * @example
 * <h1 {...tinaFieldAttr(homepage, 'hero', 'slides', 0, 'title')}>
 */
export function tinaFieldAttr(data: any, ...path: (string | number)[]) {
  return {
    'data-tina-field': tinaField(data, ...path),
  };
}
