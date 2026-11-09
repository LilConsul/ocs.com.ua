import { createHmac, timingSafeEqual } from "node:crypto";

// Long enough to start (or retry) a download, short enough that a leaked link is useless
export const TOKEN_TTL_SECONDS = 300;

const encode = (value: Buffer | string) => Buffer.from(value).toString("base64url");

function mac(body: string, secret: string): Buffer {
	return createHmac("sha256", secret).update(body).digest();
}

/** `<base64url payload>.<base64url HMAC>`; the payload holds the file name and the expiry. */
export function signToken(file: string, secret: string, nowMs = Date.now()): string {
	const exp = Math.floor(nowMs / 1000) + TOKEN_TTL_SECONDS;
	const body = encode(JSON.stringify({ f: file, exp }));
	return `${body}.${encode(mac(body, secret))}`;
}

/** Returns the file name when the token is genuine and not expired, otherwise null. */
export function verifyToken(token: string, secret: string, nowMs = Date.now()): string | null {
	const [body, signature, ...extra] = token.split(".");
	if (!(body && signature) || extra.length > 0) return null;

	const expected = mac(body, secret);
	const given = Buffer.from(signature, "base64url");
	if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;

	try {
		const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
		if (typeof payload?.f !== "string" || typeof payload?.exp !== "number") return null;
		return payload.exp * 1000 > nowMs ? payload.f : null;
	} catch {
		return null;
	}
}
