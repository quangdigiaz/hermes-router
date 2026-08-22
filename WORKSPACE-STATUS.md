# Workspace Status — Hermes Router

> **Startup File**: Đọc file này khi mở workspace để nắm thông tin dự án và tiến độ công việc.
> **Agent Navigation Guide**: Xem [`AGENTS.md`](./AGENTS.md) để biết vị trí chuẩn của toàn bộ tài liệu trong repo.
> **Tracking File**: `project-tracker.yaml` — cập nhật khi hoàn thành tasks.

---

| Phase / Feature | Status | Document References |
|---|---|---|
| **Remove Vertex Partner (trùng lặp Vertex AI)** | ✅ **Completed & Verified — build OK, server restart 3003 HTTP 200** | Research: `_tasks/research/_closed/2026-08-22_vertex-partner-duplicate-removal.md`<br>Plan: `playbooks/plan-remove-vertex-partner.md` ✅ Closed |
| **Remove 6 Providers: Venice + Upstage + Together + Tencent Hunyuan + Snowflake + SambaNova** | ✅ **Completed & Verified — build OK, server restart 3003 HTTP 200** | Research: `_tasks/research/_closed/2026-08-22_six-provider-batch-removal.md`<br>Plan: `playbooks/plan-remove-six-providers-batch2.md` ✅ Closed |
| **Fix isFreeModel — chặn promo cross-provider + kích hoạt registry signal (money-safety)** | ✅ **Completed & Verified — code-review PASS sau 1 vòng fix, build OK, server 3003 HTTP 200** | Research: `_tasks/research/_closed/2026-08-22_bestfree-dynamic-pool-isfreemodel-audit.md`<br>Plan: `playbooks/plan-fix-isfreemodel-promo-scoping.md` ✅ Closed |
| **Remove SiliconFlow Provider (free-label sai — thực tế paid giá rẻ)** | ✅ **Completed & Verified — build OK, server restart 3003 HTTP 200** | Research: `_tasks/research/_closed/2026-08-22_siliconflow-provider-removal.md`<br>Plan: `playbooks/plan-remove-siliconflow.md` ✅ Closed |
| **Remove Perplexity (thường) + Perplexity Web + OVHcloud + Nscale + Nebius** | ✅ **Completed & Verified — build OK, server restart 3003 HTTP 200** | Research: `_tasks/research/_closed/2026-08-22_perplexity-ovhcloud-nscale-nebius-provider-removal.md`<br>Plan: `playbooks/plan-remove-perplexity-ovhcloud-nscale-nebius.md` ✅ Closed |
| **Remove LlamaGate + Hyperbolic + Morph Providers** | ✅ **Completed & Verified — build OK, server restart 3003 HTTP 200** | Research: `_tasks/research/_closed/2026-08-22_llamagate-hyperbolic-morph-provider-removal.md`<br>Plan: `playbooks/plan-remove-llamagate-hyperbolic-morph.md` ✅ Closed |
| **Remove Heroku AI Provider** | ✅ **Completed & Verified — build OK, server restart 3003 HTTP 200** | Research: `_tasks/research/_closed/2026-08-22_heroku-ai-provider-removal.md`<br>Plan: `playbooks/plan-remove-heroku-provider.md` ✅ Closed |
| **Remove DeepInfra Provider (free-label sai + model list fabricate)** | ✅ **Completed & Verified — build OK, server restarted 3003 HTTP 200** | Research: `_tasks/research/_closed/2026-08-22_deepinfra-free-tier-label-investigation.md`<br>Plan: `playbooks/plan-remove-deepinfra-provider.md` ✅ Closed |
| **Credential Cache (connections list TTL 3s)** | ✅ **Completed (code+tests) — runtime verify pending sau deploy** | Research: `_tasks/archive/DONE-2026-08-22_token-cache-audit-combo-hot-path.md`<br>Plan: `_tasks/archive/DONE-2026-08-22_credential-cache-hot-path.md` |
| **Combo Auto P0 Fix (scoring data thật + caching)** | ✅ **Completed (code+tests) — runtime TTFT verify pending sau deploy** | Research: `_tasks/archive/DONE-2026-08-22_combo-auto-4-factor-scoring-slow-response.md`<br>Plan: `_tasks/archive/DONE-2026-08-22_combo-auto-p0-fix.md` |
| **B.AI Provider Integration** | ✅ **Completed & Verified** | Research: `_tasks/research/2026-08-21_b-ai-provider-integration.md`<br>Playbook: `playbooks/plan-b-ai-provider-integration.md` |
| **Universal Model Tier Classification & Fetching** | ✅ **Completed & Verified** | Research: `_tasks/research/2026-08-21_universal-model-tier-classification-and-fetching-investigation.md`<br>Playbook: `playbooks/plan-universal-model-tier-classification-and-fetching.md` |
| **CKEY Proxy Smart Auto-Rotate on Timeout** | ✅ **Completed & Verified** | Research: `_tasks/research/2026-08-21_ckey-proxy-timeout-and-auto-rotation-investigation.md`<br>Playbook: `playbooks/plan-ckey-proxy-auto-rotate-on-timeout-and-test.md` |
| **Provider Detail Live Balance & Quota Widget** | ✅ **Completed & Verified** | Research: `_tasks/research/2026-08-21_provider-detail-live-usage-and-balance-widget.md`<br>Playbook: `playbooks/plan-provider-detail-live-usage-and-balance-widget.md` |
| **Provider API Key Reveal & Copy** | ✅ **Completed & Verified** | Research: `_tasks/research/2026-08-21_provider-apikey-reveal-and-copy-investigation.md`<br>Playbook: `playbooks/plan-provider-apikey-reveal-and-copy.md` |
| **402 Paywall, Disabled Test, ZenMux & Studio UI** | ✅ **Completed & Verified (4 Phases)** | Research: `_tasks/research/2026-08-19_402-payment-required-paywall-detection-and-account-lock.md`<br>Playbook: `playbooks/plan-402-paywall-disabled-test-zenmux-and-studio-ui.md` |
| **TokenRouter Models & Kiro 400 Error** | 🔬 **Research Completed** | Research: `_tasks/research/2026-08-19_tokenrouter-model-management-and-kiro-invalid-model-id.md`<br>Playbook: `playbooks/plan-model-management-and-kiro-invalid-model-fix.md` |
| **Free Model Import & Cost Safety** | ✅ **Completed & Verified** | Research: `_tasks/research/2026-08-18_free-model-import-and-cost-safety.md`<br>Plan: `playbooks/plan-tuy-chon-import-model-free-va-kiem-soat-chi-phi-provider.md` |
| **Router Note Sanitizer & 429 Failover** | ✅ **Completed & Verified** | Research: `_tasks/research/2026-08-18_router-note-injection-and-429-freebuff-and-combo-modal-bug.md`<br>Plan: `playbooks/plan-fix-router-note-universal-quota-va-combo-modal.md` |
| **Cost-Optimized Strategy** | ✅ Completed | `open-sse/services/combo.js` (sortModelsByCost, 16/16 tests pass) |
| **Combo Ping & Test Feature** | ✅ Completed | `playbooks/plan-combo-test.md`, `POST /api/combos/[id]/test` |
| **Model Family 17 Templates** | ✅ Completed | `playbooks/plan-tich-hop-combo-family-17-templates.md` |
| **Codex 403 Cloudflare WAF (gpt-5.6-terra)** | 🔬 **Research Completed — Verified (tắt proxy CF là hết)** | Research: `_tasks/research/2026-08-20_codex-403-cloudflare-waf-investigation.md`<br>Playbook: `playbooks/plan-fix-codex-403-waf-per-proxy-isolation.md` |
| **Token Harbor Automation (RanzMods)** | 🔬 **Research Completed** | Research: `_tasks/research/2026-08-20_token-harbor-automation-analysis.md`<br>Source: `https://github.com/RanzMods/token-harbor` |
| **OrcaRouter-Lite 5 Optimizations (Cost-Saver + Cache)** | ✅ **Completed & Pushed (e462740a, b76676b0)** | Research: `_tasks/research/2026-08-22_orca-router-lite-cost-saver-cache-investigation.md`<br>Plan: `playbooks/plan-port-orca-5-optimizations-cost-saver-cache.md` ✅ Closed<br>Source: `https://github.com/Continuum-AI-Corp/OrcaRouter-Lite` |
| **CKEY API Integration** | 🔬 **Linked to Plan** | Research: `_tasks/research/2026-08-20_ckey-api-integration.md`<br>Plan: `playbooks/plan-ckey-api-integration.md` |
| **Cline-proxy Go Gateway (YuJunZhiXue)** | 🔬 **Linked to Plan** | Research: `_tasks/research/2026-08-20_cline-proxy-go-gateway-analysis.md`<br>Plan: `playbooks/plan-port-cline-proxy-features.md`<br>Source: `https://github.com/YuJunZhiXue/Cline-proxy` |

---

## 🎯 Current Focus

**✅ MỚI HOÀN THÀNH 2026-08-22 (muộn hơn, sau combo P0) — Credential Cache:**
- Cache `getProviderConnections` ở **repo layer** (`connectionsRepo.js`) TTL 3s thay vì ở auth.js như plan — phủ mọi call site (auth.js credential pick, markAccountUnavailable, handlers) và invalidation miễn phí vì mọi write đều qua repo (`create/update/delete/reorder/cleanup` đều gọi `_invalidateListCache()`); `importDb` (DB restore) cũng invalidate.
- Không cache kết quả pick (exclude/session động) — chỉ cache list; filter/strategy vẫn chạy mỗi call. accessToken mem-cache để ngoài phạm vi (YAGNI, cần đo trước).
- Verify: 4/4 test mới (cache hit, invalidate, write-invalidate, filter riêng biệt), 136/137 suite liên quan (1 fail EPERM temp-dir Windows có sẵn), build pass.

**✅ MỚI HOÀN THÀNH 2026-08-22 — Combo Auto P0 Fix (auto scoring hết chậm):**
- Điều tra 7 nguồn độc lập hội tụ: 4-factor scoring không chậm (~0.02ms) — chậm do N+1 DB pricing (~80ms/request), 2/4 factor chạy giả (health hardcode `CLOSED`, `recordLatency` chưa có caller → p95 toàn default), và per-target timeout 30s.
- Đã sửa: batch `getPricing()` + free-map cache 5s (`getCachedPricing()`), memo scorePool TTL 1.5s, cache p95 2s, wire `recordLatency` vào `handleComboChat` (fail-open), `.env` `COMBO_TARGET_TIMEOUT_MS=10000`.
- Verify: 60/60 combo+latency tests pass, `pnpm run build` pass. Còn verify runtime sau deploy: so TTFT auto vs fallback, check p95 thật sau ~50 request (xem research §4.5).
- Còn mở (P1/P2): nạp health thật từ circuit breaker thay vì hardcode, fix endpoint `/api/combos/[id]/test` (bỏ warm-up tuần tự), scoring absolute thay pool-relative.

**🔬 MỚI HOÀN TẤT ĐIỀU TRA 2026-08-20 — Codex 403 Cloudflare WAF:**
- `codex/gpt-5.6-terra` `403 Unable to load site Ray ID a2e133... IP 2a06:98c0:3600::103` là WAF block proxy Cloudflare, không phải token/quota. Đã xác thực: **tắt proxy CF → gọi được ngay**.
- Rủi ro scale: 4-5 acc chung 1 proxy CF → lock đồng loạt 2m + mở breaker toàn provider. Hướng tương lai: **mỗi acc 1 proxy riêng** (per-`proxyHash` isolation) — 1 pool chết chỉ lock 1 acc 30s.
- Playbook per-proxy isolation đã duyệt, sẵn sàng implement 3 phases (classify 403 HTML → 502 transient, per-proxy breaker, dashboard WAF badge).

**✅ HOÀN TẤT & ĐÃ KIỂM THỬ TOÀN DIỆN CẢ 2 GÓI TÍNH NĂNG:**
1. **Router Note Sanitizer & 429/Quota Failover:**
   * Sửa lỗi tự đóng modal combo (thêm `type="button"`).
   * Lọc sạch chuỗi `[ROUTER NOTE: ...]` ở cả 2 luồng Streaming (kèm carry-over buffer chống rò rỉ ranh giới chunk) và Non-streaming.
   * Bộ Universal 429/402/403 Classifier nhận diện cạn kiệt dung lượng (capacity/credit/quota) cho toàn bộ Provider.
2. **Universal Free Model Management & Cost Safety:**
   * Mở rộng `isFreeModel()` nhận diện zero-pricing.
   * Cơ chế khóa an toàn 403 Forbidden & Early Combo Filtering cho model bị Disable.
   * Giao diện `ModelRow.js` với Toggle Switch inline, badge `FREE` xanh lá nổi bật và hiệu ứng làm mờ khi model bị tắt.
   * `UniversalModelImportModal.js` nâng cấp hoàn chỉnh với 3 nguồn nạp (Connection / URL / JSON), thanh tìm kiếm Real-time, lọc Free Only, lọc Context Length ($\ge 64k, \ge 128k, \ge 200k$) và Checkboxes Multi-select.

---

## 📂 Chuẩn Tổ Chức Workspace

```
hermes-router-main/
├── AGENTS.md                     # ← HƯỚNG DẪN DÀNH CHO AI AGENT
├── WORKSPACE-STATUS.md           # ← TRẠNG THÁI & TIẾN ĐỘ HIỆN TẠI (FILE NÀY)
├── project-tracker.yaml          # ← FILE THEO DÕI TASK CHI TIẾT
├── _tasks/
│   └── research/                 # ← TOÀN BỘ BÁO CÁO NGHIÊN CỨU & ĐIỀU TRA KỸ THUẬT
├── playbooks/                    # ← TOÀN BỘ PLANS & PLAYBOOKS TRIỂN KHAI THEO TÍNH NĂNG
├── docs/                         # ← TÀI LIỆU KIẾN TRÚC DÀI HẠN (ARCHITECTURE.md)
├── src/                          # Next.js Dashboard, API Routes, SQLite DB
└── open-sse/                     # Provider-agnostic SSE engine (Executors, Translators)
```
