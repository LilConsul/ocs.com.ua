import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const LANGS = ["en", "ua"];

/**
 * Old catalogue URLs mapped to the /catalogue/equipment/ scheme:
 *   /{lang}/catalogue/{category}           -> /{lang}/catalogue/equipment/{category}
 *   /{lang}/catalogue/{category}/{product} -> /{lang}/catalogue/equipment/{category}/{product}
 * Built from equipment-types.json and the content folders under `root` (the frontend folder).
 */
export function buildCatalogueRedirects(root) {
	const types = JSON.parse(readFileSync(join(root, "src/data/equipment-types.json"), "utf8"));
	const contentDir = join(root, "src/content/equipment");
	const redirects = {};

	for (const lang of LANGS) {
		for (const { slug: category } of types[lang]?.categories ?? []) {
			redirects[`/${lang}/catalogue/${category}`] = `/${lang}/catalogue/equipment/${category}`;

			// A category can exist before it has any product folder
			const categoryDir = join(contentDir, category);
			if (!existsSync(categoryDir)) continue;

			for (const file of readdirSync(categoryDir)) {
				const match = file.match(new RegExp(`^([^_].*)\\.${lang}\\.md$`));
				if (!match) continue;
				redirects[`/${lang}/catalogue/${category}/${match[1]}`] =
					`/${lang}/catalogue/equipment/${category}/${match[1]}`;
			}
		}
	}

	return redirects;
}
