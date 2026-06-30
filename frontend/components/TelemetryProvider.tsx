"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { getDashboard, getAILogs, getNotifications, getRequests } from "@/lib/api";
import type { DashboardData, AILog, SystemNotification, BloodRequest } from "@/lib/types";

interface TelemetryContextType {
  dashboardData: DashboardData | null;
  aiLogs: AILog[];
  notifications: SystemNotification[];
  requests: BloodRequest[];
  loading: boolean;
  fetchTelemetry: (isSilent?: boolean) => Promise<void>;
}

const TelemetryContext = createContext<TelemetryContextType | undefined>(undefined);

export function TelemetryProvider({ children }: { children: React.ReactNode }) {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [aiLogs, setAiLogs] = useState<AILog[]>([]);
  const [notifications, setNotifications] = useState<SystemNotification[]>([]);
  const [requests, setRequests] = useState<BloodRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTelemetry = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      const [dash, logs, notifs, reqs] = await Promise.all([
        getDashboard().catch(() => null),
        getAILogs().catch(() => []),
        getNotifications().catch(() => []),
        getRequests().catch(() => []),
      ]);
      if (dash) setDashboardData(dash);
      setAiLogs(logs);
      setNotifications(notifs);
      setRequests(reqs);
    } catch (e) {
      console.error("Telemetry aggregation failed:", e);
    } finally {
      if (!isSilent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTelemetry();
  }, [fetchTelemetry]);

  useEffect(() => {
    const timer = setInterval(() => {
      fetchTelemetry(true);
    }, 4000);
    return () => clearInterval(timer);
  }, [fetchTelemetry]);

  return (
    <TelemetryContext.Provider
      value={{
        dashboardData,
        aiLogs,
        notifications,
        requests,
        loading,
        fetchTelemetry,
      }}
    >
      {children}
    </TelemetryContext.Provider>
  );
}

export function useTelemetry() {
  const context = useContext(TelemetryContext);
  if (context === undefined) {
    throw new Error("useTelemetry must be used within a TelemetryProvider");
  }
  return context;
}
