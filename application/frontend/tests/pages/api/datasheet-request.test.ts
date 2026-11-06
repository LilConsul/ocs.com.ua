import { afterAll, beforeEach, describe, expect, it, spyOn } from "bun:test";
import { verifyToken } from "@/lib/datasheet/token";
import { POST } from "@/pages/api/datasheet-request";
import { mailState, resetMailMocks, sentMails } from "../../helpers/mocks";

const ORIGIN = "http://localhost:4321";
const SECRET = "test-datasheet-secret-0123456789abcdef";
const realFetch = globalThis.fetch;

let captcha: Record<string, unknown> | "throw" = {
	success: true,
	action: "datasheet",
	score: 0.9,
};
let ipCounter = 0;

const validBody = () => ({
	name: "Oleksii Kovalenko",
	jobTitle: "Chief Engineer",
	company: "Farmak",
	phone: "+380501234567",
	email: "o.kovalenko@farmak.ua",
	sector: "Food Industry",
	website: "",
	recaptchaToken: "token",
	loadedAt: Date.now() - 5000,
	category: "checkweigher",
	slug: "hc-m",
	lang: "en",
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
	const request = new Request(`${ORIGIN}/api/datasheet-request`, {
		method: "POST",
		headers: { "content-type": "application/json", ...(origin ? { origin } : {}), ...headers },
		body: rawBody ?? JSON.stringify(body ?? validBody()),
	});
	const response = await POST({ request, clientAddress: ip ?? `10.1.0.${++ipCounter}` } as any);
	return { status: response.status, json: (await response.json()) as Record<string, any> };
}

beforeEach(() => {
	resetMailMocks();
	captcha = { success: true, action: "datasheet", score: 0.9 };
	globalThis.fetch = (async () => {
		if (captcha === "throw") throw new Error("network");
		return new Response(JSON.stringify(captcha));
	}) as unknown as typeof fetch;
});

afterAll(() => {
	globalThis.fetch = realFetch;
});

describe("POST /api/datasheet-request: request checks", () => {
	it("rejects a missing or foreign Origin", async () => {
		expect((await call({ origin: null })).status).toBe(403);
		expect((await call({ origin: "https://evil.example" })).status).toBe(403);
	});

	it("accepts the public SITE_URL origin", async () => {
		expect((await call({ origin: "https://ocs.test" })).status).toBe(200);
	});

	it("rejects an oversized body, invalid JSON and wrong field types", async () => {
		expect((await call({ headers: { "content-length": "99999" } })).status).toBe(413);
		expect((await call({ rawBody: "{nope" })).json.error).toBe("invalid_json");
		const wrong = await call({ body: { ...validBody(), slug: 5 } });
		expect(wrong.status).toBe(400);
		expect(wrong.json.error).toBe("invalid_payload");
	});
});

describe("POST /api/datasheet-request: anti-abuse", () => {
	it("fakes success without a link or an email for a filled honeypot", async () => {
		const res = await call({ body: { ...validBody(), website: "http://spam.example" } });
		expect(res.status).toBe(200);
		expect(res.json).toEqual({ ok: true });
		expect(sentMails).toHaveLength(0);
	});

	it("fakes success for a submission faster than 3 seconds", async () => {
		const res = await call({ body: { ...validBody(), loadedAt: Date.now() - 500 } });
		expect(res.json).toEqual({ ok: true });
		expect(sentMails).toHaveLength(0);
	});

	it("fakes success for disposable email addresses", async () => {
		const res = await call({ body: { ...validBody(), email: "bot@mailinator.com" } });
		expect(res.json).toEqual({ ok: true });
		expect(sentMails).toHaveLength(0);
	});

	it("rate limits the sixth request from the same IP", async () => {
		const ip = "203.0.113.50";
		for (let i = 0; i < 5; i++) expect((await call({ ip })).status).toBe(200);
		const res = await call({ ip });
		expect(res.status).toBe(429);
		expect(res.json.error).toBe("rate_limited");
	});

	it("requires a reCAPTCHA token", async () => {
		const res = await call({ body: { ...validBody(), recaptchaToken: "" } });
		expect(res.status).toBe(400);
		expect(res.json.error).toBe("recaptcha_missing");
	});

	it("rejects a token issued for the contact form action", async () => {
		captcha = { success: true, action: "contact", score: 0.9 };
		expect((await call()).json.error).toBe("recaptcha_failed");
	});

	it("rejects a low score and a failed verification", async () => {
		captcha = { success: true, action: "datasheet", score: 0.1 };
		expect((await call()).json.error).toBe("recaptcha_failed");
		captcha = { success: false };
		expect((await call()).json.error).toBe("recaptcha_failed");
	});

	it("returns 502 when Google is unreachable", async () => {
		captcha = "throw";
		const res = await call();
		expect(res.status).toBe(502);
		expect(res.json.error).toBe("recaptcha_unavailable");
	});
});

describe("POST /api/datasheet-request: validation and product lookup", () => {
	it("returns 422 with per-field codes", async () => {
		const res = await call({ body: { ...validBody(), email: "bad", name: " " } });
		expect(res.status).toBe(422);
		expect(res.json.error).toBe("validation_failed");
		expect(res.json.fields).toEqual({ name: "required", email: "invalid_format" });
		expect(sentMails).toHaveLength(0);
	});

	it("returns 404 for an unknown product, language or category", async () => {
		for (const patch of [{ slug: "nope" }, { lang: "de" }, { category: "catchweigher" }]) {
			const res = await call({ body: { ...validBody(), ...patch } });
			expect(res.status).toBe(404);
			expect(res.json.error).toBe("not_found");
		}
		expect(sentMails).toHaveLength(0);
	});

	it("returns 404 for a category index entry", async () => {
		const res = await call({ body: { ...validBody(), slug: "_index" } });
		expect(res.status).toBe(404);
	});

	it("returns 404 for a product without a datasheet", async () => {
		const res = await call({ body: { ...validBody(), slug: "nods" } });
		expect(res.status).toBe(404);
	});

	it("returns 404 when the referenced PDF is missing on disk", async () => {
		const res = await call({ body: { ...validBody(), slug: "ghost" } });
		expect(res.status).toBe(404);
		expect(sentMails).toHaveLength(0);
	});
});

describe("POST /api/datasheet-request: sending", () => {
	it("returns 502 and no link when the SMTP server fails", async () => {
		mailState.fail = true;
		const consoleError = spyOn(console, "error").mockImplementation(() => undefined);
		try {
			const res = await call();
			expect(res.status).toBe(502);
			expect(res.json.error).toBe("smtp_error");
			expect(res.json.url).toBeUndefined();
			expect(consoleError).toHaveBeenCalledTimes(1);
		} finally {
			consoleError.mockRestore();
		}
	});

	it("emails the team and returns a link that verifies for the product file", async () => {
		const res = await call();
		expect(res.status).toBe(200);
		expect(res.json.ok).toBe(true);

		const url = new URL(res.json.url, ORIGIN);
		expect(url.pathname).toBe("/api/datasheet");
		expect(verifyToken(url.searchParams.get("token") ?? "", SECRET)).toBe("hc-m.pdf");

		expect(sentMails).toHaveLength(1);
		expect(sentMails[0]).toMatchObject({
			from: "noreply@ocs.test",
			to: "info@ocs.test",
			replyTo: "o.kovalenko@farmak.ua",
		});
		expect(String(sentMails[0].text)).toContain(
			"https://ocs.test/en/catalogue/equipment/checkweigher/hc-m"
		);
		expect(String(sentMails[0].text)).toContain("hc-m.pdf");
	});

	it("serves the Ukrainian entry of the same product", async () => {
		const res = await call({ body: { ...validBody(), lang: "ua" } });
		expect(res.status).toBe(200);
		expect(String(sentMails[0].text)).toContain("HC-M UA");
	});
});
