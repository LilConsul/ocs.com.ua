.PHONY: env

# Create application/frontend/.env.local from .env.example. If it already
# exists, append only the missing keys; existing values are never overridden.
env:
	node scripts/sync-env.mjs
