// In-memory rate limiter for a single Node process.
// If the app is ever scaled out to multiple processes, replace this map
// with a shared Redis store using the same interface.

interface RateLimiterOptions {
	max: number; // max requests per window
	windowMs: number; // window duration in milliseconds
}

interface Entry {
	count: number;
	resetAt: number;
}

export interface RateLimiter {
	check(ip: string): boolean; // returns true if allowed, false if blocked
}

export function createRateLimiter({ max, windowMs }: RateLimiterOptions): RateLimiter {
	const store = new Map<string, Entry>();

	// Evict entries whose window has expired to prevent unbounded Map growth
	// under a flood of unique IPs. Runs once per window duration.
	const evict = () => {
		const now = Date.now();
		for (const [ip, entry] of store) {
			if (now >= entry.resetAt) store.delete(ip);
		}
	};
	const evictTimer = setInterval(evict, windowMs);
	// Don't keep the Node process alive solely for cleanup
	if (typeof evictTimer === "object" && evictTimer !== null && "unref" in evictTimer) {
		(evictTimer as NodeJS.Timeout).unref();
	}

	return {
		check(ip: string): boolean {
			const now = Date.now();
			const entry = store.get(ip);

			if (!entry || now >= entry.resetAt) {
				store.set(ip, { count: 1, resetAt: now + windowMs });
				return true;
			}

			if (entry.count >= max) return false;

			entry.count++;
			return true;
		},
	};
}
