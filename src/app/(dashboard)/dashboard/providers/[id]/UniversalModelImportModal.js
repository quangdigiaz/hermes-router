"use client";

import { useState, useMemo } from "react";
import { Button, Modal, Toggle, Select } from "@/shared/components";
import { translate } from "@/i18n/runtime";
import { isFreeModel } from "open-sse/config/benchmarks.js";
import { AI_PROVIDERS } from "@/shared/constants/providers";

const SAMPLE_JSON = `[
  { "id": "gpt-4o", "name": "GPT-4o", "context_length": 128000 },
  { "id": "meta-llama/llama-3.3-70b-instruct:free", "name": "Llama 3.3 70B (Free)", "pricing": { "prompt": 0, "completion": 0 } }
]`;

const SAMPLE_URL = "https://openrouter.ai/api/v1/models";

// Helper heuristic for context length when provider payload doesn't supply it
function resolveContextLength(modelId, rawLength) {
  if (typeof rawLength === "number" && rawLength > 0) return rawLength;
  if (typeof rawLength === "string" && !isNaN(Number(rawLength))) return Number(rawLength);
  const lower = (modelId || "").toLowerCase();
  if (lower.includes("gemini")) return 1000000;
  if (lower.includes("claude-3-5") || lower.includes("claude-3-7") || lower.includes("claude-3")) return 200000;
  if (lower.includes("gpt-4o") || lower.includes("gpt-4-turbo") || lower.includes("o1") || lower.includes("o3")) return 128000;
  if (lower.includes("deepseek")) return 128000;
  if (lower.includes("llama-3.1") || lower.includes("llama-3.2") || lower.includes("llama-3.3")) return 128000;
  if (lower.includes("qwen-2.5")) return 128000;
  if (lower.includes("mistral-large") || lower.includes("codestral")) return 128000;
  return null;
}

function formatContextLength(ctx) {
  if (!ctx) return "Unknown";
  if (ctx >= 1000000) return `${Math.round(ctx / 100000) / 10}M`;
  if (ctx >= 1000) return `${Math.round(ctx / 1000)}k`;
  return `${ctx}`;
}

export default function UniversalModelImportModal({
  isOpen,
  onClose,
  onImport,
  existingModelIds = [],
  providerId = "",
  connectionId = null,
}) {
  // Step: "input" | "preview"
  const [step, setStep] = useState("input");
  const [tab, setTab] = useState(connectionId ? "connection" : "url");
  const [jsonText, setJsonText] = useState("");
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [parseError, setParseError] = useState("");
  const [result, setResult] = useState(null);

  // Preview state
  const [rawModels, setRawModels] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [freeOnly, setFreeOnly] = useState(false);
  const [contextFilter, setContextFilter] = useState("all"); // "all" | "64k" | "128k" | "200k"
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [freeModelIds, setFreeModelIds] = useState(new Set());

  const handleClose = () => {
    if (importing) return;
    setStep("input");
    setJsonText("");
    setUrl("");
    setParseError("");
    setResult(null);
    setRawModels([]);
    setSearchQuery("");
    setFreeOnly(false);
    setContextFilter("all");
    setSelectedIds(new Set());
    setFreeModelIds(new Set());
    onClose();
  };

  const parseModelsFromJson = (text) => {
    let parsed;
    try {
      parsed = JSON.parse(text.trim());
    } catch (err) {
      throw new Error(`${translate("Invalid JSON")}: ${err.message}`);
    }

    let list = [];
    if (Array.isArray(parsed)) {
      list = parsed;
    } else if (parsed && typeof parsed === "object") {
      if (Array.isArray(parsed.data)) {
        list = parsed.data;
      } else if (Array.isArray(parsed.models)) {
        list = parsed.models;
      } else {
        list = [parsed];
      }
    } else {
      throw new Error(translate("No models found in input"));
    }

    return list
      .map((m) => {
        const id = m.id || m.name || m.model || (typeof m === "string" ? m : null);
        const name = m.name || m.display_name || id || "";
        const rawCtx = m.context_length || m.max_tokens || m.context_window;
        const ctx = resolveContextLength(id, rawCtx);
        const isFree = isFreeModel(id, providerId, AI_PROVIDERS, m);
        return { id, name, isFree, contextLength: ctx, raw: m };
      })
      .filter((m) => m.id && typeof m.id === "string");
  };

  const startPreview = (parsedList) => {
    if (!parsedList || parsedList.length === 0) {
      setParseError(translate("No valid models found"));
      return;
    }
    setRawModels(parsedList);
    // Default select all models that are not already added
    const newIds = new Set(
      parsedList.filter((m) => !existingModelIds.includes(m.id)).map((m) => m.id)
    );
    setSelectedIds(newIds);
    // Pre-check free models based on auto-detection
    const autoFreeIds = new Set(
      parsedList.filter((m) => m.isFree).map((m) => m.id)
    );
    setFreeModelIds(autoFreeIds);
    setStep("preview");
  };

  const handleFetchConnection = async () => {
    if (!connectionId) return;
    setParseError("");
    setLoading(true);
    try {
      const res = await fetch(`/api/providers/${connectionId}/models`);
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      const data = await res.json();
      const list = parseModelsFromJson(JSON.stringify(data));
      startPreview(list);
    } catch (err) {
      setParseError(err.message || translate("Failed to fetch from connection"));
    } finally {
      setLoading(false);
    }
  };

  const handleFetchUrl = async () => {
    if (!url.trim()) return;
    setParseError("");
    setLoading(true);
    try {
      const res = await fetch(url.trim());
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      const data = await res.json();
      const list = parseModelsFromJson(JSON.stringify(data));
      startPreview(list);
    } catch (err) {
      setParseError(err.message || translate("Failed to fetch from URL"));
    } finally {
      setLoading(false);
    }
  };

  const handleParseJson = () => {
    if (!jsonText.trim()) return;
    setParseError("");
    try {
      const list = parseModelsFromJson(jsonText);
      startPreview(list);
    } catch (err) {
      setParseError(err.message);
    }
  };

  // Filter models in preview step
  const filteredModels = useMemo(() => {
    return rawModels.filter((m) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchId = m.id.toLowerCase().includes(q);
        const matchName = m.name.toLowerCase().includes(q);
        if (!matchId && !matchName) return false;
      }
      if (freeOnly && !m.isFree) return false;
      if (contextFilter === "64k" && (!m.contextLength || m.contextLength < 64000)) return false;
      if (contextFilter === "128k" && (!m.contextLength || m.contextLength < 128000)) return false;
      if (contextFilter === "200k" && (!m.contextLength || m.contextLength < 200000)) return false;
      return true;
    });
  }, [rawModels, searchQuery, freeOnly, contextFilter]);

  const toggleSelectAllFiltered = () => {
    const unaddedFiltered = filteredModels.filter((m) => !existingModelIds.includes(m.id));
    const allSelected = unaddedFiltered.every((m) => selectedIds.has(m.id));
    const next = new Set(selectedIds);
    if (allSelected) {
      unaddedFiltered.forEach((m) => next.delete(m.id));
    } else {
      unaddedFiltered.forEach((m) => next.add(m.id));
    }
    setSelectedIds(next);
  };

  const handleToggleSelect = (id) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const handleToggleFree = (id) => {
    const next = new Set(freeModelIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setFreeModelIds(next);
  };

  const handleExecuteImport = async () => {
    if (selectedIds.size === 0) return;
    setImporting(true);
    setParseError("");
    try {
      const toImport = rawModels.filter((m) => selectedIds.has(m.id));
      let count = 0;
      for (const m of toImport) {
        const isFree = freeModelIds.has(m.id);
        await onImport(m.id, m.name, isFree);
        count++;
      }
      setResult({ imported: count });
    } catch (err) {
      setParseError(err.message || translate("Import failed"));
    } finally {
      setImporting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} title={translate("Universal Model Importer")} onClose={handleClose} size="lg">
      <div className="flex flex-col gap-4">
        {step === "input" && (
          <>
            {/* Tab switcher */}
            <div className="flex gap-1 rounded-lg bg-sidebar p-1">
              {connectionId && (
                <button
                  type="button"
                  onClick={() => setTab("connection")}
                  className={`flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                    tab === "connection" ? "bg-primary text-white" : "text-text-muted hover:text-text-main"
                  }`}
                >
                  {translate("Connection /models")}
                </button>
              )}
              <button
                type="button"
                onClick={() => setTab("url")}
                className={`flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  tab === "url" ? "bg-primary text-white" : "text-text-muted hover:text-text-main"
                }`}
              >
                URL Endpoint
              </button>
              <button
                type="button"
                onClick={() => setTab("json")}
                className={`flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  tab === "json" ? "bg-primary text-white" : "text-text-muted hover:text-text-main"
                }`}
              >
                JSON / JSONL
              </button>
            </div>

            {tab === "connection" && (
              <div className="flex flex-col gap-3">
                <p className="text-xs text-text-muted">
                  {translate("Fetch active model catalog directly from this provider's connection.")}
                </p>
                <Button onClick={handleFetchConnection} fullWidth disabled={loading}>
                  {loading ? translate("Fetching...") : translate("Fetch Models & Preview")}
                </Button>
              </div>
            )}

            {tab === "url" && (
              <div className="flex flex-col gap-3">
                <p className="text-xs text-text-muted">
                  {translate("Enter an OpenAI-compatible /v1/models URL or any public model endpoint.")}
                </p>
                <input
                  type="url"
                  className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:border-primary"
                  placeholder={SAMPLE_URL}
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  disabled={loading}
                />
                <Button onClick={handleFetchUrl} fullWidth disabled={loading || !url.trim()}>
                  {loading ? translate("Fetching...") : translate("Fetch Models & Preview")}
                </Button>
              </div>
            )}

            {tab === "json" && (
              <div className="flex flex-col gap-3">
                <p className="text-xs text-text-muted">
                  {translate("Paste raw JSON array or { data: [...] } OpenAI response.")}
                </p>
                <textarea
                  className="w-full rounded border border-accent/30 bg-sidebar p-2 text-xs font-mono resize-y min-h-[160px] focus:outline-none focus:ring-1 focus:ring-primary"
                  placeholder={SAMPLE_JSON}
                  value={jsonText}
                  onChange={(e) => setJsonText(e.target.value)}
                  disabled={loading}
                />
                <Button onClick={handleParseJson} fullWidth disabled={loading || !jsonText.trim()}>
                  {translate("Parse & Preview Models")}
                </Button>
              </div>
            )}
          </>
        )}

        {step === "preview" && (
          <>
            {/* Filter bar */}
            <div className="flex flex-col gap-2.5 p-3 rounded-lg border border-border bg-sidebar/30">
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex-1 min-w-[200px]">
                  <input
                    type="text"
                    placeholder={translate("Search models by ID or name...")}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs border border-border rounded-md bg-background focus:outline-none focus:border-primary"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-text-muted">{translate("Free Only")}</span>
                    <Toggle size="sm" checked={freeOnly} onChange={(checked) => setFreeOnly(checked)} />
                  </div>
                  <Select
                    size="sm"
                    value={contextFilter}
                    onChange={(e) => setContextFilter(e.target.value)}
                    className="text-xs"
                  >
                    <option value="all">{translate("All Context")}</option>
                    <option value="64k">&ge; 64k</option>
                    <option value="128k">&ge; 128k</option>
                    <option value="200k">&ge; 200k</option>
                  </Select>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-text-muted pt-1 border-t border-border/40">
                <span>
                  {translate("Showing")} <strong>{filteredModels.length}</strong> / {rawModels.length} {translate("models")}
                  {selectedIds.size > 0 && ` (${selectedIds.size} ${translate("selected")})`}
                </span>
                <button
                  type="button"
                  onClick={toggleSelectAllFiltered}
                  className="text-primary hover:underline font-medium"
                >
                  {translate("Toggle Select All Filtered")}
                </button>
              </div>
            </div>

            {/* Model Preview List */}
            <div className="flex flex-col gap-1.5 max-h-[320px] overflow-y-auto pr-1">
              {filteredModels.length === 0 ? (
                <div className="p-6 text-center text-xs text-text-muted border border-dashed border-border/60 rounded-lg">
                  {translate("No models match your filters.")}
                </div>
              ) : (
                filteredModels.map((m) => {
                  const alreadyExists = existingModelIds.includes(m.id);
                  const isChecked = selectedIds.has(m.id);
                  return (
                    <div
                      key={m.id}
                      onClick={() => !alreadyExists && handleToggleSelect(m.id)}
                      className={`flex items-center gap-2.5 p-2 rounded-lg border text-xs transition-colors ${
                        alreadyExists
                          ? "opacity-50 bg-black/[0.02] border-border/40 cursor-not-allowed"
                          : isChecked
                          ? "border-primary/40 bg-primary/5 cursor-pointer"
                          : "border-border hover:bg-sidebar/40 cursor-pointer"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        disabled={alreadyExists}
                        onChange={() => handleToggleSelect(m.id)}
                        onClick={(e) => e.stopPropagation()}
                        className="rounded border-border text-primary focus:ring-primary h-3.5 w-3.5"
                      />
                      <div className="flex-1 min-w-0 flex flex-col">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <code className="font-mono text-xs text-text-main truncate font-medium">{m.id}</code>
                          <span
                            onClick={(e) => { e.stopPropagation(); handleToggleFree(m.id); }}
                            className={`px-1.5 py-0.2 rounded font-bold text-[9px] border cursor-pointer select-none ${
                              freeModelIds.has(m.id)
                                ? "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20"
                                : "bg-black/5 dark:bg-white/5 text-text-muted border-border/40"
                            }`}
                          >
                            {freeModelIds.has(m.id) ? "FREE" : "PAID"}
                          </span>
                          {alreadyExists && (
                            <span className="px-1.5 py-0.2 rounded bg-black/5 dark:bg-white/5 text-text-muted text-[9px]">
                              {translate("Already added")}
                            </span>
                          )}
                        </div>
                        {m.name && m.name !== m.id && (
                          <span className="text-[10px] text-text-muted truncate italic">{m.name}</span>
                        )}
                      </div>
                      {m.contextLength && (
                        <span className="text-[10px] font-mono text-text-muted shrink-0 bg-sidebar px-1.5 py-0.5 rounded border border-border/40">
                          {formatContextLength(m.contextLength)}
                        </span>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Action Bar */}
            <div className="flex items-center gap-2 pt-2 border-t border-border/40">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setStep("input")}
                disabled={importing}
              >
                &larr; {translate("Back")}
              </Button>
              <Button
                type="button"
                fullWidth
                size="sm"
                onClick={handleExecuteImport}
                disabled={importing || selectedIds.size === 0}
              >
                {importing
                  ? translate("Importing...")
                  : `${translate("Import")} (${selectedIds.size}) ${translate("Models")}`}
              </Button>
            </div>
          </>
        )}

        {parseError && (
          <p className="text-xs text-red-500 break-words p-2 rounded bg-red-500/5 border border-red-500/20">
            {parseError}
          </p>
        )}

        {result && (
          <div className="rounded-lg border border-green-500/30 bg-green-500/5 p-3 flex items-center justify-between">
            <p className="text-xs text-green-600 dark:text-green-400">
              {translate("Successfully imported")} <strong>{result.imported}</strong> {translate("model(s)")}!
            </p>
            <Button size="xs" variant="secondary" onClick={handleClose}>
              {translate("Done")}
            </Button>
          </div>
        )}

        {step === "input" && !result && (
          <Button onClick={handleClose} variant="ghost" fullWidth disabled={loading || importing}>
            {translate("Cancel")}
          </Button>
        )}
      </div>
    </Modal>
  );
}
