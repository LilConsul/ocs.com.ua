import { defineConfig, devices } from "@playwright/test";

const PORT = 4322;
// Set to run the checks against an already deployed site instead of a local preview server
const REMOTE_URL = process.env.E2E_BASE_URL;

// End-to-end checks run against the production build (`bun run build` first) or, with
// E2E_BASE_URL set, against a deployed site. Files are named *.e2e.ts so `bun test`, which
// matches *.test.ts and *.spec.ts, never picks them up.
export default defineConfig({
	testDir: "./tests/e2e",
	testMatch: "**/*.e2e.ts",
	fullyParallel: true,
	retries: 0,
	reporter: "list",
	use: { baseURL: REMOTE_URL ?? `http://localhost:${PORT}` },
	projects: [
		{ name: "chromium", use: { ...devices["Desktop Chrome"] } },
		{ name: "firefox", use: { ...devices["Desktop Firefox"] } },
		{ name: "webkit", use: { ...devices["Desktop Safari"] } },
	],
	webServer: REMOTE_URL
		? undefined
		: {
				command: `bunx astro preview --port ${PORT}`,
				url: `http://localhost:${PORT}/ua`,
				reuseExistingServer: true,
				timeout: 60_000,
			},
});
