"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useTelemetry } from "@/components/TelemetryProvider";
import AIActivityView from "@/components/AIActivityView";

export default function AIActivityPage() {
  const router = useRouter();
  const { aiLogs, fetchTelemetry, loading } = useTelemetry();

  return (
    <AIActivityView
      logs={aiLogs}
      onRefresh={() => fetchTelemetry(false)}
      onRequestClick={(requestId) => router.push(`/requests/${requestId}`)}
      isLoading={loading}
    />
  );
}
