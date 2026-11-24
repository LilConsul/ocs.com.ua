import { describe, expect, test } from "bun:test";
import { containedWidth, containScale } from "@/lib/contain-scale";

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

describe("containedWidth", () => {
	test("square picture is as wide as the box is tall", () => {
		expect(containedWidth({ width: 1600, height: 1600 }, 144)).toBe(144);
	});
	test("very wide picture", () => {
		expect(containedWidth({ width: 3000, height: 600 }, 144)).toBe(720);
	});
	test("very tall picture", () => {
		expect(containedWidth({ width: 400, height: 1600 }, 144)).toBe(36);
	});
	test("unknown size has no limit, so the column width decides", () => {
		expect(containedWidth({ width: 0, height: 0 }, 144)).toBeNull();
	});
	test("zero height with a width is unknown too and never infinite", () => {
		expect(containedWidth({ width: 800, height: 0 }, 144)).toBeNull();
		expect(containedWidth({ width: 0, height: 800 }, 144)).toBeNull();
	});
});
