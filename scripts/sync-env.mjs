// Syncs .env.local with .env.example.
//  - Missing file: copied from .env.example.
//  - Existing file: rebuilt using the structure of .env.example (comments, blank
//    lines, ordering, new keys) while keeping every value already set in
//    .env.local. Keys that exist only in .env.local are kept in a block at the end.
import { existsSync, readFileSync, writeFileSync, copyFileSync } from "node:fs";
import { join } from "node:path";

const dir = join("application", "frontend");
const example = join(dir, ".env.example");
const local = join(dir, ".env.local");

if (!existsSync(example)) {
  console.error(`${example} not found`);
  process.exit(1);
}

if (!existsSync(local)) {
  copyFileSync(example, local);
  console.log(`Created ${local} from ${example}`);
  process.exit(0);
}

const CUSTOM_HEADER = "# Custom variables (not in .env.example)";
const ACTIVE = /^([A-Za-z_][A-Za-z0-9_]*)=/;
const COMMENTED = /^#\s*([A-Z_][A-Z0-9_]*)=/;

const lines = (text) => text.replace(/\r\n/g, "\n").replace(/\n$/, "").split("\n");

const currentText = readFileSync(local, "utf8");
const localValues = new Map();
for (const line of lines(currentText)) {
  const key = ACTIVE.exec(line)?.[1];
  if (key) localValues.set(key, line);
}

const used = new Set();
const out = [];
for (const line of lines(readFileSync(example, "utf8"))) {
  const key = (ACTIVE.exec(line) ?? COMMENTED.exec(line))?.[1];
  if (key && localValues.has(key)) {
    // Value set locally wins, even if the example has it commented out.
    out.push(localValues.get(key));
    used.add(key);
  } else {
    out.push(line);
    if (ACTIVE.test(line)) used.add(key);
  }
}

const custom = [...localValues].filter(([key]) => !used.has(key));
if (custom.length > 0) {
  out.push("", CUSTOM_HEADER, ...custom.map(([, line]) => line));
}

const next = `${out.join("\n")}\n`;
if (next === currentText.replace(/\r\n/g, "\n")) {
  console.log(`${local} is up to date`);
} else {
  writeFileSync(local, next);
  const added = [...used].filter((key) => !localValues.has(key));
  console.log(`Synced ${local}`);
  for (const key of added) console.log(`  added ${key}`);
  for (const [key] of custom) console.log(`  kept custom ${key}`);
}
