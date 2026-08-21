"use client";
import { useState, useMemo } from "react";
import { useCopyToClipboard } from "@/shared/hooks/useCopyToClipboard";

const MODELS = [
  { id: "claude-3-7-sonnet-20250219", name: "Claude 3.7 Sonnet", provider: "Anthropic", category: "claude", context: "200k", speed: "⚡⚡⚡⚡", tier: "Official", pricing: "Standard" },
  { id: "claude-3-5-sonnet-20241022", name: "Claude 3.5 Sonnet v2", provider: "Anthropic", category: "claude", context: "200k", speed: "⚡⚡⚡⚡⚡", tier: "Official", pricing: "Standard" },
  { id: "claude-3-5-haiku-20241022", name: "Claude 3.5 Haiku", provider: "Anthropic", category: "claude", context: "200k", speed: "⚡⚡⚡⚡⚡", tier: "Official", pricing: "Discount" },
  { id: "gpt-4o", name: "GPT-4o Omnichannel", provider: "OpenAI", category: "openai", context: "128k", speed: "⚡⚡⚡⚡", tier: "Official", pricing: "Standard" },
  { id: "o3-mini", name: "o3-mini High Reasoning", provider: "OpenAI", category: "openai", context: "200k", speed: "⚡⚡⚡⚡", tier: "Official", pricing: "Standard" },
  { id: "gpt-4o-mini", name: "GPT-4o Mini", provider: "OpenAI", category: "openai", context: "128k", speed: "⚡⚡⚡⚡⚡", tier: "Official", pricing: "Ultra Low" },
  { id: "deepseek-chat", name: "DeepSeek V3 (671B)", provider: "DeepSeek", category: "deepseek", context: "64k", speed: "⚡⚡⚡⚡⚡", tier: "Popular", pricing: "Ultra Low" },
  { id: "deepseek-reasoner", name: "DeepSeek R1 Reasoning", provider: "DeepSeek", category: "deepseek", context: "64k", speed: "⚡⚡⚡", tier: "Popular", pricing: "Low" },
  { id: "deepseek/deepseek-v4-flash-free", name: "DeepSeek V4 Flash (Free)", provider: "OrcaRouter", category: "free", context: "64k", speed: "⚡⚡⚡⚡", tier: "🟢 Free Tier", pricing: "$0.00" },
  { id: "gemini-2.5-pro", name: "Gemini 2.5 Pro", provider: "Google", category: "gemini", context: "2M", speed: "⚡⚡⚡⚡", tier: "Official", pricing: "Standard" },
  { id: "gemini-2.5-flash", name: "Gemini 2.5 Flash", provider: "Google", category: "gemini", context: "1M", speed: "⚡⚡⚡⚡⚡", tier: "Official", pricing: "Discount" },
  { id: "zenmux/free-flow", name: "ZenMux Free Multi-Flow", provider: "ZenMux AI", category: "free", context: "128k", speed: "⚡⚡⚡⚡", tier: "🟢 Free Tier", pricing: "$0.00" },
];

export default function StudioModelCatalog() {
  const [activeCat, setActiveCat] = useState("all");
  const [search, setSearch] = useState("");
  const { copied, copy } = useCopyToClipboard();

  const filteredModels = useMemo(() => {
    return MODELS.filter((m) => {
      const matchCat = activeCat === "all" || m.category === activeCat;
      const matchSearch = search.trim() === "" || 
        m.name.toLowerCase().includes(search.toLowerCase()) || 
        m.id.toLowerCase().includes(search.toLowerCase()) ||
        m.provider.toLowerCase().includes(search.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [activeCat, search]);

  const categories = [
    { id: "all", label: "All Models" },
    { id: "claude", label: "Anthropic Claude" },
    { id: "openai", label: "OpenAI / Codex" },
    { id: "deepseek", label: "DeepSeek" },
    { id: "gemini", label: "Google Gemini" },
    { id: "free", label: "🟢 100% Free Tier" },
  ];

  return (
    <section className="py-20 px-6 max-w-6xl mx-auto" id="studio-models">
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#F97316]/10 text-[#F97316] text-xs font-semibold mb-2">
            <span className="material-symbols-outlined text-[14px]">price_change</span>
            Live Catalog &amp; Pricing Matrix
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Supported Models &amp; Intelligent Combos
          </h2>
          <p className="text-gray-400 text-sm mt-1">
            Seamlessly route between top tier coding models, reasoning models and free tier fallbacks.
          </p>
        </div>

        {/* Search input */}
        <div className="relative w-full md:w-72">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-[18px]">
            search
          </span>
          <input
            type="text"
            placeholder="Search model or provider..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-white/[0.05] border border-white/10 text-white text-xs placeholder-gray-500 focus:outline-none focus:border-[#F97316] transition-colors"
          />
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex flex-wrap gap-2 mb-6 pb-2 border-b border-white/[0.08]">
        {categories.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setActiveCat(c.id)}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeCat === c.id
                ? "bg-[#F97316] text-white shadow-[0_0_12px_rgba(249,115,22,0.4)]"
                : "bg-white/[0.04] hover:bg-white/[0.08] text-gray-300 hover:text-white border border-white/[0.06]"
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* Models Table */}
      <div className="rounded-2xl border border-white/10 bg-[#0C1019]/90 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-white/10 bg-white/[0.02] text-gray-400 font-semibold uppercase tracking-wider">
                <th className="py-3.5 px-4">Model Name</th>
                <th className="py-3.5 px-4">Provider</th>
                <th className="py-3.5 px-4">Context</th>
                <th className="py-3.5 px-4">Speed</th>
                <th className="py-3.5 px-4">Tier / Rate</th>
                <th className="py-3.5 px-4 text-right">Copy Model ID</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.05]">
              {filteredModels.map((m) => (
                <tr key={m.id} className="hover:bg-white/[0.03] transition-colors group">
                  <td className="py-3.5 px-4">
                    <div className="font-semibold text-white group-hover:text-[#F97316] transition-colors">
                      {m.name}
                    </div>
                    <code className="text-[10px] text-gray-500 font-mono">{m.id}</code>
                  </td>
                  <td className="py-3.5 px-4 text-gray-300 font-medium">
                    {m.provider}
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="px-2 py-0.5 rounded bg-white/10 text-gray-300 font-mono text-[10px]">
                      {m.context}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-amber-400 tracking-wider">
                    {m.speed}
                  </td>
                  <td className="py-3.5 px-4">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      m.category === "free"
                        ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                        : "bg-blue-500/15 text-blue-300 border border-blue-500/20"
                    }`}>
                      {m.pricing}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <button
                      type="button"
                      onClick={() => copy(m.id, m.id)}
                      className="px-2.5 py-1 rounded-md bg-white/[0.06] hover:bg-white/[0.12] text-gray-300 hover:text-white text-[11px] font-mono transition-colors inline-flex items-center gap-1 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[13px]">
                        {copied === m.id ? "check" : "content_copy"}
                      </span>
                      <span>{copied === m.id ? "Copied" : "Copy ID"}</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
