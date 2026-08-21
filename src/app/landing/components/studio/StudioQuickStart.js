"use client";
import { useState } from "react";
import { useCopyToClipboard } from "@/shared/hooks/useCopyToClipboard";

const SNIPPETS = {
  claude: {
    title: "Claude Code CLI",
    subtitle: "Official Claude Code CLI configured to route through local Hermes Router",
    env: "export ANTHROPIC_BASE_URL=\"http://127.0.0.1:20128\"\nexport ANTHROPIC_API_KEY=\"sk-hermes-local\"",
    run: "claude",
    desc: "Point ANTHROPIC_BASE_URL to Hermes Router. All agent commands will automatically benefit from prompt caching & multi-provider combos."
  },
  codex: {
    title: "OpenAI Codex / Agents",
    subtitle: "Standard OpenAI SDK integration for Codex, Cline, RooCode and custom scripts",
    env: "export OPENAI_BASE_URL=\"http://127.0.0.1:20128/v1\"\nexport OPENAI_API_KEY=\"sk-hermes-local\"",
    run: "npx @openai/codex",
    desc: "Fully OpenAI-compatible endpoint. Drop-in replacement for any client expecting standard /v1/chat/completions."
  },
  cline: {
    title: "Cline & RooCode (VS Code)",
    subtitle: "In Cline settings, select OpenAI Compatible provider",
    env: "Base URL: http://127.0.0.1:20128/v1\nAPI Key:  sk-hermes-local\nModel ID: default (or your custom combo name)",
    run: "",
    desc: "Configure Cline to route all coding prompts through Hermes Router with Token Saver and session affinity enabled."
  },
  cursor: {
    title: "Cursor IDE & Windsurf",
    subtitle: "Under Settings > Models > OpenAI API Key override",
    env: "OpenAI Base URL: http://127.0.0.1:20128/v1\nAPI Key:         sk-hermes-local",
    run: "",
    desc: "Instantly route Cursor queries through your configured upstream providers with zero local latency."
  },
  curl: {
    title: "cURL / Raw API Test",
    subtitle: "Direct HTTP request test to verify router connectivity",
    env: `curl http://127.0.0.1:20128/v1/chat/completions \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer sk-hermes-local" \\
  -d '{
    "model": "default",
    "messages": [{"role": "user", "content": "Hello Hermes!"}]
  }'`,
    run: "",
    desc: "Verify your Hermes Router local instance and check real-time streaming SSE response in terminal."
  }
};

export default function StudioQuickStart() {
  const [activeTab, setActiveTab] = useState("claude");
  const { copied, copy } = useCopyToClipboard();

  const tab = SNIPPETS[activeTab];

  return (
    <section className="py-20 px-6 max-w-6xl mx-auto" id="studio-quickstart">
      <div className="text-center mb-12">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-500/10 text-emerald-400 text-xs font-semibold mb-2">
          <span className="material-symbols-outlined text-[14px]">bolt</span>
          30-Second Integration
        </div>
        <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white tracking-tight">
          Connect Your Existing Tools
        </h2>
        <p className="text-gray-400 max-w-xl mx-auto text-sm sm:text-base mt-1">
          A one-line configuration change. Standard endpoints, zero new SDKs to learn.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-6 items-start">
        {/* Tool selector buttons */}
        <div className="flex flex-col gap-2">
          {[
            { id: "claude", name: "Claude Code", tag: "CLI Agent", icon: "terminal" },
            { id: "codex", name: "OpenAI Codex", tag: "Agent", icon: "code" },
            { id: "cline", name: "Cline / RooCode", tag: "VS Code", icon: "extension" },
            { id: "cursor", name: "Cursor / Windsurf", tag: "IDE", icon: "edit_note" },
            { id: "curl", name: "cURL / Python", tag: "API", icon: "http" },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveTab(t.id)}
              className={`p-3.5 rounded-xl border text-left transition-all flex items-center justify-between cursor-pointer ${
                activeTab === t.id
                  ? "border-[#F97316] bg-[#F97316]/10 text-white shadow-[0_0_15px_rgba(249,115,22,0.2)]"
                  : "border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.05] text-gray-400 hover:text-white"
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-[20px]">{t.icon}</span>
                <span className="text-xs font-bold">{t.name}</span>
              </div>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/10">{t.tag}</span>
            </button>
          ))}
        </div>

        {/* Terminal Code Snippet Box */}
        <div className="rounded-2xl border border-white/10 bg-[#10141F] shadow-2xl overflow-hidden">
          {/* Terminal Titlebar */}
          <div className="flex items-center justify-between px-4 py-3 bg-[#0B0E17] border-b border-white/10">
            <div className="flex items-center gap-2">
              <div className="size-2.5 rounded-full bg-red-500/80" />
              <div className="size-2.5 rounded-full bg-amber-500/80" />
              <div className="size-2.5 rounded-full bg-emerald-500/80" />
              <span className="ml-2 text-xs font-mono text-gray-400 font-semibold">{tab.title}</span>
            </div>
            <button
              type="button"
              onClick={() => copy(tab.env, "quickstart")}
              className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white text-xs font-mono transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[14px]">
                {copied === "quickstart" ? "check" : "content_copy"}
              </span>
              <span>{copied === "quickstart" ? "Copied!" : "Copy"}</span>
            </button>
          </div>

          {/* Terminal Code Content */}
          <div className="p-6 font-mono text-xs sm:text-sm text-gray-300 leading-relaxed overflow-x-auto">
            <div className="text-gray-500 mb-2"># 1. Export router endpoint and auth key</div>
            <pre className="text-[#3B82F6] whitespace-pre-wrap">{tab.env}</pre>
            
            {tab.run && (
              <>
                <div className="text-gray-500 mt-4 mb-2"># 2. Launch tool</div>
                <div className="flex items-center gap-2 text-emerald-400">
                  <span>$</span>
                  <span>{tab.run}</span>
                </div>
              </>
            )}

            <div className="mt-6 pt-4 border-t border-white/10 text-xs text-gray-400 font-sans">
              💡 {tab.desc}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
