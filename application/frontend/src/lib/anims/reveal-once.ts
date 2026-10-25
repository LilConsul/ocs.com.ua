/**
 * Plays an intro animation once, the first time `el` scrolls into view.
 *
 * Sets `data-anim="ready"` immediately (CSS uses it to hide the animated children) and
 * switches to `data-anim="in"` on first intersection (CSS uses it to run the animations).
 * Does nothing when the user prefers reduced motion or IntersectionObserver is missing,
 * so the content simply renders in its final state.
 */
export function revealOnce(el: HTMLElement, threshold = 0): void {
	const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
	if (reduceMotion || !("IntersectionObserver" in window)) return;

	el.dataset.anim = "ready";
	const observer = new IntersectionObserver(
		([entry]) => {
			if (!entry?.isIntersecting) return;
			el.dataset.anim = "in";
			observer.disconnect();
		},
		{ threshold }
	);
	observer.observe(el);
}
