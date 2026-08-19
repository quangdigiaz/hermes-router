export default {
  version: 9,
  name: "add-combo-name",
  up(db) {
    const uhRows = db.all("PRAGMA table_info(usageHistory)");
    const uhCols = new Set(uhRows.map((r) => r.name));
    if (!uhCols.has("comboName")) db.exec("ALTER TABLE usageHistory ADD COLUMN comboName TEXT");

    const rdRows = db.all("PRAGMA table_info(requestDetails)");
    const rdCols = new Set(rdRows.map((r) => r.name));
    if (!rdCols.has("comboName")) db.exec("ALTER TABLE requestDetails ADD COLUMN comboName TEXT");
  },
};
