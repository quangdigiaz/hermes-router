"use client";

import React, { useMemo } from "react";
import Button from "@/shared/components/Button";
import { isFreeModel } from "open-sse/config/benchmarks.js";
import { AI_PROVIDERS } from "@/shared/constants/providers";

export default function ModelTierFilterToolbar({
  providerId,
  models = [],
  disabledModelIds = [],
  activeFilter = "all",
  onFilterChange,
  onDisableModels,
  onEnableModels,
}) {
  // Analyze model classifications
  const classification = useMemo(() => {
    if (!models || models.length === 0) return null;

    if (providerId === "codex") {
      const proModels = models.filter((m) => m.tier === "pro");
      const plusModels = models.filter((m) => m.tier === "plus" || (!m.tier && !m.id.includes("5.6")));
      const reviewModels = models.filter((m) => m.quotaFamily === "review" || m.id.endsWith("-review"));
      const imageModels = models.filter((m) => m.kind === "image" || m.capabilities?.includes("text2img"));
      return {
        type: "codex",
        tabs: [
          { key: "all", label: "All (" + models.length + ")", count: models.length },
          { key: "pro", label: "Pro Tier (" + proModels.length + ")", count: proModels.length, color: "text-purple-600 dark:text-purple-400" },
          { key: "plus", label: "Plus Tier (" + plusModels.length + ")", count: plusModels.length, color: "text-blue-600 dark:text-blue-400" },
          { key: "review", label: "Review (" + reviewModels.length + ")", count: reviewModels.length, color: "text-amber-600 dark:text-amber-400" },
          { key: "image", label: "Image (" + imageModels.length + ")", count: imageModels.length, color: "text-emerald-600 dark:text-emerald-400" },
        ],
        proModels,
        plusModels,
      };
    }

    if (providerId === "kiro") {
      const freeModels = models.filter((m) => m.tier === "free");
      const proModels = models.filter((m) => m.tier === "pro");
      return {
        type: "kiro",
        tabs: [
          { key: "all", label: "All (" + models.length + ")", count: models.length },
          { key: "free", label: "Free Tier (" + freeModels.length + ")", count: freeModels.length, color: "text-green-600 dark:text-green-400" },
          { key: "pro", label: "Pro Tier (" + proModels.length + ")", count: proModels.length, color: "text-purple-600 dark:text-purple-400" },
        ],
        proModels,
        freeModels,
      };
    }

    const freeModels = models.filter((m) => m.isFree || isFreeModel(m.id, providerId, AI_PROVIDERS, m));
    const paidModels = models.filter((m) => !freeModels.some((fm) => fm.id === m.id));

    if (freeModels.length > 0 && paidModels.length > 0) {
      return {
        type: "freepaid",
        tabs: [
          { key: "all", label: "All (" + models.length + ")", count: models.length },
          { key: "free", label: "Free Tier (" + freeModels.length + ")", count: freeModels.length, color: "text-green-600 dark:text-green-400" },
          { key: "paid", label: "Paid Models (" + paidModels.length + ")", count: paidModels.length, color: "text-indigo-600 dark:text-indigo-400" },
        ],
        freeModels,
        paidModels,
      };
    }

    return null;
  }, [models, providerId]);

  if (!classification) return null;

  const handleDisablePro = async () => {
    if (classification.proModels) {
      const ids = classification.proModels.map((m) => m.id);
      await onDisableModels?.(ids);
    }
  };

  const handleOnlyFree = async () => {
    const freeIdSet = new Set((classification.freeModels || []).map((m) => m.id));
    const allPaidIds = models.filter((m) => !freeIdSet.has(m.id)).map((m) => m.id);
    if (allPaidIds.length > 0) await onDisableModels?.(allPaidIds);
    const freeIds = [...freeIdSet];
    if (freeIds.length > 0) await onEnableModels?.(freeIds);
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-2.5 rounded-xl border border-primary/20 bg-primary/5 p-2.5 text-xs">
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className="font-semibold text-primary shrink-0">Filter by tier:</span>
        <div className="inline-flex rounded-lg border border-border bg-surface p-0.5 shadow-xs flex-wrap">
          {classification.tabs.map((tab) => {
            const isActive = activeFilter === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => onFilterChange(tab.key)}
                className={"rounded-md px-2.5 py-1 text-xs font-semibold transition-colors " + (isActive ? "bg-primary text-white shadow-xs" : (tab.color || "text-text-muted hover:text-text-main"))}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        {classification.type === "codex" && (
          <Button size="xs" variant="secondary" icon="security" onClick={handleDisablePro} title="Disable all Pro-tier models (5.6 Sol/Terra/Luna) to prevent 403 errors on ChatGPT Plus accounts">
            🛡️ Disable Pro Models (Avoid 403)
          </Button>
        )}
        {classification.type === "kiro" && (
          <Button size="xs" variant="secondary" icon="security" onClick={handleDisablePro} title="Disable all Pro-tier models to prevent 400 errors on Free accounts">
            🛡️ Disable Pro Models (Avoid 400)
          </Button>
        )}
        {classification.type === "freepaid" && (
          <Button size="xs" variant="secondary" icon="savings" onClick={handleOnlyFree} title="Enable only Free-tier models and disable all paid models to protect your account balance">
            🛡️ Only Free Models (Save Credits)
          </Button>
        )}
      </div>
    </div>
  );
}