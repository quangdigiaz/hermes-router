# Investigation: Gỡ `https://bailian.console.aliyun.com/?apiKey=1` (Bailian Console)

**Date:** 2026-08-22
**Request:** Tương tự DashScope Intl/Coding, gỡ Bailian Console URL
**Scope:** Grep `bailian` toàn codebase

---

## 1. Where It Was

| File (đã xóa) | URL | Provider |
|---|---|---|
| `alicode.js:11` | `https://bailian.console.aliyun.com/?apiKey=1` (notice apiKeyUrl) | Alicode domestic |
| `alicode-intl.js:11` | same | Alicode Intl |
| `alibaba.js:11` | same pattern | Alibaba (đã xóa trước) |
| `alims-intl.js:13` | same | Alibaba Studio (đã xóa) |

**Hiện tại:** `Get-ChildItem open-sse -Recurse | Select-String bailian` → **0 hit trong source** (chỉ còn `.next/cache` build artifact, sẽ mất sau `pnpm run build` lại). Cả 4 file đã xóa ở 2 commit trước `1334ca73` (dashscope-intl) + `27d772d3` (coding).

---

## 2. Impact

- **Không còn provider nào trỏ tới Bailian Console** — Dashboard → Providers không còn `alicode`/`alibaba` lanes, nên `apiKeyUrl` bailian không hiện nữa.
- **Không breaking thêm** — đã gộp chung với gỡ `coding.dashscope` lane, không cần xóa riêng.

---

## 3. Action

**Đã xong qua 2 lần gỡ trước, không cần xóa thêm.** Chỉ cần ghi nhận plan đóng để lần sau tra cứu biết Bailian đã gỡ cùng Alibaba Coding.

- Nếu muốn sạch `.next` cache, chạy `pnpm run build` lại (cache cũ vẫn chứa string bailian).

---

## 4. References

- `alicode.js:11` `apiKeyUrl: "https://bailian.console.aliyun.com/?apiKey=1"` (deleted 27d772d3)
- `git log --oneline` `1334ca73` + `27d772d3` + `93fa41d4`
