"use client";

import React, { useState, useEffect } from "react";
import type { BloodRequest, RequestDetail, BloodRequestCreate } from "@/lib/types";
import {
  getRequests,
  getRequestDetail,
  createRequest,
  launchNextWave,
  fulfillRequest,
  escalateRequest,
} from "@/lib/api";
import { formatDateTime } from "@/lib/utils";
import {
  Search,
  Filter,
  Plus,
  X,
  Activity,
  User,
  MapPin,
  Clock,
  Sparkles,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Layers,
  ChevronRight,
  TrendingUp,
} from "lucide-react";

interface RequestsViewProps {
  selectedRequestId?: number | null;
  onSelectRequest: (id: number | null) => void;
  onActionTriggered?: () => void; // Trigger a refresh on parent components
}

export default function RequestsView({
  selectedRequestId,
  onSelectRequest,
  onActionTriggered,
}: RequestsViewProps) {
  // Lists and filters
  const [requests, setRequests] = useState<BloodRequest[]>([]);
  const [hospitalFilter, setHospitalFilter] = useState("");
  const [bloodGroupFilter, setBloodGroupFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);

  // Detail panel
  const [detail, setDetail] = useState<RequestDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // New Request Form Modal
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState<BloodRequestCreate>({
    patient_id: "",
    hospital: "Indus Hospital",
    blood_group: "O-",
    units_required: 1,
    urgency: "High",
  });
  const [requesterEmail, setRequesterEmail] = useState("");
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  // Wave/Escalate actions loading state
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Load request list
  const loadRequests = async () => {
    setLoading(true);
    try {
      const data = await getRequests({
        hospital: hospitalFilter || undefined,
        blood_group: bloodGroupFilter || undefined,
        status: statusFilter || undefined,
      });
      setRequests(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // Load detail panel for selected request
  const loadDetail = async (id: number) => {
    setDetailLoading(true);
    try {
      const data = await getRequestDetail(id);
      setDetail(data);
    } catch (e) {
      console.error(e);
    } finally {
      setDetailLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, [hospitalFilter, bloodGroupFilter, statusFilter]);

  useEffect(() => {
    if (selectedRequestId) {
      loadDetail(selectedRequestId);
    } else {
      setDetail(null);
    }
  }, [selectedRequestId]);

  // Handle request actions
  const handleLaunchWave = async () => {
    if (!selectedRequestId) return;
    setActionLoading("wave");
    try {
      await launchNextWave(selectedRequestId);
      await loadDetail(selectedRequestId);
      if (onActionTriggered) onActionTriggered();
    } catch (e) {
      alert("Failed to launch next wave: " + e);
    } finally {
      setActionLoading(null);
    }
  };

  const handleFulfill = async () => {
    if (!selectedRequestId) return;
    setActionLoading("fulfill");
    try {
      await fulfillRequest(selectedRequestId);
      await loadDetail(selectedRequestId);
      await loadRequests();
      if (onActionTriggered) onActionTriggered();
    } catch (e) {
      alert("Failed to fulfill request: " + e);
    } finally {
      setActionLoading(null);
    }
  };

  const handleEscalate = async () => {
    if (!selectedRequestId) return;
    setActionLoading("escalate");
    try {
      await escalateRequest(selectedRequestId);
      await loadDetail(selectedRequestId);
      await loadRequests();
      if (onActionTriggered) onActionTriggered();
    } catch (e) {
      alert("Failed to escalate request: " + e);
    } finally {
      setActionLoading(null);
    }
  };

  // Handle Form Submission
  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.patient_id || !formData.hospital) {
      setFormError("All fields are required.");
      return;
    }
    setFormSubmitting(true);
    setFormError("");
    try {
      const created = await createRequest(formData, requesterEmail || undefined);
      setShowModal(false);
      // Reset form
      setFormData({
        patient_id: "",
        hospital: "Indus Hospital",
        blood_group: "O-",
        units_required: 1,
        urgency: "High",
      });
      setRequesterEmail("");
      // Select the newly created request
      onSelectRequest(created.id);
      await loadRequests();
      if (onActionTriggered) onActionTriggered();
    } catch (err: any) {
      setFormError(err.message || "Failed to submit request.");
    } finally {
      setFormSubmitting(false);
    }
  };

  return (
    <div className="flex-1 flex overflow-hidden bg-background relative">
      {/* Main Table Column */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* On desktop, show border only when side panel visible */}
        {/* Filter bar */}
        <div className="p-3 sm:p-4 border-b border-border bg-card flex flex-wrap gap-2 sm:gap-3 items-center justify-between">
          <div className="flex flex-wrap items-center gap-2">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Filter hospital..."
                value={hospitalFilter}
                onChange={(e) => setHospitalFilter(e.target.value)}
                className="h-9 pl-9 pr-3 text-xs bg-background border border-border rounded-md text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 w-36 sm:w-44"
              />
            </div>

            {/* Blood Group Select */}
            <select
              value={bloodGroupFilter}
              onChange={(e) => setBloodGroupFilter(e.target.value)}
              className="h-9 px-3 text-xs bg-background border border-border rounded-md text-foreground focus:outline-none focus:border-primary/50 font-medium"
            >
              <option value="">All Blood Groups</option>
              {["O-", "O+", "A-", "A+", "B-", "B+", "AB-", "AB+"].map((g) => (
                <option key={g} value={g}>
                  {g} Group
                </option>
              ))}
            </select>

            {/* Status Select */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-9 px-3 text-xs bg-background border border-border rounded-md text-foreground focus:outline-none focus:border-primary/50 font-medium"
            >
              <option value="">All Statuses</option>
              <option value="Active">Active</option>
              <option value="Fulfilled">Fulfilled</option>
              <option value="Canceled">Canceled</option>
            </select>

            {/* Reset button if any filter active */}
            {(hospitalFilter || bloodGroupFilter || statusFilter) && (
              <button
                onClick={() => {
                  setHospitalFilter("");
                  setBloodGroupFilter("");
                  setStatusFilter("");
                }}
                className="h-9 px-3 text-xs border border-border hover:bg-muted/40 text-muted-foreground hover:text-foreground rounded-md transition-colors font-medium"
              >
                Clear
              </button>
            )}
          </div>

          <button
            onClick={() => setShowModal(true)}
            className="h-9 px-3 bg-primary hover:bg-primary/95 text-white text-xs font-semibold rounded-md flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Create Request</span>
          </button>
        </div>

        {/* Requests Table — horizontal scroll on mobile */}
        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="h-full flex items-center justify-center font-mono text-xs text-muted-foreground">
              <RefreshCw className="w-4 h-4 animate-spin mr-2 text-primary" />
              Refreshing dispatch catalog...
            </div>
          ) : requests.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-2">
              <Activity className="w-8 h-8 text-muted-foreground/45" />
              <p className="text-xs font-semibold text-foreground">No coordination logs found</p>
              <p className="text-[11px] text-muted-foreground">Try clearing filters or create a new blood dispatch request.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[560px]">
              <thead>
                <tr className="border-b border-border bg-muted/15 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider sticky top-0 z-1">
                  <th className="px-6 py-3.5">Request ID</th>
                  <th className="px-6 py-3.5">Patient ID</th>
                  <th className="px-6 py-3.5">Hospital</th>
                  <th className="px-6 py-3.5 text-center">Group</th>
                  <th className="px-6 py-3.5 text-center">Urgency</th>
                  <th className="px-6 py-3.5 text-center">Status</th>
                  <th className="px-6 py-3.5 text-right">Secured Progress</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {requests.map((req) => {
                  const isSelected = selectedRequestId === req.id;
                  const confirmedPct =
                    req.units_required > 0
                      ? (req.units_confirmed / req.units_required) * 100
                      : 100;
                  
                  // Status styles
                  let statusBadge = "bg-muted text-muted-foreground";
                  if (req.status === "Active") statusBadge = "bg-warning/10 text-warning";
                  else if (req.status === "Fulfilled") statusBadge = "bg-success/10 text-success";
                  else if (req.status === "Canceled") statusBadge = "bg-muted text-muted-foreground";

                  // Urgency styles
                  let urgencyBadge = "bg-muted text-muted-foreground";
                  if (req.urgency === "Critical") urgencyBadge = "bg-primary/10 text-primary";
                  else if (req.urgency === "High") urgencyBadge = "bg-warning/15 text-warning font-semibold";
                  else if (req.urgency === "Medium") urgencyBadge = "bg-success/10 text-success";

                  return (
                    <tr
                      key={req.id}
                      onClick={() => onSelectRequest(req.id)}
                      className={`hover:bg-muted/30 transition-colors cursor-pointer text-xs group ${
                        isSelected ? "bg-primary/[0.03] hover:bg-primary/[0.04]" : ""
                      }`}
                    >
                      <td className="px-6 py-4 font-mono font-medium text-foreground group-hover:text-primary transition-colors">
                        #{req.id}
                      </td>
                      <td className="px-6 py-4 font-mono text-muted-foreground">{req.patient_id}</td>
                      <td className="px-6 py-4 font-medium text-foreground">{req.hospital}</td>
                      <td className="px-6 py-4 text-center">
                        <span className="bg-primary/10 text-primary font-bold px-2 py-0.5 rounded text-[10px]">
                          {req.blood_group}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${urgencyBadge}`}>
                          {req.urgency}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${statusBadge}`}>
                          {req.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex flex-col items-end gap-1.5">
                          <span className="font-mono font-semibold">
                            {req.units_confirmed} / {req.units_required}
                          </span>
                          <div className="w-20 h-1 bg-border rounded-full overflow-hidden">
                            <div
                              className="h-full bg-success transition-all duration-300"
                              style={{ width: `${confirmedPct}%` }}
                            />
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

      {/* Detail panel: full-screen bottom sheet on mobile, side column on desktop */}
      {selectedRequestId && (
        <div className="
          fixed inset-0 z-30 bg-card flex flex-col
          sm:relative sm:inset-auto sm:w-[400px] sm:z-auto sm:border-l sm:border-border sm:shrink-0
        ">
          {/* Detail header */}
          <div className="p-4 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-primary" />
              <h2 className="text-sm font-semibold text-foreground">Request Details</h2>
              <span className="text-[11px] font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                #{selectedRequestId}
              </span>
            </div>
            <button
              onClick={() => onSelectRequest(null)}
              className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Details body */}
          {detailLoading && !detail ? (
            <div className="flex-1 flex items-center justify-center font-mono text-[10px] text-muted-foreground">
              <RefreshCw className="w-3.5 h-3.5 animate-spin mr-2" />
              Fetching coordinator log...
            </div>
          ) : detail ? (
            <div className="flex-1 overflow-y-auto p-5 space-y-6">
              {/* Basic Details Panel */}
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div className="bg-background border border-border p-3 rounded-md">
                    <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
                      <User className="w-3.5 h-3.5" />
                      <span className="text-[10px] font-medium uppercase tracking-wider">Patient ID</span>
                    </div>
                    <span className="font-semibold text-foreground font-mono">{detail.request.patient_id}</span>
                  </div>
                  <div className="bg-background border border-border p-3 rounded-md">
                    <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
                      <MapPin className="w-3.5 h-3.5" />
                      <span className="text-[10px] font-medium uppercase tracking-wider">Hospital</span>
                    </div>
                    <span className="font-semibold text-foreground leading-tight">{detail.request.hospital}</span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="border border-border p-4 rounded-md space-y-3 bg-background">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground font-medium">Secured blood units</span>
                    <span className="font-mono font-bold text-foreground">
                      {detail.request.units_confirmed} of {detail.request.units_required} units
                    </span>
                  </div>
                  <div className="w-full h-2.5 bg-border rounded-full overflow-hidden">
                    <div
                      className="h-full bg-success transition-all duration-300"
                      style={{ width: `${detail.progress_percentage}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-muted-foreground font-mono">
                    <span>Progress: {detail.progress_percentage}%</span>
                    <span>Required: {detail.request.units_required} ({detail.request.blood_group})</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons (Active states only) */}
              {detail.request.status === "Active" && (
                <div className="space-y-2 border-t border-border pt-4">
                  <h3 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Operator Interventions</h3>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={handleLaunchWave}
                      disabled={actionLoading !== null}
                      className="h-8 border border-border bg-card hover:bg-muted/40 text-foreground text-xs font-medium rounded-md flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
                    >
                      <Sparkles className={`w-3.5 h-3.5 text-primary ${actionLoading === "wave" ? "animate-spin" : ""}`} />
                      <span>Launch Next Wave</span>
                    </button>
                    <button
                      onClick={handleEscalate}
                      disabled={actionLoading !== null}
                      className="h-8 border border-border bg-card hover:bg-muted/40 text-foreground text-xs font-medium rounded-md flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
                    >
                      <AlertTriangle className={`w-3.5 h-3.5 text-warning ${actionLoading === "escalate" ? "animate-pulse" : ""}`} />
                      <span>Escalate to Critical</span>
                    </button>
                  </div>
                  <button
                    onClick={handleFulfill}
                    disabled={actionLoading !== null}
                    className="w-full h-8 bg-success hover:bg-success/90 text-white text-xs font-semibold rounded-md flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
                  >
                    <CheckCircle2 className={`w-3.5 h-3.5 ${actionLoading === "fulfill" ? "animate-spin" : ""}`} />
                    <span>Fulfill Request Manually</span>
                  </button>
                </div>
              )}

              {/* Live Donor Outreach Waves */}
              <div className="space-y-3 border-t border-border pt-4">
                <h3 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Outreach Waves ({detail.waves.length})
                </h3>
                
                {detail.waves.length === 0 ? (
                  <div className="text-center py-4 bg-muted/15 border border-border border-dashed rounded text-xs text-muted-foreground">
                    No waves launched. Launch a wave to start simulated outreach.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {detail.waves.map((wave) => (
                      <div key={wave.wave_number} className="border border-border rounded-md bg-background overflow-hidden">
                        <div className="bg-muted/30 px-3 py-2 border-b border-border flex items-center justify-between text-xs">
                          <span className="font-semibold text-foreground">Wave {wave.wave_number}</span>
                          <span className="text-[10px] text-muted-foreground font-mono">
                            {formatDateTime(wave.launched_at)}
                          </span>
                        </div>
                        <div className="divide-y divide-border/60">
                          {wave.donors.map((wd, idx) => {
                            let statColor = "text-muted-foreground";
                            if (wd.status === "Accepted") statColor = "text-success font-bold";
                            else if (wd.status === "Declined") statColor = "text-primary";
                            else if (wd.status === "Pending") statColor = "text-warning";

                            return (
                              <div key={idx} className="p-2.5 flex items-center justify-between text-xs">
                                <div>
                                  <p className="font-medium text-foreground">{wd.donor_name}</p>
                                  <p className="text-[10px] text-muted-foreground font-mono">{wd.phone}</p>
                                </div>
                                <span className={`text-[10px] uppercase font-semibold ${statColor}`}>
                                  {wd.status}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Timeline Events */}
              <div className="space-y-3 border-t border-border pt-4">
                <h3 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Audit Timeline
                </h3>
                <div className="relative pl-4 space-y-4 before:absolute before:left-[5px] before:top-2 before:bottom-2 before:w-[1px] before:bg-border">
                  {detail.timeline.map((event) => (
                    <div key={event.id} className="relative text-xs">
                      {/* Timeline dot */}
                      <span className="absolute -left-[15px] top-1.5 w-2 h-2 rounded-full border border-card bg-primary" />
                      <div className="flex items-center justify-between text-[10px] text-muted-foreground font-mono mb-0.5">
                        <span>{formatDateTime(event.event_time)}</span>
                      </div>
                      <p className="text-foreground leading-relaxed font-medium">
                        {event.event_content}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center p-6 text-muted-foreground text-xs text-center font-mono">
              Unable to load details.
            </div>
          )}
        </div>
      )}

      {/* Creation Modal Dialog */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 animate-fade-in p-4">
          <div className="bg-card border border-border rounded-lg max-w-md w-full shadow-2xl overflow-hidden animate-slide-up">
            <div className="px-5 py-4 border-b border-border flex items-center justify-between bg-muted/15">
              <div className="flex items-center gap-2">
                <Plus className="w-4.5 h-4.5 text-primary" />
                <h2 className="text-sm font-semibold text-foreground">Create Dispatch Request</h2>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitRequest} className="p-5 space-y-4">
              {formError && (
                <div className="p-3 bg-primary/10 border border-primary/20 text-primary text-xs rounded font-medium flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Patient ID */}
              <div className="space-y-1">
                <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Patient ID (Mono)
                </label>
                <input
                  type="text"
                  placeholder="e.g. PT-88421"
                  required
                  value={formData.patient_id}
                  onChange={(e) => setFormData({ ...formData, patient_id: e.target.value })}
                  className="w-full h-9 px-3 text-xs bg-background border border-border rounded-md text-foreground placeholder-muted-foreground font-mono focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20"
                />
              </div>

              {/* Hospital */}
              <div className="space-y-1">
                <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Hospital Location
                </label>
                <select
                  required
                  value={formData.hospital}
                  onChange={(e) => setFormData({ ...formData, hospital: e.target.value })}
                  className="w-full h-9 px-3 text-xs bg-background border border-border rounded-md text-foreground focus:outline-none focus:border-primary/50"
                >
                  <option value="Indus Hospital">Indus Hospital</option>
                  <option value="Civil Hospital">Civil Hospital</option>
                  <option value="Gulshan-e-Iqbal">Gulshan-e-Iqbal</option>
                  <option value="North Nazimabad">North Nazimabad</option>
                  <option value="DHA">DHA</option>
                  <option value="Korangi">Korangi</option>
                  <option value="Clifton">Clifton</option>
                </select>
              </div>

              {/* Blood Group & Required Units */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Blood Group
                  </label>
                  <select
                    required
                    value={formData.blood_group}
                    onChange={(e) => setFormData({ ...formData, blood_group: e.target.value })}
                    className="w-full h-9 px-3 text-xs bg-background border border-border rounded-md text-foreground focus:outline-none focus:border-primary/50 font-bold"
                  >
                    {["O-", "O+", "A-", "A+", "B-", "B+", "AB-", "AB+"].map((g) => (
                      <option key={g} value={g}>
                        {g} Group
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Units Required
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    required
                    value={formData.units_required}
                    onChange={(e) =>
                      setFormData({ ...formData, units_required: parseInt(e.target.value) || 1 })
                    }
                    className="w-full h-9 px-3 text-xs bg-background border border-border rounded-md text-foreground font-mono focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20"
                  />
                </div>
              </div>

              {/* Urgency */}
              <div className="space-y-1">
                <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Urgency Level
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {["Low", "Medium", "High", "Critical"].map((lvl) => (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => setFormData({ ...formData, urgency: lvl })}
                      className={`h-8 text-xs font-semibold rounded-md border transition-all ${
                        formData.urgency === lvl
                          ? "bg-primary text-white border-primary"
                          : "bg-background text-muted-foreground border-border hover:bg-muted/40 hover:text-foreground"
                      }`}
                    >
                      {lvl}
                    </button>
                  ))}
                </div>
              </div>

              {/* Requester Notification Tracking Email */}
              <div className="space-y-1 border-t border-border pt-4">
                <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Notification Tracking Email (Optional)
                </label>
                <input
                  type="email"
                  placeholder="operator@system.com"
                  value={requesterEmail}
                  onChange={(e) => setRequesterEmail(e.target.value)}
                  className="w-full h-9 px-3 text-xs bg-background border border-border rounded-md text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20"
                />
                <span className="text-[9px] text-muted-foreground">
                  Simulates sending a request status email report to the coordinator/requester.
                </span>
              </div>

              {/* Form Actions */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="h-9 px-4 text-xs font-semibold border border-border text-foreground hover:bg-muted/40 rounded-md transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="h-9 px-4 bg-primary hover:bg-primary/95 text-white text-xs font-semibold rounded-md flex items-center gap-1.5 transition-colors disabled:opacity-50"
                >
                  {formSubmitting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>Intake Request</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
