// @ts-check

import node from "@astrojs/node";
import react from "@astrojs/react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig, envField } from "astro/config";

// https://astro.build/config
export default defineConfig({
	output: "static",
	adapter: node({ mode: "standalone" }),
	integrations: [react()],
	vite: {
		plugins: [tailwindcss()],
		build: {
			// The /admin Decap CMS bundle is a single ~5 MB chunk; public pages stay small
			chunkSizeWarningLimit: 6000,
			// Direct eval lives in Decap's deps (js-sha256, gray-matter, @iarna/toml), not our code
			rolldownOptions: { checks: { eval: false } },
		},
	},
	// Typed, validated environment (read from .env / .env.local / process env).
	env: {
		schema: {
			// === DecapCMS ===

			// GitHub OAuth app (Decap CMS login)
			GITHUB_CLIENT_ID: envField.string({ context: "server", access: "secret" }),
			GITHUB_CLIENT_SECRET: envField.string({ context: "server", access: "secret" }),
			// Repository Decap CMS reads from and commits to
			GITHUB_OWNER: envField.string({ context: "server", access: "public", default: "LilConsul" }),
			GITHUB_REPO: envField.string({ context: "server", access: "public", default: "ocs.com.ua" }),
			GITHUB_BRANCH: envField.string({ context: "server", access: "public", default: "main" }),
			// Public site URL used for "View live" links in the CMS
			SITE_URL: envField.string({
				context: "server",
				access: "public",
				url: true,
				default: "https://ocs.com.ua",
			}),
			// Host serving /api/auth; falls back to the origin the admin is opened on
			CMS_BASE_URL: envField.string({
				context: "server",
				access: "public",
				url: true,
				optional: true,
			}),
			// Decap UI language
			CMS_LOCALE: envField.enum({
				context: "server",
				access: "public",
				values: ["en", "ua"],
				default: "en",
			}),
			// Decap entry search; off by default to avoid exhausting GitHub API rate limits
			CMS_SEARCH: envField.boolean({ context: "server", access: "public", default: false }),
		},
	},
	i18n: {
		defaultLocale: "ua",
		locales: ["ua", "en"],
		// "manual" disables Astro's automatic locale-prefix enforcement, which would 404 the
		// locale-less /admin page. Locale routes are the explicit src/pages/[lang] pages.
		routing: "manual",
	},
});
