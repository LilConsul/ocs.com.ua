/**
 * Loading skeletons for pictures. A `.skeleton` wrapper shows a pulsing gray block and keeps its
 * picture transparent (global.css, only under `html.motion-on`) until this script sets
 * `data-loaded` on it, which stops the pulse and fades the picture in.
 *
 * A picture that is already complete (from the cache, or broken) is marked at once. Otherwise
 * the wrapper is marked on the first `load` or `error`, so a failed picture never stays hidden.
 * Without JavaScript or with reduced motion `motion-on` is not set and nothing is hidden.
 * Safe to call repeatedly; call it again after inserting skeleton markup with `innerHTML`.
 */
const watched = new WeakSet<Element>();

/** The picture a wrapper waits for: the first visible one (a gallery stage hides the others) */
function pictureOf(wrapper: Element): HTMLImageElement | null {
	return (
		wrapper.querySelector<HTMLImageElement>("img:not([hidden])") ??
		wrapper.querySelector<HTMLImageElement>("img")
	);
}

/**
 * Ends a skeleton now: the pulse stops and its pictures show. A gallery calls it when the user
 * steps to another photo, so the new photo cuts in as soon as it has loaded instead of waiting
 * for the first one.
 */
export function markLoaded(wrapper: HTMLElement): void {
	wrapper.dataset.loaded = "";
}

export function initImageSkeletons(root: ParentNode = document): void {
	for (const wrapper of root.querySelectorAll<HTMLElement>(".skeleton:not([data-loaded])")) {
		if (watched.has(wrapper)) continue;
		const img = pictureOf(wrapper);
		// Nothing to wait for, or already settled: a decoded picture or a broken one
		if (!img || img.complete) {
			markLoaded(wrapper);
			continue;
		}
		watched.add(wrapper);
		const done = () => {
			img.removeEventListener("load", done);
			img.removeEventListener("error", done);
			markLoaded(wrapper);
		};
		img.addEventListener("load", done);
		img.addEventListener("error", done);
	}
}
