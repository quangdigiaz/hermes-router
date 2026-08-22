"use client";

import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import { Badge, Button, Card, CardSkeleton, Input, Modal, Toggle, ConfirmModal } from "@/shared/components";
import { useNotificationStore } from "@/store/notificationStore";
import { countBatchResults, dedupeProxyEntries, runProxyPoolBatch } from "./batchOperations.js";
import CkeyMoneyDisplay from "@/shared/components/CkeyMoneyDisplay";
import { translate } from "@/i18n/runtime";

function parseProxyLine(line) {
  const trimmed = line.trim();
  if (!trimmed) return null;
  if (trimmed.includes("://")) {
    const parsed = new URL(trimmed);
    const hostLabel = parsed.port ? `${parsed.hostname}:${parsed.port}` : parsed.hostname;
    return { proxyUrl: parsed.toString(), name: `Imported ${hostLabel}` };
  }
  const parts = trimmed.split(":");
  if (parts.length === 4) {
    const [host, port, username, password] = parts;
    if (!host || !port || !username || !password) throw new Error("Invalid host:port:user:pass format");
    const proxyUrl = `http://${encodeURIComponent(username)}:${encodeURIComponent(password)}@${host}:${port}`;
    const parsed = new URL(proxyUrl);
    return { proxyUrl: parsed.toString(), name: `Imported ${host}:${port}` };
  }
  throw new Error("Unsupported format");
}

function getStatusVariant(status) {
  if (status === "active") return "success";
  if (status === "error") return "error";
  return "default";
}

function formatDateTime(value) {
  if (!value) return "Never";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Never";
  return date.toLocaleString();
}

function normalizeFormData(data = {}) {
  return {
    name: data.name || "",
    proxyUrl: data.proxyUrl || "",
    noProxy: data.noProxy || "",
    isActive: data.isActive !== false,
    strictProxy: data.strictProxy === true,
  };
}

const VERCEL_TOKEN_HINT = <>Token is used once for deployment and not stored. <a href="https://vercel.com/account/tokens" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Get token →</a></>;
const CF_TOKEN_HINT = <>Requires &quot;Workers Scripts: Edit&quot; permission. <a href="https://dash.cloudflare.com/profile/api-tokens" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Get token →</a></>;

function PoolFormModal({ isOpen, editingProxyPool, formData, saving, onClose, onSave, onChange }) {
  return (
    <Modal isOpen={isOpen} title={editingProxyPool ? "Edit Proxy Pool" : "Add Proxy Pool"} onClose={onClose}>
      <div className="flex flex-col gap-4">
        <Input label="Name" value={formData.name} onChange={(e) => onChange("name", e.target.value)} placeholder="Office Proxy" />
        <Input label="Proxy URL" value={formData.proxyUrl} onChange={(e) => onChange("proxyUrl", e.target.value)} placeholder="http://127.0.0.1:7897" />
        <Input label="No Proxy" value={formData.noProxy} onChange={(e) => onChange("noProxy", e.target.value)} placeholder="localhost,127.0.0.1,.internal" hint="Comma-separated hosts/domains to bypass proxy" />
        <ToggleField label="Active" description="Inactive pools are ignored by runtime resolution." checked={formData.isActive} onChange={() => onChange("isActive", !formData.isActive)} disabled={saving} />
        <ToggleField label="Strict Proxy" description="Fail request if proxy is unreachable instead of falling back to direct." checked={formData.strictProxy} onChange={() => onChange("strictProxy", !formData.strictProxy)} disabled={saving} />
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <Button fullWidth onClick={onSave} disabled={!formData.name.trim() || !formData.proxyUrl.trim() || saving}>{saving ? "Saving..." : "Save"}</Button>
          <Button fullWidth variant="ghost" onClick={onClose} disabled={saving}>Cancel</Button>
        </div>
      </div>
    </Modal>
  );
}

function ToggleField({ label, description, checked, onChange, disabled }) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border/50 p-3 sm:flex-row sm:items-center sm:justify-between">
      <div><p className="font-medium text-sm">{label}</p><p className="text-xs text-text-muted">{description}</p></div>
      <Toggle checked={checked === true} onChange={onChange} disabled={disabled} />
    </div>
  );
}

function BatchImportModal({ isOpen, text, importing, onChange, onImport, onClose }) {
  return (
    <Modal isOpen={isOpen} title="Batch Import Proxies" onClose={onClose}>
      <div className="flex flex-col gap-4">
        <div>
          <label htmlFor="proxy-batch-import" className="text-sm font-medium text-text-main mb-1 block">Paste Proxy List (One per line)</label>
          <textarea id="proxy-batch-import" value={text} onChange={(e) => onChange(e.target.value)} placeholder={"http://user:pass@127.0.0.1:7897\n127.0.0.1:7897:user:pass"} className="w-full min-h-[180px] py-2 px-3 text-sm text-text-main bg-white dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-md focus:ring-1 focus:ring-primary/30 focus:border-primary/50 focus:outline-none transition-all" />
          <p className="text-xs text-text-muted mt-1">Supported formats: protocol://user:pass@host:port, host:port:user:pass</p>
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <Button fullWidth onClick={onImport} disabled={!text.trim() || importing}>{importing ? "Importing..." : "Import"}</Button>
          <Button fullWidth variant="ghost" onClick={onClose} disabled={importing}>Cancel</Button>
        </div>
      </div>
    </Modal>
  );
}

const TINH_THANH_CODES = {
  0: "Random", 1: "Phú Thọ", 2: "Tuyên Quang", 3: "Hà Nội", 4: "Hải Dương", 5: "Bắc Giang",
  6: "HCM", 7: "Tây Ninh", 8: "Đồng Nai", 9: "Vũng Tàu", 10: "Bình Dương",
  11: "Nghệ An", 12: "Hà Tĩnh", 13: "Quảng Bình", 14: "Quảng Trị", 15: "Huế",
  16: "Đà Nẵng", 17: "Vĩnh Phúc", 18: "Yên Bái", 19: "Lào Cai", 20: "Lạng Sơn",
  21: "Thái Nguyên", 22: "Hà Nam", 23: "Nam Định", 24: "Thái Bình", 25: "Hải Phòng",
  26: "Quảng Ninh", 27: "Cà Mau", 28: "Kiên Giang", 29: "Bắc Liêu", 30: "Sóc Trăng", 31: "Hậu Giang",
};

function CkeyModal({ isOpen, form, saving, onChange, onSync, onRefreshPools, onClose }) {
  const [activeTab, setActiveTab] = useState("rotating"); // "rotating" | "static"
  const [staticProxies, setStaticProxies] = useState([]);
  const [staticLoading, setStaticLoading] = useState(false);
  const [staticError, setStaticError] = useState("");
  const [syncingId, setSyncingId] = useState(null);
  const [renewingId, setRenewingId] = useState(null);
  const [showBuyForm, setShowBuyForm] = useState(false);
  const [buyForm, setBuyForm] = useState({
    loaiproxy: "US",
    type: "HTTP",
    user: "u1",
    password: "p1",
    ngay: 30,
    soluong: 1,
  });
  const [buying, setBuying] = useState(false);
  const isBatch = form.mode !== "single";

  const fetchStaticProxies = async () => {
    const key = form.ckeyKey || form.ckeyApiKey || "";
    if (!key.trim()) {
      setStaticError(translate("Please enter CKEY API Key to fetch static proxies"));
      return;
    }
    setStaticLoading(true);
    setStaticError("");
    try {
      const res = await fetch(`/api/ckey/static-proxy?key=${encodeURIComponent(key.trim())}`);
      const data = await res.json();
      if (res.ok && data.success) {
        setStaticProxies(data?.data?.items || []);
      } else {
        setStaticError(data.error || "Không thể tải danh sách proxy tĩnh");
      }
    } catch (err) {
      setStaticError(err.message || "Lỗi kết nối CKEY");
    } finally {
      setStaticLoading(false);
    }
  };

  const handleSyncStaticToPool = async (item) => {
    setSyncingId(item.idproxy);
    try {
      const key = form.ckeyKey || form.ckeyApiKey || "";
      const res = await fetch("/api/ckey/static-proxy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "sync-pool",
          key,
          ...item,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        await onRefreshPools?.();
      } else {
        alert(data.error || "Lỗi đồng bộ vào Proxy Pool");
      }
    } catch (err) {
      alert(err.message);
    } finally {
      setSyncingId(null);
    }
  };

  const handleRenewStatic = async (item) => {
    if (!confirm(`Gia hạn 30 ngày cho proxy ${item.ip} (Loại: ${item.loaiproxy || "US"})?`)) return;
    setRenewingId(item.idproxy);
    try {
      const key = form.ckeyKey || form.ckeyApiKey || "";
      const res = await fetch("/api/ckey/static-proxy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "renew",
          key,
          idproxy: item.idproxy,
          loaiproxy: item.loaiproxy || "US",
          ngay: 30,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        alert("Gia hạn proxy thành công!");
        fetchStaticProxies();
      } else {
        alert(data.error || "Không thể gia hạn proxy");
      }
    } catch (err) {
      alert(err.message);
    } finally {
      setRenewingId(null);
    }
  };

  const handleBuyStatic = async () => {
    setBuying(true);
    try {
      const key = form.ckeyKey || form.ckeyApiKey || "";
      const res = await fetch("/api/ckey/static-proxy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "buy",
          key,
          ...buyForm,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        alert("Mua proxy tĩnh thành công!");
        setShowBuyForm(false);
        fetchStaticProxies();
        await onRefreshPools?.();
      } else {
        alert(data.error || "Mua proxy thất bại");
      }
    } catch (err) {
      alert(err.message);
    } finally {
      setBuying(false);
    }
  };

  return (
    <Modal isOpen={isOpen} title="CKEY Proxy Gateway" onClose={onClose}>
      <div className="flex flex-col gap-4">
        {/* Segmented Pill Tabs */}
        <div className="grid grid-cols-2 p-1 rounded-xl bg-zinc-100 dark:bg-zinc-800/80 border border-border/40 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab("rotating")}
            className={`py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
              activeTab === "rotating"
                ? "bg-white dark:bg-zinc-900 text-emerald-600 dark:text-emerald-400 shadow-sm"
                : "text-text-muted hover:text-text-main"
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">sync_alt</span>
            <span>{translate("Proxy Xoay (Rotating)")}</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab("static");
              if ((form.ckeyKey || form.ckeyApiKey) && staticProxies.length === 0) {
                fetchStaticProxies();
              }
            }}
            className={`py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
              activeTab === "static"
                ? "bg-white dark:bg-zinc-900 text-emerald-600 dark:text-emerald-400 shadow-sm"
                : "text-text-muted hover:text-text-main"
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">shield_lock</span>
            <span>{translate("Proxy Tĩnh (Dedicated US)")}</span>
          </button>
        </div>

        {activeTab === "rotating" ? (
          <>
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-800 dark:text-emerald-300">
              <span className="material-symbols-outlined text-[18px] text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5">bolt</span>
              <div className="leading-relaxed">
                <span className="font-semibold block text-emerald-700 dark:text-emerald-300 mb-0.5">CKEY Rotating Proxy Pool</span>
                Tự động lấy IP xoay theo tỉnh thành / nhà mạng. Hỗ trợ cơ chế tự xoay IP khi timeout hoặc dính Cloudflare WAF.
              </div>
            </div>

            {/* Mode Toggle */}
            <div className="flex items-center justify-between p-2 rounded-xl bg-black/5 dark:bg-white/5">
              <span className="text-xs font-medium">{translate("Creation Mode")}</span>
              <div className="inline-flex rounded-lg bg-black/10 dark:bg-white/10 p-0.5 text-xs">
                <button
                  type="button"
                  onClick={() => onChange("mode", "batch")}
                  className={`px-3 py-1 rounded-md transition-colors ${
                    isBatch ? "bg-emerald-600 text-white font-semibold shadow-xs" : "text-text-muted hover:text-text-main"
                  }`}
                >
                  ⚡ {translate("Batch Create (Multiple Pools)")}
                </button>
                <button
                  type="button"
                  onClick={() => onChange("mode", "single")}
                  className={`px-3 py-1 rounded-md transition-colors ${
                    !isBatch ? "bg-emerald-600 text-white font-semibold shadow-xs" : "text-text-muted hover:text-text-main"
                  }`}
                >
                  {translate("Single Pool")}
                </button>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label htmlFor="ckey-modal-keyproxy" className="text-xs font-medium text-text-main">{translate("Rotating Proxy Key")}</label>
                <a href="https://ckey.vn" target="_blank" rel="noopener noreferrer" className="text-[11px] text-emerald-600 dark:text-emerald-400 hover:underline">ckey.vn ↗</a>
              </div>
              <Input
                id="ckey-modal-keyproxy"
                type="password"
                placeholder="keyproxy_xxxxxxxxxxxx"
                value={form.keyproxy}
                onChange={(e) => onChange("keyproxy", e.target.value)}
                disabled={saving}
              />
            </div>

            {isBatch ? (
              <div className="flex flex-col gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="ckey-modal-count" className="text-xs font-medium mb-1 block">
                      {translate("Number of Pools to Create")}
                    </label>
                    <select
                      id="ckey-modal-count"
                      value={form.count || 5}
                      onChange={(e) => onChange("count", Number(e.target.value))}
                      disabled={saving}
                      className="w-full h-10 px-3 text-sm rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-900 text-text-main focus:outline-none focus:ring-2 focus:ring-emerald-500/30 font-semibold"
                    >
                      <option value={2}>2 Pools (Random, Hà Nội)</option>
                      <option value={3}>3 Pools (Random, Hà Nội, HCM)</option>
                      <option value={4}>4 Pools (+ Đà Nẵng)</option>
                      <option value={5}>5 Pools (+ Hải Phòng)</option>
                      <option value={6}>6 Pools (+ Bình Dương)</option>
                      <option value={8}>8 Pools (+ Đồng Nai, Nghệ An)</option>
                      <option value={10}>10 Pools (10 Provinces)</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="ckey-modal-nhamang" className="text-xs font-medium mb-1 block">{translate("ISP")}</label>
                    <select
                      id="ckey-modal-nhamang"
                      value={form.nhamang}
                      onChange={(e) => onChange("nhamang", e.target.value)}
                      disabled={saving}
                      className="w-full h-10 px-3 text-sm rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-900 text-text-main focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                    >
                      <option value="random">{translate("Random (All)")}</option>
                      <option value="viettel">Viettel</option>
                      <option value="vinaphone">Vinaphone</option>
                      <option value="vnpt">VNPT</option>
                      <option value="fpt">FPT</option>
                    </select>
                  </div>
                </div>

                <label className="flex items-center gap-2 text-xs font-medium cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={form.autoDistribute !== false}
                    onChange={(e) => onChange("autoDistribute", e.target.checked)}
                    disabled={saving}
                    className="rounded border-border text-emerald-600 focus:ring-emerald-500 h-4 w-4"
                  />
                  <span>{translate("Auto-distribute pools across all Provider Accounts (Account 1 → Pool 1, Account 2 → Pool 2...)")}</span>
                </label>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="ckey-modal-tinhthanh" className="text-xs font-medium mb-1 block">{translate("Province / City")}</label>
                    <select
                      id="ckey-modal-tinhthanh"
                      value={form.tinhthanh}
                      onChange={(e) => onChange("tinhthanh", Number(e.target.value))}
                      disabled={saving}
                      className="w-full h-10 px-3 text-sm rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-900 text-text-main focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                    >
                      {Object.entries(TINH_THANH_CODES).map(([code, name]) => (
                        <option key={code} value={code}>{name} (Mã {code})</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="ckey-modal-nhamang" className="text-xs font-medium mb-1 block">{translate("ISP")}</label>
                    <select
                      id="ckey-modal-nhamang"
                      value={form.nhamang}
                      onChange={(e) => onChange("nhamang", e.target.value)}
                      disabled={saving}
                      className="w-full h-10 px-3 text-sm rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-900 text-text-main focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                    >
                      <option value="random">{translate("Random (All)")}</option>
                      <option value="viettel">Viettel</option>
                      <option value="vinaphone">Vinaphone</option>
                      <option value="vnpt">VNPT</option>
                      <option value="fpt">FPT</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label htmlFor="ckey-modal-poolname" className="text-xs font-medium mb-1 block">{translate("Pool Name (Optional)")}</label>
                  <Input
                    id="ckey-modal-poolname"
                    placeholder={`CKEY Xoay - ${TINH_THANH_CODES[form.tinhthanh] || "Random"}`}
                    value={form.poolName}
                    onChange={(e) => onChange("poolName", e.target.value)}
                    disabled={saving}
                  />
                </div>
              </>
            )}

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 pt-2">
              <Button fullWidth variant="primary" onClick={onSync} disabled={!form.keyproxy.trim() || saving}>
                {saving
                  ? translate("Creating Pools...")
                  : isBatch
                  ? `⚡ ${translate("Auto Create")} ${form.count || 5} Pools`
                  : translate("Fetch IP & Save to Pool")}
              </Button>
              <Button fullWidth variant="ghost" onClick={onClose} disabled={saving}>
                {translate("Close")}
              </Button>
            </div>
          </>
        ) : (
          /* Static Proxy Tab */
          <div className="flex flex-col gap-3">
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-800 dark:text-emerald-300">
              <span className="material-symbols-outlined text-[18px] text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5">verified_user</span>
              <div className="leading-relaxed">
                <span className="font-semibold block text-emerald-700 dark:text-emerald-300 mb-0.5">IP Tĩnh Riêng Biệt (Dedicated US/Viettel)</span>
                Cố định 1 IP cho mỗi tài khoản (Freebuff, OpenAI, Claude). Không thay đổi IP giữa chừng, bảo vệ chống ban tài khoản 100%.
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-text-main">CKEY API Key</label>
                <a href="https://ckey.vn" target="_blank" rel="noopener noreferrer" className="text-[11px] text-emerald-600 dark:text-emerald-400 hover:underline">ckey.vn → Profile → API Key ↗</a>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <input
                    type="password"
                    placeholder="ck_xxxxxxxxxxxxxxxxxxxx"
                    value={form.ckeyKey || form.ckeyApiKey || ""}
                    onChange={(e) => {
                      onChange("ckeyKey", e.target.value);
                      onChange("ckeyApiKey", e.target.value);
                    }}
                    disabled={staticLoading}
                    className="w-full h-10 px-3 text-sm rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-900/80 text-text-main focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                  />
                </div>
                <button
                  type="button"
                  onClick={fetchStaticProxies}
                  disabled={!(form.ckeyKey || form.ckeyApiKey)?.trim() || staticLoading}
                  className="h-10 px-4 rounded-xl font-semibold text-xs bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs flex items-center gap-1.5 transition-all disabled:opacity-50 shrink-0"
                >
                  <span className="material-symbols-outlined text-[16px]">{staticLoading ? "progress_activity" : "refresh"}</span>
                  <span>{staticLoading ? "Đang tải..." : "Tải danh sách"}</span>
                </button>
              </div>
            </div>

            {staticError && (
              <p className="text-xs text-red-500 bg-red-500/10 p-2.5 rounded-xl border border-red-500/20">{staticError}</p>
            )}

            {/* List of Static Proxies */}
            {staticProxies.length > 0 ? (
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                <div className="flex items-center justify-between pb-1">
                  <span className="text-xs font-semibold text-text-main flex items-center gap-1.5">
                    <span>Proxy Đang Sở Hữu</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                      {staticProxies.length}
                    </span>
                  </span>
                </div>

                {staticProxies.map((item) => (
                  <div
                    key={item.idproxy}
                    className="p-3 rounded-xl border border-black/10 dark:border-white/10 bg-zinc-50 dark:bg-zinc-900/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all hover:border-emerald-500/30 shadow-xs"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-sm font-bold text-text-main">{item.ip}:{item.port}</span>
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                          {item.loaiproxy || "US"}
                        </span>
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                          item.is_expired
                            ? "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20"
                            : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                        }`}>
                          {item.is_expired ? "Hết hạn" : "Còn hạn"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-text-muted flex-wrap">
                        <span className="font-mono">User: <b className="text-text-main">{item.user}</b></span>
                        <span>•</span>
                        <span className="font-mono">Pass: <b className="text-text-main">{item.password}</b></span>
                        <span>•</span>
                        <span>Hạn: <span className="text-emerald-600 dark:text-emerald-400 font-medium">{item.time_expire_text || "—"}</span></span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleSyncStaticToPool(item)}
                        disabled={syncingId === item.idproxy}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs flex items-center gap-1 transition-all disabled:opacity-50"
                      >
                        <span className="material-symbols-outlined text-[14px]">add</span>
                        <span>{syncingId === item.idproxy ? "Đang thêm..." : "Vào Pool"}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRenewStatic(item)}
                        disabled={renewingId === item.idproxy}
                        className="px-2.5 py-1.5 rounded-lg text-xs font-medium border border-border hover:bg-black/5 dark:hover:bg-white/5 text-text-main flex items-center gap-1 transition-all disabled:opacity-50"
                        title="Gia hạn thêm 30 ngày"
                      >
                        <span className="material-symbols-outlined text-[14px]">autorenew</span>
                        <span>{renewingId === item.idproxy ? "..." : "Gia hạn"}</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : !staticLoading && (
              <div className="text-center py-4 px-3 rounded-xl border border-dashed border-border/70 bg-black/[0.02] dark:bg-white/[0.02]">
                <span className="material-symbols-outlined text-[28px] text-text-muted mb-1 block">vpn_key</span>
                <p className="text-xs text-text-muted">
                  Chưa có proxy tĩnh nào được tải. Vui lòng bấm <b>&quot;Tải danh sách&quot;</b> để quét proxy đang sở hữu.
                </p>
              </div>
            )}

            {/* Buy Static Proxy Section */}
            <div className="pt-2 border-t border-border/50">
              <button
                type="button"
                onClick={() => setShowBuyForm((v) => !v)}
                className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[16px]">{showBuyForm ? "expand_less" : "shopping_cart"}</span>
                <span>{showBuyForm ? "Thu gọn form mua proxy" : "Mua Proxy Tĩnh Mới bằng số dư CKEY"}</span>
              </button>

              {showBuyForm && (
                <div className="mt-2 p-3.5 rounded-xl border border-emerald-500/20 bg-emerald-500/5 flex flex-col gap-2.5 text-xs">
                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="block mb-1 font-medium text-text-main">Loại Proxy</label>
                      <select
                        value={buyForm.loaiproxy}
                        onChange={(e) => setBuyForm((p) => ({ ...p, loaiproxy: e.target.value }))}
                        className="w-full h-9 px-2.5 rounded-lg border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-900 text-text-main"
                      >
                        <option value="US">US (Hoa Kỳ)</option>
                        <option value="Viettel">Viettel</option>
                        <option value="FPT">FPT</option>
                        <option value="VNPT">VNPT</option>
                      </select>
                    </div>
                    <div>
                      <label className="block mb-1 font-medium text-text-main">Giao thức</label>
                      <select
                        value={buyForm.type}
                        onChange={(e) => setBuyForm((p) => ({ ...p, type: e.target.value }))}
                        className="w-full h-9 px-2.5 rounded-lg border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-900 text-text-main"
                      >
                        <option value="HTTP">HTTP</option>
                        <option value="SOCKS5">SOCKS5</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="block mb-1 font-medium text-text-main">Proxy User</label>
                      <Input
                        value={buyForm.user}
                        onChange={(e) => setBuyForm((p) => ({ ...p, user: e.target.value }))}
                        placeholder="u1"
                      />
                    </div>
                    <div>
                      <label className="block mb-1 font-medium text-text-main">Proxy Pass</label>
                      <Input
                        value={buyForm.password}
                        onChange={(e) => setBuyForm((p) => ({ ...p, password: e.target.value }))}
                        placeholder="p1"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="block mb-1 font-medium text-text-main">Số ngày thuê</label>
                      <Input
                        type="number"
                        min="1"
                        value={buyForm.ngay}
                        onChange={(e) => setBuyForm((p) => ({ ...p, ngay: Number(e.target.value) }))}
                      />
                    </div>
                    <div className="flex items-end">
                      <button
                        type="button"
                        onClick={handleBuyStatic}
                        disabled={buying || !(form.ckeyKey || form.ckeyApiKey)?.trim()}
                        className="w-full h-10 px-4 rounded-xl font-semibold text-xs bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs flex items-center justify-center gap-1.5 transition-all disabled:opacity-50"
                      >
                        <span className="material-symbols-outlined text-[16px]">shopping_bag</span>
                        <span>{buying ? "Đang xử lý..." : "Mua ngay"}</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-border/50">
              <Button fullWidth variant="ghost" onClick={onClose}>
                {translate("Close")}
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

function DeploymentModal({ isOpen, title, onClose, children }) {
  return <Modal isOpen={isOpen} title={title} onClose={onClose}>{children}</Modal>;
}

function PoolRow({ pool, selected, testing, rotating, onSelect, onToggle, onTest, onRotateCkey, onEdit, onDelete }) {
  return (
    <div className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3 min-w-0 flex-1">
        <input type="checkbox" checked={selected} onChange={onSelect} aria-label={`Select proxy ${pool.name || pool.id}`} className="mt-1 size-4 shrink-0 rounded border-black/20 dark:border-white/20" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="min-w-0 max-w-full truncate text-sm font-medium sm:max-w-[18rem]">{pool.name}</p>
            <Badge variant={getStatusVariant(pool.testStatus)} size="sm" dot>{pool.testStatus || "unknown"}</Badge>
            <Badge variant={pool.isActive ? "success" : "default"} size="sm">{pool.isActive ? "active" : "inactive"}</Badge>
            {pool.type === "ckey" && <Badge variant="success" size="sm">{translate("ckey rotating")}</Badge>}
            {pool.type === "ckey-static" && <Badge variant="success" size="sm">ckey static {pool.loaiproxy || "US"}</Badge>}
            {pool.type === "vercel" && <Badge variant="default" size="sm">vercel relay</Badge>}
            {pool.type === "cloudflare" && <Badge variant="default" size="sm">cloudflare relay</Badge>}
            {pool.type === "deno" && <Badge variant="default" size="sm">deno relay</Badge>}
            {pool.ckeyMeta?.tinhthanhName && <Badge variant="default" size="sm">{pool.ckeyMeta.tinhthanhName}</Badge>}
            <Badge variant="default" size="sm">{pool.boundConnectionCount || 0} bound</Badge>
          </div>
          <p className="text-xs text-text-muted truncate mt-1">{pool.proxyUrl}</p>
          {pool.noProxy ? <p className="text-xs text-text-muted truncate">No proxy: {pool.noProxy}</p> : null}
          <p className="text-[11px] text-text-muted mt-1 flex items-center gap-1.5 flex-wrap">
            {pool.time_expire_text && (
              <>
                <span className="text-emerald-600 dark:text-emerald-400 font-medium">Hạn: {pool.time_expire_text}</span>
                <span>·</span>
              </>
            )}
            <span>Last tested: {formatDateTime(pool.lastTestedAt)}</span>
            {pool.lastError ? <span>· {pool.lastError}</span> : null}
          </p>
        </div>
      </div>
      <div className="flex items-center justify-end gap-1 shrink-0">
        <div className="w-11 flex justify-center">
          <Toggle size="sm" checked={pool.isActive === true} onChange={onToggle} title={pool.isActive ? "Disable" : "Enable"} />
        </div>
        <div className="w-8 flex justify-center">
          {pool.type === "ckey" ? (
            <button type="button" onClick={onRotateCkey} className="p-1.5 rounded-lg hover:bg-emerald-500/10 text-emerald-500 transition-colors" title={translate("Rotate CKEY IP")} disabled={rotating}>
              <span className="material-symbols-outlined text-[18px]" style={rotating ? { animation: "spin 1s linear infinite" } : undefined}>sync</span>
            </button>
          ) : (
            <span className="w-8" />
          )}
        </div>
        <button type="button" onClick={onTest} className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 text-text-muted hover:text-primary transition-colors" title="Test proxy" disabled={testing}>
          <span className="material-symbols-outlined text-[18px]" style={testing ? { animation: "spin 1s linear infinite" } : undefined}>{testing ? "progress_activity" : "science"}</span>
        </button>
        <button type="button" onClick={onEdit} className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 text-text-muted hover:text-primary transition-colors" title="Edit">
          <span className="material-symbols-outlined text-[18px]">edit</span>
        </button>
        <button type="button" onClick={onDelete} className="p-1.5 rounded-lg hover:bg-red-500/10 text-red-500 transition-colors" title="Delete">
          <span className="material-symbols-outlined text-[18px]">delete</span>
        </button>
      </div>
    </div>
  );
}

export default function ProxyPoolsPage() {
  const [proxyPools, setProxyPools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showFormModal, setShowFormModal] = useState(false);
  const [showBatchImportModal, setShowBatchImportModal] = useState(false);
  const [showVercelModal, setShowVercelModal] = useState(false);
  const [showCloudflareModal, setShowCloudflareModal] = useState(false);
  const [showDenoModal, setShowDenoModal] = useState(false);
  const [showCkeyModal, setShowCkeyModal] = useState(false);
  const [showRelayMenu, setShowRelayMenu] = useState(false);
  const [editingProxyPool, setEditingProxyPool] = useState(null);
  const [formData, setFormData] = useState(() => normalizeFormData());
  const [batchImportText, setBatchImportText] = useState("");
  const [vercelForm, setVercelForm] = useState({ vercelToken: "", projectName: "vercel-relay" });
  const [cloudflareForm, setCloudflareForm] = useState({ accountId: "", apiToken: "", projectName: "cloudflare-relay" });
  const [denoForm, setDenoForm] = useState({ denoToken: "", orgDomain: "", projectName: "" });
  const [ckeyForm, setCkeyForm] = useState({ keyproxy: "", tinhthanh: 0, nhamang: "random", poolName: "" });
  const [saving, setSaving] = useState(false);
  const [ckeySyncing, setCkeySyncing] = useState(false);
  const [rotatingId, setRotatingId] = useState(null);
  const [importing, setImporting] = useState(false);
  const [deploying, setDeploying] = useState(false);
  const [testingId, setTestingId] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [healthChecking, setHealthChecking] = useState(false);
  const [healthProgress, setHealthProgress] = useState({ current: 0, total: 0 });
  const [bulkBusy, setBulkBusy] = useState(false);
  const [batchProgress, setBatchProgress] = useState({ label: "", current: 0, total: 0 });
  const [confirmState, setConfirmState] = useState(null);
  const relayMenuRef = useRef(null);
  const notify = useNotificationStore();

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (relayMenuRef.current && !relayMenuRef.current.contains(e.target)) {
        setShowRelayMenu(false);
      }
    };
    if (showRelayMenu) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showRelayMenu]);

  const fetchProxyPools = useCallback(async () => {
    try {
      const res = await fetch("/api/proxy-pools?includeUsage=true", { cache: "no-store" });
      const data = await res.json();
      if (res.ok) {
        setProxyPools(data.proxyPools || []);
      }
    } catch (error) {
      console.log("Error fetching proxy pools:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- bootstrap fetch.
    fetchProxyPools();
  }, [fetchProxyPools]);

  const resetForm = () => {
    setEditingProxyPool(null);
    setFormData(normalizeFormData());
  };

  const openCreateModal = () => {
    resetForm();
    setShowFormModal(true);
  };

  const openEditModal = (proxyPool) => {
    setEditingProxyPool(proxyPool);
    setFormData(normalizeFormData(proxyPool));
    setShowFormModal(true);
  };

  const closeFormModal = () => {
    setShowFormModal(false);
    resetForm();
  };

  const handleSave = async () => {
    const payload = {
      name: formData.name.trim(),
      proxyUrl: formData.proxyUrl.trim(),
      noProxy: formData.noProxy.trim(),
      isActive: formData.isActive === true,
      strictProxy: formData.strictProxy === true,
    };

    if (!payload.name || !payload.proxyUrl) return;

    setSaving(true);
    try {
      const isEdit = !!editingProxyPool;
      const res = await fetch(isEdit ? `/api/proxy-pools/${editingProxyPool.id}` : "/api/proxy-pools", {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        await fetchProxyPools();
        closeFormModal();
        notify.success(editingProxyPool ? "Proxy pool updated" : "Proxy pool created");
      } else {
        const data = await res.json();
        notify.error(data.error || "Failed to save proxy pool");
      }
    } catch (error) {
      console.log("Error saving proxy pool:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (proxyPool) => {
    setConfirmState({
      title: "Delete Proxy Pool",
      message: `Delete proxy pool "${proxyPool.name}"?`,
      onConfirm: async () => {
        setConfirmState(null);
        try {
          const res = await fetch(`/api/proxy-pools/${proxyPool.id}`, { method: "DELETE" });
          if (res.ok) {
            setProxyPools((prev) => prev.filter((item) => item.id !== proxyPool.id));
            notify.success("Proxy pool deleted");
            return;
          }

          const data = await res.json();
          if (res.status === 409) {
            notify.warning(`Cannot delete: ${data.boundConnectionCount || 0} connection(s) are still using this pool.`);
          } else {
            notify.error(data.error || "Failed to delete proxy pool");
          }
        } catch (error) {
          console.log("Error deleting proxy pool:", error);
          notify.error("Failed to delete proxy pool");
        }
      }
    });
  };

  const handleTest = async (proxyPoolId) => {
    setTestingId(proxyPoolId);
    try {
      const res = await fetch(`/api/proxy-pools/${proxyPoolId}/test`, { method: "POST" });
      const data = await res.json();

      if (!res.ok) {
        notify.error(data.error || "Failed to test proxy");
        return;
      }

      await fetchProxyPools();
      if (data.ok) {
        if (data.autoRotated) {
          notify.success(`Proxy test passed (Auto-rotated new IP: ${data.newIp || "Active"})`);
        } else {
          notify.success("Proxy test passed");
        }
      } else {
        notify.error(data.error || "Proxy test failed");
      }
    } catch (error) {
      console.log("Error testing proxy pool:", error);
      notify.error("Failed to test proxy");
    } finally {
      setTestingId(null);
    }
  };

  const handleToggleActive = async (pool) => {
    const next = !pool.isActive;
    setProxyPools((prev) => prev.map((p) => p.id === pool.id ? { ...p, isActive: next } : p));
    try {
      const res = await fetch(`/api/proxy-pools/${pool.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: next }),
      });
      if (!res.ok) {
        setProxyPools((prev) => prev.map((p) => p.id === pool.id ? { ...p, isActive: pool.isActive } : p));
        notify.error("Failed to update active state");
      }
    } catch (error) {
      console.log("Error toggling active:", error);
      setProxyPools((prev) => prev.map((p) => p.id === pool.id ? { ...p, isActive: pool.isActive } : p));
    }
  };

  const validSelectedIds = selectedIds.filter((id) => proxyPools.some((p) => p.id === id));
  const allSelected = proxyPools.length > 0 && validSelectedIds.length === proxyPools.length;
  const toggleSelect = (id) => setSelectedIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  const toggleSelectAll = () => setSelectedIds(allSelected ? [] : proxyPools.map((p) => p.id));
  const clearSelection = () => setSelectedIds([]);

  const bulkSetActive = async (isActive) => {
    const targets = selectedIds.length > 0 ? selectedIds : proxyPools.map((p) => p.id);
    if (targets.length === 0) return;
    setBulkBusy(true);
    setBatchProgress({ label: isActive ? "Activating" : "Deactivating", current: 0, total: targets.length });
    try {
      const results = await runProxyPoolBatch(targets, async (id) => {
        const res = await fetch(`/api/proxy-pools/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isActive }),
        });
        return res.ok ? "ok" : "fail";
      }, (current) => setBatchProgress((prev) => ({ ...prev, current })));
      const { ok = 0, fail = 0 } = countBatchResults(results);
      const failed = fail;
      await fetchProxyPools();
      notify.success(`${isActive ? "Activated" : "Deactivated"} ${ok}${failed ? `, failed ${failed}` : ""}`);
    } finally {
      setBatchProgress({ label: "", current: 0, total: 0 });
      setBulkBusy(false);
    }
  };

  const bulkDelete = async () => {
    if (selectedIds.length === 0) return;
    setConfirmState({
      title: "Delete Proxy Pools",
      message: `Delete ${selectedIds.length} proxy pool(s)?`,
      onConfirm: async () => {
        setConfirmState(null);
        setBulkBusy(true);
        const targets = [...selectedIds];
        setBatchProgress({ label: "Deleting", current: 0, total: targets.length });
        try {
          const results = await runProxyPoolBatch(targets, async (id) => {
            const res = await fetch(`/api/proxy-pools/${id}`, { method: "DELETE" });
            if (res.ok) return "ok";
            if (res.status === 409) return "blocked";
            return "fail";
          }, (current) => setBatchProgress((prev) => ({ ...prev, current })));
          const { ok = 0, blocked = 0, fail: failed = 0 } = countBatchResults(results);
          await fetchProxyPools();
          clearSelection();
          notify.success(`Deleted ${ok}${blocked ? `, ${blocked} bound` : ""}${failed ? `, ${failed} failed` : ""}`);
        } finally {
          setBatchProgress({ label: "", current: 0, total: 0 });
          setBulkBusy(false);
        }
      }
    });
  };

  const handleHealthCheck = async () => {
    const targets = selectedIds.length > 0
      ? proxyPools.filter((p) => selectedIds.includes(p.id))
      : proxyPools;
    if (targets.length === 0) return;
    setHealthChecking(true);
    setHealthProgress({ current: 0, total: targets.length });
    let alive = 0; const deadIds = [];
    let done = 0;
    const CONCURRENCY = 10;
    const queue = [...targets];

    const worker = async () => {
      while (queue.length > 0) {
        const pool = queue.shift();
        if (!pool) break;
        try {
          const res = await fetch(`/api/proxy-pools/${pool.id}/test`, { method: "POST" });
          const data = await res.json();
          if (res.ok && data.ok) alive += 1; else deadIds.push(pool.id);
        } catch {
          deadIds.push(pool.id);
        } finally {
          done += 1;
          setHealthProgress({ current: done, total: targets.length });
        }
      }
    };

    await Promise.all(Array.from({ length: Math.min(CONCURRENCY, targets.length) }, worker));
    await fetchProxyPools();
    setHealthChecking(false);
    setHealthProgress({ current: 0, total: 0 });

    if (deadIds.length > 0) {
      setConfirmState({
        title: "Disable Dead Proxies",
        message: `Alive: ${alive}, Dead: ${deadIds.length}.\n\nDisable ${deadIds.length} dead proxies?`,
        onConfirm: async () => {
          setConfirmState(null);
          setBulkBusy(true);
          try {
            await Promise.all(deadIds.map(id =>
              fetch(`/api/proxy-pools/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ isActive: false }),
              }).catch(() => {})
            ));
            await fetchProxyPools();
            notify.success(`Disabled ${deadIds.length} dead proxies`);
          } finally {
            setBulkBusy(false);
          }
        }
      });
    } else {
      notify.success(`Health check done. Alive: ${alive}, Dead: ${deadIds.length}`);
    }
  };

  const openBatchImportModal = () => {
    setBatchImportText("");
    setShowBatchImportModal(true);
  };

  const closeBatchImportModal = () => {
    if (importing) return;
    setShowBatchImportModal(false);
  };

  const openVercelModal = () => {
    setVercelForm({ vercelToken: "", projectName: "vercel-relay" });
    setShowVercelModal(true);
  };

  const closeVercelModal = () => {
    if (deploying) return;
    setShowVercelModal(false);
  };

  const openCloudflareModal = () => {
    setCloudflareForm({ accountId: "", apiToken: "", projectName: "cloudflare-relay" });
    setShowCloudflareModal(true);
  };

  const closeCloudflareModal = () => {
    if (deploying) return;
    setShowCloudflareModal(false);
  };

  const openDenoModal = () => {
    setDenoForm({ denoToken: "", orgDomain: "", projectName: "" });
    setShowDenoModal(true);
  };

  const closeDenoModal = () => {
    if (deploying) return;
    setShowDenoModal(false);
  };

  const openCkeyModal = async () => {
    try {
      const res = await fetch("/api/settings", { cache: "no-store" });
      const settings = await res.json();
      if (settings) {
        setCkeyForm((prev) => ({
          ...prev,
          keyproxy: prev.keyproxy || settings.ckeyKeyproxy || "",
          ckeyKey: prev.ckeyKey || settings.ckeyApiKey || settings.ckeyKey || "",
          ckeyApiKey: prev.ckeyApiKey || settings.ckeyApiKey || settings.ckeyKey || "",
        }));
      }
    } catch {
      // ignore
    }
    setShowCkeyModal(true);
  };

  const closeCkeyModal = () => {
    if (ckeySyncing) return;
    setShowCkeyModal(false);
  };

  const handleCkeySync = async () => {
    if (!ckeyForm.keyproxy.trim()) {
      notify.error(translate("Please enter a Proxy Key"));
      return;
    }
    setCkeySyncing(true);
    try {
      const isBatch = ckeyForm.mode !== "single";
      const endpoint = isBatch ? "/api/ckey/proxy/batch-create" : "/api/ckey/proxy/sync";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(ckeyForm),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        await fetchProxyPools();
        closeCkeyModal();
        if (isBatch) {
          const distMsg = data.distributedCount ? ` & auto-assigned across ${data.distributedCount} accounts` : "";
          notify.success(`⚡ Successfully created ${data.count} CKEY Proxy Pools${distMsg}!`);
        } else {
          notify.success(`${translate("CKEY Proxy added to Pool")} (IP: ${data.ip || translate("Active")})`);
        }
      } else {
        notify.error(data.error || translate("Cannot connect to CKEY Proxy"));
      }
    } catch (error) {
      console.log("Error syncing CKEY proxy:", error);
      notify.error(translate("CKEY Proxy sync error"));
    } finally {
      setCkeySyncing(false);
    }
  };

  const handleRotateCkeyIp = async (pool) => {
    setRotatingId(pool.id);
    try {
      const res = await fetch("/api/ckey/proxy/rotate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ poolId: pool.id }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        await fetchProxyPools();
        notify.success(translate("CKEY IP rotated successfully!"));
      } else {
        notify.error(data.reason || data.error || translate("Cannot rotate IP (cooldown 15s)"));
      }
    } catch {
      notify.error(translate("CKEY IP rotation error"));
    } finally {
      setRotatingId(null);
    }
  };

  const handleVercelDeploy = async () => {
    if (!vercelForm.vercelToken.trim()) return;
    setDeploying(true);
    try {
      const res = await fetch("/api/proxy-pools/vercel-deploy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(vercelForm),
      });
      const data = await res.json();
      if (res.ok) {
        await fetchProxyPools();
        closeVercelModal();
        notify.success(`Deployed: ${data.deployUrl}`);
      } else {
        notify.error(data.error || "Deploy failed");
      }
    } catch (error) {
      console.log("Error deploying Vercel relay:", error);
      notify.error("Deploy failed");
    } finally {
      setDeploying(false);
    }
  };

  const handleCloudflareDeploy = async () => {
    if (!cloudflareForm.accountId.trim() || !cloudflareForm.apiToken.trim()) return;
    setDeploying(true);
    try {
      const res = await fetch("/api/proxy-pools/cloudflare-deploy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cloudflareForm),
      });
      const data = await res.json();
      if (res.ok) {
        await fetchProxyPools();
        closeCloudflareModal();
        notify.success(`Deployed: ${data.deployUrl}`);
      } else {
        notify.error(data.error || "Deploy failed");
      }
    } catch (error) {
      console.log("Error deploying Cloudflare relay:", error);
      notify.error("Deploy failed");
    } finally {
      setDeploying(false);
    }
  };

  const handleDenoDeploy = async () => {
    if (!denoForm.denoToken.trim()) return;
    setDeploying(true);
    try {
      const res = await fetch("/api/proxy-pools/deno-deploy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(denoForm),
      });
      const data = await res.json();
      if (res.ok) {
        await fetchProxyPools();
        closeDenoModal();
        notify.success(`Deployed: ${data.deployUrl}`);
      } else {
        notify.error(data.error || "Deploy failed");
      }
    } catch (error) {
      console.log("Error deploying Deno relay:", error);
      notify.error("Deploy failed");
    } finally {
      setDeploying(false);
    }
  };

  const handleBatchImport = async () => {
    const lines = batchImportText
      .split(/\r?\n/)
      .flatMap((line) => { const t = line.trim(); return t ? [t] : []; });

    if (lines.length === 0) {
      notify.warning("Please paste at least one proxy line.");
      return;
    }

    const parsedEntries = [];
    const invalidLines = [];

    lines.forEach((line, index) => {
      try {
        const parsed = parseProxyLine(line);
        if (parsed) {
          parsedEntries.push({
            ...parsed,
            lineNumber: index + 1,
          });
        }
      } catch (error) {
        invalidLines.push(`Line ${index + 1}: ${error.message}`);
      }
    });

    if (invalidLines.length > 0) {
      notify.error(`Invalid proxy format:\n${invalidLines.join("\n")}`);
      return;
    }

    setImporting(true);
    try {
      const existingKeys = new Set(
        proxyPools.map((pool) => `${(pool.proxyUrl || "").trim()}|||${(pool.noProxy || "").trim()}`)
      );

      let created = 0;
      let skipped = 0;
      let failed = 0;

      const { accepted: toCreate, skipped: duplicateCount } = dedupeProxyEntries(parsedEntries, existingKeys);
      skipped += duplicateCount;

      setBatchProgress({ label: "Importing", current: 0, total: toCreate.length });
      const results = await runProxyPoolBatch(toCreate, async (entry) => {
        const res = await fetch("/api/proxy-pools", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: entry.name,
            proxyUrl: entry.proxyUrl,
            noProxy: "",
            isActive: true,
          }),
        });
        return res.ok ? "ok" : "fail";
      }, (current) => setBatchProgress((prev) => ({ ...prev, current })));
      const counts = countBatchResults(results);
      created = counts.ok || 0;
      failed = counts.fail || 0;

      await fetchProxyPools();
      setShowBatchImportModal(false);
      notify.success(`Batch import completed: Created ${created}, Skipped ${skipped}, Failed ${failed}`);
    } catch (error) {
      console.log("Error batch importing proxies:", error);
      notify.error("Batch import failed");
    } finally {
      setBatchProgress({ label: "", current: 0, total: 0 });
      setImporting(false);
    }
  };

  const activeCount = useMemo(
    () => proxyPools.filter((pool) => pool.isActive === true).length,
    [proxyPools]
  );

  if (loading) {
    return (
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-1 sm:gap-6 sm:px-0">
        <CardSkeleton />
        <CardSkeleton />
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-1 sm:gap-6 sm:px-0">
      {/* CKEY Ref Banner — đồng bộ với CkeyMoneyDisplay */}
      <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2 text-sm">
          <span className="text-emerald-600 font-semibold">{translate("CKEY Rotating Proxy")}</span>
          <span className="text-text-muted text-xs">3.3k/day • 19k/week • 60k/month — IP lives 15-30min, unlimited rotation, unlimited bandwidth</span>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={openCkeyModal}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-medium hover:bg-emerald-700 transition-colors shadow-sm"
          >
            <span className="material-symbols-outlined text-[16px]">bolt</span>
            {translate("Add CKEY to Pool")}
          </button>
          <a href="https://ckey.vn/register?ref=ckeyA8497D" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-xs font-medium hover:bg-emerald-500/20">{translate("Sign up for CKEY")} ↗</a>
          <a href="https://ckey.vn/docs" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-border bg-white dark:bg-zinc-800 text-xs font-medium hover:bg-bg">Docs</a>
        </div>
      </div>
      {/* CKEY Money — hiển thị số dư và cơ chế tự xoay */}
      <CkeyMoneyDisplay />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold sm:text-2xl">Proxy Pools</h1>
        </div>

        <div className="grid grid-cols-1 gap-2 sm:flex sm:items-center">
          <div className="relative" ref={relayMenuRef}>
            <Button
              size="sm"
              variant="secondary"
              icon="rocket_launch"
              onClick={() => setShowRelayMenu(!showRelayMenu)}
            >
              Deploy Relay
              <span className="material-symbols-outlined ml-1 text-[18px]">
                {showRelayMenu ? "expand_less" : "expand_more"}
              </span>
            </Button>

            {showRelayMenu && (
              <div className="absolute left-0 top-full z-50 mt-1.5 min-w-[220px] rounded-xl border border-black/10 bg-white p-1.5 shadow-xl dark:border-white/10 dark:bg-zinc-900 sm:left-auto sm:right-0">
                <button type="button"
                  onClick={() => {
                    openCkeyModal();
                    setShowRelayMenu(false);
                  }}
                  className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-emerald-600 dark:text-emerald-400 font-medium transition-colors hover:bg-emerald-500/10 text-left whitespace-nowrap"
                >
                  <span className="material-symbols-outlined text-[20px] text-emerald-500 shrink-0">bolt</span>
                  <span>CKEY {translate("Rotating Proxy")}</span>
                </button>
                <button type="button"
                  onClick={() => {
                    openCloudflareModal();
                    setShowRelayMenu(false);
                  }}
                  className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-text-main transition-colors hover:bg-black/5 dark:hover:bg-white/5 text-left whitespace-nowrap"
                >
                  <span className="material-symbols-outlined text-[20px] text-orange-500 shrink-0">cloud</span>
                  <span>Cloudflare Relay</span>
                </button>
                <button type="button"
                  onClick={() => {
                    openVercelModal();
                    setShowRelayMenu(false);
                  }}
                  className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-text-main transition-colors hover:bg-black/5 dark:hover:bg-white/5 text-left whitespace-nowrap"
                >
                  <span className="material-symbols-outlined text-[20px] text-blue-500 shrink-0">cloud_upload</span>
                  <span>Vercel Relay</span>
                </button>
                <button type="button"
                  onClick={() => {
                    openDenoModal();
                    setShowRelayMenu(false);
                  }}
                  className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-text-main transition-colors hover:bg-black/5 dark:hover:bg-white/5 text-left whitespace-nowrap"
                >
                  <span className="material-symbols-outlined text-[20px] text-green-500 shrink-0">terminal</span>
                  <span>Deno Relay</span>
                </button>
              </div>
            )}
          </div>

          <Button size="sm" variant="secondary" icon="upload" onClick={openBatchImportModal}>
            Batch Import
          </Button>
          <Button size="sm" icon="add" onClick={openCreateModal}>Add Proxy Pool</Button>
        </div>
      </div>

      <Card>
        <div className="mb-4 flex flex-wrap items-center gap-2">
          {proxyPools.length > 0 && (
            <label className="flex items-center gap-1.5 text-xs text-text-muted cursor-pointer">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={toggleSelectAll}
                className="size-4 rounded border-black/20 dark:border-white/20"
              />
              {allSelected ? "Unselect all" : "Select all"}
            </label>
          )}
          <Badge variant="default">Total: {proxyPools.length}</Badge>
          <Badge variant="success">Active: {activeCount}</Badge>
        </div>

        {(selectedIds.length > 0 || healthChecking || batchProgress.total > 0) && (
          <div className="mb-4 flex flex-wrap items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2">
            <span className="material-symbols-outlined text-[18px] text-primary">checklist</span>
            <span className="text-xs font-medium text-primary">
              {batchProgress.total > 0
                ? `${batchProgress.label} ${batchProgress.current}/${batchProgress.total}`
                : selectedIds.length > 0 ? `${selectedIds.length} selected` : "All pools"}
            </span>
            {batchProgress.total > 0 && (
              <div className="w-full basis-full" role="progressbar" aria-valuemin="0" aria-valuemax={batchProgress.total} aria-valuenow={batchProgress.current} aria-label={`${batchProgress.label} progress`}>
                <div className="h-1.5 overflow-hidden rounded-full bg-primary/15">
                  <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${(batchProgress.current / batchProgress.total) * 100}%` }} />
                </div>
              </div>
            )}
            <div className="ml-auto flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                icon={healthChecking ? "progress_activity" : "health_and_safety"}
                onClick={handleHealthCheck}
                disabled={healthChecking || bulkBusy || proxyPools.length === 0}
              >
                {healthChecking ? `Checking ${healthProgress.current}/${healthProgress.total}` : "Health Check"}
              </Button>
              {selectedIds.length > 0 && (
                <>
                  <Button size="sm" variant="secondary" icon="toggle_on" onClick={() => bulkSetActive(true)} disabled={bulkBusy || healthChecking}>
                    Activate
                  </Button>
                  <Button size="sm" variant="secondary" icon="toggle_off" onClick={() => bulkSetActive(false)} disabled={bulkBusy || healthChecking}>
                    Deactivate
                  </Button>
                  <Button size="sm" variant="secondary" icon="delete" onClick={bulkDelete} disabled={bulkBusy || healthChecking}>
                    Delete
                  </Button>
                  <Button size="sm" variant="ghost" onClick={clearSelection} disabled={bulkBusy || healthChecking}>
                    Clear
                  </Button>
                </>
              )}
            </div>
          </div>
        )}

        {proxyPools.length === 0 ? (
          <div className="text-center py-10">
            <p className="text-text-main font-medium mb-1">No proxy pool entries yet</p>
            <p className="text-sm text-text-muted mb-4">
              Create a proxy pool entry, then assign it to connections.
            </p>
            <Button icon="add" onClick={openCreateModal}>Add Proxy Pool</Button>
          </div>
        ) : (
          <div className="flex flex-col divide-y divide-black/[0.04] dark:divide-white/[0.05]">
            {proxyPools.map((pool) => (
              <PoolRow
                key={pool.id}
                pool={pool}
                selected={selectedIds.includes(pool.id)}
                testing={testingId === pool.id}
                rotating={rotatingId === pool.id}
                onSelect={() => toggleSelect(pool.id)}
                onToggle={() => handleToggleActive(pool)}
                onTest={() => handleTest(pool.id)}
                onRotateCkey={() => handleRotateCkeyIp(pool)}
                onEdit={() => openEditModal(pool)}
                onDelete={() => handleDelete(pool)}
              />
            ))}
          </div>
        )}
      </Card>

      <BatchImportModal
        isOpen={showBatchImportModal}
        text={batchImportText}
        importing={importing}
        onChange={setBatchImportText}
        onImport={handleBatchImport}
        onClose={closeBatchImportModal}
      />

      <DeploymentModal isOpen={showVercelModal} title="Deploy Vercel Relay" onClose={closeVercelModal}>
        <div className="flex flex-col gap-4">
          <div className="rounded-lg bg-blue-500/5 border border-blue-500/10 p-3 flex flex-col gap-1.5">
            <p className="text-sm text-text-main font-medium">What is Vercel Relay?</p>
            <p className="text-xs text-text-muted">
              Deploys an edge relay function to Vercel. All AI provider requests will be forwarded through Vercel&apos;s edge network, masking your real IP from providers.
            </p>
            <ul className="text-xs text-text-muted list-disc pl-4 space-y-0.5">
              <li>Your IP is replaced by Vercel&apos;s dynamic edge IPs (hundreds of IPs across 20+ global regions)</li>
              <li>Vercel serves millions of apps — providers can&apos;t block Vercel IPs without affecting legitimate traffic</li>
              <li>Free tier: 100GB bandwidth/month, 500K edge invocations</li>
              <li>Deploy multiple relays on different accounts for more IP diversity</li>
            </ul>
          </div>
          <Input
            label="Vercel API Token"
            value={vercelForm.vercelToken}
            onChange={(e) => setVercelForm((prev) => ({ ...prev, vercelToken: e.target.value }))}
            placeholder="your-vercel-api-token"
            hint={VERCEL_TOKEN_HINT}
            type="password"
          />
          <Input
            label="Project Name"
            value={vercelForm.projectName}
            onChange={(e) => setVercelForm((prev) => ({ ...prev, projectName: e.target.value }))}
            placeholder="my-relay"
            hint="Unique name for your Vercel project. Leave empty for auto-generated name."
          />
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <Button
              fullWidth
              onClick={handleVercelDeploy}
              disabled={!vercelForm.vercelToken.trim() || deploying}
            >
              {deploying ? "Deploying... (may take ~1 min)" : "Deploy"}
            </Button>
            <Button fullWidth variant="ghost" onClick={closeVercelModal} disabled={deploying}>
              Cancel
            </Button>
          </div>
        </div>
      </DeploymentModal>

      <DeploymentModal isOpen={showCloudflareModal} title="Deploy Cloudflare Relay" onClose={closeCloudflareModal}>
        <div className="flex flex-col gap-4">
          <div className="rounded-lg bg-orange-500/5 border border-orange-500/10 p-3 flex flex-col gap-1.5">
            <p className="text-sm text-text-main font-medium">What is Cloudflare Relay?</p>
            <p className="text-xs text-text-muted">
              Deploys a Cloudflare Worker as a proxy relay. All AI provider requests will be forwarded through Cloudflare&apos;s global edge network.
            </p>
            <ul className="text-xs text-text-muted list-disc pl-4 space-y-0.5">
              <li>High performance global routing and IP masking via Cloudflare Workers</li>
              <li>Free tier: 100,000 requests per day</li>
              <li>Requires Cloudflare Account ID and a Workers API Token (Edit Workers permission)</li>
            </ul>
            <div className="mt-2 pt-2 border-t border-orange-500/10 text-xs text-text-muted">
              <p className="font-medium text-text-main mb-1">How to generate your API Token:</p>
              <ol className="list-decimal pl-4 space-y-0.5">
                <li>Go to <b>My Profile</b> → <b>API Tokens</b> → <b>Create Token</b></li>
                <li>Scroll down to <b>Custom Token</b> and click <b>Get started</b></li>
                <li>Under <b>Permissions</b>: Account | Workers Scripts | Edit</li>
                <li>Under <b>Account Resources</b>: Include | Account | <i>Your Account Name</i></li>
                <li>Click <b>Continue to summary</b> → <b>Create Token</b></li>
              </ol>
            </div>
          </div>
          <Input
            label="Account ID"
            value={cloudflareForm.accountId}
            onChange={(e) => setCloudflareForm((prev) => ({ ...prev, accountId: e.target.value }))}
            placeholder="your-cloudflare-account-id"
            hint="Found on the right side of the Cloudflare dashboard overview page."
          />
          <Input
            label="API Token"
            value={cloudflareForm.apiToken}
            onChange={(e) => setCloudflareForm((prev) => ({ ...prev, apiToken: e.target.value }))}
            placeholder="your-cloudflare-api-token"
            hint={CF_TOKEN_HINT}
            type="password"
          />
          <Input
            label="Worker Name"
            value={cloudflareForm.projectName}
            onChange={(e) => setCloudflareForm((prev) => ({ ...prev, projectName: e.target.value }))}
            placeholder="my-relay"
            hint="Unique name for your Cloudflare Worker. Leave empty for auto-generated name."
          />
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <Button
              fullWidth
              onClick={handleCloudflareDeploy}
              disabled={!cloudflareForm.accountId.trim() || !cloudflareForm.apiToken.trim() || deploying}
            >
              {deploying ? "Deploying..." : "Deploy Worker"}
            </Button>
            <Button fullWidth variant="ghost" onClick={closeCloudflareModal} disabled={deploying}>
              Cancel
            </Button>
          </div>
        </div>
      </DeploymentModal>

      <DeploymentModal isOpen={showDenoModal} title="Deploy Deno Relay" onClose={closeDenoModal}>
        <div className="flex flex-col gap-4">
          <div className="rounded-lg bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 p-3 flex flex-col gap-1.5">
            <p className="text-sm text-text-main font-medium">What is Deno Relay?</p>
            <p className="text-xs text-text-muted">
              Deploys a relay worker to Deno Deploy&apos;s global edge network. All AI provider requests are forwarded through Deno&apos;s edge, masking your real IP.
            </p>
            <ul className="text-xs text-text-muted list-disc pl-4 space-y-0.5">
              <li>Deno Deploy v2 runs on a high-performance global edge network</li>
              <li>Free tier: 1M requests & 100GiB outbound traffic per month</li>
              <li>No per-request CPU time limits (unlike Vercel/Cloudflare)</li>
              <li>Support up to 20 active apps & 50 custom domains</li>
              <li>Deploy multiple relays for maximum IP diversity</li>
            </ul>
            <div className="mt-2 pt-2 border-t border-black/10 dark:border-white/10 text-xs text-text-muted">
              <p className="font-medium text-text-main mb-1">How to generate API token:</p>
              <ol className="list-decimal pl-4 space-y-0.5">
                <li>Go to <b>console.deno.com</b></li>
                <li>Select your <b>Organization</b> → <b>Settings</b> → <b>Organization Tokens</b></li>
                <li>Create a <b>Organization Token</b> (prefix <b>ddo_</b>)</li>
              </ol>
            </div>
          </div>
          <Input
            label="Deno Deploy API Token"
            value={denoForm.denoToken}
            onChange={(e) => setDenoForm((prev) => ({ ...prev, denoToken: e.target.value }))}
            placeholder="ddo_xxxxxxxxxxxxxxxx"
            hint="Token is used once for deployment, not stored. Found in Organization Settings."
            type="password"
          />
          <Input
            label="Organization Domain"
            value={denoForm.orgDomain}
            onChange={(e) => setDenoForm((prev) => ({ ...prev, orgDomain: e.target.value }))}
            placeholder="your-org.deno.net"
            hint="Organization's default domain. Your relay URL will be in the format: https://my-relay.your-org.deno.net"
          />
          <Input
            label="App Name"
            value={denoForm.projectName}
            onChange={(e) => setDenoForm((prev) => ({ ...prev, projectName: e.target.value }))}
            placeholder="deno-relay"
            hint="Unique app name. Leave empty for auto-generated name."
          />
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <Button
              fullWidth
              onClick={handleDenoDeploy}
              disabled={!denoForm.denoToken.trim() || !denoForm.orgDomain.trim() || deploying}
            >
              {deploying ? "Deploying..." : "Deploy Relay"}
            </Button>
            <Button fullWidth variant="ghost" onClick={closeDenoModal} disabled={deploying}>
              Cancel
            </Button>
          </div>
        </div>
      </DeploymentModal>

      <CkeyModal
        isOpen={showCkeyModal}
        form={ckeyForm}
        saving={ckeySyncing}
        onChange={(field, value) => setCkeyForm((prev) => ({ ...prev, [field]: value }))}
        onSync={handleCkeySync}
        onRefreshPools={fetchProxyPools}
        onClose={closeCkeyModal}
      />

      <PoolFormModal
        isOpen={showFormModal}
        editingProxyPool={editingProxyPool}
        formData={formData}
        saving={saving}
        onClose={closeFormModal}
        onSave={handleSave}
        onChange={(field, value) => setFormData((prev) => ({ ...prev, [field]: value }))}
      />

      {/* Confirm Modal */}
      <ConfirmModal
        isOpen={!!confirmState}
        onClose={() => setConfirmState(null)}
        onConfirm={confirmState?.onConfirm}
        title={confirmState?.title || "Confirm"}
        message={confirmState?.message}
        variant="danger"
      />
    </div>
  );
}
