/**
 * Account health check service.
 *
 * Pings provider endpoints periodically to detect banned or rate-limited
 * accounts BEFORE they fail on a real request (proactive vs reactive).
 *
 * Pattern follows quotaAutoPing.js but focuses on ban/rate-limit detection.
 *
 * @module open-sse/services/accountHealth
 */

import { getProviderConnections } from "../../src/lib/db/repos/connectionsRepo.js";
import { proxyAwareFetch } from "../utils/proxyFetch.js";

// Config
const HEALTH_CHECK_INTERVAL_MS = 5 * 60 * 1000;
const HEALTH_CHECK_TIMEOUT_MS = 10_000;
const UNHEALTHY_COOLDOWN_MS = 10 * 60 * 1000;

const HEALTH_CHECK_ENDPOINTS = {
  claude: { path: "/v1/messages", method: "POST", body: '{"model":"claude-haiku-3-20250307","max_tokens":1,"messages":[{"role":"user","content":"ping"}]}' },
  openai: { path: "/v1/models", method: "GET" },
  gemini: { path: "/v1/models", method: "GET" },
  grok: { path: "/v1/models", method: "GET" },
  codex: { path: "/v1/responses", method: "POST", body: '{"model":"gpt-4o-mini","input":"ping","stream":false}' },
  antigravity: { path: "/v1internal:generateContent", method: "POST", body: '{"contents":[{"parts":[{"text":"ping"}]}]}' },
};

const DEFAULT_BASE_URLS = {
  claude: "https://api.anthropic.com",
  openai: "https://api.openai.com",
  gemini: "https://generativelanguage.googleapis.com",
  grok: "https://api.x.ai",
  codex: "https://api.openai.com",
  antigravity: "https://cloudcode-pa.googleapis.com",
};

// State (survives hot reload)
if (!global.__accountHealth) {
  global.__accountHealth = {
    interval: null,
    running: false,
    healthCache: new Map(),
  };
}
const g = global.__accountHealth;

// Core logic

export function getDefaultBaseUrl(provider) {
  return DEFAULT_BASE_URLS[provider] || null;
}

export async function checkAccountHealth(connection) {
  const config = HEALTH_CHECK_ENDPOINTS[connection.provider];
  if (!config) return { status: "unknown", reason: "no_health_endpoint" };

  let extra = {};
  try {
    extra = typeof connection.data === "string" ? JSON.parse(connection.data) : (connection.data || {});
  } catch { /* ignore parse error */ }

  const baseUrl = extra.baseUrl || getDefaultBaseUrl(connection.provider);
  if (!baseUrl) return { status: "unknown", reason: "no_base_url" };

  const url = `${baseUrl}${config.path}`;
  const headers = { "Content-Type": "application/json" };

  if (connection.authType === "oauth" && extra.accessToken) {
    headers["Authorization"] = `Bearer ${extra.accessToken}`;
  } else if (extra.apiKey) {
    headers["x-api-key"] = extra.apiKey;
  } else if (extra.accessToken) {
    headers["Authorization"] = `Bearer ${extra.accessToken}`;
  }

  try {
    const fetchOptions = {
      method: config.method,
      headers,
      signal: AbortSignal.timeout(HEALTH_CHECK_TIMEOUT_MS),
    };
    if (config.body) fetchOptions.body = config.body;

    const response = await proxyAwareFetch(url, fetchOptions);

    if (response.status === 401 || response.status === 403) {
      return { status: "banned", reason: "auth_" + response.status };
    }
    if (response.status === 429) {
      return { status: "rate_limited", reason: "429_too_many_requests" };
    }
    if (response.status === 402) {
      return { status: "rate_limited", reason: "402_payment_required" };
    }
    if (response.ok) {
      return { status: "healthy" };
    }
    return { status: "error", reason: "http_" + response.status };
  } catch (err) {
    if (err.name === "TimeoutError" || err.name === "AbortError") {
      return { status: "error", reason: "timeout" };
    }
    return { status: "error", reason: err.message };
  }
}

// Scheduler

async function runHealthCheckTick() {
  if (g.running) return;
  g.running = true;
  try {
    const connections = await getProviderConnections({ isActive: true });
    const now = Date.now();
    for (const conn of connections) {
      const cacheKey = conn.provider + ":" + conn.id;
      const cached = g.healthCache.get(cacheKey);
      if (cached && cached.lastCheckAt) {
        const lastCheckMs = new Date(cached.lastCheckAt).getTime();
        if (now - lastCheckMs < UNHEALTHY_COOLDOWN_MS) continue;
      }
      const health = await checkAccountHealth(conn);
      g.healthCache.set(cacheKey, {
        status: health.status,
        lastCheckAt: new Date().toISOString(),
        error: health.reason,
      });
      if (health.status === "banned" || health.status === "rate_limited") {
        console.warn("[AccountHealth] " + conn.provider + ":" + conn.id + " (" + (conn.email || "unknown") + "): " + health.status + " - " + health.reason);
      }
    }
  } catch (err) {
    console.error("[AccountHealth] tick error:", err.message);
  } finally {
    g.running = false;
  }
}

export function startAccountHealthCheck() {
  if (g.interval) return;
  console.log("[AccountHealth] scheduler started");
  setTimeout(function() { runHealthCheckTick().catch(function() {}); }, 30000);
  g.interval = setInterval(function() { runHealthCheckTick().catch(function() {}); }, HEALTH_CHECK_INTERVAL_MS);
  if (g.interval.unref) g.interval.unref();
}

export function stopAccountHealthCheck() {
  if (!g.interval) return;
  clearInterval(g.interval);
  g.interval = null;
  console.log("[AccountHealth] scheduler stopped");
}

export function getAccountHealthStatuses() {
  var results = [];
  g.healthCache.forEach(function(value, key) {
    var parts = key.split(":");
    var provider = parts[0];
    var connectionId = parts.slice(1).join(":");
    results.push({ connectionId: connectionId, provider: provider, status: value.status, lastCheckAt: value.lastCheckAt, error: value.error });
  });
  return results;
}

export function getAccountHealth(connectionId) {
  var found = null;
  g.healthCache.forEach(function(value, key) {
    if (key.endsWith(":" + connectionId)) found = value;
  });
  return found;
}

export { runHealthCheckTick, g as _state };
