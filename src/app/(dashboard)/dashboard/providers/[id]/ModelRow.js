import { CapacityBadges, Toggle } from "@/shared/components";

export default function ModelRow({ model, fullModel, alias, copied, onCopy, testStatus, isCustom, isFree, onDeleteAlias, onTest, isTesting, onToggle, isDisabled, caps }) {
  const borderColor = testStatus === "ok"
    ? "border-green-500/40"
    : testStatus === "error"
    ? "border-red-500/40"
    : "border-border";

  const iconColor = testStatus === "ok"
    ? "#22c55e"
    : testStatus === "error"
    ? "#ef4444"
    : "var(--color-text-muted)";

  const containerStyle = isDisabled
    ? "opacity-60 bg-sidebar/20 border-dashed border-border/60"
    : `${borderColor} hover:bg-sidebar/50`;

  return (
    <div className={`group min-w-0 max-w-full rounded-lg border px-3 py-2 ${containerStyle}`}>
      <div className="flex min-w-0 items-start gap-2 sm:items-center">
        <span
          className="material-symbols-outlined shrink-0 text-base"
          style={{ color: isDisabled ? "var(--color-text-muted)" : iconColor }}
        >
          {testStatus === "ok" ? "check_circle" : testStatus === "error" ? "cancel" : "smart_toy"}
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <code className="max-w-[72vw] truncate rounded bg-sidebar px-1.5 py-0.5 font-mono text-xs text-text-main sm:max-w-[360px]">{fullModel}</code>
            {isFree && (
              <span className="px-1.5 py-0.5 rounded bg-green-500/10 text-green-600 dark:text-green-400 font-bold text-[9px] leading-none border border-green-500/20 shrink-0">
                FREE
              </span>
            )}
            {isDisabled && (
              <span className="px-1.5 py-0.5 rounded bg-black/5 dark:bg-white/5 text-text-muted text-[9px] leading-none shrink-0">
                Disabled
              </span>
            )}
          </div>
          <span className="flex min-w-0 items-center text-[9px] gap-1 pl-1">
            {model.name && <span className="truncate text-[9px] italic text-text-main/70">{model.name}</span>}
            <CapacityBadges caps={caps} colorOverride="text-text-main/70" size={12} />
          </span>
        </div>
        {onTest && (
          <div className="relative shrink-0 group/btn">
            <button
              onClick={onTest}
              disabled={isTesting}
              className={`rounded p-1 text-text-muted transition-all duration-150 hover:bg-sidebar hover:text-primary ${isTesting ? "opacity-100" : "opacity-100"}`}
            >
              <span className="material-symbols-outlined text-sm" style={isTesting ? { animation: "spin 1s linear infinite" } : undefined}>
                {isTesting ? "progress_activity" : "science"}
              </span>
            </button>
            <span className="pointer-events-none absolute mt-1 top-6 left-1/2 -translate-x-1/2 text-[10px] text-text-muted whitespace-nowrap opacity-0 group-hover/btn:opacity-100 transition-opacity">
              {isTesting ? "Testing..." : "Test"}
            </span>
          </div>
        )}
        <div className="relative shrink-0 group/btn">
          <button
            onClick={() => onCopy(fullModel, `model-${model.id}`)}
            className="rounded p-1 text-text-muted transition-all duration-150 hover:bg-sidebar hover:text-primary"
          >
            <span className="material-symbols-outlined text-sm">
              {copied === `model-${model.id}` ? "check" : "content_copy"}
            </span>
          </button>
          <span className="pointer-events-none absolute mt-1 top-6 left-1/2 -translate-x-1/2 text-[10px] text-text-muted whitespace-nowrap opacity-0 group-hover/btn:opacity-100 transition-opacity">
            {copied === `model-${model.id}` ? "Copied!" : "Copy"}
          </span>
        </div>
        {isCustom ? (
          <button
            onClick={onDeleteAlias}
            className="ml-auto rounded p-1 text-text-muted opacity-100 transition-all duration-150 hover:bg-red-500/10 hover:text-red-500"
            title="Remove custom model"
          >
            <span className="material-symbols-outlined text-sm">close</span>
          </button>
        ) : onToggle ? (
          <div className="ml-auto shrink-0">
            <Toggle
              size="sm"
              checked={!isDisabled}
              onChange={onToggle}
              title={isDisabled ? "Enable this model" : "Disable this model"}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}

