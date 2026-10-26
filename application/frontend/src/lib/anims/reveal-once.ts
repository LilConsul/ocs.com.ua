/** Tailwind's `md` breakpoint: below it, tall blocks can never reach a fractional threshold. */
const MOBILE_QUERY = "(max-width: 767px)";

/**
 * Plays an intro animation once, the first time `el` scrolls into view.
 *
 * Sets `data-anim="ready"` immediately (CSS uses it to hide the animated children) and
 * switches to `data-anim="in"` on first intersection (CSS uses it to run the animations).
 * `threshold` is the visible fraction needed on larger screens; on mobile it is forced to 0
 * because a tall block can be taller than the viewport and would never reach the fraction.
 * Does nothing when the user prefers reduced motion or IntersectionObserver is missing,
 * so the content simply renders in its final state.
 */
export function revealOnce(el: HTMLElement, threshold = 0.2): void {
	const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
	if (reduceMotion || !("IntersectionObserver" in window)) return;

	const effectiveThreshold = window.matchMedia(MOBILE_QUERY).matches ? 0 : threshold;

	el.dataset.anim = "ready";
	const observer = new IntersectionObserver(
		([entry]) => {
			if (!entry?.isIntersecting) return;
			el.dataset.anim = "in";
			observer.disconnect();
		},
		{ threshold: effectiveThreshold }
	);
	observer.observe(el);
}
