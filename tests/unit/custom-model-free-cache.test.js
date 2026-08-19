import { describe, it, expect, vi, beforeEach } from "vitest";

const getCustomModelsMock = vi.fn();

vi.mock("@/models", () => ({
  getCustomModels: (...args) => getCustomModelsMock(...args),
}));

import {
  isCustomModelFree,
  getFreeCustomModelsMap,
  invalidateCustomModelFreeCache,
} from "@/lib/customModelFreeCache";

beforeEach(() => {
  vi.clearAllMocks();
  invalidateCustomModelFreeCache();
});

describe("custom model free cache", () => {
  it("returns true for a custom model manually tagged free", async () => {
    getCustomModelsMock.mockResolvedValue([
      { providerAlias: "api.hcnsec.cn", id: "free-model-1", type: "llm", isFree: true },
      { providerAlias: "api.hcnsec.cn", id: "paid-model", type: "llm", isFree: false },
    ]);
    expect(await isCustomModelFree("api.hcnsec.cn", "free-model-1")).toBe(true);
  });

  it("returns false for paid or unknown models", async () => {
    getCustomModelsMock.mockResolvedValue([
      { providerAlias: "api.hcnsec.cn", id: "free-model-1", type: "llm", isFree: true },
    ]);
    expect(await isCustomModelFree("api.hcnsec.cn", "paid-model")).toBe(false);
    expect(await isCustomModelFree("other-provider", "free-model-1")).toBe(false);
    expect(await isCustomModelFree("", "x")).toBe(false);
    expect(await isCustomModelFree("p", "")).toBe(false);
  });

  it("caches and coalesces concurrent loads into one DB read", async () => {
    getCustomModelsMock.mockResolvedValue([
      { providerAlias: "p1", id: "m1", type: "llm", isFree: true },
    ]);
    const results = await Promise.all([
      isCustomModelFree("p1", "m1"),
      isCustomModelFree("p1", "m1"),
      getFreeCustomModelsMap(),
    ]);
    expect(results[0]).toBe(true);
    expect(results[1]).toBe(true);
    expect(results[2].get("p1").has("m1")).toBe(true);
    expect(getCustomModelsMock).toHaveBeenCalledTimes(1);

    // Second call within TTL hits cache — no extra DB read
    await isCustomModelFree("p1", "m1");
    expect(getCustomModelsMock).toHaveBeenCalledTimes(1);
  });

  it("reloads after invalidateCustomModelFreeCache()", async () => {
    getCustomModelsMock.mockResolvedValue([
      { providerAlias: "p1", id: "m1", type: "llm", isFree: false },
    ]);
    expect(await isCustomModelFree("p1", "m1")).toBe(false);

    // User toggles isFree on — invalidate then reload picks it up
    getCustomModelsMock.mockResolvedValue([
      { providerAlias: "p1", id: "m1", type: "llm", isFree: true },
    ]);
    invalidateCustomModelFreeCache();
    expect(await isCustomModelFree("p1", "m1")).toBe(true);
    expect(getCustomModelsMock).toHaveBeenCalledTimes(2);
  });
});
