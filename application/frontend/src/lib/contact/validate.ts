import { EQUIPMENT_SLUGS, type EquipmentSlug, SECTORS, type Sector } from "./options";

// Field length limits — imported by form-script.ts so both layers use the same values.
export const MAX_SHORT_FIELD_LENGTH = 200; // name, jobTitle, company
export const MAX_PHONE_LENGTH = 30;
export const MAX_MESSAGE_LENGTH = 5000;

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

export function stripHeaderChars(value: string): string {
	return value.replace(/[\r\n]/g, "");
}

// Dot-atom local part, dotted domain labels, alphabetic TLD of 2+ chars, 254 chars max.
// Exported so the browser script in ContactForm.astro validates with the same rules.
export const EMAIL_REGEX =
	/^(?=.{1,254}$)[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?\.)+[A-Za-z]{2,}$/;

// Digits plus common separators, optional leading "+", 7-15 digits in total (E.164 maximum).
export const PHONE_REGEX = /^(?=(?:\D*\d){7,15}\D*$)\+?[\d\s().-]+$/;

export function validateContactForm(data: ContactFormData): ValidationResult {
	const errors: Partial<Record<keyof Omit<ContactFormData, "website">, string>> = {};

	if (!data.name.trim()) {
		errors.name = "required";
	} else if (data.name.length > MAX_SHORT_FIELD_LENGTH) {
		errors.name = "too_long";
	}

	if (!data.jobTitle.trim()) {
		errors.jobTitle = "required";
	} else if (data.jobTitle.length > MAX_SHORT_FIELD_LENGTH) {
		errors.jobTitle = "too_long";
	}

	if (!data.company.trim()) {
		errors.company = "required";
	} else if (data.company.length > MAX_SHORT_FIELD_LENGTH) {
		errors.company = "too_long";
	}

	if (!data.phone.trim()) {
		errors.phone = "required";
	} else if (data.phone.length > MAX_PHONE_LENGTH) {
		errors.phone = "too_long";
	} else if (!PHONE_REGEX.test(data.phone.trim())) {
		errors.phone = "invalid_phone";
	}

	if (!data.email.trim()) {
		errors.email = "required";
	} else if (!EMAIL_REGEX.test(data.email)) {
		errors.email = "invalid_format";
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
	} else if (data.message.length > MAX_MESSAGE_LENGTH) {
		errors.message = "too_long";
	}

	if (Object.keys(errors).length > 0) return { ok: false, errors };
	return { ok: true };
}
