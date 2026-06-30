"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useTelemetry } from "@/components/TelemetryProvider";
import DashboardView from "@/components/DashboardView";
import type { TabId } from "@/components/Sidebar";

const tabPathMap: Record<TabId, string> = {
  dashboard: "/dashboard",
  requests: "/requests",
  donors: "/donors",
  hospitals: "/hospitals",
  "ai-activity": "/ai-activity",
  analytics: "/analytics",
  notifications: "/notifications",
  settings: "/settings",
};

export default function DashboardPage() {
  const router = useRouter();
  const { dashboardData, aiLogs, loading } = useTelemetry();

  return (
    <DashboardView
      data={dashboardData}
      aiLogs={aiLogs}
      onRequestClick={(requestId) => router.push(`/requests/${requestId}`)}
      onNavigateToTab={(tab) => router.push(tabPathMap[tab])}
      isLoading={loading}
    />
  );
}
