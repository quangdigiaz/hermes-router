import { describe, it, expect, vi } from "vitest";
import {
  listProxyStatic,
  buyProxyStatic,
  renewProxyStatic,
  changeProxyStaticAuth,
  changeProxyStaticIp,
} from "../../src/lib/ckey/client.js";

describe("CKEY Static Proxy Client & Methods", () => {
  it("exports all static proxy functions", () => {
    expect(typeof listProxyStatic).toBe("function");
    expect(typeof buyProxyStatic).toBe("function");
    expect(typeof renewProxyStatic).toBe("function");
    expect(typeof changeProxyStaticAuth).toBe("function");
    expect(typeof changeProxyStaticIp).toBe("function");
  });

  it("throws error if ckeyKey is missing", async () => {
    await expect(listProxyStatic("")).rejects.toThrow("CKEY_API_KEY required");
    await expect(buyProxyStatic("")).rejects.toThrow("CKEY_API_KEY required");
    await expect(renewProxyStatic("")).rejects.toThrow("CKEY_API_KEY required");
    await expect(changeProxyStaticAuth("")).rejects.toThrow("CKEY_API_KEY required");
    await expect(changeProxyStaticIp("")).rejects.toThrow("CKEY_API_KEY required");
  });
});
