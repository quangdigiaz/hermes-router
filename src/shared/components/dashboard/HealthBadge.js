"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

export default function HealthBadge() {
  const [count, setCount] = useState(0);
  const [critical, setCritical] = useState(0);

  useEffect(() => {
    let mounted = true;
    const check = async () => {
      try {
        const res = await fetch("/api/hub/status");
        if (res.ok && mounted) {
          const data = await res.json();
          const summary = data.incidentSummary || data.summary || {};
          setCount(summary.total || 0);
          setCritical(summary.critical || 0);
        }
      } catch {
        // ignore
      }
    };
    check();
    const interval = setInterval(check, 30_000);
    return () => { mounted = false; clearInterval(interval); };
  }, []);

  if (count === 0) return null;

  return (
    <Link
      href="/dashboard"
      className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors"
    >
      <span className="text-sm">{critical > 0 ? "🚨" : "⚠️"}</span>
      <span className="text-xs font-semibold text-red-700 dark:text-red-300">
        {count} issue{count !== 1 ? "s" : ""}
      </span>
    </Link>
  );
}
