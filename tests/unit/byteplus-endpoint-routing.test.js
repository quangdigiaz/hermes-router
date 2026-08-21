import { describe, it, expect } from "vitest";
import { PROVIDERS } from "../../open-sse/providers/index.js";
import byteplusRegistry from "../../open-sse/providers/registry/byteplus.js";

describe("BytePlus ModelArk Endpoint Configuration", () => {
  it("uses the standard /api/v3 endpoint for chat completions (not CodingPlan)", () => {
    expect(PROVIDERS.byteplus).toBeDefined();
    expect(PROVIDERS.byteplus.baseUrl).toBe("https://ark.ap-southeast.bytepluses.com/api/v3/chat/completions");
    expect(byteplusRegistry.transport.baseUrl).toBe("https://ark.ap-southeast.bytepluses.com/api/v3/chat/completions");
    expect(byteplusRegistry.transport.validateUrl).toBe("https://ark.ap-southeast.bytepluses.com/api/v3/models");
    expect(byteplusRegistry.modelsFetcher.url).toBe("https://ark.ap-southeast.bytepluses.com/api/v3/models");
    // The /api/coding/v3 endpoint requires a separate CodingPlan subscription — do NOT use it
    expect(byteplusRegistry.transport.baseUrl).not.toContain("/coding/");
  });
});
