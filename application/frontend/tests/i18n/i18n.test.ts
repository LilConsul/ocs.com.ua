import { describe, expect, it } from "bun:test";
import { getInlineTranslations, textToKey } from "@/i18n/inline";
import { getIsoLang, getLangFromUrl, getTranslations } from "@/i18n/utils";

describe("getIsoLang", () => {
	it("maps the internal ua code to ISO 639-1 uk", () => {
		expect(getIsoLang("ua")).toBe("uk");
	});

	it("passes en through unchanged", () => {
		expect(getIsoLang("en")).toBe("en");
	});
});

describe("getLangFromUrl", () => {
	it("reads en and ua from the first path segment", () => {
		expect(getLangFromUrl(new URL("https://x.test/en/contact"))).toBe("en");
		expect(getLangFromUrl(new URL("https://x.test/ua"))).toBe("ua");
	});

	it("falls back to the default language", () => {
		expect(getLangFromUrl(new URL("https://x.test/"))).toBe("ua");
		expect(getLangFromUrl(new URL("https://x.test/fr/contact"))).toBe("ua");
	});

	it("only looks at the first segment", () => {
		expect(getLangFromUrl(new URL("https://x.test/catalogue/en"))).toBe("ua");
	});
});

describe("textToKey", () => {
	it("lowercases and joins words with underscores", () => {
		expect(textToKey("Hello, World!")).toBe("hello_world");
	});

	it("trims leading and trailing separators", () => {
		expect(textToKey("  ...Hi!  ")).toBe("hi");
	});

	it("keeps at most 80 characters", () => {
		expect(textToKey("a".repeat(200))).toHaveLength(80);
	});

	it("matches the keys stored in ui.ts", () => {
		expect(textToKey("Food & Beverage")).toBe("food_beverage");
	});
});

describe("getInlineTranslations", () => {
	it("returns the Ukrainian translation", () => {
		expect(getInlineTranslations("ua")("Pharmaceutical")).toBe("Фармацевтична промисловість");
	});

	it("returns the English text for the en locale", () => {
		expect(getInlineTranslations("en")("Pharmaceutical")).toBe("Pharmaceutical");
	});

	it("falls back to the source text when no translation exists", () => {
		expect(getInlineTranslations("ua")("A sentence nobody translated")).toBe(
			"A sentence nobody translated"
		);
	});
});

describe("getTranslations", () => {
	it("returns a value for every locale", () => {
		for (const lang of ["en", "ua"] as const) {
			const t = getTranslations(lang);
			expect(t).toBeFunction();
		}
	});
});
