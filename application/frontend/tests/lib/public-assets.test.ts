import { describe, expect, it, spyOn } from "bun:test";
import { existingFile, existingFiles } from "@/lib/public-assets";

// /placeholder.svg and /assets/icons/logo-en.svg are committed in public/
const REAL = "/assets/icons/logo-en.svg";
const MISSING = "/assets/definitely-not-uploaded.webp";

describe("existingFile", () => {
	it("keeps a path whose file exists in public/", () => {
		expect(existingFile(REAL)).toBe(REAL);
	});

	it("drops a path whose file is missing and warns once", () => {
		const warn = spyOn(console, "warn").mockImplementation(() => undefined);
		expect(existingFile("/assets/missing-once.webp")).toBeUndefined();
		expect(existingFile("/assets/missing-once.webp")).toBeUndefined();
		expect(warn).toHaveBeenCalledTimes(1);
		warn.mockRestore();
	});

	it("returns undefined for empty values", () => {
		expect(existingFile(undefined)).toBeUndefined();
		expect(existingFile(null)).toBeUndefined();
		expect(existingFile("")).toBeUndefined();
	});

	it("drops remote URLs because they cannot be verified", () => {
		const warn = spyOn(console, "warn").mockImplementation(() => undefined);
		expect(existingFile("https://example.com/a.webp")).toBeUndefined();
		expect(existingFile("//example.com/b.webp")).toBeUndefined();
		warn.mockRestore();
	});

	it("does not follow paths out of public/", () => {
		const warn = spyOn(console, "warn").mockImplementation(() => undefined);
		expect(existingFile("/../package.json")).toBeUndefined();
		warn.mockRestore();
	});

	it("works for non-image files such as PDFs", () => {
		const warn = spyOn(console, "warn").mockImplementation(() => undefined);
		expect(existingFile("/assets/documents/authorisation-wipotec-2026-signed.pdf")).toBe(
			"/assets/documents/authorisation-wipotec-2026-signed.pdf"
		);
		expect(existingFile("/assets/documents/deleted-in-cms.pdf")).toBeUndefined();
		warn.mockRestore();
	});
});

describe("existingFiles", () => {
	it("keeps the existing paths in order and omits the missing ones", () => {
		const warn = spyOn(console, "warn").mockImplementation(() => undefined);
		expect(existingFiles([MISSING, REAL, "/placeholder.svg"])).toEqual([REAL, "/placeholder.svg"]);
		warn.mockRestore();
	});

	it("returns an empty array when nothing exists or the input is empty", () => {
		const warn = spyOn(console, "warn").mockImplementation(() => undefined);
		expect(existingFiles([MISSING])).toEqual([]);
		warn.mockRestore();
		expect(existingFiles(undefined)).toEqual([]);
		expect(existingFiles(null)).toEqual([]);
	});
});
