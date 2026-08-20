import { describe, expect, it, vi } from "vitest";
import fs from "fs";
import path from "path";
import { getProvider } from "../../src/lib/oauth/providers.js";
import { CODEBUDDY_INTL_CONFIG, PROVIDERS as OAUTH_PROVIDERS } from "../../src/lib/oauth/constants/oauth.js";
import { getAccessToken, refreshCodebuddyIntlToken } from "../../open-sse/services/tokenRefresh.js";

describe("CodeBuddy International OAuth Integration", () => {
  it("exports CODEBUDDY_INTL_CONFIG with correct international endpoints", () => {
    expect(CODEBUDDY_INTL_CONFIG).toBeDefined();
    expect(CODEBUDDY_INTL_CONFIG.stateUrl).toBe("https://www.codebuddy.ai/v2/plugin/auth/state");
    expect(CODEBUDDY_INTL_CONFIG.tokenUrl).toBe("https://www.codebuddy.ai/v2/plugin/auth/token");
    expect(CODEBUDDY_INTL_CONFIG.refreshUrl).toBe("https://www.codebuddy.ai/v2/plugin/auth/token/refresh");
    expect(CODEBUDDY_INTL_CONFIG.platform).toBe("ide");
    expect(OAUTH_PROVIDERS.CODEBUDDY_INTL).toBe("codebuddy-intl");
  });

  it("registers codebuddy-intl in OAuth provider registry with device_code flow", () => {
    const provider = getProvider("codebuddy-intl");
    expect(provider).toBeDefined();
    expect(provider.flowType).toBe("device_code");
    expect(typeof provider.requestDeviceCode).toBe("function");
    expect(typeof provider.pollToken).toBe("function");
    expect(typeof provider.mapTokens).toBe("function");
  });

  it("mapTokens formats tokens correctly", () => {
    const provider = getProvider("codebuddy-intl");
    const mapped = provider.mapTokens({
      access_token: "test-access-token",
      refresh_token: "test-refresh-token",
      expires_in: 3600,
    });
    expect(mapped.accessToken).toBe("test-access-token");
    expect(mapped.refreshToken).toBe("test-refresh-token");
    expect(mapped.expiresIn).toBe(3600);
  });

  it("wires codebuddy-intl into OAuthModal deviceCodeProviders list", () => {
    const modalPath = path.resolve(__dirname, "../../src/shared/components/OAuthModal.js");
    const modalSrc = fs.readFileSync(modalPath, "utf8");
    expect(modalSrc).toContain('"codebuddy-intl"');
    // Ensure it is inside deviceCodeProviders
    const slice = modalSrc.slice(modalSrc.indexOf("const deviceCodeProviders = ["));
    const endSlice = slice.slice(0, slice.indexOf("];"));
    expect(endSlice).toContain('"codebuddy-intl"');
  });

  it("wires codebuddy-intl into OAuth API route lists", () => {
    const routePath = path.resolve(__dirname, "../../src/app/api/oauth/[provider]/[action]/route.js");
    const routeSrc = fs.readFileSync(routePath, "utf8");
    
    const getSlice = routeSrc.slice(routeSrc.indexOf("const noPkceDeviceProviders = ["));
    const getEndSlice = getSlice.slice(0, getSlice.indexOf("];"));
    expect(getEndSlice).toContain('"codebuddy-intl"');

    const postSlice = routeSrc.slice(routeSrc.indexOf("const noPkceProviders = ["));
    const postEndSlice = postSlice.slice(0, postSlice.indexOf("];"));
    expect(postEndSlice).toContain('"codebuddy-intl"');
  });

  it("registers codebuddy-intl in Token Refresh REFRESH_HANDLERS", async () => {
    expect(typeof refreshCodebuddyIntlToken).toBe("function");
    
    // Test that getAccessToken routes through handler without throw
    const res = await getAccessToken("codebuddy-intl", { refreshToken: null });
    expect(res).toBeNull();
  });
});
