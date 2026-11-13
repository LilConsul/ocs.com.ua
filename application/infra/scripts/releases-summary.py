#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = []
# ///
"""Turns the release listing of a deploy into the Markdown table of the run summary.

The deploy job lists the releases left on the server, one per line, tab-separated:

    <release directory name>  <"live" or "-">  <release.json on one line, or empty>

and pipes it here:

    ... | uv run application/infra/scripts/releases-summary.py https://ocs.com.ua \
            --repo-url https://github.com/LilConsul/ocs.com.ua >> "$GITHUB_STEP_SUMMARY"
"""

import argparse
import json
import re
import sys


def parse(lines: list[str]) -> list[dict]:
    releases = []
    for line in lines:
        if not line.strip():
            continue
        name, live, *rest = line.rstrip("\n").split("\t")
        info = {}
        if rest and rest[0].strip():
            try:
                info = json.loads(rest[0])
            except json.JSONDecodeError:
                info = {}
        releases.append({"name": name, "live": live == "live", **info})
    return releases


def cell(text: str) -> str:
    """Keeps a value from breaking the Markdown table."""
    return text.replace("|", "\\|").replace("\n", " ")


def table(site: str, repo_url: str, releases: list[dict]) -> str:
    rows = [
        f"### Releases on the server ({site})",
        "",
        "| Release | | Commit | Deployed |",
        "| --- | --- | --- | --- |",
    ]
    for r in releases:
        commit = r.get("commit") or r["name"].rsplit("-", 1)[-1]
        short = commit[:7]
        is_commit = re.fullmatch(r"[0-9a-f]{7,40}", commit) is not None
        link = f"[`{short}`]({repo_url}/commit/{commit})" if is_commit else ""
        message = cell(r.get("message", ""))
        live = "**live**" if r["live"] else ""
        rows.append(
            f"| `{r['name']}` | {live} | {link} {message} | {r.get('deployed', '')} |"
        )
    rows += [
        "",
        "Roll back with **Actions → Rollback**, giving a release name (empty = the one before the live one).",
        "",
    ]
    return "\n".join(rows)


def main(argv: list[str] | None = None) -> int:
    # UTF-8 whatever the console default (Windows: cp1252); the table has non-ASCII text
    sys.stdout.reconfigure(encoding="utf-8")
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("site")
    parser.add_argument("--repo-url", required=True)
    args = parser.parse_args(argv)
    sys.stdout.write(
        table(args.site, args.repo_url.rstrip("/"), parse(sys.stdin.readlines()))
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
