"use client";

export default function StudioMetrics() {
  const metrics = [
    { value: "100+", label: "AI Providers Supported", sub: "Official & OpenAI-Compatible Hubs" },
    { value: ">99%", label: "Prompt Cache Hit Rate", sub: "Session Sticky Affinity" },
    { value: "0ms", label: "Local Overhead", sub: "In-Memory & SQLite WAL Cache" },
    { value: "<50ms", label: "Fast-Failover & Auto-Heal", sub: "Smart Combo Retry Matrix" }
  ];

  return (
    <section className="py-12 px-6 border-y border-white/[0.08] bg-white/[0.01]">
      <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
        {metrics.map((m) => (
          <div key={m.label} className="text-center sm:text-left p-4 rounded-xl hover:bg-white/[0.02] transition-colors">
            <div className="text-3xl sm:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white via-gray-100 to-[#F97316] font-mono tracking-tight mb-1">
              {m.value}
            </div>
            <div className="text-sm font-bold text-gray-200 mb-0.5">{m.label}</div>
            <div className="text-xs text-gray-500">{m.sub}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
