"use client";

import React from "react";
import type { BloodRequest } from "@/lib/types";
import {
  MapPin,
  TrendingUp,
  Activity,
  HeartHandshake,
  Clock,
  ExternalLink,
  ShieldCheck,
} from "lucide-react";

interface HospitalsViewProps {
  requests: BloodRequest[];
  onNavigateToRequests: () => void;
}

export default function HospitalsView({
  requests,
  onNavigateToRequests,
}: HospitalsViewProps) {
  // Predefined hospital nodes with coordinate definitions
  const coordinateHospitals = [
    {
      name: "Indus Hospital",
      location: "Korangi Crossing",
      coords: "24.8118° N, 67.1147° E",
      responseRate: "98.2%",
      avgMatch: "4.2 Min",
      beds: "500+ Beds",
    },
    {
      name: "Civil Hospital",
      location: "Baba-e-Urdu Road",
      coords: "24.8576° N, 67.0094° E",
      responseRate: "94.8%",
      avgMatch: "5.1 Min",
      beds: "1,900+ Beds",
    },
    {
      name: "Gulshan-e-Iqbal",
      location: "Block 13-C, Gulshan",
      coords: "24.9180° N, 67.0971° E",
      responseRate: "92.1%",
      avgMatch: "4.8 Min",
      beds: "Regional Blood Center",
    },
    {
      name: "North Nazimabad",
      location: "Block H, North Nazimabad",
      coords: "24.9392° N, 67.0394° E",
      responseRate: "95.4%",
      avgMatch: "4.5 Min",
      beds: "District Coordination Hub",
    },
    {
      name: "DHA",
      location: "Phase 6, Karachi",
      coords: "24.8016° N, 67.0654° E",
      responseRate: "97.6%",
      avgMatch: "3.9 Min",
      beds: "Emergency Medical Clinic",
    },
    {
      name: "Korangi",
      location: "Korangi Industrial Area",
      coords: "24.8329° N, 67.1420° E",
      responseRate: "91.2%",
      avgMatch: "5.5 Min",
      beds: "General Hospital Center",
    },
    {
      name: "Clifton",
      location: "Block 5, Clifton",
      coords: "24.8213° N, 67.0344° E",
      responseRate: "96.5%",
      avgMatch: "4.1 Min",
      beds: "Specialized Care Unit",
    },
  ];

  // Calculate active requests per hospital from live data
  const getActiveRequestsCount = (hospitalName: string) => {
    return requests.filter(
      (r) =>
        r.status === "Active" &&
        r.hospital.toLowerCase().includes(hospitalName.toLowerCase())
    ).length;
  };

  return (
    <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-4 sm:space-y-6">
      {/* Grid view of coordinating hospital hubs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {coordinateHospitals.map((hosp) => {
          const activeCount = getActiveRequestsCount(hosp.name);
          const hasEmergency = activeCount > 0;

          return (
            <div
              key={hosp.name}
              className={`bg-card border rounded-lg p-5 flex flex-col justify-between hover:shadow-sm transition-all duration-200 ${
                hasEmergency ? "border-primary/20 bg-primary/[0.01]" : "border-border"
              }`}
            >
              {/* Header: Logo mark and Hospital Title */}
              <div>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-9 h-9 rounded-md flex items-center justify-center font-bold text-xs ${
                        hasEmergency
                          ? "bg-primary/10 text-primary"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      H
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground text-sm leading-tight">
                        {hosp.name}
                      </h3>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{hosp.beds}</p>
                    </div>
                  </div>
                  {/* Status Indicator Badge */}
                  <span
                    className={`px-2 py-0.5 rounded-full text-[9px] font-semibold ${
                      hasEmergency
                        ? "bg-primary/10 text-primary animate-pulse"
                        : "bg-success/10 text-success"
                    }`}
                  >
                    {hasEmergency ? `${activeCount} Active Requests` : "Nominal"}
                  </span>
                </div>

                {/* Coordinates & Location */}
                <div className="mt-5 space-y-2 text-xs">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <MapPin className="w-3.5 h-3.5 shrink-0" />
                    <span>
                      {hosp.location} <span className="text-[10px] text-muted-foreground/60">({hosp.coords})</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* KPI stats bottom */}
              <div className="mt-6 pt-4 border-t border-border/60 grid grid-cols-3 gap-2 text-center text-xs">
                <div>
                  <p className="text-[9px] text-muted-foreground uppercase font-medium">Response Rate</p>
                  <p className="font-semibold text-foreground font-mono mt-0.5">{hosp.responseRate}</p>
                </div>
                <div className="border-l border-border/80">
                  <p className="text-[9px] text-muted-foreground uppercase font-medium">Avg AI Match</p>
                  <p className="font-semibold text-foreground font-mono mt-0.5">{hosp.avgMatch}</p>
                </div>
                <div className="border-l border-border/80">
                  <p className="text-[9px] text-muted-foreground uppercase font-medium">Dispatch</p>
                  <p
                    className={`font-semibold mt-0.5 font-mono ${
                      hasEmergency ? "text-primary" : "text-success"
                    }`}
                  >
                    {hasEmergency ? "URGENT" : "STABLE"}
                  </p>
                </div>
              </div>

              {/* Action trigger button */}
              {hasEmergency && (
                <button
                  onClick={onNavigateToRequests}
                  className="mt-4 w-full py-1.5 border border-primary/20 bg-primary/5 text-primary text-[10px] font-semibold rounded hover:bg-primary/10 transition-colors flex items-center justify-center gap-1"
                >
                  <span>Resolve Emergency Dispatches</span>
                  <ExternalLink className="w-3 h-3" />
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
