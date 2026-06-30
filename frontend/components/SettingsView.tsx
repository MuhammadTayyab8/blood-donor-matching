"use client";

import React, { useState, useEffect } from "react";
import type { SystemSettings } from "@/lib/types";
import { getSettings, updateSettings } from "@/lib/api";
import {
  Settings,
  ShieldAlert,
  Sparkles,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ToggleRight,
  Sliders,
} from "lucide-react";

export default function SettingsView() {
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState("");

  const [activeSection, setActiveSection] = useState<"general" | "dispatch" | "channels">("dispatch");

  const loadSettings = async () => {
    setLoading(true);
    try {
      const data = await getSettings();
      setSettings(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;
    setSaving(true);
    setSaveSuccess(false);
    setSaveError("");
    try {
      const updated = await updateSettings(settings);
      setSettings(updated);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (e: any) {
      setSaveError(e.message || "Failed to save settings.");
    } finally {
      setSaving(false);
    }
  };

  if (loading && !settings) {
    return (
      <div className="flex-1 flex items-center justify-center p-12 bg-background font-mono text-xs text-muted-foreground">
        <RefreshCw className="w-4 h-4 animate-spin mr-2" />
        Reading system parameters...
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col md:flex-row overflow-hidden bg-background">
      {/* Settings sub-navigation — horizontal tabs on mobile, vertical sidebar on md+ */}
      <div className="md:w-48 border-b md:border-b-0 md:border-r border-border bg-card flex flex-row md:flex-col py-2 md:py-4 gap-0 md:gap-0 shrink-0 overflow-x-auto">
        <div className="px-4 md:px-5 py-1 md:pb-2 mb-0 md:mb-2 md:border-b border-border/50 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider hidden md:block">
          Configuration
        </div>
        <button
          onClick={() => setActiveSection("dispatch")}
          className={`shrink-0 text-left px-4 md:px-5 py-2 md:py-2 text-xs font-semibold border-b-2 md:border-b-0 md:border-l-2 transition-colors ${
            activeSection === "dispatch"
              ? "border-primary text-primary bg-primary/5"
              : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/40"
          }`}
        >
          Dispatch Agent
        </button>
        <button
          onClick={() => setActiveSection("channels")}
          className="shrink-0 text-left px-4 md:px-5 py-2 text-xs font-semibold border-b-2 md:border-b-0 md:border-l-2 border-transparent text-muted-foreground opacity-50 cursor-not-allowed"
          disabled
        >
          Channels
        </button>
      </div>

      {/* Settings right form panel */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 max-w-2xl">
        <form onSubmit={handleSave} className="space-y-6">
          <div className="space-y-1">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
              <Sliders className="w-4 h-4 text-primary" />
              <span>Orchestrator Settings</span>
            </h2>
            <p className="text-[11px] text-muted-foreground">
              Define the AI agent search parameters, multipliers, and warning thresholds.
            </p>
          </div>

          {saveSuccess && (
            <div className="p-3 bg-success/10 border border-success/20 text-success text-xs rounded font-semibold flex items-center gap-1.5 animate-fade-in">
              <CheckCircle2 className="w-4 h-4" />
              <span>Configuration saved successfully. AI database updated.</span>
            </div>
          )}

          {saveError && (
            <div className="p-3 bg-primary/10 border border-primary/20 text-primary text-xs rounded font-semibold flex items-center gap-1.5 animate-fade-in">
              <AlertCircle className="w-4 h-4" />
              <span>{saveError}</span>
            </div>
          )}

          {settings && activeSection === "dispatch" && (
            <div className="space-y-4">
              {/* Wave Multiplier */}
              <div className="grid grid-cols-3 items-center gap-4 py-3 border-b border-border/60">
                <div className="col-span-2 space-y-0.5">
                  <label className="text-xs font-semibold text-foreground block">
                    Outreach Multiplier
                  </label>
                  <span className="text-[10px] text-muted-foreground block">
                    Number of matching donors contacted per unit needed. Formula: units * multiplier.
                  </span>
                </div>
                <input
                  type="number"
                  min="1"
                  max="10"
                  required
                  value={settings.wave_multiplier}
                  onChange={(e) =>
                    setSettings({ ...settings, wave_multiplier: parseInt(e.target.value) || 1 })
                  }
                  className="h-9 px-3 text-xs bg-background border border-border rounded-md text-foreground font-mono focus:outline-none focus:border-primary/50 text-right"
                />
              </div>

              {/* Max Waves */}
              <div className="grid grid-cols-3 items-center gap-4 py-3 border-b border-border/60">
                <div className="col-span-2 space-y-0.5">
                  <label className="text-xs font-semibold text-foreground block">
                    Max Wave Dispatches
                  </label>
                  <span className="text-[10px] text-muted-foreground block">
                    The limit of sequential donor outreach lists generated before triggering manual escalation.
                  </span>
                </div>
                <input
                  type="number"
                  min="1"
                  max="10"
                  required
                  value={settings.max_waves}
                  onChange={(e) =>
                    setSettings({ ...settings, max_waves: parseInt(e.target.value) || 1 })
                  }
                  className="h-9 px-3 text-xs bg-background border border-border rounded-md text-foreground font-mono focus:outline-none focus:border-primary/50 text-right"
                />
              </div>

              {/* Follow-up Delay */}
              <div className="grid grid-cols-3 items-center gap-4 py-3 border-b border-border/60">
                <div className="col-span-2 space-y-0.5">
                  <label className="text-xs font-semibold text-foreground block">
                    Escalation Window (Seconds)
                  </label>
                  <span className="text-[10px] text-muted-foreground block">
                    Seconds to wait for donor response before dispatching the subsequent wave.
                  </span>
                </div>
                <input
                  type="number"
                  min="10"
                  max="3600"
                  required
                  value={settings.follow_up_delay}
                  onChange={(e) =>
                    setSettings({ ...settings, follow_up_delay: parseInt(e.target.value) || 60 })
                  }
                  className="h-9 px-3 text-xs bg-background border border-border rounded-md text-foreground font-mono focus:outline-none focus:border-primary/50 text-right"
                />
              </div>

              {/* Emergency Threshold */}
              <div className="grid grid-cols-3 items-center gap-4 py-3 border-b border-border/60">
                <div className="col-span-2 space-y-0.5">
                  <label className="text-xs font-semibold text-foreground block">
                    Urgent Alert Threshold
                  </label>
                  <span className="text-[10px] text-muted-foreground block">
                    Fewer remaining secured units than this threshold triggers automated priority escalation.
                  </span>
                </div>
                <input
                  type="number"
                  min="0"
                  max="10"
                  required
                  value={settings.emergency_threshold}
                  onChange={(e) =>
                    setSettings({ ...settings, emergency_threshold: parseInt(e.target.value) || 0 })
                  }
                  className="h-9 px-3 text-xs bg-background border border-border rounded-md text-foreground font-mono focus:outline-none focus:border-primary/50 text-right"
                />
              </div>

              {/* Communication Channels */}
              <div className="grid grid-cols-3 items-center gap-4 py-3">
                <div className="col-span-2 space-y-0.5">
                  <label className="text-xs font-semibold text-foreground block">
                    Preferred Channels
                  </label>
                  <span className="text-[10px] text-muted-foreground block">
                    Communication channels used for simulated matching. Separate with commas.
                  </span>
                </div>
                <input
                  type="text"
                  required
                  value={settings.preferred_channels}
                  onChange={(e) =>
                    setSettings({ ...settings, preferred_channels: e.target.value })
                  }
                  className="h-9 px-3 text-xs bg-background border border-border rounded-md text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary/50 text-right"
                />
              </div>
            </div>
          )}

          {/* Form Submit bar */}
          <div className="flex items-center justify-end border-t border-border pt-4">
            <button
              type="submit"
              disabled={saving}
              className="h-9 px-5 bg-primary hover:bg-primary/95 text-white text-xs font-semibold rounded-md flex items-center gap-1.5 transition-colors disabled:opacity-50"
            >
              {saving && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
              <span>Save System Parameters</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
