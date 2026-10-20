import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { ui } from "@/i18n/ui";
import { generateUiContent } from "../../scripts/i18n-compile.js";
import { extractStrings, parsePO } from "../../scripts/i18n-extract-po.js";

const ROOT_DIR = resolve(import.meta.dir, "../..");
const LOCALES_DIR = resolve(ROOT_DIR, "locales");
const UI_FILE = resolve(ROOT_DIR, "src/i18n/ui.ts");

const keys = (lang: keyof typeof ui) => Object.keys(ui[lang]);

describe("translation parity", () => {
	it("has every English key in Ukrainian", () => {
		const ua = new Set(keys("ua"));
		const missing = keys("en").filter((k) => !ua.has(k));
		expect(missing).toEqual([]);
	});

	it("has every Ukrainian key in English", () => {
		const en = new Set(keys("en"));
		const missing = keys("ua").filter((k) => !en.has(k));
		expect(missing).toEqual([]);
	});

	it("has no empty translations", () => {
		for (const lang of ["en", "ua"] as const) {
			const empty = Object.entries(ui[lang])
				.filter(([, v]) => !String(v).trim())
				.map(([k]) => k);
			expect(empty).toEqual([]);
		}
	});

	it("keeps the same {placeholders} in both languages", () => {
		const placeholders = (s: string) => (s.match(/\{[^}]+\}/g) ?? []).sort();
		const mismatched = Object.entries(ui.en)
			.filter(([k, v]) => {
				const ua = (ui.ua as Record<string, string>)[k];
				return ua !== undefined && placeholders(String(v)).join() !== placeholders(ua).join();
			})
			.map(([k]) => k);
		expect(mismatched).toEqual([]);
	});
});

describe("PO file translation completeness", () => {
	it("has no empty translations in locales/ua.po", () => {
		const uaContent = readFileSync(resolve(LOCALES_DIR, "ua.po"), "utf-8");
		const translations = parsePO(uaContent);

		const untranslated: string[] = [];
		for (const [msgid, msgstr] of translations) {
			if (!msgstr || msgstr.trim() === "") {
				untranslated.push(msgid);
			}
		}

		expect(untranslated).toEqual([]);
	});

	it("has every extracted _() string from source code in locales/ua.po and translated", async () => {
		const extracted = await extractStrings(ROOT_DIR);
		const uaContent = readFileSync(resolve(LOCALES_DIR, "ua.po"), "utf-8");
		const uaTranslations = parsePO(uaContent);

		const missingOrEmpty: { msgid: string; locations: { file: string; line: number }[] }[] = [];
		for (const [msgid, locations] of extracted) {
			const translation = uaTranslations.get(msgid);
			if (!translation || translation.trim() === "") {
				missingOrEmpty.push({ msgid, locations });
			}
		}

		expect(missingOrEmpty).toEqual([]);
	});

	it("has every extracted _() string from source code in locales/messages.pot", async () => {
		const extracted = await extractStrings(ROOT_DIR);
		const potContent = readFileSync(resolve(LOCALES_DIR, "messages.pot"), "utf-8");
		const potTranslations = parsePO(potContent);

		const missing: { msgid: string; locations: { file: string; line: number }[] }[] = [];
		for (const [msgid, locations] of extracted) {
			if (!potTranslations.has(msgid)) {
				missing.push({ msgid, locations });
			}
		}

		expect(missing).toEqual([]);
	});
});

describe("i18n compiled output sync", () => {
	it("matches src/i18n/ui.ts with compiled locales (.pot and .po files)", () => {
		const potContent = readFileSync(resolve(LOCALES_DIR, "messages.pot"), "utf-8");
		const uaContent = readFileSync(resolve(LOCALES_DIR, "ua.po"), "utf-8");
		const expectedUi = generateUiContent(potContent, { ua: uaContent });
		const currentUi = readFileSync(UI_FILE, "utf-8");

		expect(currentUi).toBe(expectedUi);
	});
});
