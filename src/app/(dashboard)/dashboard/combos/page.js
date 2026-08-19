"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { restrictToVerticalAxis, restrictToParentElement } from "@dnd-kit/modifiers";
import { Card, Button, Modal, Input, CardSkeleton, ModelSelectModal, ConfirmModal, CapacityBadges, Select } from "@/shared/components";
import { useCopyToClipboard } from "@/shared/hooks/useCopyToClipboard";
import { fetchCached } from "@/shared/utils/fetchCache";
import { useModelCaps } from "@/shared/hooks/useModelCaps";
import { isOpenAICompatibleProvider, isAnthropicCompatibleProvider } from "@/shared/constants/providers";

// Validate combo name: only a-z, A-Z, 0-9, -, _
const VALID_NAME_REGEX = /^[a-zA-Z0-9_.\-]+$/;

// ─── BUILT-IN TEMPLATES CATALOG DATA ─────────────────────────────────────────
const BUILTIN_CATALOG_GROUPS = [
  {
    title: "Standard Auto (6)",
    icon: "psychology",
    description: "General-purpose dynamic model routing based on multi-factor real-time scoring",
    templates: [
      {
        id: "auto/best",
        name: "auto/best",
        mode: "BALANCED",
        modeColor: "bg-blue-500/10 text-blue-500 border-blue-500/20",
        description: "Balanced across quality, cost, latency and circuit health",
        tags: ["Balanced", "4-Factor"],
      },
      {
        id: "auto/cheapest",
        name: "auto/cheapest",
        mode: "COST-SAVER",
        modeColor: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
        description: "Picks cheapest provider & model dynamically from live pricing",
        tags: ["Min Cost", "Promo First"],
      },
      {
        id: "auto/fastest",
        name: "auto/fastest",
        mode: "SPEED",
        modeColor: "bg-amber-500/10 text-amber-500 border-amber-500/20",
        description: "Prioritizes p95 lowest latency with min quality threshold 0.5",
        tags: ["Fast p95", "Quality Guard"],
      },
      {
        id: "auto/reliable",
        name: "auto/reliable",
        mode: "RELIABLE",
        modeColor: "bg-purple-500/10 text-purple-500 border-purple-500/20",
        description: "Prioritizes circuit health 45% to minimize failovers",
        tags: ["Zero 500", "Health First"],
      },
      {
        id: "auto/value",
        name: "auto/value",
        mode: "VALUE",
        modeColor: "bg-teal-500/10 text-teal-500 border-teal-500/20",
        description: "Highest benchmark quality per dollar spent (log-normalized P/P)",
        tags: ["Best P/P", "Smart Tier"],
      },
      {
        id: "auto/best-free",
        name: "auto/best-free",
        mode: "BEST-FREE",
        modeColor: "bg-green-500/10 text-green-500 border-green-500/20",
        description: "Highest benchmark quality among $0 / promo free models",
        tags: ["$0 Cost", "Top Free"],
      },
    ],
  },
  {
    title: "Model Family (6)",
    icon: "hub",
    description: "Cross-provider dynamic routing and zero-drop failover for specific model architectures",
    templates: [
      {
        id: "family/deepseek",
        name: "family/deepseek",
        mode: "VALUE",
        modeColor: "bg-teal-500/10 text-teal-500 border-teal-500/20",
        description: "Cross-provider DeepSeek routing (V4, V3, R1) across all active connections",
        tags: ["DeepSeek Family", "V4/V3/R1", "Multi-Provider", "Zero 429"],
        seedModels: [
          "siliconflow/deepseek-v4-flash",
          "deepinfra/deepseek-v4-flash",
          "freebuff/deepseek-v4-flash",
          "deepseek/deepseek-v4-pro",
        ],
      },
      {
        id: "family/gemini",
        name: "family/gemini",
        mode: "BALANCED",
        modeColor: "bg-blue-500/10 text-blue-500 border-blue-500/20",
        description: "Cross-provider Google Gemini routing (Flash, Pro, Lite) with instant failover",
        tags: ["Gemini Family", "Long Context", "Flash/Pro"],
        seedModels: [
          "google/gemini-3.7-flash",
          "google/gemini-2.5-flash",
          "google/gemini-2.5-pro",
        ],
      },
      {
        id: "family/qwen",
        name: "family/qwen",
        mode: "VALUE",
        modeColor: "bg-teal-500/10 text-teal-500 border-teal-500/20",
        description: "Cross-provider Alibaba Qwen routing (Coder, Plus, Max, VL)",
        tags: ["Qwen Family", "Coder/Plus/Max", "Fast & Cheap"],
        seedModels: [
          "alibaba/qwen3.7-plus",
          "alibaba/qwen2.5-coder-32b",
          "alibaba/qwen3-coder-plus",
        ],
      },
      {
        id: "family/claude",
        name: "family/claude",
        mode: "BALANCED",
        modeColor: "bg-amber-500/10 text-amber-500 border-amber-500/20",
        description: "Cross-provider Anthropic Claude routing (Sonnet, Opus, Haiku)",
        tags: ["Claude Family", "Sonnet/Opus", "Coding Superiority"],
        seedModels: [
          "anthropic/claude-sonnet-5",
          "anthropic/claude-sonnet-4-6",
          "anthropic/claude-haiku-4-5",
        ],
      },
      {
        id: "family/mimo",
        name: "family/mimo",
        mode: "VALUE",
        modeColor: "bg-teal-500/10 text-teal-500 border-teal-500/20",
        description: "Cross-provider Xiaomi MiMo auto-routing with cost & latency optimization",
        tags: ["MiMo Family", "Ultra-Cheap $0.14", "Xiaomi Stack"],
        seedModels: [
          "xiaomi/mimo-v2.5",
          "bazaarlink/mimo-v2.5",
        ],
      },
      {
        id: "family/gpt",
        name: "family/gpt",
        mode: "BALANCED",
        modeColor: "bg-blue-500/10 text-blue-500 border-blue-500/20",
        description: "Cross-provider OpenAI GPT routing (GPT-4o, GPT-5, o1, o3, mini)",
        tags: ["GPT Family", "GPT-4o/5", "OpenAI Ecosystem"],
        seedModels: [
          "openai/gpt-4o",
          "openai/gpt-4.1",
          "openai/gpt-5-mini",
        ],
      },
    ],
  },
  {
    title: "AI Agent Workhorse (2)",
    icon: "smart_toy",
    description: "Tailored for long-running Agent loops (OpenClaw, Hermes Agent, ReAct)",
    templates: [
      {
        id: "agent/workhorse",
        name: "agent/workhorse",
        mode: "VALUE",
        modeColor: "bg-teal-500/10 text-teal-500 border-teal-500/20",
        description: "24/7 Agent workhorse: ultra-cheap ($0.14/M), fast, immune to 429 rate limits",
        tags: ["Session Sticky", "Prompt Cache", "Tools", "$0.14/M"],
        seedModels: [
          "siliconflow/deepseek-v4-flash",
          "deepinfra/deepseek-v4-flash",
          "bazaarlink/mimo-v2.5",
          "freebuff/deepseek-v4-flash",
          "xiaomi/mimo-v2.5",
          "google/gemini-3.7-flash",
        ],
      },
      {
        id: "agent/deep-think",
        name: "agent/deep-think",
        mode: "BALANCED",
        modeColor: "bg-blue-500/10 text-blue-500 border-blue-500/20",
        description: "Hard agent reasoning: complex architecture, deep debugging, large refactors",
        tags: ["Deep Reasoning", "Tools", "Sonnet/Gemini/V4-Pro"],
        seedModels: [
          "anthropic/claude-sonnet-5",
          "deepseek/deepseek-v4-pro",
          "google/gemini-3.7-flash",
        ],
      },
    ],
  },
  {
    title: "SEO & Vietnamese Content (1)",
    icon: "edit_note",
    description: "Specialized for natural Vietnamese article writing with full H1-H3 structure",
    templates: [
      {
        id: "seo/vietnamese",
        name: "seo/vietnamese",
        mode: "BALANCED",
        modeColor: "bg-orange-500/10 text-orange-500 border-orange-500/20",
        description: "100% natural Vietnamese writing, proper long-form output (maxOutput >= 4096)",
        tags: ["Natural VN", "H1-H3 Structure", "Long Output"],
        seedModels: [
          "google/gemini-3.7-flash",
          "anthropic/claude-sonnet-5",
          "alibaba/qwen3.7-plus",
          "deepseek/deepseek-v4-pro",
        ],
      },
    ],
  },
  {
    title: "Vision & Multimodal (2)",
    icon: "visibility",
    description: "Multimodal image understanding, OCR, charts and image-to-code pipelines",
    templates: [
      {
        id: "vision/fast-cheap",
        name: "vision/fast-cheap",
        mode: "VALUE",
        modeColor: "bg-teal-500/10 text-teal-500 border-teal-500/20",
        description: "Ultra-cheap ($0.05/M) batch OCR & image analysis with Vision Guard auto-filter",
        tags: ["Vision Required", "Batch OCR", "$0.05/M"],
        seedModels: [
          "alibaba/qwen2.5-vl-7b",
          "google/gemini-2.5-flash-lite",
          "mistral/pixtral-12b",
          "meta/llama-3.2-11b-vision",
        ],
      },
      {
        id: "vision/pro",
        name: "vision/pro",
        mode: "BALANCED",
        modeColor: "bg-blue-500/10 text-blue-500 border-blue-500/20",
        description: "High-accuracy diagram reasoning & UI-to-code multimodal synthesis",
        tags: ["Vision Required", "Diagrams", "UI to Code"],
        seedModels: [
          "google/gemini-3.7-flash",
          "anthropic/claude-sonnet-5",
          "alibaba/qwen2.5-vl-72b",
          "openai/gpt-4o",
        ],
      },
    ],
  },
];

export default function CombosPage() {
  const [combos, setCombos] = useState([]);
  const [builtinCount, setBuiltinCount] = useState(11);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingCombo, setEditingCombo] = useState(null);
  const [activeProviders, setActiveProviders] = useState([]);
  const [comboStrategies, setComboStrategies] = useState({});
  const { getCaps } = useModelCaps();
  const [confirmState, setConfirmState] = useState(null);
  const { copied, copy } = useCopyToClipboard();
  const [testingComboId, setTestingComboId] = useState(null);
  const [testResults, setTestResults] = useState(null);
  
  // UI Tabs: "all", "intelligent", "custom"
  const [activeTab, setActiveTab] = useState("all");

  // Catalog Accordion expanded state (persisted in localStorage)
  const [catalogExpanded, setCatalogExpanded] = useState(true);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("hermes_catalog_expanded");
      if (saved !== null) setCatalogExpanded(saved === "true");
    } catch {}
    fetchData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleCatalog = () => {
    const next = !catalogExpanded;
    setCatalogExpanded(next);
    try {
      localStorage.setItem("hermes_catalog_expanded", String(next));
    } catch {}
  };

  const fetchData = async () => {
    try {
      const [combosRes, providersRes, settingsRes] = await Promise.all([
        fetch("/api/combos", { cache: "no-store" }),
        fetch("/api/providers", { cache: "no-store" }),
        fetch("/api/settings", { cache: "no-store" }),
      ]);

      const combosData = await combosRes.json();
      const providersData = await providersRes.json();
      const settingsData = settingsRes.ok ? await settingsRes.json() : {};
      
      if (combosRes.ok) {
        setCombos((combosData.combos || []).filter(c => !c.kind || c.kind === "llm" || c.kind === "vision" || c.kind === "agent"));
        if (combosData.builtinCount) setBuiltinCount(combosData.builtinCount);
      }
      if (providersRes.ok) {
        setActiveProviders(providersData.connections || []);
      }
      setComboStrategies(settingsData.comboStrategies || {});
    } catch (error) {
      console.log("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (data) => {
    try {
      const res = await fetch("/api/combos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        await fetchData();
        setShowCreateModal(false);
      } else {
        const err = await res.json();
        alert(err.error || "Failed to create combo");
      }
    } catch (error) {
      console.log("Error creating combo:", error);
    }
  };

  const handleUpdate = async (id, data) => {
    try {
      const res = await fetch(`/api/combos/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        await fetchData();
        setEditingCombo(null);
      } else {
        const err = await res.json();
        alert(err.error || "Failed to update combo");
      }
    } catch (error) {
      console.log("Error updating combo:", error);
    }
  };

  const handleDelete = async (id) => {
    setConfirmState({
      title: "Delete Combo",
      message: "Delete this custom combo?",
      onConfirm: async () => {
        setConfirmState(null);
        try {
          const res = await fetch(`/api/combos/${id}`, { method: "DELETE" });
          if (res.ok) {
            setCombos(combos.filter(c => c.id !== id));
          }
        } catch (error) {
          console.log("Error deleting combo:", error);
        }
      }
    });
  };

  // Test every model in a combo via the internal loopback and show per-model results.
  const handleTestCombo = async (combo) => {
    setTestingComboId(combo.id);
    try {
      const res = await fetch(`/api/combos/${combo.id}/test`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Combo test failed");
        return;
      }
      setTestResults(data);
    } catch (error) {
      console.log("Error testing combo:", error);
      alert("Combo test failed");
    } finally {
      setTestingComboId(null);
    }
  };

  const handleSetComboStrategy = async (comboName, patch) => {
    try {
      const updated = { ...comboStrategies };
      const next = { ...(updated[comboName] || {}), ...patch };
      if (!next.fallbackStrategy || next.fallbackStrategy === "fallback") {
        delete updated[comboName];
      } else {
        updated[comboName] = next;
      }

      await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comboStrategies: updated }),
      });

      setComboStrategies(updated);
    } catch (error) {
      console.log("Error updating combo strategy:", error);
    }
  };

  // Filtered Combos List
  const customCombos = useMemo(() => combos.filter(c => !c.isBuiltin), [combos]);
  const builtinCombos = useMemo(() => combos.filter(c => c.isBuiltin), [combos]);

  const displayedCombos = useMemo(() => {
    if (activeTab === "intelligent") return builtinCombos;
    if (activeTab === "custom") return customCombos;
    return combos;
  }, [activeTab, combos, builtinCombos, customCombos]);

  if (loading) {
    return (
      <div className="flex flex-col gap-6">
        <CardSkeleton />
        <CardSkeleton />
      </div>
    );
  }

  return (
    <div className="flex min-w-0 flex-col gap-6 px-1 sm:px-0">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-bold text-text-main flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[24px]">layers</span>
            Combos
          </h1>
          <p className="text-sm text-text-muted mt-1">
            Create model combos with weighted routing, fallback support and intelligent auto-selection
          </p>
        </div>
        <Button icon="add" onClick={() => setShowCreateModal(true)} className="w-full sm:w-auto whitespace-nowrap shrink-0">
          Create Combo
        </Button>
      </div>

      {/* ─── 1. AUTO-ROUTING CATALOG (ACCORDION) ─── */}
      <div className="rounded-xl border border-primary/20 bg-surface-1 shadow-sm overflow-hidden transition-all">
        {/* Accordion Header */}
        <button
          type="button"
          onClick={toggleCatalog}
          className="w-full flex items-center justify-between p-4 bg-surface-1 hover:bg-surface-2/60 transition-colors text-left"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="material-symbols-outlined text-primary text-[20px] shrink-0">auto_awesome</span>
            <div className="flex flex-wrap items-center gap-2 min-w-0">
              <span className="font-semibold text-text-main text-sm">Auto-routing catalog</span>
              <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary border border-primary/20">
                {BUILTIN_CATALOG_GROUPS.reduce((acc, g) => acc + g.templates.length, 0)} templates
              </span>
            </div>
            <span className="hidden md:inline text-xs text-text-muted ml-2">
              — Built-in virtual combos resolved dynamically from connected providers. Use any ID in model field.
            </span>
          </div>
          <div className="flex items-center gap-1 text-text-muted shrink-0">
            <span className="material-symbols-outlined text-[20px] transition-transform duration-200" style={{ transform: catalogExpanded ? "rotate(180deg)" : "rotate(0deg)" }}>
              expand_more
            </span>
          </div>
        </button>

        {/* Accordion Content */}
        {catalogExpanded && (
          <div className="p-4 pt-2 border-t border-border/40 bg-surface-2/30 flex flex-col gap-5">
            {BUILTIN_CATALOG_GROUPS.map((group, groupIdx) => (
              <div key={groupIdx} className="flex flex-col gap-2.5">
                <div className="flex items-center gap-2 text-xs font-semibold text-text-main uppercase tracking-wider">
                  <span className="material-symbols-outlined text-[16px] text-primary">{group.icon}</span>
                  <span>{group.title}</span>
                  <span className="text-[11px] font-normal text-text-muted normal-case">— {group.description}</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {group.templates.map((tmpl) => (
                    <div
                      key={tmpl.id}
                      className="group flex flex-col justify-between rounded-lg border border-border/60 bg-surface-1 p-3 hover:border-primary/40 hover:shadow-sm transition-all"
                    >
                      <div>
                        {/* Title & Mode */}
                        <div className="flex items-center justify-between gap-2">
                          <code className="font-mono text-xs font-bold text-text-main">{tmpl.name}</code>
                          <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold border ${tmpl.modeColor}`}>
                            {tmpl.mode}
                          </span>
                        </div>

                        {/* Description */}
                        <p className="text-xs text-text-muted mt-1.5 line-clamp-2 leading-relaxed">
                          {tmpl.description}
                        </p>

                        {/* Tags */}
                        {tmpl.tags && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {tmpl.tags.map((tag, tIdx) => (
                              <span key={tIdx} className="text-[10px] rounded bg-black/5 dark:bg-white/5 px-1.5 py-0.5 text-text-muted">
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Seed Models Preview */}
                        {tmpl.seedModels && (
                          <div className="mt-2.5 pt-2 border-t border-border/40">
                            <span className="text-[10px] font-medium text-text-muted block mb-1">Seed Models:</span>
                            <div className="flex flex-wrap gap-1">
                              {tmpl.seedModels.slice(0, 2).map((m, mIdx) => (
                                <span key={mIdx} className="font-mono text-[10px] rounded bg-primary/5 px-1 py-0.5 text-primary">
                                  {m.split("/").pop()}
                                </span>
                              ))}
                              {tmpl.seedModels.length > 2 && (
                                <span className="text-[10px] text-text-muted">+{tmpl.seedModels.length - 2} more</span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* 1-Click Copy ID Button */}
                      <button
                        type="button"
                        onClick={() => copy(tmpl.id, `catalog-${tmpl.id}`)}
                        className="mt-3 flex items-center justify-center gap-1.5 w-full rounded border border-border/60 py-1 text-xs font-medium text-text-main hover:border-primary hover:text-primary hover:bg-primary/5 transition-all"
                      >
                        <span className="material-symbols-outlined text-[14px]">
                          {copied === `catalog-${tmpl.id}` ? "check" : "content_copy"}
                        </span>
                        <span>{copied === `catalog-${tmpl.id}` ? "Copied ID!" : "Copy Model ID"}</span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ─── 2. FILTER TABS BAR ─── */}
      <div className="flex items-center gap-2 border-b border-border/40 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab("all")}
          className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
            activeTab === "all"
              ? "bg-primary text-white shadow-sm"
              : "text-text-muted hover:bg-black/5 hover:text-text-main dark:hover:bg-white/5"
          }`}
        >
          <span className="material-symbols-outlined text-[15px]">apps</span>
          <span>All ({combos.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("intelligent")}
          className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
            activeTab === "intelligent"
              ? "bg-primary text-white shadow-sm"
              : "text-text-muted hover:bg-black/5 hover:text-text-main dark:hover:bg-white/5"
          }`}
        >
          <span className="material-symbols-outlined text-[15px]">auto_awesome</span>
          <span>✦ Intelligent ({builtinCount})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("custom")}
          className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
            activeTab === "custom"
              ? "bg-primary text-white shadow-sm"
              : "text-text-muted hover:bg-black/5 hover:text-text-main dark:hover:bg-white/5"
          }`}
        >
          <span className="material-symbols-outlined text-[15px]">tune</span>
          <span>☰ Custom ({customCombos.length})</span>
        </button>
      </div>

      {/* ─── 3. COMBOS LIST CARDS ─── */}
      {displayedCombos.length === 0 ? (
        <Card>
          <div className="text-center py-12">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 text-primary mb-4">
              <span className="material-symbols-outlined text-[32px]">layers</span>
            </div>
            <p className="text-text-main font-medium mb-1">No combos in this tab</p>
            <p className="text-sm text-text-muted mb-4">Create custom model combos or use built-in templates</p>
            <Button icon="add" onClick={() => setShowCreateModal(true)} className="w-full sm:w-auto">
              Create Combo
            </Button>
          </div>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {displayedCombos.map((combo) => (
            <ComboCard
              key={combo.id}
              combo={combo}
              getCaps={getCaps}
              activeProviders={activeProviders}
              copied={copied}
              onCopy={copy}
              onEdit={() => setEditingCombo(combo)}
              onDelete={() => handleDelete(combo.id)}
              onTest={() => handleTestCombo(combo)}
              testing={testingComboId === combo.id}
              strategy={comboStrategies[combo.name] || {}}
              onSetStrategy={(patch) => handleSetComboStrategy(combo.name, patch)}
            />
          ))}
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <ComboFormModal
          key="create"
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSave={handleCreate}
          activeProviders={activeProviders}
        />
      )}

      {/* Edit Modal */}
      {editingCombo && (
        <ComboFormModal
          key={editingCombo.id}
          isOpen={!!editingCombo}
          combo={editingCombo}
          onClose={() => setEditingCombo(null)}
          onSave={(data) => handleUpdate(editingCombo.id, data)}
          activeProviders={activeProviders}
        />
      )}

      {/* Confirm Delete Modal */}
      <ConfirmModal
        isOpen={!!confirmState}
        onClose={() => setConfirmState(null)}
        onConfirm={confirmState?.onConfirm}
        title={confirmState?.title || "Confirm"}
        message={confirmState?.message}
        variant="danger"
      />

      {/* Combo Test Results Modal */}
      {testResults && (
        <ComboTestResultsModal
          isOpen={!!testResults}
          onClose={() => setTestResults(null)}
          results={testResults}
          onRetest={() => handleTestCombo({ id: testResults.comboId, name: testResults.name })}
          testing={testingComboId === testResults.comboId}
        />
      )}
    </div>
  );
}

const STRATEGY_OPTIONS = [
  { value: "fallback", label: "Fallback — try in order" },
  { value: "round-robin", label: "Round Robin — rotate" },
  { value: "fusion", label: "Fusion — panel + judge" },
  { value: "cost-optimized", label: "Cost Optimized — cheapest first" },
  { value: "auto", label: "Auto — 4-factor scoring" },
];

const AUTO_MODE_OPTIONS = [
  { value: "balanced", label: "Balanced" },
  { value: "cost-saver", label: "Cost Saver" },
  { value: "speed", label: "Speed" },
  { value: "reliable", label: "Reliable" },
  { value: "value", label: "Value (P/P)" },
  { value: "best-free", label: "Best Free" },
];

function ComboCard({ combo, getCaps, activeProviders = [], copied, onCopy, onEdit, onDelete, onTest, testing = false, strategy = {}, onSetStrategy }) {
  const [showJudgeSelect, setShowJudgeSelect] = useState(false);
  const isBuiltin = Boolean(combo.isBuiltin);
  const current = isBuiltin ? (combo.strategy || "auto") : (strategy.fallbackStrategy || "fallback");
  const judge = strategy.judgeModel || "";
  const isFusion = current === "fusion";
  const isAuto = current === "auto" || isBuiltin;
  const autoMode = isBuiltin ? (combo.mode || "balanced") : (strategy.autoMode || "balanced");

  return (
    <Card padding="sm" className={`group transition-all ${isBuiltin ? "border-primary/30 bg-surface-1 hover:border-primary/50" : ""}`}>
      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 flex-1 items-start gap-3 sm:items-center">
          <div className={`size-8 rounded-lg flex items-center justify-center shrink-0 ${isBuiltin ? "bg-primary/20 text-primary" : "bg-primary/10 text-primary"}`}>
            <span className="material-symbols-outlined text-[18px]">
              {isBuiltin ? "auto_awesome" : "layers"}
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <code className="truncate font-mono text-sm font-semibold text-text-main">{combo.name}</code>
              {isBuiltin && (
                <span className="inline-flex items-center rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary border border-primary/20">
                  Built-in
                </span>
              )}
              {combo.description && (
                <span className="hidden lg:inline text-xs text-text-muted truncate max-w-md">
                  — {combo.description}
                </span>
              )}
            </div>

            {/* Model List Preview */}
            <div className="mt-1 flex min-w-0 flex-wrap items-center gap-1">
              {combo.models.length === 0 ? (
                <span className="text-xs text-text-muted italic">
                  {isBuiltin ? "Dynamic pool across all connected providers" : "No models configured"}
                </span>
              ) : (
                combo.models.slice(0, 3).map((model, index) => (
                  <code key={index} className="inline-flex items-center gap-1 rounded bg-black/5 px-1.5 py-0.5 font-mono text-xs text-text-muted dark:bg-white/5">
                    <span>{model}</span>
                    <CapacityBadges caps={getCaps?.(model)} />
                  </code>
                ))
              )}
              {combo.models.length > 3 && (
                <span className="text-[10px] text-text-muted">+{combo.models.length - 3} more</span>
              )}
            </div>

            {/* Fusion: judge picker */}
            {isFusion && !isBuiltin && (
              <div className="mt-2 flex min-w-0 flex-wrap items-center gap-1.5">
                <span className="text-[11px] font-medium text-text-muted">Judge</span>
                <button
                  onClick={() => setShowJudgeSelect(true)}
                  className="inline-flex max-w-full items-center gap-1 rounded border border-dashed border-primary/40 px-1.5 py-0.5 font-mono text-[11px] text-primary hover:border-primary hover:bg-primary/5 transition-colors"
                  title="Pick the model that fuses panel answers"
                >
                  <span className="material-symbols-outlined text-[13px]">gavel</span>
                  <span className="truncate">{judge || `Auto — ${combo.models[0] || "first model"}`}</span>
                </button>
                {judge && (
                  <button
                    onClick={() => onSetStrategy({ judgeModel: "" })}
                    className="p-0.5 rounded text-text-muted hover:text-red-500 hover:bg-red-500/10 transition-colors"
                    title="Reset judge to Auto"
                  >
                    <span className="material-symbols-outlined text-[13px]">close</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center sm:gap-3 sm:shrink-0">
          {/* Strategy / Mode info badge */}
          {isBuiltin ? (
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center rounded-md bg-primary/10 px-2 py-1 font-mono text-xs font-semibold text-primary uppercase">
                {combo.strategy || "auto"} / {combo.mode || "balanced"}
              </span>
            </div>
          ) : (
            <>
              {/* Strategy selector — always visible for custom combos */}
              <div className="w-full sm:w-[180px]">
                <Select
                  options={STRATEGY_OPTIONS}
                  value={current}
                  onChange={(e) => onSetStrategy({ fallbackStrategy: e.target.value })}
                  selectClassName="py-1.5 text-xs"
                />
              </div>

              {/* Auto mode selector */}
              {isAuto && (
                <div className="w-full sm:w-[130px]">
                  <Select
                    options={AUTO_MODE_OPTIONS}
                    value={autoMode}
                    onChange={(e) => onSetStrategy({ autoMode: e.target.value })}
                    selectClassName="py-1.5 text-xs"
                  />
                </div>
              )}
            </>
          )}

          <div className="flex items-center gap-1">
            {/* Test button */}
            {!isBuiltin && (
              <button
                onClick={onTest}
                disabled={testing || combo.models.length === 0}
                className={`flex items-center gap-1 rounded px-2.5 py-1.5 text-xs font-medium transition-colors ${
                  testing || combo.models.length === 0
                    ? "text-text-muted/40 cursor-not-allowed"
                    : "text-text-muted hover:bg-black/5 hover:text-primary dark:hover:bg-white/5"
                }`}
                title="Test every model in this combo"
              >
                <span className={`material-symbols-outlined text-[16px] ${testing ? "animate-spin" : ""}`}>
                  {testing ? "progress_activity" : "play_circle"}
                </span>
                <span>{testing ? "Testing..." : "Test"}</span>
              </button>
            )}

            {/* Copy button */}
            <button
              onClick={(e) => { e.stopPropagation(); onCopy(combo.name, `combo-${combo.id}`); }}
              className="flex items-center gap-1 rounded px-2.5 py-1.5 text-xs font-medium text-text-muted transition-colors hover:bg-black/5 hover:text-primary dark:hover:bg-white/5"
              title="Copy combo name"
            >
              <span className="material-symbols-outlined text-[16px]">
                {copied === `combo-${combo.id}` ? "check" : "content_copy"}
              </span>
              <span>{copied === `combo-${combo.id}` ? "Copied" : "Copy"}</span>
            </button>

            {/* Edit button — only for custom combos */}
            {!isBuiltin && (
              <button
                onClick={onEdit}
                className="flex items-center gap-1 rounded px-2.5 py-1.5 text-xs font-medium text-text-muted transition-colors hover:bg-black/5 hover:text-primary dark:hover:bg-white/5"
                title="Edit combo"
              >
                <span className="material-symbols-outlined text-[16px]">edit</span>
                <span>Edit</span>
              </button>
            )}

            {/* Delete button — only for custom combos */}
            {!isBuiltin && (
              <button
                onClick={onDelete}
                className="flex items-center gap-1 rounded px-2.5 py-1.5 text-xs font-medium text-red-500 transition-colors hover:bg-red-500/10"
                title="Delete combo"
              >
                <span className="material-symbols-outlined text-[16px]">delete</span>
                <span>Delete</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}

function ComboTestResultsModal({ isOpen, onClose, results, onRetest, testing }) {
  if (!isOpen || !results) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Test Results — ${results.name}`} size="md">
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between text-xs text-text-muted">
          <span>{results.results?.length || 0} models tested</span>
          <span>Strategy: {results.strategy || "fallback"}</span>
        </div>

        <div className="flex flex-col gap-2 max-h-[350px] overflow-y-auto">
          {(results.results || []).map((r, i) => (
            <div
              key={i}
              className={`flex items-center gap-2 p-2.5 rounded-lg border text-xs ${
                r.ok
                  ? "border-green-500/20 bg-green-500/5 text-text-main"
                  : "border-red-500/20 bg-red-500/5 text-text-main"
              }`}
            >
              <span
                className={`material-symbols-outlined text-[18px] shrink-0 ${
                  r.ok ? "text-green-600 dark:text-green-400" : "text-red-500"
                }`}
                title={r.ok ? "OK" : "Failed"}
              >
                {r.ok ? "check_circle" : "cancel"}
              </span>
              <code className="min-w-0 flex-1 truncate font-mono text-xs text-text-main" title={r.model}>
                {r.model}
              </code>
              {r.ok ? (
                <span className="shrink-0 text-[11px] text-text-muted font-mono">
                  {typeof r.latencyMs === "number" ? `${r.latencyMs}ms` : ""}
                </span>
              ) : (
                <span
                  className="max-w-[45%] shrink-0 truncate text-[11px] text-red-500 font-mono"
                  title={r.error || "Failed"}
                >
                  {r.error || `HTTP ${r.status}`}
                </span>
              )}
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2 pt-1 sm:flex-row">
          <Button onClick={onRetest} variant="ghost" fullWidth size="sm" disabled={testing}>
            {testing ? "Testing..." : "Re-test"}
          </Button>
          <Button onClick={onClose} fullWidth size="sm">
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function ComboFormModal({ isOpen, combo, onClose, onSave, activeProviders, kindFilter = null }) {
  const [name, setName] = useState(combo?.name || "");
  const [models, setModels] = useState(combo?.models || []);
  const [showModelSelect, setShowModelSelect] = useState(false);
  const [saving, setSaving] = useState(false);
  const [nameError, setNameError] = useState("");
  const [modelAliases, setModelAliases] = useState({});

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const modelItems = models.map((model, i) => ({ uid: `item-${i}`, model }));

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = modelItems.findIndex((m) => m.uid === active.id);
      const newIndex = modelItems.findIndex((m) => m.uid === over.id);
      if (oldIndex !== -1 && newIndex !== -1) {
        setModels((prev) => arrayMove(prev, oldIndex, newIndex));
      }
    }
  };

  const fetchModalData = async () => {
    try {
      const aliasesRes = await fetch("/api/models/alias");
      if (!aliasesRes.ok) return;
      const aliasesData = await aliasesRes.json();
      setModelAliases(aliasesData.aliases || {});
    } catch (error) {
      console.error("Error fetching modal data:", error);
    }
  };

  useEffect(() => {
    if (isOpen) fetchModalData();
  }, [isOpen]);

  const validateName = (value) => {
    if (!value.trim()) {
      setNameError("Name is required");
      return false;
    }
    if (!VALID_NAME_REGEX.test(value)) {
      setNameError("Only letters, numbers, -, _ and . allowed");
      return false;
    }
    setNameError("");
    return true;
  };

  const handleNameChange = (e) => {
    const value = e.target.value;
    setName(value);
    if (value) validateName(value);
  };

  const handleModelEdit = (index, newModel) => {
    setModels((prev) => {
      const next = [...prev];
      next[index] = newModel;
      return next;
    });
  };

  const handleMoveUp = (index) => {
    if (index === 0) return;
    setModels((prev) => arrayMove(prev, index, index - 1));
  };

  const handleMoveDown = (index) => {
    if (index === models.length - 1) return;
    setModels((prev) => arrayMove(prev, index, index + 1));
  };

  const handleRemoveModel = (index) => {
    setModels((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateName(name)) return;
    setSaving(true);
    try {
      await onSave({ name: name.trim(), models });
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={combo ? `Edit Combo — ${combo.name}` : "Create Model Combo"}
      size="md"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="block text-xs font-medium text-text-main mb-1.5">Combo Name</label>
          <Input
            value={name}
            onChange={handleNameChange}
            placeholder="e.g. general-fallback, fast-tier"
            error={nameError}
            disabled={!!combo}
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-medium text-text-main">
              Models ({models.length})
            </label>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              icon="add"
              onClick={() => setShowModelSelect(true)}
            >
              Add Model
            </Button>
          </div>

          {models.length === 0 ? (
            <div className="p-4 rounded-lg border border-dashed border-border/60 text-center text-xs text-text-muted">
              No models in this combo yet. Click &quot;Add Model&quot; to pick from active providers.
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
              modifiers={[restrictToVerticalAxis, restrictToParentElement]}
            >
              <SortableContext items={modelItems.map((m) => m.uid)} strategy={verticalListSortingStrategy}>
                <div className="flex flex-col gap-1 max-h-[260px] overflow-y-auto pr-1">
                  {models.map((model, index) => (
                    <ModelItem
                      key={modelItems[index].uid}
                      id={modelItems[index].uid}
                      index={index}
                      model={model}
                      isFirst={index === 0}
                      isLast={index === models.length - 1}
                      onEdit={(val) => handleModelEdit(index, val)}
                      onMoveUp={() => handleMoveUp(index)}
                      onMoveDown={() => handleMoveDown(index)}
                      onRemove={() => handleRemoveModel(index)}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/40">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving || !!nameError || !name.trim()}>
            {saving ? "Saving..." : combo ? "Update Combo" : "Create Combo"}
          </Button>
        </div>
      </form>

      {showModelSelect && (
        <ModelSelectModal
          isOpen={showModelSelect}
          onClose={() => setShowModelSelect(false)}
          onSelect={(selected) => {
            // ModelSelectModal passes model objects ({id, name, value}) — extract the string value
            const value = selected?.value || selected?.name || selected;
            if (Array.isArray(value)) {
              const values = value.map((m) => m?.value || m?.name || m).filter((m) => typeof m === "string");
              setModels((prev) => [...prev, ...values.filter((m) => !prev.includes(m))]);
            } else if (typeof value === "string" && value && !models.includes(value)) {
              setModels((prev) => [...prev, value]);
            }
            setShowModelSelect(false);
          }}
          activeProviders={activeProviders}
          kindFilter={kindFilter}
        />
      )}
    </Modal>
  );
}

function ModelItem({ id, index, model, isFirst, isLast, onEdit, onMoveUp, onMoveDown, onRemove }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    opacity: isDragging ? 0.4 : 1,
    zIndex: isDragging ? 999 : undefined,
  };
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(model);
  const commit = () => {
    const trimmed = draft.trim();
    if (trimmed && trimmed !== model) onEdit(trimmed);
    else setDraft(model);
    setEditing(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") commit();
    if (e.key === "Escape") { setDraft(model); setEditing(false); }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group flex min-w-0 items-center gap-1.5 rounded-md px-2 py-1 bg-black/[0.02] hover:bg-black/[0.04] dark:bg-white/[0.02] dark:hover:bg-white/[0.04] transition-colors ${isDragging ? "shadow-md ring-1 ring-primary/30" : ""}`}
    >
      {/* Drag handle */}
      <button
        {...attributes}
        {...listeners}
        type="button"
        className="cursor-grab touch-none p-0.5 rounded text-text-muted hover:text-primary active:cursor-grabbing shrink-0"
        title="Drag to reorder"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="9" cy="4" r="2"/><circle cx="15" cy="4" r="2"/>
          <circle cx="9" cy="12" r="2"/><circle cx="15" cy="12" r="2"/>
          <circle cx="9" cy="20" r="2"/><circle cx="15" cy="20" r="2"/>
        </svg>
      </button>

      {/* Index badge */}
      <span className="text-[10px] font-medium text-text-muted w-3 text-center shrink-0">{index + 1}</span>

      {/* Inline editable model value */}
      {editing ? (
        <input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={handleKeyDown}
          className="min-w-0 flex-1 rounded border border-primary/40 bg-white px-1.5 py-0.5 font-mono text-xs text-text-main outline-none dark:bg-black/20"
        />
      ) : (
        <div
          className="min-w-0 flex-1 cursor-text truncate rounded px-1.5 py-0.5 font-mono text-xs text-text-main hover:bg-black/5 dark:hover:bg-white/5"
          onClick={() => setEditing(true)}
          title="Click to edit"
        >
          {model}
        </div>
      )}

      {/* Priority arrows */}
      <div className="flex shrink-0 items-center gap-0.5">
        <button
          type="button"
          onClick={onMoveUp}
          disabled={isFirst}
          className={`p-0.5 rounded ${isFirst ? "text-text-muted/20 cursor-not-allowed" : "text-text-muted hover:text-primary hover:bg-black/5 dark:hover:bg-white/5"}`}
          title="Move up"
        >
          <span className="material-symbols-outlined text-[12px]">arrow_upward</span>
        </button>
        <button
          type="button"
          onClick={onMoveDown}
          disabled={isLast}
          className={`p-0.5 rounded ${isLast ? "text-text-muted/20 cursor-not-allowed" : "text-text-muted hover:text-primary hover:bg-black/5 dark:hover:bg-white/5"}`}
          title="Move down"
        >
          <span className="material-symbols-outlined text-[12px]">arrow_downward</span>
        </button>
      </div>

      {/* Remove */}
      <button
        type="button"
        onClick={onRemove}
        className="p-0.5 hover:bg-red-500/10 rounded text-text-muted hover:text-red-500 transition-all"
        title="Remove"
      >
        <span className="material-symbols-outlined text-[12px]">close</span>
      </button>
    </div>
  );
}
