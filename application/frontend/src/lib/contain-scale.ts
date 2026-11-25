/**
 * Share of the box width an `object-contain` picture fills, rounded up to 2 decimals, at most 1.
 * `boxAspect` is box width / box height. An unknown picture size counts as filling the width,
 * so the picture is never served too small.
 */
export function containScale(image: { width: number; height: number }, boxAspect: number): number {
	if (!(image.width > 0 && image.height > 0 && boxAspect > 0)) return 1;
	const scale = image.width / image.height / boxAspect;
	// Round off float noise before rounding up, so 0.73 does not become 0.74
	return Math.min(1, Math.ceil(Number((scale * 100).toFixed(6))) / 100);
}

/**
 * Painted width in px of an `object-contain` picture in a box `height` px tall (at most
 * `height` times its aspect, rounded). Null for an unknown size: the picture is then not limited
 * by its aspect, so the caller leaves the term out and the column width decides.
 */
export function containedWidth(
	image: { width: number; height: number },
	height: number
): number | null {
	if (!(image.width > 0 && image.height > 0 && height > 0)) return null;
	return Math.round((height * image.width) / image.height);
}
