# Investigation: Gỡ Azure OpenAI `azure`

**Date:** 2026-08-22
**Request:** Tương tự DashScope/Bailian, gỡ Azure OpenAI lane
**Scope:** `open-sse/providers/registry/azure.js`, `open-sse/providers/registry/index.js`

---

## 1. Where It Appears

| File | Provider | Models | BaseUrl |
|---|---|---|---|
| `azure.js:1-21` | `azure` / `azure` (priority 40, apikey, hasProviderSpecificData) | **0 models** (empty, custom deployment per user) | `""` (trống, user tự điền `providerSpecificData` endpoint) |
| `index.js:8` | `import p8 from "./azure.js"` | — | — |
| `.next/cache` (build artifact) | — | — | — |

**Đặc điểm:** Không có `models`, `transport.baseUrl=""`, `hasProviderSpecificData:true` — Azure OpenAI dùng deployment URL riêng per-resource (`https://{instance}.openai.azure.com/openai/deployments/{deployment}`), không phải shared endpoint như DashScope.

---

## 2. Impact If Removed

- Mất lane `azure` — user dùng Azure OpenAI resource key sẽ không còn provider để chọn, phải chuyển sang `openai` compat với custom baseUrl (tự điền) hoặc `azure` custom node.
- Combo có `azure/<deployment>` sẽ 503 nếu không có provider khác.
- Không ảnh hưởng `openai`, `azure` không share model nào — xóa sạch.

---

## 3. Removal Plan — Option A (Xóa hẳn, như Alibaba)

1. Xóa `open-sse/providers/registry/azure.js`
2. Gỡ `p8` import + export trong `index.js`
3. Build + push

