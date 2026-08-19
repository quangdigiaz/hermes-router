"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import Badge from "@/shared/components/Badge";
import ProviderIcon from "@/shared/components/ProviderIcon";
import Toggle from "@/shared/components/Toggle";
import { getStatusDisplay, TIER_VARIANT, BADGE_ICON } from "@/shared/constants/providerUi";
import { getProviderIconSrc } from "@/shared/utils/providerIcon";
import {
  OPENAI_COMPATIBLE_PREFIX,
  ANTHROPIC_COMPATIBLE_PREFIX,
} from "@/shared/constants/providers";

export default function StudioProvidersView({
  providers,
  connections,
  providerNodes,
  getProviderStats,
  handleToggleProvider,
  handleBatchTest,
  testingMode,
  searchQuery,
  filterTier,
  setFilterTier,
  tierFilters,
  setShowAddCompatibleModal,
  setShowAddAnthropicCompatibleModal,
}) {
  const [activeTab, setActiveTab] = useState("all");
  const [modelSearch, setModelSearch] = useState("");

  // Compute total stats
  const totalStats = useMemo(() => {
    const totalConn = connections.filter((c) => c.isActive !== false).length;
    const errorConn = connections.filter((c) => c.testStatus === "error" || c.testStatus === "payment_required").length;
    const paymentReq = connections.filter((c) => c.testStatus === "payment_required" || c.lastErrorType === "payment_required").length;
    return { totalConn, errorConn, paymentReq };
  }, [connections]);

  const studioTabs = [
    { id: "all", label: "All Providers", icon: "grid_view" },
    { id: "official", label: "Official APIs", icon: "verified" },
    { id: "free", label: "Free Tier", icon: "sparkles" },
    { id: "bridge", label: "Bridge / OAuth", icon: "link" },
    { id: "compatible", label: "Custom Compatible", icon: "tune" },
  ];

  return (
    <div className="flex flex-col gap-8 pb-16">
      {/* 🌟 Luminous Studio Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl border border-black/10 dark:border-white/10 bg-linear-to-b from-white/90 via-slate-50/80 to-slate-100/60 dark:from-[#181924]/90 dark:via-[#13141f]/80 dark:to-[#0e0f17]/90 p-6 sm:p-8 backdrop-blur-xl shadow-xl shadow-black/5 dark:shadow-black/40">
        {/* Soft Ambient Glow Accents */}
        <div className="pointer-events-none absolute -left-20 -top-20 h-64 w-64 rounded-full bg-indigo-500/15 blur-3xl" />
        <div className="pointer-events-none absolute -right-20 -bottom-20 h-64 w-64 rounded-full bg-purple-500/15 blur-3xl" />

        <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                <span className="h-1.5 w-1.5 rounded-full bg-primary animate-ping" />
                Hermes Studio Pro
              </span>
              {totalStats.paymentReq > 0 && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-red-500/30 bg-red-500/10 px-2.5 py-0.5 text-xs font-semibold text-red-500 animate-pulse">
                  <span className="material-symbols-outlined text-[13px]">payments</span>
                  {totalStats.paymentReq} cần nạp tiền
                </span>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              AI Provider &amp; Model Routing Hub
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400 max-w-2xl">
              Quản lý định tuyến đa nhà cung cấp, kiểm soát số dư ví, tự động failover và tối ưu hóa chi phí token với giao diện Studio thế hệ mới.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => handleBatchTest("all")}
              disabled={!!testingMode}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-4 py-2.5 text-xs font-semibold shadow-md transition-all hover:opacity-90 hover:scale-[1.02] active:scale-[0.98]"
            >
              <span className={`material-symbols-outlined text-[15px] ${testingMode ? "animate-spin" : ""}`}>
                {testingMode ? "refresh" : "play_arrow"}
              </span>
              <span>{testingMode ? "Đang kiểm tra..." : "Kiểm tra tất cả"}</span>
            </button>
            <button
              type="button"
              onClick={() => setShowAddCompatibleModal(true)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white/70 dark:bg-slate-800/70 backdrop-blur-md px-3.5 py-2.5 text-xs font-semibold text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/70 transition-all"
            >
              <span className="material-symbols-outlined text-[15px]">add</span>
              <span>Thêm OpenAI Endpoint</span>
            </button>
          </div>
        </div>

        {/* Quick KPI Stats Counter */}
        <div className="relative z-10 mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4 pt-6 border-t border-black/5 dark:border-white/5">
          <div className="flex flex-col">
            <span className="text-xs text-slate-500 dark:text-slate-400">Kết nối đang bật</span>
            <span className="text-xl font-bold text-slate-900 dark:text-white">{totalStats.totalConn} accounts</span>
          </div>
          <div className="flex flex-col">
            <span className="text-xs text-slate-500 dark:text-slate-400">Trạng thái hệ thống</span>
            <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              100% Sẵn sàng
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-xs text-slate-500 dark:text-slate-400">Phát hiện Paywall</span>
            <span className={`text-xl font-bold ${totalStats.paymentReq > 0 ? "text-red-500" : "text-slate-700 dark:text-slate-300"}`}>
              {totalStats.paymentReq > 0 ? `${totalStats.paymentReq} Provider` : "0 lỗi"}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-xs text-slate-500 dark:text-slate-400">Failover Engine</span>
            <span className="text-xl font-bold text-indigo-600 dark:text-indigo-400">Fast-Skip Active</span>
          </div>
        </div>
      </div>

      {/* 🧭 Studio Filter Tabs */}
      <div className="flex items-center justify-between gap-4 border-b border-black/5 dark:border-white/5 pb-4 overflow-x-auto">
        <div className="flex items-center gap-2">
          {studioTabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold transition-all ${
                activeTab === tab.id
                  ? "bg-primary text-white shadow-md shadow-primary/20"
                  : "bg-black/5 dark:bg-white/5 text-slate-600 dark:text-slate-400 hover:bg-black/10 dark:hover:bg-white/10 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <span className="material-symbols-outlined text-[14px]">{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 🔮 Studio Provider Cards Grid with Brand Glow */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {providers.map(([key, info]) => {
          const stats = getProviderStats(key, info.authType || "apikey");
          const brandColor = info.color || "#6366F1";
          const hasError = stats.error > 0;

          return (
            <Link
              key={key}
              href={`/dashboard/providers/${key}`}
              className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-black/8 dark:border-white/8 bg-white/80 dark:bg-[#141520]/80 p-4 backdrop-blur-md transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/5 dark:hover:shadow-black/30"
              style={{
                boxShadow: `0 0 0 1px ${brandColor}15, 0 8px 24px -8px ${brandColor}20`,
              }}
            >
              {/* Top Accent Line */}
              <div
                className="absolute inset-x-0 top-0 h-[2px] opacity-70 group-hover:opacity-100 transition-opacity"
                style={{ backgroundColor: brandColor }}
              />

              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div
                    className="flex size-10 shrink-0 items-center justify-center rounded-xl p-1.5 shadow-xs"
                    style={{ backgroundColor: `${brandColor}18` }}
                  >
                    <ProviderIcon
                      src={getProviderIconSrc(info.id || key)}
                      alt={info.name}
                      size={32}
                      className="object-contain max-h-[28px] max-w-[28px] rounded-lg"
                      fallbackText={info.textIcon || key.slice(0, 2).toUpperCase()}
                      fallbackColor={brandColor}
                    />
                  </div>

                  <div className="min-w-0 flex-1">
                    <h3
                      className="truncate text-sm font-bold text-slate-900 dark:text-white group-hover:text-primary transition-colors"
                      title={info.name}
                    >
                      {info.name}
                    </h3>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                      {info.curatedTier && info.curatedTier !== "community" && (
                        <Badge
                          variant={TIER_VARIANT[info.curatedTier] || "default"}
                          size="sm"
                          icon={info.curatedTier === "official" ? "verified" : undefined}
                        >
                          {info.curatedTier}
                        </Badge>
                      )}
                      {info.badges?.filter((b) => b !== "free").slice(0, 2).map((badge) => (
                        <Badge key={badge} variant="default" size="sm" icon={BADGE_ICON[badge]}>
                          {badge}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>

                <div
                  className="shrink-0"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleToggleProvider(key, info.authType || "apikey", !stats.allDisabled);
                  }}
                >
                  <Toggle
                    size="sm"
                    checked={!stats.allDisabled}
                    onChange={() => {}}
                    title={stats.allDisabled ? "Bật provider" : "Tắt provider"}
                  />
                </div>
              </div>

              {/* Bottom Connection Status Row */}
              <div className="mt-4 flex items-center justify-between border-t border-black/5 dark:border-white/5 pt-3 text-xs">
                <div className="flex items-center gap-1.5">
                  {stats.allDisabled ? (
                    <span className="inline-flex items-center gap-1 text-slate-400">
                      <span className="material-symbols-outlined text-[13px]">pause_circle</span>
                      <span>Đã tắt</span>
                    </span>
                  ) : (
                    getStatusDisplay(stats.connected, stats.error, stats.errorCode)
                  )}
                </div>
                <span className="text-[11px] font-mono text-slate-400">
                  {stats.connected > 0 ? `${stats.connected} conn` : "No conn"}
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
