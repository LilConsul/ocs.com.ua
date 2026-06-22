import { defineConfig } from "tinacms";

// Your hosting provider likely exposes this as an environment variable
const branch =
  process.env.GITHUB_BRANCH ||
  process.env.VERCEL_GIT_COMMIT_REF ||
  process.env.HEAD ||
  "main";

export default defineConfig({
  branch,

  // Get this from tina.io (leave empty for local mode)
  clientId: process.env.NEXT_PUBLIC_TINA_CLIENT_ID,
  // Get this from tina.io (leave empty for local mode)
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
      mediaRoot: "",
      publicFolder: "public",
    },
  },
  // See docs on content modeling for more info on how to setup new content models: https://tina.io/docs/r/content-modelling-collections/
  schema: {
    collections: [
      // Homepage Collection - Multilingual
      {
        name: "homepage",
        label: "Homepage",
        path: "src/content",
        format: "json",
        match: {
          include: "{en,ua}/homepage",
        },
        fields: [
          {
            type: "object",
            name: "hero",
            label: "Hero Section",
            fields: [
              {
                type: "object",
                list: true,
                name: "slides",
                label: "Hero Slides",
                fields: [
                  { type: "string", name: "id", label: "ID", required: true },
                  { type: "string", name: "title", label: "Title", required: true },
                  { type: "string", name: "description", label: "Description" },
                  { type: "string", name: "ctaText", label: "CTA Text" },
                  { type: "string", name: "ctaLink", label: "CTA Link" },
                  { type: "image", name: "backgroundImage", label: "Background Image" },
                  { type: "string", name: "accentColor", label: "Accent Color" },
                ],
              },
            ],
          },
          {
            type: "object",
            name: "industries",
            label: "Industries Section",
            fields: [
              { type: "string", name: "title", label: "Section Title" },
              { type: "string", name: "description", label: "Section Description" },
              {
                type: "object",
                list: true,
                name: "cards",
                label: "Industry Cards",
                fields: [
                  { type: "string", name: "id", label: "ID" },
                  { type: "string", name: "name", label: "Industry Name" },
                  { type: "string", name: "description", label: "Description" },
                  { type: "string", name: "icon", label: "Icon Name" },
                  { type: "string", name: "link", label: "Link" },
                  { type: "image", name: "image", label: "Image" },
                ],
              },
            ],
          },
          {
            type: "object",
            name: "featuredEquipment",
            label: "Featured Equipment Section",
            fields: [
              { type: "string", name: "title", label: "Section Title" },
              { type: "string", name: "description", label: "Section Description" },
              {
                type: "string",
                list: true,
                name: "equipmentIds",
                label: "Equipment IDs",
              },
            ],
          },
          {
            type: "object",
            name: "whyChooseUs",
            label: "Why Choose Us Section",
            fields: [
              { type: "string", name: "title", label: "Section Title" },
              {
                type: "object",
                list: true,
                name: "benefits",
                label: "Benefits",
                fields: [
                  { type: "string", name: "icon", label: "Icon Name" },
                  { type: "string", name: "title", label: "Benefit Title" },
                  { type: "string", name: "description", label: "Description" },
                ],
              },
            ],
          },
          {
            type: "object",
            name: "contactForm",
            label: "Contact Form Section",
            fields: [
              { type: "string", name: "title", label: "Form Title" },
              { type: "string", name: "description", label: "Form Description" },
              {
                type: "object",
                name: "fields",
                label: "Field Labels",
                fields: [
                  { type: "string", name: "name", label: "Name Field Label" },
                  { type: "string", name: "email", label: "Email Field Label" },
                  { type: "string", name: "phone", label: "Phone Field Label" },
                  { type: "string", name: "message", label: "Message Field Label" },
                ],
              },
              { type: "string", name: "submitButton", label: "Submit Button Text" },
              { type: "string", name: "successMessage", label: "Success Message" },
              { type: "string", name: "errorMessage", label: "Error Message" },
            ],
          },
        ],
        ui: {
          router: ({ document }) => {
            const locale = document._sys.filename.split('/')[0];
            return `/${locale}`;
          },
        },
      },
      // Navigation Collection - Multilingual
      {
        name: "navigation",
        label: "Navigation",
        path: "src/content",
        format: "json",
        match: {
          include: "{en,ua}/navigation",
        },
        fields: [
          {
            type: "object",
            list: true,
            name: "mainMenu",
            label: "Main Menu Items",
            fields: [
              { type: "string", name: "label", label: "Label", required: true },
              { type: "string", name: "href", label: "Link" },
              {
                type: "object",
                list: true,
                name: "submenu",
                label: "Submenu Items",
                fields: [
                  { type: "string", name: "label", label: "Label" },
                  { type: "string", name: "href", label: "Link" },
                ],
              },
            ],
          },
          {
            type: "object",
            list: true,
            name: "footerLinks",
            label: "Footer Links",
            fields: [
              { type: "string", name: "label", label: "Label" },
              { type: "string", name: "href", label: "Link" },
            ],
          },
        ],
      },
      // Site Config Collection - Multilingual
      {
        name: "siteConfig",
        label: "Site Configuration",
        path: "src/content",
        format: "json",
        match: {
          include: "{en,ua}/site-config",
        },
        fields: [
          { type: "string", name: "siteName", label: "Site Name", required: true },
          { type: "string", name: "siteUrl", label: "Site URL" },
          { type: "string", name: "description", label: "Site Description" },
          {
            type: "object",
            name: "contact",
            label: "Contact Information",
            fields: [
              { type: "string", name: "email", label: "Email" },
              { type: "string", name: "phone", label: "Phone" },
              { type: "string", name: "address", label: "Address" },
            ],
          },
          {
            type: "object",
            name: "social",
            label: "Social Media Links",
            fields: [
              { type: "string", name: "facebook", label: "Facebook" },
              { type: "string", name: "linkedin", label: "LinkedIn" },
              { type: "string", name: "twitter", label: "Twitter" },
            ],
          },
        ],
      },
      // Demo Post Collection (keep for testing)
      {
        name: "post",
        label: "Posts (Demo)",
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
          router: () => "/tinacms-demo",
        },
      },
    ],
  },
});
