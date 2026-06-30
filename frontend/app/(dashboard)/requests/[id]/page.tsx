"use client";

import React, { use } from "react";
import { useRouter } from "next/navigation";
import { useTelemetry } from "@/components/TelemetryProvider";
import RequestsView from "@/components/RequestsView";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function RequestsPageDetail({ params }: PageProps) {
  const router = useRouter();
  const resolvedParams = use(params);
  const { fetchTelemetry } = useTelemetry();

  const id = resolvedParams.id ? parseInt(resolvedParams.id, 10) : null;

  return (
    <RequestsView
      selectedRequestId={id}
      onSelectRequest={(newId) => {
        if (newId) {
          router.push(`/requests/${newId}`);
        } else {
          router.push("/requests");
        }
      }}
      onActionTriggered={() => fetchTelemetry(true)}
    />
  );
}
