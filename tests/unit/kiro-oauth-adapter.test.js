import { afterEach, describe, expect, it, vi } from "vitest";

import kiro from "../../src/lib/oauth/providers/kiro.js";
import {
  getProvider,
  pollForToken,
  requestDeviceCode,
} from "../../src/lib/oauth/providers.js";

const originalFetch = globalThis.fetch;

function jsonResponse(data, ok = true) {
  return {
    ok,
    json: async () => data,
    text: async () => JSON.stringify(data),
  };
}

function jwt(payload) {
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `header.${encoded}.signature`;
}

afterEach(() => {
  globalThis.fetch = originalFetch;
  vi.restoreAllMocks();
});

describe("Kiro OAuth adapter", () => {
  it("is registered through the monolithic facade", () => {
    expect(getProvider("kiro")).toBe(kiro);
    expect(kiro.flowType).toBe("device_code");
  });

  it("rejects invalid regions before making a request", async () => {
    const fetchMock = vi.fn();
    globalThis.fetch = fetchMock;

    await expect(requestDeviceCode("kiro", undefined, { region: "evil.example" }))
      .rejects.toThrow("Invalid region");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("propagates region, start URL, and auth method through device registration", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse({ clientId: "client-id", clientSecret: "client-secret" }))
      .mockResolvedValueOnce(jsonResponse({
        deviceCode: "device-code",
        userCode: "user-code",
        verificationUri: "https://verify.example",
        verificationUriComplete: "https://verify.example?code=user-code",
        expiresIn: 600,
        interval: 7,
      }));
    globalThis.fetch = fetchMock;

    const result = await requestDeviceCode("kiro", undefined, {
      region: " eu-west-1 ",
      startUrl: " https://example.awsapps.com/start ",
      authMethod: "idc",
    });

    expect(fetchMock.mock.calls[0][0]).toBe("https://oidc.eu-west-1.amazonaws.com/client/register");
    expect(fetchMock.mock.calls[1][0]).toBe("https://oidc.eu-west-1.amazonaws.com/device_authorization");
    expect(JSON.parse(fetchMock.mock.calls[1][1].body)).toEqual({
      clientId: "client-id",
      clientSecret: "client-secret",
      startUrl: "https://example.awsapps.com/start",
    });
    expect(result).toMatchObject({
      device_code: "device-code",
      interval: 7,
      _clientId: "client-id",
      _clientSecret: "client-secret",
      _region: "eu-west-1",
      _authMethod: "idc",
      _startUrl: "https://example.awsapps.com/start",
    });
  });

  it.each([
    ["authorization_pending", "waiting"],
    ["slow_down", "too fast"],
    ["access_denied", "denied"],
  ])("preserves %s polling contract", async (error, description) => {
    globalThis.fetch = vi.fn().mockResolvedValue(jsonResponse({ error, error_description: description }));

    const result = await pollForToken("kiro", "device-code", undefined, {
      _region: "us-east-1",
      _clientId: "client-id",
      _clientSecret: "client-secret",
    });

    expect(result).toEqual({
      success: false,
      error,
      errorDescription: description,
    });
  });

  it("maps tokens and resolves a missing profile ARN through the facade fallback", async () => {
    const accessToken = jwt({ email: "user@example.com" });
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse({
        accessToken,
        refreshToken: "refresh-token",
        expiresIn: 3600,
      }))
      .mockResolvedValueOnce(jsonResponse({ profiles: [{ arn: " arn:aws:codewhisperer:profile/example " }] }));
    globalThis.fetch = fetchMock;

    const result = await pollForToken("kiro", "device-code", undefined, {
      _region: "us-west-2",
      _clientId: "client-id",
      _clientSecret: "client-secret",
      _authMethod: "idc",
      _startUrl: "https://example.awsapps.com/start",
    });

    expect(result).toEqual({
      success: true,
      tokens: {
        accessToken,
        refreshToken: "refresh-token",
        expiresIn: 3600,
        email: "user@example.com",
        providerSpecificData: {
          profileArn: "arn:aws:codewhisperer:profile/example",
          clientId: "client-id",
          clientSecret: "client-secret",
          region: "us-west-2",
          authMethod: "idc",
          startUrl: "https://example.awsapps.com/start",
        },
      },
    });
    expect(fetchMock.mock.calls[0][0]).toBe("https://oidc.us-west-2.amazonaws.com/token");
    expect(fetchMock.mock.calls[1][0]).toBe("https://codewhisperer.us-east-1.amazonaws.com/ListAvailableProfiles");
  });
});
