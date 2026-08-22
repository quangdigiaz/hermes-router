# Plan: Remove DashScope Intl `dashscope-intl.aliyuncs.com` (Alibaba Lane)

**Date:** 2026-08-22
**Research:** `_tasks/research/2026-08-22_dashscope-intl-removal-investigation.md`
**Status:** ✅ Completed (2026-08-22, 1334ca73)
**Issue:** User muốn gỡ endpoint `https://dashscope-intl.aliyuncs.com`

---

## Problem Statement

`dashscope-intl.aliyuncs.com/compatible-mode/v1/{chat/completions,models}` chỉ dùng cho 2 registry `alibaba` (ali, priority 50, 13 models qwen-*) và `alims-intl` (priority 11, 7 models). Còn `alicode`/`alicode-intl` dùng `coding.dashscope.aliyuncs.com` host khác — không liên quan. Cần gỡ sạch để không còn DashScope Intl trong codebase, không hardcode fallback.

---

## Solution: Option A — Xóa hẳn (User đã duyệt)

**Scope:**
- Xóa file `open-sse/providers/registry/alibaba.js`
- Xóa file `open-sse/providers/registry/alims-intl.js`
- Gỡ import `p1` (alibaba) và `p108` (alims-intl) trong `open-sse/providers/registry/index.js` (cả `import` và `export` array)
- Giữ `alicode`, `alicode-intl`, `open-sse/executors/qwen.js` headers `X-DashScope-*` (dùng cho Qwen OAuth, không phải URL)

**Breaking Change:**
- `ali/qwen-max` v.v. qua DashScope Intl sẽ 503 nếu không có provider khác. User đã chuyển sang Alicode/Qwen OAuth nên chấp nhận.

---

## Implementation Phases

### Phase 1: Delete Registry Files (Done)
- [x] `Remove-Item alibaba.js` (32 lines)
- [x] `Remove-Item alims-intl.js` (32 lines)

### Phase 2: Clean Index (Done)
- [x] `index.js:2` remove `import p1 from "./alibaba.js"`
- [x] `index.js:108` remove `import p108 from "./alims-intl.js"`
- [x] `index.js:128-129` remove `p1` from export
- [x] `index.js:235-236` remove `p108` from export

### Phase 3: Verify (Done)
- [x] `git status` → 3 files changed, 68 deletions
- [x] Commit `1334ca73 chore(alibaba): remove DashScope Intl providers` + push `main`

---

## File Structure

```
open-sse/providers/registry/
├── alibaba.js          # DELETED
├── alims-intl.js       # DELETED
├── alicode.js          # KEPT (coding.dashscope.aliyuncs.com)
├── alicode-intl.js     # KEPT (coding-intl.dashscope.aliyuncs.com)
└── index.js            # MOD: removed p1/p108
```

---

## Testing Strategy

```bash
git -C hermes-router-main status --porcelain # expect D alibaba.js, D alims-intl.js, M index.js
pnpm run build # should pass without alibaba provider
curl /api/providers # alibaba no longer listed
```

---

## Success Metrics

| Metric | Before | After |
|---|---|---|
| `dashscope-intl` occurrences in `open-sse/providers/registry` | 2 files | 0 |
| `pnpm run build` | pass | pass |
| Dashboard providers list | shows Alibaba | hidden |

---

## Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Existing combos dùng `ali/qwen-*` fail | Đã duyệt Option A, user chuyển sang Alicode/Qwen OAuth |
| CHANGELOG mention còn | Optional, không ảnh hưởng runtime |

---

## References

- Research: `_tasks/research/2026-08-22_dashscope-intl-removal-investigation.md`
- Commit: `1334ca73`
- Registry pattern: `open-sse/providers/registry/*.js` + `index.js` auto-export

