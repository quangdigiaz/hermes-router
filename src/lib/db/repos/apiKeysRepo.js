import { randomUUID } from "node:crypto";
import { getAdapter } from "../driver.js";

// Parse a JSON TEXT column with null=all / []=none semantics.
// DB NULL → null (all allowed). DB "[]" → [] (none). DB "[x]" → [x].
function parsePermList(raw) {
  if (raw === null || raw === undefined) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

// Serialize back: null → null (DB NULL), [] → "[]", [x] → "[x]"
function serializePermList(val) {
  if (val === null || val === undefined) return null;
  return JSON.stringify(Array.isArray(val) ? val : []);
}

function rowToKey(row) {
  if (!row) return null;
  return {
    id: row.id,
    key: row.key,
    name: row.name,
    machineId: row.machineId,
    isActive: row.isActive === 1 || row.isActive === true,
    createdAt: row.createdAt,
    allowedProviders: parsePermList(row.allowedProviders),
    allowedCombos: parsePermList(row.allowedCombos),
    allowedKinds: parsePermList(row.allowedKinds),
    allowedModels: parsePermList(row.allowedModels),
    tokenLimit: typeof row.tokenLimit === "number" ? row.tokenLimit : (row.tokenLimit ? Number(row.tokenLimit) : null),
    budgetLimit: typeof row.budgetLimit === "number" ? row.budgetLimit : (row.budgetLimit ? Number(row.budgetLimit) : null),
    quotaPeriod: row.quotaPeriod || "none",
    rpmLimit: typeof row.rpmLimit === "number" ? row.rpmLimit : (row.rpmLimit ? Number(row.rpmLimit) : null),
    expiresAt: row.expiresAt || null,
  };
}

export async function getApiKeys() {
  const db = await getAdapter();
  const rows = db.all(`SELECT * FROM apiKeys ORDER BY createdAt ASC`);
  return rows.map(rowToKey);
}

export async function getApiKeyById(id) {
  const db = await getAdapter();
  const row = db.get(`SELECT * FROM apiKeys WHERE id = ?`, [id]);
  return rowToKey(row);
}

export async function createApiKey(name, machineId, options = {}) {
  if (!machineId) throw new Error("machineId is required");
  const [db, { generateApiKeyWithMachine }] = await Promise.all([
    getAdapter(),
    import("@/shared/utils/apiKey"),
  ]);
  const result = generateApiKeyWithMachine(machineId);
  const apiKey = {
    id: randomUUID(),
    name,
    key: result.key,
    machineId,
    isActive: true,
    createdAt: new Date().toISOString(),
    allowedProviders: options.allowedProviders || null,
    allowedCombos: options.allowedCombos || null,
    allowedKinds: options.allowedKinds || null,
    allowedModels: options.allowedModels || null,
    tokenLimit: options.tokenLimit || null,
    budgetLimit: options.budgetLimit || null,
    quotaPeriod: options.quotaPeriod || "none",
    rpmLimit: options.rpmLimit || null,
    expiresAt: options.expiresAt || null,
  };
  db.run(
    `INSERT INTO apiKeys(id, key, name, machineId, isActive, createdAt, allowedProviders, allowedCombos, allowedKinds, allowedModels, tokenLimit, budgetLimit, quotaPeriod, rpmLimit, expiresAt)
     VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      apiKey.id,
      apiKey.key,
      apiKey.name,
      apiKey.machineId,
      1,
      apiKey.createdAt,
      serializePermList(apiKey.allowedProviders),
      serializePermList(apiKey.allowedCombos),
      serializePermList(apiKey.allowedKinds),
      serializePermList(apiKey.allowedModels),
      apiKey.tokenLimit,
      apiKey.budgetLimit,
      apiKey.quotaPeriod,
      apiKey.rpmLimit,
      apiKey.expiresAt,
    ]
  );
  return apiKey;
}

export async function updateApiKey(id, data) {
  const db = await getAdapter();
  let result = null;
  db.transaction(() => {
    const row = db.get(`SELECT * FROM apiKeys WHERE id = ?`, [id]);
    if (!row) return;
    const current = rowToKey(row);
    // Merge: only override fields explicitly present in data
    const merged = { ...current };
    if (data.isActive !== undefined) merged.isActive = data.isActive;
    if (data.name !== undefined) merged.name = data.name;
    if ("allowedProviders" in data) merged.allowedProviders = data.allowedProviders;
    if ("allowedCombos" in data) merged.allowedCombos = data.allowedCombos;
    if ("allowedKinds" in data) merged.allowedKinds = data.allowedKinds;
    if ("allowedModels" in data) merged.allowedModels = data.allowedModels;
    if ("tokenLimit" in data) merged.tokenLimit = data.tokenLimit;
    if ("budgetLimit" in data) merged.budgetLimit = data.budgetLimit;
    if ("quotaPeriod" in data) merged.quotaPeriod = data.quotaPeriod;
    if ("rpmLimit" in data) merged.rpmLimit = data.rpmLimit;
    if ("expiresAt" in data) merged.expiresAt = data.expiresAt;

    db.run(
      `UPDATE apiKeys SET
        key = ?, name = ?, machineId = ?, isActive = ?,
        allowedProviders = ?, allowedCombos = ?, allowedKinds = ?, allowedModels = ?,
        tokenLimit = ?, budgetLimit = ?, quotaPeriod = ?, rpmLimit = ?, expiresAt = ?
       WHERE id = ?`,
      [
        merged.key,
        merged.name,
        merged.machineId,
        merged.isActive ? 1 : 0,
        serializePermList(merged.allowedProviders),
        serializePermList(merged.allowedCombos),
        serializePermList(merged.allowedKinds),
        serializePermList(merged.allowedModels),
        merged.tokenLimit,
        merged.budgetLimit,
        merged.quotaPeriod || "none",
        merged.rpmLimit,
        merged.expiresAt,
        id,
      ]
    );
    result = merged;
  });
  return result;
}

export async function deleteApiKey(id) {
  const db = await getAdapter();
  const res = db.run(`DELETE FROM apiKeys WHERE id = ?`, [id]);
  return (res?.changes ?? 0) > 0;
}

export async function validateApiKey(key) {
  const db = await getAdapter();
  const row = db.get(`SELECT * FROM apiKeys WHERE key = ?`, [key]);
  if (!row || row.isActive !== 1 && row.isActive !== true) return null;
  return rowToKey(row);
}
