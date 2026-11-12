import { describe, expect, it, spyOn } from "bun:test";
import type { ImageMetadata } from "astro";
import { createImageResolver } from "@/lib/image-resolver";

function meta(name: string): ImageMetadata {
	return { src: `/_astro/${name}`, width: 100, height: 50, format: "webp" };
}

const A = meta("a.webp");
const B = meta("b.webp");
const SPACED = meta("spaced.webp");

function makeResolver() {
	return createImageResolver({
		"/src/assets/equipment/hc-a/a.webp": A,
		"/src/assets/equipment/hc-a/b.webp": B,
		"/src/assets/equipment/hc-a/with space.webp": SPACED,
	});
}

describe("resolveImage", () => {
	it("returns the metadata for a known path", () => {
		expect(makeResolver().resolveImage("/assets/equipment/hc-a/a.webp")).toBe(A);
	});

	it("decodes encoded paths", () => {
		expect(makeResolver().resolveImage("/assets/equipment/hc-a/with%20space.webp")).toBe(SPACED);
	});

	it("warns once for a missing path and returns undefined", () => {
		const warn = spyOn(console, "warn").mockImplementation(() => undefined);
		const { resolveImage } = makeResolver();
		expect(resolveImage("/assets/equipment/hc-a/missing-once.webp")).toBeUndefined();
		expect(resolveImage("/assets/equipment/hc-a/missing-once.webp")).toBeUndefined();
		expect(warn).toHaveBeenCalledTimes(1);
		expect(warn).toHaveBeenCalledWith(
			"[images] /assets/equipment/hc-a/missing-once.webp is referenced in content but missing from src/assets/, skipping it"
		);
		warn.mockRestore();
	});

	it("returns undefined for null, undefined and empty", () => {
		const { resolveImage } = makeResolver();
		expect(resolveImage(undefined)).toBeUndefined();
		expect(resolveImage(null)).toBeUndefined();
		expect(resolveImage("")).toBeUndefined();
	});

	it("rejects remote urls", () => {
		const warn = spyOn(console, "warn").mockImplementation(() => undefined);
		const { resolveImage } = makeResolver();
		expect(resolveImage("https://example.com/a.webp")).toBeUndefined();
		expect(resolveImage("//example.com/b.webp")).toBeUndefined();
		warn.mockRestore();
	});
});

describe("resolveImages", () => {
	it("drops misses and keeps order", () => {
		const warn = spyOn(console, "warn").mockImplementation(() => undefined);
		const { resolveImages } = makeResolver();
		expect(
			resolveImages([
				"/assets/equipment/hc-a/b.webp",
				"/assets/equipment/hc-a/nope-list.webp",
				"/assets/equipment/hc-a/a.webp",
			])
		).toEqual([B, A]);
		warn.mockRestore();
	});

	it("accepts undefined and null as empty", () => {
		const { resolveImages } = makeResolver();
		expect(resolveImages(undefined)).toEqual([]);
		expect(resolveImages(null)).toEqual([]);
	});
});
