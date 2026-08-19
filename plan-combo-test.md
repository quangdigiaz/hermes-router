# Plan: Test Combo Feature — Hermes Router

**Ngày:** 2026-08-17
**Nghiên cứu:** `playbooks/combo-test-findings.md`
**Mục tiêu:** Test từng model trong combo ngay từ dashboard, thấy model nào lỗi/latency bao nhiêu.

---

## Task 1: API `POST /api/combos/[id]/test`

**File mới:** `src/app/api/combos/[id]/test/route.js`

- Quản lý auth theo pattern route khác trong `src/app/api/combos/[id]/route.js`.
- Load combo: `getComboById(id)` (từ `src/lib/localDb.js` hoặc `combosRepo`).
- Với mỗi model trong `combo.models`: gọi `pingModelByKind(model, kind)` từ `src/app/api/models/test/ping.js` (kind lấy từ `combo.kind || "llm"`).
- Warm-up: model đầu tiên chạy tuần tự trước (trigger token refresh), phần còn lại `Promise.all` — copy pattern `src/app/api/providers/[id]/test-models/route.js`.
- Response:
  ```json
  {
    "comboId": 1, "name": "coding-stack",
    "results": [{ "model": "openai/gpt-4o", "ok": true, "latencyMs": 850, "status": 200, "error": null }],
    "testedAt": "ISO"
  }
  ```
- Empty models → trả lỗi 400 rõ ràng.

## Task 2: Nút Test + kết quả trong CombosPage

**File sửa:** `src/app/(dashboard)/dashboard/combos/page.js`

- `CombosPage`: thêm state `testingComboId`, `testResults` (keyed theo combo id).
- `handleTestCombo(combo)`: POST `/api/combos/${combo.id}/test`, lưu kết quả, mở modal kết quả.
- `ComboCard`: thêm nút Test (icon material `play_arrow` hoặc `science`, kèm spinner khi đang test) vào hàng nút hiện tại.
- **Modal kết quả** `TestResultsModal` (component mới trong cùng file, theo pattern modal có sẵn trong page):
  - Header: tên combo + thời điểm test + nút re-test.
  - Mỗi model 1 row: icon ✓ xanh (`check_circle`) / ✗ đỏ (`cancel`), model name, latency (nếu ok), error message rút gọn (nếu fail).

## Task 3: Test & verify

- Unit test nhanh bằng curl khi dev server chạy: tạo combo 2 model (1 thật 1 giả), POST test, kiểm tra per-model ok/error.
- Kiểm UI: nút Test hiện ở mỗi card, modal kết quả đúng trạng thái từng model.
- `npx vitest run -c tests/vitest.config.js` các test combo hiện có không vỡ.

## Out of scope (ghi nhận cho tương lai)

- Nested combo resolution (OmniRouter có, hermes chưa có nested combos).
- `resolvedBy` / strategy simulation — hiện thị per-model status là đủ nhu cầu "model nào lỗi".
- Live studio / playground full-end-to-end.

## Thứ tự implementation

1 → 2 → 3. Ước lượng: ~1-1.5 giờ.
