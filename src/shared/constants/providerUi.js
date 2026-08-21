import React from "react";
import Badge from "@/shared/components/Badge";

export const TIER_FILTER_OPTIONS = [
  { value: "all", label: "All", icon: "apps" },
  { value: "official", label: "Official", icon: "verified" },
  { value: "bridge", label: "Bridge", icon: "link" },
  { value: "free", label: "Free", icon: "savings" },
  { value: "community", label: "Community", icon: "groups" },
  { value: "custom", label: "Custom", icon: "extension" },
];

export const TIER_VARIANT = {
  official: "info",
  bridge: "warning",
  free: "success",
  community: "default",
  experimental: "default",
};

export const BADGE_ICON = {
  recommended: "star",
  new: "auto_awesome",
  popular: "trending_up",
  free: "check_circle",
  cheap: "savings",
  deprecated: "warning",
  fast: "speed",
  local: "computer",
};

export function getStatusDisplay(connected, error, errorCode) {
  const parts = [];
  if (connected > 0) {
    parts.push(
      <Badge key="connected" variant="success" size="sm" dot>
        {connected} Connected
      </Badge>
    );
  }
  if (error > 0) {
    const errText = errorCode
      ? `${error} Error (${errorCode})`
      : `${error} Error`;
    parts.push(
      <Badge key="error" variant="error" size="sm" dot>
        {errText}
      </Badge>
    );
  }
  if (parts.length === 0) {
    return <span className="text-text-muted">No connections</span>;
  }
  return parts;
}
