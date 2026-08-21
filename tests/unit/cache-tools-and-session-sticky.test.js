import { describe, it, expect, beforeEach } from "vitest";
import { translateRequest } from "../../open-sse/translator/index.js";
import {
  getSessionPreferredConnection,
  recordSessionConnection,
  clearSessionConnection,
  clearSessionConnectionById,
} from "../../src/sse/services/auth.js";
import { extractSessionId } from "../../src/sse/handlers/chat.js";

describe("Lossless Cache Optimization: Tool Schema Cache Breakpoints", () => {
  it("injects cache_control to the last element of tools array in Claude format", () => {
    const inputBody = {
      model: "claude-3-7-sonnet",
      messages: [
        { role: "user", content: "List all files in current directory" }
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "list_files",
            description: "List directory contents",
            parameters: { type: "object", properties: { path: { type: "string" } } }
          }
        },
        {
          type: "function",
          function: {
            name: "read_file",
            description: "Read file contents",
            parameters: { type: "object", properties: { path: { type: "string" } } }
          }
        },
        {
          type: "function",
          function: {
            name: "execute_command",
            description: "Run shell command",
            parameters: { type: "object", properties: { cmd: { type: "string" } } }
          }
        }
      ]
    };

    const translated = translateRequest(
      "openai",
      "claude",
      "claude-3-7-sonnet-20250219",
      inputBody,
      true,
      { apiKey: "test" },
      "claude"
    );

    expect(translated.tools).toBeDefined();
    expect(translated.tools.length).toBe(3);
    // Tool 0 and Tool 1 should NOT have cache_control
    expect(translated.tools[0].cache_control).toBeUndefined();
    expect(translated.tools[1].cache_control).toBeUndefined();
    // Tool 2 (last element) MUST have cache_control ephemeral with ttl 1h
    expect(translated.tools[2].cache_control).toEqual({ type: "ephemeral", ttl: "1h" });
  });

  it("handles single tool array properly", () => {
    const inputBody = {
      model: "claude-3-7-sonnet",
      messages: [{ role: "user", content: "Hello" }],
      tools: [
        {
          type: "function",
          function: {
            name: "test_tool",
            description: "Single test tool"
          }
        }
      ]
    };

    const translated = translateRequest(
      "openai",
      "claude",
      "claude-3-7-sonnet-20250219",
      inputBody,
      true,
      { apiKey: "test" },
      "claude"
    );

    expect(translated.tools.length).toBe(1);
    expect(translated.tools[0].cache_control).toEqual({ type: "ephemeral", ttl: "1h" });
  });
});

describe("Lossless Cache Optimization: Session-Sticky Multi-Account Routing", () => {
  beforeEach(() => {
    clearSessionConnection("sess_test_123", "anthropic");
    clearSessionConnection("sess_test_456", "openai");
  });

  it("extracts session ID from headers or body correctly", () => {
    // Header variations
    expect(extractSessionId({ "x-session-id": "sess_abc" })).toBe("sess_abc");
    expect(extractSessionId({ "x-opencode-session": "opencode_123" })).toBe("opencode_123");
    expect(extractSessionId({ "x-cline-session-id": "cline_xyz" })).toBe("cline_xyz");
    expect(extractSessionId({ "x-conversation-id": "conv_999" })).toBe("conv_999");
    // Body variations
    expect(extractSessionId({}, { session_id: "body_sess_1" })).toBe("body_sess_1");
    expect(extractSessionId({}, { conversation_id: "body_conv_1" })).toBe("body_conv_1");
    expect(extractSessionId({}, { metadata: { session_id: "meta_sess" } })).toBe("meta_sess");
    expect(extractSessionId({}, { user: "usr_session_key" })).toBe("usr_session_key");
    expect(extractSessionId({}, {})).toBeNull();
  });

  it("records and retrieves session preferred connection correctly", () => {
    const sessionId = "sess_dev_flow_01";
    const providerId = "anthropic";
    const connectionId = "conn_acc_alpha_01";

    expect(getSessionPreferredConnection(sessionId, providerId)).toBeNull();

    recordSessionConnection(sessionId, providerId, connectionId);
    expect(getSessionPreferredConnection(sessionId, providerId)).toBe(connectionId);

    // Other provider returns null
    expect(getSessionPreferredConnection(sessionId, "openai")).toBeNull();

    // Clear session connection
    clearSessionConnection(sessionId, providerId);
    expect(getSessionPreferredConnection(sessionId, providerId)).toBeNull();
  });

  it("clears all session affinity when connectionId becomes unavailable", () => {
    const connectionId = "conn_acc_bad_01";
    recordSessionConnection("sess_1", "anthropic", connectionId);
    recordSessionConnection("sess_2", "anthropic", connectionId);
    recordSessionConnection("sess_3", "anthropic", "conn_acc_good_02");

    clearSessionConnectionById(connectionId);

    expect(getSessionPreferredConnection("sess_1", "anthropic")).toBeNull();
    expect(getSessionPreferredConnection("sess_2", "anthropic")).toBeNull();
    expect(getSessionPreferredConnection("sess_3", "anthropic")).toBe("conn_acc_good_02");
  });
});
