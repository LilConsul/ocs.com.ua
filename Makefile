.PHONY: env install-dev test test-fe test-infra

env:
	node scripts/sync-env.mjs

install-dev:
	cd application/frontend && bun install
	cd application/infra && uv sync
	pre-commit install --hook-type pre-commit --hook-type pre-push

test: test-fe test-infra

test-fe:
	cd application/frontend && bun test

test-infra:
	cd application/infra && uv run pytest tests/ -v
