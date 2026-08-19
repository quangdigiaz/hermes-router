import { afterEach, describe, expect, it, vi } from "vitest";

import antigravity from "../../src/lib/oauth/providers/antigravity.js";
import { getProvider } from "../../src/lib/oauth/providers.js";

const originalFetch = globalThis.fetch;

function response(data, ok = true) {
  return {
    ok,
    json: async () => data,
    text: async () => (typeof data === "string" ? data : JSON.stringify(data)),
  };
}

afterEach(() => {
  globalThis.fetch = originalFetch;
  vi.restoreAllMocks();
});

describe("Antigravity OAuth adapter", () => {
  it("is registered through the monolithic facade", () => {
    expect(getProvider("antigravity")).toBe(antigravity);
    expect(antigravity.flowType).toBe("authorization_code");
  });

  it("builds the exact authorization URL parameters", () => {
    const url = new URL(antigravity.buildAuthUrl(antigravity.config, "https://app.example/callback", "state-value"));
    expect(url.origin + url.pathname).toBe(antigravity.config.authorizeUrl);
    expect(Object.fromEntries(url.searchParams)).toEqual({
      client_id: antigravity.config.clientId,
      response_type: "code",
      redirect_uri: "https://app.example/callback",
      scope: antigravity.config.scopes.join(" "),
      state: "state-value",
      access_type: "offline",
      prompt: "consent",
    });
  });

  it("exchanges a code and preserves the error prefix", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(response({ access_token: "access" }));
    const tokens = await antigravity.exchangeToken(antigravity.config, "code", "https://app.example/callback");
    expect(tokens).toEqual({ access_token: "access" });
    expect(globalThis.fetch).toHaveBeenCalledWith(antigravity.config.tokenUrl, expect.objectContaining({
      method: "POST",
      body: expect.any(URLSearchParams),
    }));

    globalThis.fetch = vi.fn().mockResolvedValue(response("upstream failure", false));
    await expect(antigravity.exchangeToken(antigravity.config, "code", "callback"))
      .rejects.toThrow("Token exchange failed: upstream failure");
  });

  it("tolerates user-info and loadCodeAssist failures", async () => {
    globalThis.fetch = vi.fn()
      .mockResolvedValueOnce(response({}, false))
      .mockRejectedValueOnce(new Error("loadCodeAssist unavailable"));

    await expect(antigravity.postExchange({ access_token: "access" }))
      .resolves.toEqual({ userInfo: {}, projectId: "" });
    expect(globalThis.fetch).toHaveBeenCalledTimes(2);
  });

  it("extracts project ID and default tier, then onboards without blocking", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(response({ email: "user@example.com" }))
      .mockResolvedValueOnce(response({
        cloudaicompanionProject: { id: "project-id" },
        allowedTiers: [{ id: " tier-default ", isDefault: true }],
      }))
      .mockResolvedValueOnce(response({ done: true }));
    globalThis.fetch = fetchMock;

    await expect(antigravity.postExchange({ access_token: "access" }))
      .resolves.toEqual({ userInfo: { email: "user@example.com" }, projectId: "project-id" });
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));
    expect(fetchMock.mock.calls[2][0]).toBe(antigravity.config.onboardUserEndpoint);
    expect(JSON.parse(fetchMock.mock.calls[2][1].body)).toMatchObject({ tierId: "tier-default" });
    for (const call of fetchMock.mock.calls.slice(1)) {
      expect(call[1].headers).toMatchObject({
        Authorization: "Bearer access",
        "Content-Type": "application/json",
        "User-Agent": antigravity.config.loadCodeAssistUserAgent,
        "x-request-source": "local",
      });
      expect(call[1].headers).not.toHaveProperty("X-Goog-Api-Client");
      expect(call[1].headers).not.toHaveProperty("Client-Metadata");
    }
  });

  it("maps tokens and extracted metadata", () => {
    expect(antigravity.mapTokens({
      access_token: "access",
      refresh_token: "refresh",
      expires_in: 3600,
      scope: "scope",
    }, { userInfo: { email: "user@example.com" }, projectId: "project-id" })).toEqual({
      accessToken: "access",
      refreshToken: "refresh",
      expiresIn: 3600,
      scope: "scope",
      email: "user@example.com",
      projectId: "project-id",
    });
  });
});
