import { describe, expect, it } from "bun:test";
import { render } from "./template";

describe("render", () => {
	it("substitutes variables, tolerating whitespace inside braces", () => {
		expect(render("Hi {{name}} and {{ other }}", { name: "A", other: "B" })).toBe("Hi A and B");
	});

	it("renders unknown variables as empty strings", () => {
		expect(render("[{{ missing }}]", {})).toBe("[]");
	});

	it("applies the transform function to values only", () => {
		const upper = (s: string) => s.toUpperCase();
		expect(render("<b>{{ v }}</b>", { v: "x" }, upper)).toBe("<b>X</b>");
	});

	it("does not re-expand placeholders found inside values", () => {
		expect(render("{{ a }}", { a: "{{ b }}", b: "boom" })).toBe("{{ b }}");
	});
});
