# Investigation: Gỡ Cerebras `api.cerebras.ai`

**Date:** 2026-08-22
**Request:** Tương tự Blackbox/Azure, gỡ Cerebras lane
**Scope:** `open-sse/providers/registry/cerebras.js`

---

## 1. Where It Appears

| File | Provider | BaseUrl | Models |
|---|---|---|---|
| `cerebras.js:17-18` | `cerebras` (priority 60, apikey, fetchModels) | `https://api.cerebras.ai/v1/{chat/completions,models}` (quirks dropClientMetadata) | 6 `gpt-oss-120b, zai-glm-4.7, llama-3.3-70b, llama-4-scout-17b-16e-instruct, qwen-3-235b-a22b-instruct-2507, qwen-3-32b` |

---

## 2. Impact If Removed

- Mất lane `cerebras` — combo `cerebras/qwen-3-32b` sẽ 503 nếu không có `qwen`/`together` cover.
- Models đều có lane gốc khác (qwen, llama, gpt-oss) nên không mất model hoàn toàn.

---

## 3. Removal Plan — Option A

1. Xóa `cerebras.js`
2. Gỡ `p14` import + export trong `index.js`
