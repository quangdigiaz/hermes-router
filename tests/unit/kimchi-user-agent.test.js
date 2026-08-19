import { afterEach, describe, expect, it, vi } from "vitest";

import {
  DEFAULT_VERSION,
  RELEASE_URL,
  refreshKimchiUserAgent,
} from "../../open-sse/utils/kimchiUserAgent.js";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("Kimchi User-Agent", () => {
  it("keeps the deterministic fallback format documented", () => {
    expect(DEFAULT_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it("adopts a valid latest release tag", async () => {
    const fetcher = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ tag_name: "v9.8.7" }),
    });

    await expect(refreshKimchiUserAgent(fetcher, { force: true })).resolves.toBe("kimchi/9.8.7");
    expect(fetcher).toHaveBeenCalledWith(RELEASE_URL, expect.objectContaining({
      headers: { Accept: "application/vnd.github+json" },
    }));
  });

  it("ignores malformed release tags", async () => {
    const fetcher = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ tag_name: "latest" }),
    });

    await expect(refreshKimchiUserAgent(fetcher, { force: true })).resolves.toMatch(/^kimchi\/\d+\.\d+\.\d+$/);
  });

  it("keeps the last known version when release lookup fails", async () => {
    await expect(refreshKimchiUserAgent(vi.fn().mockRejectedValue(new Error("offline")), { force: true }))
      .resolves.toMatch(/^kimchi\/\d+\.\d+\.\d+$/);
  });
});
