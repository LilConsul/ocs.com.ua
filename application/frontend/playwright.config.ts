import { defineConfig, devices } from "@playwright/test";

const PORT = 4322;

// End-to-end checks run against the production build (`bun run build` first). Files are named
// *.e2e.ts so `bun test`, which matches *.test.ts and *.spec.ts, never picks them up.
export default defineConfig({
	testDir: "./e2e",
	testMatch: "**/*.e2e.ts",
	fullyParallel: true,
	retries: 0,
	reporter: "list",
	use: { baseURL: `http://localhost:${PORT}` },
	projects: [
		{ name: "chromium", use: { ...devices["Desktop Chrome"] } },
		{ name: "firefox", use: { ...devices["Desktop Firefox"] } },
		{ name: "webkit", use: { ...devices["Desktop Safari"] } },
	],
	webServer: {
		command: `bunx astro preview --port ${PORT}`,
		url: `http://localhost:${PORT}/ua`,
		reuseExistingServer: true,
		timeout: 60_000,
	},
});
