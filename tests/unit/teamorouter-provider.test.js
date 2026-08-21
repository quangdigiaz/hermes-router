import { describe, it, expect } from "vitest";
import { PROVIDERS } from "../../open-sse/providers/index.js";
import teamorouterRegistry from "../../open-sse/providers/registry/teamorouter.js";
import { getCurationData } from "../../open-sse/providers/curation.js";

describe("TeamoRouter Provider Integration", () => {
  it("registers teamorouter provider with correct baseUrl and endpoints", () => {
    expect(PROVIDERS.teamorouter).toBeDefined();
    expect(PROVIDERS.teamorouter.baseUrl).toBe("https://api.teamorouter.com/v1/chat/completions");
    expect(teamorouterRegistry.hasFree).toBe(true);
    expect(teamorouterRegistry.modelsFetcher.url).toBe("https://api.teamorouter.com/v1/models");
  });

  it("marks teamorouter with cheap and free badges in curation", () => {
    const curation = getCurationData("teamorouter");
    expect(curation.badges).toContain("cheap");
    expect(curation.badges).toContain("free");
  });

  it("includes gpt-5.6-luna and claude-fable-5 in models list", () => {
    const modelIds = teamorouterRegistry.models.map((m) => m.id);
    expect(modelIds).toContain("gpt-5.6-luna");
    expect(modelIds).toContain("claude-fable-5");
  });
});