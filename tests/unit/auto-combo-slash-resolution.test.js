import { describe, it, expect, vi } from "vitest";
import { getComboModels, getModelInfo } from "@/sse/services/model.js";

describe("Auto Combo & Slash Resolution", () => {
  it("resolves auto/best-free combo models", async () => {
    const models = await getComboModels("auto/best-free");
    expect(models).toBeDefined();
    expect(Array.isArray(models)).toBe(true);
    expect(models.length).toBeGreaterThan(0);
  });

  it("resolves combo/auto/best-free combo models with prefix", async () => {
    const models = await getComboModels("combo/auto/best-free");
    expect(models).toBeDefined();
    expect(Array.isArray(models)).toBe(true);
    expect(models.length).toBeGreaterThan(0);
  });

  it("resolves agent/workhorse static template models", async () => {
    const models = await getComboModels("agent/workhorse");
    expect(models).toBeDefined();
    expect(Array.isArray(models)).toBe(true);
    expect(models).toContain("siliconflow/deepseek-v4-flash");
  });

  it("identifies combo/auto/best-free in getModelInfo as a combo (provider=null)", async () => {
    const info = await getModelInfo("auto/best-free");
    expect(info).toBeDefined();
    expect(info.provider).toBeNull();
    expect(info.model).toBe("auto/best-free");
  });

  it("identifies combo/auto/best-free with combo prefix in getModelInfo as a combo", async () => {
    const info = await getModelInfo("combo/auto/best-free");
    expect(info).toBeDefined();
    expect(info.provider).toBeNull();
    expect(info.model).toBe("auto/best-free");
  });

  it("still parses regular provider/model correctly", async () => {
    const info = await getModelInfo("openai/gpt-4o");
    expect(info).toBeDefined();
    expect(info.provider).toBe("openai");
    expect(info.model).toBe("gpt-4o");
  });
});
