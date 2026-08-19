"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { translate } from "@/i18n/runtime";

const SEVERITY_STYLES = {
  critical: {
    bg: "bg-red-50 dark:bg-red-950/30",
    border: "border-red-200 dark:border-red-800",
    icon: "🔴",
    text: "text-red-700 dark:text-red-300",
    badge: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
  },
  warning: {
    bg: "bg-amber-50 dark:bg-amber-950/30",
    border: "border-amber-200 dark:border-amber-800",
    icon: "🟡",
    text: "text-amber-700 dark:text-amber-300",
    badge: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300",
  },
  info: {
    bg: "bg-blue-50 dark:bg-blue-950/30",
    border: "border-blue-200 dark:border-blue-800",
    icon: "🔵",
    text: "text-blue-700 dark:text-blue-300",
    badge: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  },
};

function Countdown({ resetsAtMs }) {
  const [remaining, setRemaining] = useState("");

  useEffect(() => {
    if (!resetsAtMs) return;
    const update = () => {
      const diff = resetsAtMs - Date.now();
      if (diff <= 0) {
        setRemaining("expired");
        return;
      }
      const mins = Math.floor(diff / 60_000);
      const secs = Math.floor((diff % 60_000) / 1000);
      setRemaining(mins > 0 ? `${mins}m ${secs}s` : `${secs}s`);
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [resetsAtMs]);

  if (!resetsAtMs) return null;
  return (
    <span className="text-xs font-mono text-amber-600 dark:text-amber-400 ml-1">
      ⏳ {remaining}
    </span>
  );
}

function IssueRow({ issue }) {
  const style = SEVERITY_STYLES[issue.severity] || SEVERITY_STYLES.info;
  const providerLabel = issue.providerName || issue.provider;

  return (
    <div
      className={`flex items-center justify-between gap-3 rounded-lg border px-3 py-2 ${style.bg} ${style.border}`}
    >
      <div className="flex items-center gap-2 min-w-0 flex-wrap sm:flex-nowrap">
        <span className="text-sm flex-shrink-0">{style.icon}</span>

        {providerLabel && (
          <span
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-surface-2 dark:bg-surface-3 text-text-main border border-border-subtle shadow-2xs flex-shrink-0"
          >
            {providerLabel}
          </span>
        )}

        {issue.connectionName && (
          <span
            className="inline-flex items-center text-xs font-mono text-text-muted bg-surface-1/80 px-1.5 py-0.5 rounded border border-border-subtle/60 truncate max-w-[150px] flex-shrink-0"
            title={issue.connectionName}
          >
            {issue.connectionName}
          </span>
        )}

        <span
          className={`text-sm font-medium ${style.text} truncate`}
          title={issue.message}
        >
          {issue.message}
        </span>

        {issue.resetsAtMs && <Countdown resetsAtMs={issue.resetsAtMs} />}
      </div>

      {issue.link && (
        <Link
          href={issue.link}
          className={`text-xs font-medium px-2.5 py-1 rounded-md shadow-xs ${style.badge} hover:opacity-90 hover:scale-[1.02] active:scale-[0.98] transition-all flex-shrink-0`}
        >
          {issue.actionLabel || `${translate("Fix")} →`}
        </Link>
      )}
    </div>
  );
}

function AllGood() {
  return (
    <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 text-sm font-medium py-2">
      <span>🟢</span>
      <span>{translate("All systems operational")}</span>
    </div>
  );
}

export default function IncidentAlerts({ data: propData, loading: propLoading }) {
  const [internalData, setInternalData] = useState(null);
  const [internalLoading, setInternalLoading] = useState(true);
  const [expanded, setExpanded] = useState(true);

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
        <div className="h-4 bg-surface-3 rounded w-48" />
      </div>
    );
  }

  if (!data || data.incidentSummary?.healthy) {
    return (
      <div className="rounded-xl border border-emerald-200 dark:border-emerald-800/60 bg-emerald-50 dark:bg-emerald-950/30 px-4 py-3">
        <AllGood />
      </div>
    );
  }

  const { incidentSummary, incidents } = data;
  const count = incidentSummary.total;

  return (
    <div className="rounded-xl border border-border-subtle bg-surface-1 overflow-hidden shadow-sm">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-surface-2 transition-colors cursor-pointer"
      >
        <div className="flex items-center gap-2">
          <span className="text-base">
            {incidentSummary.critical > 0 ? "🚨" : "⚠️"}
          </span>
          <span className="text-sm font-semibold text-text-main">
            {count} {count !== 1 ? translate("issues detected") : translate("issue detected")}
          </span>
          <div className="flex gap-1 ml-1">
            {incidentSummary.critical > 0 && (
              <span className="text-xs font-medium px-1.5 py-0.5 rounded bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300">
                {incidentSummary.critical} {translate("critical")}
              </span>
            )}
            {incidentSummary.warning > 0 && (
              <span className="text-xs font-medium px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300">
                {incidentSummary.warning} {translate("warning")}
              </span>
            )}
            {incidentSummary.info > 0 && (
              <span className="text-xs font-medium px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                {incidentSummary.info} {translate("info")}
              </span>
            )}
          </div>
        </div>
        <span className="text-text-muted text-xs">
          {expanded ? "▲" : "▼"}
        </span>
      </button>

      {expanded && (
        <div className="px-4 pb-3 space-y-1.5">
          {incidents.map((issue, i) => (
            <IssueRow key={`${issue.type}-${issue.provider || ""}-${i}`} issue={issue} />
          ))}
        </div>
      )}
    </div>
  );
}
