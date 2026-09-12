import { defineConfig } from "tinacms";

// Your hosting provider likely exposes this as an environment variable
const branch =
	process.env.GITHUB_BRANCH || process.env.VERCEL_GIT_COMMIT_REF || process.env.HEAD || "main";

export default defineConfig({
	branch,

	// Get this from tina.io
	clientId: process.env.NEXT_PUBLIC_TINA_CLIENT_ID,
	// Get this from tina.io
	token: process.env.TINA_TOKEN,

	build: {
		outputFolder: "admin",
		publicFolder: "public",
	},
	// Uncomment to allow cross-origin requests from non-localhost origins
	// during local development (e.g. GitHub Codespaces, Gitpod, Docker).
	// Use 'private' to allow all private-network IPs (WSL2, Docker, etc.)
	// server: {
	//   allowedOrigins: ['https://your-codespace.github.dev'],
	// },
	media: {
		tina: {
			mediaRoot: "assets",
			publicFolder: "public",
		},
	},
	// See docs on content modeling for more info on how to setup new content models: https://tina.io/docs/r/content-modelling-collections/
	schema: {
		collections: [
			{
				name: "post",
				label: "Posts",
				path: "content/posts",
				fields: [
					{
						type: "string",
						name: "eyebrow",
						label: "Eyebrow",
					},
					{
						type: "string",
						name: "title",
						label: "Headline",
						isTitle: true,
						required: true,
					},
					{
						type: "rich-text",
						name: "body",
						label: "Tagline",
						isBody: true,
					},
					{
						type: "object",
						name: "ctaPrimary",
						label: "Primary button",
						fields: [
							{ type: "string", name: "label", label: "Label" },
							{ type: "string", name: "href", label: "Link" },
						],
					},
					{
						type: "object",
						name: "ctaSecondary",
						label: "Secondary button",
						fields: [
							{ type: "string", name: "label", label: "Label" },
							{ type: "string", name: "href", label: "Link" },
						],
					},
				],
				ui: {
					// Opens the /tinacms-demo page for visual editing. Change or remove to fit your site.
					router: () => "/tinacms-demo",
				},
			},
			// TEST: Multilingual Equipment Collection (Option A File Structure)
			{
				name: "equipment",
				label: "Equipment Catalogue",
				path: "src/content/equipment",
				format: "md",
				ui: {
					allowedActions: {
						create: true,
						delete: true,
					},
					filename: {
						readonly: false,
						slugify: (values) => {
							// Generate filename from English title
							// "HC-M Checkweigher" → "hc-m-checkweigher"
							const title = values?.title?.en || "untitled";
							return title
								.toLowerCase()
								.replace(/\s+/g, "-")
								.replace(/[^a-z0-9-]/g, "");
						},
					},
				},
				fields: [
					// ========================================
					// MULTILINGUAL FIELDS
					// ========================================
					{
						type: "object",
						name: "title",
						label: "Title (Multilingual)",
						required: true,
						fields: [
							{
								type: "string",
								name: "en",
								label: "🇬🇧 English",
								required: true,
							},
							{
								type: "string",
								name: "ua",
								label: "🇺🇦 Ukrainian",
								required: true,
							},
						],
					},
					{
						type: "object",
						name: "description",
						label: "Short Description (Multilingual)",
						required: true,
						fields: [
							{
								type: "string",
								name: "en",
								label: "🇬🇧 English",
								required: true,
								ui: { component: "textarea" },
							},
							{
								type: "string",
								name: "ua",
								label: "🇺🇦 Ukrainian",
								required: true,
								ui: { component: "textarea" },
							},
						],
					},

					// ========================================
					// SHARED FIELDS (language-independent)
					// ========================================
					{
						type: "image",
						name: "gallery",
						label: "Images (First image is hero)",
						list: true,
						required: true,
						description:
							"Product photos (1-10 images). First image will be used as the hero image.",
					},
					{
						type: "image",
						name: "datasheet",
						label: "Datasheet PDF",
						description: "Upload technical datasheet PDF (will be saved automatically)",
					},

					// ========================================
					// SPECIFICATIONS (multilingual labels)
					// ========================================
					{
						type: "object",
						name: "specs",
						label: "Specifications (Max 3)",
						list: true,
						description: "Maximum 3 specifications shown on catalogue cards",
						ui: {
							itemProps: (item) => ({
								label: item?.label?.en || "New Specification",
							}),
						},
						fields: [
							{
								type: "object",
								name: "label",
								label: "Label (Multilingual)",
								required: true,
								fields: [
									{
										type: "string",
										name: "en",
										label: "🇬🇧 English",
										required: true,
									},
									{
										type: "string",
										name: "ua",
										label: "🇺🇦 Ukrainian",
										required: true,
									},
								],
							},
							{
								type: "string",
								name: "value",
								label: "Value",
								required: true,
								description: "Usually language-independent (e.g., '250 pcs/min')",
							},
						],
					},

					// ========================================
					// BODY CONTENT (separate fields per language)
					// ========================================
					{
						type: "rich-text",
						name: "bodyEn",
						label: "Technical Documentation (🇬🇧 English)",
						description: "Detailed technical information, features, specifications",
					},
					{
						type: "rich-text",
						name: "bodyUa",
						label: "Technical Documentation (🇺🇦 Ukrainian)",
						description: "Детальна технічна інформація, характеристики, специфікації",
					},
				],
			},
		],
	},
});
