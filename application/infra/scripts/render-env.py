#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = ["pyyaml>=6"]
# ///
"""Reads a secrets manifest YAML and the GitHub secrets/variables JSON objects
passed via environment variables, then prints the server env file content.

Usage (called by the deploy workflow, working directory application/frontend):
    uv run ../infra/scripts/render-env.py ../../.github/secrets.dev.yaml

The workflow passes ${{ toJSON(secrets) }} as GH_SECRETS and
${{ toJSON(vars) }} as GH_VARS in its env: block.
"""

import json
import os
import re
import sys

import yaml


def render_env(manifest: dict, secrets: dict, variables: dict) -> str:
    lines: list[str] = []

    def process_mapping(mapping: dict, source: dict, label: str) -> None:
        for gh_name, env_name in mapping.items():
            value = source.get(gh_name)
            if not value:
                raise ValueError(
                    f'Required {label} "{gh_name}" is missing or empty in the provided context.'
                )
            if re.search(r"[\r\n]", value):
                raise ValueError(
                    f'Value for "{gh_name}" contains a newline character, '
                    "which is not allowed in an env file."
                )
            escaped = value.replace("\\", "\\\\").replace('"', '\\"')
            lines.append(f'{env_name}="{escaped}"')

    if "secrets" in manifest:
        process_mapping(manifest["secrets"], secrets, "secret")
    if "variables" in manifest:
        process_mapping(manifest["variables"], variables, "variable")

    return "\n".join(lines) + "\n"


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: render-env.py <path-to-manifest.yaml>", file=sys.stderr)
        sys.exit(1)

    with open(sys.argv[1]) as f:
        manifest = yaml.safe_load(f)

    try:
        gh_secrets = json.loads(os.environ.get("GH_SECRETS", "{}"))
        gh_vars = json.loads(os.environ.get("GH_VARS", "{}"))
    except json.JSONDecodeError as e:
        print(f"Failed to parse GH_SECRETS or GH_VARS as JSON: {e}", file=sys.stderr)
        sys.exit(1)

    try:
        sys.stdout.write(render_env(manifest, gh_secrets, gh_vars))
    except ValueError as e:
        print(e, file=sys.stderr)
        sys.exit(1)
