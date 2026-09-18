import { defineConfig } from "tinacms";

const branch =
	process.env.GITHUB_BRANCH || process.env.VERCEL_GIT_COMMIT_REF || process.env.HEAD || "main";

export default defineConfig({
	branch,
	clientId: process.env.NEXT_PUBLIC_TINA_CLIENT_ID,
	token: process.env.TINA_TOKEN,

	build: {
		outputFolder: "admin",
		publicFolder: "public",
	},

	media: {
		tina: {
			mediaRoot: "assets",
			publicFolder: "public",
		},
	},

	schema: {
		collections: [
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
							const title = values?.["en_title"] || "untitled";
							return title
								.toLowerCase()
								.replace(/\s+/g, "-")
								.replace(/[^a-z0-9-]/g, "");
						},
					},
				},
				fields: [
					// ========================================
					// MULTILINGUAL FIELDS (FLATTENED)
					// ========================================
					{
						type: "string",
						name: "en_title",
						nameOverride: "en-title",
						label: "[EN] Name of Equipment",
						required: true,
					},
					{
						type: "string",
						name: "ua_title",
						nameOverride: "ua-title",
						label: "[UA] Назва обладнання",
						required: true,
					},

					// ========================================
					// INDUSTRY CLASSIFICATION
					// ========================================
					{
						type: "string",
						name: "industries",
						label: "Industries",
						required: true,
						list: true,
						description: "Select one or more industries this equipment serves",
						options: [
							{ value: "food-beverage", label: "Food & Beverage" },
							{ value: "pharmaceutical", label: "Pharmaceutical" },
							{ value: "cosmetics", label: "Cosmetics" },
							{ value: "logistics", label: "Logistics & Distribution" },
							{ value: "general", label: "General / All Industries" },
						],
					},

					{
						type: "string",
						name: "en_description",
						nameOverride: "en-description",
						label: "[EN] Short Description",
						required: true,
						ui: { component: "textarea" },
					},
					{
						type: "string",
						name: "ua_description",
						nameOverride: "ua-description",
						label: "[UA] Короткий опис",
						required: true,
						ui: { component: "textarea" },
					},

					// ========================================
					// MEDIA FILES
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
						description: "Upload technical datasheet PDF",
					},

					// ========================================
					// SPECIFICATIONS (FLATTENED)
					// ========================================
					{
						type: "object",
						name: "specs",
						label: "Specifications (Max 3)",
						list: true,
						description: "Maximum 3 specifications shown on catalogue cards",
						ui: {
							itemProps: (item) => ({
								label: item?.["en_label"] || "New Specification",
							}),
						},
						fields: [
							{
								type: "string",
								name: "en_label",
								nameOverride: "en-label",
								label: "[EN] Label",
								required: true,
							},
							{
								type: "string",
								name: "ua_label",
								nameOverride: "ua-label",
								label: "[UA] Мітка",
								required: true,
							},
							{
								type: "string",
								name: "value",
								label: "Value",
								required: true,
								description: "Language-independent (e.g., '250 pcs/min', '0.1g')",
							},
						],
					},

					// ========================================
					// BODY CONTENT
					// ========================================
					{
						type: "rich-text",
						name: "en_body",
						nameOverride: "en-body",
						label: "[EN] Technical Documentation",
						description: "Detailed technical information, features, specifications",
					},
					{
						type: "rich-text",
						name: "ua_body",
						nameOverride: "ua-body",
						label: "[UA] Технічна документація",
						description: "Детальна технічна інформація, характеристики, специфікації",
					},
				],
			},
		],
	},
});
