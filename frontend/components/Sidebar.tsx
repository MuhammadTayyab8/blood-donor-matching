"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Activity,
  Users,
  Grid,
  FileText,
  LineChart,
  Inbox,
  Settings as SettingsIcon,
  X,
} from "lucide-react";

export type TabId =
  | "dashboard"
  | "requests"
  | "donors"
  | "hospitals"
  | "ai-activity"
  | "analytics"
  | "notifications"
  | "settings";

interface SidebarProps {
  unreadCount?: number;
  isOpen: boolean;
  onClose: () => void;
}

const tabPathMap: Record<TabId, string> = {
  dashboard: "/dashboard",
  requests: "/requests",
  donors: "/donors",
  hospitals: "/hospitals",
  "ai-activity": "/ai-activity",
  analytics: "/analytics",
  notifications: "/notifications",
  settings: "/settings",
};

export default function Sidebar({
  unreadCount = 0,
  isOpen,
  onClose,
}: SidebarProps) {
  const pathname = usePathname();

  // Determine active tab based on path
  let currentTab: TabId | null = null;
  if (pathname === "/dashboard" || pathname.startsWith("/dashboard/")) currentTab = "dashboard";
  else if (pathname.startsWith("/requests")) currentTab = "requests";
  else if (pathname.startsWith("/donors")) currentTab = "donors";
  else if (pathname.startsWith("/hospitals")) currentTab = "hospitals";
  else if (pathname.startsWith("/ai-activity")) currentTab = "ai-activity";
  else if (pathname.startsWith("/analytics")) currentTab = "analytics";
  else if (pathname.startsWith("/notifications")) currentTab = "notifications";
  else if (pathname.startsWith("/settings")) currentTab = "settings";

  const navItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "requests", label: "Blood Requests", icon: Activity },
    { id: "donors", label: "Donors Directory", icon: Users },
    { id: "hospitals", label: "Hospitals", icon: Grid },
    { id: "ai-activity", label: "AI Activity Feed", icon: FileText },
    { id: "analytics", label: "Analytics", icon: LineChart },
    {
      id: "notifications",
      label: "Sandbox / Inbox",
      icon: Inbox,
      badge: unreadCount > 0 ? unreadCount : undefined,
    },
    { id: "settings", label: "Settings", icon: SettingsIcon },
  ] as const;

  return (
    <>
      {/* Mobile overlay backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar panel */}
      <aside
        className={`
          fixed top-0 left-0 h-full w-64 bg-card border-r border-border flex flex-col z-40
          transition-transform duration-250 ease-out
          lg:relative lg:translate-x-0 lg:w-60 lg:shrink-0
          ${isOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full lg:translate-x-0"}
        `}
      >
        {/* Brand row */}
        <div className="h-14 border-b border-border flex items-center justify-between px-5">
          <div className="flex items-center gap-2">
            <span className="text-xl" role="img" aria-label="blood drop">🩸</span>
            <span className="font-semibold text-foreground tracking-tight text-base">
              BloodLink AI
            </span>
          </div>
          {/* Close button on mobile */}
          <button
            onClick={onClose}
            className="lg:hidden p-1 rounded hover:bg-muted/40 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Close sidebar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Nav items */}
        <nav className="flex-1 py-4 space-y-0.5 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <Link
                key={item.id}
                href={tabPathMap[item.id]}
                onClick={onClose}
                className={`w-full flex items-center justify-between px-5 py-2.5 text-sm font-medium transition-all relative outline-none ${
                  isActive
                    ? "bg-primary/5 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                }`}
              >
                {isActive && (
                  <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-primary" />
                )}
                <div className="flex items-center gap-3">
                  <Icon
                    className={`w-4 h-4 shrink-0 ${isActive ? "text-primary" : "text-muted-foreground"}`}
                    strokeWidth={1.5}
                  />
                  <span>{item.label}</span>
                </div>
                {item.badge !== undefined && (
                  <span className="bg-primary/10 text-primary text-[10px] font-semibold px-2 py-0.5 rounded-full">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-border bg-background/50">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary shrink-0">
              OP
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-foreground truncate">Operator Panel</p>
              <p className="text-[10px] text-muted-foreground truncate">Emergency Dispatcher</p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}

