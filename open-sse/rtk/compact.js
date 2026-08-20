// Compact — port from YuJunZhiXue/Cline-proxy internal/app/compact.go (official opencode compaction.ts)
// Incremental summary compression with anchored template
// TODO: full port per plan-port-cline-proxy-features.md Phase 2

const summaryTemplate = `Objective:
{objective}

Important Details:
{details}

Work State:
- Completed: {completed}
- Active: {active}
- Blocked: {blocked}

Next Move:
{nextMove}

Relevant Files:
{files}

Rules: Keep every section, terse bullets, preserve paths, don't mention compaction.`;

const compactState = new Map(); // sessionId -> { summary, recent, updated }

export function serializeMsg(msg) {
  const role = msg.role || "user";
  let text = "";
  if (typeof msg.content === "string") text = msg.content;
  else if (Array.isArray(msg.content)) text = msg.content.map(c => c.text || JSON.stringify(c)).join("\n");
  else text = JSON.stringify(msg.content);
  if (text.length > 2000) text = text.slice(0, 2000) + "…";
  return `[${role}]: ${text}`;
}

export function estimateText(str) {
  return Math.ceil([...String(str)].length / 4);
}

export function estimateJSON(obj) {
  return Math.ceil(JSON.stringify(obj).length / 4);
}

export function selectRecent(serialized, keepTokens = 8000) {
  let acc = 0;
  let split = serialized.length;
  for (let i = serialized.length - 1; i >= 0; i--) {
    acc += estimateText(serialized[i]);
    if (acc > keepTokens) { split = i + 1; break; }
  }
  return { head: serialized.slice(0, split), recent: serialized.slice(split) };
}

export function buildSummaryPrompt(previousSummary, contextParts) {
  const context = contextParts.join("\n---\n");
  if (previousSummary) {
    return `Update anchored summary:\n<previous-summary>\n${previousSummary}\n</previous-summary>\n\n${summaryTemplate}\n\nContext:\n${context}`;
  }
  return `Create new anchored summary:\n${summaryTemplate}\n\nContext:\n${context}`;
}

export async function generateSummary(modelId, prompt, maxSummary = 4096) {
  // TODO: call zen/opencode model via Hermes fetch (inject fetchFn)
  // Placeholder: return truncated prompt as summary
  return prompt.slice(0, maxSummary);
}

export async function maybeCompact({ body, model, sessionId, config = {} }) {
  const buffer = config.buffer ?? 20000;
  const keepTokens = config.keepTokens ?? 8000;
  const maxSummary = config.maxSummary ?? 4096;
  const contextLimit = 200000; // TODO: get from model limits
  const threshold = contextLimit - Math.max(4096, buffer);
  if (estimateJSON(body) <= threshold) return { changed: false };
  const serialized = (body.messages || body.input || []).map(serializeMsg);
  const { head, recent } = selectRecent(serialized, keepTokens);
  const prev = compactState.get(sessionId)?.summary || null;
  const prompt = buildSummaryPrompt(prev, head);
  const summary = await generateSummary(model, prompt, maxSummary);
  const newState = { summary, recent: recent.join("\n"), updated: Date.now() };
  compactState.set(sessionId, newState);
  // TODO: reconstruct body.messages as [Conversation Summary] + recent
  return { changed: true, compactTokens: estimateText(prompt) + estimateText(summary), summary, recent };
}

export function cleanupCompactStates() {
  const cutoff = Date.now() - 24 * 60 * 60 * 1000;
  for (const [k, v] of [...compactState.entries()]) if (v.updated < cutoff) compactState.delete(k);
}
setInterval(cleanupCompactStates, 30 * 60 * 1000).unref?.();
