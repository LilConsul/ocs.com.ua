/** @type {import('tailwindcss').Config} */
export default {
	content: ["./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}"],
	theme: {
		extend: {
			colors: {
				// ocs.com.ua Brand Colors
				"ocs-primary": "#c71978", // Main brand pink/magenta
				"ocs-secondary": "#555555", // Text gray
				"ocs-accent": "#66afe9", // Blue accent (from focus states)
				"ocs-light": "#eeeeee", // Light gray background
				"ocs-border": "#ccc", // Border color
				"ocs-placeholder": "#999", // Placeholder text
				"ocs-white": "#fff", // White
				"ocs-black": "#000", // Black
			},
			fontFamily: {
				sans: ["Roboto", "Helvetica", "Arial", "sans-serif"],
			},
			typography: (theme) => ({
				DEFAULT: {
					css: {
						color: theme("colors.ocs-secondary"),
						a: {
							color: theme("colors.ocs-primary"),
							"&:hover": {
								color: theme("colors.ocs-accent"),
							},
						},
						h1: {
							color: theme("colors.ocs-primary"),
						},
						h2: {
							color: theme("colors.ocs-primary"),
						},
						h3: {
							color: theme("colors.ocs-primary"),
						},
						strong: {
							color: theme("colors.ocs-primary"),
							fontWeight: "900",
						},
					},
				},
			}),
		},
	},
	plugins: [require("@tailwindcss/typography")],
};
