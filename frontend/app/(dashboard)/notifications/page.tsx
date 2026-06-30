"use client";

import React from "react";
import { useTelemetry } from "@/components/TelemetryProvider";
import NotificationsView from "@/components/NotificationsView";

export default function NotificationsPage() {
  const { notifications, fetchTelemetry, loading } = useTelemetry();

  return (
    <NotificationsView
      notifications={notifications}
      onRefresh={() => fetchTelemetry(true)}
      isLoading={loading}
      onActionTriggered={() => fetchTelemetry(true)}
    />
  );
}
