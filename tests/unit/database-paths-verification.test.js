// Unit tests to ensure database pathing and Docker configurations
// remain bound to "hermes-router" to prevent data loss on Hermes Router upgrades.
import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import yaml from "js-yaml";

const ROOT = resolve(import.meta.dirname, "../..");
const read = (p) => readFileSync(resolve(ROOT, p), "utf8");

describe("Database location & fallback path rules", () => {
  it("dataDir.js must define APP_NAME as 'hermes-router'", () => {
    const src = read("src/lib/dataDir.js");
    expect(src).toContain('const APP_NAME = "hermes-router"');
  });

  it("dataDir.js defaultDir must resolve to .hermes-router", () => {
    const src = read("src/lib/dataDir.js");
    expect(src).toContain("~/.${APP_NAME}");
    expect(src).toContain("AppData");
  });

  it("db paths.js resolves to SQLite data file inside DATA_DIR/db/data.sqlite", () => {
    const src = read("src/lib/db/paths.js");
    expect(src).toContain('export const DATA_FILE = path.join(DB_DIR, "data.sqlite")');
    expect(src).toContain('export const DB_DIR = path.join(DATA_DIR, "db")');
  });

  it("docker-compose.yml must preserve the hermes-router-data volume configuration", () => {
    const composeContent = read("docker-compose.yml");
    const compose = yaml.load(composeContent);

    // Ensure the main service mounts to the volume exactly as 'hermes-router-data:/app/data'
    const serviceName = Object.keys(compose.services)[0];
    const service = compose.services[serviceName];
    const hasCorrectVolumeMount = service.volumes.some(
      (v) => v === "hermes-router-data:/app/data"
    );
    
    // Comment explaining failure:
    // If this test fails, it means the Docker volume name 'hermes-router-data' was modified.
    // Changing the volume name creates a fresh empty volume, causing a total loss of SQLite data on deployment.
    expect(hasCorrectVolumeMount).toBe(true);

    // Ensure hermes-router-data volume definition exists in top-level volumes config
    const volumeDef = compose.volumes["hermes-router-data"];
    expect(volumeDef).toBeDefined();
    expect(volumeDef.name).toBe("hermes-router-data");
  });
});
