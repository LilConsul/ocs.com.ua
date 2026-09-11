#!/usr/bin/env node

/**
 * i18n POT/PO Extraction Tool (Babel-style)
 *
 * Extracts _("text") calls from source code and generates/updates .po files
 *
 * Usage:
 *   npm run i18n:extract              # Extract to .pot and update .po files
 *   npm run i18n:extract -- --init    # Initialize new language .po file
 *   npm run i18n:compile              # Compile .po files to ui.ts
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { glob } from "glob";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = resolve(__dirname, "..");
const LOCALES_DIR = resolve(ROOT_DIR, "locales");
const POT_FILE = resolve(LOCALES_DIR, "messages.pot");

// Regex to find _("text") or _('text') calls
const INLINE_TRANSLATION_REGEX = /\b_\(\s*["'`]([^"'`]+)["'`]\s*\)/g;

/**
 * Extract all _("text") strings from source files
 */
async function extractStrings() {
	const patterns = ["src/**/*.astro", "src/**/*.tsx", "src/**/*.ts"];

	console.log("[SCAN] Scanning files for _() calls...\n");

	const files = await glob(patterns, {
		cwd: ROOT_DIR,
		ignore: ["**/node_modules/**", "**/dist/**", "**/*.d.ts"],
	});

	const extractedStrings = new Map(); // msgid -> [{ file, line }]

	for (const file of files) {
		const filePath = resolve(ROOT_DIR, file);
		const content = readFileSync(filePath, "utf-8");
		const lines = content.split("\n");

		let match = INLINE_TRANSLATION_REGEX.exec(content);
		while (match !== null) {
			const msgid = match[1];
			const index = match.index;
			const lineNumber = content.substring(0, index).split("\n").length;

			if (!extractedStrings.has(msgid)) {
				extractedStrings.set(msgid, []);
			}
			extractedStrings.get(msgid).push({ file, line: lineNumber });

			match = INLINE_TRANSLATION_REGEX.exec(content);
		}
	}

	return extractedStrings;
}

/**
 * Generate POT file (template)
 */
function generatePOT(strings) {
	const now = new Date();
	const timestamp = now.toISOString().replace("T", " ").split(".")[0];

	let pot = `# SOME DESCRIPTIVE TITLE.
# Copyright (C) ${now.getFullYear()} OS-Technology Ukraine
# This file is distributed under the same license as the OS-Technology project.
# FIRST AUTHOR <EMAIL@ADDRESS>, ${now.getFullYear()}.
#
msgid ""
msgstr ""
"Project-Id-Version: OS-Technology Frontend 1.0\\n"
"Report-Msgid-Bugs-To: EMAIL@ADDRESS\\n"
"POT-Creation-Date: ${timestamp}+0000\\n"
"PO-Revision-Date: YEAR-MO-DA HO:MI+ZONE\\n"
"Last-Translator: FULL NAME <EMAIL@ADDRESS>\\n"
"Language-Team: LANGUAGE <LL@li.org>\\n"
"MIME-Version: 1.0\\n"
"Content-Type: text/plain; charset=utf-8\\n"
"Content-Transfer-Encoding: 8bit\\n"
"Generated-By: i18n-extract\\n"

`;

	const sortedMsgids = Array.from(strings.keys()).sort();

	for (const msgid of sortedMsgids) {
		const locations = strings.get(msgid);

		// Add location comments
		for (const loc of locations) {
			pot += `#: ${loc.file}:${loc.line}\n`;
		}

		// Add msgid and empty msgstr
		pot += `msgid "${escapePO(msgid)}"\n`;
		pot += `msgstr ""\n\n`;
	}

	return pot;
}

/**
 * Parse existing PO file
 */
function parsePO(content) {
	const translations = new Map();
	const lines = content.split("\n");
	let currentMsgid = null;
	let currentMsgstr = null;
	let currentComments = [];

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i].trim();

		if (line.startsWith("#:")) {
			currentComments.push(line);
		} else if (line.startsWith("msgid ")) {
			if (currentMsgid && currentMsgstr !== null) {
				translations.set(currentMsgid, {
					msgstr: currentMsgstr,
					comments: currentComments,
				});
			}
			currentMsgid = unescapePO(line.substring(7, line.length - 1));
			currentMsgstr = null;
			currentComments = [];
		} else if (line.startsWith("msgstr ")) {
			currentMsgstr = unescapePO(line.substring(8, line.length - 1));
		}
	}

	// Add last entry
	if (currentMsgid && currentMsgstr !== null) {
		translations.set(currentMsgid, {
			msgstr: currentMsgstr,
			comments: currentComments,
		});
	}

	return translations;
}

/**
 * Update PO file with new strings from POT
 */
function updatePO(potStrings, existingPO, language) {
	const now = new Date();
	const timestamp = now.toISOString().replace("T", " ").split(".")[0];

	let po = `# ${language.toUpperCase()} translations for OS-Technology Frontend.
# Copyright (C) ${now.getFullYear()} OS-Technology Ukraine
# This file is distributed under the same license as the OS-Technology project.
# FIRST AUTHOR <EMAIL@ADDRESS>, ${now.getFullYear()}.
#
msgid ""
msgstr ""
"Project-Id-Version: OS-Technology Frontend 1.0\\n"
"Report-Msgid-Bugs-To: EMAIL@ADDRESS\\n"
"POT-Creation-Date: ${timestamp}+0000\\n"
"PO-Revision-Date: ${timestamp}+0000\\n"
"Last-Translator: FULL NAME <EMAIL@ADDRESS>\\n"
"Language: ${language}\\n"
"Language-Team: ${language} <LL@li.org>\\n"
"MIME-Version: 1.0\\n"
"Content-Type: text/plain; charset=utf-8\\n"
"Content-Transfer-Encoding: 8bit\\n"
"Generated-By: i18n-extract\\n"

`;

	const sortedMsgids = Array.from(potStrings.keys()).sort();

	for (const msgid of sortedMsgids) {
		const locations = potStrings.get(msgid);

		// Add location comments
		for (const loc of locations) {
			po += `#: ${loc.file}:${loc.line}\n`;
		}

		// Add msgid
		po += `msgid "${escapePO(msgid)}"\n`;

		// Add msgstr (preserve existing translation or leave empty)
		// IMPORTANT: Only preserve non-empty translations to avoid overwriting
		const existing = existingPO?.get(msgid);
		const msgstr = existing?.msgstr && existing.msgstr.trim() !== "" ? existing.msgstr : "";
		po += `msgstr "${escapePO(msgstr)}"\n\n`;
	}

	return po;
}

/**
 * Escape string for PO format
 */
function escapePO(str) {
	return str
		.replace(/\\/g, "\\\\")
		.replace(/"/g, '\\"')
		.replace(/\n/g, "\\n")
		.replace(/\t/g, "\\t");
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
 * Main extraction
 */
async function extract() {
	// Ensure locales directory exists
	if (!existsSync(LOCALES_DIR)) {
		mkdirSync(LOCALES_DIR, { recursive: true });
	}

	// Extract strings
	const strings = await extractStrings();

	if (strings.size === 0) {
		console.log("[INFO] No _() calls found in source files.");
		return;
	}

	console.log(`[INFO] Found ${strings.size} unique _() calls\n`);

	// Generate POT file
	const potContent = generatePOT(strings);
	writeFileSync(POT_FILE, potContent, "utf-8");
	console.log(`[OK] Created template file: locales/messages.pot`);

	// Update existing PO files
	// Note: English is the source language, so we only generate translations for other languages
	const languages = ["ua"];

	for (const lang of languages) {
		const poFile = resolve(LOCALES_DIR, `${lang}.po`);
		let existingPO = null;

		if (existsSync(poFile)) {
			const existingContent = readFileSync(poFile, "utf-8");
			existingPO = parsePO(existingContent);
		}

		const poContent = updatePO(strings, existingPO, lang);
		writeFileSync(poFile, poContent, "utf-8");
		console.log(`[OK] Updated: locales/${lang}.po`);
	}

	console.log(
		"\n[DONE] Extraction complete! Edit .po files to add translations, then run 'npm run i18n:compile'"
	);
}

/**
 * Initialize new language
 */
async function initLanguage(lang) {
	if (!existsSync(POT_FILE)) {
		console.error("[ERROR] POT file not found. Run 'npm run i18n:extract' first to generate it.");
		process.exit(1);
	}

	const poFile = resolve(LOCALES_DIR, `${lang}.po`);

	if (existsSync(poFile)) {
		console.error(`[ERROR] ${lang}.po already exists.`);
		process.exit(1);
	}

	const potContent = readFileSync(POT_FILE, "utf-8");
	const strings = new Map();

	// Parse POT to get msgids
	const lines = potContent.split("\n");
	for (const line of lines) {
		if (line.startsWith("msgid ") && line !== 'msgid ""') {
			const msgid = unescapePO(line.substring(7, line.length - 1));
			strings.set(msgid, []);
		}
	}

	const poContent = updatePO(strings, null, lang);
	writeFileSync(poFile, poContent, "utf-8");
	console.log(`[OK] Created locales/${lang}.po`);
}

// Main
const args = process.argv.slice(2);

if (args.includes("--init")) {
	const lang = args[args.indexOf("--init") + 1];
	if (!lang) {
		console.error("[ERROR] Usage: npm run i18n:extract -- --init <language>");
		process.exit(1);
	}
	initLanguage(lang);
} else {
	extract();
}
