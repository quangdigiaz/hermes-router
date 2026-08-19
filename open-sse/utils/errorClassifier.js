/**
 * Error classifier for HTTP 200 streaming responses.
 * 
 * Detects soft-errors where upstream returns HTTP 200 but the response body
 * contains error indicators (e.g. "unauthorized", "rate limit exceeded").
 * 
 * Based on bugs from 9router #3242 and OmniRoute #10443.
 */

// Error patterns that indicate upstream failure despite HTTP 200
const SOFT_ERROR_PATTERNS = [
  // JSON error objects in response body
  /"error"\s*:\s*\{/,
  /"error"\s*:\s*"[^"]*(?:unauthorized|forbidden|rate.?limit|quota|exceeded|invalid|denied)/i,
  
  // Provider-specific error messages
  /(?:model|api).call.(?:unauthorized|rejected|failed|denied)/i,
  /stream.outcome=(?:exhausted|invalid|error)/i,
  /"(?:message|error)"\s*:\s*"[^"]*(?:token|auth|permission|limit)/i,
  
  // Common error response patterns
  /"code"\s*:\s*"(?:invalid_api_key|rate_limit_exceeded|quota_exceeded|permission_denied)"/i,
  /"type"\s*:\s*"(?:invalid_request_error|authentication_error|permission_error|rate_limit_error)"/i,
];

/**
 * Classify a streaming response chunk for soft-errors.
 * 
 * @param {string} chunk - Current SSE chunk text
 * @param {string} accumulatedContent - All content accumulated so far
 * @param {number} streamDurationMs - How long the stream has been running
 * @returns {{ isSoftError: boolean, reason?: string, shouldRetry?: boolean }}
 */
export function classifyStreamError(chunk, accumulatedContent = "", streamDurationMs = 0) {
  // Pattern 1: Error object in chunk
  for (const pattern of SOFT_ERROR_PATTERNS) {
    if (pattern.test(chunk)) {
      return { 
        isSoftError: true, 
        reason: `error_pattern_match: ${pattern.source.slice(0, 50)}`,
        shouldRetry: true 
      };
    }
  }

  // Pattern 2: Empty stream with error indicators
  if (!accumulatedContent || accumulatedContent.length === 0) {
    if (chunk.includes('"error"') || chunk.includes('"message"')) {
      return { 
        isSoftError: true, 
        reason: "empty_stream_with_error",
        shouldRetry: true 
      };
    }
  }

  // Pattern 3: Stream ended too early with no useful content
  // Only trigger if stream has been running for a while (not just started)
  if (streamDurationMs > 5000 && accumulatedContent.length < 50) {
    if (chunk.includes('"finish_reason":null') || chunk.includes('"finish_reason": "null"')) {
      return { 
        isSoftError: true, 
        reason: "stream_ended_too_early",
        shouldRetry: true 
      };
    }
  }

  // Pattern 4: Content is actually an error message (not JSON)
  if (accumulatedContent.length > 0 && accumulatedContent.length < 200) {
    const lowerContent = accumulatedContent.toLowerCase();
    if (lowerContent.includes("unauthorized") || 
        lowerContent.includes("forbidden") ||
        lowerContent.includes("rate limit") ||
        lowerContent.includes("quota exceeded")) {
      return { 
        isSoftError: true, 
        reason: "error_content_not_json",
        shouldRetry: true 
      };
    }
  }

  return { isSoftError: false };
}
