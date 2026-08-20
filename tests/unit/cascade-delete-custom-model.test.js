import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

let tempDir;
const originalDataDir = process.env.DATA_DIR;

beforeEach(() => {
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "hermes-cascade-test-"));
  process.env.DATA_DIR = tempDir;
  delete global._dbAdapter;
  vi.resetModules();
});

afterEach(() => {
  try { global._dbAdapter?.instance?.close?.(); } catch {}
  delete global._dbAdapter;
  if (tempDir) fs.rmSync(tempDir, { recursive: true, force: true });
  if (originalDataDir === undefined) delete process.env.DATA_DIR;
  else process.env.DATA_DIR = originalDataDir;
});

describe("Cascade delete custom models from combos", () => {
  it("removes deleted model from all combos containing it", async () => {
    const { createCombo, getComboById, removeModelFromAllCombos } = await import("../../src/lib/db/repos/combosRepo.js");

    const combo1 = await createCombo({
      name: "dev-combo",
      models: ["gemini/gemini-3.1-pro-preview", "openai/gpt-4o", "anthropic/claude-3-5-sonnet"],
    });

    const combo2 = await createCombo({
      name: "single-gemini-combo",
      models: ["gemini/gemini-3.1-pro-preview"],
    });

    const combo3 = await createCombo({
      name: "unrelated-combo",
      models: ["openai/gpt-4o", "deepseek/deepseek-v4-pro"],
    });

    const result = await removeModelFromAllCombos({
      providerAlias: "gemini",
      modelId: "gemini-3.1-pro-preview",
    });

    expect(result.affectedCount).toBe(2);
    expect(result.affectedCombos.map((c) => c.name).sort()).toEqual(["dev-combo", "single-gemini-combo"].sort());

    const updatedCombo1 = await getComboById(combo1.id);
    expect(updatedCombo1.models).toEqual(["openai/gpt-4o", "anthropic/claude-3-5-sonnet"]);

    const updatedCombo2 = await getComboById(combo2.id);
    expect(updatedCombo2.models).toEqual([]);

    const updatedCombo3 = await getComboById(combo3.id);
    expect(updatedCombo3.models).toEqual(["openai/gpt-4o", "deepseek/deepseek-v4-pro"]);
  });

  it("handles providerId and providerAlias matches", async () => {
    const { createCombo, getComboById, removeModelFromAllCombos } = await import("../../src/lib/db/repos/combosRepo.js");

    const combo = await createCombo({
      name: "multi-format-combo",
      models: ["google-gemini/gemini-3.1-pro-preview", "openai/gpt-4o"],
    });

    const result = await removeModelFromAllCombos({
      providerAlias: "gemini",
      providerId: "google-gemini",
      modelId: "gemini-3.1-pro-preview",
    });

    expect(result.affectedCount).toBe(1);
    const updated = await getComboById(combo.id);
    expect(updated.models).toEqual(["openai/gpt-4o"]);
  });

  it("returns 0 affected when model is not in any combo", async () => {
    const { createCombo, removeModelFromAllCombos } = await import("../../src/lib/db/repos/combosRepo.js");

    await createCombo({
      name: "clean-combo",
      models: ["openai/gpt-4o"],
    });

    const result = await removeModelFromAllCombos({
      providerAlias: "gemini",
      modelId: "non-existent-model",
    });

    expect(result.affectedCount).toBe(0);
    expect(result.affectedCombos).toEqual([]);
  });
});
