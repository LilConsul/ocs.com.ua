// @ts-check

import { cpSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import node from "@astrojs/node";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig, envField } from "astro/config";
import { loadEnv } from "vite";
import { seoIntegration, sitemapLastmod } from "./scripts/seo-build.mjs";

// Astro reads .env files only after this config is evaluated, so load them here for `site`.
// Real environment variables (CI) still take precedence over the files.
const { SITE_URL, LLMS_INDEXING, INDEXNOW_KEY } = loadEnv(
	process.env.NODE_ENV || "production",
	process.cwd(),
	""
);
// Same rule as the astro:env schema below: on unless set to "false"
const indexing = LLMS_INDEXING?.trim().toLowerCase() !== "false";
const lastmod = sitemapLastmod(fileURLToPath(new URL(".", import.meta.url)));

// The datasheet PDFs are not part of public/, so Astro does not emit them. Copy them next to
// dist/client (not into it) so Apache never serves them; the Node server reads them from there.
/** @type {import("astro").AstroIntegration} */
const copyDatasheets = {
	name: "copy-datasheets",
	hooks: {
		"astro:build:done": ({ dir }) => {
			const from = fileURLToPath(new URL("private/datasheets", import.meta.url));
			if (!existsSync(from)) return;
			cpSync(from, fileURLToPath(new URL("../private/datasheets/", dir)), { recursive: true });
		},
	},
};

// https://astro.build/config
export default defineConfig({
	site: SITE_URL || "https://ocs.com.ua",
	output: "static",
	adapter: node({ mode: "standalone" }),
	prefetch: { prefetchAll: true, defaultStrategy: "hover" },
	integrations: [
		sitemap({
			// Keep the CMS, the error pages, the "/" redirect to /ua and the old catalogue
			// redirect stubs (anything under /catalogue/ except equipment/ and industry/) out
			filter: (page) => {
				const path = new URL(page).pathname;
				if (/^\/((admin|404|50x)\/?)?$/.test(path)) return false;
				return !/^\/(en|ua)\/catalogue\/(?!equipment\/|industry\/)/.test(path);
			},
			// Emits <xhtml:link hreflang> alternates, matching the <link rel="alternate"> tags
			i18n: { defaultLocale: "ua", locales: { ua: "uk", en: "en" } },
			// <lastmod> from the git history of the page's content and data files
			serialize: (item) => {
				const date = lastmod(item.url);
				return date ? { ...item, lastmod: date } : item;
			},
		}),
		copyDatasheets,
		seoIntegration({ indexing, indexNowKey: INDEXNOW_KEY?.trim() || undefined }),
	],
	vite: {
		plugins: [
			tailwindcss(),
			{
				name: "bundle-ssr-deps",
				apply: "build",
				config: () => ({ ssr: { noExternal: true, external: ["sharp"] } }),
			},
		],
		build: {
			// The /admin Decap CMS bundle is a single ~5 MB chunk; public pages stay small
			chunkSizeWarningLimit: 6000,
			// Decap's deps (js-sha256, gray-matter, @iarna/toml) use direct eval, and react-toastify
			// and jotai ship "use client" directives that are meaningless in a plain client bundle.
			// Neither is our code.
			rolldownOptions: { checks: { eval: false, moduleLevelDirective: false } },
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

			// === Site-wide ===

			// Show the "website in active development" banner above the header (build-time; hidden by default)
			SITE_DEV_NOTICE: envField.boolean({ context: "server", access: "public", default: false }),
			// Let search engines and AI crawlers index the site (build-time). Off on the dev site, so
			// dev.ocs.com.ua never competes with ocs.com.ua: robots.txt blocks all, pages get noindex.
			LLMS_INDEXING: envField.boolean({ context: "server", access: "public", default: true }),
			// IndexNow key (8-128 of a-z, A-Z, 0-9, "-"). When set, the build writes /<key>.txt so
			// application/infra/scripts/indexnow.py can tell Bing and Yandex about changed pages.
			INDEXNOW_KEY: envField.string({ context: "server", access: "public", optional: true }),

			// === About page ===

			// Show per-client equipment counts on the client cards (build-time; hidden by default)
			SHOW_CLIENT_EQUIPMENT: envField.boolean({
				context: "server",
				access: "public",
				default: false,
			}),

			// === Contact form ===

			// SMTP connection (no auth required for a local relay; user/pass optional)
			SMTP_HOST: envField.string({ context: "server", access: "secret" }),
			SMTP_PORT: envField.number({ context: "server", access: "secret", default: 587 }),
			SMTP_SECURE: envField.boolean({ context: "server", access: "secret", default: false }),
			SMTP_USER: envField.string({ context: "server", access: "secret", optional: true }),
			SMTP_PASS: envField.string({ context: "server", access: "secret", optional: true }),
			// Recipient for contact form submissions (default: production inbox)
			CONTACT_TO: envField.string({
				context: "server",
				access: "public",
				default: "info@ocs.com.ua",
			}),
			// Sender address created on the mail server
			CONTACT_FROM: envField.string({
				context: "server",
				access: "public",
				default: "noreply@ocs.com.ua",
			}),
			// reCAPTCHA v3 (client public key inlined at build time). Optional so the site still
			// starts without it; the form then can't pass the server-side reCAPTCHA check.
			RECAPTCHA_SITE_KEY: envField.string({
				context: "client",
				access: "public",
				optional: true,
			}),
			// reCAPTCHA v3 (server secret — never sent to browser)
			RECAPTCHA_SECRET_KEY: envField.string({ context: "server", access: "secret" }),

			// === Datasheet downloads ===

			// Signs the short-lived download links (server secret, at least 32 characters)
			DATASHEET_TOKEN_SECRET: envField.string({ context: "server", access: "secret", min: 32 }),
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
