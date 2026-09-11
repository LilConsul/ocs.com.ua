#!/usr/bin/env node

/**
 * i18n PO to TypeScript Compiler
 *
 * Compiles .po files to TypeScript ui.ts format
 *
 * Usage:
 *   npm run i18n:compile
 */

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = resolve(__dirname, "..");
const LOCALES_DIR = resolve(ROOT_DIR, "locales");
const UI_FILE = resolve(ROOT_DIR, "src/i18n/ui.ts");

/**
 * Convert English text to a valid translation key.
 * "Hello, World!" -> "hello_world"
 */
function textToKey(text) {
	return text
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "_")
		.replace(/^_+|_+$/g, "")
		.substring(0, 80);
}

/**
 * Unescape string from PO format
 */
function unescapePO(str) {
	return str
		.replace(/\\n/g, "\n")
		.replace(/\\t/g, "\t")
		.replace(/\\"/g, '"')
		.replace(/\\\\/g, "\\");
}

/**
 * Parse PO file
 */
function parsePO(content) {
	const translations = new Map(); // msgid -> msgstr
	const lines = content.split("\n");
	let currentMsgid = null;
	let currentMsgstr = null;

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i].trim();

		if (line.startsWith("msgid ")) {
			if (currentMsgid && currentMsgstr !== null && currentMsgid !== "") {
				translations.set(currentMsgid, currentMsgstr);
			}
			currentMsgid = unescapePO(line.substring(7, line.length - 1));
			currentMsgstr = null;
		} else if (line.startsWith("msgstr ")) {
			currentMsgstr = unescapePO(line.substring(8, line.length - 1));
		}
	}

	// Add last entry
	if (currentMsgid && currentMsgstr !== null && currentMsgid !== "") {
		translations.set(currentMsgid, currentMsgstr);
	}

	return translations;
}

/**
 * Escape string for TypeScript
 */
function escapeTS(str) {
	return str.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\n");
}

/**
 * Compile PO files to ui.ts
 */
function compile() {
	console.log("[COMPILE] Compiling .po files to TypeScript...\n");

	// Only compile non-English languages (English uses msgid as source)
	const languages = ["ua"];
	const allTranslations = {};

	// Load POT file for English source strings
	const potFile = resolve(LOCALES_DIR, "messages.pot");
	if (!existsSync(potFile)) {
		console.error("[ERROR] Missing messages.pot file. Run 'npm run i18n:extract' first.");
		process.exit(1);
	}

	const potContent = readFileSync(potFile, "utf-8");
	const potTranslations = parsePO(potContent);
	allTranslations.en = potTranslations; // English msgids from POT

	console.log(`[OK] Loaded locales/messages.pot (${potTranslations.size} entries)`);

	// Load other language PO files
	for (const lang of languages) {
		const poFile = resolve(LOCALES_DIR, `${lang}.po`);

		if (!existsSync(poFile)) {
			console.error(`[ERROR] Missing ${lang}.po file. Run 'npm run i18n:extract' first.`);
			process.exit(1);
		}

		const content = readFileSync(poFile, "utf-8");
		const translations = parsePO(content);

		allTranslations[lang] = translations;
		console.log(`[OK] Loaded locales/${lang}.po (${translations.size} entries)`);
	}

	// Build ui.ts structure
	const uiData = {};
	const allLanguages = ["en", ...languages];

	for (const lang of allLanguages) {
		uiData[lang] = {};
		const translations = allTranslations[lang];

		for (const [msgid, msgstr] of translations) {
			const key = `inline.${textToKey(msgid)}`;
			// For English, use msgid; for others use msgstr (or msgid as fallback)
			uiData[lang][key] = lang === "en" ? msgid : msgstr && msgstr.trim() !== "" ? msgstr : msgid;
		}
	}

	// Sort keys
	const sortedKeys = Object.keys(uiData.en).sort();

	// Generate ui.ts
	const buildObject = (lang) => {
		let result = "\t\t";
		const lines = [];

		for (const key of sortedKeys) {
			const value = uiData[lang][key] || "";
			const escapedValue = escapeTS(value);
			lines.push(`"${key}": "${escapedValue}"`);
		}

		result += lines.join(",\n\t\t");
		return result;
	};

	const uiContent = `export const languages = {
	en: "English",
	ua: "Українська",
};

export const defaultLang = "ua";

export const ui = {
	en: {
${buildObject("en")},
	},
	ua: {
${buildObject("ua")},
	},
} as const;
`;

	writeFileSync(UI_FILE, uiContent, "utf-8");
	console.log(`\n[OK] Compiled to src/i18n/ui.ts (${sortedKeys.length} keys)`);
	console.log("\n[DONE] Compilation complete!");
}

// Main
compile();
