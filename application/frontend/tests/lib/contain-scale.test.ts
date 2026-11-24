import { describe, expect, test } from "bun:test";
import { containScale } from "@/lib/contain-scale";

describe("containScale", () => {
	test("square picture in a wide box", () => {
		expect(containScale({ width: 1600, height: 1600 }, 1.37)).toBe(0.73);
	});
	test("panorama fills the width", () => {
		expect(containScale({ width: 3000, height: 600 }, 1.37)).toBe(1);
	});
	test("tall and narrow picture", () => {
		expect(containScale({ width: 400, height: 1600 }, 1.37)).toBe(0.19);
	});
	test("unknown size is never too small", () => {
		expect(containScale({ width: 0, height: 0 }, 1.37)).toBe(1);
	});
});
