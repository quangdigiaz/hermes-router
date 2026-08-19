# Hermes Router — Project Context

## Apa ini
AI proxy router (Next.js 16) yang berjalan lokal sebagai middleware antara CLI tools (Claude Code, Cursor, Codex, Cline...) dan berbagai AI provider. Baca `README.md` untuk detail lengkap.

## Stack
- **Runtime**: Node.js 20+ | **Framework**: Next.js 16 | **UI**: React 19 + Tailwind CSS 4
- **DB**: SQLite (`better-sqlite3` / `node:sqlite` / `sql.js` fallback) di `~/.hermes-router/db/data.sqlite`
- **Streaming**: SSE | **Auth**: OAuth 2.0 (PKCE) + JWT + API Keys

## Struktur penting
```
src/          - Next.js app (dashboard UI + API routes)
open-sse/     - Core engine: executor, handler, translator, RTK
  executors/  - Per-provider HTTP dispatch (default.js, base.js, dll.)
  handlers/   - chatCore.js = main request pipeline
  translator/ - Format conversion (OpenAI ↔ Claude ↔ Gemini ↔ Kiro ↔ Vertex)
  rtk/        - Token compression (RTK + Caveman)
  utils/      - errorLog.js, stream, proxyFetch, dll.
cli/          - npm package `hermes-router` (published)
tests/unit/   - Vitest unit tests
```

## Dev workflow
```bash
# Dev mode
PORT=20127 NEXT_PUBLIC_BASE_URL=http://localhost:20127 npm run dev

# Build + restart (production, sesuai agent.md)
pnpm run build
cp -r public .next/standalone/public
cp -r .next/static .next/standalone/.next/static
PORT=3003 pm2 restart hermes-router --update-env && pm2 save

# Run tests
cd tests && node_modules/.bin/vitest run
cd tests && node_modules/.bin/vitest run unit/kimi-nvidia-hardening.test.js
```

## Konvensi kode
- ES Modules (`import/export`), bukan CommonJS
- Error logging pakai `logGatewayError()` dari `open-sse/utils/errorLog.js`
- Error classes: `POLICY`, `PROVIDER`, `STREAM`, `TOOL_CALL`, `TOKEN`, `AUTH`, `TIMEOUT`, `PARSE`, `UNKNOWN`
- Policy errors (client mistake): set `err.isPolicyError = true` + `err.statusCode = 400`
- Jangan tambah code yg tidak diperlukan — minimal viable implementation

## Provider model naming
Format: `{provider_alias}/{model_id}`, contoh: `nvidia/moonshotai/kimi-k2.6`, `kr/claude-sonnet-4.5`

## Error log location
`/var/lib/hermes-router/logs/gateway-errors.jsonl`
