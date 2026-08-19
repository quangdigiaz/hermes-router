// Next.js instrumentation hook — runs on server startup (Node.js runtime only).

// Force Node.js runtime so webpack does not try to bundle better-sqlite3 for
// an environment without Node built-ins (fs/path) during `next dev`.
export const runtime = "nodejs";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { initConsoleLogCapture } = await import("@/lib/consoleLogBuffer");
    initConsoleLogCapture();
  }

  // Skip in development: `next dev` bundles instrumentation with webpack and
  // cannot resolve Node built-ins (fs/os) pulled in by better-sqlite3 and some
  // provider registries. Production/standalone builds use the Node runtime and
  // keep those packages external.
  if (process.env.NODE_ENV === "development") return;
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const { syncPricing, startPeriodicSync } = await import(
    "./sse/services/pricingSync.js"
  );

  // Sync pricing from LiteLLM on startup
  syncPricing().catch((e) => {
    console.warn("[instrumentation] Pricing sync on startup failed:", e?.message || e);
  });

  // Periodic pricing sync (every hour)
  startPeriodicSync();
}
