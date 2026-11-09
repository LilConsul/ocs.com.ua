import { describe, expect, it } from "bun:test";
import { signToken, TOKEN_TTL_SECONDS, verifyToken } from "@/lib/datasheet/token";

const SECRET = "unit-test-secret-0123456789abcdef";
const NOW = 1_800_000_000_000;

describe("datasheet token", () => {
	it("round-trips the file name", () => {
		const token = signToken("hc-m.pdf", SECRET, NOW);
		expect(verifyToken(token, SECRET, NOW + 1000)).toBe("hc-m.pdf");
	});

	it("is valid until just before the lifetime ends", () => {
		const token = signToken("hc-m.pdf", SECRET, NOW);
		expect(verifyToken(token, SECRET, NOW + (TOKEN_TTL_SECONDS - 1) * 1000)).toBe("hc-m.pdf");
	});

	it("expires after the lifetime", () => {
		const token = signToken("hc-m.pdf", SECRET, NOW);
		expect(verifyToken(token, SECRET, NOW + (TOKEN_TTL_SECONDS + 1) * 1000)).toBeNull();
	});

	it("rejects a different secret", () => {
		const token = signToken("hc-m.pdf", SECRET, NOW);
		expect(verifyToken(token, "another-secret-0123456789abcdefgh", NOW)).toBeNull();
	});

	it("rejects a tampered payload", () => {
		const [, mac] = signToken("hc-m.pdf", SECRET, NOW).split(".");
		const forged = Buffer.from(JSON.stringify({ f: "other.pdf", exp: NOW / 1000 + 300 })).toString(
			"base64url"
		);
		expect(verifyToken(`${forged}.${mac}`, SECRET, NOW)).toBeNull();
	});

	it("rejects a tampered signature", () => {
		const [body] = signToken("hc-m.pdf", SECRET, NOW).split(".");
		expect(verifyToken(`${body}.AAAA`, SECRET, NOW)).toBeNull();
	});

	it("rejects malformed input", () => {
		for (const bad of ["", "abc", "a.b.c", ".", "a.", ".b", "%%%.%%%"]) {
			expect(verifyToken(bad, SECRET, NOW)).toBeNull();
		}
	});
});
