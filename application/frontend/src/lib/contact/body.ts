export class BodyTooLargeError extends Error {}

/**
 * Reads a request body as JSON while enforcing a byte limit on the real bytes received.
 * The Content-Length header can be missing or wrong (chunked transfer), so it is not trusted.
 */
export async function readLimitedJson(request: Request, limit: number): Promise<unknown> {
	if (!request.body) throw new SyntaxError("empty body");

	const reader = request.body.getReader();
	const chunks: Uint8Array[] = [];
	let received = 0;
	for (;;) {
		const { done, value } = await reader.read();
		if (done) break;
		received += value.byteLength;
		if (received > limit) {
			await reader.cancel();
			throw new BodyTooLargeError();
		}
		chunks.push(value);
	}

	const bytes = new Uint8Array(received);
	let offset = 0;
	for (const chunk of chunks) {
		bytes.set(chunk, offset);
		offset += chunk.byteLength;
	}
	return JSON.parse(new TextDecoder().decode(bytes));
}
