import { describe, expect, it } from "bun:test";
import { fromJS } from "immutable";
import { requiredTitlesListener } from "@/cms/required-titles";

const run = (collection: string, data: unknown, i18n: unknown) => {
	const entry = fromJS({ collection, data, i18n });
	return (requiredTitlesListener.handler as any)({ entry });
};

describe("requiredTitlesListener", () => {
	it("passes when every locale has a title", () => {
		const out = run(
			"equipment",
			{ title: "Кетчвейєр" },
			{ en: { data: { title: "Catchweigher" } } }
		);
		expect(out).toBeUndefined();
	});

	it("rejects an empty EN title (the locale tab that was never opened)", () => {
		expect(() =>
			run("equipment", { title: "Кетчвейєр" }, { en: { data: { file_name: "hc-ml" } } })
		).toThrow(/Title for: EN/);
	});

	it("rejects a whitespace-only title", () => {
		expect(() =>
			run("equipment", { title: "Кетчвейєр" }, { en: { data: { title: "   " } } })
		).toThrow(/EN/);
	});

	it("rejects a missing UA title", () => {
		expect(() =>
			run("equipment", { title: "" }, { en: { data: { title: "Catchweigher" } } })
		).toThrow(/UA/);
	});

	it("rejects when the EN locale has no data at all", () => {
		expect(() => run("wiki", { title: "Стаття" }, undefined)).toThrow(/EN/);
	});

	it("applies to wiki too", () => {
		expect(() => run("wiki", { title: "Стаття" }, { en: { data: { title: "" } } })).toThrow(/EN/);
	});

	it("ignores other collections", () => {
		expect(run("site-data", {}, undefined)).toBeUndefined();
	});
});
