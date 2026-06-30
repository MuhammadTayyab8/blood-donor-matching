"use client";

import React, { useState, useEffect } from "react";
import type { Donor } from "@/lib/types";
import { getDonors, updateDonor, addDonor } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import {
  Search,
  Plus,
  X,
  MapPin,
  RefreshCw,
  Phone,
  Mail,
  User,
  ShieldCheck,
  Calendar,
  AlertCircle,
  ToggleLeft,
  ToggleRight,
  Pencil,
} from "lucide-react";

export default function DonorsView() {
  const [donors, setDonors] = useState<Donor[]>([]);
  const [bloodGroupFilter, setBloodGroupFilter] = useState("");
  const [hospitalLocation, setHospitalLocation] = useState("");
  const [loading, setLoading] = useState(true);

  // Add Donor Modal state
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    blood_group: "O-",
    location: "",
    is_available: true,
  });
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  // Edit Donor Modal state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editDonorId, setEditDonorId] = useState<number | null>(null);
  const [editData, setEditData] = useState({
    name: "",
    email: "",
    phone: "",
    blood_group: "O-",
    location: "",
    is_available: true,
    donation_count: 0,
    last_donation_date: "",
  });
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState("");

  const loadDonors = async () => {
    setLoading(true);
    try {
      const data = await getDonors({
        blood_group: bloodGroupFilter || undefined,
        hospital_location: hospitalLocation || undefined,
      });
      setDonors(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDonors();
  }, [bloodGroupFilter]);

  // Handle manual trigger for search proximity
  const handleProximitySearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadDonors();
  };

  // Toggle availability
  const handleToggleAvailability = async (donor: Donor) => {
    try {
      const updated = await updateDonor(donor.id, {
        is_available: !donor.is_available,
      });
      // Update local state
      setDonors((prev) =>
        prev.map((d) => (d.id === donor.id ? { ...d, is_available: updated.is_available } : d))
      );
    } catch (e) {
      alert("Failed to update availability: " + e);
    }
  };

  // Create Donor
  const handleCreateDonor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.phone || !formData.location) {
      setFormError("All fields are required.");
      return;
    }
    setFormSubmitting(true);
    setFormError("");
    try {
      await addDonor({
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        blood_group: formData.blood_group,
        location: formData.location,
        is_available: formData.is_available,
        latitude: 0,
        longitude: 0,
      });
      setShowModal(false);
      // Reset form
      setFormData({
        name: "",
        email: "",
        phone: "",
        blood_group: "O-",
        location: "",
        is_available: true,
      });
      await loadDonors();
    } catch (err: any) {
      setFormError(err.message || "Failed to add donor. Email might already be registered.");
    } finally {
      setFormSubmitting(false);
    }
  };

  // Open Edit Modal pre-filled with donor data
  const openEditModal = (donor: Donor) => {
    setEditDonorId(donor.id);
    setEditData({
      name: donor.name,
      email: donor.email,
      phone: donor.phone,
      blood_group: donor.blood_group,
      location: donor.location,
      is_available: donor.is_available,
      donation_count: donor.donation_count,
      last_donation_date: donor.last_donation_date || "",
    });
    setEditError("");
    setShowEditModal(true);
  };

  // Submit Edit Donor
  const handleEditDonor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editData.name || !editData.email || !editData.phone || !editData.location) {
      setEditError("Name, email, phone, and location are required.");
      return;
    }
    if (editDonorId === null) return;
    setEditSubmitting(true);
    setEditError("");
    try {
      await updateDonor(editDonorId, {
        name: editData.name,
        email: editData.email,
        phone: editData.phone,
        blood_group: editData.blood_group,
        location: editData.location,
        is_available: editData.is_available,
        donation_count: editData.donation_count,
        last_donation_date: editData.last_donation_date || null,
      });
      setShowEditModal(false);
      setEditDonorId(null);
      await loadDonors();
    } catch (err: any) {
      setEditError(err.message || "Failed to update donor profile.");
    } finally {
      setEditSubmitting(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-background overflow-hidden">
      {/* Top Filter and Search Bar */}
      <div className="p-4 border-b border-border bg-card flex flex-wrap gap-4 items-center justify-between">
        <form onSubmit={handleProximitySearch} className="flex flex-wrap items-center gap-2.5">
          {/* Proximity Location Search */}
          <div className="relative flex items-center">
            <MapPin className="w-3.5 h-3.5 text-muted-foreground absolute left-3" />
            <input
              type="text"
              placeholder="Sort by distance from hospital..."
              value={hospitalLocation}
              onChange={(e) => setHospitalLocation(e.target.value)}
              className="h-9 pl-9 pr-3 text-xs bg-background border border-border rounded-md text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary/50 w-60"
            />
            <button
              type="submit"
              className="h-7 px-2.5 bg-muted text-foreground text-[10px] font-semibold rounded hover:bg-muted/80 ml-2 border border-border"
            >
              Sort Proximity
            </button>
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

          {/* Clear Filters button */}
          {(bloodGroupFilter || hospitalLocation) && (
            <button
              type="button"
              onClick={() => {
                setBloodGroupFilter("");
                setHospitalLocation("");
                // Reload without filters
                setTimeout(() => {
                  loadDonors();
                }, 50);
              }}
              className="h-9 px-3 text-xs border border-border hover:bg-muted/40 text-muted-foreground hover:text-foreground rounded-md transition-colors font-medium"
            >
              Clear
            </button>
          )}
        </form>

        <button
          onClick={() => setShowModal(true)}
          className="h-9 px-3 bg-primary hover:bg-primary/95 text-white text-xs font-semibold rounded-md flex items-center gap-1.5 transition-colors shadow-sm animate-fade-in"
        >
          <Plus className="w-4 h-4" />
          <span>Register Donor</span>
        </button>
      </div>

      {/* Main Table Content */}
      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="h-full flex items-center justify-center font-mono text-xs text-muted-foreground">
            <RefreshCw className="w-4 h-4 animate-spin mr-2 text-primary" />
            Scanning database indexes...
          </div>
        ) : donors.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-2">
            <AlertCircle className="w-8 h-8 text-muted-foreground/45" />
            <p className="text-xs font-semibold text-foreground">No donors matched criteria</p>
            <p className="text-[11px] text-muted-foreground">Try clearing filters or register a new donor profile.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[640px]">
            <thead>
              <tr className="border-b border-border bg-muted/15 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider sticky top-0 z-1">
                <th className="px-6 py-3.5">Name</th>
                <th className="px-6 py-3.5">Blood Group</th>
                <th className="px-6 py-3.5">Contact Details</th>
                <th className="px-6 py-3.5">Location</th>
                {hospitalLocation && <th className="px-6 py-3.5 text-center">Distance</th>}
                <th className="px-6 py-3.5 text-center">Availability Status</th>
                <th className="px-6 py-3.5 text-right">Donations</th>
                <th className="px-6 py-3.5 text-right">Last Donation</th>
                <th className="px-6 py-3.5 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60 text-xs">
              {donors.map((donor) => (
                <tr key={donor.id} className="hover:bg-muted/30 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 bg-muted flex items-center justify-center rounded-full text-[10px] font-bold text-muted-foreground uppercase">
                        {donor.name.substring(0, 2)}
                      </div>
                      <div>
                        <p className="font-semibold text-foreground">{donor.name}</p>
                        <p className="text-[9px] text-muted-foreground font-mono">ID: #{donor.id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="bg-primary/10 text-primary font-bold px-2 py-0.5 rounded text-[10px]">
                      {donor.blood_group}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-muted-foreground space-y-0.5 font-mono text-[11px]">
                    <div className="flex items-center gap-1">
                      <Phone className="w-3 h-3 shrink-0 text-muted-foreground/60" />
                      <span>{donor.phone}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Mail className="w-3 h-3 shrink-0 text-muted-foreground/60" />
                      <span>{donor.email}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-foreground">
                    <div className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-muted-foreground/75" />
                      <span>{donor.location}</span>
                    </div>
                  </td>
                  {hospitalLocation && (
                    <td className="px-6 py-4 text-center font-semibold text-foreground font-mono">
                      {donor.distance_km !== undefined ? `${donor.distance_km} km` : "--"}
                    </td>
                  )}
                  <td className="px-6 py-4 text-center">
                    <button
                      onClick={() => handleToggleAvailability(donor)}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold transition-all ${
                        donor.is_available
                          ? "bg-success/10 text-success"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${donor.is_available ? "bg-success" : "bg-muted-foreground"}`} />
                      <span>{donor.is_available ? "Available" : "Unavailable"}</span>
                    </button>
                  </td>
                  <td className="px-6 py-4 text-right font-semibold text-foreground font-mono">
                    {donor.donation_count}
                  </td>
                  <td className="px-6 py-4 text-right text-muted-foreground font-mono">
                    {donor.last_donation_date ? formatDate(donor.last_donation_date) : "Never"}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <button
                      onClick={() => openEditModal(donor)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[10px] font-semibold border border-border bg-card hover:bg-muted/40 hover:border-primary/30 text-muted-foreground hover:text-foreground transition-all"
                      title="Edit donor profile"
                    >
                      <Pencil className="w-3 h-3" />
                      <span>Edit</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </div>

      {/* Add Donor Modal Dialog */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 animate-fade-in p-4">
          <div className="bg-card border border-border rounded-lg max-w-md w-full shadow-2xl overflow-hidden animate-slide-up">
            <div className="px-5 py-4 border-b border-border flex items-center justify-between bg-muted/15">
              <div className="flex items-center gap-2">
                <Plus className="w-4.5 h-4.5 text-primary" />
                <h2 className="text-sm font-semibold text-foreground">Register New Donor</h2>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateDonor} className="p-5 space-y-4 text-xs">
              {formError && (
                <div className="p-3 bg-primary/10 border border-primary/20 text-primary text-[11px] rounded font-medium flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Full Name */}
              <div className="space-y-1">
                <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Full Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Zainab Bibi"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full h-9 px-3 bg-background border border-border rounded-md text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary/50"
                />
              </div>

              {/* Email Address */}
              <div className="space-y-1">
                <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Email Address
                </label>
                <input
                  type="email"
                  placeholder="zainab.bibi@example.com"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full h-9 px-3 bg-background border border-border rounded-md text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary/50"
                />
              </div>

              {/* Contact Phone & Blood Group */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                    WhatsApp/Phone
                  </label>
                  <input
                    type="tel"
                    placeholder="+923001234567"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full h-9 px-3 bg-background border border-border rounded-md text-foreground placeholder-muted-foreground font-mono focus:outline-none focus:border-primary/50"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Blood Group
                  </label>
                  <select
                    required
                    value={formData.blood_group}
                    onChange={(e) => setFormData({ ...formData, blood_group: e.target.value })}
                    className="w-full h-9 px-3 bg-background border border-border rounded-md text-foreground focus:outline-none focus:border-primary/50 font-bold"
                  >
                    {["O-", "O+", "A-", "A+", "B-", "B+", "AB-", "AB+"].map((g) => (
                      <option key={g} value={g}>
                        {g} Group
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Location */}
              <div className="space-y-1">
                <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Neighborhood Location (Karachi Area)
                </label>
                <select
                  required
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className="w-full h-9 px-3 bg-background border border-border rounded-md text-foreground focus:outline-none focus:border-primary/50"
                >
                  <option value="">Select location...</option>
                  <option value="Gulshan-e-Iqbal">Gulshan-e-Iqbal</option>
                  <option value="Gulistan-e-Johar">Gulistan-e-Johar</option>
                  <option value="North Nazimabad">North Nazimabad</option>
                  <option value="Clifton">Clifton</option>
                  <option value="DHA">DHA</option>
                  <option value="Malir">Malir</option>
                  <option value="Korangi">Korangi</option>
                  <option value="Indus Hospital">Indus Hospital</option>
                </select>
              </div>

              {/* Initial Availability Toggle */}
              <div className="flex items-center justify-between border-t border-border pt-4">
                <div>
                  <p className="font-semibold text-foreground">Available for immediate contact</p>
                  <p className="text-[10px] text-muted-foreground">Will be included in AI matching and wave dispatches.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, is_available: !formData.is_available })}
                  className="p-1 text-primary hover:text-primary/80 transition-colors"
                >
                  {formData.is_available ? (
                    <ToggleRight className="w-9 h-9 text-success" />
                  ) : (
                    <ToggleLeft className="w-9 h-9 text-muted-foreground" />
                  )}
                </button>
              </div>

              {/* Form Actions */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="h-9 px-4 font-semibold border border-border text-foreground hover:bg-muted/40 rounded-md transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="h-9 px-4 bg-primary hover:bg-primary/95 text-white font-semibold rounded-md flex items-center gap-1.5 transition-colors disabled:opacity-50"
                >
                  {formSubmitting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>Add Profile</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Donor Modal Dialog */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 animate-fade-in p-4">
          <div className="bg-card border border-border rounded-lg max-w-md w-full shadow-2xl overflow-hidden animate-slide-up max-h-[90vh] flex flex-col">
            <div className="px-5 py-4 border-b border-border flex items-center justify-between bg-muted/15">
              <div className="flex items-center gap-2">
                <Pencil className="w-4.5 h-4.5 text-primary" />
                <h2 className="text-sm font-semibold text-foreground">Edit Donor Profile</h2>
              </div>
              <button
                onClick={() => setShowEditModal(false)}
                className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleEditDonor} className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
              {editError && (
                <div className="p-3 bg-primary/10 border border-primary/20 text-primary text-[11px] rounded font-medium flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{editError}</span>
                </div>
              )}

              {/* Full Name */}
              <div className="space-y-1">
                <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={editData.name}
                  onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                  className="w-full h-9 px-3 bg-background border border-border rounded-md text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary/50"
                />
              </div>

              {/* Email Address */}
              <div className="space-y-1">
                <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  value={editData.email}
                  onChange={(e) => setEditData({ ...editData, email: e.target.value })}
                  className="w-full h-9 px-3 bg-background border border-border rounded-md text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary/50"
                />
              </div>

              {/* Phone & Blood Group */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                    WhatsApp/Phone
                  </label>
                  <input
                    type="tel"
                    required
                    value={editData.phone}
                    onChange={(e) => setEditData({ ...editData, phone: e.target.value })}
                    className="w-full h-9 px-3 bg-background border border-border rounded-md text-foreground placeholder-muted-foreground font-mono focus:outline-none focus:border-primary/50"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Blood Group
                  </label>
                  <select
                    required
                    value={editData.blood_group}
                    onChange={(e) => setEditData({ ...editData, blood_group: e.target.value })}
                    className="w-full h-9 px-3 bg-background border border-border rounded-md text-foreground focus:outline-none focus:border-primary/50 font-bold"
                  >
                    {["O-", "O+", "A-", "A+", "B-", "B+", "AB-", "AB+"].map((g) => (
                      <option key={g} value={g}>
                        {g} Group
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Location */}
              <div className="space-y-1">
                <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Neighborhood Location (Karachi Area)
                </label>
                <select
                  required
                  value={editData.location}
                  onChange={(e) => setEditData({ ...editData, location: e.target.value })}
                  className="w-full h-9 px-3 bg-background border border-border rounded-md text-foreground focus:outline-none focus:border-primary/50"
                >
                  <option value="">Select location...</option>
                  <option value="Gulshan-e-Iqbal">Gulshan-e-Iqbal</option>
                  <option value="Gulistan-e-Johar">Gulistan-e-Johar</option>
                  <option value="North Nazimabad">North Nazimabad</option>
                  <option value="Clifton">Clifton</option>
                  <option value="DHA">DHA</option>
                  <option value="Malir">Malir</option>
                  <option value="Korangi">Korangi</option>
                  <option value="Indus Hospital">Indus Hospital</option>
                </select>
              </div>

              {/* Donation Count & Last Donation Date */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Total Donations
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={editData.donation_count}
                    onChange={(e) => setEditData({ ...editData, donation_count: parseInt(e.target.value) || 0 })}
                    className="w-full h-9 px-3 bg-background border border-border rounded-md text-foreground font-mono focus:outline-none focus:border-primary/50"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Last Donation Date
                  </label>
                  <input
                    type="date"
                    value={editData.last_donation_date}
                    onChange={(e) => setEditData({ ...editData, last_donation_date: e.target.value })}
                    className="w-full h-9 px-3 bg-background border border-border rounded-md text-foreground font-mono focus:outline-none focus:border-primary/50"
                  />
                </div>
              </div>

              {/* Availability Toggle */}
              <div className="flex items-center justify-between border-t border-border pt-4">
                <div>
                  <p className="font-semibold text-foreground">Available for immediate contact</p>
                  <p className="text-[10px] text-muted-foreground">Included in AI matching and wave dispatches.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setEditData({ ...editData, is_available: !editData.is_available })}
                  className="p-1 text-primary hover:text-primary/80 transition-colors"
                >
                  {editData.is_available ? (
                    <ToggleRight className="w-9 h-9 text-success" />
                  ) : (
                    <ToggleLeft className="w-9 h-9 text-muted-foreground" />
                  )}
                </button>
              </div>

              {/* Form Actions */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="h-9 px-4 font-semibold border border-border text-foreground hover:bg-muted/40 rounded-md transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editSubmitting}
                  className="h-9 px-4 bg-primary hover:bg-primary/95 text-white font-semibold rounded-md flex items-center gap-1.5 transition-colors disabled:opacity-50"
                >
                  {editSubmitting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
