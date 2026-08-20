import { describe, it, expect, beforeEach } from "vitest";
import {
  getState,
  recordSuccess,
  recordFailure,
  getAdaptiveCooldown,
  clearState,
  clearAllState,
} from "../../open-sse/utils/adaptiveCooldown.js";

describe("adaptiveCooldown", () => {
  beforeEach(() => {
    clearAllState();
  });

  describe("getState", () => {
    it("initializes new state with level 0", () => {
      const s = getState("conn-1");
      expect(s.level).toBe(0);
      expect(s.consecutiveFailures).toBe(0);
      expect(s.lastSuccessAt).toBeGreaterThan(0);
    });

    it("returns existing state", () => {
      const s1 = getState("conn-1");
      s1.level = 5;
      const s2 = getState("conn-1");
      expect(s2.level).toBe(5);
    });
  });

  describe("recordFailure", () => {
    it("increases level", () => {
      recordFailure("conn-1");
      const s = getState("conn-1");
      expect(s.level).toBe(1);
      expect(s.consecutiveFailures).toBe(1);
    });

    it("increases level multiple times", () => {
      recordFailure("conn-1");
      recordFailure("conn-1");
      recordFailure("conn-1");
      const s = getState("conn-1");
      expect(s.level).toBe(3);
      expect(s.consecutiveFailures).toBe(3);
    });
  });

  describe("recordSuccess", () => {
    it("resets consecutiveFailures", () => {
      recordFailure("conn-1");
      recordFailure("conn-1");
      recordSuccess("conn-1");
      const s = getState("conn-1");
      expect(s.consecutiveFailures).toBe(0);
    });

    it("reduces level by 1", () => {
      recordFailure("conn-1");
      recordFailure("conn-1");
      recordFailure("conn-1");
      const before = getState("conn-1").level;
      recordSuccess("conn-1");
      const after = getState("conn-1").level;
      expect(after).toBe(before - 1);
    });

    it("does not reduce level below 0", () => {
      recordSuccess("conn-1");
      const s = getState("conn-1");
      expect(s.level).toBe(0);
    });
  });

  describe("getAdaptiveCooldown", () => {
    it("returns base cooldown for level 0", () => {
      const cooldown = getAdaptiveCooldown("conn-1", 1000, 240000);
      // Level 0: base * 2^0 = 1000, with jitter: 1000-1300
      expect(cooldown).toBeGreaterThanOrEqual(1000);
      expect(cooldown).toBeLessThanOrEqual(1300);
    });

    it("returns higher cooldown after consecutive failures (no recent success)", () => {
      // Record failures without any success — level keeps increasing
      recordFailure("conn-1"); // level 1
      recordFailure("conn-1"); // level 2
      recordFailure("conn-1"); // level 3

      // Force lastSuccessAt to be old so decay doesn't kick in
      const s = getState("conn-1");
      s.lastSuccessAt = Date.now() - 10 * 60 * 1000; // 10 min ago

      const cooldown3 = getAdaptiveCooldown("conn-1", 1000, 240000);
      // Level 3: adjLevel=2, base * 2^2 = 4000, with jitter: 4000-5200
      expect(cooldown3).toBeGreaterThan(3500);
    });

    it("caps at max cooldown", () => {
      for (let i = 0; i < 20; i++) recordFailure("conn-1");
      // Force old success to avoid decay
      getState("conn-1").lastSuccessAt = Date.now() - 10 * 60 * 1000;
      const cooldown = getAdaptiveCooldown("conn-1", 1000, 240000);
      expect(cooldown).toBeLessThanOrEqual(240000 * 1.3); // max + jitter
    });

    it("reduces cooldown after success", () => {
      // Build up level with old success time
      recordFailure("conn-1");
      recordFailure("conn-1");
      recordFailure("conn-1");
      getState("conn-1").lastSuccessAt = Date.now() - 10 * 60 * 1000;
      const before = getAdaptiveCooldown("conn-1", 1000, 240000);

      // Record success — reduces level
      recordSuccess("conn-1");
      const after = getAdaptiveCooldown("conn-1", 1000, 240000);

      expect(after).toBeLessThan(before);
    });

    it("adds jitter (result varies between calls)", () => {
      const results = new Set();
      for (let i = 0; i < 20; i++) {
        results.add(getAdaptiveCooldown("conn-1", 1000, 240000));
      }
      // With jitter, we should see multiple different values
      expect(results.size).toBeGreaterThan(1);
    });
  });

  describe("clearState", () => {
    it("removes state for a connection", () => {
      recordFailure("conn-1");
      clearState("conn-1");
      const s = getState("conn-1");
      expect(s.level).toBe(0); // fresh state
    });
  });
});
