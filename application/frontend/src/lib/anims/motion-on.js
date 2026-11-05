// Inlined into <head> by Layout.astro (via ?raw), so it runs before first paint. Keep it free of
// imports and keep FAILSAFE in sync with FAILSAFE_MS in tokens.ts (a test checks the value).
//
// Turns on `html.motion-on`, which makes global.css hide unrevealed .reveal* elements. The class is
// only set when reduced motion is off and IntersectionObserver exists. If the runtime never loads,
// the failsafe removes the class so content cannot stay hidden.
if (
	!window.matchMedia("(prefers-reduced-motion: reduce)").matches &&
	"IntersectionObserver" in window
) {
	const root = document.documentElement;
	root.classList.add("motion-on");
	window.__motionFailsafe = window.setTimeout(() => {
		root.classList.remove("motion-on");
	}, 3000);
}
