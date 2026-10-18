import { afterAll, beforeEach, describe, expect, it } from "bun:test";
import { POST } from "@/pages/api/contact";
import { mailState, resetMailMocks, sentMails } from "../../helpers/mocks";

const ORIGIN = "http://localhost:4321";
const realFetch = globalThis.fetch;

let captcha: Record<string, unknown> | "throw" = { success: true, action: "contact", score: 0.9 };
let ipCounter = 0;

const validBody = () => ({
	name: "Oleksii Kovalenko",
	jobTitle: "Chief Engineer",
	company: "Farmak",
	phone: "+380501234567",
	email: "o.kovalenko@farmak.ua",
	sector: "Pharmaceutical",
	equipment: ["checkweigher"],
	message: "Need a quote.",
	website: "",
	recaptchaToken: "token",
	loadedAt: Date.now() - 5000,
});

interface CallOptions {
	origin?: string | null;
	body?: unknown;
	rawBody?: string;
	headers?: Record<string, string>;
	ip?: string;
}

// Each call gets a fresh IP unless one is given, so the in-memory rate limiter never interferes
async function call({ origin = ORIGIN, body, rawBody, headers = {}, ip }: CallOptions = {}) {
	const request = new Request(`${ORIGIN}/api/contact`, {
		method: "POST",
		headers: { "content-type": "application/json", ...(origin ? { origin } : {}), ...headers },
		body: rawBody ?? JSON.stringify(body ?? validBody()),
	});
	const response = await POST({ request, clientAddress: ip ?? `10.0.0.${++ipCounter}` } as any);
	return { status: response.status, json: (await response.json()) as Record<string, any> };
}

beforeEach(() => {
	resetMailMocks();
	captcha = { success: true, action: "contact", score: 0.9 };
	globalThis.fetch = (async () => {
		if (captcha === "throw") throw new Error("network");
		return new Response(JSON.stringify(captcha));
	}) as unknown as typeof fetch;
});

afterAll(() => {
	globalThis.fetch = realFetch;
});

describe("POST /api/contact — request checks", () => {
	it("rejects a request without an Origin header", async () => {
		const res = await call({ origin: null });
		expect(res.status).toBe(403);
		expect(res.json.error).toBe("forbidden");
	});

	it("rejects a foreign Origin", async () => {
		const res = await call({ origin: "https://evil.example" });
		expect(res.status).toBe(403);
	});

	it("accepts the public SITE_URL origin (reverse proxy case)", async () => {
		const res = await call({ origin: "https://ocs.test" });
		expect(res.status).toBe(200);
	});

	it("rejects an oversized body by Content-Length", async () => {
		const res = await call({ headers: { "content-length": "99999" } });
		expect(res.status).toBe(413);
		expect(res.json.error).toBe("payload_too_large");
	});

	it("rejects invalid JSON", async () => {
		const res = await call({ rawBody: "{not json" });
		expect(res.status).toBe(400);
		expect(res.json.error).toBe("invalid_json");
	});

	it("rejects a payload with wrong field types", async () => {
		const res = await call({ body: { ...validBody(), equipment: "checkweigher" } });
		expect(res.status).toBe(400);
		expect(res.json.error).toBe("invalid_payload");
	});

	it("rejects a payload with a missing field", async () => {
		const { name: _name, ...rest } = validBody();
		const res = await call({ body: rest });
		expect(res.status).toBe(400);
		expect(res.json.error).toBe("invalid_payload");
	});
});

describe("POST /api/contact — anti-abuse", () => {
	it("fakes success for a filled honeypot without sending mail", async () => {
		const res = await call({ body: { ...validBody(), website: "http://spam.example" } });
		expect(res.status).toBe(200);
		expect(res.json.ok).toBe(true);
		expect(sentMails).toHaveLength(0);
	});

	it("fakes success for submission faster than 3 seconds (time-trap)", async () => {
		const res = await call({ body: { ...validBody(), loadedAt: Date.now() - 500 } });
		expect(res.status).toBe(200);
		expect(res.json.ok).toBe(true);
		expect(sentMails).toHaveLength(0);
	});

	it("fakes success for disposable email addresses", async () => {
		const res = await call({ body: { ...validBody(), email: "bot@mailinator.com" } });
		expect(res.status).toBe(200);
		expect(res.json.ok).toBe(true);
		expect(sentMails).toHaveLength(0);
	});

	it("fakes success for messages with excessive links", async () => {
		const res = await call({
			body: { ...validBody(), message: "Visit https://1.com https://2.com https://3.com" },
		});
		expect(res.status).toBe(200);
		expect(res.json.ok).toBe(true);
		expect(sentMails).toHaveLength(0);
	});

	it("fakes success for messages with spam keywords", async () => {
		const res = await call({
			body: { ...validBody(), message: "Buy casino crypto backlinks now" },
		});
		expect(res.status).toBe(200);
		expect(res.json.ok).toBe(true);
		expect(sentMails).toHaveLength(0);
	});

	it("uses X-Forwarded-For IP for rate limiting behind reverse proxy", async () => {
		const proxyIp = "198.51.100.99";
		for (let i = 0; i < 5; i++) {
			const res = await call({
				headers: { "x-forwarded-for": `${proxyIp}, 10.0.0.1` },
				ip: "127.0.0.1",
			});
			expect(res.status).toBe(200);
		}
		const res = await call({
			headers: { "x-forwarded-for": `${proxyIp}, 10.0.0.1` },
			ip: "127.0.0.1",
		});
		expect(res.status).toBe(429);
		expect(res.json.error).toBe("rate_limited");
	});

	it("rate limits the sixth request from the same IP", async () => {
		const ip = "203.0.113.7";
		for (let i = 0; i < 5; i++) {
			expect((await call({ ip })).status).toBe(200);
		}
		const res = await call({ ip });
		expect(res.status).toBe(429);
		expect(res.json.error).toBe("rate_limited");
	});

	it("does not rate limit different IPs against each other", async () => {
		expect((await call({ ip: "203.0.113.20" })).status).toBe(200);
		expect((await call({ ip: "203.0.113.21" })).status).toBe(200);
	});
});

describe("POST /api/contact — reCAPTCHA", () => {
	it("requires a token", async () => {
		const res = await call({ body: { ...validBody(), recaptchaToken: "" } });
		expect(res.status).toBe(400);
		expect(res.json.error).toBe("recaptcha_missing");
	});

	it("rejects a low score", async () => {
		captcha = { success: true, action: "contact", score: 0.1 };
		const res = await call();
		expect(res.status).toBe(400);
		expect(res.json.error).toBe("recaptcha_failed");
	});

	it("rejects a token issued for another action", async () => {
		captcha = { success: true, action: "login", score: 0.9 };
		const res = await call();
		expect(res.json.error).toBe("recaptcha_failed");
	});

	it("rejects when Google reports failure", async () => {
		captcha = { success: false };
		const res = await call();
		expect(res.json.error).toBe("recaptcha_failed");
	});

	it("returns 502 when Google is unreachable", async () => {
		captcha = "throw";
		const res = await call();
		expect(res.status).toBe(502);
		expect(res.json.error).toBe("recaptcha_unavailable");
	});
});

describe("POST /api/contact — validation and sending", () => {
	it("returns 422 with per-field codes for invalid data", async () => {
		const res = await call({ body: { ...validBody(), email: "not-an-email", name: " " } });
		expect(res.status).toBe(422);
		expect(res.json.error).toBe("validation_failed");
		expect(res.json.fields.email).toBe("invalid_format");
		expect(res.json.fields.name).toBe("required");
		expect(sentMails).toHaveLength(0);
	});

	it("returns 502 when the SMTP server fails", async () => {
		mailState.fail = true;
		const res = await call();
		expect(res.status).toBe(502);
		expect(res.json.error).toBe("smtp_error");
	});

	it("sends one email to the configured recipient on success", async () => {
		const res = await call();
		expect(res.status).toBe(200);
		expect(res.json.ok).toBe(true);
		expect(sentMails).toHaveLength(1);
		expect(sentMails[0]).toMatchObject({
			from: "noreply@ocs.test",
			to: "info@ocs.test",
			replyTo: "o.kovalenko@farmak.ua",
		});
	});
});
