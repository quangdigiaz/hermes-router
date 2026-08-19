"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Navigation() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const router = useRouter();

  return (
    <nav className="fixed top-0 z-50 w-full bg-[#0A1628]/80 backdrop-blur-md border-b border-[#1E3A5F]">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <button
          type="button"
          className="flex items-center gap-3 cursor-pointer bg-transparent border-none p-0"
          onClick={() => router.push("/")}
          aria-label="Navigate to home"
        >
          <div className="size-8 rounded bg-linear-to-br from-[#F97316] to-[#3B82F6] flex items-center justify-center text-white">
            <svg viewBox="0 0 32 32" className="w-5 h-5" fill="none">
              <path d="M16 5L22 14L16 27L10 14L16 5Z" fill="white" opacity="0.9"/>
              <path d="M10 14L16 27L10 20L6 14H10Z" fill="white" opacity="0.6"/>
              <path d="M22 14L16 27L22 20L26 14H22Z" fill="white" opacity="0.6"/>
              <circle cx="16" cy="9" r="2" fill="white"/>
            </svg>
          </div>
          <h2 className="text-white text-xl font-bold tracking-tight">Hermes Router</h2>
        </button>

        {/* Desktop menu */}
        <div className="hidden md:flex items-center gap-8">
          <a className="text-gray-300 hover:text-white text-sm font-medium transition-colors" href="#features">Features</a>
          <a className="text-gray-300 hover:text-white text-sm font-medium transition-colors" href="#how-it-works">How it Works</a>
          <a className="text-gray-300 hover:text-white text-sm font-medium transition-colors" href="https://github.com/quangdigiaz/hermes-router#readme" target="_blank" rel="noopener noreferrer">Docs</a>
          <a className="text-gray-300 hover:text-white text-sm font-medium transition-colors flex items-center gap-1" href="https://github.com/quangdigiaz/hermes-router" target="_blank" rel="noopener noreferrer">
            GitHub <span className="material-symbols-outlined text-[14px]">open_in_new</span>
          </a>
        </div>

        {/* CTA + Mobile menu */}
        <div className="flex items-center gap-4">
          <button type="button" 
            onClick={() => router.push("/masuk")}
            className="hidden sm:flex h-9 items-center justify-center rounded-lg px-4 bg-[#F97316] hover:bg-[#EA580C] transition-all text-white text-sm font-bold shadow-[0_0_15px_rgba(249,115,22,0.4)] hover:shadow-[0_0_20px_rgba(249,115,22,0.6)]"
          >
            Get Started
          </button>
          <button type="button" 
            className="md:hidden text-white"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            <span className="material-symbols-outlined">{mobileMenuOpen ? "close" : "menu"}</span>
          </button>
        </div>
      </div>

      {/* Mobile menu dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-[#1E3A5F] bg-[#0A1628]/95 backdrop-blur-md">
          <div className="flex flex-col gap-4 p-6">
            <a className="text-gray-300 hover:text-white text-sm font-medium transition-colors" href="#features" onClick={() => setMobileMenuOpen(false)}>Features</a>
            <a className="text-gray-300 hover:text-white text-sm font-medium transition-colors" href="#how-it-works" onClick={() => setMobileMenuOpen(false)}>How it Works</a>
            <a className="text-gray-300 hover:text-white text-sm font-medium transition-colors" href="https://github.com/quangdigiaz/hermes-router#readme" target="_blank" rel="noopener noreferrer">Docs</a>
            <a className="text-gray-300 hover:text-white text-sm font-medium transition-colors" href="https://github.com/quangdigiaz/hermes-router" target="_blank" rel="noopener noreferrer">GitHub</a>
            <button type="button" 
              onClick={() => router.push("/masuk")}
              className="h-9 rounded-lg bg-[#F97316] hover:bg-[#EA580C] text-white text-sm font-bold"
            >
              Get Started
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}

