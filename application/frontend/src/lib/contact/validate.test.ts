import { describe, expect, it } from "bun:test";
import {
	type ContactFormData,
	isFreeMail,
	stripHeaderChars,
	validateContactForm,
} from "./validate";

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

describe("isFreeMail", () => {
	it("flags gmail.com", () => {
		expect(isFreeMail("user@gmail.com")).toBe(true);
	});
	it("flags ukr.net", () => {
		expect(isFreeMail("user@ukr.net")).toBe(true);
	});
	it("flags yahoo.com", () => {
		expect(isFreeMail("user@yahoo.com")).toBe(true);
	});
	it("flags outlook.com", () => {
		expect(isFreeMail("user@outlook.com")).toBe(true);
	});
	it("flags hotmail.com", () => {
		expect(isFreeMail("user@hotmail.com")).toBe(true);
	});
	it("flags icloud.com", () => {
		expect(isFreeMail("user@icloud.com")).toBe(true);
	});
	it("flags mail.ru", () => {
		expect(isFreeMail("user@mail.ru")).toBe(true);
	});
	it("allows corporate email", () => {
		expect(isFreeMail("ceo@factory.ua")).toBe(false);
	});
});

const validForm: ContactFormData = {
	name: "Oleksii Kovalenko",
	jobTitle: "Chief Engineer",
	company: "Farmak",
	phone: "+380501234567",
	email: "o.kovalenko@farmak.ua",
	sector: "Pharmaceutical",
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

	it("rejects free-mail domain", () => {
		const result = validateContactForm({ ...validForm, email: "user@gmail.com" });
		expect(result.ok).toBe(false);
		expect(result.errors?.email).toBeDefined();
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
