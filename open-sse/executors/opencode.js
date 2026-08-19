import { BaseExecutor } from "./base.js";
import { PROVIDERS } from "../config/providers.js";
import { injectReasoningContent } from "../utils/reasoningContentInjector.js";

// OpenCode free tier limits requests per egress IP.
const IP_LIMIT_BODY = /limit|rate|quota|exhausted|capacity|too many|retry/i;

// Models that use /zen/v1/messages (claude format)
const MESSAGES_MODELS = new Set();

/**
 * Generate random hex string for session/project/request IDs.
 * OpenCode upstream uses these to allocate free tier quota per identity.
 */
function generateRandomHex(length = 16) {
  let res = "";
  while (res.length < length) {
    res += Math.random().toString(36).slice(2);
  }
  return res.slice(0, length);
}

export class OpenCodeExecutor extends BaseExecutor {
  constructor() {
    super("opencode", PROVIDERS.opencode);
    // Fixed per-process session and project IDs for quota allocation
    this._sid = `ses_${generateRandomHex(40)}`;
    this._pid = `p_${generateRandomHex(20)}`;
  }

  transformRequest(model, body) {
    return injectReasoningContent({ provider: this.provider, model, body });
  }

  buildUrl(model) {
    const base = this.config.baseUrl;
    return MESSAGES_MODELS.has(model)
      ? `${base}/zen/v1/messages`
      : `${base}/zen/v1/chat/completions`;
  }

  buildHeaders(credentials, stream = true) {
    // Unique request ID per call: ses_<id>:<timestamp>:<random>
    const requestId = `${this._sid}:${Date.now()}:${generateRandomHex(12)}`;

    const headers = {
      "Content-Type": "application/json",
      "x-opencode-client": "desktop",
      "x-opencode-session": this._sid,
      "x-opencode-project": this._pid,
      "x-opencode-request": requestId,
      "User-Agent": "opencode/1.17.0",
    };

    // Use API key from credentials if available, fallback to "public" for backward compat
    if (credentials?.apiKey) {
      headers["Authorization"] = `Bearer ${credentials.apiKey}`;
    } else if (credentials?.accessToken) {
      headers["Authorization"] = `Bearer ${credentials.accessToken}`;
    } else {
      headers["Authorization"] = "Bearer public";
    }

    if (stream) {
      headers["Accept"] = "text/event-stream";
    }

    return headers;
  }

  parseError(response, bodyText) {
    const status = response?.status || 0;
    const text = String(bodyText || "");
    if ((status === 429 || status === 403) && IP_LIMIT_BODY.test(text)) {
      return {
        status,
        message: text.slice(0, 300) || `OpenCode free limit (${status})`,
        poolScoped: { reason: "ip-limit" },
      };
    }
    return null;
  }
}
