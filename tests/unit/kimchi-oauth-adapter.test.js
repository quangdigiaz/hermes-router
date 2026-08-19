import { afterEach, describe, expect, it, vi } from "vitest";

import kimchi from "../../src/lib/oauth/providers/kimchi.js";
import { KIMCHI_CONFIG } from "../../src/lib/oauth/constants/oauth.js";
import { getProvider } from "../../src/lib/oauth/providers.js";

const originalFetch = globalThis.fetch;

function response(data, ok = true, status = ok ? 200 : 500) {
  return {
    ok,
    status,
    json: async () => data,
  };
}

afterEach(() => {
  globalThis.fetch = originalFetch;
  vi.restoreAllMocks();
});

describe("Kimchi OAuth adapter", () => {
  it("is registered through the monolithic facade", () => {
    expect(getProvider("kimchi")).toBe(kimchi);
    expect(kimchi.config).toBe(KIMCHI_CONFIG);
    expect(kimchi.flowType).toBe("browser_token");
  });

  it("builds the cli-auth URL with callback and state", () => {
    const url = new URL(kimchi.buildAuthUrl({ webAppUrl: "https://kimchi.example///" }, "https://app.example/callback", "state value"));
    expect(url.origin + url.pathname).toBe("https://kimchi.example/cli-auth");
    expect(Object.fromEntries(url.searchParams)).toEqual({
      callback: "https://app.example/callback",
      state: "state value",
    });
  });

  it("rejects an empty token without fetching", async () => {
    const fetchMock = vi.fn();
    globalThis.fetch = fetchMock;

    await expect(kimchi.exchangeToken({}, "  ")).rejects.toThrow("Missing Kimchi token");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects missing validation configuration explicitly", async () => {
    const fetchMock = vi.fn();
    globalThis.fetch = fetchMock;

    await expect(kimchi.exchangeToken({}, "token"))
      .rejects.toThrow("Kimchi validation URL is not configured");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("validates the token and returns the exchange contract", async () => {
    const fetchMock = vi.fn().mockResolvedValue(response({ providers: [] }));
    globalThis.fetch = fetchMock;

    await expect(kimchi.exchangeToken({ validationUrl: "https://validate.example" }, " token "))
      .resolves.toEqual({
        access_token: "token",
        token_type: "Bearer",
        _kimchiUser: {},
      });
    expect(fetchMock).toHaveBeenCalledWith("https://validate.example", {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: "Bearer token",
      },
    });
  });

  it("looks up user info and preserves the response in the exchange contract", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(response({ providers: [] }))
      .mockResolvedValueOnce(response({ id: 7, email: "user@example.com" }));
    globalThis.fetch = fetchMock;

    await expect(kimchi.exchangeToken({ validationUrl: "https://validate.example", userInfoUrl: "https://user.example" }, "token"))
      .resolves.toMatchObject({ _kimchiUser: { id: 7, email: "user@example.com" } });
    expect(fetchMock).toHaveBeenNthCalledWith(2, "https://user.example", {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: "Bearer token",
      },
    });
  });

  it("rejects failed token validation", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(response({}, false, 401));

    await expect(kimchi.exchangeToken({ validationUrl: "https://validate.example" }, "token"))
      .rejects.toThrow("Kimchi token validation failed: 401");
  });

  it("keeps user-info failure nonfatal", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(response({ providers: [] }))
      .mockRejectedValueOnce(new Error("profile unavailable"));
    globalThis.fetch = fetchMock;

    await expect(kimchi.exchangeToken({ validationUrl: "https://validate.example", userInfoUrl: "https://user.example" }, "token"))
      .resolves.toMatchObject({ access_token: "token", token_type: "Bearer", _kimchiUser: {} });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("maps user fields and never maps a refresh token", () => {
    expect(kimchi.mapTokens({
      access_token: "access",
      _kimchiUser: { id: 42, username: "kimchi-user", name: "Kimchi User" },
    })).toEqual({
      accessToken: "access",
      refreshToken: null,
      email: "kimchi-user-42",
      displayName: "Kimchi User",
      providerSpecificData: {
        authMethod: "browser_token",
        userId: "42",
        username: "kimchi-user",
      },
    });
  });
});
