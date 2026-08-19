import { describe, it, expect, beforeEach, vi } from "vitest";

const fitnessRows = new Map();
vi.mock("@/models", () => ({
  getProxyPoolById: vi.fn(async () => null),
  listProxyPoolFitness: vi.fn(async (poolId) => [...fitnessRows.values()].filter((row) => poolId == null || row.poolId === poolId)),
  upsertProxyPoolFitness: vi.fn(async (poolId, scope, until, reason) => {
    const row = { poolId, scope, until, reason };
    fitnessRows.set(`${poolId}:${scope}`, row);
    return row;
  }),
  deleteProxyPoolFitness: vi.fn(async (poolId, scope) => fitnessRows.delete(`${poolId}:${scope}`)),
  clearProxyPoolFitness: vi.fn(async (provider) => {
    for (const key of [...fitnessRows.keys()]) {
      if (!provider || key.includes(`${provider}::`)) fitnessRows.delete(key);
    }
  }),
}));

import { markPoolUnfit, clearPoolUnfit, clearAllPoolUnfit, isPoolFit, fitPoolIds, poolFitnessSnapshot, pruneExpired, resetPoolFitness } from "open-sse/services/proxyPoolFitness.js";
import { pickProxyPoolId } from "../../src/lib/network/connectionProxy.js";

describe("proxy pool fitness registry", () => {
  beforeEach(async () => { fitnessRows.clear(); await resetPoolFitness(); });
  it("marks scoped pools and prunes expiry", async () => {
    await markPoolUnfit("p1", "freebuff::m1", Date.now() + 60_000);
    expect(isPoolFit("p1", "freebuff::m1")).toBe(false);
    expect(fitPoolIds(["p1", "p2"], "freebuff::m1")).toEqual(["p2"]);
    await markPoolUnfit("p1", "freebuff::m1", Date.now() - 1);
    expect(isPoolFit("p1", "freebuff::m1")).toBe(true);
  });
  it("supports wildcard and clearing", async () => {
    await markPoolUnfit("p1", "opencode::*", Date.now() + 60_000);
    expect(isPoolFit("p1", "opencode::m")).toBe(false);
    await clearPoolUnfit("p1", "opencode::*");
    expect(isPoolFit("p1", "opencode::m")).toBe(true);
    await markPoolUnfit("p1", "a::m", Date.now() + 60_000);
    await markPoolUnfit("p1", "b::m", Date.now() + 60_000);
    await clearAllPoolUnfit("a");
    expect((await poolFitnessSnapshot()).p1["b::m"]).toBeDefined();
  });
  it("prunes expired entries", async () => {
    await markPoolUnfit("p1", "x::m", Date.now() - 1);
    expect(await pruneExpired()).toBe(1);
    expect(await poolFitnessSnapshot()).toEqual({});
  });
  it("preserves concurrent scopes and reloads from durable rows", async () => {
    await Promise.all([
      markPoolUnfit("p1", "provider::a", Date.now() + 60_000, "a"),
      markPoolUnfit("p1", "provider::b", Date.now() + 60_000, "b"),
    ]);
    expect((await poolFitnessSnapshot()).p1).toEqual(expect.objectContaining({
      "provider::a": expect.objectContaining({ reason: "a" }),
      "provider::b": expect.objectContaining({ reason: "b" }),
    }));
    await resetPoolFitness();
    expect(await poolFitnessSnapshot()).toEqual({});
  });
  it("Smart returns no pool when every scoped pool is unfit", async () => {
    await markPoolUnfit("p1", "provider::model", Date.now() + 60_000);
    await markPoolUnfit("p2", "provider::model", Date.now() + 60_000);
    expect(pickProxyPoolId(["p1", "p2"], "smart", "provider", [], { scope: "provider::model" })).toBeNull();
  });
});
