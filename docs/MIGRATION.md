# Migration Guide: Hermes Router → Hermes Router

This guide covers migrating an existing **Hermes Router** (quangdigiaz/hermes-router) installation to **Hermes Router** with zero downtime and full data preservation.

## What migrates

All data in your Hermes Router SQLite database transfers automatically:

- **Combos** (model routing configurations)
- **Provider connections** (API keys, OAuth tokens, account settings)
- **API keys** (Hermes/other client authentication)
- **Usage history** (request logs, cost tracking)
- **Settings** (password, strategies, proxy config)

Hermes Router auto-detects the legacy schema and upgrades it on first start.

## Prerequisites

- Docker installed
- Hermes Router running (any version) with data at `~/.hermes-router/`
- Hermes Router Docker image: `ghcr.io/quangdigiaz/hermes-router:latest`

## Step 1: Backup

```bash
# Full backup of Hermes Router data
cp -r ~/.hermes-router ~/backup-hermes-router-$(date +%Y%m%d_%H%M%S)

# Backup any config files that reference Hermes Router
# (e.g., Hermes Agent config, scripts, cron jobs)
```

## Step 2: Stop Hermes Router

```bash
docker stop hermes-router
```

Keep the container (don't `docker rm`) — it serves as your rollback option.

## Step 3: Prepare Hermes Router data directory

```bash
# Create Hermes Router data directory
mkdir -p ~/.hermes-router/

# Copy data from Hermes Router
cp -r ~/.hermes-router/db ~/.hermes-router/db
cp ~/.hermes-router/jwt-secret ~/.hermes-router/jwt-secret
cp ~/.hermes-router/machine-id ~/.hermes-router/machine-id
cp -r ~/.hermes-router/auth ~/.hermes-router/auth
cp -r ~/.hermes-router/mitm ~/.hermes-router/mitm 2>/dev/null || true
cp -r ~/.hermes-router/runtime ~/.hermes-router/runtime 2>/dev/null || true
```

## Step 4: Start Hermes Router

### Option A: Docker Compose (recommended)

```bash
# Copy environment template
cp .env.example .env
nano .env  # Set JWT_SECRET to match ~/.hermes-router/jwt-secret

# Start
docker compose up -d
```

### Option B: Docker run

```bash
# Read your existing JWT secret
JWT_SECRET=$(cat ~/.hermes-router/jwt-secret)

docker run -d --name hermes-router --restart unless-stopped \
  -p 20128:20128 \
  -v ~/.hermes-router:/app/data \
  -e PORT=20128 \
  -e HOSTNAME=0.0.0.0 \
  -e NODE_ENV=production \
  -e DATA_DIR=/app/data \
  -e JWT_SECRET="$JWT_SECRET" \
  -e API_KEY_SECRET="$JWT_SECRET" \
  -e REQUIRE_API_KEY=false \
  ghcr.io/quangdigiaz/hermes-router:latest
```

## Step 5: Verify

```bash
# Container running?
docker ps --filter name=hermes-router

# Dashboard accessible?
curl -s -o /dev/null -w "%{http_code}" http://localhost:20128/
# Expected: 200

# Check migration logs
docker logs hermes-router | grep -E "migrate|backup"
# Expected: [DB][migrate] App 0.5.x → 0.8.6 | schema 1 → 3 | backup: ...

# API responds?
API_KEY=$(sqlite3 ~/.hermes-router/db/data.sqlite "SELECT key FROM apiKeys WHERE isActive=1;")
curl -s -H "Authorization: Bearer $API_KEY" http://localhost:20128/v1/models | python3 -c "import sys,json; d=json.load(sys.stdin); print(f'Models: {len(d.get(\"data\",[]))}')"
```

Open the dashboard at `http://localhost:20128` and verify:
- All combos appear with correct model lists
- Provider connections show correct status
- Usage history is intact

## Step 6: Update dependent services

If you use **Hermes Agent** or another client:

- **Same port (20128)**: No config changes needed
- **Different port**: Update `base_url` in your client config

If you have auto-update crons for Hermes Router:

```bash
# Disable old Hermes Router update
# (method depends on your setup: systemd timer, crontab, or Hermes cron)

# Enable Hermes Router auto-update script (example: nightly)
# See scripts/hermes-router-docker-update.sh
```

## Rollback

If anything goes wrong:

```bash
# Stop Hermes Router
docker stop hermes-router
docker rm hermes-router

# Restart Hermes Router
docker start hermes-router
```

Your original data in `~/.hermes-router/` is untouched. Hermes Router data lives in `~/.hermes-router/`.

## Schema changes during migration

Hermes Router applies these automatic migrations on first start:

| Migration | What it does |
|-----------|-------------|
| 001-initial | Bootstrap tables (idempotent for existing DBs) |
| 002-fix-empty-allowed-lists | Convert empty ACL arrays `[]` to NULL (unrestricted) |
| 003-add-allowed-lists-columns | Add `allowedProviders`, `allowedCombos`, `allowedKinds` columns |

A backup is automatically created at `~/.hermes-router/db/backups/` before migration runs.

## Differences from Hermes Router

- **Image**: `ghcr.io/quangdigiaz/hermes-router` (not `quangdigiaz/hermes-router`)
- **Data dir**: `~/.hermes-router/` recommended (not `~/.hermes-router/`)
- **Headroom**: Optional sidecar for tool-history safety (not bundled)
- **Circuit breaker**: Built-in provider failure tracking (inspired by OmniRoute)
- **Active development**: Regular updates from upstream Hermes Router + community
