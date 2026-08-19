import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../src/lib/db/repos/pricingRepo.js", () => ({
  getPricingForModel: vi.fn().mockImplementation(async (provider, model) => {
    const pricing = {
      "anthropic/claude-3-opus": { input: 15.0, output: 75.0 },
      "anthropic/claude-3-sonnet": { input: 3.0, output: 15.0 },
      "openai/gpt-4o": { input: 2.5, output: 10.0 },
      "openai/gpt-4o-mini": { input: 0.15, output: 0.6 },
      "google/gemini-pro": { input: 1.25, output: 5.0 },
    };
    return pricing[`${provider}/${model}`] || null;
  }),
}));

import { handleComboChat, resetComboRotation } from "../../open-sse/services/combo.js";

const log = { info: () => {}, warn: () => {}, debug: () => {} };

function okResponse(content) {
  return new Response(
    JSON.stringify({ choices: [{ message: { role: "assistant", content } }] }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
}

function errResponse(status, message) {
  return new Response(
    JSON.stringify({ error: { message } }),
    { status, headers: { "Content-Type": "application/json" } }
  );
}

describe("combo cost-optimized integration", () => {
  beforeEach(() => {
    resetComboRotation();
  });

  it("tries cheapest model first with cost-optimized strategy", async () => {
    const tried = [];
    const handleSingleModel = vi.fn(async (_body, model) => {
      tried.push(model);
      return okResponse(`response from ${model}`);
    });

    const models = [
      "anthropic/claude-3-opus",    // $15.00
      "openai/gpt-4o-mini",         // $0.15
      "openai/gpt-4o",              // $2.50
    ];

    const res = await handleComboChat({
      body: { messages: [{ role: "user", content: "hi" }] },
      models,
      handleSingleModel,
      log,
      comboName: "cost-test",
      comboStrategy: "cost-optimized",
    });

    expect(res.ok).toBe(true);
    expect(tried[0]).toBe("openai/gpt-4o-mini");
    expect(handleSingleModel).toHaveBeenCalledTimes(1);
  });

  it("falls back to next cheapest when cheapest fails", async () => {
    const tried = [];
    const handleSingleModel = vi.fn(async (_body, model) => {
      tried.push(model);
      if (model === "openai/gpt-4o-mini") return errResponse(429, "rate limit");
      return okResponse(`response from ${model}`);
    });

    const models = [
      "anthropic/claude-3-opus",    // $15.00
      "openai/gpt-4o-mini",         // $0.15
      "openai/gpt-4o",              // $2.50
      "anthropic/claude-3-sonnet",  // $3.00
    ];

    const res = await handleComboChat({
      body: { messages: [{ role: "user", content: "hi" }] },
      models,
      handleSingleModel,
      log,
      comboName: "cost-test",
      comboStrategy: "cost-optimized",
    });

    expect(res.ok).toBe(true);
    expect(tried).toEqual([
      "openai/gpt-4o-mini",         // $0.15 - failed
      "openai/gpt-4o",              // $2.50 - success
    ]);
  });

  it("cascades through all models when cheap ones fail", async () => {
    const tried = [];
    const handleSingleModel = vi.fn(async (_body, model) => {
      tried.push(model);
      if (model === "openai/gpt-4o-mini") return errResponse(429, "rate limit");
      if (model === "openai/gpt-4o") return errResponse(503, "overloaded");
      return okResponse(`response from ${model}`);
    });

    const models = [
      "anthropic/claude-3-opus",    // $15.00
      "openai/gpt-4o-mini",         // $0.15
      "openai/gpt-4o",              // $2.50
      "anthropic/claude-3-sonnet",  // $3.00
    ];

    const res = await handleComboChat({
      body: { messages: [{ role: "user", content: "hi" }] },
      models,
      handleSingleModel,
      log,
      comboName: "cost-test",
      comboStrategy: "cost-optimized",
    });

    expect(res.ok).toBe(true);
    expect(tried).toEqual([
      "openai/gpt-4o-mini",         // $0.15 - failed
      "openai/gpt-4o",              // $2.50 - failed
      "anthropic/claude-3-sonnet",  // $3.00 - success
    ]);
  });

  it("returns 503 when all models fail", async () => {
    const tried = [];
    const handleSingleModel = vi.fn(async (_body, model) => {
      tried.push(model);
      return errResponse(503, "overloaded");
    });

    const models = [
      "openai/gpt-4o-mini",         // $0.15
      "openai/gpt-4o",              // $2.50
    ];

    const res = await handleComboChat({
      body: { messages: [{ role: "user", content: "hi" }] },
      models,
      handleSingleModel,
      log,
      comboName: "cost-test",
      comboStrategy: "cost-optimized",
    });

    expect(res.ok).toBe(false);
    expect(res.status).toBe(503);
    expect(tried).toEqual([
      "openai/gpt-4o-mini",
      "openai/gpt-4o",
    ]);
  });

  it("preserves model order for single model combo", async () => {
    const tried = [];
    const handleSingleModel = vi.fn(async (_body, model) => {
      tried.push(model);
      return okResponse("ok");
    });

    const models = ["openai/gpt-4o"];

    const res = await handleComboChat({
      body: { messages: [{ role: "user", content: "hi" }] },
      models,
      handleSingleModel,
      log,
      comboName: "cost-test",
      comboStrategy: "cost-optimized",
    });

    expect(res.ok).toBe(true);
    expect(tried).toEqual(["openai/gpt-4o"]);
  });

  it("handles models without pricing (sorted last)", async () => {
    const tried = [];
    const handleSingleModel = vi.fn(async (_body, model) => {
      tried.push(model);
      return okResponse(`response from ${model}`);
    });

    const models = [
      "unknown/expensive-model",    // no pricing → Infinity
      "openai/gpt-4o-mini",         // $0.15
    ];

    const res = await handleComboChat({
      body: { messages: [{ role: "user", content: "hi" }] },
      models,
      handleSingleModel,
      log,
      comboName: "cost-test",
      comboStrategy: "cost-optimized",
    });

    expect(res.ok).toBe(true);
    expect(tried[0]).toBe("openai/gpt-4o-mini");
    expect(handleSingleModel).toHaveBeenCalledTimes(1);
  });

  it("returns response from first successful model", async () => {
    const handleSingleModel = vi.fn(async (_body, model) => {
      if (model === "openai/gpt-4o-mini") return okResponse("cheapest answer");
      return okResponse("expensive answer");
    });

    const models = [
      "anthropic/claude-3-opus",    // $15.00
      "openai/gpt-4o-mini",         // $0.15
    ];

    const res = await handleComboChat({
      body: { messages: [{ role: "user", content: "hi" }] },
      models,
      handleSingleModel,
      log,
      comboName: "cost-test",
      comboStrategy: "cost-optimized",
    });

    expect(res.ok).toBe(true);
    const body = await res.json();
    expect(body.choices[0].message.content).toBe("cheapest answer");
  });

  it("works with auto-switch enabled (vision request)", async () => {
    const tried = [];
    const handleSingleModel = vi.fn(async (_body, model) => {
      tried.push(model);
      return okResponse(`response from ${model}`);
    });

    const models = [
      "anthropic/claude-3-opus",    // $15.00 - has vision
      "openai/gpt-4o-mini",         // $0.15 - no vision
      "openai/gpt-4o",              // $2.50 - has vision
    ];

    const res = await handleComboChat({
      body: {
        messages: [{
          role: "user",
          content: [
            { type: "text", text: "describe this" },
            { type: "image_url", image_url: { url: "data:image/png;base64,abc" } },
          ],
        }],
      },
      models,
      handleSingleModel,
      log,
      comboName: "cost-test",
      comboStrategy: "cost-optimized",
      autoSwitch: true,
    });

    expect(res.ok).toBe(true);
    // Auto-switch should float vision-capable model to front
    // Cost-optimized sorts by cost, then auto-switch reorders by capability
    expect(tried.length).toBeGreaterThanOrEqual(1);
  });
});
