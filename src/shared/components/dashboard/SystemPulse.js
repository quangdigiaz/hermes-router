"use client";

import { useState, useEffect, useCallback } from "react";
import { translate } from "@/i18n/runtime";

function MetricCard({ icon, label, value, sub, color = "gray" }) {
  const colors = {
    gray: "text-text-main",
    green: "text-emerald-600 dark:text-emerald-400",
    amber: "text-amber-600 dark:text-amber-400",
    red: "text-red-600 dark:text-red-400",
  };
  return (
    <div className="rounded-xl border border-border-subtle bg-surface-1 px-4 py-3 shadow-sm">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-base">{icon}</span>
        <span className="text-xs font-medium text-text-muted uppercase tracking-wide">
          {label}
        </span>
      </div>
      <div className={`text-xl font-bold ${colors[color]}`}>{value}</div>
      {sub && (
        <div className="text-xs text-text-muted mt-0.5">{sub}</div>
      )}
    </div>
  );
}

export default function SystemPulse({ data: propData, loading: propLoading }) {
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
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-xl border border-border-subtle bg-surface-1 px-4 py-3 animate-pulse">
            <div className="h-3 bg-surface-3 rounded w-20 mb-2" />
            <div className="h-6 bg-surface-3 rounded w-16" />
          </div>
        ))}
      </div>
    );
  }

  const pulse = data?.systemPulse || {};
  const providers = pulse.providers || {};
  const proxy = pulse.proxyHealth || {};

  const hasProviders = (providers.total || 0) > 0;
  const isAllOnline = hasProviders && providers.active === providers.total && !providers.error;
  const providerColor =
    providers.error > 0 ? "red" : isAllOnline ? "green" : "amber";
  const proxyColor = proxy.percent >= 80 ? "green" : proxy.percent >= 50 ? "amber" : "red";
  const activityColor = pulse.errorsToday > 10 ? "amber" : pulse.errorsToday > 0 ? "amber" : "green";

  let providerSub = translate("All online");
  if (providers.error > 0) {
    providerSub = `${providers.error} ${translate("with errors")}`;
  } else if (hasProviders && providers.active < providers.total) {
    const inactive = providers.total - providers.active;
    providerSub = `${inactive} ${translate("inactive")}`;
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      <MetricCard
        icon="🔌"
        label={translate("Providers")}
        value={`${providers.active || 0} / ${providers.total || 0}`}
        sub={providerSub}
        color={providerColor}
      />
      <MetricCard
        icon="🛡️"
        label={translate("Proxy Health")}
        value={`${proxy.percent ?? 100}%`}
        sub={
          proxy.total > 0
            ? `${proxy.healthy}/${proxy.total} ${translate("pools healthy")}`
            : translate("No proxy pools")
        }
        color={proxyColor}
      />
      <MetricCard
        icon="⚡"
        label={translate("Activity Today")}
        value={pulse.requestsToday ?? 0}
        sub={
          pulse.errorsToday > 0
            ? `${pulse.errorsToday} ${translate("errors")}`
            : translate("No errors")
        }
        color={activityColor}
      />
    </div>
  );
}
