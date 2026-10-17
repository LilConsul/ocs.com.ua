import { describe, expect, it } from "bun:test";
import { createRateLimiter } from "./rateLimit";

describe("createRateLimiter", () => {
	it("allows the first request", () => {
		const limiter = createRateLimiter({ max: 3, windowMs: 60_000 });
		expect(limiter.check("127.0.0.1")).toBe(true);
	});

	it("allows up to max requests", () => {
		const limiter = createRateLimiter({ max: 3, windowMs: 60_000 });
		expect(limiter.check("10.0.0.1")).toBe(true);
		expect(limiter.check("10.0.0.1")).toBe(true);
		expect(limiter.check("10.0.0.1")).toBe(true);
	});

	it("blocks request above max", () => {
		const limiter = createRateLimiter({ max: 3, windowMs: 60_000 });
		limiter.check("10.0.0.2");
		limiter.check("10.0.0.2");
		limiter.check("10.0.0.2");
		expect(limiter.check("10.0.0.2")).toBe(false);
	});

	it("does not affect different IPs", () => {
		const limiter = createRateLimiter({ max: 1, windowMs: 60_000 });
		limiter.check("192.168.1.1"); // exhausts 192.168.1.1
		expect(limiter.check("192.168.1.2")).toBe(true); // different IP unaffected
	});

	it("resets after window expires", async () => {
		const limiter = createRateLimiter({ max: 1, windowMs: 10 }); // 10 ms window
		limiter.check("10.0.0.3");
		expect(limiter.check("10.0.0.3")).toBe(false); // blocked
		await new Promise((r) => setTimeout(r, 20)); // wait for window to pass
		expect(limiter.check("10.0.0.3")).toBe(true); // reset
	});
});
