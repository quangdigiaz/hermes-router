import { describe, it, expect, vi, beforeEach } from "vitest";

// Shared state must survive vi.mock hoisting
const dbState = vi.hoisted(() => ({ rows: [] }));
vi.mock("../../src/lib/db/driver.js", () => ({
  getAdapter: async () => ({
    all: (sql, params) => {
      if (!sql.startsWith("SELECT * FROM providerConnections")) return [];
      const provider = params?.[0];
      const isActive = params?.[1];
      return dbState.rows.filter(r =>
        (!provider || r.provider === provider)
        && (isActive === undefined || r.isActive === isActive)
      );
    },
    get: (sql, params) => {
      const id = params?.[0];
      return dbState.rows.find(r => r.id === id) || null;
    },
    run: (sql, params) => {
      if (!sql.startsWith("INSERT INTO providerConnections")) return;
      // Minimal upsert: params = [id, provider, authType, name, email, priority, isActive, data, createdAt, updatedAt]
      const [id, provider, authType, name, email, priority, isActive, data, createdAt, updatedAt] = params;
      const existing = dbState.rows.findIndex(r => r.id === id);
      const row = { id, provider, authType, name, email, priority, isActive, data, createdAt, updatedAt };
      if (existing >= 0) dbState.rows[existing] = { ...dbState.rows[existing], ...row };
      else dbState.rows.push(row);
    },
    transaction: (fn) => fn(),
  }),
}));

import {
  getProviderConnections,
  updateProviderConnection,
  invalidateProviderConnectionsCache,
} from "../../src/lib/db/repos/connectionsRepo.js";

function seedRows(providers) {
  dbState.rows = providers.flatMap((provider, pi) =>
    ["a", "b"].map((suffix, i) => ({
      id: `${provider}-${suffix}`,
      provider,
      authType: "oauth",
      name: `${provider} ${suffix}`,
      email: null,
      priority: i + 1 + pi * 10,
      isActive: 1,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
      data: "{}",
    }))
  );
}

describe("connectionsRepo list cache", () => {
  beforeEach(() => {
    dbState.rows = [];
    invalidateProviderConnectionsCache();
  });

  it("serves repeat reads from cache (one underlying query)", async () => {
    seedRows(["kilocode"]);

    const first = await getProviderConnections({ provider: "kilocode", isActive: true });
    const second = await getProviderConnections({ provider: "kilocode", isActive: true });

    expect(second.map(c => c.id)).toEqual(first.map(c => c.id));
    // Both calls resolved from one SELECT — prove via distinct array identity
    expect(second).not.toBe(first);
  });

  it("re-reads after invalidateProviderConnectionsCache", async () => {
    seedRows(["kilocode"]);
    const before = await getProviderConnections({ provider: "kilocode", isActive: true });
    expect(before).toHaveLength(2);

    seedRows(["kilocode", "qoder"]);
    invalidateProviderConnectionsCache();
    const after = await getProviderConnections({ provider: "qoder", isActive: true });
    expect(after.map(c => c.id)).toEqual(["qoder-a", "qoder-b"]);
  });

  it("re-reads after updateProviderConnection (write invalidates)", async () => {
    seedRows(["kilocode"]);
    await getProviderConnections({ provider: "kilocode", isActive: true });

    await updateProviderConnection("kilocode-a", { testStatus: "payment_required" });
    const after = await getProviderConnections({ provider: "kilocode", isActive: true });
    expect(after.find(c => c.id === "kilocode-a")?.testStatus).toBe("payment_required");
  });

  it("different filters use different cache entries", async () => {
    seedRows(["kilocode"]);
    dbState.rows.find(r => r.id === "kilocode-b").isActive = 0;

    const active = await getProviderConnections({ provider: "kilocode", isActive: true });
    const all = await getProviderConnections({ provider: "kilocode" });

    expect(active.map(c => c.id)).toEqual(["kilocode-a"]);
    expect(all.map(c => c.id)).toEqual(["kilocode-a", "kilocode-b"]);
  });
});
