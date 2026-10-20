import { describe, expect, it } from "bun:test";
import {
	type ContactFormData,
	stripHeaderChars,
	validateContactForm,
} from "@/lib/contact/validate";

describe("stripHeaderChars", () => {
	it("strips CR characters", () => {
		expect(stripHeaderChars("hello\rworld")).toBe("helloworld");
	});
	it("strips LF characters", () => {
		expect(stripHeaderChars("hello\nworld")).toBe("helloworld");
	});
	it("passes clean strings unchanged", () => {
		expect(stripHeaderChars("hello world")).toBe("hello world");
	});
});

const validForm: ContactFormData = {
	name: "Oleksii Kovalenko",
	jobTitle: "Chief Engineer",
	company: "Farmak",
	phone: "+380501234567",
	email: "o.kovalenko@farmak.ua",
	sector: "Food Industry",
	equipment: ["checkweigher"],
	message: "We need a checkweigher for our new line.",
	website: "",
};

describe("validateContactForm", () => {
	it("accepts a valid form", () => {
		const result = validateContactForm(validForm);
		expect(result.ok).toBe(true);
	});

	it("rejects missing name", () => {
		const result = validateContactForm({ ...validForm, name: "" });
		expect(result.ok).toBe(false);
		expect(result.errors?.name).toBeDefined();
	});

	it("rejects missing jobTitle", () => {
		const result = validateContactForm({ ...validForm, jobTitle: "" });
		expect(result.ok).toBe(false);
		expect(result.errors?.jobTitle).toBeDefined();
	});

	it("rejects missing company", () => {
		const result = validateContactForm({ ...validForm, company: "" });
		expect(result.ok).toBe(false);
		expect(result.errors?.company).toBeDefined();
	});

	it("rejects missing phone", () => {
		const result = validateContactForm({ ...validForm, phone: "" });
		expect(result.ok).toBe(false);
		expect(result.errors?.phone).toBeDefined();
	});

	it("rejects missing email", () => {
		const result = validateContactForm({ ...validForm, email: "" });
		expect(result.ok).toBe(false);
		expect(result.errors?.email).toBeDefined();
	});

	it("rejects invalid email format", () => {
		const result = validateContactForm({ ...validForm, email: "notanemail" });
		expect(result.ok).toBe(false);
		expect(result.errors?.email).toBeDefined();
	});

	it.each([
		"a@b",
		"a@b.",
		"a@.com",
		"a b@c.com",
		"a@@b.com",
		"a..b@c.com",
		".a@c.com",
		"a@c.c",
		"a@-c.com",
	])("rejects malformed email %p", (email) => {
		const result = validateContactForm({ ...validForm, email });
		expect(result.errors?.email).toBe("invalid_format");
	});

	it("rejects an email longer than 254 characters", () => {
		const email = `${"a".repeat(250)}@b.com`;
		const result = validateContactForm({ ...validForm, email });
		expect(result.errors?.email).toBe("invalid_format");
	});

	it.each(["o.kovalenko+sales@farmak.com.ua", "ceo@factory.ua", "a_b-c@sub.domain.co"])(
		"accepts valid email %p",
		(email) => {
			expect(validateContactForm({ ...validForm, email }).ok).toBe(true);
		}
	);

	it.each([
		"+380501234567",
		"+38 (050) 123-45-67",
		"050 123 45 67",
		"0442345678",
		"+1 202.555.0143",
	])("accepts valid phone %p", (phone) => {
		expect(validateContactForm({ ...validForm, phone }).ok).toBe(true);
	});

	it.each([
		"abc",
		"12345",
		"+38050abc4567",
		"050-123-45-67 ext 5",
		"1234567890123456",
		"++380501234567",
		"380+501234567",
	])("rejects invalid phone %p", (phone) => {
		const result = validateContactForm({ ...validForm, phone });
		expect(result.errors?.phone).toBe("invalid_phone");
	});

	it("accepts free-mail domain (client only shows a soft note)", () => {
		const result = validateContactForm({ ...validForm, email: "user@gmail.com" });
		expect(result.ok).toBe(true);
	});

	it("rejects invalid sector", () => {
		const result = validateContactForm({ ...validForm, sector: "Unknown" });
		expect(result.ok).toBe(false);
		expect(result.errors?.sector).toBeDefined();
	});

	it("rejects invalid equipment slug", () => {
		const result = validateContactForm({ ...validForm, equipment: ["invalid-slug"] });
		expect(result.ok).toBe(false);
		expect(result.errors?.equipment).toBeDefined();
	});

	it("accepts empty equipment array (optional)", () => {
		const result = validateContactForm({ ...validForm, equipment: [] });
		expect(result.ok).toBe(true);
	});

	it("rejects missing message", () => {
		const result = validateContactForm({ ...validForm, message: "" });
		expect(result.ok).toBe(false);
		expect(result.errors?.message).toBeDefined();
	});

	it("rejects name exceeding 200 chars", () => {
		const result = validateContactForm({ ...validForm, name: "a".repeat(201) });
		expect(result.ok).toBe(false);
		expect(result.errors?.name).toBeDefined();
	});

	it("rejects message exceeding 5000 chars", () => {
		const result = validateContactForm({ ...validForm, message: "a".repeat(5001) });
		expect(result.ok).toBe(false);
		expect(result.errors?.message).toBeDefined();
	});
});
