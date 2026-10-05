// @ts-check

import node from "@astrojs/node";
import react from "@astrojs/react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "astro/config";
import tina from "@tinacms/astro/integration";

// https://astro.build/config
export default defineConfig({
	output: "server",
	adapter: node({ mode: "standalone" }),
	integrations: [react(), tina()],
	vite: { plugins: [tailwindcss()] },
	i18n: {
		defaultLocale: "ua",
		locales: ["ua", "en"],
		routing: { prefixDefaultLocale: true },
	},
});
