import type { ImageMetadata } from "astro";

export type ImageSrc = ImageMetadata | string;

function decode(path: string): string {
	try {
		return decodeURIComponent(path);
	} catch {
		return path;
	}
}

/**
 * Builds a resolver from a glob map of src/assets files (keys like /src/assets/a/b.webp).
 * Content files reference images by public-style path (/assets/a/b.webp); a path with no file in
 * src/assets/ would otherwise ship as a broken <img>, so misses are dropped and warned once.
 * Remote URLs are dropped too (the site does not support them).
 */
export function createImageResolver(files: Record<string, ImageMetadata>) {
	const warned = new Set<string>();

	function resolveImage(path: string | null | undefined): ImageMetadata | undefined {
		if (!path) return undefined;

		const found = /^(https?:)?\/\//i.test(path) ? undefined : files[`/src${decode(path)}`];
		if (found) return found;

		if (!warned.has(path)) {
			warned.add(path);
			console.warn(
				`[images] ${path} is referenced in content but missing from src/assets/, skipping it`
			);
		}
		return undefined;
	}

	function resolveImages(paths: (string | null | undefined)[] | null | undefined): ImageMetadata[] {
		return (paths ?? []).map(resolveImage).filter((m): m is ImageMetadata => Boolean(m));
	}

	return { resolveImage, resolveImages };
}
