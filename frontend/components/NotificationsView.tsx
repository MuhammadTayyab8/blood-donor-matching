"use client";

import React, { useState, useEffect } from "react";
import type { SystemNotification } from "@/lib/types";
import { getNotifications } from "@/lib/api";
import { formatDateTime } from "@/lib/utils";
import {
  Bell,
  Mail,
  MessageSquare,
  RefreshCw,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  X,
  Terminal,
} from "lucide-react";

interface NotificationsViewProps {
  notifications: SystemNotification[];
  onRefresh: () => void;
  isLoading: boolean;
  onActionTriggered?: () => void; // Reload data when sandbox actions happen
}

interface MockEmail {
  id: number;
  to: string;
  subject: string;
  body: string;
  sent_at: string;
}

interface MockWhatsApp {
  phone: string;
  message: string;
  timestamp: string;
}

export default function NotificationsView({
  notifications,
  onRefresh,
  isLoading,
  onActionTriggered,
}: NotificationsViewProps) {
  // Sandbox states
  const [sandboxTab, setSandboxTab] = useState<"emails" | "whatsapp">("emails");
  const [emails, setEmails] = useState<MockEmail[]>([]);
  const [selectedEmail, setSelectedEmail] = useState<MockEmail | null>(null);
  const [whatsappLogs, setWhatsappLogs] = useState<MockWhatsApp[]>([]);
  const [sandboxLoading, setSandboxLoading] = useState(false);

  // Interaction result modal state
  const [interactionUrl, setInteractionUrl] = useState<string | null>(null);
  const [interactionResult, setInteractionResult] = useState<string | null>(null);
  const [interactionLoading, setInteractionLoading] = useState(false);

  const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  // Fetch sandbox data
  const loadSandboxData = async () => {
    setSandboxLoading(true);
    try {
      // Fetch mock emails
      const emailRes = await fetch(`${API_BASE}/api/notifications/emails`);
      if (emailRes.ok) {
        const emailData = await emailRes.json();
        // Sort reverse chronological
        const sortedEmails = [...emailData].sort((a, b) => b.id - a.id);
        setEmails(sortedEmails);
        if (sortedEmails.length > 0 && !selectedEmail) {
          setSelectedEmail(sortedEmails[0]);
        }
      }

      // Fetch mock whatsapp logs
      const waRes = await fetch(`${API_BASE}/api/notifications/whatsapp`);
      if (waRes.ok) {
        const waData = await waRes.json();
        // WhatsApp response comes back as array of [phone, msg, timestamp] or similar objects
        // Let's normalize it to {phone, message, timestamp}
        const normalized = waData.map((item: any) => ({
          phone: item.phone || item[0] || "Unknown",
          message: item.message || item[1] || "",
          timestamp: item.timestamp || item[2] || new Date().toISOString(),
        }));
        // Sort reverse chronological
        normalized.sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        setWhatsappLogs(normalized);
      }
    } catch (e) {
      console.error("Error loading sandbox data:", e);
    } finally {
      setSandboxLoading(false);
    }
  };

  useEffect(() => {
    loadSandboxData();
  }, []);

  // Handle mock link click inside the email
  const handleSandboxLinkClick = async (url: string) => {
    setInteractionLoading(true);
    setInteractionUrl(url);
    try {
      // Force API base domain if relative
      let requestUrl = url;
      if (url.startsWith("/")) {
        requestUrl = `${API_BASE}${url}`;
      } else if (!url.startsWith("http")) {
        // Fallback
        requestUrl = `${API_BASE}/${url}`;
      }

      const res = await fetch(requestUrl);
      const htmlText = await res.text();
      setInteractionResult(htmlText);

      // Refresh data models since db changed
      await loadSandboxData();
      onRefresh();
      if (onActionTriggered) onActionTriggered();
    } catch (e) {
      setInteractionResult(`
        <div style="padding: 20px; font-family: sans-serif; text-align: center;">
          <h2 style="color: #e53e3e;">Connection Error</h2>
          <p>${e}</p>
        </div>
      `);
    } finally {
      setInteractionLoading(false);
    }
  };

  // Intercept click on links in dangerouslySetInnerHTML
  const handleEmailBodyClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    // Find closest anchor tag
    const anchor = target.closest("a");
    if (anchor) {
      const href = anchor.getAttribute("href");
      if (href && (href.includes("/api/interactions") || href.startsWith("/api/interactions"))) {
        e.preventDefault();
        handleSandboxLinkClick(href);
      }
    }
  };

  return (
    <div className="flex-1 flex flex-col lg:flex-row overflow-hidden bg-background">
      {/* Left Pane: System Notifications */}
      <div className="w-full lg:w-80 border-b lg:border-b-0 lg:border-r border-border bg-card flex flex-col max-h-64 lg:max-h-full lg:h-full shrink-0">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-semibold text-foreground">System Audit Inbox</h2>
          </div>
          <button
            onClick={onRefresh}
            disabled={isLoading}
            className="p-1.5 border border-border hover:bg-muted/40 rounded text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
            title="Refresh system notifications"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-border/60">
          {notifications.length === 0 ? (
            <div className="h-full flex items-center justify-center p-6 text-center text-xs text-muted-foreground font-mono">
              Notification buffer empty.
            </div>
          ) : (
            notifications.map((notif) => {
              // Notification type styles
              let iconColor = "text-muted-foreground bg-muted/40";
              if (notif.notification_type === "Wave Launch") {
                iconColor = "text-warning bg-warning/10 border border-warning/15";
              } else if (notif.notification_type === "Accept") {
                iconColor = "text-success bg-success/10 border border-success/15";
              } else if (notif.notification_type === "Complete") {
                iconColor = "text-success bg-success/20 border border-success/30 font-bold";
              } else if (notif.notification_type === "Escalation") {
                iconColor = "text-primary bg-primary/10 border border-primary/15";
              }

              return (
                <div key={notif.id} className="p-4 space-y-1.5 hover:bg-muted/10 transition-colors">
                  <div className="flex items-center justify-between">
                    <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${iconColor}`}>
                      {notif.notification_type}
                    </span>
                    <span className="text-[9px] text-muted-foreground font-mono">
                      {formatDateTime(notif.timestamp)}
                    </span>
                  </div>
                  <p className="text-[11px] leading-relaxed text-foreground font-medium">
                    {notif.message}
                  </p>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Right Pane: Communications Sandbox */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Sandbox Header */}
        <div className="p-4 border-b border-border bg-card flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-semibold text-foreground">Outbound Sandbox Simulator</h2>
            <span className="text-[9px] font-mono font-bold bg-success/15 text-success border border-success/20 px-2 py-0.5 rounded-full uppercase tracking-wider animate-pulse">
              Interactive sandbox
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={loadSandboxData}
              disabled={sandboxLoading}
              className="p-1.5 border border-border hover:bg-muted/40 rounded text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
              title="Refresh simulated channels"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${sandboxLoading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        {/* Sandbox Tabs */}
        <div className="bg-muted/15 border-b border-border flex items-center px-4">
          <button
            onClick={() => setSandboxTab("emails")}
            className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors flex items-center gap-2 ${
              sandboxTab === "emails"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Mail className="w-3.5 h-3.5" />
            <span>Simulated Outbox (Emails) ({emails.length})</span>
          </button>
          <button
            onClick={() => setSandboxTab("whatsapp")}
            className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors flex items-center gap-2 ${
              sandboxTab === "whatsapp"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Simulated SMS/WhatsApp Logs ({whatsappLogs.length})</span>
          </button>
        </div>

        {/* Sandbox Content Panel */}
        <div className="flex-1 flex overflow-hidden">
          {sandboxTab === "emails" ? (
            <div className="flex-1 flex overflow-hidden">
              {/* Emails List */}
              <div className="w-72 border-r border-border bg-card overflow-y-auto divide-y divide-border/60">
                {emails.length === 0 ? (
                  <div className="h-full flex items-center justify-center p-6 text-center text-xs text-muted-foreground font-mono">
                    No emails dispatched yet.
                  </div>
                ) : (
                  emails.map((email) => {
                    const isSelected = selectedEmail?.id === email.id;
                    return (
                      <button
                        key={email.id}
                        onClick={() => setSelectedEmail(email)}
                        className={`w-full text-left p-3.5 transition-colors block border-l-2 ${
                          isSelected
                            ? "bg-primary/[0.02] border-primary text-foreground"
                            : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/30"
                        }`}
                      >
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-[10px] font-mono text-primary font-bold">To: {email.to.split("@")[0]}</span>
                          <span className="text-[9px] text-muted-foreground font-mono">
                            {formatDateTime(email.sent_at)}
                          </span>
                        </div>
                        <h4 className="text-[11px] font-semibold text-foreground truncate">
                          {email.subject}
                        </h4>
                      </button>
                    );
                  })
                )}
              </div>

              {/* Selected Email Body */}
              <div className="flex-1 bg-background overflow-y-auto p-6">
                {selectedEmail ? (
                  <div className="max-w-xl mx-auto bg-card border border-border rounded-lg shadow-sm overflow-hidden flex flex-col h-[calc(100vh-290px)] min-h-[300px]">
                    {/* Mail Metadata Headers */}
                    <div className="bg-muted/15 border-b border-border p-4 space-y-1.5 text-xs text-muted-foreground font-mono">
                      <p>
                        <strong className="text-foreground">From:</strong> dispatcher@redline.life
                      </p>
                      <p>
                        <strong className="text-foreground">To:</strong> {selectedEmail.to}
                      </p>
                      <p>
                        <strong className="text-foreground">Subject:</strong> {selectedEmail.subject}
                      </p>
                      <p>
                        <strong className="text-foreground">Date:</strong> {formatDateTime(selectedEmail.sent_at)}
                      </p>
                    </div>

                    {/* Email HTML Contents with Click Interceptor */}
                    <div
                      onClick={handleEmailBodyClick}
                      className="flex-1 p-6 overflow-y-auto bg-white select-text"
                      dangerouslySetInnerHTML={{ __html: selectedEmail.body }}
                    />
                  </div>
                ) : (
                  <div className="h-full flex items-center justify-center text-muted-foreground text-xs font-mono">
                    Select a dispatched email to verify interactive links.
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* WhatsApp logs */
            <div className="flex-1 bg-background overflow-y-auto p-6 font-mono text-xs">
              <div className="max-w-2xl mx-auto space-y-4">
                {whatsappLogs.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    No simulated SMS/WhatsApp outreach logged.
                  </div>
                ) : (
                  whatsappLogs.map((wa, idx) => (
                    <div key={idx} className="bg-card border border-border rounded-lg p-4 flex items-start gap-4">
                      <div className="w-8 h-8 rounded-full bg-success/10 flex items-center justify-center text-success shrink-0 font-bold">
                        WA
                      </div>
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                          <span className="font-semibold text-foreground">Phone Target: {wa.phone}</span>
                          <span>{formatDateTime(wa.timestamp)}</span>
                        </div>
                        <p className="text-foreground leading-relaxed text-[11px]">
                          {wa.message}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Interactive link response popup */}
      {interactionUrl && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 animate-fade-in p-4">
          <div className="bg-card border border-border rounded-lg max-w-lg w-full shadow-2xl overflow-hidden animate-slide-up flex flex-col h-[400px]">
            {/* Header */}
            <div className="px-4 py-3 border-b border-border flex items-center justify-between bg-muted/15">
              <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                <Sparkles className="w-4 h-4 text-primary" />
                <span>Simulating External Callback Response</span>
              </div>
              <button
                onClick={() => {
                  setInteractionUrl(null);
                  setInteractionResult(null);
                }}
                className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Target URL banner */}
            <div className="bg-foreground/5 px-4 py-2 border-b border-border text-[9px] font-mono text-muted-foreground truncate select-text">
              GET: {interactionUrl}
            </div>

            {/* Result area */}
            <div className="flex-1 overflow-auto bg-white">
              {interactionLoading ? (
                <div className="h-full flex flex-col items-center justify-center space-y-3 font-mono text-xs text-muted-foreground">
                  <RefreshCw className="w-5 h-5 animate-spin text-primary" />
                  <span>Processing callback action...</span>
                </div>
              ) : interactionResult ? (
                <iframe
                  srcDoc={interactionResult}
                  className="w-full h-full border-none"
                  title="FastAPI HTML Response"
                />
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground text-xs font-mono">
                  No response loaded.
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-4 py-3 border-t border-border flex justify-end bg-muted/15">
              <button
                onClick={() => {
                  setInteractionUrl(null);
                  setInteractionResult(null);
                }}
                className="h-8 px-4 bg-foreground text-background text-xs font-semibold rounded-md hover:bg-foreground/90 transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
