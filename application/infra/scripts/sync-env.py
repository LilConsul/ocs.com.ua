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
 - GITHUB_OWNER, GITHUB_REPO, and GITHUB_BRANCH are always updated from the
   current git remote (origin) and checked-out branch.

Usage (from anywhere):
    uv run application/infra/scripts/sync-env.py
"""

import re
import shutil
import subprocess
import sys
from pathlib import Path

FRONTEND_DIR = Path(__file__).resolve().parents[2] / "frontend"
REPO_ROOT = Path(__file__).resolve().parents[3]
CUSTOM_HEADER = "# Custom variables (not in .env.example)"
ACTIVE = re.compile(r"^([A-Za-z_][A-Za-z0-9_]*)=")
COMMENTED = re.compile(r"^#\s*([A-Z_][A-Z0-9_]*)=")

# GitHub remote URL patterns:  https://github.com/OWNER/REPO.git  |  git@github.com:OWNER/REPO.git
_GH_HTTPS = re.compile(r"github\.com[:/]([^/]+)/([^/]+?)(?:\.git)?$")


def _git(*args: str) -> str:
    result = subprocess.run(
        ["git", *args],
        cwd=REPO_ROOT,
        capture_output=True,
        text=True,
    )
    return result.stdout.strip()


def _git_repo_info() -> dict[str, str]:
    """Return GITHUB_OWNER, GITHUB_REPO, GITHUB_BRANCH derived from the local git state."""
    remote_url = _git("remote", "get-url", "origin")
    branch = _git("branch", "--show-current")

    m = _GH_HTTPS.search(remote_url)
    if not m:
        return {}

    return {
        "GITHUB_OWNER": m.group(1),
        "GITHUB_REPO": m.group(2),
        "GITHUB_BRANCH": branch,
    }


def _lines(text: str) -> list[str]:
    return text.replace("\r\n", "\n").removesuffix("\n").split("\n")


def sync_env(
    example: str, local: str, overrides: dict[str, str] | None = None
) -> tuple[str, list[str], list[str], list[str]]:
    """Returns (new .env.local text, keys added, custom keys kept, keys overridden)."""
    local_values: dict[str, str] = {}
    for line in _lines(local):
        if match := ACTIVE.match(line):
            local_values[match.group(1)] = line

    # Apply git-derived overrides on top of whatever is in .env.local.
    if overrides:
        for key, value in overrides.items():
            local_values[key] = f"{key}={value}"

    used: dict[str, None] = {}
    out: list[str] = []
    for line in _lines(example):
        active = ACTIVE.match(line)
        match = active or COMMENTED.match(line)
        key = match.group(1) if match else None
        if key and key in local_values:
            # Value set locally (or via override) wins.
            out.append(local_values[key])
            used[key] = None
        else:
            out.append(line)
            if active:
                used[key] = None

    custom = [key for key in local_values if key not in used]
    if custom:
        out += ["", CUSTOM_HEADER, *(local_values[key] for key in custom)]

    applied_overrides = overrides or {}
    added = [key for key in used if key not in local_values and key not in applied_overrides]
    overridden = [key for key in applied_overrides if key in used]
    return "\n".join(out) + "\n", added, custom, overridden


def main() -> int:
    example_path = FRONTEND_DIR / ".env.example"
    local_path = FRONTEND_DIR / ".env.local"

    if not example_path.exists():
        print(f"{example_path} not found", file=sys.stderr)
        return 1

    git_overrides = _git_repo_info()

    if not local_path.exists():
        # Bootstrap from example, then immediately apply git overrides.
        shutil.copyfile(example_path, local_path)
        if git_overrides:
            bootstrapped = local_path.read_text(encoding="utf-8")
            new, _, _, _ = sync_env(
                example_path.read_text(encoding="utf-8"), bootstrapped, git_overrides
            )
            local_path.write_text(new, encoding="utf-8", newline="\n")
        print(f"Created {local_path} from {example_path}")
        for key, value in git_overrides.items():
            print(f"  set {key}={value}")
        return 0

    current = local_path.read_text(encoding="utf-8")
    new, added, custom, overridden = sync_env(
        example_path.read_text(encoding="utf-8"), current, git_overrides
    )
    if new == current.replace("\r\n", "\n"):
        print(f"{local_path} is up to date")
        return 0

    local_path.write_text(new, encoding="utf-8", newline="\n")
    print(f"Synced {local_path}")
    for key in added:
        print(f"  added {key}")
    for key in custom:
        print(f"  kept custom {key}")
    for key in overridden:
        print(f"  updated {key}={git_overrides[key]}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
