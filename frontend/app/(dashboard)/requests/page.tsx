"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useTelemetry } from "@/components/TelemetryProvider";
import RequestsView from "@/components/RequestsView";

export default function RequestsPageIndex() {
  const router = useRouter();
  const { fetchTelemetry } = useTelemetry();

  return (
    <RequestsView
      selectedRequestId={null}
      onSelectRequest={(id) => {
        if (id) {
          router.push(`/requests/${id}`);
        }
      }}
      onActionTriggered={() => fetchTelemetry(true)}
    />
  );
}
