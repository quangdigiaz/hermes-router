# 🔍 Error Handling Investigation Report

## Current Architecture Overview

Hermes-Router có hệ thống error handling phức tạp với **3 lớp**:

```
Request → Chat Handler → Account Fallback → classify429 → markAccountUnavailable
                                          → Circuit Breaker
                                          → Combo Fallback
```

### Error Classification (`classify429.js`)

| Kind | Cooldown | When |
|------|----------|------|
| `rate_limit` | 60s | Too many requests per minute |
| `quota_exhausted` | 1h | Monthly/billing quota exhausted |
| `daily_quota` | Until midnight UTC | Daily cap hit |

### Lock Mechanism

- **Per-model lock**: `modelLock_${model}` on connection — blocks specific model
- **Account-level lock**: `modelLock___all` — blocks all models on connection
- **payment_required**: permanent status — blocks connection entirely (no cooldown)
- **Circuit breaker**: provider-level block (all proxy buckets)

---

## 🐛 Issues Found

### Issue 1: 404 Deprecated Model → Infinite Retry Loop ❌

**Scenario**: `gemini-2.5-flash` returns404 "no longer available to new users"

**Current behavior**:
```
[02:45:31] ❌ gemini [404]: This model models/gemini-2.5-flash is no longer available
[02:45:31] ⚠️ AUTH: all 6 accounts locked for gemini-2.5-flash (reset after 1m 59s)
[02:45:31] ⚠️ COMBO: Model gemini/gemini-2.5-flash failed, trying next
... 2 minutes later ...
[02:47:31] ❌ gemini [404]: This model models/gemini-2.5-flash is no longer available
[02:47:31] ⚠️ AUTH: all 6 accounts locked for gemini-2.5-flash (reset after 1m 59s)
```

**Root cause**:404 has `cooldownMs: COOLDOWN.long` (2 minutes) in `errorConfig.js`. Model is GONE —2 minutes later it still doesn't work.

**Fix needed**: Detect "deprecated/no longer available" in404 → lock model permanently (24h) + emit notification.

---

### Issue 2:429 Quota Exhausted → No Dashboard Alert ❌

**Scenario**: `FreeUsageLimitError` / `free model capacity is limited`

**Current behavior**:
```
[03:15:13] ❌ opencode [429]: FreeUsageLimitError
[03:16:22] ❌ orcarouter [429]: free model capacity is limited
[03:16:22] ⚠️ AUTH: all 1 accounts locked for deepseek-v4-flash-free (reset after 1h)
```

**Root cause**: `classify429()` correctly identifies `quota_exhausted` → 1h cooldown. But:
- No notification sent to dashboard
- No distinction between "temporary rate limit" vs "credits depleted"
- After 1h, retries again → same error → 1h lock → infinite loop

**Fix needed**: When `quota_exhausted` detected → emit notification → dashboard shows "Nạp tiền cho provider X".

---

### Issue 3: `payment_required` → No Prominent Dashboard Alert ⚠️

**Scenario**: Balance depleted (402 / insufficient balance)

**Current behavior**:
- `testStatus: "payment_required"` — blocks connection permanently ✅
- Dashboard provider page shows "💳 Cần nạp tiền" badge ✅
- `rechargeUrl` link shown ✅

**Missing**: No alert on dashboard **homepage** — user may not notice.

---

### Issue 4: Combo Fallback → No Smart Provider Skip ❌

**Scenario**: Combo has 5 models from same provider, all fail with404

**Current behavior**:
```
⚠️ COMBO: Model gemini/gemini-2.5-flash failed, trying next
⚠️ COMBO: Model gemini/gemini-2.5-flash-pro failed, trying next
⚠️ COMBO: Model gemini/gemini-2.5-flash-lite failed, trying next
... (tries all 5 gemini models)
```

**Root cause**: `isProviderExhaustedReason()` exists but NOT used in `combo.js`. Each model is tried independently.

**Fix needed**: When combo fails with provider-level error (404 deprecated, payment_required) → skip ALL remaining models from same provider.

---

## 📊 Current vs Proposed Behavior

### Error Type Matrix

| Error | Current Cooldown | Current Lock | Proposed Cooldown | Proposed Lock | Dashboard |
|-------|-----------------|--------------|-------------------|---------------|-----------|
| **404 Deprecated** | 2min | modelLock | 24h | modelLock | ⚠️ "Model deprecated" |
| **429 Rate Limit** | 60s | modelLock | 60s | modelLock | — |
| **429 Quota Exhausted** | 1h | modelLock | 1h | modelLock | 💳 "Nạp tiền" |
| **429 Daily Quota** | Until midnight | modelLock | Until midnight | modelLock | — |
| **402 Payment Required** | Permanent | payment_required | Permanent | payment_required | 💳 "Nạp tiền" |

---

## 🔧 Proposed Fixes

### Fix 1: Detect Deprecated Model in404

In `classify429.js` or `errorConfig.js`, add detection for deprecated model patterns:

```js
const DEPRECATED_MODEL_PATTERNS = [
  /no longer available/i,
  /deprecated.*model/i,
  /model.*deprecated/i,
  /please.*update.*use/i,  // "Please update your code to use..."
  /not available to new users/i,
  /end of life/i,
  /retired/i,
];
```

When detected → `cooldownMs: 24 * 60 * 60 * 1000` (24h) + emit `severity: "critical"` notification.

### Fix 2: Emit Notification for Quota Exhausted

In `markAccountUnavailable()`, when `classification.kind === "quota_exhausted"`:

```js
emitNotification({
  severity: "warning",
  category: "quota",
  provider,
  model,
  status: 429,
  message: `Provider ${provider} quota exhausted. Please recharge.`,
  rechargeUrl: extractRechargeUrl(errorText, ""),
  source: "chat",
});
```

### Fix 3: Dashboard Homepage Alert

Add a "Needs Attention" section on dashboard homepage that shows:
- Providers with `payment_required` status
- Providers with `quota_exhausted` in last 24h
- Deprecated models still configured

### Fix 4: Smart Provider Skip in Combo

In `combo.js`, before trying next model:

```js
// Skip remaining models from same provider if provider is exhausted
const [provider] = modelStr.split("/");
if (isProviderExhaustedReason(result)) {
  // Skip ALL remaining models from this provider
  rotatedModels = rotatedModels.filter(m => !m.startsWith(`${provider}/`));
}
```

---

## 🎯 Priority

1. **Fix 1** (404 deprecated) — Most impactful, prevents infinite retry loops
2. **Fix 4** (smart provider skip) — Reduces wasted API calls in combo
3. **Fix 2** (quota notification) — Improves visibility
4. **Fix 3** (dashboard alert) — Nice to have

---

## Files to Modify

| File | Fix | Change |
|------|-----|--------|
| `open-sse/utils/classify429.js` | Fix 1 | Add deprecated model detection |
| `open-sse/config/errorConfig.js` | Fix 1 | Add deprecated model cooldown rule |
| `src/sse/services/auth.js` | Fix 1 | Emit notification for deprecated model |
| `open-sse/services/combo.js` | Fix 4 | Smart provider skip |
| `src/app/api/hub/status/route.js` | Fix 2 | Emit quota exhausted notification |
| `src/app/(dashboard)/dashboard/page.js` | Fix 3 | Add "Needs Attention" section |
