import { mock } from "bun:test";

export const sentMails: Record<string, unknown>[] = [];
export const transportOptions: Record<string, unknown>[] = [];
export const mailState = { fail: false };

export function resetMailMocks() {
	sentMails.length = 0;
	transportOptions.length = 0;
	mailState.fail = false;
}

mock.module("nodemailer", () => {
	const createTransport = (options: Record<string, unknown>) => {
		transportOptions.push(options);
		return {
			sendMail: async (mail: Record<string, unknown>) => {
				if (mailState.fail) throw new Error("smtp down");
				sentMails.push(mail);
			},
		};
	};
	return { default: { createTransport }, createTransport };
});

// Values the API route reads from Astro's typed env module
mock.module("astro:env/server", () => ({
	CONTACT_FROM: "noreply@ocs.test",
	CONTACT_TO: "info@ocs.test",
	RECAPTCHA_SECRET_KEY: "test-secret",
	SITE_URL: "https://ocs.test",
	SMTP_HOST: "smtp.ocs.test",
	SMTP_PASS: "test-pass",
	SMTP_PORT: 587,
	SMTP_SECURE: false,
	SMTP_USER: "test-user",
}));

// content.config.ts only needs defineCollection to hand back its config
mock.module("astro:content", () => ({
	defineCollection: (config: unknown) => config,
}));
