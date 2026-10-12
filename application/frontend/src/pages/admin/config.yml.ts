import type { APIRoute } from "astro";
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";

interface EquipmentType {
	slug: string;
	title: string;
	order: number;
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
	const categories = readJson<EquipmentType[]>("src/data/equipment-types.en.json", [])
		.sort((a, b) => a.order - b.order);

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
  squash_merges: true

  #name: test-repo

publish_mode: editorial_workflow

site_url: https://ocs.com.ua
display_url: https://ocs.com.ua

logo:
  src: /admin-logo.svg
  show_in_header: true

locale: en

slug:
  encoding: ascii
  clean_accents: true
  sanitize_replacement: "-"

media_folder: "application/frontend/public/assets/equipment"
public_folder: "/assets/equipment"

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
      Equipment type definitions. Each entry controls the sidebar label, icon,
      sort order and description for one category. Adding a new entry here
      automatically populates the category dropdown in Equipment Products.
    editor:
      preview: false
    files:
      - name: "equipment-types-en"
        label: "Equipment Types (EN)"
        file: "application/frontend/src/data/equipment-types.en.json"
        format: json
        fields:
          - label: "Categories"
            name: "categories"
            widget: list
            fields:
              - { label: "Slug", name: "slug", widget: "string", hint: "URL-safe folder name, e.g. checkweighers. Must match folder in src/content/equipment/." }
              - { label: "Title", name: "title", widget: "string" }
              - { label: "Description", name: "description", widget: "text", required: false }
              - label: "Icon"
                name: "icon"
                widget: "select"
                required: false
                options:
${iconOptions}
              - { label: "Order", name: "order", widget: "number", value_type: "int", default: 0, hint: "Lower numbers appear first in the sidebar." }
      - name: "equipment-types-ua"
        label: "Equipment Types (UA)"
        file: "application/frontend/src/data/equipment-types.ua.json"
        format: json
        fields:
          - label: "Categories"
            name: "categories"
            widget: list
            fields:
              - { label: "Slug", name: "slug", widget: "string", hint: "Must match the EN slug exactly." }
              - { label: "Title", name: "title", widget: "string" }
              - { label: "Description", name: "description", widget: "text", required: false }
              - label: "Icon"
                name: "icon"
                widget: "select"
                required: false
                options:
${iconOptions}
              - { label: "Order", name: "order", widget: "number", value_type: "int", default: 0, hint: "Lower numbers appear first in the sidebar." }

  # ── Equipment Products ─────────────────────────────────────────────────────
  - name: "equipment"
    label: "Equipment Products"
    label_singular: "Equipment Product"
    description: >-
      Individual product pages. Choose a category from the dropdown to place
      the product in the correct folder.
    folder: "application/frontend/src/content/equipment"
    create: true
    delete: false
    i18n: true
    preview_path: "{{locale}}/catalogue/{{dirname}}/{{filename}}"
    summary: "{{title}} — {{dirname}}/{{filename}}"
    sortable_fields: ["order", "title"]
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
    view_groups:
      - label: "By Category"
        field: dirname
      - label: "By Order"
        field: order
    editor:
      preview: false
    nested:
      depth: 2
      summary: "{{title | default('index')}}"
    meta:
      path:
        widget: select
        label: "Category"
        index_file: "_index"
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
        field: { label: "Image", name: "image", widget: "image" }
      - { label: "Datasheet", name: "datasheet", widget: "file", required: false, i18n: duplicate }
      - { label: "Industries", name: "industries", widget: "list", required: false, i18n: true }
      - { label: "Title", name: "title", widget: "string", i18n: true }
      - { label: "Description", name: "description", widget: "text", required: false, i18n: true }
      - label: "Specifications"
        name: "specs"
        widget: "list"
        required: false
        i18n: true
        min: 0
        max: 10
        fields:
          - { label: "Label", name: "label", widget: "string" }
          - { label: "Value", name: "value", widget: "string" }
      - { label: "Body", name: "body", widget: "richtext", required: false, i18n: true }
`;

	return new Response(config, {
		headers: { "Content-Type": "text/yaml; charset=utf-8" },
	});
};
