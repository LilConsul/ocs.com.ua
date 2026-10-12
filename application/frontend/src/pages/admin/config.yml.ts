import type { APIRoute } from "astro";
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";

interface EquipmentType {
	slug: string;
	title: string;
}

interface Icon {
	label: string;
	value: string;
}

function readJson<T>(relativePath: string, fallback: T): T {
	const fullPath = resolve(relativePath);
	if (!existsSync(fullPath)) return fallback;
	try {
		return JSON.parse(readFileSync(fullPath, "utf-8")) as T;
	} catch {
		return fallback;
	}
}

export const GET: APIRoute = () => {
	// Array position is the display order (drag to reorder in the CMS)
	const equipmentData = readJson<{
		en?: { categories: EquipmentType[] };
		categories?: EquipmentType[];
	}>("src/data/equipment-types.json", {});

	const categories = equipmentData.en?.categories ?? equipmentData.categories ?? [];

	const icons = readJson<Icon[]>("src/data/icons.json", []);

	const iconOptions = icons
		.map((i) => `                  - { label: "${i.label}", value: "${i.value}" }`)
		.join("\n");

	const categoryOptions = categories
		.map((c) => `          - { label: "${c.title}", value: "${c.slug}" }`)
		.join("\n");

	const config = `backend:
  name: github
  repo: LilConsul/ocs.com.ua
  branch: denys/chore/deploy
  base_url: http://localhost:4321
  auth_endpoint: /api/auth
  commit_messages:
    create: '[CMS] Create: {{collection}} "{{slug}}"'
    update: '[CMS] Update: {{collection}} "{{slug}}"'
    delete: '[CMS] Delete: {{collection}} "{{slug}}"'
    uploadMedia: '[CMS] Upload: "{{path}}"'
    deleteMedia: '[CMS] Delete: "{{path}}"'
    openAuthoring: '[CMS] {{message}}'
  squash_merges: true

  #name: test-repo

publish_mode: editorial_workflow

site_url: https://ocs.com.ua
display_url: https://ocs.com.ua

logo:
  src: /admin-logo.svg
  show_in_header: true

locale: en

# Disable search to avoid exhausting GitHub API rate limits on large collections
search: false

# Report issues to the project repo, not Decap's default
issue_reports:
  url: https://github.com/LilConsul/ocs.com.ua/issues/new

slug:
  encoding: ascii
  clean_accents: true
  sanitize_replacement: "-"

media_folder: "application/frontend/public/assets"
public_folder: "/assets"

# Convert all uploaded images to WebP, cap at 1600 px wide, strip EXIF metadata
media_processing:
  enabled: true
  format:
    enabled: true
    default: webp
  quality: 82
  strip_metadata: true
  width: 1600
  height: null

i18n:
  structure: multiple_files
  locales: [en, ua]
  default_locale: en

collections:
  # ── Equipment Categories ────────────────────────────────────────────────────
  # File collection backed by JSON. Adding an entry creates a new category that
  # auto-appears in the site sidebar and the product category dropdown.
  - name: "equipment-categories"
    label: "Equipment Categories"
    label_singular: "Equipment Category"
    description: >-
      Equipment type definitions. Each entry controls the sidebar label, icon
      and description for one category; drag entries to reorder. Adding a new entry here
      automatically populates the category dropdown in Products.
    editor:
      preview: false
    i18n:
      structure: single_file
      locales: [en, ua]
      default_locale: en
    files:
      - name: "equipment-types"
        label: "Equipment Types"
        file: "application/frontend/src/data/equipment-types.json"
        format: json
        i18n: true
        fields:
          - label: "Categories"
            name: "categories"
            widget: list
            i18n: true
            hint: "Drag entries to reorder — the order here is the order in the sidebar."
            fields:
              - label: "Slug"
                name: "slug"
                widget: "hidden"
                i18n: duplicate
                required: false
              - label: "Title"
                name: "title"
                widget: "string"
                i18n: true
                hint: "Category name displayed in the sidebar, header, and product category dropdown."
              - label: "Description"
                name: "description"
                widget: "text"
                required: false
                i18n: true
                hint: "Brief category overview shown at the top of the catalogue page."
              - label: "Icon"
                name: "icon"
                widget: "icon-select"
                required: false
                i18n: duplicate
                options:
${iconOptions}

  # ── Products ─────────────────────────────────────────────────────
  - name: "equipment"
    label: "Products"
    label_singular: "Equipment Product"
    description: >-
      Individual product pages. Choose a category from the dropdown to place
      the product in the correct folder.
    folder: "application/frontend/src/content/equipment"
    create: true
    delete: false
    i18n: true
    preview_path: "{{locale}}/catalogue/{{dirname}}/{{filename}}"
    preview_path_date_field: "date"
    summary: "{{title}} [{{dirname}}/{{filename}}]"
    sortable_fields: ["commit_date", "order", "title", "commit_author"]
    view_filters:
      - label: "Food & Beverage"
        field: industries
        pattern: "food-beverage"
      - label: "Pharmaceutical"
        field: industries
        pattern: "pharmaceutical"
      - label: "Cosmetics"
        field: industries
        pattern: "cosmetics"
      - label: "General / Industrial"
        field: industries
        pattern: "general"
    view_groups:
      - label: "By Category"
        field: category
      - label: "By Order"
        field: order
    editor:
      preview: false
    # Products live in category sub-folders; without depth Decap only lists the top level
    nested:
      depth: 2
    meta:
      path:
        widget: select
        label: "Category"
        options:
${categoryOptions}
    fields:
      - { label: "Order", name: "order", widget: "number", value_type: "int", default: 0, required: false, hint: "Lower numbers appear first within this category.", i18n: duplicate }
      - label: "Gallery"
        name: "gallery"
        widget: "list"
        required: false
        i18n: true
        min: 0
        max: 3
        field:
          label: "Image"
          name: "image"
          widget: "image"
          media_processing:
            enabled: true
            format:
              enabled: true
              default: webp
            quality: 85
            strip_metadata: true
            width: 1200
            height: null
            aspect_ratio: 4x3
      - { label: "Datasheet", name: "datasheet", widget: "file", required: false, i18n: duplicate }
      - label: "Industries"
        name: "industries"
        widget: "select"
        required: false
        i18n: true
        multiple: true
        min: 0
        options:
          - { label: "Food & Beverage", value: "food-beverage" }
          - { label: "Pharmaceutical", value: "pharmaceutical" }
          - { label: "Cosmetics", value: "cosmetics" }
          - { label: "General / Industrial", value: "general" }
          - { label: "Logistics & E-commerce", value: "logistics" }
          - { label: "Chemical", value: "chemical" }
      - { label: "Title", name: "title", widget: "string", i18n: true }
      - { label: "Description", name: "description", widget: "text", required: false, i18n: true }
      - label: "Specifications"
        name: "specs"
        widget: "list"
        required: false
        i18n: true
        min: 0
        max: 20
        fields:
          - { label: "Label", name: "label", widget: "string" }
          - { label: "Value", name: "value", widget: "string" }
      - { label: "Body", name: "body", widget: "richtext", required: false, i18n: true }
`;

	return new Response(config, {
		headers: { "Content-Type": "text/yaml; charset=utf-8" },
	});
};
