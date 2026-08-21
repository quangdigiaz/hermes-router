"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useCopyToClipboard } from "@/shared/hooks/useCopyToClipboard";

export default function GatewayStatusCard() {
  const [endpointUrl, setEndpointUrl] = useState("/v1");
  const [tunnelInfo, setTunnelInfo] = useState({ enabled: false, url: "" });
  const [tsInfo, setTsInfo] = useState({ enabled: false, url: "" });
  const { copied, copy } = useCopyToClipboard();

  useEffect(() => {
    if (typeof window !== "undefined") {
      setEndpointUrl(`${window.location.origin}/v1`);
    }

    // Fetch tunnel / tailscale status
    fetch("/api/tunnel", { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => {
        if (data.tunnelUrl || data.publicUrl) {
          setTunnelInfo({
            enabled: true,
            url: `${data.publicUrl || data.tunnelUrl}/v1`,
          });
        }
      })
      .catch(() => {});

    fetch("/api/tailscale", { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => {
        if (data.enabled && data.tunnelUrl) {
          setTsInfo({
            enabled: true,
            url: `${data.tunnelUrl}/v1`,
          });
        }
      })
      .catch(() => {});
  }, []);

  const activeUrl = tunnelInfo.enabled && tunnelInfo.url
    ? tunnelInfo.url
    : tsInfo.enabled && tsInfo.url
    ? tsInfo.url
    : endpointUrl;

  return (
    <div className="rounded-2xl border border-border/80 bg-surface/90 shadow-sm backdrop-blur-md p-5 sm:p-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
        {/* Left info & URL */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Gateway Active
            </span>
            <span className="text-xs font-mono text-text-muted">
              OpenAI &amp; Anthropic Compatible
            </span>
          </div>

          <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
            Universal AI Gateway Endpoint
          </h3>
          <p className="text-xs text-text-muted mt-0.5 mb-3.5">
            Use this unified endpoint for Claude Code, Codex, Cline, Cursor, or your custom SDK scripts.
          </p>

          {/* Copyable endpoint box */}
          <div className="flex items-center gap-2 max-w-2xl">
            <div className="relative flex-1 min-w-0 flex items-center rounded-xl border border-border bg-black/5 dark:bg-black/40 px-3.5 py-2 font-mono text-xs sm:text-sm text-text-main overflow-hidden">
              <span className="text-text-muted mr-2 shrink-0 select-none">POST</span>
              <span className="truncate select-all">{activeUrl}</span>
            </div>
            <button
              type="button"
              onClick={() => copy(activeUrl, "gateway_url")}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-primary text-white text-xs font-semibold hover:opacity-90 transition-all shadow-xs shrink-0 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">
                {copied === "gateway_url" ? "check" : "content_copy"}
              </span>
              <span>{copied === "gateway_url" ? "Copied!" : "Copy"}</span>
            </button>
          </div>
        </div>

        {/* Right quick actions */}
        <div className="flex flex-col sm:flex-row lg:flex-col gap-2 shrink-0">
          <Link
            href="/dashboard/endpoint"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-4 py-2.5 text-xs font-semibold shadow-xs hover:opacity-90 transition-all"
          >
            <span className="material-symbols-outlined text-[16px]">vpn_key</span>
            <span>API Keys &amp; Gateway Setup →</span>
          </Link>
          <Link
            href="/dashboard/providers"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-surface text-text-main px-4 py-2 text-xs font-medium hover:bg-black/5 dark:hover:bg-white/5 transition-all"
          >
            <span className="material-symbols-outlined text-[16px]">dns</span>
            <span>Manage Providers</span>
          </Link>
        </div>
      </div>

      {/* Quick feature link badges */}
      <div className="mt-5 pt-4 border-t border-border/50 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <Link
          href="/dashboard/combos"
          className="p-2.5 rounded-xl border border-border/50 bg-black/[0.02] dark:bg-white/[0.02] hover:bg-black/5 dark:hover:bg-white/5 transition-colors flex items-center gap-2.5"
        >
          <span className="material-symbols-outlined text-primary text-[18px]">layers</span>
          <div className="min-w-0">
            <p className="font-semibold truncate">Model Combos</p>
            <p className="text-[10px] text-text-muted">Smart routing &amp; failover</p>
          </div>
        </Link>
        <Link
          href="/dashboard/token-saver"
          className="p-2.5 rounded-xl border border-border/50 bg-black/[0.02] dark:bg-white/[0.02] hover:bg-black/5 dark:hover:bg-white/5 transition-colors flex items-center gap-2.5"
        >
          <span className="material-symbols-outlined text-emerald-500 text-[18px]">savings</span>
          <div className="min-w-0">
            <p className="font-semibold truncate">Token Saver</p>
            <p className="text-[10px] text-text-muted">RTK &amp; prompt compressor</p>
          </div>
        </Link>
        <Link
          href="/dashboard/cli-tools"
          className="p-2.5 rounded-xl border border-border/50 bg-black/[0.02] dark:bg-white/[0.02] hover:bg-black/5 dark:hover:bg-white/5 transition-colors flex items-center gap-2.5"
        >
          <span className="material-symbols-outlined text-amber-500 text-[18px]">terminal</span>
          <div className="min-w-0">
            <p className="font-semibold truncate">CLI Tools</p>
            <p className="text-[10px] text-text-muted">Claude Code &amp; Codex setup</p>
          </div>
        </Link>
        <Link
          href="/dashboard/media-providers/web"
          className="p-2.5 rounded-xl border border-border/50 bg-black/[0.02] dark:bg-white/[0.02] hover:bg-black/5 dark:hover:bg-white/5 transition-colors flex items-center gap-2.5"
        >
          <span className="material-symbols-outlined text-indigo-500 text-[18px]">travel_explore</span>
          <div className="min-w-0">
            <p className="font-semibold truncate">Web Fetch &amp; Search</p>
            <p className="text-[10px] text-text-muted">Internet access endpoints</p>
          </div>
        </Link>
      </div>
    </div>
  );
}
