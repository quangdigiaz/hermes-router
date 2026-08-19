import { describe, expect, it, vi, beforeEach } from "vitest";

import { fetchModelsFetcherIds } from "../../src/sse/services/allowedModels.js";

describe("models.dev provider dictionary parsing", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("reads models from a provider-keyed dictionary", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({
      ok: true,
      json: async () => ({
        anthropic: {
          models: {
            "claude-sonnet": { id: "claude-sonnet" },
            "claude-haiku": { name: "claude-haiku" },
          },
        },
      }),
    })));

    const ids = await fetchModelsFetcherIds("anthropic", {
      id: "anthropic",
      alias: "anthropic",
      modelsFetcher: { url: "https://models.dev/api.json", type: "models-dev" },
    });

    expect(ids).toEqual(["claude-sonnet", "claude-haiku"]);
  });

  it("uses the alias-keyed dictionary when the provider id is absent", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({
      ok: true,
      json: async () => ({
        claude: { models: { "claude-sonnet": { id: "claude-sonnet" } } },
      }),
    })));

    const ids = await fetchModelsFetcherIds("anthropic-alias-fallback", {
      id: "anthropic-missing",
      alias: "claude",
      modelsFetcher: { url: "https://models.dev/api.json", type: "models-dev" },
    });

    expect(ids).toEqual(["claude-sonnet"]);
  });
});
