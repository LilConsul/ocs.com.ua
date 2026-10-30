import { describe, expect, it } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = join(import.meta.dir, "../..");
const PATCH_KEY = "decap-cms-core@3.19.1";

const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
const installed = (file: string) =>
	readFileSync(join(root, "node_modules/decap-cms-core", file), "utf8");

// Decap's own bundles need a browser, so these check the patched source text rather than running it.
describe("decap-cms-core patch (file_name names and renames product files)", () => {
	it("is registered in package.json and exists on disk", () => {
		const patchPath = pkg.patchedDependencies?.[PATCH_KEY];
		expect(patchPath).toBeDefined();
		expect(existsSync(join(root, patchPath))).toBe(true);
	});

	it("is pinned to the Decap version it was written for", () => {
		expect(JSON.parse(installed("package.json")).version).toBe("3.19.1");
	});

	it("is applied to the installed Decap (run bun install if this fails)", () => {
		expect(installed("dist/esm/reducers/entryDraft.js")).toContain("file_name");
		expect(installed("dist/esm/backend.js")).toContain("A file already exists at");
	});

	it("names new files from file_name, falling back to the title", () => {
		const src = installed("dist/esm/reducers/entryDraft.js");
		expect(src).toContain("entryData.get('file_name')");
		expect(src).toContain("cleanTitleForFilename(fileName || title)");
	});

	it("renames existing files when file_name changes, keeping the current name when it is empty", () => {
		const src = installed("dist/esm/reducers/entryDraft.js");
		expect(src).toContain("fileName ? cleanTitleForFilename(fileName) : basename(currentPath");
	});

	it("refuses a move or rename onto a file that already exists", () => {
		const src = installed("dist/esm/backend.js");
		expect(src).toContain("customPath !== path");
		expect(src).toContain("this.implementation.getEntry(target)");
	});

	it("opens a renamed entry that is still in editorial workflow (path from the branch's files, slug kept)", () => {
		const src = installed("dist/esm/backend.js");
		expect(src).toContain("normalizeFilePath, getLocaleFromPath } from './lib/i18n'");
		expect(src).toContain("!dataFiles.some(f => expectedPaths.includes(f.path))");
		expect(src).toContain("...grouped[0],\n        slug");
	});

	it("reloads an editorial-workflow entry after a save that moved or renamed it (else the next save fails with BadObjectState)", () => {
		const src = installed("dist/esm/actions/editorialWorkflow.js");
		expect(src).toContain("import { selectCustomPath } from '../reducers/entryDraft'");
		expect(src).toContain("selectCustomPath(collection, serializedEntryDraft)");
		expect(src).toContain("movedPath !== entry.get('path')");
	});

	it("treats a missing file as free (GitHub getEntry resolves with empty data, it does not reject)", () => {
		expect(installed("dist/esm/backend.js")).toContain(
			"getEntry(target).then(({ data }) => !!data)"
		);
	});
});
