import { describe, expect, it } from "bun:test";
import { ui } from "@/i18n/ui";

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
