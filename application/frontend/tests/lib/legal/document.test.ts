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
				const all = [
					s.html,
					s.htmlAfter,
					...s.table.flatMap((r) => [r.purpose, r.data, r.basis]),
				].join(" ");
				expect(all).not.toMatch(/[{}]|\[[^\]]*\](?!\()/);
			}
		});
	}
});
