# Investigation: Gỡ Alibaba Coding `coding.dashscope.aliyuncs.com` / `coding-intl.dashscope.aliyuncs.com`

**Date:** 2026-08-22
**Request:** Tương tự DashScope Intl, gỡ Alibaba Coding lane
**Scope:** `open-sse/providers/registry/alicode.js`, `alicode-intl.js`

---

## 1. Where It Appears

| File | URL | Provider | Models |
|---|---|---|---|
| `alicode.js:17` | `https://coding.dashscope.aliyuncs.com/v1/chat/completions` | **Alibaba Coding** (`alicode`, priority 20, domestic) | 8 `qwen3.5-plus, kimi-k2.5, glm-5, MiniMax-M2.5, qwen3-max-2026-01-23, qwen3-coder-next, qwen3-coder-plus, glm-4.7` |
| `alicode-intl.js:17` | `https://coding-intl.dashscope.aliyuncs.com/v1/chat/completions` | **Alibaba Coding Intl** (`alicode-intl`, priority 10) | 7 `qwen3.5-plus, kimi-k2.5, glm-5, MiniMax-M2.5, qwen3-coder-next, qwen3-coder-plus, glm-4.7` |

**Khác với DashScope Intl:** Host `coding.dashscope` là Coding Plan (keys khác Model Studio `sk-`), không phải `dashscope-intl`.

---

## 2. Impact If Removed

- Mất lane Coding Plan domestic + intl — user dùng Coding Plan key (`alicode`) sẽ không route `qwen3-coder-plus` etc. qua Coding nữa.
- Combo có `alicode/qwen3-coder-plus` sẽ 503 nếu không có provider khác cover same model (ví dụ `qwen` OAuth, `openrouter`).
- Domestic Qwen vẫn còn qua `qwen` OAuth provider — fallback có.

---

## 3. Removal Plan — Option A (Xóa hẳn, như DashScope Intl)

1. Xóa `alicode.js` + `alicode-intl.js`
2. Gỡ `p2` (alicode-intl) + `p3` (alicode) trong `index.js`
3. Build + push

## Evidence

- `alicode.js:17` `baseUrl: "https://coding.dashscope.aliyuncs.com/v1/chat/completions"`
- `alicode-intl.js:17` `baseUrl: "https://coding-intl.dashscope.aliyuncs.com/v1/chat/completions"`
