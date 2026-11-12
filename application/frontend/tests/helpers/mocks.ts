import { mock } from "bun:test";
import type { ImageMetadata } from "astro";
import { createImageResolver } from "../../src/lib/image-resolver";

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
	DATASHEET_TOKEN_SECRET: "test-datasheet-secret-0123456789abcdef",
	RECAPTCHA_SECRET_KEY: "test-secret",
	SITE_URL: "https://ocs.test",
	SMTP_HOST: "smtp.ocs.test",
	SMTP_PASS: "test-pass",
	SMTP_PORT: 587,
	SMTP_SECURE: false,
	SMTP_USER: "test-user",
}));

// Product entries the datasheet API looks up. IDs follow Astro's slugging: "<category>/<slug><lang>".
export const equipmentEntries: {
	id: string;
	data: { title: string; datasheet?: string | null };
}[] = [
	{ id: "checkweigher/hc-men", data: { title: "HC-M", datasheet: "/datasheets/hc-m.pdf" } },
	{ id: "checkweigher/hc-mua", data: { title: "HC-M UA", datasheet: "/datasheets/hc-m.pdf" } },
	{ id: "checkweigher/nodsen", data: { title: "No datasheet", datasheet: null } },
	{ id: "checkweigher/ghosten", data: { title: "Ghost", datasheet: "/datasheets/ghost.pdf" } },
	{ id: "checkweigher/_indexen", data: { title: "Checkweighers" } },
];

// Bun has no import.meta.glob, so the src/assets glob is replaced by a fixed set of files
const image = (src: string): ImageMetadata => ({ src, width: 800, height: 600, format: "webp" });
export const imageFixtures: Record<string, ImageMetadata> = {
	"/src/assets/equipment/hc-a/a.webp": image("/_astro/a.hash.webp"),
	"/src/assets/partners/p.webp": image("/_astro/p.hash.webp"),
	"/src/assets/hero/main_page.webp": image("/_astro/main_page.hash.webp"),
};

mock.module("@/lib/images", () => createImageResolver(imageFixtures));

// content.config.ts only needs defineCollection to hand back its config
mock.module("astro:content", () => ({
	defineCollection: (config: unknown) => config,
	getCollection: async () => equipmentEntries,
}));

// Bun has no astro:assets; a fake getImage returns the URL shape the build produces
mock.module("astro:assets", () => ({
	getImage: async (options: { src: ImageMetadata; width?: number; format?: string }) => {
		const name = options.src.src.split("/").pop()?.split(".")[0] ?? "image";
		const format = options.format ?? options.src.format;
		return { src: `/_astro/${name}.w${options.width}.${format}`, options };
	},
}));
