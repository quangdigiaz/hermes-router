import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { handleTtsCore } from "../../open-sse/handlers/ttsCore.js";
import { buildTtsProviderModels, getTtsVoicesForModel } from "../../open-sse/config/ttsModels.js";
import { AI_PROVIDERS } from "../../src/shared/constants/providers.js";
import { getTtsAdapter } from "../../open-sse/handlers/ttsProviders/index.js";
import { PROVIDER_MODELS } from "../../open-sse/config/providerModels.js";
import { TTS_PROVIDER_CONFIG } from "../../src/shared/constants/ttsProviders.js";

const originalFetch = global.fetch;

describe("Xiaomi MiMo TTS", () => {
  beforeEach(() => { global.fetch = vi.fn(); });
  afterEach(() => { global.fetch = originalFetch; });

  it("sends voice, text, style, and language", async () => {
    global.fetch.mockResolvedValueOnce(new Response(JSON.stringify({ choices: [{ message: { audio: { data: "AAECAw==", format: "wav" } } }] }), { status: 200 }));
    const result = await handleTtsCore({ provider: "xiaomi-mimo", model: "mimo-v2.5-tts/冰糖", input: "Hello", style: "calm", language: "English", credentials: { apiKey: "test-key" }, responseFormat: "json" });
    expect(result.success).toBe(true);
    expect(global.fetch.mock.calls[0][0]).toBe("https://api.xiaomimimo.com/v1/chat/completions");
    const sent = JSON.parse(global.fetch.mock.calls[0][1].body);
    expect(sent.audio).toMatchObject({ format: "wav", voice: "冰糖" });
    expect(sent.messages).toEqual([{ role: "user", content: "Speak in English. calm" }, { role: "assistant", content: "Hello" }]);
    expect(await result.response.json()).toMatchObject({ audio: "AAECAw==", format: "wav" });
  });

  it("caps non-2xx errors without exposing the upstream body", async () => {
    global.fetch.mockResolvedValueOnce(new Response("secret upstream payload".repeat(100), { status: 500 }));
    const result = await handleTtsCore({ provider: "xiaomi-mimo", model: "mimo-v2.5-tts", input: "Hello", credentials: { apiKey: "test-key" } });
    expect(result.success).toBe(false);
    expect(result.error).toBe("MiMo TTS request failed (500)");
    expect(result.error.length).toBeLessThan(500);
  });

  it("registers catalog, provider, and UI config", () => {
    expect(buildTtsProviderModels()["xiaomi-mimo-tts-models"]).toEqual([{ id: "mimo-v2.5-tts", name: "MiMo V2.5 TTS", type: "tts" }]);
    expect(getTtsVoicesForModel("xiaomi-mimo", "mimo-v2.5-tts")).toHaveLength(9);
    expect(AI_PROVIDERS["xiaomi-mimo"].serviceKinds).toContain("tts");
    expect(PROVIDER_MODELS["xiaomi-mimo"].some((m) => m.id === "mimo-v2.5-tts" && m.kind === "tts")).toBe(true);
    expect(getTtsAdapter("xiaomi-mimo")).toBeTruthy();
    expect(TTS_PROVIDER_CONFIG["xiaomi-mimo"]).toMatchObject({ hasStyleInput: true, hasLanguageHint: true });
  });
});
