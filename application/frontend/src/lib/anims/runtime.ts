import { observeImages } from "./images";
import { observeReveals } from "./reveal";

declare global {
	interface Window {
		/** Timer id set by motion-on.js; cleared here once the runtime is alive */
		__motionFailsafe?: number;
	}
}

// The runtime loaded, so the head script's failsafe must not hide-then-show the page
if (window.__motionFailsafe !== undefined) window.clearTimeout(window.__motionFailsafe);

observeReveals(document);
observeImages(document);
