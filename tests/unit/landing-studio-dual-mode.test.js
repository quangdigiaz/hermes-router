import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("Landing Page Dual-Mode Architecture", () => {
  it("settingsRepo has studioLandingEnabled defaulting to false", () => {
    const repoSrc = fs.readFileSync(
      path.resolve(__dirname, "../../src/lib/db/repos/settingsRepo.js"),
      "utf8"
    );
    expect(repoSrc).toContain("studioLandingEnabled: false");
  });

  it("dashboard profile page includes Landing Page Theme toggle", () => {
    const profileSrc = fs.readFileSync(
      path.resolve(__dirname, "../../src/app/(dashboard)/dashboard/profile/page.js"),
      "utf8"
    );
    expect(profileSrc).toContain("Landing Page Theme");
    expect(profileSrc).toContain("Studio Pro Mode");
    expect(profileSrc).toContain("updateStudioLanding");
  });

  it("ClassicLandingView preserves original components", () => {
    const classicSrc = fs.readFileSync(
      path.resolve(__dirname, "../../src/app/landing/components/classic/ClassicLandingView.js"),
      "utf8"
    );
    expect(classicSrc).toContain("HeroSection");
    expect(classicSrc).toContain("FlowAnimation");
    expect(classicSrc).toContain("Features");
    expect(classicSrc).toContain("GetStarted");
  });

  it("StudioLandingView integrates TeamoRouter style components", () => {
    const studioSrc = fs.readFileSync(
      path.resolve(__dirname, "../../src/app/landing/components/studio/StudioLandingView.js"),
      "utf8"
    );
    expect(studioSrc).toContain("StudioNavigation");
    expect(studioSrc).toContain("StudioHero");
    expect(studioSrc).toContain("StudioMetrics");
    expect(studioSrc).toContain("StudioFlow");
    expect(studioSrc).toContain("StudioModelCatalog");
    expect(studioSrc).toContain("StudioQuickStart");
    expect(studioSrc).toContain("StudioFeatures");
    expect(studioSrc).toContain("StudioFooter");
  });

  it("landing page.js switches between Classic and Studio based on settings/override", () => {
    const landingSrc = fs.readFileSync(
      path.resolve(__dirname, "../../src/app/landing/page.js"),
      "utf8"
    );
    expect(landingSrc).toContain("ClassicLandingView");
    expect(landingSrc).toContain("StudioLandingView");
    expect(landingSrc).toContain("studioLandingEnabled");
  });
});
