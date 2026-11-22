import { describe, expect, it } from "bun:test";
import { BodyTooLargeError, readLimitedJson } from "@/lib/contact/body";

function chunkedRequest(chunks: string[]): Request {
	const encoder = new TextEncoder();
	const stream = new ReadableStream<Uint8Array>({
		start(controller) {
			for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
			controller.close();
		},
	});
	return new Request("http://localhost:4321", {
		method: "POST",
		body: stream,
		duplex: "half",
	} as RequestInit);
}

describe("readLimitedJson", () => {
	it("parses a body within the limit", async () => {
		const req = chunkedRequest(['{"a":', "1}"]);
		expect(await readLimitedJson(req, 100)).toEqual({ a: 1 });
	});

	it("rejects a chunked body over the limit even without Content-Length", async () => {
		const req = chunkedRequest(["x".repeat(60), "x".repeat(60)]);
		await expect(readLimitedJson(req, 100)).rejects.toBeInstanceOf(BodyTooLargeError);
	});

	it("throws a SyntaxError for invalid JSON", async () => {
		const req = chunkedRequest(["{not json"]);
		await expect(readLimitedJson(req, 100)).rejects.toBeInstanceOf(SyntaxError);
	});
});
