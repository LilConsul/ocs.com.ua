import { describe, expect, it, spyOn } from "bun:test";
import { existingFile, existingImage, existingImages } from "@/lib/public-assets";

// /placeholder.svg and /assets/icons/logo-en.svg are committed in public/
const REAL = "/assets/icons/logo-en.svg";
const MISSING = "/assets/definitely-not-uploaded.webp";

describe("existingImage", () => {
	it("keeps a path whose file exists in public/", () => {
		expect(existingImage(REAL)).toBe(REAL);
	});

	it("drops a path whose file is missing and warns once", () => {
		const warn = spyOn(console, "warn").mockImplementation(() => undefined);
		expect(existingImage("/assets/missing-once.webp")).toBeUndefined();
		expect(existingImage("/assets/missing-once.webp")).toBeUndefined();
		expect(warn).toHaveBeenCalledTimes(1);
		warn.mockRestore();
	});

	it("returns undefined for empty values", () => {
		expect(existingImage(undefined)).toBeUndefined();
		expect(existingImage(null)).toBeUndefined();
		expect(existingImage("")).toBeUndefined();
	});

	it("does not check remote URLs", () => {
		expect(existingImage("https://example.com/a.webp")).toBe("https://example.com/a.webp");
	});

	it("does not follow paths out of public/", () => {
		const warn = spyOn(console, "warn").mockImplementation(() => undefined);
		expect(existingImage("/../package.json")).toBeUndefined();
		warn.mockRestore();
	});
});

describe("existingFile", () => {
	it("works for non-image files such as PDFs", () => {
		const warn = spyOn(console, "warn").mockImplementation(() => undefined);
		expect(existingFile("/assets/documents/authorisation-wipotec-2026-signed.pdf")).toBe(
			"/assets/documents/authorisation-wipotec-2026-signed.pdf"
		);
		expect(existingFile("/assets/documents/deleted-in-cms.pdf")).toBeUndefined();
		warn.mockRestore();
	});
});

describe("existingImages", () => {
	it("keeps the existing paths in order and omits the missing ones", () => {
		const warn = spyOn(console, "warn").mockImplementation(() => undefined);
		expect(existingImages([MISSING, REAL, "/placeholder.svg"])).toEqual([REAL, "/placeholder.svg"]);
		warn.mockRestore();
	});

	it("returns an empty array when nothing exists or the input is empty", () => {
		const warn = spyOn(console, "warn").mockImplementation(() => undefined);
		expect(existingImages([MISSING])).toEqual([]);
		warn.mockRestore();
		expect(existingImages(undefined)).toEqual([]);
		expect(existingImages(null)).toEqual([]);
	});
});
