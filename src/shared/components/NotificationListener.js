"use client";

import { useEffect, useRef } from "react";
import { useNotificationStore } from "@/store/notificationStore";

const SEVERITY_MAP = {
  critical: { type: "error", duration: 0 },
  warning: { type: "warning", duration: 10000 },
  info: { type: "info", duration: 5000 },
};

const RECONNECT_DELAY_MS = 5000;

export default function NotificationListener() {
  const addNotification = useNotificationStore((s) => s.addNotification);
  const dedupRef = useRef(new Map());
  const esRef = useRef(null);
  const reconnectTimerRef = useRef(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;

    const pushNotification = (n) => {
      const key = `${n.provider || ""}|${n.model || ""}|${n.status || ""}|${n.category || ""}`;
      const now = Date.now();

      // Client-side dedup: same key within 30s → update count on existing toast
      const existing = dedupRef.current.get(key);
      if (existing && now - existing.ts < 30000) {
        existing.count++;
        // The toast is still visible — no need to re-add, the count is tracked
        return;
      }

      const mapped = SEVERITY_MAP[n.severity] || SEVERITY_MAP.info;
      const title = n.autoDisabled
        ? "Auto-Disabled"
        : n.category === "all_models_failed"
        ? "Combo Failed"
        : n.category === "auth"
        ? "Auth Error"
        : n.category === "quota"
        ? "Quota Warning"
        : null;

      const suffix = existing?.count > 1 ? ` (x${existing.count + 1})` : "";
      const toastId = addNotification({
        type: mapped.type,
        title,
        message: `${n.message}${suffix}`,
        duration: mapped.duration,
      });

      dedupRef.current.set(key, { ts: now, count: 0, toastId });
    };

    const connect = () => {
      if (!mountedRef.current) return;
      const es = new EventSource("/api/notifications/stream");
      esRef.current = es;

      es.addEventListener("message", (e) => {
        try {
          const data = JSON.parse(e.data);
          if (data.type === "init" && Array.isArray(data.notifications)) {
            // On connect, only show critical notifications from buffer
            for (const n of data.notifications) {
              if (n.severity === "critical") {
                pushNotification(n);
              }
            }
            return;
          }
          if (data.type === "notification" && data.notification) {
            pushNotification(data.notification);
          }
        } catch {
          // ignore parse errors
        }
      });

      es.onerror = () => {
        // EventSource auto-reconnect is defeated by close() — reconnect manually.
        // Only reconnect if this is still the active connection.
        if (esRef.current !== es) return;
        es.close();
        esRef.current = null;
        if (!mountedRef.current) return;
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = setTimeout(connect, RECONNECT_DELAY_MS);
      };
    };

    connect();

    return () => {
      mountedRef.current = false;
      clearTimeout(reconnectTimerRef.current);
      if (esRef.current) esRef.current.close();
      esRef.current = null;
      dedupRef.current.clear();
    };
  }, [addNotification]);

  return null;
}
