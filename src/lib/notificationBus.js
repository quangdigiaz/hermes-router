import { EventEmitter } from "events";
import {
  classifyHardError,
  recordHardError,
  shouldAutoDisable,
  recordAuthFailure,
  shouldDeactivateAccount,
  reactivateConnection,
  getAutoDisableConfig,
} from "./autoDisableTracker.js";
import { disableModels, enableModels, getDisabledByProvider } from "./db/repos/disabledModelsRepo.js";
import { updateProviderConnection } from "./db/repos/connectionsRepo.js";
import { invalidateAllowedModelsCache } from "@/sse/services/allowedModels.js";

const BUFFER_MAX = 100;
const DEDUP_WINDOW_MS = 60_000;

if (!global._notificationBusState) {
  global._notificationBusState = {
    emitter: new EventEmitter(),
    buffer: [],
    dedupMap: new Map(),
  };
  global._notificationBusState.emitter.setMaxListeners(50);
}

const state = global._notificationBusState;

if (!state.emitter) {
  state.emitter = new EventEmitter();
  state.emitter.setMaxListeners(50);
}

let idCounter = 0;

function dedupKey(n) {
  return `${n.provider || ""}|${n.model || ""}|${n.status || ""}|${n.category || ""}`;
}

function isDuplicate(n) {
  const key = dedupKey(n);
  const now = Date.now();
  const last = state.dedupMap.get(key);
  if (last && now - last < DEDUP_WINDOW_MS) return true;
  state.dedupMap.set(key, now);
  return false;
}

function cleanupDedup() {
  const now = Date.now();
  for (const [key, ts] of state.dedupMap) {
    if (now - ts > DEDUP_WINDOW_MS) state.dedupMap.delete(key);
  }
}

function emitRaw(notification) {
  state.buffer.push(notification);
  if (state.buffer.length > BUFFER_MAX) {
    state.buffer = state.buffer.slice(-BUFFER_MAX);
  }
  state.emitter.emit("notification", notification);
}

async function processAutoDisable(notification) {
  const { status, provider, model, connectionId } = notification;
  if (!status || !provider) return;

  const classification = classifyHardError(status, notification.message);
  if (classification !== "hard") return;

  // Track by connectionId (preferred) or provider|model
  const key = connectionId || `${provider}|${model || ""}`;
  const count = recordHardError(key);

  // Normalize to the format the UI toggle + combo filter use: bare model id
  // stored under the provider alias. `provider` is the alias; `model` may carry
  // a "provider/" prefix (combo events) or already be bare (chat events).
  const prefix = `${provider}/`;
  const modelId = (model || "").startsWith(prefix) ? model.slice(prefix.length) : model || "";

  const config = getAutoDisableConfig();
  const actions = [];

  // 1) Model-level: disable the failing model once the per-key threshold is hit
  if (shouldAutoDisable(key) && modelId) {
    try {
      await disableModels(provider, [modelId]);
      invalidateAllowedModelsCache();
      actions.push(`model ${modelId} disabled`);
    } catch {
      // best-effort
    }
  }

  // 2) Account-level: 401 / 403-invalid-token means the credentials themselves
  // are bad — after the auth threshold, deactivate the whole connection so
  // login-based providers (e.g. Kiro) stop being picked for every request.
  if ((status === 401 || status === 403) && connectionId) {
    recordAuthFailure(connectionId);
    if (shouldDeactivateAccount(connectionId)) {
      try {
        await updateProviderConnection(connectionId, {
          isActive: false,
          testStatus: "auth_failed",
          lastErrorType: "auth_failed",
          errorCode: status,
          authFailedAt: new Date().toISOString(),
        });
        actions.push("account deactivated (auth_failed)");
      } catch {
        // best-effort
      }
    }
  }

  if (actions.length === 0) return;

  // Emit auto-disable notification
  const disableNotification = {
    id: ++idCounter,
    ts: Date.now(),
    severity: "critical",
    category: "auto_disabled",
    provider,
    model,
    connectionId,
    status,
    message: `Auto-disabled after ${count} consecutive errors (${config.threshold} threshold): ${actions.join(", ")} | ${notification.message}`,
    source: "auto-disable",
    autoDisabled: true,
  };

  emitRaw(disableNotification);
}

/**
 * Handle a manual reactivation: when the user fixes a token or toggles
 * isActive back on a connection that was auth_failed, reset the auth
 * counter AND re-enable all models that were auto-disabled for that
 * provider so the next request picks them up.
 */
async function processAutoReactivate(notification) {
  const { provider, connectionId } = notification;
  if (!provider || !connectionId) return;

  const actions = [];

  // 1) Reset all auto-disable counters for this connection
  reactivateConnection(connectionId);
  actions.push("auth + error counters reset");

  // 2) Re-enable any models that were auto-disabled under this provider
  try {
    const disabled = await getDisabledByProvider(provider);
    if (disabled.length > 0) {
      await enableModels(provider, disabled);
      invalidateAllowedModelsCache();
      actions.push(`models re-enabled: ${disabled.join(", ")}`);
    }
  } catch {
    // best-effort
  }

  if (actions.length === 0) return;

  const reactivateNotification = {
    id: ++idCounter,
    ts: Date.now(),
    severity: "info",
    category: "auto_reactivated",
    provider,
    connectionId,
    message: `Connection reactivated: ${actions.join(", ")}`,
    source: "auto-reactivate",
    autoReactivated: true,
  };

  emitRaw(reactivateNotification);
}

export function emitNotification(payload) {
  if (payload.severity !== "critical" && isDuplicate(payload)) return;

  const notification = {
    id: ++idCounter,
    ts: Date.now(),
    severity: payload.severity || "info",
    category: payload.category || "general",
    provider: payload.provider || null,
    model: payload.model || null,
    connectionId: payload.connectionId || null,
    status: payload.status || null,
    message: payload.message || "",
    source: payload.source || "system",
    autoDisabled: !!payload.autoDisabled,
  };

  emitRaw(notification);

  // Periodic dedup cleanup
  if (state.dedupMap.size > 500) cleanupDedup();

  // Process auto-disable for error notifications (fire-and-forget)
  if (notification.severity === "warning" || notification.severity === "critical") {
    processAutoDisable(notification).catch(() => {});
  }

  // Process auto-reactivate when a connection comes back from auth_failed
  if (notification.category === "reactivate") {
    processAutoReactivate(notification).catch(() => {});
  }

  return notification;
}

export function getNotificationEmitter() {
  return state.emitter;
}

export function getRecentNotifications() {
  return state.buffer;
}
