.PHONY: env install-dev

# Create application/frontend/.env.local from .env.example. If it already
# exists, append only the missing keys; existing values are never overridden.
env:
	node scripts/sync-env.mjs

# Install frontend dependencies and the git hooks from .pre-commit-config.yaml
# (requires bun and pre-commit: pip install pre-commit).
install-dev:
	cd application/frontend && bun install
	cd ../..
	pre-commit install --hook-type pre-commit --hook-type pre-push
