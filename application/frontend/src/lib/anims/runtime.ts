import { observeReveals } from "./reveal";

declare global {
	interface Window {
		/** Timer id set by motion-on.js; cleared here once the runtime is alive */
		__motionFailsafe?: number;
	}
}

// The runtime loaded, so the head script's failsafe must not hide-then-show the page
if (window.__motionFailsafe !== undefined) window.clearTimeout(window.__motionFailsafe);

try {
	observeReveals(document);
} catch (error) {
	// The failsafe is gone, so do its job now: without `motion-on` nothing (reveals, skeleton
	// pictures) is hidden. Not rethrown, so the rest of this bundle (the skeletons) still runs.
	document.documentElement.classList.remove("motion-on");
	console.error(error);
}
