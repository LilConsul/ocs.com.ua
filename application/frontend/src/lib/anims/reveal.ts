import { inView } from "motion";
import { animate } from "motion/mini";
import {
	EASE_OUT_EXPO,
	parseIndex,
	REVEAL_DURATION,
	REVEAL_SELECTOR,
	revealDelay,
	revealKeyframes,
	variantFor,
} from "./tokens";

/** Elements already handed to the observer, so repeated scans never double-animate */
const seen = new WeakSet<Element>();

/** A reveal only starts once this much of the viewport bottom has been cleared */
const TRIGGER_MARGIN = "0px 0px -8% 0px";

function play(el: HTMLElement): void {
	const index = parseIndex(el.style.getPropertyValue("--i"));
	const variant = variantFor(el.classList);
	const frames = revealKeyframes(variant);
	// An element can ask for a quicker reveal with `--reveal-duration` (seconds), e.g. tall cards
	const custom = Number.parseFloat(el.style.getPropertyValue("--reveal-duration"));
	const duration = Number.isFinite(custom) && custom > 0 ? custom : REVEAL_DURATION;

	// Mark first: the stylesheet un-hides on [data-revealed], so even a throwing animation
	// can never leave the element invisible
	el.dataset.revealed = "";
	try {
		animate(el, frames, {
			duration,
			delay: revealDelay(variant, index),
			ease: EASE_OUT_EXPO,
		}).then(() => {
			// Hand control back to the stylesheet so hover transforms keep working
			el.style.removeProperty("opacity");
			el.style.removeProperty("transform");
		});
	} catch {
		// Nothing to do: the element is already revealed
	}
}

/**
 * Plays a one-shot entrance for every not yet revealed element under `root` when it scrolls
 * into view. Safe to call repeatedly; call it again after inserting markup dynamically.
 * Does nothing unless the head script enabled motion (`html.motion-on`).
 */
export function observeReveals(root: ParentNode = document): void {
	if (!document.documentElement.classList.contains("motion-on")) return;

	const fresh = Array.from(root.querySelectorAll<HTMLElement>(REVEAL_SELECTOR)).filter(
		(el) => !(seen.has(el) || "revealed" in el.dataset)
	);
	for (const el of fresh) seen.add(el);
	if (fresh.length === 0) return;

	inView(fresh, (el) => play(el as HTMLElement), { margin: TRIGGER_MARGIN });
}
