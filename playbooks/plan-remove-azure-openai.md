# Plan: Remove Azure OpenAI `azure`

**Date:** 2026-08-22
**Research:** `_tasks/research/2026-08-22_azure-openai-removal-investigation.md`
**Status:** ✅ Completed (2026-08-22)
**Issue:** Gỡ Azure OpenAI lane tương tự DashScope/Bailian

---

## Problem Statement

`azure` provider (priority 40) có `baseUrl=""` trống, 0 model, chỉ dùng khi user tự điền deployment URL. Muốn gỡ sạch như Alibaba lanes.

---

## Solution: Option A — Xóa hẳn

- Delete `open-sse/providers/registry/azure.js`
- Remove `p8` in `index.js`

---

## Implementation Phases

### Phase 1: Delete File
- [ ] Remove azure.js (21 lines)

### Phase 2: Clean Index
- [ ] Remove `import p8 from "./azure.js"`
- [ ] Remove `p8` from export

### Phase 3: Verify
- [ ] git status 1D+1M, build, push

---

## References

- Research: `_tasks/research/2026-08-22_azure-openai-removal-investigation.md`
- Prev: `plan-remove-alibaba-coding.md`
