"use client";
import { useState, useEffect } from "react";
import ClassicLandingView from "./components/classic/ClassicLandingView";
import StudioLandingView from "./components/studio/StudioLandingView";

export default function LandingPage() {
  const [isStudio, setIsStudio] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Check query parameter override if present (?mode=studio or ?mode=classic)
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const modeParam = params.get("mode");
      if (modeParam === "studio") {
        setIsStudio(true);
        setLoading(false);
        return;
      }
      if (modeParam === "classic") {
        setIsStudio(false);
        setLoading(false);
        return;
      }
    }

    // 2. Fetch studio theme config from public endpoint (no auth required)
    fetch("/api/settings/require-login")
      .then((res) => res.json())
      .then((data) => {
        if (data?.studioLandingEnabled === true) {
          setIsStudio(true);
        }
      })
      .catch((err) => {
        console.error("Failed to load landing settings:", err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  // Avoid layout flashes while settings resolve (defaults to classic)
  if (loading) {
    return <ClassicLandingView />;
  }

  return isStudio ? <StudioLandingView /> : <ClassicLandingView />;
}
