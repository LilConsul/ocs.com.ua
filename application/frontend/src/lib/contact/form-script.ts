export interface FormConfig {
	siteKey: string;
	messages: Record<string, string>;
	emailPattern: string;
	phonePattern: string;
}

// Personal-mail domains — shows a soft note, never blocks submission
const FREE_MAIL = new Set([
	"gmail.com",
	"yahoo.com",
	"hotmail.com",
	"outlook.com",
	"icloud.com",
	"ukr.net",
	"mail.ru",
	"yandex.ru",
	"yandex.ua",
	"rambler.ru",
	"meta.ua",
	"i.ua",
	"inbox.ru",
	"me.com",
	"mac.com",
	"msn.com",
	"live.com",
	"yahoo.co.uk",
	"hotmail.co.uk",
]);

function clearErrors(form: HTMLFormElement) {
	form.querySelectorAll("[data-field-error]").forEach((el) => {
		(el as HTMLElement).textContent = "";
		el.classList.add("hidden");
	});
	form.querySelectorAll("[aria-invalid]").forEach((el) => {
		el.removeAttribute("aria-invalid");
	});
}

function showFieldError(form: HTMLFormElement, fieldId: string, message: string) {
	const errorEl = form.querySelector(`[data-field-error="${fieldId}"]`);
	const inputEl = form.querySelector(`#${fieldId}`);
	if (errorEl) {
		(errorEl as HTMLElement).textContent = message;
		errorEl.classList.remove("hidden");
	}
	if (inputEl) inputEl.setAttribute("aria-invalid", "true");
}

function clearFieldError(form: HTMLFormElement, fieldId: string) {
	const errorEl = form.querySelector(`[data-field-error="${fieldId}"]`);
	const inputEl = form.querySelector(`#${fieldId}`);
	if (errorEl) {
		(errorEl as HTMLElement).textContent = "";
		errorEl.classList.add("hidden");
	}
	if (inputEl) inputEl.removeAttribute("aria-invalid");
}

function showStatus(message: string, isError: boolean) {
	const statusEl = document.getElementById("form-status");
	if (!statusEl) return;
	statusEl.textContent = message;
	statusEl.classList.remove(
		"hidden",
		"bg-destructive/10",
		"text-destructive",
		"bg-green-50",
		"text-green-800",
	);
	statusEl.classList.add(
		isError ? "bg-destructive/10" : "bg-green-50",
		isError ? "text-destructive" : "text-green-800",
	);
}

function updateEmailNote(form: HTMLFormElement) {
	const input = form.querySelector<HTMLInputElement>("#email");
	const note = document.getElementById("email-note");
	if (!input || !note) return;
	const domain = input.value.split("@")[1]?.trim().toLowerCase();
	note.classList.toggle("hidden", !(domain && FREE_MAIL.has(domain)));
}

function getFormData(form: HTMLFormElement) {
	const fd = new FormData(form);
	return {
		name: (fd.get("name") as string) ?? "",
		jobTitle: (fd.get("jobTitle") as string) ?? "",
		company: (fd.get("company") as string) ?? "",
		phone: (fd.get("phone") as string) ?? "",
		email: (fd.get("email") as string) ?? "",
		sector: (fd.get("sector") as string) ?? "",
		message: (fd.get("message") as string) ?? "",
	};
}

type FormData = ReturnType<typeof getFormData>;

function validateField(fieldId: string, data: FormData, EMAIL_RE: RegExp, PHONE_RE: RegExp): string | null {
	switch (fieldId) {
		case "name":
			if (!data.name.trim()) return "required";
			if (data.name.length > 200) return "too_long";
			return null;
		case "jobTitle":
			if (!data.jobTitle.trim()) return "required";
			if (data.jobTitle.length > 200) return "too_long";
			return null;
		case "company":
			if (!data.company.trim()) return "required";
			if (data.company.length > 200) return "too_long";
			return null;
		case "phone":
			if (!data.phone.trim()) return "required";
			if (data.phone.length > 30) return "too_long";
			if (!PHONE_RE.test(data.phone.trim())) return "invalid_phone";
			return null;
		case "email":
			if (!data.email.trim()) return "required";
			if (!EMAIL_RE.test(data.email)) return "invalid_format";
			return null;
		case "sector":
			if (!data.sector) return "required";
			return null;
		case "message":
			if (!data.message.trim()) return "required";
			if (data.message.length > 5000) return "too_long";
			return null;
		default:
			return null;
	}
}

function validateAll(data: FormData, EMAIL_RE: RegExp, PHONE_RE: RegExp): Record<string, string> {
	const fields = ["name", "jobTitle", "company", "phone", "email", "sector", "message"] as const;
	const errors: Record<string, string> = {};
	for (const field of fields) {
		const code = validateField(field, data, EMAIL_RE, PHONE_RE);
		if (code) errors[field] = code;
	}
	return errors;
}

export function initContactForm(config: FormConfig) {
	const { siteKey, messages, emailPattern, phonePattern } = config;
	const EMAIL_RE = new RegExp(emailPattern);
	const PHONE_RE = new RegExp(phonePattern);

	let recaptchaLoaded = false;

	function loadRecaptcha() {
		if (recaptchaLoaded || !siteKey) return;
		recaptchaLoaded = true;
		const script = document.createElement("script");
		script.src = `https://www.google.com/recaptcha/api.js?render=${siteKey}`;
		script.async = true;
		document.head.appendChild(script);
	}

	function setup() {
		const form = document.getElementById("contact-form") as HTMLFormElement | null;
		if (!form || form.dataset.bound === "true") return;
		form.dataset.bound = "true";
		const formLoadedAt = Date.now();

		form.querySelector("#email")?.addEventListener("input", () => updateEmailNote(form));

		// Per-field blur validation
		["name", "jobTitle", "company", "phone", "email", "sector", "message"].forEach((fieldId) => {
			form.querySelector(`#${fieldId}`)?.addEventListener("blur", () => {
				const data = getFormData(form);
				const code = validateField(fieldId, data, EMAIL_RE, PHONE_RE);
				if (code) {
					showFieldError(form, fieldId, messages[code] ?? messages.default);
				} else {
					clearFieldError(form, fieldId);
				}
			});
		});

		// Lazy-load reCAPTCHA on first field focus
		form.querySelectorAll("input, select, textarea").forEach((el) => {
			el.addEventListener("focus", loadRecaptcha, { once: true });
		});

		form.addEventListener("submit", async (e) => {
			e.preventDefault();
			clearErrors(form);

			const submitBtn = document.getElementById("form-submit");
			const fd = new FormData(form);
			const data = {
				...getFormData(form),
				equipment: fd.getAll("equipment") as string[],
				website: (fd.get("website") as string) ?? "",
				loadedAt: formLoadedAt,
			};

			const clientErrors = validateAll(data, EMAIL_RE, PHONE_RE);
			if (Object.keys(clientErrors).length > 0) {
				Object.entries(clientErrors).forEach(([field, code]) => {
					showFieldError(form, field, messages[code] ?? messages.default);
				});
				showStatus(messages.validation_failed, true);
				return;
			}

			let recaptchaToken = "";
			if (siteKey) {
				loadRecaptcha();
				try {
					recaptchaToken = await new Promise<string>((resolve, reject) => {
						const started = Date.now();
						const wait = () => {
							if (typeof (window as any).grecaptcha !== "undefined") {
								(window as any).grecaptcha.ready(() => {
									(window as any).grecaptcha
										.execute(siteKey, { action: "contact" })
										.then(resolve, reject);
								});
							} else if (Date.now() - started > 5000) {
								reject(new Error("reCAPTCHA failed to load"));
							} else {
								setTimeout(wait, 100);
							}
						};
						wait();
					});
				} catch {
					showStatus(messages.recaptcha_missing, true);
					return;
				}
			}

			submitBtn?.setAttribute("disabled", "true");

			try {
				const res = await fetch("/api/contact", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ ...data, recaptchaToken }),
				});
				const json = await res.json();

				if (json.ok) {
					showStatus(messages.success, false);
					form.reset();
					updateEmailNote(form);
				} else if (json.fields) {
					Object.entries(json.fields).forEach(([field, code]) => {
						showFieldError(form, field, messages[(code as string)] ?? messages.default);
					});
					showStatus(messages.validation_failed, true);
				} else {
					showStatus(messages[json.error] ?? messages.default, true);
				}
			} catch {
				showStatus(messages.smtp_error, true);
			} finally {
				submitBtn?.removeAttribute("disabled");
			}
		});
	}

	setup();
	document.addEventListener("astro:page-load", setup);
}
