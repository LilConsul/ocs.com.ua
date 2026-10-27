/**
 * Draws every `.eyebrow-rule` (the short dash before section labels) the first time it
 * scrolls into view. Sets `data-rule="ready"` right away (CSS collapses the dash) and
 * switches to `data-rule="in"` on first intersection (CSS runs the draw animation).
 * Does nothing when the user prefers reduced motion or IntersectionObserver is missing,
 * so the dash simply renders in its final state.
 */
export function initEyebrowRules(): void {
	const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
	if (reduceMotion || !("IntersectionObserver" in window)) return;

	const observer = new IntersectionObserver(
		(entries) => {
			for (const entry of entries) {
				if (!entry.isIntersecting) continue;
				(entry.target as HTMLElement).dataset.rule = "in";
				observer.unobserve(entry.target);
			}
		},
		{ threshold: 1 }
	);

	for (const el of document.querySelectorAll<HTMLElement>(".eyebrow-rule")) {
		el.dataset.rule = "ready";
		observer.observe(el);
	}
}
