"use client";

import React from "react";
import type { Analytics } from "@/lib/types";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
  Cell,
  PieChart,
  Pie,
} from "recharts";
import {
  TrendingUp,
  BarChart3,
  PieChart as PieIcon,
  RefreshCw,
  Cpu,
} from "lucide-react";

interface AnalyticsViewProps {
  data: Analytics | null;
  isLoading: boolean;
}

export default function AnalyticsView({ data, isLoading }: AnalyticsViewProps) {
  if (isLoading && !data) {
    return (
      <div className="flex-1 flex items-center justify-center p-12 bg-background">
        <div className="text-center space-y-3">
          <RefreshCw className="w-6 h-6 text-primary animate-spin mx-auto" />
          <p className="text-xs text-muted-foreground font-mono">Aggregating database statistics...</p>
        </div>
      </div>
    );
  }

  // Fallback defaults
  const trends = data?.request_trends || [];
  const bloodGroupDemand = data?.blood_group_demand || [];
  
  const responseData = data?.donor_response_rate
    ? [
        { name: "Accepted", value: data.donor_response_rate.Accepted, color: "#10b981" },
        { name: "Declined", value: data.donor_response_rate.Declined, color: "#dc2626" },
        { name: "Pending", value: data.donor_response_rate.Pending, color: "#f59e0b" },
      ]
    : [];

  const fulfillmentData = data?.fulfillment_rate
    ? [
        { name: "Fulfilled", value: data.fulfillment_rate.Fulfilled, color: "#10b981" },
        { name: "Active", value: data.fulfillment_rate.Active, color: "#f59e0b" },
        { name: "Canceled", value: data.fulfillment_rate.Canceled, color: "#6b7280" },
      ]
    : [];

  const agentPerformance = data?.ai_agent_performance || [];

  return (
    <div className="flex-1 p-6 overflow-y-auto space-y-6">
      {/* Top Section Chart: Request Volume Trend */}
      <div className="bg-card border border-border rounded-lg p-5">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-semibold text-foreground">7-Day Incident Trend (Intake Volumes)</h2>
        </div>
        <div className="h-64 w-full text-xs font-mono">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" stroke="#888888" tickLine={false} />
              <YAxis stroke="#888888" tickLine={false} allowDecimals={false} />
              <Tooltip
                contentStyle={{ background: "#ffffff", borderColor: "#e5e7eb", borderRadius: "6px" }}
                labelClassName="font-bold text-foreground"
              />
              <Line
                type="monotone"
                dataKey="requests"
                stroke="#dc2626"
                strokeWidth={2}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bottom Left: Blood Demand Bar Chart */}
        <div className="bg-card border border-border rounded-lg p-5">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-semibold text-foreground">Total Required Units by Blood Group</h2>
          </div>
          <div className="h-64 w-full text-xs font-mono">
            {bloodGroupDemand.length === 0 ? (
              <div className="h-full flex items-center justify-center text-muted-foreground text-xs">
                No active demand records.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={bloodGroupDemand} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="blood_group" stroke="#888888" tickLine={false} />
                  <YAxis stroke="#888888" tickLine={false} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ background: "#ffffff", borderColor: "#e5e7eb", borderRadius: "6px" }}
                  />
                  <Bar dataKey="units" fill="#dc2626" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Bottom Right: Agent Productivity and Interaction Distribution */}
        <div className="bg-card border border-border rounded-lg p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Cpu className="w-4 h-4 text-primary" />
              <h2 className="text-sm font-semibold text-foreground">AI Agents Activity Metrics</h2>
            </div>
            <div className="h-60 w-full text-xs font-mono">
              {agentPerformance.length === 0 ? (
                <div className="h-full flex items-center justify-center text-muted-foreground text-xs">
                  No AI metrics captured.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={agentPerformance} layout="vertical" margin={{ top: 10, right: 10, left: 15, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis type="number" stroke="#888888" tickLine={false} />
                    <YAxis dataKey="agent_name" type="category" stroke="#888888" tickLine={false} width={100} />
                    <Tooltip
                      contentStyle={{ background: "#ffffff", borderColor: "#e5e7eb", borderRadius: "6px" }}
                    />
                    <Bar dataKey="count" fill="#3b82f6" radius={[0, 4, 4, 0]}>
                      {agentPerformance.map((entry, index) => {
                        let color = "#ef4444"; // Intake
                        if (entry.agent_name.includes("Matcher")) color = "#3b82f6"; // Matcher
                        else if (entry.agent_name.includes("Outreach")) color = "#f59e0b"; // Outreach
                        else if (entry.agent_name.includes("Conversation")) color = "#10b981"; // Conversation

                        return <Cell key={`cell-${index}`} fill={color} />;
                      })}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Grid of Pie Charts (Fulfillment and Response Shares) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Donor Response Breakdown */}
        <div className="bg-card border border-border rounded-lg p-5">
          <div className="flex items-center gap-2 mb-4">
            <PieIcon className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-semibold text-foreground">Donor Response Share</h2>
          </div>
          <div className="flex items-center justify-around h-48">
            <div className="h-44 w-44">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={responseData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={70}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {responseData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-2 text-xs font-mono">
              {responseData.map((r, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: r.color }} />
                  <span className="text-muted-foreground">{r.name}:</span>
                  <span className="font-bold text-foreground">{r.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Fulfillment Rate Share */}
        <div className="bg-card border border-border rounded-lg p-5">
          <div className="flex items-center gap-2 mb-4">
            <PieIcon className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-semibold text-foreground">Dispatch Case Statuses</h2>
          </div>
          <div className="flex items-center justify-around h-48">
            <div className="h-44 w-44">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={fulfillmentData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={70}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {fulfillmentData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-2 text-xs font-mono">
              {fulfillmentData.map((r, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: r.color }} />
                  <span className="text-muted-foreground">{r.name}:</span>
                  <span className="font-bold text-foreground">{r.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
