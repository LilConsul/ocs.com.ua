import { describe, expect, it } from "bun:test";
import { slugify } from "@/cms/slugify";

describe("slugify", () => {
	it("lowercases and joins words with dashes", () => {
		expect(slugify("Metal Detectors")).toBe("metal-detectors");
	});

	it("transliterates Ukrainian Cyrillic", () => {
		expect(slugify("Контрольні ваги")).toBe("kontrolni-vahy");
		expect(slugify("Щука")).toBe("shchuka");
		expect(slugify("Єдність")).toBe("yednist");
		expect(slugify("Їжак")).toBe("yizhak");
		expect(slugify("Ґанок")).toBe("ganok");
	});

	it("drops the soft sign", () => {
		expect(slugify("Кетчвейєри ь")).toBe("ketchveyyery");
	});

	it("strips diacritics", () => {
		expect(slugify("Café Zoë")).toBe("cafe-zoe");
	});

	it("collapses symbols and whitespace into a single dash", () => {
		expect(slugify("  Hello   World!! ")).toBe("hello-world");
		expect(slugify("Track & Trace")).toBe("track-trace");
	});

	it("trims leading and trailing dashes", () => {
		expect(slugify("---a---")).toBe("a");
	});

	it("returns an empty string for empty or nullish input", () => {
		expect(slugify("")).toBe("");
		expect(slugify(null)).toBe("");
		expect(slugify(undefined)).toBe("");
		expect(slugify("!!!")).toBe("");
	});

	it("coerces non-string input", () => {
		expect(slugify(123)).toBe("123");
	});
});
