"use client";

import { useState, useMemo } from "react";
import { useCopyToClipboard } from "@/shared/hooks/useCopyToClipboard";

export default function EndpointUsageCard({ baseUrl, apiKey, requireApiKey }) {
  const [mainTab, setMainTab] = useState("chat");
  const [subTabs, setSubTabs] = useState({
    chat: "curl",
    cli: "claude",
    search: "curl",
    fetch: "curl",
  });
  const { copied, copy } = useCopyToClipboard();

  const effectiveKey = apiKey || (requireApiKey ? "sk-hermes-your-key" : "sk-hermes-local");
  const effectiveBaseUrl = baseUrl || "http://127.0.0.1:20128/v1";
  const effectiveOrigin = useMemo(() => {
    return effectiveBaseUrl.replace(/\/v1\/?$/, "");
  }, [effectiveBaseUrl]);

  const setSubTab = (section, lang) => {
    setSubTabs((prev) => ({ ...prev, [section]: lang }));
  };

  const integrations = useMemo(() => {
    return {
      chat: {
        title: "Chat Completions",
        method: "POST",
        path: "/v1/chat/completions",
        desc: "OpenAI-compatible chat completion endpoint with automatic combo failover and token optimization.",
        subOptions: [
          { key: "curl", label: "cURL" },
          { key: "python", label: "Python (OpenAI)" },
          { key: "js", label: "Node.js (OpenAI)" },
        ],
        snippets: {
          curl: `curl -X POST ${effectiveBaseUrl}/chat/completions \\
  -H "Authorization: Bearer ${effectiveKey}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "default",
    "messages": [
      {"role": "user", "content": "Hello Hermes! List your capabilities."}
    ],
    "stream": false
  }'`,
          python: `from openai import OpenAI

client = OpenAI(
    base_url="${effectiveBaseUrl}",
    api_key="${effectiveKey}",
)

response = client.chat.completions.create(
    model="default",  # Or combo name / provider model ID
    messages=[
        {"role": "user", "content": "Write a clean binary search algorithm in TypeScript."}
    ],
    temperature=0.7,
)

print(response.choices[0].message.content)`,
          js: `import OpenAI from "openai";

const openai = new OpenAI({
  baseURL: "${effectiveBaseUrl}",
  apiKey: "${effectiveKey}",
});

const response = await openai.chat.completions.create({
  model: "default", // Or your custom combo / model alias
  messages: [
    { role: "user", content: "Explain how AI routing with failover works." }
  ],
});

console.log(response.choices[0].message.content);`,
        },
      },
      cli: {
        title: "CLI & IDE Agents",
        method: "ENV",
        path: "Client Setup",
        desc: "One-line configuration to route your favorite coding assistants directly through Hermes Router.",
        subOptions: [
          { key: "claude", label: "Claude Code CLI" },
          { key: "codex", label: "OpenAI Codex" },
          { key: "cline", label: "Cline / RooCode" },
          { key: "cursor", label: "Cursor / Windsurf" },
        ],
        snippets: {
          claude: `# 1. Configure Claude Code to use Hermes Router as Anthropic gateway
export ANTHROPIC_BASE_URL="${effectiveOrigin}"
export ANTHROPIC_API_KEY="${effectiveKey}"

# 2. Start Claude Code (benefits from prompt caching & multi-provider routing)
claude`,
          codex: `# 1. Configure OpenAI Codex / Agents endpoint
export OPENAI_BASE_URL="${effectiveBaseUrl}"
export OPENAI_API_KEY="${effectiveKey}"

# 2. Run your agent
npx @openai/codex`,
          cline: `// In VS Code -> Cline / RooCode Settings:
Provider:        OpenAI Compatible
Base URL:        ${effectiveBaseUrl}
API Key:         ${effectiveKey}
Model ID:        default (or custom combo name)`,
          cursor: `// In Cursor IDE / Windsurf Settings -> Models:
OpenAI Base URL: ${effectiveBaseUrl}
OpenAI API Key:  ${effectiveKey}
Model Name:      default (or your configured model)`,
        },
      },
      search: {
        title: "Web Search",
        method: "POST",
        path: "/v1/search",
        desc: "Perform web searches across configured search engines and return structured JSON results.",
        subOptions: [
          { key: "curl", label: "cURL" },
          { key: "python", label: "Python" },
          { key: "js", label: "JavaScript" },
        ],
        snippets: {
          curl: `curl -X POST ${effectiveBaseUrl}/search \\
  -H "Authorization: Bearer ${effectiveKey}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "query": "Hermes Router features",
    "limit": 5
  }'`,
          python: `import requests

response = requests.post(
    "${effectiveBaseUrl}/search",
    headers={
        "Authorization": "Bearer ${effectiveKey}",
        "Content-Type": "application/json",
    },
    json={
        "query": "Hermes Router features",
        "limit": 5,
    },
)

print(response.json())`,
          js: `const response = await fetch("${effectiveBaseUrl}/search", {
  method: "POST",
  headers: {
    "Authorization": "Bearer ${effectiveKey}",
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    query: "Hermes Router features",
    limit: 5,
  }),
});

const data = await response.json();
console.log(data);`,
        },
      },
      fetch: {
        title: "Web Fetch",
        method: "POST",
        path: "/v1/web/fetch",
        desc: "Extract clean Markdown content and readable text from any web URL.",
        subOptions: [
          { key: "curl", label: "cURL" },
          { key: "python", label: "Python" },
          { key: "js", label: "JavaScript" },
        ],
        snippets: {
          curl: `curl -X POST ${effectiveBaseUrl}/web/fetch \\
  -H "Authorization: Bearer ${effectiveKey}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "url": "https://example.com"
  }'`,
          python: `import requests

response = requests.post(
    "${effectiveBaseUrl}/web/fetch",
    headers={
        "Authorization": "Bearer ${effectiveKey}",
        "Content-Type": "application/json",
    },
    json={"url": "https://example.com"},
)

print(response.json())`,
          js: `const response = await fetch("${effectiveBaseUrl}/web/fetch", {
  method: "POST",
  headers: {
    "Authorization": "Bearer ${effectiveKey}",
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ url: "https://example.com" }),
});

const data = await response.json();
console.log(data);`,
        },
      },
    };
  }, [effectiveBaseUrl, effectiveOrigin, effectiveKey]);

  const activeSection = integrations[mainTab] || integrations.chat;
  const currentSubLang = subTabs[mainTab] || activeSection.subOptions[0]?.key || "curl";
  const currentSnippet = activeSection.snippets[currentSubLang] || "";
  const copyKey = `${mainTab}-${currentSubLang}`;
  const isCopied = copied === copyKey;

  const mainTabsList = [
    { id: "chat", label: "Chat / LLM", icon: "forum" },
    { id: "cli", label: "CLI & IDEs", icon: "terminal" },
    { id: "search", label: "Web Search", icon: "search" },
    { id: "fetch", label: "Web Fetch", icon: "language" },
  ];

  return (
    <div className="rounded-2xl border border-border/80 bg-surface/90 shadow-sm backdrop-blur-md p-5 sm:p-6 transition-all">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 mb-5 border-b border-border/60">
        <div className="flex items-center gap-2.5">
          <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20">
            <span className="material-symbols-outlined text-[20px]">integration_instructions</span>
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              Endpoint Usage &amp; Quickstart
            </h2>
            <p className="text-xs text-text-muted">
              Ready-to-use code snippets with your active endpoint and credentials
            </p>
          </div>
        </div>

        {/* Main Tab Pills */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 overflow-x-auto">
          {mainTabsList.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setMainTab(tab.id)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                mainTab === tab.id
                  ? "bg-primary text-white shadow-xs"
                  : "text-text-muted hover:text-text-main hover:bg-black/5 dark:hover:bg-white/5"
              }`}
            >
              <span className="material-symbols-outlined text-[15px]">{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Content Container */}
      <div className="flex flex-col gap-3">
        {/* Endpoint metadata row */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
              {activeSection.title}
            </span>
            <span className="px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-mono font-bold text-[11px] border border-emerald-500/30">
              {activeSection.method}
            </span>
            <span className="px-2 py-0.5 rounded-md bg-black/5 dark:bg-white/10 text-slate-700 dark:text-slate-300 font-mono text-[11px] border border-black/5 dark:border-white/10">
              {activeSection.path}
            </span>
          </div>
          <span className="text-xs text-text-muted">
            {activeSection.desc}
          </span>
        </div>

        {/* Code Terminal Box */}
        <div className="rounded-xl border border-slate-800/90 bg-[#0c1017] shadow-lg overflow-hidden flex flex-col mt-1">
          {/* Titlebar with language subtabs & Copy Button */}
          <div className="flex items-center justify-between px-3.5 py-2.5 bg-[#080b11] border-b border-slate-800/80">
            <div className="flex items-center gap-1.5">
              <div className="hidden sm:flex items-center gap-1.5 mr-2">
                <div className="size-2.5 rounded-full bg-red-500/80" />
                <div className="size-2.5 rounded-full bg-amber-500/80" />
                <div className="size-2.5 rounded-full bg-emerald-500/80" />
              </div>
              {activeSection.subOptions.map((sub) => (
                <button
                  key={sub.key}
                  type="button"
                  onClick={() => setSubTab(mainTab, sub.key)}
                  className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                    currentSubLang === sub.key
                      ? "bg-primary text-white shadow-xs"
                      : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
                  }`}
                >
                  {sub.label}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => copy(currentSnippet, copyKey)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white/10 hover:bg-white/20 text-slate-200 hover:text-white text-xs font-medium transition-all cursor-pointer shadow-xs"
              title="Copy code snippet"
            >
              <span className="material-symbols-outlined text-[14px]">
                {isCopied ? "check" : "content_copy"}
              </span>
              <span>{isCopied ? "Copied!" : "Copy"}</span>
            </button>
          </div>

          {/* Code pre */}
          <pre className="p-4 sm:p-5 font-mono text-xs sm:text-[13px] leading-relaxed text-slate-100 overflow-x-auto whitespace-pre selection:bg-primary/30">
            {currentSnippet}
          </pre>
        </div>
      </div>
    </div>
  );
}
