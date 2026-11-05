/** The slice of HTMLImageElement the fade-in needs, so it can be tested without a DOM */
export interface FadeImage {
	complete: boolean;
	dataset: Record<string, string | undefined>;
	addEventListener(type: "load" | "error", listener: () => void, options?: { once: boolean }): void;
}

/** Every image that opts into the fade-in */
export const IMAGE_SELECTOR = "img.img-fade";

/**
 * Sets `data-loaded` once the image has finished, which un-hides it (see `.img-fade` in
 * global.css). Errors count as finished so a broken image shows its alt text instead of a gap.
 * Safe to call twice on the same image.
 */
export function watchImage(img: FadeImage): void {
	if ("loaded" in img.dataset) return;
	if (img.complete) {
		img.dataset.loaded = "";
		return;
	}
	const done = () => {
		img.dataset.loaded = "";
	};
	img.addEventListener("load", done, { once: true });
	img.addEventListener("error", done, { once: true });
}

/**
 * Fades in every `img.img-fade` under `root` as it finishes loading. Call it again after
 * inserting markup dynamically. Does nothing unless the head script enabled motion.
 */
export function observeImages(root: ParentNode = document): void {
	if (!document.documentElement.classList.contains("motion-on")) return;
	for (const img of root.querySelectorAll<HTMLImageElement>(IMAGE_SELECTOR)) watchImage(img);
}
