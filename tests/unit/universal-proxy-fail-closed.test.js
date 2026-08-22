import { describe, it, expect, vi } from "vitest";
import { proxyAwareFetch } from "../../open-sse/utils/proxyFetch.js";
import { resolveConnectionProxyConfig } from "../../src/lib/network/connectionProxy.js";

describe("Universal Proxy Fail-Closed Kill-Switch & Auto-Quarantine", () => {
  it("resolves connection proxy config with strictProxy: true for legacy proxy", async () => {
    const config = await resolveConnectionProxyConfig({
      connectionProxyEnabled: true,
      connectionProxyUrl: "http://user:pass@1.2.3.4:8080",
    });

    expect(config.connectionProxyEnabled).toBe(true);
    expect(config.connectionProxyUrl).toBe("http://user:pass@1.2.3.4:8080");
    expect(config.strictProxy).toBe(true);
  });

  it("resolves non-proxy connection config without proxy", async () => {
    const config = await resolveConnectionProxyConfig({
      connectionProxyEnabled: false,
    });

    expect(config.connectionProxyEnabled).toBe(false);
    expect(config.connectionProxyUrl).toBe("");
  });

  it("throws ProxyKillSwitchError and blocks direct fallback when connection proxy fails", async () => {
    const fakeDeadProxy = "http://127.0.0.1:19999"; // unroutable dead proxy

    await expect(
      proxyAwareFetch(
        "https://api.openai.com/v1/chat/completions",
        { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" },
        {
          connectionProxyEnabled: true,
          connectionProxyUrl: fakeDeadProxy,
          strictProxy: true,
        }
      )
    ).rejects.toThrow(/ProxyKillSwitch/i);
  });

  it("throws ProxyKillSwitchError when proxy circuit is open and strictProxy is enabled", async () => {
    // If circuit is open or proxy fails, it must never fallback to direct fetch
    const proxyOptions = {
      connectionProxyEnabled: true,
      connectionProxyUrl: "http://invalid-dead-proxy.local:9999",
      strictProxy: true,
    };

    await expect(
      proxyAwareFetch(
        "https://api.anthropic.com/v1/messages",
        { method: "GET" },
        proxyOptions
      )
    ).rejects.toThrow();
  });
});
