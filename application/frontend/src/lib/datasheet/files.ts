import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

// The only reference format the CMS writes (see the `datasheet` field in _config.template.yml).
// No slash is allowed inside the name, so a reference can never leave the private folder.
const REFERENCE = /^\/datasheets\/([A-Za-z0-9._-]+\.pdf)$/;
const warned = new Set<string>();

/** `/datasheets/hc-m.pdf` -> `hc-m.pdf`; null for anything else. */
export function datasheetFileName(ref: string | null | undefined): string | null {
	return ref ? (REFERENCE.exec(ref)?.[1] ?? null) : null;
}

/**
 * Looks for `private/datasheets` in `start` and its parents. In dev that finds the repo folder
 * (src/lib/datasheet -> frontend); in production it finds dist/private/datasheets above
 * dist/server/chunks, whatever the working directory of the server is.
 */
export function findDatasheetDir(start: string): string | null {
	let current = start;
	for (let depth = 0; depth < 8; depth++) {
		const candidate = join(current, "private", "datasheets");
		if (existsSync(candidate)) return candidate;
		const parent = dirname(current);
		if (parent === current) break;
		current = parent;
	}
	return null;
}

export function datasheetDir(): string | null {
	return (
		findDatasheetDir(dirname(fileURLToPath(import.meta.url))) ?? findDatasheetDir(process.cwd())
	);
}

/** Absolute path of the PDF the reference points at, or null when it cannot be served. */
export function resolveDatasheet(
	ref: string | null | undefined,
	dir: string | null = datasheetDir()
): string | null {
	const name = datasheetFileName(ref);
	if (!(name && dir)) return null;
	const file = join(dir, name);
	return existsSync(file) ? file : null;
}

/** Build-time check for the product page; warns once about a reference that does not resolve. */
export function hasDatasheet(
	ref: string | null | undefined,
	dir: string | null = datasheetDir()
): boolean {
	if (!ref) return false;
	if (resolveDatasheet(ref, dir)) return true;
	if (!warned.has(ref)) {
		warned.add(ref);
		console.warn(`[datasheet] ${ref} is not a PDF in private/datasheets, hiding the button`);
	}
	return false;
}
