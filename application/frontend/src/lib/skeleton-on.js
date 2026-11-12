// Inlined into <head> by Layout.astro (via ?raw), so it runs before first paint. Keep it free of
// imports and keep FAILSAFE in sync with FAILSAFE_MS in anims/tokens.ts.
//
// Turns on `html.skeleton-on`, which makes global.css show a gray block behind each picture that
// is still loading. Unlike `html.motion-on` it does not depend on the reduced-motion setting: a
// placeholder is not an animation (the pulse and the fade have their own motion media query).
// It is only set when JavaScript runs, because the script that marks pictures as loaded needs it.
// If that script never loads, the failsafe removes the class so no picture stays transparent.
const root = document.documentElement;
root.classList.add("skeleton-on");
window.__skeletonFailsafe = window.setTimeout(() => {
	root.classList.remove("skeleton-on");
}, 3000);
