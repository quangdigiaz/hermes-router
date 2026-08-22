# Plan: Port 5 Orca Optimizations — Cost-Saver + Cache Pricing

**Date:** 2026-08-22
**Research:** `_tasks/research/2026-08-22_orca-router-lite-cost-saver-cache-investigation.md`
**Status:** ✅ Completed (2026-08-22, --auto, pushed e462740a)
**Estimated Effort:** 0.5 day (P0 1h) + 2h (P1 prompt cache)
**Actual:** build pass (38.5s), targeted tests 56+39 pass, 5 files 251++
**Pushed:** `e462740a perf(orca-port): blended cost + dedup + prompt cache` + `6ed8a114 feat(commandcode): provider API + live pricing` + `b76676b0 feat(commandcode): usage limits widget`

---

## Problem Statement

Hermes `combo auto cost-saver` (health 0.25/cost 0.45/latency 0.15/tier 0.15) đã có `pricingCache 5s + scoreMemo 1.5s` nhưng vẫn:
- Dùng `input` only → rẻ ảo cho `mini`
- Không loại `cost=0` placeholder → cheapest ảo
- Không dedup sibling → retry thừa 400ms
- Không prompt cache → 0% hit cho deterministic requests
- `cost-saver` chọn `free` dù p95 chậm gấp 3x (45% weight)

OrcaRouter-Lite đã giải 5 điểm này gọn với blended cost + strict coverage.

---

## Solution: 5 Optimizations (theo ROI)

### P0 — Cost Accuracy (1h, 3 files)

**1. Blended Cost** `open-sse/services/combo.js:326-331`
```js
// before: cost = pricingTable[p][m].input
const pr = pricingTable?.[provider]?.[model]
cost = free ? 0 : promo ? (promo.promoInput*0.3 + promo.promoOutput*0.7)
           : pr ? (pr.input*0.3 + pr.output*0.7) : Infinity
// Fallback pr null → Infinity (đã có)
```
Đồng bộ với `open-sse/providers/pricing.js` (đã có `input/output`), Orca `_INPUT_WEIGHT=0.3`.

**2. Loại Unpriced `0`** `combo.js:349` sau `candidates` build
```js
if (!free && cost === 0) return null // placeholder litellm, không phải free
// Đã loại Infinity ở validCandidates filter, thêm dòng này
```

**3. Dedup Sibling + Strict Balanced** `combo.js:375-390` + new `open-sse/utils/canonicalModelBase.js`
- Port `canonical_model_base` regex Orca (`\d{4}-\d{2}-\d{2}|\d{6,}|\d{3,4}|v\d[\d.]*`, longest 3 segments)
- Trong `choose_auto_model` branched: `if (autoMode==="balanced") scored_models = [m if benchmark exists]; if (scored_models.length===0) fallback cheapest trong eligible` (copy Orca docstring)
- Dedup sau sort: `seen_bases Set<canonical>`, `deduped = []`, `final = deduped.slice(0, topN)` (topN = models.length, giữ nguyên)

**4. TTL & Invalidate** `combo.js:46, src/lib/db/repos/pricingRepo.js`
- `invalidateComboPricingCache()` đã có → gọi trong `updatePricing()`/`resetPricing()` (thêm 1 line `import { invalidateComboPricingCache } from "open-sse/services/combo.js"`)
- `scoreMemo` đã TTL 1.5s, pricing 5s — không đổi

### P1 — Prompt Cache (2h, new file)

**5. Cross-Provider Exact-Match Cache** `open-sse/services/promptCache.js` (new, port `app/prompt_cache.py`)
- Key: `hash(JSON.stringify({messages, model, temperature, seed}))` chỉ khi `temperature===0 || seed!=null`
- Backend: `Map` LRU 500 entry, TTL 1h, `max 500` evict oldest
- Hook: trong `src/sse/handlers/chat.js:80` trước `getComboModels`:
```js
if (body.temperature===0 || body.seed!=null) {
  const hit = promptCache.get(key)
  if (hit) return new Response(JSON.stringify(hit.body), { headers: {"x-orca-cache":"HIT"} })
}
```
- Miss: sau `handleChatCore` success, `promptCache.set(key, {body: json, expires: Date.now()+3600000})`
- Header: `x-orca-cache: HIT/MISS` như Orca
- Không Redis (single worker), không pub/sub

---

## File Structure

```
open-sse/services/
├── combo.js                 # MOD: blended cost, unpriced filter, dedup, strict balanced
├── promptCache.js           # NEW: LRU exact-match, 500/1h
└── usage/latencyTracker.js  # (đã wire recordLatency trước đó)
open-sse/utils/
└── canonicalModelBase.js    # NEW: port Orca regex
src/sse/handlers/
└── chat.js                  # MOD: prompt cache check/set
src/lib/db/repos/
└── pricingRepo.js           # MOD: call invalidateComboPricingCache()
```

---

## Implementation Phases

### Phase 1: P0 Cost Accuracy (1h)
- [ ] `combo.js` blended cost (input*0.3+output*0.7)
- [ ] Unpriced 0 filter
- [ ] `canonicalModelBase.js` + dedup
- [ ] Balanced strict drop + fallback cheapest
- [ ] Invalidate hook
- [ ] Unit test: `combo-cost-blended.test.js` (deepseek vs gpt-4o-mini blended wins)

### Phase 2: P1 Prompt Cache (2h)
- [ ] `promptCache.js` LRU 500/1h, hash key
- [ ] `chat.js` HIT path + MISS set
- [ ] Header `x-orca-cache`
- [ ] Test: `prompt-cache.test.js` (temp 0 hit, temp 0.7 miss, evict)

---

## Testing Strategy

```bash
pnpm test tests/unit/combo-cost-optimized.test.js
pnpm test tests/unit/prompt-cache.test.js
curl -X POST /v1/chat/completions -d '{"model":"combo/coding","temperature":0,"messages":[{"role":"user","content":"hi"}]}' -i # expect HIT on 2nd
curl /v1/analytics/savings?baseline=gpt-4o # compare blended vs input-only
```

---

## Success Metrics

| Metric | Before | After P0 | After P1 |
|---|---|---|---|
| Cost-saver picks cheapest true blended | ~70% | >95% | >95% |
| Sibling retry waste | 400ms | 0 | 0 |
| Cache hit $0 | 0% | 0% | 15-30% (deterministic) |
| DB reads / request | 1/5s | 1/5s | 1/5s |

---

## Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Blended weight bias output-heavy | Đo `analytics/savings` per-row token mix như Orca |
| Balanced empty khi benchmark thiếu | Fallback cheapest trong eligible |
| Prompt cache stale | TTL 1h + key includes model id |

---

## References

- Orca `app/auto_routing.py` _blended_cost, canonical_model_base, strict coverage
- Orca `app/router_cache.py` build_deployments
- Orca `app/prompt_cache.py` LRU/Redis
- Hermes `combo.js:30-56` pricingCache (đã có)
- `playbooks/plans/auto-combo-scoring/plan.md`

