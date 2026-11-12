/**
 * Loading skeletons for pictures. A `.skeleton` wrapper shows a gray block and keeps its picture
 * transparent (global.css, only under `html.skeleton-on`) until `data-loaded` is set on it.
 *
 * skeleton-on.js (inlined in <head>) already does that as pictures load, with a capturing
 * `load`/`error` listener, so skeletons never wait for this bundle. This module sweeps up what
 * that listener cannot see: a picture that is already complete (cached, or broken) when the
 * wrapper is first looked at, and markup inserted later with `innerHTML` (call it again then).
 * A failed picture is marked on `error`, so it never stays hidden. Safe to call repeatedly.
 * Without JavaScript `skeleton-on` is not set and nothing is hidden. With reduced motion the gray
 * block stays but it does not pulse and the picture does not fade.
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
