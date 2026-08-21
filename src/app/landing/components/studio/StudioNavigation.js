"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function StudioNavigation() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const router = useRouter();

  return (
    <nav className="fixed top-0 z-50 w-full bg-[#0A0D14]/75 backdrop-blur-xl border-b border-white/[0.08] shadow-[0_4px_30px_rgba(0,0,0,0.5)]">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Brand Logo */}
        <button
          type="button"
          className="flex items-center gap-3 cursor-pointer bg-transparent border-none p-0 group"
          onClick={() => router.push("/")}
          aria-label="Navigate to home"
        >
          <div className="size-9 rounded-xl bg-gradient-to-br from-[#F97316] via-[#EA580C] to-[#3B82F6] flex items-center justify-center text-white shadow-[0_0_20px_rgba(249,115,22,0.4)] group-hover:scale-105 transition-transform">
            <span className="material-symbols-outlined text-[20px]">hub</span>
          </div>
          <div className="flex flex-col items-start">
            <div className="flex items-center gap-2">
              <span className="text-white text-lg font-bold tracking-tight">Hermes Router</span>
              <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                Studio Pro
              </span>
            </div>
          </div>
        </button>

        {/* Desktop Navigation Links */}
        <div className="hidden md:flex items-center gap-7">
          <a className="text-gray-300 hover:text-white text-sm font-medium transition-colors hover:scale-105" href="#studio-models">Models &amp; Pricing</a>
          <a className="text-gray-300 hover:text-white text-sm font-medium transition-colors hover:scale-105" href="#studio-quickstart">Quick Start</a>
          <a className="text-gray-300 hover:text-white text-sm font-medium transition-colors hover:scale-105" href="#studio-flow">Architecture</a>
          <a className="text-gray-300 hover:text-white text-sm font-medium transition-colors hover:scale-105" href="#studio-features">Features</a>
          <a className="text-gray-300 hover:text-white text-sm font-medium transition-colors flex items-center gap-1 hover:scale-105" href="https://github.com/quangdigiaz/hermes-router#readme" target="_blank" rel="noopener noreferrer">
            Docs <span className="material-symbols-outlined text-[13px]">open_in_new</span>
          </a>
        </div>

        {/* CTA Buttons */}
        <div className="flex items-center gap-3">
          <a
            href="https://github.com/quangdigiaz/hermes-router"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:flex items-center gap-1.5 h-9 px-3.5 rounded-lg border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] text-gray-300 hover:text-white text-xs font-semibold transition-all"
          >
            <span className="material-symbols-outlined text-[15px]">star</span>
            GitHub
          </a>
          <button
            type="button"
            onClick={() => router.push("/dashboard")}
            className="h-9 px-4 rounded-lg bg-gradient-to-r from-[#F97316] to-[#EA580C] hover:from-[#EA580C] hover:to-[#C2410C] text-white text-xs font-bold transition-all shadow-[0_0_18px_rgba(249,115,22,0.45)] hover:shadow-[0_0_24px_rgba(249,115,22,0.7)] flex items-center gap-1.5 cursor-pointer"
          >
            <span>Open Dashboard</span>
            <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
          </button>
          <button
            type="button"
            className="md:hidden text-white p-1 rounded-md hover:bg-white/10"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            <span className="material-symbols-outlined">{mobileMenuOpen ? "close" : "menu"}</span>
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-white/[0.08] bg-[#0A0D14]/95 backdrop-blur-2xl px-6 py-6 flex flex-col gap-4">
          <a className="text-gray-300 hover:text-white text-sm font-medium" href="#studio-models" onClick={() => setMobileMenuOpen(false)}>Models &amp; Pricing</a>
          <a className="text-gray-300 hover:text-white text-sm font-medium" href="#studio-quickstart" onClick={() => setMobileMenuOpen(false)}>Quick Start</a>
          <a className="text-gray-300 hover:text-white text-sm font-medium" href="#studio-flow" onClick={() => setMobileMenuOpen(false)}>Architecture</a>
          <a className="text-gray-300 hover:text-white text-sm font-medium" href="#studio-features" onClick={() => setMobileMenuOpen(false)}>Features</a>
          <a className="text-gray-300 hover:text-white text-sm font-medium" href="https://github.com/quangdigiaz/hermes-router#readme" target="_blank" rel="noopener noreferrer">Docs</a>
          <a className="text-gray-300 hover:text-white text-sm font-medium" href="https://github.com/quangdigiaz/hermes-router" target="_blank" rel="noopener noreferrer">GitHub</a>
          <button
            type="button"
            onClick={() => router.push("/dashboard")}
            className="w-full h-10 rounded-lg bg-[#F97316] hover:bg-[#EA580C] text-white text-sm font-bold flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>Open Dashboard</span>
            <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
          </button>
        </div>
      )}
    </nav>
  );
}
