import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

const originalDataDir = process.env.DATA_DIR;
let tempDir;
let dbApi;
let db;

beforeEach(async () => {
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "hermes-router-settings-revision-"));
  process.env.DATA_DIR = tempDir;
  delete global._dbAdapter;
  vi.resetModules();
  dbApi = await import("@/lib/db/index.js");
  await dbApi.initDb();
  db = (await import("@/lib/db/driver.js")).getAdapterSync();
});

afterEach(() => {
  try { global._dbAdapter?.instance?.close?.(); } catch {}
  delete global._dbAdapter;
  if (tempDir) fs.rmSync(tempDir, { recursive: true, force: true });
  if (originalDataDir === undefined) delete process.env.DATA_DIR;
  else process.env.DATA_DIR = originalDataDir;
});

describe("settings revision cache", () => {
  it("reloads settings when another process changes data and increments the revision", async () => {
    await dbApi.updateSettings({ cloudEnabled: false });
    expect((await dbApi.getSettings()).cloudEnabled).toBe(false);

    db.run(
      `UPDATE settings SET data = ? WHERE id = 1`,
      [JSON.stringify({ cloudEnabled: true })],
    );
    db.run(
      `UPDATE _meta SET value = CAST(value AS INTEGER) + 1 WHERE key = 'settings_revision'`,
    );

    expect((await dbApi.getSettings()).cloudEnabled).toBe(true);
  });

  it("invalidates cached settings after importDb commits", async () => {
    await dbApi.updateSettings({ cloudEnabled: false });
    await dbApi.getSettings();

    await dbApi.importDb({ settings: { cloudEnabled: true } });

    expect((await dbApi.getSettings()).cloudEnabled).toBe(true);
  });

  it("keeps the committed cache and revision after a failed settings transaction", async () => {
    await dbApi.updateSettings({ cloudEnabled: true });
    const cached = await dbApi.getSettings();
    const revisionBefore = db.get(`SELECT value FROM _meta WHERE key = 'settings_revision'`).value;
    const transaction = db.transaction;
    db.transaction = () => {
      throw new Error("simulated write failure");
    };

    try {
      await expect(dbApi.updateSettings({ cloudEnabled: false })).rejects.toThrow("simulated write failure");
      expect(await dbApi.getSettings()).toBe(cached);
      expect(db.get(`SELECT data FROM settings WHERE id = 1`).data).toBe(
        JSON.stringify({ cloudEnabled: true }),
      );
      expect(db.get(`SELECT value FROM _meta WHERE key = 'settings_revision'`).value).toBe(revisionBefore);
    } finally {
      db.transaction = transaction;
    }
  });

  it("rolls back importDb without invalidating cache or revision", async () => {
    await dbApi.updateSettings({ cloudEnabled: true });
    const cached = await dbApi.getSettings();
    const revisionBefore = db.get(`SELECT value FROM _meta WHERE key = 'settings_revision'`).value;
    const transaction = db.transaction;
    db.transaction = () => {
      throw new Error("simulated import failure");
    };

    try {
      await expect(dbApi.importDb({ settings: { cloudEnabled: false } })).rejects.toThrow("simulated import failure");
      expect(await dbApi.getSettings()).toBe(cached);
      expect(db.get(`SELECT data FROM settings WHERE id = 1`).data).toBe(
        JSON.stringify({ cloudEnabled: true }),
      );
      expect(db.get(`SELECT value FROM _meta WHERE key = 'settings_revision'`).value).toBe(revisionBefore);
    } finally {
      db.transaction = transaction;
    }
  });
});
