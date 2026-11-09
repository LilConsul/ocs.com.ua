import {
	clearErrors,
	clearFieldError,
	executeRecaptcha,
	type FormConfig,
	getFormData,
	loadRecaptcha,
	showFieldError,
	showStatus,
	validateField,
} from "../contact/form-script";
import { clearLead, loadLead, saveLead } from "./saved-lead";

declare global {
	interface Window {
		__datasheetConfig?: FormConfig;
	}
}

const FIELDS = ["name", "jobTitle", "company", "phone", "email", "sector"] as const;
const STATUS_ID = "datasheet-status";
const CLOSE_DELAY_MS = 2500;

// localStorage can throw just by being touched (blocked cookies), so it is read lazily
function store(): Storage | null {
	try {
		return window.localStorage;
	} catch {
		return null;
	}
}

export function initDatasheetDialog(config: FormConfig) {
	const { siteKey, messages, emailPattern, phonePattern } = config;
	const EMAIL_RE = new RegExp(emailPattern);
	const PHONE_RE = new RegExp(phonePattern);

	const dialog = document.getElementById("datasheet-dialog") as HTMLDialogElement | null;
	const form = document.getElementById("datasheet-form") as HTMLFormElement | null;
	const opener = document.getElementById("datasheet-open");
	if (!(dialog && form && opener) || form.dataset.bound === "true") return;
	form.dataset.bound = "true";

	const savedNote = document.getElementById("datasheet-saved-note");
	let openedAt = Date.now();

	// Fills the form from the details remembered on this device and shows the note about it
	function prefill() {
		const storage = store();
		const saved = storage ? loadLead(storage) : null;
		savedNote?.classList.toggle("hidden", !saved);
		if (!saved) return;
		for (const field of FIELDS) {
			const input = form?.querySelector<HTMLInputElement | HTMLSelectElement>(`#${field}`);
			if (input) input.value = saved[field];
		}
	}

	opener.addEventListener("click", () => {
		openedAt = Date.now();
		clearErrors(form);
		document.getElementById(STATUS_ID)?.classList.add("hidden");
		prefill();
		loadRecaptcha(siteKey);
		dialog.showModal();
	});

	document.getElementById("datasheet-clear-saved")?.addEventListener("click", () => {
		const storage = store();
		if (storage) clearLead(storage);
		form.reset();
		clearErrors(form);
		savedNote?.classList.add("hidden");
		form.querySelector<HTMLInputElement>("#name")?.focus();
	});

	document.getElementById("datasheet-close")?.addEventListener("click", () => dialog.close());
	// The dialog has no padding of its own, so a click on it is a click on the backdrop
	dialog.addEventListener("click", (e) => {
		if (e.target === dialog) dialog.close();
	});

	for (const fieldId of FIELDS) {
		form.querySelector(`#${fieldId}`)?.addEventListener("blur", () => {
			const code = validateField(fieldId, getFormData(form), EMAIL_RE, PHONE_RE);
			if (code) {
				showFieldError(form, fieldId, messages[code] ?? messages.default);
			} else {
				clearFieldError(form, fieldId);
			}
		});
	}

	form.addEventListener("submit", async (e) => {
		e.preventDefault();
		clearErrors(form);

		const submitBtn = document.getElementById("datasheet-submit");
		const data = getFormData(form);
		const clientErrors: Record<string, string> = {};
		for (const field of FIELDS) {
			const code = validateField(field, data, EMAIL_RE, PHONE_RE);
			if (code) clientErrors[field] = code;
		}
		if (Object.keys(clientErrors).length > 0) {
			for (const [field, code] of Object.entries(clientErrors)) {
				showFieldError(form, field, messages[code] ?? messages.default);
			}
			showStatus(messages.validation_failed, true, STATUS_ID);
			return;
		}

		let recaptchaToken = "";
		if (siteKey) {
			try {
				recaptchaToken = await executeRecaptcha(siteKey, "datasheet");
			} catch {
				showStatus(messages.recaptcha_missing, true, STATUS_ID);
				return;
			}
		}

		submitBtn?.setAttribute("disabled", "true");
		try {
			const res = await fetch("/api/datasheet-request", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					name: data.name,
					jobTitle: data.jobTitle,
					company: data.company,
					phone: data.phone,
					email: data.email,
					sector: data.sector,
					website: (new FormData(form).get("website") as string) ?? "",
					loadedAt: openedAt,
					recaptchaToken,
					category: form.dataset.category ?? "",
					slug: form.dataset.slug ?? "",
					lang: form.dataset.lang ?? "",
				}),
			});
			const json = await res.json();

			if (json.ok && typeof json.url === "string") {
				showStatus(messages.success, false, STATUS_ID);
				const storage = store();
				if (storage) {
					saveLead(storage, {
						name: data.name,
						jobTitle: data.jobTitle,
						company: data.company,
						phone: data.phone,
						email: data.email,
						sector: data.sector,
					});
				}
				// The response is an attachment, so the browser downloads it and the page stays put
				window.location.assign(json.url);
				setTimeout(() => dialog.close(), CLOSE_DELAY_MS);
			} else if (json.fields) {
				for (const [field, code] of Object.entries(json.fields)) {
					showFieldError(form, field, messages[code as string] ?? messages.default);
				}
				showStatus(messages.validation_failed, true, STATUS_ID);
			} else {
				showStatus(messages[json.error] ?? messages.default, true, STATUS_ID);
			}
		} catch {
			showStatus(messages.smtp_error, true, STATUS_ID);
		} finally {
			submitBtn?.removeAttribute("disabled");
		}
	});
}
