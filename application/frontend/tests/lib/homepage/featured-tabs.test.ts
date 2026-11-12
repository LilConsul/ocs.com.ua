import { describe, expect, it } from "bun:test";
import { nextTabIndex } from "@/lib/homepage/featured-tabs";

describe("nextTabIndex", () => {
	it("ArrowRight wraps from last to first", () => {
		expect(nextTabIndex(0, 3, "ArrowRight")).toBe(1);
		expect(nextTabIndex(2, 3, "ArrowRight")).toBe(0);
	});

	it("ArrowLeft wraps from first to last", () => {
		expect(nextTabIndex(2, 3, "ArrowLeft")).toBe(1);
		expect(nextTabIndex(0, 3, "ArrowLeft")).toBe(2);
	});

	it("Home and End jump to the ends", () => {
		expect(nextTabIndex(1, 4, "Home")).toBe(0);
		expect(nextTabIndex(1, 4, "End")).toBe(3);
	});

	it("keeps the index for other keys", () => {
		expect(nextTabIndex(1, 3, "Enter")).toBe(1);
		expect(nextTabIndex(2, 3, "a")).toBe(2);
	});

	it("stays at 0 when there is a single tab", () => {
		for (const key of ["ArrowRight", "ArrowLeft", "Home", "End"]) {
			expect(nextTabIndex(0, 1, key)).toBe(0);
		}
	});
});
