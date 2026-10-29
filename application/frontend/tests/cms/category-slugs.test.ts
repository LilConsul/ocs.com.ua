import { describe, expect, it } from "bun:test";
import { fromJS } from "immutable";
import { categorySlugsListener } from "@/cms/category-slugs";

const run = (collection: string, data: unknown) => {
	const entry = fromJS({ collection, data });
	return (categorySlugsListener.handler as any)({ entry });
};

describe("categorySlugsListener", () => {
	it("generates category slugs from the EN title and mirrors them to UA", () => {
		const out = run("equipment-categories", {
			en: { categories: [{ title: "Metal Detectors" }] },
			ua: { categories: [{ title: "Металодетектори" }] },
		});
		expect(out.getIn(["en", "categories", 0, "slug"])).toBe("metal-detectors");
		expect(out.getIn(["ua", "categories", 0, "slug"])).toBe("metal-detectors");
	});

	it("generates industry slugs from the EN title and mirrors them to UA", () => {
		const out = run("equipment-categories", {
			en: { industries: [{ title: "Food & Beverage" }] },
			ua: { industries: [{ title: "Харчова промисловість" }] },
		});
		expect(out.getIn(["en", "industries", 0, "slug"])).toBe("food-beverage");
		expect(out.getIn(["ua", "industries", 0, "slug"])).toBe("food-beverage");
	});

	it("keeps an existing slug when the title changes", () => {
		const out = run("equipment-categories", {
			en: { industries: [{ title: "Renamed", slug: "cosmetics" }] },
			ua: { industries: [{ title: "Перейменовано" }] },
		});
		expect(out.getIn(["en", "industries", 0, "slug"])).toBe("cosmetics");
		expect(out.getIn(["ua", "industries", 0, "slug"])).toBe("cosmetics");
	});

	it("ignores other collections", () => {
		expect(run("equipment", { en: { industries: [{ title: "X" }] } })).toBeUndefined();
	});
});
