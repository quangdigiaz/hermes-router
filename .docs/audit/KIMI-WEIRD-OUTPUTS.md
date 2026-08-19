# Kimi K2.6 / K2.7 — Weird Output Examples

> Real captured examples from Hermes Router dev server + Kimchi API (Cast AI).
> Use these to diagnose Kimi-specific issues in AI agent routing/translation layers.

## Bug 1: Native Kimi Tool-Call Markup Leaks Into `content`

**Model**: Kimi K2.6 (Kimchi / Cast AI)
**Trigger**: Request with `tools` declared, model decides to call a tool
**Impact**: Client sees raw markup text instead of structured `tool_calls` array

### Example (raw upstream response from Kimchi)

```json
{
  "choices": [{
    "index": 0,
    "finish_reason": "stop",
    "message": {
      "role": "assistant",
      "content": " <|tool_calls_section_begin|> <|tool_call_begin|> functions.bash:0 <|tool_call_argument_begin|> {\"command\": \"echo \\\"=== PROJECTS ===\\\" && ls -d */ 2>/dev/null || echo \\\"No project dirs\\\" && echo && echo \\\"=== RAM ===\\\" && free -h 2>/dev/null || vm_stat 2>/dev/null || cat /proc/meminfo 2>/dev/null | head -5\"} <|tool_call_end|> <|tool_calls_section_end|>",
      "tool_calls": null,
      "reasoning_content": null
    }
  }]
}
```

### What's Wrong

- `tool_calls` is `null` — the structured OpenAI tool_calls array is empty
- `content` contains Kimi's **native token-based tool-call markup** (`<|tool_calls_section_begin|>`, `<|tool_call_begin|>`, etc.)
- `finish_reason` is `"stop"` instead of `"tool_calls"`
- The model **did** decide to call a tool — it just emitted it in Kimi's proprietary format, not OpenAI's structured format
- Any OpenAI-compatible client (OpenCode, Cline, etc.) will display this as plain text, not execute the tool

### Expected (OpenAI format)

```json
{
  "choices": [{
    "finish_reason": "tool_calls",
    "message": {
      "role": "assistant",
      "content": "",
      "tool_calls": [{
        "index": 0,
        "type": "function",
        "id": "functions.bash:0",
        "function": {
          "name": "bash",
          "arguments": "{\"command\": \"echo === PROJECTS === && ls -d */ 2>/dev/null || echo No project dirs && echo && echo === RAM === && free -h 2>/dev/null || vm_stat 2>/dev/null || cat /proc/meminfo 2>/dev/null | head -5\"}"
        }
      }]
    }
  }]
}
```

### Context

- **Sometimes** Kimchi returns proper structured `tool_calls` (verified: Hermes Router test with tools declared returned correct `tool_calls` array with `finish_reason: "tool_calls"`)
- **Other times** it returns the native markup in `content` — appears non-deterministic
- Hermes Router's `injectToolProtocolPrompt` (which tells the model to use structured tool_call mechanism) reduces but does not eliminate this
- A `parseKimiToolCalls(content)` function existed in git history (commit `eaf01669`) but was removed and is not wired into the response path

---

## Bug 2: Excessive Reasoning For Trivial Requests

**Model**: Kimi K2.6 (Kimchi)
**Trigger**: Any request (even "say OK")
**Impact**: 10-45 second latency per turn, excessive token usage

### Example 1 — "say OK" (820 chars of reasoning)

**User message**: `"say OK"`
**Final content**: `"Need?"` (5 chars)
**reasoning_content** (820 chars):

```
The user said "OK". This is a minimal acknowledgment with no specific request, question, or task. As the lazy senior developer persona, I should respond ultra-terse. No tool calls needed. Just acknowledge or prompt for what they need.

Possible responses:
- "?" (too terse, maybe confusing)
- "Next?"
- "What?"
- "Task?"
- "Need something?"

Given the persona: ultra-terse, telegraphic, abbreviate. One word when enough.

"Need?" or "Task?" seem appropriate. Or just "Go." But "Need?" is shortest and clearest.

Wait, the user might be confirming something from a previous turn, but there is no pre
```

### Example 2 — "say OK" (405 chars of reasoning)

**User message**: `"say OK"`
**Final content**: `"OK"` (2 chars)
**reasoning_content** (405 chars):

```
The user said "say OK". This is extremely simple. They want me to say "OK".

Constraints to follow:
- Ultra-terse. Maximum compression. Telegraphic.
- One word when one word enough.
- Pattern: [thing] → [result]. [fix].
- No filler drift.
- ACTIVE EVERY RESPONSE.

So just respond with "OK". That's one word. No punctuation needed? The user said "say OK". I can just say:

OK

That's it. No extra fluff.
```

### Example 3 — "say OK" (345 chars of reasoning)

**User message**: `"say OK"`  
**Final content**: `"OK"` (2 chars)  
**reasoning_content** (345 chars):

```
The user said "say OK". This is extremely simple. Just say "OK". Follow the style constraints: ultra-terse, maximum compression. One word is enough.

No tools needed. Just respond.

Active constraints:
- Telegraphic. Abbreviate.
- One word when one word enough.
- Pattern: [thing] → [result]. [fix]. (But here just "OK" suffices)

So final: OK
```

### What's Wrong

- Model spends 345-820 chars of reasoning for a 2-char response
- Each reasoning block adds 8-45 seconds of latency
- `reasoning_effort: "none"` and `thinking: {type: "disabled"}` are **ignored by Kimchi** — model always generates reasoning
- The reasoning is stored in **two locations**: `message.reasoning_content` (sometimes) and `message.provider_specific_fields.reasoning` (always)
- Hermes Router's response strip only checked `message.reasoning_content`, missing the `provider_specific_fields` location

### Where Reasoning Lives (Kimchi response shape)

```json
{
  "message": {
    "content": "OK",
    "reasoning_content": " The user said...",
    "provider_specific_fields": {
      "refusal": null,
      "reasoning": " The user said...",
      "reasoning_content": " The user said..."
    }
  }
}
```

---

## Bug 3: Text-Only Reasoning Loop (No Tool Calls)

**Model**: Kimi K2.6 (Kimchi)
**Trigger**: Multi-turn conversation where a subagent fails; model repeats the same text response
**Impact**: Infinite loop, user must manually abort

### Example — "Subagent gagal" repeated

**Conversation history sent to model**:
```
user: "gunakan sub agent cek project ros2 itu untuk apa"
assistant: "Subagent gagal. Saya cek langsung."
assistant: "Subagent gagal. Saya cek langsung."
assistant: "Subagent gagal. Saya cek langsung."
```

**Model's response** (without loop guard): would continue `"Subagent gagal. Saya cek langsung."` indefinitely

### What's Wrong

- Model gets stuck repeating the same assistant message across turns
- **No `tool_calls` are emitted** — `detectLoop` (which only reads `tool_calls` arrays) cannot detect this
- The model is "thinking" about acting but never actually acts
- Each repetition wastes a full request cycle (10-45s per turn)

### Variants Observed

1. **Exact message repeat**: `"Subagent gagal. Saya cek langsung."` repeated 2-6 times
2. **Planning statement repeat**: `"I need to read the key files..."` repeated across multiple Thought blocks without any tool call
3. **Empty string repeat**: `" "` (single space) repeated across turns — model produces nothing but keeps going

### DB Evidence

42 instances found in request history where the same assistant message appeared ≥2 times in the conversation. The most common repeated message was `"Subagent gagal. Saya cek langsung."` (Indonesian: "Subagent failed. I'll check directly.").

---

## Bug 4: K2.7 Stops Mid-Response (Stall)

**Model**: Kimi K2.7 (Kimchi)
**Trigger**: First-turn request with no tools declared
**Impact**: Response appears to "stop" at planning, no action taken

### Example

**User**: `"cek apakah ada project bernama 9routes disini"`

**K2.7 response** (pre-fix):
```json
{
  "choices": [{
    "finish_reason": "stop",
    "message": {
      "content": "<|tool_calls_section_begin|> <|tool_call_begin|> functions.shell:0 <|tool_call_argument_begin|> {\"command\": \"ls -la | grep -i 9routes\", \"description\": \"Check for 9routes in current directory\"} <|tool_call_end|> <|tool_calls_section_end|>",
      "tool_calls": null
    }
  }]
}
```

### What's Wrong

- Model **correctly decides** to search for "9routes" (intent is correct)
- Model emits the tool call in **Kimi native markup** inside `content`, not in structured `tool_calls`
- Client sees a `"stop"` finish reason with text content → appears the model "stopped at planning"
- The model didn't stall — it called a tool, but the format is unparseable by OpenAI-compatible clients

### Difference from K2.6

K2.6 exhibits the same native-markup bug but **also** has the text-loop problem. K2.7's primary issue is the markup leak; it doesn't get stuck in text loops as frequently.

---

## Summary Table

| Bug | Models | Root Cause | Current Fix Status |
|---|---|---|---|
| Native markup in content | K2.6, K2.7 | Kimchi sometimes returns proprietary token format instead of OpenAI `tool_calls` | **Not fully fixed** — `parseKimiToolCalls` needs re-implementation in response translator |
| Excessive reasoning | K2.6 (all), K2.7 | Kimchi ignores `reasoning_effort`/`thinking` disable params; always generates reasoning | **Partially fixed** — response-side strip removes it from client view; upstream still generates (token waste) |
| Text-only loop | K2.6 | `detectLoop` only read `tool_calls`; text loops undetectable | **Fixed** — `detectTextRepeat` added, catches message + sentence repeats |
| K2.7 stall | K2.7 | Same as Bug 1 (markup leak looks like a stall) | **Same as Bug 1** |
