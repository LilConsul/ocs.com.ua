#!/usr/bin/env node

/**
 * i18n Extraction Tool
 *
 * Extracts _("text") calls from source code and updates src/i18n/ui.ts
 * with new translation entries.
 *
 * Usage:
 *   npm run i18n:extract              # Extract and prompt for translations
 *   npm run i18n:extract -- --dry-run # Show what would be extracted without modifying files
 */

import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { glob } from "glob";
import inquirer from "inquirer";

/**
 * Convert English text to a valid translation key.
 * "Hello, World!" -> "hello_world"
 * (Duplicated from inline.ts to avoid TypeScript import issues in Node script)
 */
function textToKey(text) {
	return text
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "_") // Replace non-alphanumeric with underscore
		.replace(/^_+|_+$/g, "") // Trim leading/trailing underscores
		.substring(0, 80); // Limit length to keep keys manageable
}

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = resolve(__dirname, "..");
const UI_FILE = resolve(ROOT_DIR, "src/i18n/ui.ts");

// Regex to find _("text") or _('text') calls
const INLINE_TRANSLATION_REGEX = /\b_\(\s*["'`]([^"'`]+)["'`]\s*\)/g;

/**
 * Extract all _("text") strings from source files
 */
async function extractStrings() {
	const patterns = ["src/**/*.astro", "src/**/*.tsx", "src/**/*.ts"];

	console.log("Scanning files for _() calls...\n");

	const files = await glob(patterns, {
		cwd: ROOT_DIR,
		ignore: ["**/node_modules/**", "**/dist/**", "**/*.d.ts"],
	});

	const extractedStrings = new Map(); // text -> Set<file paths>

	for (const file of files) {
		const filePath = resolve(ROOT_DIR, file);
		const content = readFileSync(filePath, "utf-8");

		let match;
		while ((match = INLINE_TRANSLATION_REGEX.exec(content)) !== null) {
			const text = match[1];
			if (!extractedStrings.has(text)) {
				extractedStrings.set(text, new Set());
			}
			extractedStrings.get(text).add(file);
		}
	}

	return extractedStrings;
}

/**
 * Parse existing ui.ts file
 */
function parseUIFile() {
	const content = readFileSync(UI_FILE, "utf-8");

	// Extract the en and ua objects
	const enMatch = content.match(/en:\s*\{([^}]+(?:\}[^}]+)*)\}/s);
	const uaMatch = content.match(/ua:\s*\{([^}]+(?:\}[^}]+)*)\}/s);

	if (!(enMatch && uaMatch)) {
		throw new Error("Could not parse ui.ts file structure");
	}

	// Simple key extraction (this is naive but works for the current format)
	const extractKeys = (objContent) => {
		const keys = new Map();
		const keyRegex = /"([^"]+)":\s*"([^"]*(?:\\.[^"]*)*)"/g;
		let match;
		// biome-ignore lint/suspicious/noAssignInExpressions: <explanation>
		while ((match = keyRegex.exec(objContent)) !== null) {
			keys.set(match[1], match[2].replace(/\\"/g, '"').replace(/\\\\/g, "\\"));
		}
		return keys;
	};

	return {
		en: extractKeys(enMatch[1]),
		ua: extractKeys(uaMatch[1]),
		rawContent: content,
	};
}

/**
 * Prompt user for translations
 */
async function promptForTranslations(strings, existingTranslations) {
	const newTranslations = new Map();

	console.log(`\n✨ Found ${strings.size} unique _() calls\n`);

	for (const [text, files] of strings) {
		const key = `inline.${textToKey(text)}`;

		// Skip if already translated
		if (existingTranslations.en.has(key) && existingTranslations.ua.has(key)) {
			console.log(`✓ "${text}" (already translated)`);
			continue;
		}

		console.log(`\n📍 Found in: ${Array.from(files).join(", ")}`);

		const answers = await inquirer.prompt([
			{
				type: "input",
				name: "ukrainian",
				message: `Ukrainian translation for "${text}":`,
				default: existingTranslations.ua.get(key) || "",
				validate: (input) => input.trim() !== "" || "Translation cannot be empty",
			},
		]);

		newTranslations.set(key, {
			en: text,
			ua: answers.ukrainian,
		});
	}

	return newTranslations;
}

/**
 * Update ui.ts with new translations
 */
function updateUIFile(newTranslations, existingTranslations) {
	if (newTranslations.size === 0) {
		console.log("\n✨ No new translations to add. Everything is up to date!");
		return;
	}

	// Merge translations
	const allEnKeys = new Map([
		...existingTranslations.en,
		...Array.from(newTranslations).map(([key, val]) => [key, val.en]),
	]);
	const allUaKeys = new Map([
		...existingTranslations.ua,
		...Array.from(newTranslations).map(([key, val]) => [key, val.ua]),
	]);

	// Sort keys (manual keys first, then inline keys alphabetically)
	const sortKeys = (keys) => {
		const manual = [];
		const inline = [];

		for (const key of keys) {
			if (key.startsWith("inline.")) {
				inline.push(key);
			} else {
				manual.push(key);
			}
		}

		return [...manual.sort(), ...inline.sort()];
	};

	const sortedKeys = sortKeys(Array.from(allEnKeys.keys()));

	// Build new en and ua objects
	const buildObject = (translations) => {
		let result = "\t\t";
		const lines = [];

		for (const key of sortedKeys) {
			const value = translations.get(key) || "";
			const escapedValue = value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
			lines.push(`"${key}": "${escapedValue}"`);
		}

		result += lines.join(",\n\t\t");
		return result;
	};

	const enObject = buildObject(allEnKeys);
	const uaObject = buildObject(allUaKeys);

	// Generate new ui.ts content
	const newContent = `export const languages = {
	en: "English",
	ua: "Українська",
};

export const defaultLang = "ua";

export const ui = {
	en: {
${enObject},
	},
	ua: {
${uaObject},
	},
} as const;
`;

	writeFileSync(UI_FILE, newContent, "utf-8");
	console.log(`\n✅ Updated ${UI_FILE} with ${newTranslations.size} new translations`);
}

/**
 * Main
 */
async function main() {
	const isDryRun = process.argv.includes("--dry-run");

	try {
		// Extract strings
		const extractedStrings = await extractStrings();

		if (extractedStrings.size === 0) {
			console.log("✨ No _() calls found in source files.");
			return;
		}

		// Parse existing translations
		const existingTranslations = parseUIFile();

		if (isDryRun) {
			console.log("\n🔍 DRY RUN - Would extract these strings:\n");
			for (const [text, files] of extractedStrings) {
				const key = `inline.${textToKey(text)}`;
				const status = existingTranslations.en.has(key) ? "✓" : "NEW";
				console.log(`${status} "${text}" -> ${key}\n   Files: ${Array.from(files).join(", ")}\n`);
			}
			return;
		}

		// Prompt for translations
		const newTranslations = await promptForTranslations(extractedStrings, existingTranslations);

		// Update ui.ts
		updateUIFile(newTranslations, existingTranslations);

		console.log("\n🎉 Done! Your translations have been added to src/i18n/ui.ts");
	} catch (error) {
		console.error("\n❌ Error:", error.message);
		process.exit(1);
	}
}

main();
