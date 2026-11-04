import { existsSync } from "node:fs";
import { join, resolve, sep } from "node:path";

// Pages are prerendered from the frontend folder, so ./public is where the files live
const PUBLIC_DIR = resolve(process.cwd(), "public");
const warned = new Set<string>();

function decode(path: string): string {
	try {
		return decodeURIComponent(path);
	} catch {
		return path;
	}
}

/**
 * Returns the path if it can be served, otherwise undefined. Content files reference images and
 * PDFs by plain path, so a file deleted in the CMS would otherwise ship as a broken <img> or link.
 * Only files that exist in public/ pass, so remote URLs are dropped too (the site does not
 * support them). If the public folder cannot be found, nothing is dropped.
 */
export function existingFile(path: string | null | undefined): string | undefined {
	if (!path) return undefined;
	if (!existsSync(PUBLIC_DIR)) return path;

	const file = resolve(join(PUBLIC_DIR, decode(path)));
	if (file.startsWith(PUBLIC_DIR + sep) && existsSync(file)) return path;

	if (!warned.has(path)) {
		warned.add(path);
		console.warn(`[images] ${path} is referenced in content but missing from public/, skipping it`);
	}
	return undefined;
}

export function existingFiles(paths: (string | null | undefined)[] | null | undefined): string[] {
	return (paths ?? []).map(existingFile).filter((p): p is string => Boolean(p));
}
