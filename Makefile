.PHONY: env install-dev

env:
	node scripts/sync-env.mjs

install-dev:
	cd application/frontend && bun install
	cd ../..
	pre-commit install --hook-type pre-commit --hook-type pre-push
