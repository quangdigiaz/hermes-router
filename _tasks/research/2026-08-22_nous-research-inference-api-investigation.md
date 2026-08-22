# Investigation: Nous Research Inference API (OmniRoute Reference)

**Date:** 2026-08-22
**Source:** User-provided OAS 3.0 `Nous Research Inference API 1.0.0` — `https://inference-api.nousresearch.com/v1`, checked against OmniRoute codebase (`_external/omnirouter`)
**Goal:** Đánh giá tích hợp Nous Inference vào Hermes Router (không hardcode pricing/models)

---

## 1. API Overview (OAS 3.0)

- **Base URL:** `https://inference-api.nousresearch.com/v1`
- **Compat:** OpenAI-compatible (dùng được với mọi OpenAI SDK: `baseURL = https://inference-api.nousresearch.com/v1`, `Authorization: Bearer <API_KEY>`)
- **Endpoints:**
  - `POST /v1/chat/completions` — Chat Completion (OpenAI schema)
  - `POST /v1/completions` — Completion (legacy)
  - Schemas: `HTTPValidationError` / `ValidationError` (422), OAS standard
- **Servers:** Duy nhất `inference-api.nousresearch.com` (không có regional alias như Gemini/Anthropic)

---

## 2. Auth & Payment — 2 chế độ

### Option 1: API Key + Credits (khuyên dùng cho Hermes)
1. Register `https://portal.nousresearch.com`
2. Add credits / subscription → Generate API key
3. `Authorization: Bearer <key>` trên mọi request

### Option 2: x402 (beta, Solana USDC, pay-per-request)
- Không cần account/key, ẩn danh hơn
- Quy trình: Request không có `Authorization` → 402 `payment requirement` → client tự sign `X-PAYMENT` header (x402 spec) bằng Solana wallet USDC → retry với `X-PAYMENT`
- **Lưu ý quan trọng:** Phải set `max_tokens` explicit, nếu không default cao → bị charge theo `max_tokens` default dù actual usage thấp. Có surcharge nhỏ khi dùng x402.
- **Hermes khuyến nghị:** Không dùng x402 cho routing (không cacheable, không retry an toàn). Chỉ để tham khảo.

---

## 3. Pricing & Usage

- **Charged by consumed tokens** (input + output), không theo request count.
- `https://portal.nousresearch.com` có per-model pricing (không hardcode trong Hermes — sẽ fetch hoặc dùng `pricing.js` fallback).
- **Deals:** Không có 2×/5× như Command Code; pricing là direct API rate.

---

## 4. Rate Limits (API Key Tier)

| Tier | RPM | TPM |
|---|---|---|
| **Free** | 50 | 500,000 |
| **Plus** | 400 | 8,000,000 |
| **Super** | 800 | 8,000,000 |
| **Ultra** | 1,600 | 16,000,000 |
| **Default paid** | 180 | 720,000 |

- `Ultra` là cao nhất hiện tại (16M TPM). OmniRoute nếu route Nous chắc phải respect `Retry-After` 429.
- Hermes `accountFallback` đã có exponential backoff + `checkFallbackError` — chỉ cần map 429 → cooldown.

---

## 5. Available Models (128k context)

| Model | Context | Ghi chú |
|---|---|---|
| `Hermes-4.3-36B` | 128k | Mid, reasoning capable |
| `Hermes-4-70B` | 128k | Balance |
| `Hermes-4-405B` | 128k | Flagship, đắt nhất, cần Ultra tier |

- Portal có thêm pricing/capabilities per model. Không có vision/image, chỉ `llm` (chat/completion).
- Tên model trong OAS là `Hermes-4-*`, không phải `nous/hermes` prefix — Hermes sẽ map `nous/Hermes-4-405B`.

---

## 6. Reasoning — Điểm đặc biệt

Hermes 4 / DeepHermes **không bật reasoning mặc định** — phải dùng 1 trong 2:

**A. System prompt (khuyên dùng):**
```
You are a deep thinking AI, you may use extremely long chains of thought to deeply consider the problem and deliberate with yourself via systematic reasoning processes to help come to a correct solution prior to answering. You should enclose your thoughts and internal monologue inside <think> </think> tags, and then provide your solution or response to the problem.
```

**B. Prefill `<think>` trong assistant response** (completions / khi control được assistant turn):
- Prefill `<think>` → reasoning cũng nằm trong `<think></think>` tags.

**Vị trí output:**
- **DeepHermes 3:** luôn trong `<think></think>` giữa content
- **Hermes 4 + prefill `<think>`:** cũng trong tags
- **Hermes 4 + system prompt (không prefill):** reasoning nằm trong `reasoning_content` field (OpenAI `reasoning_content` delta), không trong tags

→ Hermes `translator/concerns/thinkingUnified.js` đã hỗ trợ `reasoning_content` extraction — không cần hardcode thêm, chỉ cần ensure `extractThinking` lấy `reasoning_content` cho Nous.

---

## 7. OmniRoute Tham Chiếu

- `_external/omnirouter` hiện **không có** `open-sse/providers/registry/nous.js` — Nous chưa được thêm như provider riêng (grep `nous` chỉ ra CHANGELOG mention Hermes model, không phải provider).
- Nếu OmniRoute có integrate, sẽ là `openai-compatible` provider `baseUrl: https://inference-api.nousresearch.com/v1`, `validateUrl: /v1/models`, `features: {fetchModels:true, usage:true}` — pattern giống `deepseek`/`groq`.
- Không có x402 handling trong OmniRoute (chỉ bearer).

---

## 8. Đề Xuất Tích Hợp Hermes (Không Hardcode)

### Registry `open-sse/providers/registry/nousresearch.js` (new)
```js
export default {
  id: "nousresearch",
  alias: "nous",
  display: { name: "Nous Research", icon: "psychology", color: "#7C3AED", website: "https://portal.nousresearch.com" },
  category: "apikey",
  transport: {
    baseUrl: "https://inference-api.nousresearch.com/v1/chat/completions",
    validateUrl: "https://inference-api.nousresearch.com/v1/models",
    format: "openai",
  },
  models: [
    { id: "Hermes-4-405B", name: "Hermes 4 405B (128k)" },
    { id: "Hermes-4-70B", name: "Hermes 4 70B (128k)" },
    { id: "Hermes-4.3-36B", name: "Hermes 4.3 36B (128k)" },
  ],
  modelsFetcher: { url: "https://inference-api.nousresearch.com/v1/models", type: "openai" },
  passthroughModels: true,
  features: { fetchModels: true, usage: true },
}
```
- `passthroughModels:true` để không hardcode “Available models” docs table — live từ `/v1/models` (same registry backing `--list-models` pattern như Command Code).
- Pricing: không hardcode — dùng `getPricingForModel` fallback + live fetch nếu `/v1/models` trả pricing, hoặc `portal.nousresearch.com` pricing.

### Usage
- `open-sse/services/usage/nousresearch.js` → `GET /v1/usage` (nếu có) hoặc fallback `message: "Usage via portal.nousresearch.com"`.
- Rate limit 429 → `accountFallback` đã handle.

### Reasoning
- Không cần code mới — đảm bảo `src/sse/handlers/chat.js` truyền system prompt reasoning khi `model.includes("hermes")` hoặc để user tự inject. `thinkingUnified` đã parse `reasoning_content`.

---

## 9. Rủi Ro & Lưu Ý

- **x402:** Không khuyến nghị cho Hermes routing — surcharge + charge theo `max_tokens` default nếu quên set → bill shock. Chỉ API key.
- **Context 128k:** Nhỏ hơn 1M của Gemini/Claude — `getModelLimits` cần set `maxContext:128000` cho 3 models.
- **Free tier 50 RPM:** Dễ 429 nếu burst — `cost-saver` nên weight latency thấp cho Nous để tránh chọn khi đang rate-limit.
- **Không hardcode docs table:** “Available models” trong file này chỉ snapshot 2026-08-22 — source of truth là `GET /v1/models` và portal.

---

## 10. References

- OAS 3.0 snippet do user cung cấp (Base URL, auth x402, rate limits, models, reasoning, servers)
- `https://portal.nousresearch.com` (pricing, key gen)
- `https://inference-api.nousresearch.com/v1` (OpenAI compat)
- `_external/omnirouter` — grep `nous` (CHANGELOG only)
- Hermes `open-sse/providers/registry/*.js` pattern, `translator/concerns/thinkingUnified.js`, `src/lib/db/repos/pricingRepo.js`
