# BÁO CÁO ĐIỀU TRA LỖI (BUG INVESTIGATION REPORT)

**Mã lỗi:** `404 Not Found - No active credentials for provider: auto / combo`  
**Endpoint:** `https://router.quangdigi.com/v1/chat/completions`  
**Model test:** `auto/best-free`, `combo/auto/best-free`, `combo/mimo`

---

## 1. Hiện tượng & Bằng chứng thực tế

1. Khi gọi `GET /v1/models`:
   - Endpoint trả về danh sách chứa đầy đủ: `auto/best-free`, `combo/auto/best-free`, `auto/best`, `family/deepseek`, `combo/mimo`, ...
2. Khi gọi `POST /v1/chat/completions` với `model: "auto/best-free"`:
   - Server trả về **HTTP 404** với thông báo `"No active credentials for provider: auto"`.
3. Khi gọi `POST /v1/chat/completions` với `model: "combo/auto/best-free"`:
   - Server trả về **HTTP 404** với thông báo `"No active credentials for provider: combo"`.

---

## 2. Phân tích nguyên nhân gốc rễ (Root Cause)

Qua rà soát toàn bộ luồng xử lý từ `allowedModels.js` -> `route.js` -> `chat.js` -> `model.js` -> `combo.js`, xác định chính xác **2 điểm gãy trong mã nguồn**:

### 🔴 Điểm gãy 1: Chặn nhầm dấu gạch chéo `/` trong `src/sse/services/model.js`

Tại file [`src/sse/services/model.js:L85-L94`](file:///c:/Users/dell/OneDrive/Documents/Claude/Projects/hermes-router-main/hermes-router-main/src/sse/services/model.js#L85-L94):
```javascript
export async function getComboModels(modelStr) {
  // ❌ LỖI: Dòng code này lập tức từ chối mọi model có chứa dấu "/"
  if (modelStr.includes("/")) return null;

  const combo = await getComboByName(modelStr);
  if (combo && combo.models && combo.models.length > 0) {
    return combo.models;
  }
  return null;
}
```
* **Hậu quả:** 
  * Khi client gọi `auto/best-free` (chứa `/`), hàm trả về ngay `null`.
  * Khi client gọi `combo/auto/best-free` (chứa `/`), hàm trả về ngay `null`.
  * Khi client gọi `combo/mimo` (chứa `/`), hàm trả về ngay `null`.
  * Do trả về `null`, hàm `handleChat` trong `src/sse/handlers/chat.js` hiểu rằng đây **không phải là combo**, mà là model đơn lẻ của một provider thông thường.
  * Router sau đó tách chuỗi trước dấu `/` (`auto` hoặc `combo`) làm tên Provider và tìm trong danh sách kết nối (credentials), dẫn đến lỗi `No active credentials for provider: auto` / `combo`.

---

### 🔴 Điểm gãy 2: Thiếu cơ chế phân giải `AUTO_TEMPLATES` khi xử lý Request

1. **Ở chiều xuất danh sách model (`GET /v1/models`):**
   Trong `src/sse/services/allowedModels.js:L328-L333`, router chủ động nạp tất cả các template ảo từ `AUTO_TEMPLATES` (như `auto/best`, `auto/best-free`, `family/*`, `agent/*`, `vision/*`) vào danh sách model khả dụng.
2. **Ở chiều thực thi Request (`POST /v1/chat/completions`):**
   - `getComboModels` chỉ tra cứu trong bảng Database (`getComboByName(modelStr)`).
   - Vì `auto/best-free` là một template tích hợp sẵn (**Built-in Auto Template** trong `open-sse/config/autoTemplates.js`), hàm `getComboByName` không tìm thấy bản ghi nào.
   - Không có cơ chế fallback để phân giải `resolveTemplate(cleanName)` và thu thập danh sách candidate models từ các provider đang active (ví dụ các model Free của Cloudflare AI, Grok, v.v.).

---

## 3. Giải pháp khắc phục triệt để

1. **Cập nhật `getComboModels` trong `src/sse/services/model.js`**:
   - Dùng `stripComboPrefix(modelStr)` để chuẩn hóa tên.
   - Kiểm tra `getComboByName(cleanName)` trong cơ sở dữ liệu.
   - Kiểm tra `resolveTemplate(cleanName)`: nếu là template có sẵn danh sách `models`, trả về danh sách đó; nếu là auto template động (`auto/*`, `family/*`), lấy danh sách các model khả dụng từ các active provider kết nối trong hệ thống để đưa vào pool đánh giá multi-factor của `handleComboChat`.
2. **Cập nhật `getModelInfo` trong `src/sse/services/model.js`**:
   - Nhận diện đúng các combo name và auto template để không bị parse nhầm thành `{ provider: "auto", model: ... }`.
