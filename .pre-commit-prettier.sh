#!/bin/bash
# Prettier wrapper for pre-commit hook
# This script changes to the frontend directory and runs prettier with the correct paths

cd application/frontend || exit 1

# Convert absolute paths to relative paths from frontend directory
files=()
for file in "$@"; do
    # Remove the project root path to get relative path
    rel_path="${file#$PWD/}"
    # If still starts with application/frontend/, remove that too
    rel_path="${rel_path#application/frontend/}"
    files+=("$rel_path")
done

# Run prettier with the relative paths
npx prettier --write --ignore-unknown "${files[@]}"
