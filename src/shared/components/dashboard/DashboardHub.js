"use client";

import { useState, useEffect, useCallback } from "react";
import IncidentAlerts from "./IncidentAlerts";
import SystemPulse from "./SystemPulse";
import LiveQuotaTracker from "./LiveQuotaTracker";
import EndpointPageClient from "@/app/(dashboard)/dashboard/endpoint/EndpointPageClient";

export default function DashboardHub({ machineId }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/hub/status");
      if (res.ok) {
        const json = await res.json();
        setData(json);
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
    return () => clearInterval(interval);
  }, [fetchStatus]);

  return (
    <div className="space-y-4">
      {/* Incident Alerts — top, full width */}
      <IncidentAlerts data={data} loading={loading} />

      {/* System Pulse + Quota — 2 columns on desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <SystemPulse data={data} loading={loading} />
        <LiveQuotaTracker data={data} loading={loading} />
      </div>

      {/* Endpoint section below */}
      <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
        <EndpointPageClient machineId={machineId} />
      </div>
    </div>
  );
}
