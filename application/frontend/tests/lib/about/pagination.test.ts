import { describe, expect, it } from "bun:test";
import { paginate } from "@/lib/about/pagination";

describe("paginate", () => {
	const items = Array.from({ length: 20 }, (_, i) => i);

	it("returns the requested slice and the page count", () => {
		expect(paginate(items, 1, 9)).toEqual({
			items: [0, 1, 2, 3, 4, 5, 6, 7, 8],
			page: 1,
			pageCount: 3,
		});
		expect(paginate(items, 3, 9)).toEqual({ items: [18, 19], page: 3, pageCount: 3 });
	});

	it("clamps out-of-range pages", () => {
		expect(paginate(items, 0, 9).page).toBe(1);
		expect(paginate(items, 99, 9).page).toBe(3);
	});

	it("treats an empty list as a single empty page", () => {
		expect(paginate([], 1, 9)).toEqual({ items: [], page: 1, pageCount: 1 });
	});
});
