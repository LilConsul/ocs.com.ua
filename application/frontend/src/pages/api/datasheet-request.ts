import { getCollection } from "astro:content";
import {
	CONTACT_FROM,
	CONTACT_TO,
	DATASHEET_TOKEN_SECRET,
	RECAPTCHA_SECRET_KEY,
	SITE_URL,
	SMTP_HOST,
	SMTP_PASS,
	SMTP_PORT,
	SMTP_SECURE,
	SMTP_USER,
} from "astro:env/server";
import type { APIRoute } from "astro";
import { productUrl } from "@/lib/catalogue-urls";
import { createRateLimiter } from "@/lib/contact/rateLimit";
import { getClientIp, isSpamSubmission } from "@/lib/contact/spam";
import { type LeadFormData, validateLeadFields } from "@/lib/contact/validate";
import { getCategory, getLocale, getSlug, isProduct } from "@/lib/content-utils";
import { datasheetFileName, resolveDatasheet } from "@/lib/datasheet/files";
import { sendDatasheetEmail } from "@/lib/datasheet/mailer";
import { signToken } from "@/lib/datasheet/token";

export const prerender = false;

// Own limiter, separate from the contact form: 5 requests per IP per 10 minutes.
// Scale-out note: replace with Redis if multiple Node processes are used.
const rateLimiter = createRateLimiter({ max: 5, windowMs: 10 * 60 * 1000 });

const BODY_LIMIT = 32_768; // 32 KB

const STRING_FIELDS = [
	"name",
	"jobTitle",
	"company",
	"phone",
	"email",
	"sector",
	"website",
	"recaptchaToken",
	"category",
	"slug",
	"lang",
] as const;

const json = (body: unknown, status = 200) =>
	new Response(JSON.stringify(body), {
		status,
		headers: { "Content-Type": "application/json" },
	});

type DatasheetPayload = LeadFormData & {
	website: string;
	recaptchaToken: string;
	category: string;
	slug: string;
	lang: string;
	loadedAt?: number | string;
};

function isDatasheetPayload(value: unknown): value is DatasheetPayload {
	if (typeof value !== "object" || value === null) return false;
	const record = value as Record<string, unknown>;
	return STRING_FIELDS.every((key) => typeof record[key] === "string");
}

export const POST: APIRoute = async ({ request, clientAddress }) => {
	// 1. Origin check. Behind a reverse proxy the request URL is the internal http:// one,
	// so also accept the public SITE_URL origin.
	const reqOrigin = request.headers.get("origin");
	const allowedOrigins = [new URL(request.url).origin, new URL(SITE_URL).origin];
	if (!(reqOrigin && allowedOrigins.includes(reqOrigin))) {
		return json({ ok: false, error: "forbidden" }, 403);
	}

	// 2. Body size cap
	const contentLength = request.headers.get("content-length");
	if (contentLength && Number(contentLength) > BODY_LIMIT) {
		return json({ ok: false, error: "payload_too_large" }, 413);
	}

	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return json({ ok: false, error: "invalid_json" }, 400);
	}
	if (!isDatasheetPayload(body)) {
		return json({ ok: false, error: "invalid_payload" }, 400);
	}
	const data = body;

	// 3. Anti-spam checks. Bots get a bare success: no link, no email.
	if (isSpamSubmission({ ...data, equipment: [], message: "" })) {
		return json({ ok: true });
	}

	// 4. Rate limit (uses X-Forwarded-For client IP when behind reverse proxy)
	const ip = getClientIp(request, clientAddress);
	if (!rateLimiter.check(ip)) {
		return json({ ok: false, error: "rate_limited" }, 429);
	}

	// 5. reCAPTCHA v3
	if (!data.recaptchaToken) {
		return json({ ok: false, error: "recaptcha_missing" }, 400);
	}
	try {
		const captchaRes = await fetch("https://www.google.com/recaptcha/api/siteverify", {
			method: "POST",
			headers: { "Content-Type": "application/x-www-form-urlencoded" },
			body: new URLSearchParams({
				secret: RECAPTCHA_SECRET_KEY,
				response: data.recaptchaToken,
			}),
		});
		const captchaJson = (await captchaRes.json()) as {
			success: boolean;
			action?: string;
			score?: number;
		};
		if (
			!captchaJson.success ||
			captchaJson.action !== "datasheet" ||
			(captchaJson.score ?? 0) < 0.5
		) {
			return json({ ok: false, error: "recaptcha_failed" }, 400);
		}
	} catch {
		return json({ ok: false, error: "recaptcha_unavailable" }, 502);
	}

	// 6. Validate the lead fields
	const errors = validateLeadFields(data);
	if (Object.keys(errors).length > 0) {
		return json({ ok: false, error: "validation_failed", fields: errors }, 422);
	}

	// 7. Look the product up on the server: the client never sends a file path
	if (data.lang !== "en" && data.lang !== "ua") {
		return json({ ok: false, error: "not_found" }, 404);
	}
	const entries = await getCollection("equipment");
	const product = entries.find(
		(entry) =>
			isProduct(entry) &&
			getLocale(entry) === data.lang &&
			getCategory(entry) === data.category &&
			getSlug(entry) === data.slug
	);
	const file = datasheetFileName(product?.data.datasheet);
	if (!(product && file && resolveDatasheet(product.data.datasheet))) {
		return json({ ok: false, error: "not_found" }, 404);
	}

	// 8. Tell the team. No email, no download.
	try {
		await sendDatasheetEmail(
			data,
			{
				title: product.data.title,
				category: data.category,
				file,
				pageUrl: new URL(productUrl(data.lang, data.category, data.slug), SITE_URL).href,
				lang: data.lang,
				ip,
				at: new Date(),
			},
			{
				host: SMTP_HOST,
				port: SMTP_PORT,
				secure: SMTP_SECURE,
				user: SMTP_USER,
				pass: SMTP_PASS,
				to: CONTACT_TO,
				from: CONTACT_FROM,
				siteUrl: SITE_URL,
			}
		);
	} catch (err) {
		console.error("[datasheet] SMTP error:", err);
		return json({ ok: false, error: "smtp_error" }, 502);
	}

	// 9. Hand out the short-lived download link
	const token = signToken(file, DATASHEET_TOKEN_SECRET);
	return json({ ok: true, url: `/api/datasheet?token=${token}` });
};
