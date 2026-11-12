import { describe, expect, test } from "bun:test";
import { fillTokens, getPrivacyPolicy } from "@/lib/privacy/policy";

describe("fillTokens", () => {
	test("replaces every email and address token", () => {
		const out = fillTokens("{email} / {email} / {address}", "a@b.ua", "Kyiv");
		expect(out).toBe("[a@b.ua](mailto:a@b.ua) / [a@b.ua](mailto:a@b.ua) / Kyiv");
	});
});

describe("getPrivacyPolicy", () => {
	for (const lang of ["en", "ua"] as const) {
		test(`${lang}: every section has a title and content, and no token or bracket is left`, () => {
			const policy = getPrivacyPolicy(lang);
			expect(policy.sections.length).toBeGreaterThan(0);
			for (const s of policy.sections) {
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
