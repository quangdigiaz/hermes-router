# Plan: Remove Databricks `databricks` provider

**Date:** 2026-08-22
**Status:** ✅ Completed (2026-08-22)
**Issue:** Gỡ Databricks lane tương tự Cerebras/Blackbox/Azure/Codestral

---

## Problem Statement

`databricks.js` dùng placeholder endpoint `adb-0000000000000000.0.azuredatabricks.net` (user phải tự điền instance thật), 4 static models. Muốn gỡ sạch.

---

## Solution: Option A — Xóa hẳn

- Delete `open-sse/providers/registry/databricks.js`
- Remove `p26` in `index.js`

---

## Implementation Phases

- [x] Remove databricks.js (24 lines)
- [x] Clean index.js p26 import/export
- [x] Commit push

---

## References

- Same pattern: `plan-remove-cerebras.md`, `plan-remove-blackbox-ai.md`, `plan-remove-azure-openai.md`
