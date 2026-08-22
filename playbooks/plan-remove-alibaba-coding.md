# Plan: Remove Alibaba Coding `coding.dashscope` / `coding-intl.dashscope`

**Date:** 2026-08-22
**Research:** `_tasks/research/2026-08-22_alibaba-coding-removal-investigation.md`
**Status:** Pending
**Issue:** Gỡ 2 lane Coding Plan như đã làm với DashScope Intl

---

## Problem Statement

`coding.dashscope.aliyuncs.com` và `coding-intl.dashscope.aliyuncs.com` là 2 provider Coding Plan (alicode 20, alicode-intl 10). User muốn gỡ tương tự DashScope Intl.

---

## Solution: Option A — Xóa hẳn

- Delete `open-sse/providers/registry/alicode.js`
- Delete `open-sse/providers/registry/alicode-intl.js`
- Remove `p2`/`p3` imports + exports in `index.js`

---

## Implementation Phases

### Phase 1: Delete Files
- [ ] Remove alicode.js (31 lines)
- [ ] Remove alicode-intl.js (30 lines)

### Phase 2: Clean Index
- [ ] Remove `import p2 from "./alicode-intl.js"` + `import p3 from "./alicode.js"`
- [ ] Remove `p2,p3` from export array

### Phase 3: Verify
- [ ] `git status` 2D +1M
- [ ] Commit + push

---

## References

- Research: `_tasks/research/2026-08-22_alibaba-coding-removal-investigation.md`
- Prev plan: `playbooks/plan-remove-dashscope-intl-alibaba.md` (Option A pattern)
