// @ts-check

import react from "@astrojs/react";
import { defineConfig } from "astro/config";

// https://astro.build/config
export default defineConfig({
	integrations: [
		react({
			include: ["**/react/*", "**/components/**/*.tsx", "**/components/**/*.jsx"],
		}),
	],
});
