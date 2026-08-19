"use client";

import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "hermes_ui_mode";

/**
 * Hook to manage Dual-Mode UI: "classic" (default repo layout) vs "studio" (modern TeamoRouter-style view).
 * Fully SSR-safe and persisted to localStorage.
 */
export function useUiMode() {
  const [uiMode, setUiModeState] = useState("classic");
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === "studio" || saved === "classic") {
        setUiModeState(saved);
      }
    } catch {}
    setIsReady(true);
  }, []);

  const setUiMode = useCallback((mode) => {
    const next = mode === "studio" ? "studio" : "classic";
    setUiModeState(next);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(STORAGE_KEY, next);
      } catch {}
    }
  }, []);

  const toggleUiMode = useCallback(() => {
    setUiMode(uiMode === "studio" ? "classic" : "studio");
  }, [uiMode, setUiMode]);

  return {
    uiMode,
    isStudio: uiMode === "studio",
    isClassic: uiMode === "classic",
    isReady,
    setUiMode,
    toggleUiMode,
  };
}
