"use client";
import { useRouter } from "next/navigation";

export default function StudioFooter() {
  const router = useRouter();

  return (
    <footer className="border-t border-white/10 bg-[#07090E] py-12 px-6">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-3">
          <div className="size-8 rounded-lg bg-gradient-to-br from-[#F97316] to-[#3B82F6] flex items-center justify-center text-white">
            <span className="material-symbols-outlined text-[18px]">hub</span>
          </div>
          <div>
            <span className="text-white font-bold text-sm">Hermes Router</span>
            <span className="text-xs text-gray-500 block">v1.4.4 Standalone Edition</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-6 text-xs text-gray-400">
          <button type="button" onClick={() => router.push("/dashboard")} className="hover:text-white transition-colors cursor-pointer">
            Dashboard
          </button>
          <a href="https://github.com/quangdigiaz/hermes-router#readme" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">
            Documentation
          </a>
          <a href="https://github.com/quangdigiaz/hermes-router" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">
            GitHub Repository
          </a>
          <a href="https://github.com/quangdigiaz/hermes-router/releases" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">
            Changelog
          </a>
        </div>

        <div className="text-xs text-gray-500 font-mono">
          &copy; 2026 Hermes Router. Open Source.
        </div>
      </div>
    </footer>
  );
}
