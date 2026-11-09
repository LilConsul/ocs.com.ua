import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { resolveDatasheet } from "@/lib/datasheet/files";
import { signToken, TOKEN_TTL_SECONDS } from "@/lib/datasheet/token";
import { GET } from "@/pages/api/datasheet";

const SECRET = "test-datasheet-secret-0123456789abcdef";

async function get(token?: string) {
	const url = `http://localhost:4321/api/datasheet${token === undefined ? "" : `?token=${token}`}`;
	return GET({ request: new Request(url) } as any);
}

describe("GET /api/datasheet", () => {
	it("serves the PDF as an attachment for a valid token", async () => {
		const res = await get(signToken("hc-m.pdf", SECRET));
		expect(res.status).toBe(200);
		expect(res.headers.get("content-type")).toBe("application/pdf");
		expect(res.headers.get("content-disposition")).toBe('attachment; filename="hc-m.pdf"');
		expect(res.headers.get("cache-control")).toBe("private, no-store");
		// Compare with the file on disk (the committed hc-m.pdf is a placeholder, not a real PDF)
		const served = Buffer.from(await res.arrayBuffer());
		const onDisk = readFileSync(resolveDatasheet("/datasheets/hc-m.pdf") ?? "");
		expect(served.length).toBeGreaterThan(0);
		expect(served.equals(onDisk)).toBe(true);
	});

	it("rejects a missing token", async () => {
		expect((await get()).status).toBe(403);
		expect((await get("")).status).toBe(403);
	});

	it("rejects a tampered token", async () => {
		const token = signToken("hc-m.pdf", SECRET);
		expect((await get(`${token}x`)).status).toBe(403);
	});

	it("rejects a token signed with another secret", async () => {
		expect((await get(signToken("hc-m.pdf", "another-secret-0123456789abcdefgh"))).status).toBe(
			403
		);
	});

	it("rejects an expired token", async () => {
		const old = Date.now() - (TOKEN_TTL_SECONDS + 60) * 1000;
		expect((await get(signToken("hc-m.pdf", SECRET, old))).status).toBe(403);
	});

	it("returns 404 when the file is gone", async () => {
		expect((await get(signToken("ghost.pdf", SECRET))).status).toBe(404);
	});

	it("never leaves the datasheet folder, even for a signed path", async () => {
		expect((await get(signToken("../package.json", SECRET))).status).toBe(404);
		expect((await get(signToken("..\\package.json", SECRET))).status).toBe(404);
	});
});
