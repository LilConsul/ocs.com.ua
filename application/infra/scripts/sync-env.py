#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = []
# ///
"""Syncs application/frontend/.env.local with .env.example.

 - Missing file: copied from .env.example.
 - Existing file: rebuilt using the structure of .env.example (comments, blank
   lines, ordering, new keys) while keeping every value already set in
   .env.local. Keys that exist only in .env.local are kept in a block at the end.

Usage (from anywhere):
    uv run application/infra/scripts/sync-env.py
"""

import re
import shutil
import sys
from pathlib import Path

FRONTEND_DIR = Path(__file__).resolve().parents[2] / "frontend"
CUSTOM_HEADER = "# Custom variables (not in .env.example)"
ACTIVE = re.compile(r"^([A-Za-z_][A-Za-z0-9_]*)=")
COMMENTED = re.compile(r"^#\s*([A-Z_][A-Z0-9_]*)=")


def _lines(text: str) -> list[str]:
    return text.replace("\r\n", "\n").removesuffix("\n").split("\n")


def sync_env(example: str, local: str) -> tuple[str, list[str], list[str]]:
    """Returns (new .env.local text, keys added from the example, custom keys kept)."""
    local_values: dict[str, str] = {}
    for line in _lines(local):
        if match := ACTIVE.match(line):
            local_values[match.group(1)] = line

    used: dict[str, None] = {}
    out: list[str] = []
    for line in _lines(example):
        active = ACTIVE.match(line)
        match = active or COMMENTED.match(line)
        key = match.group(1) if match else None
        if key and key in local_values:
            # Value set locally wins, even if the example has it commented out.
            out.append(local_values[key])
            used[key] = None
        else:
            out.append(line)
            if active:
                used[key] = None

    custom = [key for key in local_values if key not in used]
    if custom:
        out += ["", CUSTOM_HEADER, *(local_values[key] for key in custom)]

    added = [key for key in used if key not in local_values]
    return "\n".join(out) + "\n", added, custom


def main() -> int:
    example_path = FRONTEND_DIR / ".env.example"
    local_path = FRONTEND_DIR / ".env.local"

    if not example_path.exists():
        print(f"{example_path} not found", file=sys.stderr)
        return 1

    if not local_path.exists():
        shutil.copyfile(example_path, local_path)
        print(f"Created {local_path} from {example_path}")
        return 0

    current = local_path.read_text(encoding="utf-8")
    new, added, custom = sync_env(example_path.read_text(encoding="utf-8"), current)
    if new == current.replace("\r\n", "\n"):
        print(f"{local_path} is up to date")
        return 0

    local_path.write_text(new, encoding="utf-8", newline="\n")
    print(f"Synced {local_path}")
    for key in added:
        print(f"  added {key}")
    for key in custom:
        print(f"  kept custom {key}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
