import type { ContactFormData } from "./validate";

const DISPOSABLE_DOMAINS = new Set([
	"mailinator.com",
	"temp-mail.org",
	"10minutemail.com",
	"guerrillamail.com",
	"trashmail.com",
	"yopmail.com",
	"tempmail.com",
	"tempmail.net",
	"sharklasers.com",
	"dispostable.com",
	"getairmail.com",
	"throwawaymail.com",
	"fakeinbox.com",
	"burnermail.io",
	"crazymailing.com",
	"mytemp.email",
	"tempail.com",
]);

const SPAM_KEYWORDS_REGEX =
	/(?:(?<![\p{L}\p{N}])(?:crypto(?:currency)?|casino|viagra|cialis|backlinks|seo ranking|guest post|poker|betting|gambling|roulette|jackpot|ranking on google|domain authority|increase traffic|search engine optimization|казино|ігрові автомати|слоти|ставки на спорт|букмекер|рулетка|джекпот|криптовалют|біткоїн|пасивний дохід|заробіток в інтернеті|швидкий заробіток|прогон по базах|посилання для сайту|просування сайту|купити посилання|розкрутка сайту|накрутка|віагра|сіаліс|дропшипінг|онлайн позика|кредит онлайн|гроші до зарплати)(?![\p{L}\p{N}])|whatsapp\s*:\s*\+\d|telegram\s*:\s*@|\.xyz\b|\.top\b|\.ru\b|\.buzz\b|\.click\b)/iu;

const URL_REGEX = /(?:https?:\/\/|www\.)[^\s/$.?#].[^\s]*/gi;

/**
 * Extracts real client IP when behind a reverse proxy (Virtualmin / Apache / Nginx).
 */
export function getClientIp(request: Request, clientAddress?: string): string {
	const forwarded = request.headers.get("x-forwarded-for");
	if (forwarded) {
		const firstIp = forwarded.split(",")[0]?.trim();
		if (firstIp) return firstIp;
	}
	return clientAddress ?? "unknown";
}

/**
 * Time-trap verification: checks if the form was submitted too fast (automated bot)
 * or if the timestamp is stale (> 24 hours).
 */
export function isFastSubmission(
	loadedAt?: number | string,
	minTimeMs = 3000,
	maxTimeMs = 86_400_000,
	now = Date.now()
): boolean {
	if (loadedAt === undefined || loadedAt === null || loadedAt === "") return true;
	const timestamp = typeof loadedAt === "string" ? Number(loadedAt) : loadedAt;
	if (Number.isNaN(timestamp) || !Number.isFinite(timestamp)) return true;

	const elapsed = now - timestamp;
	// Reject if submitted faster than minTimeMs, or if timestamp is in the future, or older than maxTimeMs
	if (elapsed < minTimeMs || elapsed > maxTimeMs) {
		return true;
	}
	return false;
}

/**
 * Checks if the email domain belongs to a known temporary/disposable email provider.
 */
export function isDisposableEmail(email: string): boolean {
	const domain = email.split("@")[1]?.trim().toLowerCase();
	if (!domain) return false;
	return DISPOSABLE_DOMAINS.has(domain);
}

/**
 * Detects messages containing more than a reasonable threshold of links.
 */
export function hasExcessiveLinks(text: string, maxLinks = 2): boolean {
	const matches = text.match(URL_REGEX);
	return (matches?.length ?? 0) > maxLinks;
}

/**
 * Checks for common automated spam keywords and advertising phrases.
 */
export function hasSpamKeywords(text: string): boolean {
	return SPAM_KEYWORDS_REGEX.test(text);
}

/**
 * Unified spam assessment: checks honeypot, time-trap, disposable email, links, and keywords.
 */
export function isSpamSubmission(
	data: ContactFormData & { loadedAt?: number | string }
): boolean {
	if (data.website && data.website.trim() !== "") {
		return true;
	}
	if (isFastSubmission(data.loadedAt)) {
		return true;
	}
	if (isDisposableEmail(data.email)) {
		return true;
	}
	if (hasExcessiveLinks(data.message)) {
		return true;
	}
	if (hasSpamKeywords(data.message) || hasSpamKeywords(data.name) || hasSpamKeywords(data.company)) {
		return true;
	}
	return false;
}
