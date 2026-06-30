"use client";

import React from "react";
import type { DashboardData, AILog } from "@/lib/types";
import { formatRelativeTime } from "@/lib/utils";
import {
  Activity,
  Users,
  ShieldCheck,
  Clock,
  ArrowUpRight,
  TrendingUp,
  FileSpreadsheet,
  BrainCircuit,
  RefreshCw,
  Sparkles,
} from "lucide-react";

interface DashboardViewProps {
  data: DashboardData | null;
  aiLogs: AILog[];
  onRequestClick: (id: number) => void;
  onNavigateToTab: (tabId: any) => void;
  isLoading: boolean;
}

export default function DashboardView({
  data,
  aiLogs,
  onRequestClick,
  onNavigateToTab,
  isLoading,
}: DashboardViewProps) {
  if (isLoading && !data) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 bg-background">
        <div className="text-center space-y-3">
          <BrainCircuit className="w-8 h-8 text-primary animate-pulse mx-auto" />
          <p className="text-xs text-muted-foreground font-mono">Loading command center statistics...</p>
        </div>
      </div>
    );
  }

  const kpis = data?.kpis || {
    active_requests: 0,
    confirmed_donors: 0,
    success_rate: "0.0%",
    average_match_time: "-- Min",
    units_secured_today: 0,
    total_donors_contacted: 0,
    response_rate: "0.0%",
    pending_responses: 0,
    average_fulfillment_time: "-- Min",
  };

  const emergencyRequests = data?.active_emergency_requests || [];

  return (
    <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-4 sm:space-y-6">
      {/* 4 Stat Tiles — 2 cols on mobile, 4 on large */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-card border border-border rounded-lg p-4 sm:p-5 flex flex-col justify-between hover:border-foreground/20 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[9px] sm:text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Active Requests</span>
            <Activity className="w-4 h-4 text-primary shrink-0" strokeWidth={1.5} />
          </div>
          <div className="mt-3">
            <p className="text-xl sm:text-2xl font-semibold text-foreground tracking-tight font-mono">{kpis.active_requests}</p>
            <span className="text-[9px] font-medium text-primary bg-primary/10 px-1.5 py-0.5 rounded mt-1 inline-block">Live dispatch</span>
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg p-4 sm:p-5 flex flex-col justify-between hover:border-foreground/20 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[9px] sm:text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Confirmed Donors</span>
            <Users className="w-4 h-4 text-success shrink-0" strokeWidth={1.5} />
          </div>
          <div className="mt-3">
            <p className="text-xl sm:text-2xl font-semibold text-foreground tracking-tight font-mono">{kpis.confirmed_donors}</p>
            <div className="flex items-center gap-1 mt-1 text-[9px] text-muted-foreground">
              <TrendingUp className="w-3 h-3 text-success shrink-0" />
              <span>Contacted: <strong className="font-mono text-foreground">{kpis.total_donors_contacted}</strong></span>
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg p-4 sm:p-5 flex flex-col justify-between hover:border-foreground/20 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[9px] sm:text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Success Rate</span>
            <ShieldCheck className="w-4 h-4 text-success shrink-0" strokeWidth={1.5} />
          </div>
          <div className="mt-3">
            <p className="text-xl sm:text-2xl font-semibold text-foreground tracking-tight font-mono">{kpis.success_rate}</p>
            <p className="text-[9px] text-muted-foreground mt-1">Fulfillment rate</p>
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg p-4 sm:p-5 flex flex-col justify-between hover:border-foreground/20 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[9px] sm:text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Avg Match Time</span>
            <Clock className="w-4 h-4 text-warning shrink-0" strokeWidth={1.5} />
          </div>
          <div className="mt-3">
            <p className="text-xl sm:text-2xl font-semibold text-foreground tracking-tight font-mono">{kpis.average_match_time}</p>
            <p className="text-[9px] text-muted-foreground mt-1">Avg verification: 35m</p>
          </div>
        </div>
      </div>

      {/* Secondary Metrics — 2 cols on mobile, 4 on md */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 py-2 border-t border-b border-border bg-card/40 px-4 rounded-md">
        {[
          { label: "Units Secured Today", value: kpis.units_secured_today },
          { label: "Response Rate", value: kpis.response_rate },
          { label: "Pending Responses", value: kpis.pending_responses },
          { label: "Fulfillment Time", value: kpis.average_fulfillment_time },
        ].map((m, i) => (
          <div key={i} className={`py-2 ${i > 0 ? "md:border-l md:border-border md:pl-4" : ""}`}>
            <p className="text-[9px] sm:text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{m.label}</p>
            <p className="text-sm sm:text-base font-semibold text-foreground tracking-tight font-mono mt-0.5">{m.value}</p>
          </div>
        ))}
      </div>

      {/* Split: Live AI Feed + Active Emergency Table — stacked on mobile, side-by-side on lg */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 sm:gap-6">
        {/* AI Feed */}
        <div className="bg-card border border-border rounded-lg flex flex-col lg:col-span-2" style={{ minHeight: 320 }}>
          <div className="px-4 sm:px-5 py-3 sm:py-4 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
              </span>
              <h2 className="text-xs sm:text-sm font-semibold text-foreground">AI Operator Activity</h2>
            </div>
            <button
              onClick={() => onNavigateToTab("ai-activity")}
              className="text-[10px] font-semibold text-primary hover:underline flex items-center gap-0.5 shrink-0"
            >
              Audit logs <ArrowUpRight className="w-3 h-3" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-4 sm:px-5 py-4 space-y-4 font-mono text-xs" style={{ maxHeight: 340 }}>
            {aiLogs.length === 0 ? (
              <div className="h-full flex items-center justify-center text-muted-foreground text-center text-xs">
                No logs yet. Create a request to spawn agent actions.
              </div>
            ) : (
              aiLogs.slice(0, 10).map((log) => {
                let badgeColor = "bg-muted text-muted-foreground";
                if (log.agent_name.includes("Matcher")) badgeColor = "bg-primary/10 text-primary";
                else if (log.agent_name.includes("Outreach")) badgeColor = "bg-warning/10 text-warning";
                else if (log.agent_name.includes("Conversation")) badgeColor = "bg-success/10 text-success";
                return (
                  <div key={log.id} className="border-b border-border/50 pb-3 last:border-0 last:pb-0">
                    <div className="flex items-center justify-between mb-1 gap-2">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold shrink-0 ${badgeColor}`}>{log.agent_name}</span>
                      <span className="text-[10px] text-muted-foreground">{formatRelativeTime(log.timestamp)}</span>
                    </div>
                    <p className="text-foreground text-[11px] leading-relaxed">{log.action_taken}</p>
                    {log.request_id && (
                      <button onClick={() => onRequestClick(log.request_id!)} className="text-[10px] text-primary underline mt-0.5">
                        Request #{log.request_id}
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Emergency Requests Table */}
        <div className="bg-card border border-border rounded-lg flex flex-col lg:col-span-3" style={{ minHeight: 320 }}>
          <div className="px-4 sm:px-5 py-3 sm:py-4 border-b border-border flex items-center justify-between">
            <h2 className="text-xs sm:text-sm font-semibold text-foreground">Active Emergency Dispatch</h2>
            <button
              onClick={() => onNavigateToTab("requests")}
              className="text-[10px] font-semibold text-primary hover:underline flex items-center gap-0.5 shrink-0"
            >
              All requests <ArrowUpRight className="w-3 h-3" />
            </button>
          </div>
          <div className="flex-1 overflow-auto">
            {emergencyRequests.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center p-6 space-y-4 text-center">
                <FileSpreadsheet className="w-8 h-8 text-muted-foreground/50" />
                <div>
                  <p className="font-semibold text-xs text-foreground">No Active Emergencies</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">All urgent requests resolved.</p>
                </div>
                <button
                  onClick={() => onNavigateToTab("requests")}
                  className="bg-primary text-white text-[11px] font-semibold px-3 py-1.5 rounded-md hover:bg-primary/95 transition-colors"
                >
                  Create Request
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[380px]">
                  <thead>
                    <tr className="border-b border-border bg-muted/20 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                      <th className="px-4 py-3">ID</th>
                      <th className="px-4 py-3">Hospital</th>
                      <th className="px-4 py-3 text-center">Group</th>
                      <th className="px-4 py-3 text-center">Urgency</th>
                      <th className="px-4 py-3 text-right">Secured</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {emergencyRequests.map((req) => {
                      const pct = req.units_required > 0 ? (req.units_confirmed / req.units_required) * 100 : 100;
                      return (
                        <tr
                          key={req.id}
                          onClick={() => onRequestClick(req.id)}
                          className="hover:bg-muted/40 cursor-pointer text-xs"
                        >
                          <td className="px-4 py-3 font-mono font-medium text-foreground">#{req.id}</td>
                          <td className="px-4 py-3 font-medium text-foreground">{req.hospital}</td>
                          <td className="px-4 py-3 text-center">
                            <span className="bg-primary/10 text-primary font-bold px-2 py-0.5 rounded text-[10px]">{req.blood_group}</span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${req.urgency === "Critical" ? "bg-primary/10 text-primary" : "bg-warning/10 text-warning"}`}>
                              {req.urgency}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex flex-col items-end gap-1">
                              <span className="font-mono font-semibold">{req.units_confirmed}/{req.units_required}</span>
                              <div className="w-12 h-1 bg-border rounded-full overflow-hidden">
                                <div className="h-full bg-success" style={{ width: `${pct}%` }} />
                              </div>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
