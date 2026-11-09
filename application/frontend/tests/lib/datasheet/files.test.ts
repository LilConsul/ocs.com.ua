import { afterAll, describe, expect, it, spyOn } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
	datasheetFileName,
	findDatasheetDir,
	hasDatasheet,
	resolveDatasheet,
} from "@/lib/datasheet/files";

const root = mkdtempSync(join(tmpdir(), "datasheets-"));
const dir = join(root, "private", "datasheets");
mkdirSync(dir, { recursive: true });
writeFileSync(join(dir, "hc-m.pdf"), "%PDF-1.4");

afterAll(() => rmSync(root, { recursive: true, force: true }));

describe("datasheetFileName", () => {
	it("accepts /datasheets/<name>.pdf", () => {
		expect(datasheetFileName("/datasheets/hc-m.pdf")).toBe("hc-m.pdf");
		expect(datasheetFileName("/datasheets/HC_A-2.v1.pdf")).toBe("HC_A-2.v1.pdf");
	});

	it("rejects everything else", () => {
		for (const bad of [
			null,
			undefined,
			"",
			"/assets/equipment/hc-m/datasheet.pdf",
			"/assets/image_409a1f1c.webp",
			"/datasheets/hc-m.webp",
			"/datasheets/hc-m",
			"/datasheets/../package.json",
			"/datasheets/a/b.pdf",
			"/datasheets/%2e%2e%2fsecret.pdf",
			"datasheets/hc-m.pdf",
			"https://example.com/datasheets/hc-m.pdf",
		]) {
			expect(datasheetFileName(bad)).toBeNull();
		}
	});
});

describe("findDatasheetDir", () => {
	it("walks up from a nested folder to private/datasheets", () => {
		const nested = join(root, "dist", "server", "chunks");
		mkdirSync(nested, { recursive: true });
		expect(findDatasheetDir(nested)).toBe(dir);
	});

	it("returns null when there is no such folder above", () => {
		const other = mkdtempSync(join(tmpdir(), "no-datasheets-"));
		try {
			expect(findDatasheetDir(other)).toBeNull();
		} finally {
			rmSync(other, { recursive: true, force: true });
		}
	});
});

describe("resolveDatasheet", () => {
	it("returns the absolute path of an existing PDF", () => {
		expect(resolveDatasheet("/datasheets/hc-m.pdf", dir)).toBe(join(dir, "hc-m.pdf"));
	});

	it("returns null for a missing file, an invalid reference or no folder", () => {
		expect(resolveDatasheet("/datasheets/ghost.pdf", dir)).toBeNull();
		expect(resolveDatasheet("/assets/x.pdf", dir)).toBeNull();
		expect(resolveDatasheet("/datasheets/hc-m.pdf", null)).toBeNull();
	});
});

describe("hasDatasheet", () => {
	it("is true for an existing PDF and silent", () => {
		const warn = spyOn(console, "warn").mockImplementation(() => undefined);
		expect(hasDatasheet("/datasheets/hc-m.pdf", dir)).toBe(true);
		expect(warn).not.toHaveBeenCalled();
		warn.mockRestore();
	});

	it("is false and quiet when the field is empty", () => {
		const warn = spyOn(console, "warn").mockImplementation(() => undefined);
		expect(hasDatasheet(null, dir)).toBe(false);
		expect(hasDatasheet("", dir)).toBe(false);
		expect(warn).not.toHaveBeenCalled();
		warn.mockRestore();
	});

	it("is false and warns once for a reference that cannot be served", () => {
		const warn = spyOn(console, "warn").mockImplementation(() => undefined);
		expect(hasDatasheet("/assets/old/datasheet.pdf", dir)).toBe(false);
		expect(hasDatasheet("/assets/old/datasheet.pdf", dir)).toBe(false);
		expect(warn).toHaveBeenCalledTimes(1);
		warn.mockRestore();
	});
});
