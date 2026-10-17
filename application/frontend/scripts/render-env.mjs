#!/usr/bin/env node
// Reads a secrets manifest YAML and the GitHub secrets/variables JSON objects
// passed via environment variables, then prints the server env file content.
//
// Usage (called by the deploy workflow):
//   node scripts/render-env.mjs ../.github/secrets.dev.yaml
//
// The workflow passes ${{ toJSON(secrets) }} as GH_SECRETS and
// ${{ toJSON(vars) }} as GH_VARS in its env: block.

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "yaml";

/**
 * @param {{ secrets?: Record<string, string>, variables?: Record<string, string> }} manifest - Parsed secrets manifest
 * @param {Record<string, string>} secrets - GitHub secrets object
 * @param {Record<string, string>} variables - GitHub variables object
 * @returns {string} - env file content
 */
export function renderEnv(manifest, secrets, variables) {
	const lines = [];

	const processMapping = (mapping, source, sourceLabel) => {
		for (const [ghName, envName] of Object.entries(mapping)) {
			const value = source[ghName];
			if (value === undefined || value === null || value === "") {
				throw new Error(
					`Required ${sourceLabel} "${ghName}" is missing or empty in the provided context.`
				);
			}
			if (/[\r\n]/.test(value)) {
				throw new Error(
					`Value for "${ghName}" contains a newline character, which is not allowed in an env file.`
				);
			}
			// Escape backslashes first, then double quotes
			const escaped = value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
			lines.push(`${envName}="${escaped}"`);
		}
	};

	if (manifest.secrets) processMapping(manifest.secrets, secrets, "secret");
	if (manifest.variables) processMapping(manifest.variables, variables, "variable");

	return `${lines.join("\n")}\n`;
}

// CLI entry point
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
	const manifestPath = process.argv[2];
	if (!manifestPath) {
		console.error("Usage: node scripts/render-env.mjs <path-to-manifest.yaml>");
		process.exit(1);
	}

	const manifest = parse(readFileSync(resolve(manifestPath), "utf8"));

	let ghSecrets = {};
	let ghVars = {};
	try {
		ghSecrets = JSON.parse(process.env.GH_SECRETS ?? "{}");
		ghVars = JSON.parse(process.env.GH_VARS ?? "{}");
	} catch (e) {
		console.error("Failed to parse GH_SECRETS or GH_VARS as JSON:", e.message);
		process.exit(1);
	}

	try {
		process.stdout.write(renderEnv(manifest, ghSecrets, ghVars));
	} catch (e) {
		console.error(e.message);
		process.exit(1);
	}
}
