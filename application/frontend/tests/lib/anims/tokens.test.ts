import { describe, expect, it } from "bun:test";
import {
	DUR,
	EASE_OUT_EXPO,
	FAILSAFE_MS,
	MAX_STAGGER_INDEX,
	parseIndex,
	REVEAL_DURATION,
	REVEAL_SELECTOR,
	revealDelay,
	revealKeyframes,
	STAGGER_STEP,
	staggerDelay,
	variantFor,
} from "@/lib/anims/tokens";

const classes = (...names: string[]) => ({ contains: (name: string) => names.includes(name) });

describe("parseIndex", () => {
	it("reads the --i stagger index", () => {
		expect(parseIndex("2")).toBe(2);
		expect(parseIndex(" 3 ")).toBe(3);
	});

	it("falls back to 0 for missing or invalid values", () => {
		expect(parseIndex("")).toBe(0);
		expect(parseIndex(null)).toBe(0);
		expect(parseIndex(undefined)).toBe(0);
		expect(parseIndex("abc")).toBe(0);
		expect(parseIndex("-4")).toBe(0);
	});

	it("caps the index so a long list never waits seconds for its last item", () => {
		expect(parseIndex("99")).toBe(MAX_STAGGER_INDEX);
	});
});

describe("staggerDelay", () => {
	it("is the index times the stagger step, in seconds", () => {
		expect(staggerDelay(0)).toBe(0);
		expect(staggerDelay(3)).toBeCloseTo(3 * STAGGER_STEP, 10);
	});
});

describe("variantFor", () => {
	it("maps each reveal class to its variant", () => {
		expect(variantFor(classes("reveal"))).toBe("rise");
		expect(variantFor(classes("reveal-slide"))).toBe("slide");
		expect(variantFor(classes("reveal-glow"))).toBe("glow");
		expect(variantFor(classes("reveal-bar"))).toBe("bar");
		expect(variantFor(classes("eyebrow-rule"))).toBe("rule");
		expect(variantFor(classes("reveal-heading"))).toBe("heading");
	});

	it("defaults to rise", () => {
		expect(variantFor(classes("something-else"))).toBe("rise");
	});
});

describe("revealDelay", () => {
	it("is the plain stagger delay for ordinary variants", () => {
		expect(revealDelay("rise", 2)).toBe(staggerDelay(2));
		expect(revealDelay("rule", 0)).toBe(0);
	});

	it("starts headings one step after their eyebrow rule", () => {
		expect(revealDelay("heading", 0)).toBe(STAGGER_STEP);
		expect(revealDelay("heading", 2)).toBeCloseTo(staggerDelay(2) + STAGGER_STEP, 10);
	});
});

describe("revealKeyframes", () => {
	it("always ends fully visible and untransformed", () => {
		for (const variant of ["rise", "slide", "glow", "bar", "rule", "heading"] as const) {
			const frames = revealKeyframes(variant);
			expect(frames.transform?.at(-1)).toBe("none");
			expect(frames.opacity?.at(-1)).toBe(1);
		}
	});

	it("bar and rule grow from zero width without fading", () => {
		expect(revealKeyframes("bar").transform?.[0]).toBe("scaleX(0)");
		expect(revealKeyframes("rule").transform?.[0]).toBe("scaleX(0)");
		expect(revealKeyframes("bar").opacity).toEqual([1, 1]);
	});
});

describe("constants", () => {
	it("selects every class the old scroll-driven CSS supported", () => {
		for (const name of [
			"reveal",
			"reveal-slide",
			"reveal-glow",
			"reveal-bar",
			"reveal-heading",
			"eyebrow-rule",
		]) {
			expect(REVEAL_SELECTOR).toContain(`.${name}`);
		}
	});

	it("uses an ease-out curve with a 3 second failsafe", () => {
		expect(EASE_OUT_EXPO).toEqual([0.16, 1, 0.3, 1]);
		expect(FAILSAFE_MS).toBe(3000);
	});
});

describe("DUR", () => {
	it("exposes DUR matching the CSS duration tokens", () => {
		expect(DUR).toEqual({ fast: 0.15, base: 0.3, slow: 0.7 });
		expect(REVEAL_DURATION).toBe(DUR.slow);
	});
});
