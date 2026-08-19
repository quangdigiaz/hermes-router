import { describe, it, expect } from "vitest";
import { applyLoopGuard } from "../../open-sse/handlers/chatCore.js";
import { FORMATS } from "../../open-sse/translator/formats.js";

// applyLoopGuard is the chatCore wiring of detectLoop: when a repeated tool_call
// pattern is found in the translated body, it injects the termination prompt AND
// appends a "[ROUTER NOTE: ...]" hint to the last user/tool message.
describe("applyLoopGuard wiring", () => {
  function makeLoopingBody() {
    const call = { function: { name: "bash", arguments: '{"cmd":"ls"}' } };
    return {
      messages: [
        { role: "user", content: "list" },
        { role: "assistant", content: "", tool_calls: [call] },
        { role: "tool", content: "file1" },
        { role: "assistant", content: "", tool_calls: [call] },
        { role: "tool", content: "file1" },
        { role: "assistant", content: "", tool_calls: [call] },
        { role: "tool", content: "file1" },
      ],
    };
  }

  it("detects a single-tool repeat loop and returns true", () => {
    const body = makeLoopingBody();
    const detected = applyLoopGuard(body, FORMATS.OPENAI, "kimchi", "kimi-k2.6", undefined);
    expect(detected).toBe(true);
  });

  it("appends ROUTER NOTE hint to the last user/tool message", () => {
    const body = makeLoopingBody();
    applyLoopGuard(body, FORMATS.OPENAI, "kimchi", "kimi-k2.6", undefined);
    const last = body.messages[body.messages.length - 1];
    expect(last.role).toBe("tool");
    expect(last.content).toContain("[ROUTER NOTE:");
    expect(last.content).toContain("STOP repeating");
  });

  it("injects the termination prompt into the system message", () => {
    const body = makeLoopingBody();
    applyLoopGuard(body, FORMATS.OPENAI, "kimchi", "kimi-k2.6", undefined);
    const sys = body.messages.find(m => m.role === "system");
    expect(sys).toBeTruthy();
    expect(sys.content).toContain("STOP calling tools");
  });

  it("is idempotent — re-running does not double-append the hint", () => {
    const body = makeLoopingBody();
    applyLoopGuard(body, FORMATS.OPENAI, "kimchi", "kimi-k2.6", undefined);
    const afterFirst = body.messages[body.messages.length - 1].content;
    applyLoopGuard(body, FORMATS.OPENAI, "kimchi", "kimi-k2.6", undefined);
    const afterSecond = body.messages[body.messages.length - 1].content;
    expect(afterSecond).toBe(afterFirst);
  });

  it("does NOT fire on a clean (non-looping) conversation", () => {
    const body = {
      messages: [
        { role: "user", content: "hi" },
        { role: "assistant", content: "hello" },
      ],
    };
    const detected = applyLoopGuard(body, FORMATS.OPENAI, "kimchi", "kimi-k2.6", undefined);
    expect(detected).toBe(false);
    expect(JSON.stringify(body.messages)).not.toContain("[ROUTER NOTE:");
  });

  it("FIRES on text-only planning loop (symptom 1) — detectTextRepeat now catches it", () => {
    // Symptom 1: model repeats "I need to read the key files..." 3× with no tool
    // calls. detectTextRepeat (sentence-level) now catches this — previously a
    // known limitation that is now fixed.
    const body = {
      messages: [
        { role: "user", content: "go" },
        { role: "assistant", content: "I need to read the key files..." },
        { role: "assistant", content: "I need to read the key files..." },
        { role: "assistant", content: "I need to read the key files..." },
      ],
    };
    const detected = applyLoopGuard(body, FORMATS.OPENAI, "kimchi", "kimi-k2.6", undefined);
    expect(detected).toBe(true);
    const last = body.messages[body.messages.length - 1];
    expect(last.content).toContain("[ROUTER NOTE:");
  });

  it("FIRES on exact assistant message repeat (opencode symptom: 'Subagent gagal' 6×)", () => {
    const repeated = "Subagent gagal. Saya cek langsung.";
    const body = {
      messages: [
        { role: "user", content: "cek ros2 project" },
        { role: "assistant", content: repeated },
        { role: "assistant", content: repeated },
        { role: "assistant", content: repeated },
      ],
    };
    const detected = applyLoopGuard(body, FORMATS.OPENAI, "kimchi", "kimi-k2.6", undefined);
    expect(detected).toBe(true);
    expect(body.messages[body.messages.length - 1].content).toContain("[ROUTER NOTE:");
  });

  it("does NOT fire on varied assistant messages (no false positives)", () => {
    const body = {
      messages: [
        { role: "user", content: "explore" },
        { role: "assistant", content: "I will check the package.xml file first." },
        { role: "assistant", content: "The package is a ROS2 navigation stack." },
        { role: "assistant", content: "It uses nav2 and tf2 libraries." },
      ],
    };
    const detected = applyLoopGuard(body, FORMATS.OPENAI, "kimchi", "kimi-k2.6", undefined);
    expect(detected).toBe(false);
  });
});
