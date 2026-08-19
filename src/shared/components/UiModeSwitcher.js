"use client";

import React from "react";
import { useUiMode } from "@/shared/hooks/useUiMode";

export default function UiModeSwitcher({ className = "" }) {
  const { uiMode, toggleUiMode, isStudio } = useUiMode();

  return (
    <button
      type="button"
      onClick={toggleUiMode}
      className={`group relative inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-all duration-300 shadow-xs ${
        isStudio
          ? "border-primary/50 bg-linear-to-r from-primary/15 via-indigo-500/15 to-purple-500/15 text-primary shadow-primary/10 hover:border-primary/70 hover:shadow-md"
          : "border-border bg-surface text-text-muted hover:border-text-muted/40 hover:text-text-main hover:bg-black/5 dark:hover:bg-white/5"
      } ${className}`}
      title={isStudio ? "Chuyển về giao diện Mặc định (Classic)" : "Bật giao diện Cook Riêng (Studio Pro - TeamoRouter Style)"}
      aria-label="Toggle UI Theme Mode"
    >
      <span className={`material-symbols-outlined text-[15px] transition-transform duration-300 ${isStudio ? "text-primary animate-pulse rotate-12" : "text-text-muted group-hover:rotate-45"}`}>
        {isStudio ? "auto_awesome" : "dashboard_customize"}
      </span>
      <span>{isStudio ? "✨ Studio Pro" : "🖥️ Classic"}</span>
      <span className={`h-1.5 w-1.5 rounded-full ${isStudio ? "bg-primary animate-ping" : "bg-text-muted/40"}`} />
    </button>
  );
}
