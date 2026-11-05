/**
 * Shared constants and pure helpers for the reveal runtime (`reveal.ts`).
 *
 * `EASE_OUT_EXPO` mirrors `--ease-out-expo` in `styles/global.css`; a test keeps them equal.
 */

/** Cubic-bezier control points, same curve as the CSS `--ease-out-expo` token */
export const EASE_OUT_EXPO: [number, number, number, number] = [0.16, 1, 0.3, 1];

/** Seconds per reveal animation */
export const REVEAL_DURATION = 0.7;

/** Seconds of delay added per `--i` step */
export const STAGGER_STEP = 0.08;

/** Highest stagger index honoured, so a long grid never waits seconds for its last card */
export const MAX_STAGGER_INDEX = 6;

/** Milliseconds before the head script gives up waiting for the runtime and shows content */
export const FAILSAFE_MS = 3000;

/** Every class that opts an element into a scroll reveal */
export const REVEAL_SELECTOR = ".reveal, .reveal-slide, .reveal-glow, .reveal-bar, .eyebrow-rule";

export type RevealVariant = "rise" | "slide" | "glow" | "bar" | "rule";

/** Reads the `--i` custom property value; invalid or missing values become 0 */
export function parseIndex(raw: string | null | undefined): number {
	const value = Number.parseInt(raw ?? "", 10);
	if (!Number.isFinite(value) || value < 0) return 0;
	return Math.min(value, MAX_STAGGER_INDEX);
}

/** Delay in seconds for the element at stagger position `index` */
export function staggerDelay(index: number): number {
	return index * STAGGER_STEP;
}

/** Picks the variant from the element's classes (first match wins, default is rise) */
export function variantFor(classList: { contains(name: string): boolean }): RevealVariant {
	if (classList.contains("reveal-slide")) return "slide";
	if (classList.contains("reveal-glow")) return "glow";
	if (classList.contains("reveal-bar")) return "bar";
	if (classList.contains("eyebrow-rule")) return "rule";
	return "rise";
}

type Keyframes = { opacity: number[]; transform: string[] };

/**
 * Start and end keyframes for a variant. The end state is always `opacity: 1` and
 * `transform: none`, so finishing the animation leaves the element exactly as authored.
 */
export function revealKeyframes(variant: RevealVariant): Keyframes {
	switch (variant) {
		case "slide":
			return { opacity: [0, 1], transform: ["translateX(-16px)", "none"] };
		case "glow":
			return { opacity: [0, 1], transform: ["scale(0.7)", "none"] };
		case "bar":
		case "rule":
			return { opacity: [1, 1], transform: ["scaleX(0)", "none"] };
		default:
			return { opacity: [0, 1], transform: ["translateY(24px)", "none"] };
	}
}
