"use client";

import React, { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { TelemetryProvider, useTelemetry } from "@/components/TelemetryProvider";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";

function DashboardLayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { notifications } = useTelemetry();

  // Close sidebar when viewport resizes to desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) setSidebarOpen(false);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const getHeaderTitle = (path: string) => {
    if (path === "/" || path === "/dashboard") return "Command Dashboard";
    if (path.startsWith("/requests")) return "Blood Dispatch Requests";
    if (path === "/donors") return "Donor Directories";
    if (path === "/hospitals") return "Hospital Hubs";
    if (path === "/ai-activity") return "AI Audit Trails";
    if (path === "/analytics") return "Analytics & Charts";
    if (path === "/notifications") return "Simulator Sandbox";
    if (path === "/settings") return "System Settings";
    return "BloodLink AI";
  };

  const unreadNotifsCount = notifications.filter((n) => !n.is_read).length;

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden font-sans">
      {/* Navigation Sidebar (desktop always-visible / mobile drawer) */}
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        unreadCount={unreadNotifsCount}
      />

      {/* Main container */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header
          title={getHeaderTitle(pathname)}
          unreadCount={unreadNotifsCount}
          onNotificationsClick={() => router.push("/notifications")}
          onMenuClick={() => setSidebarOpen(true)}
        />

        <main className="flex-1 flex overflow-hidden">{children}</main>
      </div>
    </div>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <TelemetryProvider>
      <DashboardLayoutContent>{children}</DashboardLayoutContent>
    </TelemetryProvider>
  );
}
