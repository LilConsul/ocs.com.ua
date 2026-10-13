import { describe, expect, it } from "bun:test";
import { buildEmailBody, htmlEscape } from "./mailer";
import type { ContactFormData } from "./validate";

const testData: ContactFormData = {
	name: "Oleksii Kovalenko",
	jobTitle: "Chief Engineer",
	company: "Farmak",
	phone: "+380501234567",
	email: "o.kovalenko@farmak.ua",
	sector: "Pharmaceutical",
	equipment: ["checkweigher", "track-and-trace"],
	message: "Need a quote.\n<script>alert(1)</script>",
	website: "",
};

describe("htmlEscape", () => {
	it("escapes < and >", () => {
		expect(htmlEscape("<script>")).toBe("&lt;script&gt;");
	});
	it("escapes &", () => {
		expect(htmlEscape("a & b")).toBe("a &amp; b");
	});
	it("escapes quotes", () => {
		expect(htmlEscape('"hello"')).toBe("&quot;hello&quot;");
	});
	it("passes clean strings unchanged", () => {
		expect(htmlEscape("hello world")).toBe("hello world");
	});
});

describe("buildEmailBody", () => {
	it("includes the submitter name in the plain text body", () => {
		const { text } = buildEmailBody(testData);
		expect(text).toContain("Oleksii Kovalenko");
	});

	it("includes the submitter email in the plain text body", () => {
		const { text } = buildEmailBody(testData);
		expect(text).toContain("o.kovalenko@farmak.ua");
	});

	it("HTML-escapes message in the html body", () => {
		const { html } = buildEmailBody(testData);
		expect(html).not.toContain("<script>");
		expect(html).toContain("&lt;script&gt;");
	});

	it("includes equipment slugs in the html body", () => {
		const { html } = buildEmailBody(testData);
		expect(html).toContain("checkweigher");
		expect(html).toContain("track-and-trace");
	});

	it("returns both text and html keys", () => {
		const result = buildEmailBody(testData);
		expect(result).toHaveProperty("text");
		expect(result).toHaveProperty("html");
	});
});
