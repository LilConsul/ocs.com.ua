import nodemailer from "nodemailer";
import { getInlineTranslations } from "../../i18n/inline";
import { extractSiteHost, htmlEscape, type MailerConfig } from "../contact/mailer";
import { render } from "../contact/template";
import { type LeadFormData, stripHeaderChars } from "../contact/validate";
import DATASHEET_HTML_TEMPLATE from "./templates/datasheet.html?raw";
import DATASHEET_TEXT_TEMPLATE from "./templates/datasheet.txt?raw";

// Like the contact email, this goes to the Ukrainian-speaking sales team
const t = getInlineTranslations("ua");

export interface DatasheetDownload {
	title: string;
	category: string;
	file: string;
	pageUrl: string;
	lang: string;
	ip: string;
	at: Date;
}

export function buildDatasheetEmailBody(
	lead: LeadFormData,
	download: DatasheetDownload,
	siteUrl: string
): { text: string; html: string } {
	const vars = {
		site: extractSiteHost(siteUrl),
		product: download.title,
		category: download.category,
		file: download.file,
		pageUrl: download.pageUrl,
		lang: download.lang,
		at: `${download.at.toISOString().slice(0, 19).replace("T", " ")} UTC`,
		ip: download.ip,
		name: lead.name,
		jobTitle: lead.jobTitle,
		company: lead.company,
		phone: lead.phone,
		email: lead.email,
		sector: t(lead.sector),
	};

	return {
		text: render(DATASHEET_TEXT_TEMPLATE, vars),
		html: render(DATASHEET_HTML_TEMPLATE, vars, htmlEscape),
	};
}

export async function sendDatasheetEmail(
	lead: LeadFormData,
	download: DatasheetDownload,
	config: MailerConfig
): Promise<void> {
	const transport = nodemailer.createTransport({
		host: config.host,
		port: config.port,
		secure: config.secure,
		...(config.user && config.pass ? { auth: { user: config.user, pass: config.pass } } : {}),
	});

	const { text, html } = buildDatasheetEmailBody(lead, download, config.siteUrl);

	await transport.sendMail({
		from: config.from,
		to: config.to,
		replyTo: stripHeaderChars(lead.email),
		subject: stripHeaderChars(`Завантаження специфікації: ${download.title} — ${lead.company}`),
		text,
		html,
	});
}
