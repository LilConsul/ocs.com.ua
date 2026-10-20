import nodemailer from "nodemailer";
import equipmentTypes from "../../data/equipment-types.json";
import { getInlineTranslations } from "../../i18n/inline";
import { render } from "./template";
import CONTACT_HTML_TEMPLATE from "./templates/contact.html?raw";
import CONTACT_TEXT_TEMPLATE from "./templates/contact.txt?raw";
import { type ContactFormData, stripHeaderChars } from "./validate";

export function htmlEscape(str: string): string {
	return str
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#039;");
}

// Notification emails go to the Ukrainian-speaking sales team, so they are always in Ukrainian.
const t = getInlineTranslations("ua");

const equipmentLabels: Record<string, string> = {
	...Object.fromEntries(equipmentTypes.ua.categories.map((c) => [c.slug, c.title])),
	// Same combined option the web form offers for both dynamic weighing categories
	checkweigher: t("Checkweighers & Catchweighers"),
};

export function extractSiteHost(siteUrl?: string): string {
	const raw = (siteUrl ?? "").trim();
	if (!raw) return "ocs.com.ua";
	try {
		const withProtocol = /^[a-zA-Z][a-zA-Z\d+\-.]*:\/\//.test(raw) ? raw : `https://${raw}`;
		return new URL(withProtocol).host || raw;
	} catch {
		return raw || "ocs.com.ua";
	}
}

export function buildEmailBody(
	data: ContactFormData,
	siteUrl: string
): { text: string; html: string } {
	const vars = {
		site: extractSiteHost(siteUrl),
		name: data.name,
		jobTitle: data.jobTitle,
		company: data.company,
		phone: data.phone,
		email: data.email,
		sector: t(data.sector),
		equipment:
			data.equipment.map((slug) => equipmentLabels[slug] ?? slug).join(", ") || "не вказано",
		message: data.message,
	};

	return {
		text: render(CONTACT_TEXT_TEMPLATE, vars),
		html: render(CONTACT_HTML_TEMPLATE, vars, htmlEscape),
	};
}

export interface MailerConfig {
	host: string;
	port: number;
	secure: boolean;
	user?: string;
	pass?: string;
	to: string;
	from: string;
	siteUrl: string;
}

export async function sendContactEmail(data: ContactFormData, config: MailerConfig): Promise<void> {
	const transport = nodemailer.createTransport({
		host: config.host,
		port: config.port,
		secure: config.secure,
		...(config.user && config.pass ? { auth: { user: config.user, pass: config.pass } } : {}),
	});

	const { text, html } = buildEmailBody(data, config.siteUrl);

	await transport.sendMail({
		from: config.from,
		to: config.to,
		replyTo: stripHeaderChars(data.email),
		subject: stripHeaderChars(`Запит із сайту від ${data.company} — ${data.name}`),
		text,
		html,
	});
}
