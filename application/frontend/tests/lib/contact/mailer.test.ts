import { describe, expect, it } from "bun:test";
import { buildEmailBody, htmlEscape } from "@/lib/contact/mailer";
import type { ContactFormData } from "@/lib/contact/validate";

const SITE_URL = "https://ocs.com.ua";

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
		const { text } = buildEmailBody(testData, SITE_URL);
		expect(text).toContain("Oleksii Kovalenko");
	});

	it("includes the submitter email in the plain text body", () => {
		const { text } = buildEmailBody(testData, SITE_URL);
		expect(text).toContain("o.kovalenko@farmak.ua");
	});

	it("HTML-escapes message in the html body", () => {
		const { html } = buildEmailBody(testData, SITE_URL);
		expect(html).not.toContain("<script>");
		expect(html).toContain("&lt;script&gt;");
	});

	it("renders equipment as Ukrainian labels, not slugs", () => {
		const { html, text } = buildEmailBody(testData, SITE_URL);
		for (const body of [html, text]) {
			expect(body).toContain("Контрольні ваги та кетчвейєри");
			expect(body).toContain(
				"Track & Trace — серіалізація та агрегація".replace("&", body === html ? "&amp;" : "&")
			);
			expect(body).not.toContain("track-and-trace");
		}
	});

	it("translates the sector to Ukrainian", () => {
		const { html, text } = buildEmailBody(testData, SITE_URL);
		expect(html).toContain("Фармацевтична промисловість");
		expect(text).toContain("Фармацевтична промисловість");
	});

	it("uses Ukrainian labels and document language", () => {
		const { html, text } = buildEmailBody(testData, SITE_URL);
		expect(html).toContain('lang="uk"');
		expect(html).toContain("Нове звернення з сайту");
		expect(text).toContain("Ім'я:");
		expect(text).toContain("Повідомлення:");
	});

	it("shows a Ukrainian placeholder when no equipment is selected", () => {
		const { text } = buildEmailBody({ ...testData, equipment: [] }, SITE_URL);
		expect(text).toContain("не вказано");
	});

	it("takes the site hostname from the provided URL", () => {
		const { html } = buildEmailBody(testData, "https://staging.example.com/");
		expect(html).toContain("Сайт staging.example.com");
		expect(html).not.toContain("ocs.com.ua");
	});

	it("returns both text and html keys", () => {
		const result = buildEmailBody(testData, SITE_URL);
		expect(result).toHaveProperty("text");
		expect(result).toHaveProperty("html");
	});
});
