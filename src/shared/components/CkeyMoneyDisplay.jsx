"use client";

import { useEffect, useState, useCallback } from "react";
import { CKEY_REF_LINK } from "@/lib/ckey/client.js";
import { translate } from "@/i18n/runtime";

export default function CkeyMoneyDisplay({ compact = false }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [rotating, setRotating] = useState("");

  const fetchBalance = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/ckey/balance");
      const json = await res.json();
      if (!res.ok || json.success === false) {
        setError(json.error || json.raw?.profile?.message || "Failed to fetch balance");
        setData(null);
      } else {
        setData(json);
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchBalance(); }, [fetchBalance]);

  const handleRotate = async (poolId) => {
    if (!poolId) return;
    setRotating(poolId);
    try {
      const res = await fetch("/api/ckey/proxy/rotate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ poolId }),
      });
      const json = await res.json();
      if (json.success) {
        // refresh
        await fetchBalance();
      } else {
        setError(json.reason || json.error || "Rotation failed");
      }
    } catch (e) { setError(e.message); }
    finally { setRotating(""); }
  };

  if (loading) {
    return (
      <div className={`rounded-xl border border-border bg-surface p-3 ${compact ? "p-2" : ""}`}>
        <div className="animate-pulse flex gap-3">
          <div className="h-8 w-24 bg-bg rounded" />
          <div className="h-8 w-32 bg-bg rounded" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm">
        <div className="font-medium text-amber-600">CKEY: {error}</div>
        <div className="text-xs text-text-muted mt-1">{translate("Configure CKEY_API_KEY at Settings → CKEY or env CKEY_API_KEY to display balance.")}</div>
        <button type="button" onClick={fetchBalance} className="mt-2 text-xs underline">{translate("Retry")}</button>
      </div>
    );
  }

  const bal = data?.balance;
  const stats = data?.stats;

  return (
    <div className="rounded-xl border border-border bg-surface p-3 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold">💰 CKEY</span>
          {bal && (
            <span className="text-sm font-bold text-emerald-600">
              {bal.formatted}
            </span>
          )}
          {bal?.masked && <span className="text-xs text-text-muted">({bal.masked})</span>}
        </div>
        <button type="button" onClick={fetchBalance} className="text-xs px-2 py-1 rounded bg-bg hover:bg-border border border-border">↻ {translate("Refresh")}</button>
      </div>

      {stats && (
        <div className="flex flex-wrap gap-3 text-xs text-text-muted">
          <span>{translate("Used")}: <b className="text-text-main">{stats.chargedText}</b></span>
          <span>Requests: {stats.requests} (OK {stats.successRequests})</span>
          <span>Tokens: {stats.promptTokens + stats.completionTokens}</span>
        </div>
      )}

      {/* Auto-rotate hint + Ref */}
      <div className="text-[11px] text-text-muted flex items-center gap-2 flex-wrap">
        <span className="inline-flex items-center gap-1">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          {translate("Auto-rotate on 403 Ray ID / 502 / timeout — 15s cooldown per pool. Unlimited IP rotation, unlimited bandwidth.")}
        </span>
        <a href={CKEY_REF_LINK} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-primary/10 text-primary hover:bg-primary/15 border border-primary/20 text-[11px] font-medium">
          {translate("Sign up for CKEY")} ↗
        </a>
      </div>
    </div>
  );
}
