import { describe, expect, test } from "bun:test";
import { fillTokens, getPrivacyPolicy, getTermsOfUse } from "@/lib/legal/document";

describe("fillTokens", () => {
	test("replaces every token", () => {
		const values = {
			email: "a@b.ua",
			address: "Kyiv",
			privacyUrl: "/en/privacy",
			termsUrl: "/en/terms",
		};
		const out = fillTokens("{email} / {email} / {address} / {privacyUrl} / {termsUrl}", values);
		expect(out).toBe(
			"[a@b.ua](mailto:a@b.ua) / [a@b.ua](mailto:a@b.ua) / Kyiv / /en/privacy / /en/terms"
		);
	});
});

describe("fillTokens link addresses", () => {
	test("accepts braces the rich text editor percent-encoded", () => {
		const values = {
			email: "a@b.ua",
			address: "Kyiv",
			privacyUrl: "/ua/privacy",
			termsUrl: "/ua/terms",
		};
		expect(fillTokens("[x](%7BprivacyUrl%7D) [y](%7BtermsUrl%7D)", values)).toBe(
			"[x](/ua/privacy) [y](/ua/terms)"
		);
	});
});

describe.each([
	["privacy policy", getPrivacyPolicy],
	["terms of use", getTermsOfUse],
])("%s", (_name, load) => {
	for (const lang of ["en", "ua"] as const) {
		test(`${lang}: every section has a title and content, and no token or bracket is left`, () => {
			const doc = load(lang);
			expect(doc.sections.length).toBeGreaterThan(0);
			for (const s of doc.sections) {
				expect(s.title).not.toBe("");
				expect(s.html).not.toBe("");
				expect(s.html).not.toMatch(/[{}]|\[[^\]]*\](?!\()/);
			}
		});
	}
});
