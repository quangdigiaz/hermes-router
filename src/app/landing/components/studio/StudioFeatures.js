"use client";

const FEATURES = [
  {
    icon: "hub",
    title: "Unified OpenAI Endpoint",
    desc: "Single endpoint (/v1/chat/completions) compatible with all AI clients, tools, and IDEs.",
    color: "border-blue-500/40 text-blue-400 bg-blue-500/10"
  },
  {
    icon: "shuffle",
    title: "Smart Combo Routing",
    desc: "Automatic failover, round-robin load distribution, and multi-model priority chains.",
    color: "border-purple-500/40 text-purple-400 bg-purple-500/10"
  },
  {
    icon: "shield_lock",
    title: "402/429 Paywall Auto-Lock",
    desc: "Fast-skips depleted balances across multi-language upstream providers with direct recharge URLs.",
    color: "border-rose-500/40 text-rose-400 bg-rose-500/10"
  },
  {
    icon: "memory",
    title: "Prompt Cache Sticky",
    desc: "Maintains session affinity to maximize Anthropic and OpenAI prompt cache discounts up to 90%.",
    color: "border-emerald-500/40 text-emerald-400 bg-emerald-500/10"
  },
  {
    icon: "savings",
    title: "Token Saver & PII Scrubber",
    desc: "Eliminates duplicate system prompts, normalizes whitespace, and redacts sensitive API tokens.",
    color: "border-amber-500/40 text-amber-400 bg-amber-500/10"
  },
  {
    icon: "database",
    title: "Local SQLite & In-Memory",
    desc: "All credentials and metrics stored in high-performance local SQLite with 5s memory cache.",
    color: "border-cyan-500/40 text-cyan-400 bg-cyan-500/10"
  },
  {
    icon: "vpn_key",
    title: "CKEY Multi-Proxy Rotation",
    desc: "Auto-rotates IP and API keys on Cloudflare WAF or 403 Ray ID rate limit events.",
    color: "border-indigo-500/40 text-indigo-400 bg-indigo-500/10"
  },
  {
    icon: "monitoring",
    title: "Real-Time Observability",
    desc: "Live SSE event streaming dashboard, latency benchmarks, and exact token usage tracking.",
    color: "border-orange-500/40 text-orange-400 bg-orange-500/10"
  },
];

export default function StudioFeatures() {
  return (
    <section className="py-20 px-6 max-w-6xl mx-auto" id="studio-features">
      <div className="text-center mb-16">
        <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white tracking-tight mb-3">
          Engineered for Performance &amp; Reliability
        </h2>
        <p className="text-gray-400 max-w-xl mx-auto text-sm sm:text-base">
          Enterprise-grade routing capabilities packaged into a zero-latency local proxy.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {FEATURES.map((f) => (
          <div
            key={f.title}
            className="p-6 rounded-2xl border border-white/[0.08] bg-[#0C1019]/80 backdrop-blur-xl hover:border-white/20 transition-all group"
          >
            <div className={`size-10 rounded-xl ${f.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
              <span className="material-symbols-outlined text-[20px]">{f.icon}</span>
            </div>
            <h3 className="text-base font-bold text-white mb-2 group-hover:text-[#F97316] transition-colors">
              {f.title}
            </h3>
            <p className="text-xs text-gray-400 leading-relaxed">
              {f.desc}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
