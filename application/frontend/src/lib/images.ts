import type { ImageMetadata } from "astro";
import { createImageResolver } from "./image-resolver";

/**
 * Every raster in src/assets/, resolved at build time so <Image> can optimize it.
 * Unit tests replace this module (Bun has no import.meta.glob), see tests/helpers/mocks.ts.
 */
export const { resolveImage, resolveImages } = createImageResolver(
	import.meta.glob<ImageMetadata>("/src/assets/**/*.{webp,png,jpg,jpeg}", {
		eager: true,
		import: "default",
	})
);
