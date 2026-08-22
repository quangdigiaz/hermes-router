# Investigation: Gỡ Blackbox AI `api.blackbox.ai`

**Date:** 2026-08-22
**Request:** Tương tự Azure/DashScope/Bailian, gỡ Blackbox AI lane
**Scope:** `open-sse/providers/registry/blackbox.js`

---

## 1. Where It Appears

| File | Provider | BaseUrl | Models |
|---|---|---|---|
| `blackbox.js:25-26` | `blackbox` / `bb` (priority 50, apikey, thinking auto/none/low/medium/high/xhigh) | `https://api.blackbox.ai/v1/chat/completions` (thinkingFormat openai) | 10 proxy `blackboxai/*` → `claude-fable-5, opus-4.8, sonnet-4.6, gpt-5.5/5.4-pro/5.4/5.3-codex/5.4-nano, deepseek-v4-flash, grok-4.3` (upstream `blackboxai/...`) |

**Đặc điểm:** Không có `modelsFetcher`/`passthrough` — list cứng 10 model, wrap Anthropic/OpenAI/DeepSeek/xAI qua Blackbox proxy.

---

## 2. Impact If Removed

- Mất lane `blackbox`/`bb` — combo có `bb/claude-fable-5` sẽ 503 nếu không có `claude`/`openai` trực tiếp.
- Không ảnh hưởng provider khác — models đều có lane gốc (claude, gpt, deepseek, grok).

---

## 3. Removal Plan — Option A (Xóa hẳn)

1. Xóa `blackbox.js`
2. Gỡ `p10` import + export trong `index.js`
