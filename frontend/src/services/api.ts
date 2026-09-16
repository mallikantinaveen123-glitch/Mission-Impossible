import axios from "axios";

// Default API URL (uses Vite proxy in dev, or fallback to port 8000)
export const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000/api/v1";
export const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 10000,
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("traffic_auth_token");
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const USE_DEMO_DATA = false;

// ==========================================
// Traffic Rules Types & Methods
// ==========================================
export interface TrafficRule {
  id: number;
  code: string;
  title: string;
  description: string;
  category: string;
  section?: string;
  penalty: string;
  challan_amount?: string;
  status?: string;
  created_at?: string;
  updated_at?: string;
}

export async function getRules(): Promise<TrafficRule[]> {
  const res = await apiClient.get("/rules");
  return res.data;
}

export async function createRule(rule: Partial<TrafficRule>): Promise<TrafficRule> {
  const res = await apiClient.post("/rules", rule);
  return res.data;
}

export async function updateRule(id: number, rule: Partial<TrafficRule>): Promise<TrafficRule> {
  const res = await apiClient.put(`/rules/${id}`, rule);
  return res.data;
}

export async function deleteRule(id: number): Promise<void> {
  await apiClient.delete(`/rules/${id}`);
}

// ==========================================
// Violations & Summary Methods
// ==========================================
export interface ViolationSummaryData {
  total: number;
  today: number;
  pending: number;
  verified: number;
  rejected: number;
}

export async function getViolationsSummary(): Promise<ViolationSummaryData> {
  const res = await apiClient.get("/violations/summary");
  return res.data;
}

// ==========================================
// Photo & AI Detection Methods
// ==========================================
export async function detectPhoto(file: File) {
  const formData = new FormData();
  formData.append("file", file);
  const res = await apiClient.post("/detect/photo", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return res.data;
}

export function getImageUrl(imagePath?: string | null): string {
  if (!imagePath) return "/placeholder-car.jpg";
  if (imagePath.startsWith("http://") || imagePath.startsWith("https://")) {
    return imagePath;
  }
  return `${BACKEND_URL}${imagePath.startsWith("/") ? "" : "/"}${imagePath}`;
}

// ==========================================
// Police Stations & Inter-Station Comms
// ==========================================
export interface PoliceStation {
  id: string;
  name: string;
  zone: string;
  jurisdiction: string;
  contact_number: string;
  duty_officer: string;
  lat: number;
  lng: number;
  status: "ONLINE" | "PATROL_ALERT" | "HIGH_ALERT" | "OFFLINE";
  active_checkpoints: number;
  active_alerts_count?: number;
}

export interface InterStationAlert {
  id: number;
  source_station_id: string;
  source_station_name?: string;
  target_station_id: string; // station id or "ALL"
  target_station_name?: string;
  alert_type: "INTERCEPT_DEFAULTER" | "FLEEING_VEHICLE" | "HIGH_SPEED_HAZARD" | "REPEAT_OFFENDER" | "GREEN_CORRIDOR";
  priority: "CRITICAL" | "HIGH" | "MEDIUM";
  plate_number: string;
  vehicle_type?: string;
  violation_id?: number | null;
  total_unpaid_amount: string;
  unpaid_challans_count: number;
  last_seen_junction: string;
  heading_direction: string;
  speed_recorded?: number | null;
  notes?: string;
  evidence_url?: string | null;
  status: "ACTIVE" | "INTERCEPTED" | "CHALLAN_COLLECTED" | "EXPIRED";
  intercepted_by_station_id?: string | null;
  intercepted_by_station_name?: string | null;
  created_at: string;
  resolved_at?: string | null;
}

export interface StationMessage {
  id: number;
  from_station_id: string;
  from_station_name: string;
  to_station_id: string;
  sender_name: string;
  message_type: "DISPATCH" | "ALERT" | "CHALLAN_INTEL" | "GENERAL";
  content: string;
  attached_plate?: string | null;
  attached_violation_id?: number | null;
  created_at: string;
}

export interface CrossJurisdictionStats {
  total_alerts: number;
  active_alerts: number;
  intercepted_count: number;
  challans_collected_count: number;
  total_fines_recovered: string;
  recovery_rate: string;
  top_defaulters: Array<{
    plate: string;
    unpaid_count: number;
    unpaid_amount: string;
    last_station: string;
  }>;
}

export async function getStations(): Promise<PoliceStation[]> {
  const res = await apiClient.get("/stations");
  return res.data;
}

export async function getStationAlerts(targetStationId?: string): Promise<InterStationAlert[]> {
  const params: any = {};
  if (targetStationId) params.station_id = targetStationId;
  const res = await apiClient.get("/stations/alerts", { params });
  return res.data;
}

export async function broadcastStationAlert(payload: Partial<InterStationAlert>): Promise<InterStationAlert> {
  const res = await apiClient.post("/stations/alerts/broadcast", payload);
  return res.data;
}

export async function interceptStationAlert(alertId: number, stationId: string, officerName?: string): Promise<any> {
  const res = await apiClient.patch(`/stations/alerts/${alertId}/intercept`, {
    station_id: stationId,
    officer_name: officerName,
  });
  return res.data;
}

export async function collectChallanAndResolveAlert(
  alertId: number,
  payload: {
    station_id: string;
    officer_name: string;
    amount: string;
    payment_method: string;
  }
): Promise<any> {
  const res = await apiClient.post(`/stations/alerts/${alertId}/collect`, payload);
  return res.data;
}

export async function getStationMessages(stationId?: string): Promise<StationMessage[]> {
  const params: any = {};
  if (stationId) params.station_id = stationId;
  const res = await apiClient.get("/stations/messages", { params });
  return res.data;
}

export async function sendStationMessage(payload: Partial<StationMessage>): Promise<StationMessage> {
  const res = await apiClient.post("/stations/messages", payload);
  return res.data;
}

export async function getStationAnalytics(): Promise<CrossJurisdictionStats> {
  const res = await apiClient.get("/stations/analytics");
  return res.data;
}

// ==========================================
// Authentication, Users, OTP & Settings
// ==========================================
export interface AuthUser {
  id: number;
  email: string;
  phone?: string | null;
  full_name: string;
  role: "CITIZEN" | "OFFICER" | "ADMIN";
  badge_number?: string | null;
  station_id?: string | null;
  is_active: boolean;
  is_verified: boolean;
  created_at?: string;
}

export interface AuthResponseData {
  access_token: string;
  token_type: string;
  user: AuthUser;
  message: string;
}

export interface UserSettingsData {
  dark_mode: boolean;
  notifications_enabled: boolean;
  traffic_alerts: boolean;
  flood_alerts: boolean;
  auto_archive: boolean;
  camera_detection: boolean;
  map_layer_preference: string;
}

export interface GeneratedPasswordData {
  password: string;
  length: number;
  strength: string;
  entropy_bits: number;
}

export async function loginUser(payload: { identifier: string; password: string }): Promise<AuthResponseData> {
  const res = await apiClient.post("/auth/login", payload);
  return res.data;
}

export async function registerUser(payload: {
  email: string;
  phone?: string;
  full_name: string;
  password: string;
  role?: string;
  badge_number?: string;
  station_id?: string;
}): Promise<AuthResponseData> {
  const res = await apiClient.post("/auth/register", payload);
  return res.data;
}

export async function generateOtp(payload: { identifier: string; purpose?: string }): Promise<{
  success: boolean;
  identifier: string;
  purpose: string;
  expires_in_seconds: number;
  temporary_code?: string;
  message: string;
}> {
  const res = await apiClient.post("/auth/generate-otp", payload);
  return res.data;
}

export async function verifyOtp(payload: { identifier: string; otp_code: string; purpose?: string }): Promise<AuthResponseData> {
  const res = await apiClient.post("/auth/verify-otp", payload);
  return res.data;
}

export async function fetchGeneratedPassword(length: number = 16): Promise<GeneratedPasswordData> {
  const res = await apiClient.get("/auth/generate-password", { params: { length } });
  return res.data;
}

export async function resetPasswordWithOtp(payload: {
  identifier: string;
  otp_code: string;
  new_password: string;
}): Promise<{ success: boolean; message: string }> {
  const res = await apiClient.post("/auth/reset-password", payload);
  return res.data;
}

export async function getMe(): Promise<AuthUser> {
  const res = await apiClient.get("/auth/me");
  return res.data;
}

export async function getUserSettings(): Promise<UserSettingsData> {
  const res = await apiClient.get("/auth/settings");
  return res.data;
}

export async function updateUserSettings(settings: Partial<UserSettingsData>): Promise<UserSettingsData> {
  const res = await apiClient.put("/auth/settings", settings);
  return res.data;
}

// ==========================================
// Maps & Flood Hazard Outlook
// ==========================================
export interface FloodHazard {
  id: string;
  location_name: string;
  lat: number;
  lng: number;
  water_depth_cm: number;
  severity: "LOW" | "MODERATE" | "CRITICAL";
  status: string;
  status_label: string;
  passable_for: string;
  recommended_bypass: string;
  pumps_deployed: number;
  drainage_status: string;
  last_updated: string;
}

export interface FloodOutlookResponse {
  generated_at: string;
  weather_condition: string;
  city_wide_risk: string;
  active_hazard_points: number;
  total_monitored_junctions: number;
  hazards: FloodHazard[];
}

export async function getFloodOutlook(): Promise<FloodOutlookResponse> {
  const res = await apiClient.get("/maps/flood-outlook");
  return res.data;
}

export interface TrafficDeviation {
  id: string;
  area_name: string;
  junction_name: string;
  reason: string;
  severity: "CRITICAL" | "MODERATE" | "RESTRICTION" | "PEAK_REGULATION";
  closed_label: string;
  closed_coords: [number, number][];
  diversion_label: string;
  diversion_coords: [number, number][];
  passable_for: string;
  detour_advice: string;
  valid_until: string;
}

export interface TrafficDeviationsResponse {
  generated_at: string;
  total_active_deviations: number;
  deviations: TrafficDeviation[];
}

export async function getTrafficDeviations(): Promise<TrafficDeviationsResponse> {
  const res = await apiClient.get("/maps/traffic-deviations");
  return res.data;
}
