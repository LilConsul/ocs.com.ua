import {
	CONTACT_FROM,
	CONTACT_TO,
	RECAPTCHA_SECRET_KEY,
	SITE_URL,
	SMTP_HOST,
	SMTP_PASS,
	SMTP_PORT,
	SMTP_SECURE,
	SMTP_USER,
} from "astro:env/server";
import type { APIRoute } from "astro";
import { sendContactEmail } from "@/lib/contact/mailer";
import { createRateLimiter } from "@/lib/contact/rateLimit";
import { type ContactFormData, validateContactForm } from "@/lib/contact/validate";

export const prerender = false;

// Single-process in-memory rate limiter: 5 submissions per IP per 10 minutes.
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
	"message",
	"website",
] as const;

const json = (body: unknown, status = 200) =>
	new Response(JSON.stringify(body), {
		status,
		headers: { "Content-Type": "application/json" },
	});

// Rejects payloads whose fields are not the expected primitive types before validation runs
function isContactPayload(value: unknown): value is ContactFormData {
	if (typeof value !== "object" || value === null) return false;
	const record = value as Record<string, unknown>;
	return (
		STRING_FIELDS.every((key) => typeof record[key] === "string") &&
		Array.isArray(record.equipment) &&
		record.equipment.every((slug) => typeof slug === "string")
	);
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

	if (!isContactPayload(body)) {
		return json({ ok: false, error: "invalid_payload" }, 400);
	}
	const data = body;

	// 3. Honeypot: if the hidden "website" field is filled, silently fake success
	if (data.website.trim() !== "") {
		return json({ ok: true });
	}

	// 4. Rate limit
	const ip = clientAddress ?? "unknown";
	if (!rateLimiter.check(ip)) {
		return json({ ok: false, error: "rate_limited" }, 429);
	}

	// 5. reCAPTCHA v3
	const recaptchaToken = (body as unknown as { recaptchaToken?: unknown }).recaptchaToken;
	const token = typeof recaptchaToken === "string" ? recaptchaToken : "";
	if (!token) {
		if (import.meta.env.DEV) console.warn("[recaptcha] no token in request -> rejected");
		return json({ ok: false, error: "recaptcha_missing" }, 400);
	}
	if (import.meta.env.DEV)
		console.log(`[recaptcha] verifying token (${token.length} chars) with Google...`);
	try {
		const captchaRes = await fetch("https://www.google.com/recaptcha/api/siteverify", {
			method: "POST",
			headers: { "Content-Type": "application/x-www-form-urlencoded" },
			body: new URLSearchParams({
				secret: RECAPTCHA_SECRET_KEY,
				response: token,
			}),
		});
		const captchaJson = (await captchaRes.json()) as {
			success: boolean;
			action?: string;
			score?: number;
		};
		const passed =
			captchaJson.success && captchaJson.action === "contact" && (captchaJson.score ?? 0) >= 0.5;
		if (import.meta.env.DEV) {
			console.log(
				`[recaptcha] ${passed ? "PASSED" : "FAILED"} | success=${captchaJson.success} ` +
					`score=${captchaJson.score} action=${captchaJson.action} ` +
					`errors=${JSON.stringify((captchaJson as { "error-codes"?: string[] })["error-codes"] ?? [])}`
			);
		}
		if (!passed) {
			return json({ ok: false, error: "recaptcha_failed" }, 400);
		}
	} catch (err) {
		if (import.meta.env.DEV) console.error("[recaptcha] siteverify request failed:", err);
		return json({ ok: false, error: "recaptcha_unavailable" }, 502);
	}

	// 6. Validate
	const result = validateContactForm(data);
	if (!result.ok) {
		return json({ ok: false, error: "validation_failed", fields: result.errors }, 422);
	}

	// 7. Send
	try {
		await sendContactEmail(data, {
			host: SMTP_HOST,
			port: SMTP_PORT,
			secure: SMTP_SECURE,
			user: SMTP_USER,
			pass: SMTP_PASS,
			to: CONTACT_TO,
			from: CONTACT_FROM,
			siteUrl: SITE_URL,
		});
	} catch (err) {
		console.error("[contact] SMTP error:", err);
		return json({ ok: false, error: "smtp_error" }, 502);
	}

	return json({ ok: true });
};
