import { describe, expect, it } from "bun:test";
import { indexFromPosition, swipeDirection } from "@/lib/homepage/featured-gallery";

describe("indexFromPosition", () => {
	it("splits the width into equal zones, one per image", () => {
		expect(indexFromPosition(0, 300, 3)).toBe(0);
		expect(indexFromPosition(99, 300, 3)).toBe(0);
		expect(indexFromPosition(100, 300, 3)).toBe(1);
		expect(indexFromPosition(199, 300, 3)).toBe(1);
		expect(indexFromPosition(200, 300, 3)).toBe(2);
		expect(indexFromPosition(299, 300, 3)).toBe(2);
	});

	it("clamps positions outside the stage", () => {
		expect(indexFromPosition(-20, 300, 3)).toBe(0);
		expect(indexFromPosition(300, 300, 3)).toBe(2);
		expect(indexFromPosition(900, 300, 3)).toBe(2);
	});

	it("stays at 0 for a single image or an empty stage", () => {
		expect(indexFromPosition(150, 300, 1)).toBe(0);
		expect(indexFromPosition(150, 300, 0)).toBe(0);
		expect(indexFromPosition(150, 0, 3)).toBe(0);
	});
});

describe("swipeDirection", () => {
	it("returns 1 for a swipe to the left (next photo) and -1 for a swipe to the right", () => {
		expect(swipeDirection(-60, 5)).toBe(1);
		expect(swipeDirection(60, -5)).toBe(-1);
	});

	it("ignores short movements, so a tap is not a swipe", () => {
		expect(swipeDirection(10, 0)).toBe(0);
		expect(swipeDirection(-29, 0)).toBe(0);
	});

	it("ignores mostly vertical movements, so page scrolling is not a swipe", () => {
		expect(swipeDirection(-40, 90)).toBe(0);
		expect(swipeDirection(50, -60)).toBe(0);
	});

	it("takes a custom threshold", () => {
		expect(swipeDirection(-20, 0, 15)).toBe(1);
	});
});
