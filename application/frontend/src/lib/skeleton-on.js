// Inlined into <head> by Layout.astro (via ?raw), so it runs before first paint and before any
// picture exists. Keep it free of imports.
//
// Turns on `html.skeleton-on`, which makes global.css show a gray block behind each picture that
// is still loading, and ends each skeleton itself: `load` and `error` do not bubble, but a
// capturing listener on the document sees every picture's, including ones inserted later. That
// way the skeletons work from the first paint and never wait for the page bundle (which on a slow
// connection, or the unbundled dev server, can arrive late); src/lib/image-skeleton.ts only sweeps
// up what this listener cannot see.
//
// `html.skeleton-on` does not depend on the reduced-motion setting: a placeholder is not an
// animation (the pulse and the fade have their own motion media query). It is only set when
// JavaScript runs, because without it nothing could end the skeleton.
document.documentElement.classList.add("skeleton-on");

const settle = (event) => {
	const img = event.target;
	// A hidden picture (a gallery's other photos) is not the one the skeleton waits for
	if (!(img instanceof HTMLImageElement) || img.hidden) return;
	const wrapper = img.closest(".skeleton");
	if (wrapper) wrapper.dataset.loaded = "";
};
document.addEventListener("load", settle, true);
document.addEventListener("error", settle, true);
