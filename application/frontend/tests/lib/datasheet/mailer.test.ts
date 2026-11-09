import { beforeEach, describe, expect, it } from "bun:test";
import {
	buildDatasheetEmailBody,
	type DatasheetDownload,
	sendDatasheetEmail,
} from "@/lib/datasheet/mailer";
import { resetMailMocks, sentMails } from "../../helpers/mocks";

const lead = {
	name: "Oleksii Kovalenko",
	jobTitle: "Chief Engineer",
	company: "Farmak",
	phone: "+380501234567",
	email: "o.kovalenko@farmak.ua",
	sector: "Food Industry",
};

const download: DatasheetDownload = {
	title: "HC-M Checkweigher",
	category: "checkweigher",
	file: "hc-m.pdf",
	pageUrl: "https://ocs.test/en/catalogue/equipment/checkweigher/hc-m",
	lang: "en",
	ip: "203.0.113.5",
	at: new Date("2026-11-06T19:20:30Z"),
};

const config = {
	host: "smtp.ocs.test",
	port: 587,
	secure: false,
	to: "info@ocs.test",
	from: "noreply@ocs.test",
	siteUrl: "https://ocs.test",
};

beforeEach(resetMailMocks);

describe("buildDatasheetEmailBody", () => {
	it("lists the lead and the download in the text body", () => {
		const { text } = buildDatasheetEmailBody(lead, download, "https://ocs.test");
		for (const part of [
			"Oleksii Kovalenko",
			"Farmak",
			"o.kovalenko@farmak.ua",
			"HC-M Checkweigher",
			"checkweigher",
			"hc-m.pdf",
			"https://ocs.test/en/catalogue/equipment/checkweigher/hc-m",
			"2026-11-06 19:20:30 UTC",
			"203.0.113.5",
			"ocs.test",
		]) {
			expect(text).toContain(part);
		}
	});

	it("translates the sector into Ukrainian", () => {
		const { text } = buildDatasheetEmailBody(lead, download, "https://ocs.test");
		expect(text).not.toContain("Food Industry");
	});

	it("HTML-escapes user supplied values", () => {
		const { html } = buildDatasheetEmailBody(
			{ ...lead, company: "<script>alert(1)</script>" },
			download,
			"https://ocs.test"
		);
		expect(html).not.toContain("<script>");
		expect(html).toContain("&lt;script&gt;");
	});
});

describe("sendDatasheetEmail", () => {
	it("sends one email to the team with the visitor as reply-to", async () => {
		await sendDatasheetEmail(lead, download, config);
		expect(sentMails).toHaveLength(1);
		expect(sentMails[0]).toMatchObject({
			from: "noreply@ocs.test",
			to: "info@ocs.test",
			replyTo: "o.kovalenko@farmak.ua",
		});
		expect(sentMails[0].subject).toContain("HC-M Checkweigher");
		expect(sentMails[0].subject).toContain("Farmak");
	});

	it("strips line breaks from the subject", async () => {
		await sendDatasheetEmail({ ...lead, company: "Farmak\r\nBcc: evil@x.com" }, download, config);
		expect(String(sentMails[0].subject)).not.toMatch(/[\r\n]/);
	});
});
