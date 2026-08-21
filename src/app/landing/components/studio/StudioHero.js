"use client";
import { useRouter } from "next/navigation";

export default function StudioHero() {
  const router = useRouter();

  return (
    <section className="relative pt-32 pb-16 md:pt-40 md:pb-24 px-6 overflow-hidden">
      {/* Background glow flares */}
      <div className="pointer-events-none absolute left-1/2 top-10 -translate-x-1/2 w-[850px] h-[400px] bg-gradient-to-tr from-[#F97316]/15 via-[#3B82F6]/10 to-transparent blur-[120px] rounded-full" />
      
      <div className="max-w-5xl mx-auto text-center relative z-10">
        {/* Eyebrow Badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-white/10 bg-white/[0.04] backdrop-blur-md mb-8 hover:border-[#F97316]/40 transition-colors">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="text-xs font-medium text-gray-300">
            v1.4.4 Live · Universal AI Gateway · Standalone Proxy
          </span>
        </div>

        {/* Hero Title */}
        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-white leading-[1.1] mb-6">
          The Universal AI Router <br className="hidden sm:block" />
          <span className="bg-gradient-to-r from-white via-gray-200 to-gray-400 bg-clip-text text-transparent">
            built for
          </span>{" "}
          <span className="bg-gradient-to-r from-[#D97757] via-[#F97316] to-[#FB923C] bg-clip-text text-transparent inline-flex items-center gap-1">
            Claude Code
          </span>{" "}
          <span className="text-gray-400 font-light">&amp;</span>{" "}
          <span className="bg-gradient-to-r from-[#3B82F6] via-[#60A5FA] to-[#93C5FD] bg-clip-text text-transparent">
            Codex Agents
          </span>
        </h1>

        {/* Subtitle */}
        <p className="max-w-3xl mx-auto text-base sm:text-xl text-gray-400 leading-relaxed mb-10 font-normal">
          Unified OpenAI-compatible endpoint to <strong className="text-gray-200 font-semibold">Claude 3.7</strong>, <strong className="text-gray-200 font-semibold">GPT-5</strong>, <strong className="text-gray-200 font-semibold">Gemini 2.5</strong>, <strong className="text-gray-200 font-semibold">DeepSeek V4</strong> and 100+ AI providers. Smart fallback, prompt caching sticky &amp; 402 paywall auto-lock.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
          <button
            type="button"
            onClick={() => router.push("/dashboard")}
            className="w-full sm:w-auto h-12 px-8 rounded-xl bg-gradient-to-r from-[#F97316] to-[#EA580C] hover:from-[#EA580C] hover:to-[#C2410C] text-white text-sm font-bold transition-all shadow-[0_0_25px_rgba(249,115,22,0.5)] hover:shadow-[0_0_35px_rgba(249,115,22,0.8)] flex items-center justify-center gap-2 cursor-pointer group"
          >
            <span>Get Started Free</span>
            <span className="material-symbols-outlined text-[18px] group-hover:translate-x-1 transition-transform">arrow_forward</span>
          </button>
          
          <a
            href="#studio-quickstart"
            className="w-full sm:w-auto h-12 px-7 rounded-xl border border-white/10 bg-white/[0.05] hover:bg-white/[0.1] text-white text-sm font-semibold transition-all flex items-center justify-center gap-2 backdrop-blur-sm"
          >
            <span className="material-symbols-outlined text-[18px] text-[#F97316]">terminal</span>
            <span>One-Click CLI Setup</span>
          </a>
        </div>

        {/* Feature Pills */}
        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs font-mono text-gray-400">
          <span className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[14px] text-emerald-400">check_circle</span>
            100% Local SQLite
          </span>
          <span className="text-gray-600">·</span>
          <span className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[14px] text-blue-400">flash_on</span>
            Prompt Cache Sticky (&gt;99%)
          </span>
          <span className="text-gray-600">·</span>
          <span className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[14px] text-amber-400">lock</span>
            Paywall Auto-Lock (402)
          </span>
          <span className="text-gray-600">·</span>
          <span className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[14px] text-purple-400">all_inclusive</span>
            No Subscription / Pay As You Go
          </span>
        </div>
      </div>
    </section>
  );
}
