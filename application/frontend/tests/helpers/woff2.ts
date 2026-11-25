import { readFileSync } from "node:fs";
import { brotliDecompressSync } from "node:zlib";

/**
 * The code points a WOFF2 file has glyphs for. Reads only what that takes: the table directory, the
 * Brotli stream and the cmap table, which WOFF2 never transforms.
 */
export function woff2CodePoints(path: string): Set<number> {
	const file = readFileSync(path);
	if (file.toString("latin1", 0, 4) !== "wOF2") throw new Error(`${path} is not a WOFF2 file`);
	const tableCount = file.readUInt16BE(12);
	const compressedSize = file.readUInt32BE(20);

	let at = 48; // end of the fixed header
	const base128 = () => {
		let value = 0;
		for (;;) {
			const byte = file[at++];
			value = value * 128 + (byte & 0x7f);
			if (byte < 0x80) return value;
		}
	};
	let offset = 0;
	let cmapAt = -1;
	for (let i = 0; i < tableCount; i++) {
		const flags = file[at++];
		const tag = flags & 0x3f;
		if (tag === 0x3f) at += 4; // a tag outside the list of known ones follows
		const version = flags >> 6;
		const glyfOrLoca = tag === 10 || tag === 11;
		const length = base128();
		// glyf and loca are transformed unless the version is 3, every other table unless it is 0
		const transformed = glyfOrLoca ? version !== 3 : version !== 0;
		const stored = transformed ? base128() : length;
		if (tag === 0) cmapAt = offset;
		offset += stored;
	}
	if (cmapAt < 0) throw new Error(`${path} has no cmap table`);
	const data = brotliDecompressSync(file.subarray(at, at + compressedSize));

	const points = new Set<number>();
	const subtables = data.readUInt16BE(cmapAt + 2);
	for (let i = 0; i < subtables; i++) {
		const start = cmapAt + data.readUInt32BE(cmapAt + 4 + i * 8 + 4);
		const format = data.readUInt16BE(start);
		if (format === 4) {
			const size = data.readUInt16BE(start + 6);
			for (let s = 0; s < size; s += 2) {
				const end = data.readUInt16BE(start + 14 + s);
				const first = data.readUInt16BE(start + 16 + size + s);
				// The last segment of every format 4 table is the U+FFFF end mark
				for (let code = first; code <= end && code !== 0xffff; code++) points.add(code);
			}
		} else if (format === 12) {
			const groups = data.readUInt32BE(start + 12);
			for (let g = 0; g < groups; g++) {
				const first = data.readUInt32BE(start + 16 + g * 12);
				const end = data.readUInt32BE(start + 16 + g * 12 + 4);
				for (let code = first; code <= end; code++) points.add(code);
			}
		}
	}
	if (points.size === 0) throw new Error(`${path}: no cmap table of a known format`);
	return points;
}
