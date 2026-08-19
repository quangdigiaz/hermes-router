import fs from "node:fs";
import path from "node:path";
import { describe, it, expect } from "vitest";

const ROUTE_PATH = path.resolve("src/app/api/hub/status/route.js");
const INCIDENT_ALERTS_PATH = path.resolve("src/shared/components/dashboard/IncidentAlerts.js");
const CONNECTION_ROW_PATH = path.resolve("src/app/(dashboard)/dashboard/providers/[id]/ConnectionRow.js");
const PROVIDER_DETAIL_PATH = path.resolve("src/app/(dashboard)/dashboard/providers/[id]/page.js");
const PROVIDERS_PAGE_PATH = path.resolve("src/app/(dashboard)/dashboard/providers/page.js");

describe("Incident Alerts & Deep Navigation Guards", () => {
  it("route.js enriches incidents with providerName, connectionName, and deep links", () => {
    const content = fs.readFileSync(ROUTE_PATH, "utf8");
    expect(content).toContain("resolveProviderInfo");
    expect(content).toContain("getConnectionDisplayName");
    expect(content).toContain("providerName: pInfo.name");
    expect(content).toContain("connectionName: connName");
    expect(content).toContain("?connectionId=");
  });

  it("IncidentAlerts.js renders provider badge and connection name", () => {
    const content = fs.readFileSync(INCIDENT_ALERTS_PATH, "utf8");
    expect(content).toContain("providerLabel");
    expect(content).toContain("issue.connectionName");
    expect(content).toContain("issue.actionLabel");
  });

  it("ConnectionRow.js supports isHighlighted prop and id attribute", () => {
    const content = fs.readFileSync(CONNECTION_ROW_PATH, "utf8");
    expect(content).toContain("isHighlighted = false");
    expect(content).toContain("id={`conn-${connection.id}`}");
    expect(content).toContain("ring-2");
  });

  it("ProviderDetailPage reads connectionId param and wraps with Suspense", () => {
    const content = fs.readFileSync(PROVIDER_DETAIL_PATH, "utf8");
    expect(content).toContain("useSearchParams");
    expect(content).toContain("queryConnectionId");
    expect(content).toContain("setHighlightedConnectionId");
    expect(content).toContain("isHighlighted={highlightedConnectionId === String(conn.id)}");
    expect(content).toContain("<Suspense");
  });

  it("ProvidersPage includes dynamic Issues filter option", () => {
    const content = fs.readFileSync(PROVIDERS_PAGE_PATH, "utf8");
    expect(content).toContain("errorProvidersCount");
    expect(content).toContain('value: "issues"');
    expect(content).toContain("dynamicTierOptions");
  });
});
