# Investigation: Gỡ Codestral `codestral.mistral.ai`

**Date:** 2026-08-22
**Request:** Tương tự Cerebras/Blackbox, gỡ Codestral lane
**Scope:** `open-sse/providers/registry/codestral.js`

---

## 1. Where It Appears

| File | Provider | BaseUrl | Models |
|---|---|---|---|
| `codestral.js:15-16` | `codestral` (priority 50, apikey) | `https://codestral.mistral.ai/v1/{chat/completions,models}` | 2 `codestral-2508, codestral-latest` |

---

## 2. Impact If Removed

- Mất lane `codestral` — `codestral/codestral-latest` sẽ 503 nếu không có `mistral` cover.
- Codestral models cũng có trong `mistral` registry nên không mất model hoàn toàn.

---

## 3. Removal Plan — Option A

1. Xóa `codestral.js`
2. Gỡ `p20` import + export trong `index.js`
3. Bump version `1.4.5 → 1.4.6` (patch, gỡ provider)

