"use client";
import { useState } from "react";

export default function StudioFlow() {
  const [activeFeature, setActiveFeature] = useState(0);

  const features = [
    { title: "Smart Auto-Routing", desc: "Auto-route to highest speed and lowest cost provider", icon: "route", color: "text-blue-400" },
    { title: "Prompt Cache Sticky", desc: "Maintain session affinity to leverage up to 90% cache discount", icon: "memory", color: "text-emerald-400" },
    { title: "402/429 Paywall Lock", desc: "Instantly quarantine empty balance accounts and show direct recharge links", icon: "shield_lock", color: "text-rose-400" },
    { title: "Token Saver Engine", desc: "Strip redundant whitespaces and redundant system tokens in real-time", icon: "savings", color: "text-amber-400" },
    { title: "Zero-Lag SQLite WAL", desc: "Ultra-fast 5s memory cache with zero network overhead", icon: "database", color: "text-purple-400" },
    { title: "Unified API Vault", desc: "Manage OAuth, CKEY proxy rotation and multi-keys in one secure place", icon: "key", color: "text-cyan-400" }
  ];

  return (
    <section className="py-16 px-6 relative" id="studio-flow">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-3 tracking-tight">
            How Hermes Router Works
          </h2>
          <p className="text-gray-400 max-w-xl mx-auto text-sm sm:text-base">
            One local hub connecting your developer tools to all AI clouds with intelligent routing.
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#0C1019]/90 backdrop-blur-xl p-6 sm:p-10 shadow-2xl relative overflow-hidden">
          <div 
            className="absolute inset-0 opacity-[0.03] pointer-events-none"
            style={{
              backgroundImage: "radial-gradient(#fff 1px, transparent 1px)",
              backgroundSize: "24px 24px"
            }}
          />

          <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr_220px] gap-8 items-center relative z-10">
            <div className="flex flex-col gap-3">
              <div className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[15px] text-[#F97316]">terminal</span>
                Coding Agents
              </div>
              {[
                { name: "Claude Code", tag: "CLI", icon: "terminal", bg: "hover:border-[#D97757]/60" },
                { name: "OpenAI Codex", tag: "Agent", icon: "code", bg: "hover:border-blue-500/60" },
                { name: "Cline / RooCode", tag: "VSCode", icon: "extension", bg: "hover:border-purple-500/60" },
                { name: "Cursor / Windsurf", tag: "IDE", icon: "edit_note", bg: "hover:border-emerald-500/60" },
                { name: "Aider / OpenClaw", tag: "Tool", icon: "psychology", bg: "hover:border-amber-500/60" },
              ].map((client) => (
                <div 
                  key={client.name}
                  className={`p-3 rounded-xl border border-white/10 bg-white/[0.03] flex items-center justify-between transition-all ${client.bg} group`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="material-symbols-outlined text-[18px] text-gray-400 group-hover:text-white transition-colors">{client.icon}</span>
                    <span className="text-xs font-semibold text-gray-200">{client.name}</span>
                  </div>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/10 text-gray-400">{client.tag}</span>
                </div>
              ))}
            </div>

            <div className="rounded-2xl border border-[#F97316]/30 bg-gradient-to-b from-[#141A28] to-[#0D121D] p-6 shadow-[0_0_40px_rgba(249,115,22,0.15)] relative">
              <div className="flex items-center justify-between mb-5 border-b border-white/10 pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="size-8 rounded-lg bg-[#F97316] flex items-center justify-center text-white shadow-[0_0_15px_rgba(249,115,22,0.6)]">
                    <span className="material-symbols-outlined text-[18px]">hub</span>
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Hermes Router Core</h3>
                    <p className="text-[11px] text-gray-400 font-mono">http://127.0.0.1:20128</p>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                  <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  Active Proxy
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                {features.map((feat, idx) => (
                  <button
                    key={feat.title}
                    type="button"
                    onClick={() => setActiveFeature(idx)}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      activeFeature === idx
                        ? "border-[#F97316] bg-[#F97316]/10 shadow-[0_0_15px_rgba(249,115,22,0.2)]"
                        : "border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.05]"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`material-symbols-outlined text-[16px] ${feat.color}`}>{feat.icon}</span>
                      <span className="text-xs font-bold text-white">{feat.title}</span>
                    </div>
                    <p className="text-[11px] text-gray-400 line-clamp-1 leading-snug">{feat.desc}</p>
                  </button>
                ))}
              </div>

              <div className="mt-4 p-3 rounded-lg bg-white/[0.04] border border-white/[0.08] text-xs text-gray-300 flex items-center gap-2">
                <span className="material-symbols-outlined text-[16px] text-[#F97316]">info</span>
                <span>{features[activeFeature].desc}</span>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <div className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[15px] text-[#3B82F6]">cloud_done</span>
                Upstream Clouds
              </div>
              {[
                { name: "Anthropic Claude", model: "Sonnet 3.7 / Opus", color: "border-[#D97757]/40 text-[#D97757]" },
                { name: "OpenAI / GPT-5", model: "GPT-5 / o3-mini", color: "border-emerald-500/40 text-emerald-400" },
                { name: "Google Gemini", model: "Gemini 2.5 Pro / Flash", color: "border-blue-500/40 text-blue-400" },
                { name: "DeepSeek V4", model: "DeepSeek-V4-Flash", color: "border-purple-500/40 text-purple-400" },
                { name: "ZenMux + 100 More", model: "Free Tier & Hubs", color: "border-amber-500/40 text-amber-400" },
              ].map((provider) => (
                <div 
                  key={provider.name}
                  className="p-3 rounded-xl border border-white/10 bg-white/[0.03] flex items-center justify-between hover:border-white/20 transition-all"
                >
                  <div>
                    <div className="text-xs font-semibold text-gray-200">{provider.name}</div>
                    <div className="text-[10px] text-gray-400 font-mono">{provider.model}</div>
                  </div>
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border bg-black/30 ${provider.color}`}>
                    ✓ Ready
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
