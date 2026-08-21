"use client";

import { useState, useEffect, useCallback } from "react";
import IncidentAlerts from "./IncidentAlerts";
import SystemPulse from "./SystemPulse";
import LiveQuotaTracker from "./LiveQuotaTracker";
import GatewayStatusCard from "./GatewayStatusCard";

export default function DashboardHub({ machineId }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/hub/status", { cache: "no-store" });
      if (res.ok) {
        const json = await res.json();
        setData(json);
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("hubStatusChanged", { detail: json }));
        }
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 30_000);

    if (typeof window !== "undefined") {
      window.addEventListener("connectionChanged", fetchStatus);
      window.addEventListener("customModelChanged", fetchStatus);
    }

    return () => {
      clearInterval(interval);
      if (typeof window !== "undefined") {
        window.removeEventListener("connectionChanged", fetchStatus);
        window.removeEventListener("customModelChanged", fetchStatus);
      }
    };
  }, [fetchStatus]);

  return (
    <div className="space-y-6">
      {/* Incident Alerts — top, full width */}
      <IncidentAlerts data={data} loading={loading} />

      {/* Gateway Status & Quick URL Widget */}
      <GatewayStatusCard />

      {/* System Pulse + Quota — 2 columns on desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <SystemPulse data={data} loading={loading} />
        <LiveQuotaTracker data={data} loading={loading} />
      </div>
    </div>
  );
}
