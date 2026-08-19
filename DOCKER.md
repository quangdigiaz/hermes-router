# Docker

Run Hermes%20Router in a container. Published images:
- GHCR: [`ghcr.io/quangdigiaz/hermes-router`](https://github.com/quangdigiaz/hermes-router/pkgs/container/Hermes%20Router)
- Docker Hub: [`quangdigiaz/hermes-router`](https://hub.docker.com/r/quangdigiaz/hermes-router)

Multi-platform `linux/amd64` + `linux/arm64`.

---

# 👤 For Users

## Quick start

```bash
docker run -d \
  -p 20128:20128 \
  -v "$HOME/.hermes-router:/app/data" \
  -e DATA_DIR=/app/data \
  --name hermes-router \
  ghcr.io/quangdigiaz/hermes-router:latest
```

App listens on port `20128`. Open: http://localhost:20128

## Manage container

```bash
docker logs -f hermes-router        # view logs
docker stop hermes-router           # stop
docker start hermes-router          # start again
docker rm -f hermes-router          # remove
```

## Data persistence

```bash
-v "$HOME/.hermes-router:/app/data" \
-e DATA_DIR=/app/data
```

Without `DATA_DIR`, the app falls back to `~/.hermes-router/` (macOS/Linux) or `%APPDATA%\hermes-router\` (Windows). In the container, `DATA_DIR=/app/data` makes the bind mount work.

Data layout under `$DATA_DIR/`:

```text
$DATA_DIR/
├── db/
│   ├── data.sqlite       # main SQLite database
│   └── backups/          # auto backups
└── ...                   # certs, logs, runtime configs
```

Host path: `$HOME/.hermes-router/db/data.sqlite`
Container path: `/app/data/db/data.sqlite`

Production requirements:
- Run one Hermes%20Router process per SQLite file. Multiple containers/processes with separate local volumes do not share proxy-pool fitness state.
- If scaling horizontally, provide a shared database/backend for routing state before enabling multiple app instances.
- Keep the persistent volume name `hermes-router-data`; renaming it creates a new empty database volume.
- Production requires a native SQLite driver. The `sql.js` fallback is single-process development fallback only.

## Optional env vars

```bash
docker run -d \
  -p 20128:20128 \
  -v "$HOME/.hermes-router:/app/data" \
  -e DATA_DIR=/app/data \
  -e PORT=20128 \
  -e HOSTNAME=0.0.0.0 \
  -e DEBUG=true \
  --name hermes-router \
  ghcr.io/quangdigiaz/hermes-router:latest
```

## Optional Headroom sidecar

Headroom is an optional sidecar service for tool-history safety and advanced request processing.

### Option A: Docker Compose (Recommended)

Use the provided `docker-compose.yml`:

```bash
# Copy and customize environment
cp .env.example .env
nano .env

# Start both services
docker compose up -d
```

### Option B: Manual Compose

Create your own `docker-compose.yml`:

```yaml
services:
  hermes-router:
    image: ghcr.io/quangdigiaz/hermes-router:latest
    container_name: hermes-router
    restart: always
    ports:
      - "20128:20128"
    volumes:
      - hermes-router-data:/app/data
    env_file:
      - .env
    environment:
      DATA_DIR: /app/data
      PORT: "20128"
      HOSTNAME: "0.0.0.0"
      NODE_ENV: production
      HEADROOM_URL: http://headroom:8787
    depends_on:
      - headroom

  headroom:
    image: ghcr.io/chopratejas/headroom:latest
    container_name: headroom
    restart: always
    ports:
      - "8787:8787"

volumes:
  hermes-router-data:
    name: hermes-router-data
```

### Option C: Separate Containers

Run Headroom independently:

In the dashboard, open `Endpoint` → `Token Saver` → `Headroom`, confirm the URL is `http://headroom:8787`, recheck status, then enable Headroom.

If Headroom runs on the Docker host instead of as a sidecar, use `http://host.docker.internal:8787` on macOS/Windows. On Linux, add `--add-host=host.docker.internal:host-gateway` or the equivalent compose `extra_hosts` entry.

## Update to latest

```bash
docker pull ghcr.io/quangdigiaz/hermes-router:latest
docker rm -f hermes-router
# re-run the quick start command
```

---

# 🛠 For Developers

## Build image locally (test)

```bash
docker build -t hermes-router .

docker run --rm -p 20128:20128 \
  -v "$HOME/.hermes-router:/app/data" \
  -e DATA_DIR=/app/data \
  hermes-router
```

## Publish (automatic via CI)

Push a git tag `v*` → GitHub Actions builds multi-platform (amd64+arm64) and pushes to:
- `ghcr.io/quangdigiaz/hermes-router:v{version}` + `:latest`
- `quangdigiaz/hermes-router:v{version}` + `:latest`

```bash
# Create git tag and push
git tag v0.7.x && git push origin v0.7.x
```

Workflow: `.github/workflows/release.yml`
