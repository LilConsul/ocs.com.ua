import nodemailer from "nodemailer";
import { type ContactFormData, stripHeaderChars } from "./validate";

export function htmlEscape(str: string): string {
	return str
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#039;");
}

export function buildEmailBody(data: ContactFormData): { text: string; html: string } {
	const text = [
		`Name: ${data.name}`,
		`Job Title: ${data.jobTitle}`,
		`Company: ${data.company}`,
		`Phone: ${data.phone}`,
		`Email: ${data.email}`,
		`Sector: ${data.sector}`,
		`Equipment: ${data.equipment.join(", ") || "(none)"}`,
		``,
		`Message:`,
		data.message,
	].join("\n");

	const field = (label: string, value: string) =>
		`<tr><td style="padding:4px 12px 4px 0;font-weight:600;white-space:nowrap;vertical-align:top">${label}</td><td style="padding:4px 0">${htmlEscape(value)}</td></tr>`;

	const html = `<!doctype html><html><body style="font-family:sans-serif;font-size:14px;color:#111">
<h2 style="margin:0 0 16px">New Contact Form Submission</h2>
<table style="border-collapse:collapse">
${field("Name", data.name)}
${field("Job Title", data.jobTitle)}
${field("Company", data.company)}
${field("Phone", data.phone)}
${field("Email", data.email)}
${field("Sector", data.sector)}
${field("Equipment", data.equipment.join(", ") || "(none)")}
</table>
<h3 style="margin:20px 0 8px">Message</h3>
<pre style="background:#f5f5f5;padding:12px;border-radius:4px;white-space:pre-wrap">${htmlEscape(data.message)}</pre>
</body></html>`;

	return { text, html };
}

export interface MailerConfig {
	host: string;
	port: number;
	secure: boolean;
	user?: string;
	pass?: string;
	to: string;
	from: string;
}

export async function sendContactEmail(data: ContactFormData, config: MailerConfig): Promise<void> {
	const transport = nodemailer.createTransport({
		host: config.host,
		port: config.port,
		secure: config.secure,
		...(config.user && config.pass ? { auth: { user: config.user, pass: config.pass } } : {}),
	});

	const { text, html } = buildEmailBody(data);

	await transport.sendMail({
		from: config.from,
		to: config.to,
		replyTo: stripHeaderChars(data.email),
		subject: stripHeaderChars(`Contact inquiry from ${data.company} — ${data.name}`),
		text,
		html,
	});
}
