"use client";

import React from "react";
import { Bell, Menu } from "lucide-react";

interface HeaderProps {
  title: string;
  unreadCount?: number;
  onNotificationsClick?: () => void;
  onMenuClick?: () => void;
}

export default function Header({
  title,
  unreadCount = 0,
  onNotificationsClick,
  onMenuClick,
}: HeaderProps) {
  return (
    <header className="h-14 bg-card border-b border-border flex items-center justify-between px-4 sm:px-6 sticky top-0 z-10 shrink-0">
      {/* Left: hamburger (mobile) + breadcrumbs */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        {/* Mobile hamburger */}
        <button
          onClick={onMenuClick}
          className="lg:hidden p-1.5 rounded-md hover:bg-muted/40 text-muted-foreground hover:text-foreground transition-colors shrink-0"
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Breadcrumb — hide "BloodLink AI /" on small screens */}
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="hidden sm:block text-[11px] font-semibold text-muted-foreground uppercase tracking-wider shrink-0">
            BloodLink AI
          </span>
          <span className="hidden sm:block text-muted-foreground/60 text-xs">/</span>
          <h1 className="text-sm font-semibold text-foreground tracking-tight truncate">
            {title}
          </h1>
        </div>
      </div>

      {/* Right: status badge + notifications */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {/* Status badge — hidden on very small screens */}
        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded bg-success/10 text-success text-[10px] font-semibold select-none">
          <span className="w-1.5 h-1.5 bg-success rounded-full animate-pulse" />
          <span className="hidden md:inline">AI Systems Active</span>
          <span className="md:hidden">Live</span>
        </div>

        {/* Notifications bell */}
        <button
          onClick={onNotificationsClick}
          className="relative w-8 h-8 flex items-center justify-center rounded-md border border-border bg-card hover:bg-muted/40 transition-colors"
          aria-label="View notifications"
        >
          <Bell className="w-4 h-4 text-muted-foreground" strokeWidth={1.5} />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 w-2 h-2 bg-primary rounded-full ring-2 ring-card animate-pulse" />
          )}
        </button>
      </div>
    </header>
  );
}
