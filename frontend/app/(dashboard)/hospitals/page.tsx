"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useTelemetry } from "@/components/TelemetryProvider";
import HospitalsView from "@/components/HospitalsView";

export default function HospitalsPage() {
  const router = useRouter();
  const { requests } = useTelemetry();

  return (
    <HospitalsView
      requests={requests}
      onNavigateToRequests={() => router.push("/requests")}
    />
  );
}
