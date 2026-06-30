// ---- Domain Types ----

export interface Donor {
  id: number;
  name: string;
  email: string;
  phone: string;
  blood_group: string;
  location: string;
  latitude: number;
  longitude: number;
  is_available: boolean;
  donation_count: number;
  last_donation_date: string | null;
  distance_km?: number;
}

export interface BloodRequest {
  id: number;
  patient_id: string;
  hospital: string;
  blood_group: string;
  units_required: number;
  units_confirmed: number;
  urgency: "Critical" | "High" | "Medium" | "Low";
  status: "Active" | "Fulfilled" | "Canceled";
  created_at: string;
}

export interface TimelineEvent {
  id: number;
  event_time: string;
  event_content: string;
}

export interface WaveDonor {
  donor_name: string;
  status: "Pending" | "Accepted" | "Declined" | "No Response";
  phone: string;
}

export interface OutreachWave {
  wave_number: number;
  launched_at: string;
  donors: WaveDonor[];
}

export interface RequestDetail {
  request: BloodRequest;
  timeline: TimelineEvent[];
  progress_percentage: number;
  live_donor_status: {
    Accepted: number;
    Pending: number;
    Declined: number;
    Unavailable: number;
  };
  waves: OutreachWave[];
}

// ---- Dashboard Types ----

export interface KPIs {
  active_requests: number;
  confirmed_donors: number;
  success_rate: string;
  average_match_time: string;
  units_secured_today: number;
  total_donors_contacted: number;
  response_rate: string;
  pending_responses: number;
  average_fulfillment_time: string;
}

export interface EmergencyRequest {
  id: number;
  urgency: string;
  blood_group: string;
  hospital: string;
  units_required: number;
  units_confirmed: number;
}

export interface Analytics {
  request_trends: { date: string; requests: number }[];
  blood_group_demand: { blood_group: string; units: number }[];
  donor_response_rate: { Accepted: number; Declined: number; Pending: number };
  fulfillment_rate: { Fulfilled: number; Active: number; Canceled: number };
  hospital_distribution: { hospital: string; count: number }[];
  ai_agent_performance: { agent_name: string; count: number }[];
}

export interface DashboardData {
  kpis: KPIs;
  active_emergency_requests: EmergencyRequest[];
  analytics: Analytics;
}

// ---- Settings ----

export interface SystemSettings {
  id: number;
  wave_multiplier: number;
  max_waves: number;
  follow_up_delay: number;
  response_timeout: number;
  emergency_threshold: number;
  preferred_channels: string;
}

// ---- Notifications ----

export interface SystemNotification {
  id: number;
  message: string;
  notification_type: string;
  timestamp: string;
  is_read: boolean;
}

// ---- AI Logs ----

export interface AILog {
  id: number;
  agent_name: string;
  action_taken: string;
  request_id: number | null;
  timestamp: string;
}

// ---- Request creation ----

export interface BloodRequestCreate {
  patient_id: string;
  hospital: string;
  blood_group: string;
  units_required: number;
  urgency: string;
}

export interface ChatMessage {
  message: string;
  email?: string;
  sessionId: string | undefined;
}
