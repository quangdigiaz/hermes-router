"use client";

import { useState, useEffect, useCallback } from "react";
import { translate } from "@/i18n/runtime";

function ProgressBar({ value, max, color = "brand", label, sub, mode = "usage" }) {
  const percent = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  const colors = {
    brand: "bg-brand-500",
    green: "bg-emerald-500",
    amber: "bg-amber-500",
    red: "bg-red-500",
  };

  let barColor;
  if (mode === "health") {
    // Health / Availability mode: 100% or high is healthy (green), drops to amber, then red
    if (percent >= 90) {
      barColor = colors.green;
    } else if (percent >= 50) {
      barColor = colors.amber;
    } else {
      barColor = colors.red;
    }
  } else {
    // Usage / Quota mode: lower is normal, higher is warning/danger
    if (percent > 90) {
      barColor = colors.red;
    } else if (percent > 70) {
      barColor = colors.amber;
    } else {
      barColor = colors[color] || colors.brand;
    }
  }

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-text-main">{label}</span>
        <span className="text-xs text-text-muted">
          {value} / {max}
        </span>
      </div>
      <div className="h-2 rounded-full bg-surface-3 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${barColor}`}
          style={{ width: `${percent}%` }}
        />
      </div>
      {sub && (
        <div className="text-[10px] text-text-muted">{sub}</div>
      )}
    </div>
  );
}

function QuotaRow({ icon, label, value, max, sub, color, mode = "usage" }) {
  return (
    <div className="flex items-start gap-3">
      <span className="text-base mt-0.5 flex-shrink-0">{icon}</span>
      <div className="flex-1 min-w-0">
        <ProgressBar value={value} max={max} label={label} sub={sub} color={color} mode={mode} />
      </div>
    </div>
  );
}

export default function LiveQuotaTracker({ data: propData, loading: propLoading }) {
  const [internalData, setInternalData] = useState(null);
  const [internalLoading, setInternalLoading] = useState(true);

  const isControlled = propData !== undefined;
  const data = isControlled ? propData : internalData;
  const loading = isControlled ? Boolean(propLoading) : internalLoading;

  const fetchStatus = useCallback(async () => {
    if (isControlled) return;
    try {
      const res = await fetch("/api/hub/status");
      if (res.ok) {
        const json = await res.json();
        setInternalData(json);
      }
    } catch {
      // ignore
    } finally {
      setInternalLoading(false);
    }
  }, [isControlled]);

  useEffect(() => {
    if (isControlled) return;
    fetchStatus();
    const interval = setInterval(fetchStatus, 30_000);
    return () => clearInterval(interval);
  }, [fetchStatus, isControlled]);

  if (loading && !data) {
    return (
      <div className="rounded-xl border border-border-subtle bg-surface-1 p-4 animate-pulse">
        <div className="h-4 bg-surface-3 rounded w-32 mb-3" />
        <div className="h-3 bg-surface-3 rounded w-full mb-2" />
        <div className="h-3 bg-surface-3 rounded w-full" />
      </div>
    );
  }

  const pulse = data?.systemPulse || {};
  const providers = pulse.providers || {};
  const proxy = pulse.proxyHealth || {};
  const activeCooldowns = pulse.activeCooldowns || 0;

  const hasProviders = (providers.total || 0) > 0;
  const isAllHealthy = hasProviders && providers.active === providers.total && !providers.error;

  return (
    <div className="rounded-xl border border-border-subtle bg-surface-1 px-4 py-3 space-y-3 shadow-sm">
      <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wide">
        🔋 {translate("System & Quota Health")}
      </h3>

      <QuotaRow
        icon="🔌"
        label={translate("Active Providers")}
        value={providers.active || 0}
        max={providers.total || 1}
        sub={
          providers.error > 0
            ? `${providers.error} ${translate("with errors")}${providers.accounts?.total ? ` (${providers.accounts.active}/${providers.accounts.total} accs)` : ""}`
            : isAllHealthy
            ? `${translate("All healthy")}${providers.accounts?.total ? ` (${providers.accounts.active}/${providers.accounts.total} accs)` : ""}`
            : hasProviders
            ? `${providers.total - providers.active} ${translate("inactive")}${providers.accounts?.total ? ` (${providers.accounts.active}/${providers.accounts.total} accs)` : ""}`
            : ""
        }
        color="green"
        mode="health"
      />

      <QuotaRow
        icon="🛡️"
        label={translate("Proxy Pools")}
        value={proxy.healthy ?? 0}
        max={proxy.total ?? 0}
        sub={
          (proxy.total ?? 0) > 0
            ? `${proxy.healthy ?? 0}/${proxy.total} ${translate("pools active")} (${proxy.percent ?? 100}% ${translate("fitness")})`
            : translate("No pools configured")
        }
        color="brand"
        mode={(proxy.total ?? 0) > 0 ? "health" : "usage"}
      />

      {activeCooldowns > 0 && (
        <QuotaRow
          icon="⏳"
          label={translate("Active Cooldowns")}
          value={activeCooldowns}
          max={activeCooldowns + 5}
          sub={translate("Models / pools in cooldown")}
          color="amber"
          mode="usage"
        />
      )}

      <QuotaRow
        icon="📊"
        label={translate("Requests Today")}
        value={pulse.requestsToday ?? 0}
        max={Math.max(pulse.requestsToday ?? 100, 100)}
        sub={
          pulse.errorsToday > 0
            ? `${pulse.errorsToday} ${translate("errors")}`
            : translate("No errors")
        }
        color="green"
        mode="usage"
      />
    </div>
  );
}
