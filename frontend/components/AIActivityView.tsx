"use client";

import React, { useState } from "react";
import type { AILog } from "@/lib/types";
import { formatDateTime } from "@/lib/utils";
import {
  Terminal,
  Search,
  Filter,
  RefreshCw,
  Cpu,
  Brain,
  MessageSquare,
  Sparkles,
} from "lucide-react";

interface AIActivityViewProps {
  logs: AILog[];
  onRefresh: () => void;
  onRequestClick: (id: number) => void;
  isLoading: boolean;
}

export default function AIActivityView({
  logs,
  onRefresh,
  onRequestClick,
  isLoading,
}: AIActivityViewProps) {
  const [filterAgent, setFilterAgent] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredLogs = logs.filter((log) => {
    const matchesAgent = filterAgent ? log.agent_name === filterAgent : true;
    const matchesSearch = searchQuery
      ? log.action_taken.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (log.request_id && log.request_id.toString().includes(searchQuery))
      : true;
    return matchesAgent && matchesSearch;
  });

  return (
    <div className="flex-1 flex flex-col bg-background overflow-hidden">
      {/* Control / Filter Bar */}
      <div className="p-4 border-b border-border bg-card flex flex-wrap gap-3 items-center justify-between">
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Text Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search action logs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 pl-9 pr-3 text-xs bg-background border border-border rounded-md text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary/50 w-52"
            />
          </div>

          {/* Agent Filter Select */}
          <select
            value={filterAgent}
            onChange={(e) => setFilterAgent(e.target.value)}
            className="h-9 px-3 text-xs bg-background border border-border rounded-md text-foreground focus:outline-none focus:border-primary/50 font-medium"
          >
            <option value="">All AI Agents</option>
            <option value="Intake Agent">Intake Agent</option>
            <option value="Matcher Agent">Matcher Agent</option>
            <option value="Outreach Agent">Outreach Agent</option>
            <option value="Conversation Agent">Conversation Agent</option>
          </select>

          {/* Reset button if filter active */}
          {(filterAgent || searchQuery) && (
            <button
              onClick={() => {
                setFilterAgent("");
                setSearchQuery("");
              }}
              className="h-9 px-3 text-xs border border-border hover:bg-muted/40 text-muted-foreground hover:text-foreground rounded-md transition-colors font-medium"
            >
              Clear
            </button>
          )}
        </div>

        {/* Refresh Feed action */}
        <button
          onClick={onRefresh}
          disabled={isLoading}
          className="h-9 px-3 border border-border hover:bg-muted/40 text-foreground text-xs font-semibold rounded-md flex items-center gap-1.5 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
          <span>Refresh Console</span>
        </button>
      </div>

      {/* High-density terminal layout */}
      <div className="flex-1 p-4 sm:p-6 overflow-auto bg-foreground/[0.02] font-mono">
        <div className="max-w-4xl mx-auto bg-card border border-border rounded-lg shadow-sm flex flex-col" style={{minHeight: 300}}>
          {/* Console Header Bar */}
          <div className="bg-muted/20 border-b border-border px-4 py-2 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold text-foreground">
              <Terminal className="w-3.5 h-3.5 text-primary" />
              <span>AI Dispatch Audit Trails</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-success" />
              <span className="text-[10px] text-muted-foreground">Connected</span>
            </div>
          </div>

          {/* Logs feed stream */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5 text-xs">
            {filteredLogs.length === 0 ? (
              <div className="h-full flex items-center justify-center text-muted-foreground text-center">
                Console buffer empty. No logs match criteria.
              </div>
            ) : (
              filteredLogs.map((log) => {
                // Determine icon and badges
                let AgentIcon = Cpu;
                let badgeColor = "bg-muted text-muted-foreground border-border";
                if (log.agent_name === "Intake Agent") {
                  AgentIcon = Sparkles;
                  badgeColor = "bg-primary/5 text-primary border-primary/10";
                } else if (log.agent_name === "Matcher Agent") {
                  AgentIcon = Brain;
                  badgeColor = "bg-sky-500/10 text-sky-600 border-sky-500/20";
                } else if (log.agent_name === "Outreach Agent") {
                  AgentIcon = Cpu;
                  badgeColor = "bg-warning/10 text-warning border-warning/20";
                } else if (log.agent_name === "Conversation Agent") {
                  AgentIcon = MessageSquare;
                  badgeColor = "bg-success/10 text-success border-success/20";
                }

                return (
                  <div
                    key={log.id}
                    className="p-3 border border-border/55 rounded-md hover:bg-muted/15 transition-all flex items-start gap-3 group"
                  >
                    <div className="w-7 h-7 rounded bg-muted/30 border border-border/80 flex items-center justify-center shrink-0">
                      <AgentIcon className="w-3.5 h-3.5 text-muted-foreground" strokeWidth={1.5} />
                    </div>

                    <div className="flex-1 space-y-1.5 min-w-0">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className={`px-2 py-0.5 border rounded text-[10px] font-bold tracking-tight ${badgeColor}`}>
                          {log.agent_name}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {formatDateTime(log.timestamp)}
                        </span>
                      </div>

                      <p className="text-foreground text-[11px] leading-relaxed break-words font-mono">
                        {log.action_taken}
                      </p>

                      {log.request_id && (
                        <div className="text-[10px] text-muted-foreground/80 flex items-center gap-1 font-mono">
                          <span>Target Request Link:</span>
                          <button
                            onClick={() => onRequestClick(log.request_id!)}
                            className="underline text-primary hover:text-primary/80 font-bold"
                          >
                            #{log.request_id}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
