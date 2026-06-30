"use client";

import React from "react";
import { useTelemetry } from "@/components/TelemetryProvider";
import AnalyticsView from "@/components/AnalyticsView";

export default function AnalyticsPage() {
  const { dashboardData, loading } = useTelemetry();

  return (
    <AnalyticsView
      data={dashboardData ? dashboardData.analytics : null}
      isLoading={loading}
    />
  );
}
