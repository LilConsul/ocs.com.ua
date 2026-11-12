import { describe, expect, it } from "bun:test";
import type { ImageMetadata } from "astro";
import { shareImageUrl, thumbUrl } from "@/lib/share-image";

const image: ImageMetadata = {
	src: "/_astro/a.hash.webp",
	width: 2000,
	height: 1000,
	format: "webp",
};

describe("share-image", () => {
	it("returns undefined without an image", async () => {
		expect(await shareImageUrl(undefined, "https://ocs.test")).toBeUndefined();
	});

	it("returns an absolute 1200 px jpeg url", async () => {
		expect(await shareImageUrl(image, "https://ocs.test")).toBe(
			"https://ocs.test/_astro/a.w1200.jpeg"
		);
		expect(await shareImageUrl(image, new URL("https://ocs.test"))).toStartWith(
			"https://ocs.test/"
		);
	});

	it("returns a 400 px webp thumbnail, or the placeholder", async () => {
		expect(await thumbUrl(image)).toBe("/_astro/a.w400.webp");
		expect(await thumbUrl(undefined)).toBe("/placeholder.svg");
	});
});
