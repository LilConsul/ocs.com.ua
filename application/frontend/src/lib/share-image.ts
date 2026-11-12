import { getImage } from "astro:assets";
import type { ImageMetadata } from "astro";

const SHARE_WIDTH = 1200;
const THUMB_WIDTH = 400;

/** Absolute URL of a 1200 px wide JPEG, the format share cards and structured data expect. */
export async function shareImageUrl(
	image: ImageMetadata | undefined,
	site: URL | string
): Promise<string | undefined> {
	if (!image) return undefined;
	const processed = await getImage({ src: image, width: SHARE_WIDTH, format: "jpeg" });
	return new URL(processed.src, site).href;
}

/** Root-relative URL of a 400 px WebP thumbnail for the search index. */
export async function thumbUrl(image: ImageMetadata | undefined): Promise<string> {
	if (!image) return "/placeholder.svg";
	const processed = await getImage({ src: image, width: THUMB_WIDTH, format: "webp" });
	return processed.src;
}
