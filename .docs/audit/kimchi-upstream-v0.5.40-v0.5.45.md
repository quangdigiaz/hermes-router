# Kimchi upstream audit: v0.5.40–v0.5.45

Audit date: 2026-08-04 (workspace clock/session date)

## Reproducible upstream refs

- Repository: `https://github.com/quangdigiaz/hermes-router.git`
- Local remote: `upstream`
- `v0.5.40`: `79918c783` (full SHA: `git show -s --format=%H v0.5.40`)
- `v0.5.45`: `6fcd27337` (full SHA: `git show -s --format=%H v0.5.45`)
- `git merge-base --is-ancestor v0.5.40 v0.5.45`: verified by the interval diff.
- No local tags named `v0.5.41`, `v0.5.42`, `v0.5.43`, or `v0.5.44` were found. Those releases are therefore not independently attributable by tag in this checkout.

Commands used:

```sh
git tag --list 'v0.5.4*' | sort -V
git show -s --format='%H%n%ad%n%s' --date=iso-strict v0.5.40
git show -s --format='%H%n%ad%n%s' --date=iso-strict v0.5.45
git log --first-parent --format='%H|%ad|%s' --date=iso-strict v0.5.40..v0.5.45
git diff --name-status v0.5.40..v0.5.45
```

## Status rules

- `adopted + tested`: behavior is present in the current tree and covered by a focused or full test.
- `skipped + reason`: intentionally not ported because it would overwrite Hermes Router custom behavior or is outside Kimchi/shared contract scope.
- `irrelevant + proof`: upstream change does not affect Kimchi or a shared contract used by Kimchi.
- `unverified / external blocker`: source or live behavior cannot be proven from available refs/credentials.

## Kimchi/shared-contract matrix

| Upstream item/ref | Scope | Status | Evidence |
|---|---|---|---|
| `open-sse/providers/registry/kimchi.js` catalog/metadata changes between `v0.5.40..v0.5.45` | Kimchi registry | adopted + tested | Current registry retains canonical endpoint, OAuth metadata, model metadata, hybrid auth extension, and focused `kimchi-cli-config.test.js`. |
| Kimchi endpoint `https://llm.kimchi.dev/openai/v1/chat/completions` | Endpoint contract | adopted + tested | `kimchi.js`; `kimchi-cli-config.test.js`; full suite. |
| Kimchi OAuth metadata (`webAppUrl`, validation, user info, models URL) | OAuth/metadata | adopted + tested | `src/lib/oauth/providers/kimchi.js`; `kimchi-oauth-adapter.test.js`; registry invariant tests. |
| Kimchi API-key + OAuth auth descriptors | Auth/header | adopted + tested | `kimchi.js`; `DefaultExecutor.buildHeaders`; API-key/OAuth bearer assertions. |
| Dynamic Kimchi User-Agent | Header/runtime | adopted + tested | `open-sse/utils/kimchiUserAgent.js`; valid-tag, malformed-tag, offline fallback tests. Cache TTL 1h, timeout 1.5s, single-flight, semver validation. |
| Kimchi validation and model discovery | API routes | adopted + tested | `src/app/api/providers/validate/route.js`, `src/app/api/providers/[id]/models/route.js`; focused contract tests. |
| Kimchi streaming/Accept preservation | Streaming | adopted + tested | Registry `preserveAccept`; parser/stream tests; full suite. |
| Kimchi retry/error/fallback/cooldown | Resilience | adopted + tested locally | Existing account-fallback, retry, cooldown, and Kimchi quota tests; no live upstream credential proof. |
| Kimchi usage | Usage | adopted + tested locally | Full suite includes Kimchi usage/parser assertions; live quota API not exercised. |
| Kimchi model capabilities and parameter stripping | Capabilities | adopted + tested | `kimchi-cli-config.test.js`, capability and param-strip assertions. |
| Upstream catalog-only/provider additions in `v0.5.40..v0.5.45` | Unrelated providers | irrelevant + proof | `git diff --name-status ...` shows provider-specific additions with no Kimchi/shared Kimchi path impact; excluded from this Kimchi migration. |
| Upstream Kiro/Devin/Cursor/UI changes | Other shared features | skipped + reason | Preserved or independently migrated in the current dirty/ahead worktree; not evidence of Kimchi parity. Avoided claiming them as Kimchi fixes. |
| Tags `v0.5.41`–`v0.5.44` | Release attribution | unverified / external blocker | Tags absent locally; no claim made about per-release boundaries. |
| Live Kimchi API-key/OAuth chat/stream/usage/retry/error/fallback | External integration | unverified / external blocker | No live Kimchi credentials/sandbox available. Contract tests are not live proof. |
| Live TTS smoke gate | External integration | external blocker | `all-endpoints-robust.test.js`: 24 passed, 1 failed, 2 skipped; `TTS > reachable sample TTS models` timed out at 5000ms. Reproduced standalone. Not weakened. |

## Custom Hermes Router protection matrix

Verified markers/tests remain present for ACL (`isProviderAllowed`, `isComboAllowed`, `isKindAllowed`), ZCode, Kimi/Kimchi parser, NVIDIA coercion, proxy selection, custom OAuth, Hermes Router branding, `APP_NAME = "hermes-router"`, Docker volume `hermes-router-data`, retry/cooldown, model/capability overrides, and custom-provider connections. Evidence: `agent.md`, `AGENTS.md`, `tests/unit/post-merge-verification.test.js`, focused/full test runs, and source marker scan.

No commit, push, reset, rebase, cherry-pick, or DB-volume mutation was performed.

## Verification snapshot

- Focused Kimchi/post-merge suite: **5 files passed, 64 tests passed**.
- Full suite: **211 files passed, 13 skipped; 2627 passed, 19 expected fail, 84 skipped**.
- `pnpm run lint`: **0 errors, 209 warnings**.
- `pnpm run lint:reacthooks`: **clean**.
- `node scripts/lint-undef.cjs`: **clean**.
- `pnpm run build`: **success**.
- UI smoke: `/` `200`; `/login` `307` to `/masuk`.

This artifact intentionally does not claim complete upstream parity while release tags, live Kimchi credentials, and the TTS external smoke remain unresolved.
