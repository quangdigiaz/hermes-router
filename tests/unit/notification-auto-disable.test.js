import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock the DB + cache layers so we only exercise notificationBus logic.
const disableModelsMock = vi.fn().mockResolvedValue(undefined);
const enableModelsMock = vi.fn().mockResolvedValue(undefined);
const getDisabledByProviderMock = vi.fn().mockResolvedValue([]);
const invalidateAllowedModelsCacheMock = vi.fn();
const updateProviderConnectionMock = vi.fn().mockResolvedValue({});

vi.mock("@/lib/db/repos/disabledModelsRepo.js", () => ({
  disableModels: (...args) => disableModelsMock(...args),
  enableModels: (...args) => enableModelsMock(...args),
  getDisabledByProvider: (...args) => getDisabledByProviderMock(...args),
}));
vi.mock("@/sse/services/allowedModels.js", () => ({
  invalidateAllowedModelsCache: () => invalidateAllowedModelsCacheMock(),
}));
vi.mock("@/lib/db/repos/connectionsRepo.js", () => ({
  updateProviderConnection: (...args) => updateProviderConnectionMock(...args),
}));

import { emitNotification, getRecentNotifications } from "@/lib/notificationBus";
import { updateAutoDisableConfig, resetCounter, resetAuthCounter, reactivateConnection, shouldDeactivateAccount } from "@/lib/autoDisableTracker";

const waitFor = (fn) => vi.waitFor(fn, { timeout: 2000 });

beforeEach(() => {
  vi.clearAllMocks();
  // Threshold 1 -> first hard error triggers auto-disable immediately.
  updateAutoDisableConfig({ enabled: true, threshold: 1, windowMs: 60_000 });
});

afterEach(() => {
  resetCounter("test-conn");
  resetCounter("orcarouter|chat-model");
  resetCounter("orcarouter|combo-model");
  resetCounter("orcarouter|combo/orcarouter/combo-model");
  resetCounter("qd|qd/auto");
  resetAuthCounter("test-conn");
  resetAuthCounter("kiro-conn-1");
  resetAuthCounter("reactivate-conn");
});

describe("auto-disable format (Bug A fix)", () => {
  it("chat-source event (bare model) disables with bare model id under provider alias", async () => {
    emitNotification({
      severity: "warning",
      category: "auth",
      provider: "orcarouter",
      model: "qwen3.8-27b-free",
      connectionId: "test-conn",
      status: 404,
      message: "Model not found",
      source: "chat",
    });
    await waitFor(() => expect(disableModelsMock).toHaveBeenCalledTimes(1));
    expect(disableModelsMock).toHaveBeenCalledWith("orcarouter", ["qwen3.8-27b-free"]);
  });

  it("combo-source event (provider/model string) strips the provider prefix", async () => {
    emitNotification({
      severity: "warning",
      category: "combo_failover",
      provider: "orcarouter",
      model: "orcarouter/combo-model",
      status: 404,
      message: "Model orcarouter/combo-model failed (404), trying next",
      source: "combo",
    });
    await waitFor(() => expect(disableModelsMock).toHaveBeenCalledTimes(1));
    expect(disableModelsMock).toHaveBeenCalledWith("orcarouter", ["combo-model"]);
  });

  it("emits a critical auto_disabled notification with the disable reason", async () => {
    emitNotification({
      severity: "warning",
      category: "auth",
      provider: "orcarouter",
      model: "chat-model",
      connectionId: "test-conn",
      status: 404,
      message: "Model not found",
      source: "chat",
    });
    await waitFor(() => expect(disableModelsMock).toHaveBeenCalledTimes(1));
    const autoDisabled = getRecentNotifications().filter((n) => n.category === "auto_disabled");
    expect(autoDisabled.length).toBeGreaterThan(0);
    expect(autoDisabled[0].severity).toBe("critical");
    expect(autoDisabled[0].autoDisabled).toBe(true);
    expect(autoDisabled[0].message).toContain("Auto-disabled");
  });

  it("does NOT auto-disable soft errors (429)", async () => {
    emitNotification({
      severity: "warning",
      category: "quota",
      provider: "orcarouter",
      model: "qwen3.8-27b-free",
      connectionId: "test-conn",
      status: 429,
      message: "free model capacity is limited",
      source: "chat",
    });
    await new Promise((r) => setTimeout(r, 50));
    expect(disableModelsMock).not.toHaveBeenCalled();
  });

  it("does NOT auto-disable client disconnects (499)", async () => {
    emitNotification({
      severity: "warning",
      category: "combo_failover",
      provider: "qd",
      model: "qd/auto",
      status: 499,
      message: "Model qd/auto failed (499), trying next",
      source: "combo",
    });
    await new Promise((r) => setTimeout(r, 50));
    expect(disableModelsMock).not.toHaveBeenCalled();
  });

  it("only auto-disables 403 when the message indicates an invalid/expired token", async () => {
    // 403 without keyword -> soft -> no disable
    emitNotification({
      severity: "warning",
      category: "auth",
      provider: "orcarouter",
      model: "chat-model",
      connectionId: "test-conn",
      status: 403,
      message: "Forbidden: model access denied",
      source: "chat",
    });
    await new Promise((r) => setTimeout(r, 50));
    expect(disableModelsMock).not.toHaveBeenCalled();

    // 403 with "invalid token" -> hard -> disable
    emitNotification({
      severity: "critical",
      category: "auth",
      provider: "orcarouter",
      model: "chat-model",
      connectionId: "test-conn",
      status: 403,
      message: "The bearer token included in the request is invalid",
      source: "chat",
    });
    await waitFor(() => expect(disableModelsMock).toHaveBeenCalledTimes(1));
    expect(disableModelsMock).toHaveBeenCalledWith("orcarouter", ["chat-model"]);
  });

  it("deactivates the account on 403-invalid-token with connectionId", async () => {
    emitNotification({
      severity: "critical",
      category: "auth",
      provider: "kiro",
      model: null,
      connectionId: "kiro-conn-1",
      status: 403,
      message: "The bearer token included in the request is invalid",
      source: "kiro-models",
    });
    await waitFor(() => expect(updateProviderConnectionMock).toHaveBeenCalledTimes(1));
    expect(updateProviderConnectionMock).toHaveBeenCalledWith("kiro-conn-1",
      expect.objectContaining({ isActive: false, testStatus: "auth_failed", lastErrorType: "auth_failed", errorCode: 403 })
    );
    // No model string -> only account-level action
    expect(disableModelsMock).not.toHaveBeenCalled();
  });

  it("deactivates the account on 401 too", async () => {
    emitNotification({
      severity: "critical",
      category: "auth",
      provider: "kiro",
      model: "kiro/some-model",
      connectionId: "kiro-conn-1",
      status: 401,
      message: "Unauthorized: token expired",
      source: "chat",
    });
    await waitFor(() => expect(updateProviderConnectionMock).toHaveBeenCalledTimes(1));
    expect(updateProviderConnectionMock).toHaveBeenCalledWith("kiro-conn-1", expect.objectContaining({ isActive: false, errorCode: 401 }));
    // Model is also disabled
    expect(disableModelsMock).toHaveBeenCalledWith("kiro", ["some-model"]);
  });

  it("does NOT deactivate the account on 404 (model-level only)", async () => {
    emitNotification({
      severity: "warning",
      category: "combo_failover",
      provider: "orcarouter",
      model: "orcarouter/missing-model",
      connectionId: "test-conn",
      status: 404,
      message: "Model not found",
      source: "combo",
    });
    await waitFor(() => expect(disableModelsMock).toHaveBeenCalledTimes(1));
    expect(disableModelsMock).toHaveBeenCalledWith("orcarouter", ["missing-model"]);
    expect(updateProviderConnectionMock).not.toHaveBeenCalled();
  });
});

describe("auto-reactivate (clear counters + disabled models)", () => {
  it("resets auth counter and re-enables disabled models on reactivation", async () => {
    // First, trigger an auth failure to populate the counter
    emitNotification({
      severity: "critical",
      category: "auth",
      provider: "kiro",
      model: null,
      connectionId: "reactivate-conn",
      status: 403,
      message: "The bearer token included in the request is invalid",
      source: "kiro-models",
    });
    await waitFor(() => expect(updateProviderConnectionMock).toHaveBeenCalledTimes(1));

    // Now simulate the user fixing the token: emit a reactivation notification
    // Mock getDisabledByProvider to return some disabled models
    getDisabledByProviderMock.mockResolvedValueOnce(["model-a", "model-b"]);

    emitNotification({
      severity: "info",
      category: "reactivate",
      provider: "kiro",
      connectionId: "reactivate-conn",
      message: "Connection reactivated (was auth_failed)",
      source: "dashboard",
    });

    await waitFor(() => expect(enableModelsMock).toHaveBeenCalledTimes(1));
    expect(enableModelsMock).toHaveBeenCalledWith("kiro", ["model-a", "model-b"]);

    // Verify a reactivation notification was emitted
    const reactivated = getRecentNotifications().filter((n) => n.category === "auto_reactivated");
    expect(reactivated.length).toBeGreaterThan(0);
    expect(reactivated[0].autoReactivated).toBe(true);
    expect(reactivated[0].message).toContain("reactivated");
  });

  it("does NOT re-enable models if none were disabled", async () => {
    getDisabledByProviderMock.mockResolvedValueOnce([]);

    emitNotification({
      severity: "info",
      category: "reactivate",
      provider: "kiro",
      connectionId: "reactivate-conn",
      message: "Connection reactivated",
      source: "dashboard",
    });

    await new Promise((r) => setTimeout(r, 50));
    expect(enableModelsMock).not.toHaveBeenCalled();
  });

  it("reactivateConnection resets both auth and error counters", () => {
    // Populate both counters
    emitNotification({
      severity: "critical",
      category: "auth",
      provider: "kiro",
      model: null,
      connectionId: "reactivate-conn",
      status: 403,
      message: "The bearer token included in the request is invalid",
      source: "kiro-models",
    });

    // Verify the auth counter was populated
    // Note: shouldDeactivateAccount would be true after threshold hits

    // Now call reactivateConnection directly
    reactivateConnection("reactivate-conn");

    // After reactivation, shouldDeactivateAccount should return false
    expect(shouldDeactivateAccount("reactivate-conn")).toBe(false);
  });
});
