import { ERROR_TYPES, DEFAULT_ERROR_MESSAGES } from "../config/errorConfig.js";
import { unwrapClinepassEnvelope } from "./clinepassEnvelope.js";

/**
 * Build OpenAI-compatible error response body
 * @param {number} statusCode - HTTP status code
 * @param {string} message - Error message
 * @returns {object} Error response object
 */
export function buildErrorBody(statusCode, message) {
  const errorInfo = ERROR_TYPES[statusCode] || 
    (statusCode >= 500 
      ? { type: "server_error", code: "internal_server_error" }
      : { type: "invalid_request_error", code: "" });

  return {
    error: {
      message: message || DEFAULT_ERROR_MESSAGES[statusCode] || "An error occurred",
      type: errorInfo.type,
      code: errorInfo.code
    }
  };
}

/**
 * Create error Response object (for non-streaming)
 * @param {number} statusCode - HTTP status code
 * @param {string} message - Error message
 * @returns {Response} HTTP Response object
 */
export function errorResponse(statusCode, message) {
  return new Response(JSON.stringify(buildErrorBody(statusCode, message)), {
    status: statusCode,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*"
    }
  });
}

/**
 * Write error to SSE stream (for streaming)
 * @param {WritableStreamDefaultWriter} writer - Stream writer
 * @param {number} statusCode - HTTP status code
 * @param {string} message - Error message
 */
export async function writeStreamError(writer, statusCode, message) {
  const errorBody = buildErrorBody(statusCode, message);
  const encoder = new TextEncoder();
  await writer.write(encoder.encode(`data: ${JSON.stringify(errorBody)}\n\n`));
}

/**
 * Parse upstream provider error response
 * @param {Response} response - Fetch response from provider
 * @param {object} [executor] - Optional executor with parseError() override for provider-specific parsing
 * @returns {Promise<{statusCode: number, message: string, resetsAtMs?: number}>}
 */
export async function parseUpstreamError(response, executor = null) {
  let bodyText = "";
  try {
    bodyText = await response.text();
  } catch {
    bodyText = "";
  }

  // 403 HTML Cloudflare WAF — map to 502 transient trước khi mọi parser khác
  // Dấu hiệu: <html> + Unable to load site / Ray ID / cdn-cgi/challenge
  // Gốc: open-sse/providers/registry/codex.js → chatgpt.com bị Warp 2a06:... flag
  if (response.status === 403 && /<html/i.test(bodyText) && /Unable to load site|Ray ID|cdn-cgi\/challenge/i.test(bodyText)) {
    const rayMatch = bodyText.match(/Ray ID[:\s]*([a-z0-9]+)/i);
    const ray = rayMatch ? ` [Ray ID:${rayMatch[1].slice(0, 16)}]` : "";
    return {
      statusCode: 502,
      message: `Codex blocked by Cloudflare WAF (IP/proxy flagged)${ray}. Fix: set No Proxy for chatgpt.com or use residential proxy per account. Original 403 HTML sanitized.`,
      // transient 30s — không lock 2m như 403 auth
    };
  }

  // Let executor-specific parser extract provider-specific fields (e.g. codex resetsAtMs)
  if (executor && typeof executor.parseError === "function") {
    try {
      const parsed = executor.parseError(response, bodyText);
      if (parsed && typeof parsed === "object") {
        const msg = parsed.message || DEFAULT_ERROR_MESSAGES[response.status] || `Upstream error: ${response.status}`;
        return {
          statusCode: parsed.status || response.status,
          message: msg,
          resetsAtMs: parsed.resetsAtMs,
          poolScoped: parsed.poolScoped,
        };
      }
    } catch { /* fall through to default parsing */ }
  }

  let message = "";
  try {
    const json = JSON.parse(bodyText);
    const { error: envError } = unwrapClinepassEnvelope(json, executor?.getProvider?.() || executor?.provider);
    if (envError) {
      message = envError.message;
    } else {
      message = json.error?.message || json.message || json.error || bodyText;
    }
  } catch {
    message = bodyText;
  }

  // Sanitize HTML leak: nếu message vẫn chứa <html thì thay bằng text ngắn
  if (/<html/i.test(message) && /Unable to load site|Ray ID/i.test(message)) {
    message = "Codex upstream blocked by Cloudflare (403). IP/proxy flagged — Ray ID present. Fix: Dashboard → Connection → No Proxy = chatgpt.com, auth.openai.com hoặc gán residential proxy riêng mỗi Codex account.";
  }

  const messageStr = typeof message === "string" ? message : JSON.stringify(message);
  const finalMessage = messageStr || DEFAULT_ERROR_MESSAGES[response.status] || `Upstream error: ${response.status}`;

  return { statusCode: response.status, message: finalMessage };
}

/**
 * Create error result for chatCore handler
 * @param {number} statusCode - HTTP status code
 * @param {string} message - Error message
 * @param {number} [resetsAtMs] - Optional precise cooldown expiry (ms epoch) for provider-specific quota errors
 * @returns {{ success: false, status: number, error: string, response: Response, resetsAtMs?: number }}
 */
export function createErrorResult(statusCode, message, resetsAtMs, policyError = false) {
  return {
    success: false,
    status: statusCode,
    error: message,
    resetsAtMs,
    policyError,
    response: errorResponse(statusCode, message)
  };
}

/**
 * Create unavailable response when all accounts are rate limited
 * @param {number} statusCode - Original error status code
 * @param {string} message - Error message (without retry info)
 * @param {string} retryAfter - ISO timestamp when earliest account becomes available
 * @param {string} retryAfterHuman - Human-readable retry info e.g. "reset after 30s"
 * @returns {Response}
 */
export function unavailableResponse(statusCode, message, retryAfter, retryAfterHuman) {
  const retryAfterSec = Math.max(Math.ceil((new Date(retryAfter).getTime() - Date.now()) / 1000), 1);
  const msg = `${message} (${retryAfterHuman})`;
  return new Response(
    JSON.stringify({ error: { message: msg } }),
    {
      status: statusCode,
      headers: {
        "Content-Type": "application/json",
        "Retry-After": String(retryAfterSec)
      }
    }
  );
}

/**
 * Attach the X-HermesRouter-Selected-Connection-Id header to a response so
 * clients can see which upstream account handled their request.
 *
 * Works for both streaming and non-streaming responses: `response.body`
 * (a ReadableStream) is passed by reference to the new Response, so the
 * stream continues to flow untouched — only the headers object is rebuilt.
 *
 * Returns the original response unchanged when connectionId is falsy.
 *
 * @param {Response} response - the response to tag
 * @param {string} [connectionId] - the selected connection's id
 * @returns {Response}
 */
export function withSelectedConnectionHeader(response, connectionId) {
  if (!response || !connectionId) return response;
  const headers = new Headers(response.headers);
  headers.set("X-HermesRouter-Selected-Connection-Id", connectionId);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

/**
 * Format provider error with context
 * @param {Error} error - Original error
 * @param {string} provider - Provider name
 * @param {string} model - Model name
 * @param {number|string} statusCode - HTTP status code or error code
 * @returns {string} Formatted error message
 */
export function formatProviderError(error, provider, model, statusCode) {
  const code = statusCode || error.code || "FETCH_FAILED";
  const message = error.message || "Unknown error";
  // Expose low-level cause (e.g. UND_ERR_SOCKET, ECONNRESET, ETIMEDOUT) for diagnosing fetch failures
  const causeCode = error.cause?.code;
  const causeMsg = error.cause?.message;
  const causeStr = causeCode || causeMsg ? ` (cause: ${[causeCode, causeMsg].filter(Boolean).join(": ")})` : "";
  return `[${code}]: ${message}${causeStr}`;
}
