import { describe, expect, it } from "bun:test";
import { categoryUrl, industryUrl, productUrl } from "@/lib/catalogue-urls";

describe("catalogue URLs", () => {
	it("puts categories under /catalogue/equipment/", () => {
		expect(categoryUrl("en", "checkweigher")).toBe("/en/catalogue/equipment/checkweigher");
	});

	it("puts products under their category", () => {
		expect(productUrl("ua", "catchweigher", "hc-sl")).toBe(
			"/ua/catalogue/equipment/catchweigher/hc-sl"
		);
	});

	it("puts industries under /catalogue/industry/", () => {
		expect(industryUrl("ua", "food-beverage")).toBe("/ua/catalogue/industry/food-beverage");
	});
});
