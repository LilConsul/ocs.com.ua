// @ts-check

import node from "@astrojs/node";
import react from "@astrojs/react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "astro/config";

// https://astro.build/config
export default defineConfig({
	output: "static", // Static output with server endpoints for Tina
	adapter: node({ mode: "standalone" }),
	integrations: [react()],
	vite: { plugins: [tailwindcss()] },
	i18n: {
		defaultLocale: "ua",
		locales: ["ua", "en"],
		routing: { prefixDefaultLocale: true },
	},
});
