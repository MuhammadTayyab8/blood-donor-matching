import type {
  DashboardData,
  BloodRequest,
  RequestDetail,
  Donor,
  SystemSettings,
  SystemNotification,
  AILog,
  BloodRequestCreate,
  ChatMessage,
} from "./types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

async function fetchApi<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    headers: { "Content-Type": "application/json", ...options?.headers },
    ...options,
  });
  if (!res.ok) {
    const errorBody = await res.text().catch(() => "Unknown error");
    throw new Error(`API Error ${res.status}: ${errorBody}`);
  }
  return res.json();
}

// ---- Dashboard ----
export function getDashboard() {
  return fetchApi<DashboardData>("/api/dashboard");
}

// ---- Blood Requests ----
export function getRequests(params?: {
  hospital?: string;
  status?: string;
  blood_group?: string;
}) {
  const query = new URLSearchParams();
  if (params?.hospital) query.set("hospital", params.hospital);
  if (params?.status) query.set("status", params.status);
  if (params?.blood_group) query.set("blood_group", params.blood_group);
  const qs = query.toString();
  return fetchApi<BloodRequest[]>(`/api/requests${qs ? `?${qs}` : ""}`);
}

export function getRequestDetail(id: number) {
  return fetchApi<RequestDetail>(`/api/requests/${id}`);
}

export function createRequest(data: BloodRequestCreate, email: string) {
  const query = email ? `?email=${encodeURIComponent(email)}` : "";
  return fetchApi<BloodRequest>(`/api/requests${query}`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function launchNextWave(requestId: number) {
  return fetchApi<{ status: string; message: string }>(
    `/api/requests/${requestId}/wave`,
    { method: "POST" }
  );
}

export function fulfillRequest(requestId: number) {
  return fetchApi<{ status: string; message: string }>(
    `/api/requests/${requestId}/fulfill`,
    { method: "POST" }
  );
}

export function escalateRequest(requestId: number) {
  return fetchApi<{ status: string; message: string }>(
    `/api/requests/${requestId}/escalate`,
    { method: "POST" }
  );
}

// ---- Donors ----
export function getDonors(params?: {
  blood_group?: string;
  hospital_location?: string;
}) {
  const query = new URLSearchParams();
  if (params?.blood_group) query.set("blood_group", params.blood_group);
  if (params?.hospital_location)
    query.set("hospital_location", params.hospital_location);
  const qs = query.toString();
  return fetchApi<Donor[]>(`/api/donors${qs ? `?${qs}` : ""}`);
}

export function getDonorById(id: number) {
  return fetchApi<Donor>(`/api/donors/${id}`);
}

export function updateDonor(id: number, data: Partial<Donor>) {
  return fetchApi<Donor>(`/api/donors/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export function addDonor(data: Partial<Donor>) {
  return fetchApi<Donor>("/api/donors", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

// ---- Settings ----
export function getSettings() {
  return fetchApi<SystemSettings>("/api/settings");
}

export function updateSettings(data: Partial<SystemSettings>) {
  return fetchApi<SystemSettings>("/api/settings", {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

// ---- Notifications ----
export function getNotifications() {
  return fetchApi<SystemNotification[]>("/api/notifications");
}

// ---- AI Logs ----
export function getAILogs() {
  return fetchApi<AILog[]>("/api/ai-logs");
}

// ---- Chat ----
export function sendChatMessage(data: ChatMessage) {
  return fetchApi<{ status: string; reply: string; sessionId: string; }>("/api/chat", {
    method: "POST",
    body: JSON.stringify(data),
  });
}
