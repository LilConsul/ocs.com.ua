import { describe, expect, it } from "bun:test";
import { validateField } from "@/lib/contact/form-script";
import { EMAIL_REGEX, PHONE_REGEX } from "@/lib/contact/validate";

const data = {
	name: "Oleksii",
	jobTitle: "Engineer",
	company: "Farmak",
	phone: "+380501234567",
	email: "o@farmak.ua",
	sector: "Food Industry",
	message: "",
};

const check = (field: string, patch: Partial<typeof data> = {}) =>
	validateField(field, { ...data, ...patch }, EMAIL_REGEX, PHONE_REGEX);

describe("validateField (shared client validation)", () => {
	it("accepts valid values", () => {
		for (const field of ["name", "jobTitle", "company", "phone", "email", "sector"]) {
			expect(check(field)).toBeNull();
		}
	});

	it("returns the same codes as the server", () => {
		expect(check("name", { name: " " })).toBe("required");
		expect(check("company", { company: "x".repeat(201) })).toBe("too_long");
		expect(check("phone", { phone: "abc" })).toBe("invalid_phone");
		expect(check("email", { email: "nope" })).toBe("invalid_format");
		expect(check("sector", { sector: "" })).toBe("required");
	});

	it("ignores unknown fields", () => {
		expect(check("website")).toBeNull();
	});
});
