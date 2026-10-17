import { EQUIPMENT_SLUGS, type EquipmentSlug, SECTORS, type Sector } from "./options";

export interface ContactFormData {
	name: string;
	jobTitle: string;
	company: string;
	phone: string;
	email: string;
	sector: Sector | string;
	equipment: EquipmentSlug[] | string[];
	message: string;
	website: string; // honeypot — must be empty
}

export interface ValidationResult {
	ok: boolean;
	errors?: Partial<Record<keyof Omit<ContactFormData, "website">, string>>;
}

const FREE_MAIL_DOMAINS = new Set([
	"gmail.com",
	"yahoo.com",
	"yahoo.co.uk",
	"hotmail.com",
	"hotmail.co.uk",
	"outlook.com",
	"live.com",
	"msn.com",
	"icloud.com",
	"me.com",
	"mac.com",
	"ukr.net",
	"i.ua",
	"meta.ua",
	"mail.ru",
	"yandex.ru",
	"yandex.ua",
	"rambler.ru",
	"inbox.ru",
]);

export function stripHeaderChars(value: string): string {
	return value.replace(/[\r\n]/g, "");
}

export function isFreeMail(email: string): boolean {
	const domain = email.split("@")[1]?.toLowerCase();
	return domain ? FREE_MAIL_DOMAINS.has(domain) : false;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateContactForm(data: ContactFormData): ValidationResult {
	const errors: Partial<Record<keyof Omit<ContactFormData, "website">, string>> = {};

	if (!data.name.trim()) {
		errors.name = "required";
	} else if (data.name.length > 200) {
		errors.name = "too_long";
	}

	if (!data.jobTitle.trim()) {
		errors.jobTitle = "required";
	} else if (data.jobTitle.length > 200) {
		errors.jobTitle = "too_long";
	}

	if (!data.company.trim()) {
		errors.company = "required";
	} else if (data.company.length > 200) {
		errors.company = "too_long";
	}

	if (!data.phone.trim()) {
		errors.phone = "required";
	} else if (data.phone.length > 30) {
		errors.phone = "too_long";
	}

	if (!data.email.trim()) {
		errors.email = "required";
	} else if (!EMAIL_REGEX.test(data.email)) {
		errors.email = "invalid_format";
	} else if (isFreeMail(data.email)) {
		errors.email = "free_mail";
	}

	if (!(SECTORS as readonly string[]).includes(data.sector)) {
		errors.sector = "invalid_sector";
	}

	if (data.equipment.length > 0) {
		const valid = (data.equipment as string[]).every((slug) =>
			(EQUIPMENT_SLUGS as readonly string[]).includes(slug)
		);
		if (!valid) errors.equipment = "invalid_equipment";
	}

	if (!data.message.trim()) {
		errors.message = "required";
	} else if (data.message.length > 5000) {
		errors.message = "too_long";
	}

	if (Object.keys(errors).length > 0) return { ok: false, errors };
	return { ok: true };
}
