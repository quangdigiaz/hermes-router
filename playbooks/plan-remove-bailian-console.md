# Plan: Remove Bailian Console `https://bailian.console.aliyun.com/?apiKey=1`

**Date:** 2026-08-22
**Research:** `_tasks/research/2026-08-22_bailian-console-removal-investigation.md`
**Status:** ✅ Completed (2026-08-22, via 27d772d3)
**Issue:** Gỡ URL Bailian Console như DashScope Intl/Coding

---

## Problem Statement

`bailian.console.aliyun.com/?apiKey=1` là `apiKeyUrl` trong notice của 4 registry Alibaba (alibaba, alims-intl, alicode, alicode-intl). Đã gỡ cùng 2 lần xóa lane trước.

---

## Solution

**Không cần xóa thêm — đã xong:**
- `27d772d3` xóa `alicode.js` + `alicode-intl.js` (chứa bailian URL)
- `1334ca73` xóa `alibaba.js` + `alims-intl.js`
- `open-sse/providers/registry` hiện grep `bailian` 0 hit trong source

---

## Implementation Phases

### Phase 1: Verify (Done)
- [x] Grep source `bailian` → 0 hit (chỉ `.next/cache`)
- [x] Ghi nhận đã gỡ chung với Alibaba Coding

### Phase 2: Document (Done)
- [x] Research file + Plan file này (để lần sau đọc lại biết đã fix)

---

## References

- Research: `_tasks/research/2026-08-22_bailian-console-removal-investigation.md`
- Commits: `1334ca73`, `27d772d3`

