# Plan: Cohere v2 Native Integration (Option A) — Translator + Registry

**Date:** 2026-08-22
**Mode:** `--hard` (translator 2 chiều + 11 SSE event types)
**Research:** `_tasks/research/2026-08-22_cohere-v2-chat-api-investigation.md`
**Status:** ✅ Completed (2026-08-22, --auto) — 11/11 tests pass, build pass
**Estimated Effort:** ~0.5-1 ngày
**Cook Command:** `/cook playbooks/plans/cohere-v2-native/plan.md --auto`

---

## Problem Statement

Hermes `cohere.js` đang dùng v1 deprecated (`api.cohere.ai/v1/chat/completions` — host sai, static 3 model cũ). Cohere v2 (`api.cohere.com/v2/chat`) là native schema KHÁC OpenAI:
* Request: `{model, messages[], stream, tools[], documents[], response_format, safety_mode, thinking, priority, strict_tools}`
* Response non-stream: `{id, finish_reason:"COMPLETE", message:{role:"assistant", content:[{type:"text",text}]}, usage:{billed_units}}`
* Stream SSE: 11 named events (`message-start/content-start/content-delta/content-end/tool-plan-delta/tool-call-start/tool-call-delta/tool-call-end/citation-start/citation-end/message-end`) — KHÁC OpenAI `data:{choices:[{delta}]}`

User chọn **Option A**: v2 native + translator riêng để có full features (thinking/priority/safety/documents).

---

## Solution Overview

Thêm format `cohere` vào translator pipeline (pivot KHÔNG qua OpenAI — direct route `openai↔cohere`), registry update, modelsFetcher live.

```
Client (openai/claude/gemini) 
  → translateRequest openai→cohere 
  → POST api.cohere.com/v2/chat 
  → translateResponse cohere→openai (non-stream) 
  → SSE event mapper cohere→openai (stream)
```

---

## Implementation Phases

### Phase 1: Schema Constants + Request Translator (~2h)

**Files:**
- `open-sse/translator/schema/index.js` — thêm `COHERE_BLOCK`, `COHERE_ROLE`, `COHERE_FINISH` enums (KISS: chỉ những khác OpenAI)
- `open-sse/translator/request/openai-to-cohere.js` — NEW

**Mapping rules (request):**
| OpenAI | Cohere v2 |
|---|---|
| `messages[].role: system` | giữ `system` (v2 hỗ trợ) |
| `messages[].role: assistant` | `assistant`, content string → `[{type:"text",text}]` |
| `messages[].role: tool` | `tool` role với `tool_results` shape |
| `messages[].content: [{image_url}]` | DROP (v2 chat không support image input — warn log) |
| `tools[]: {function:{name,description,parameters}}` | `{name, description, parameters:{json_schema...}}` flat |
| `tool_choice: "auto"/"none"/"required"` | `"REQUIRED"/"NONE"` hoặc omit |
| `response_format: {type:"json_object"}` | `response_format: {type:"json_object"}` passthrough |
| `max_tokens, temperature, seed, stop, frequency_penalty, presence_penalty` | passthrough (same names) |
| `top_p` | `p` |
| *(none)* | drop `n`, `logit_bias`, `user` |

Register: `register("openai", "cohere", reqFn)` — self-register import side-effect.

**Tests:** `tests/translator/openai-to-cohere.test.js`
- system → system
- content string → blocks array
- tools flatten function→flat
- tool_choice map
- image block → dropped + warn

---

### Phase 2: Response Translator Non-Stream (~1.5h)

**File:** `open-sse/translator/response/cohere-to-openai.js` — NEW

**Mapping rules (non-stream):**
| Cohere v2 | OpenAI |
|---|---|
| `{id}` | `{id}` |
| `finish_reason: COMPLETE/MAX_TOKENS/STOP_SEQUENCE/TOOL_CALL/ERROR/TIMEOUT` | `stop/length/stop/tool_calls/error/stop` |
| `message.content[{type:"text", text}]` | `choices[0].message.content = joined text` |
| `message.tool_calls[{id,type:function,function:{name,arguments(json str)}}]` | `choices[0].message.tool_calls[]` same shape |
| `usage.billed_units.{input,output}_tokens` | `usage.prompt_tokens/completion_tokens/total_tokens` |
| citations (nếu có) | append `[doc_N]` refs vào content text |

Register: `register("cohere", "openai", resFn)`.

**Tests:** snapshot-based như `tests/translator/` pattern hiện tại — 5 cases (text only, tool_call, max_tokens, usage mapping, multi-block join).

---

### Phase 3: Streaming SSE Mapper (~3h, nặng nhất)

**File:** `open-sse/handlers/chatCore/cohereStreamHandler.js` — NEW (hoặc extend `streamingHandler.js` nếu pattern cho phép)

**Event mapping (11 types):**
| Cohere event | OpenAI chunk |
|---|---|
| `message-start` | first chunk `{id, choices:[{delta:{role:"assistant"}}]}` |
| `content-start` | ignore (no-op) |
| `content-delta {delta.message.content.text}` | `{choices:[{delta:{content:text}}]}` |
| `content-end` | ignore |
| `tool-plan-delta` | ignore (or map to reasoning_content nếu client claude) |
| `tool-call-start` | buffer start `{index}` |
| `tool-call-delta {delta.message.tool_calls.function.arguments}` | `{choices:[{delta:{tool_calls:[{index, function:{arguments}}]}}]}` |
| `tool-call-end` | finalize tool call |
| `citation-start/end` | buffer citation, append cuối |
| `message-end {delta.finish_reason, delta.usage}` | final chunk with `finish_reason` mapped + `usage` |

**Parser:** SSE `event:` line parsing — reuse `open-sse/utils/sse.js` nếu có helper; nếu không viết parser nhỏ (split `\n\n`, parse `event:` + `data:` lines).

**Tests:** `tests/unit/cohere-stream-mapping.test.js` — feed sample event stream từ docs (message-start → content-delta×N → message-end), assert output OpenAI chunks đúng thứ tự + usage.

---

### Phase 4: Registry Update (~30p)

**File:** `open-sse/providers/registry/cohere.js` — MOD

```js
export default {
  id: "cohere",
  alias: "cohere",
  display: {...keep, notice updated},
  category: "apikey",
  transport: {
    baseUrl: "https://api.cohere.com/v2/chat",
    validateUrl: "https://api.cohere.com/v1/models",
    format: "cohere",   // ← triggers direct route
  },
  models: [],           // ← empty, live from fetcher
  modelsFetcher: { url: "https://api.cohere.com/v1/models", type: "openai" },
  passthroughModels: true,
  features: { fetchModels: true },
};
```

**Import side-effect:** thêm `import "./request/openai-to-cohere.js"` + `import "./response/cohere-to-openai.js"` vào `open-sse/translator/index.js`.

---

### Phase 5: Tests + Verify (~1h)

- [ ] Unit tests Phase 1-3 pass
- [ ] Snapshot tests translator pair (golden file)
- [ ] `pnpm run build` pass
- [ ] Manual smoke: `curl /v1/chat/completions -d '{"model":"cohere/command-a-plus-05-2026","messages":[...]}'` với real key → 200 + content
- [ ] Stream smoke: same + `"stream":true` → SSE chunks đúng OpenAI shape

---

## File Structure

```
open-sse/translator/
├── schema/index.js                    # MOD: COHERE_* enums
├── request/openai-to-cohere.js        # NEW
├── response/cohere-to-openai.js       # NEW
└── index.js                           # MOD: imports
open-sse/handlers/chatCore/
└── cohereStreamHandler.js             # NEW (SSE 11-event mapper)
open-sse/providers/registry/
└── cohere.js                          # MOD: v2 URL + fetcher + passthrough
tests/
├── translator/openai-to-cohere.test.js        # NEW
└── unit/cohere-stream-mapping.test.js         # NEW
```

---

## Risks & Mitigations

| Risk | Mitigation |
|---|---|
| SSE parser sai thứ tự event | Test với sample stream từ docs verbatim |
| Tool call streaming phức tạp | Buffer start/delta/end rồi emit 1 lần khi end (đơn giản hóa, chấp nhận delay nhỏ) |
| Citation format không rõ | Append dạng `[1][2]` plain text, log raw để debug |
| Models fetcher trả shape lạ | Dùng `type:"openai"` đã có sẵn trong `fetchModelsFetcherIds` |
| Client gọi model cũ (command-r-08-2024) | Passthrough — upstream sẽ 400 unsupported_model, error message rõ |

---

## Out of Scope (YAGNI)

- Claude→Cohere direct route (pivot qua OpenAI đủ)
- Documents/citations RAG native mapping (chỉ append text)
- Image input (v2 chat không support)
- Usage tracking riêng cho Cohere (dùng chung `usageTracking.js`)

---

## Success Metrics

| Metric | Target |
|---|---|
| Translator unit tests | 100% pass |
| Stream mapping test | 11 event types covered |
| Build | pass |
| Smoke curl non-stream + stream | 200 + đúng shape |
