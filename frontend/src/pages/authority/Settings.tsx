import React, { useState, useEffect } from "react";
import { 
  Save, 
  Bell, 
  Eye, 
  Database, 
  MapPinned, 
  Camera, 
  ShieldCheck, 
  User, 
  Sparkles, 
  Check, 
  AlertTriangle,
  Waves,
  RefreshCw
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { getUserSettings, updateUserSettings, fetchGeneratedPassword } from "@/services/api";

export default function Settings() {
  const { user } = useAuth();

  const [darkMode, setDarkMode] = useState(true);
  const [cameraDetection, setCameraDetection] = useState(true);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [trafficAlerts, setTrafficAlerts] = useState(true);
  const [floodAlerts, setFloodAlerts] = useState(true);
  const [autoArchive, setAutoArchive] = useState(true);
  const [mapLayer, setMapLayer] = useState("standard");

  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Load existing settings from API
  useEffect(() => {
    async function loadSettings() {
      try {
        const data = await getUserSettings();
        setDarkMode(data.dark_mode ?? true);
        setCameraDetection(data.camera_detection ?? true);
        setNotificationsEnabled(data.notifications_enabled ?? true);
        setTrafficAlerts(data.traffic_alerts ?? true);
        setFloodAlerts(data.flood_alerts ?? true);
        setAutoArchive(data.auto_archive ?? true);
        setMapLayer(data.map_layer_preference || "standard");
      } catch (err) {
        console.warn("Using default settings or backend offline", err);
      }
    }
    loadSettings();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      await updateUserSettings({
        dark_mode: darkMode,
        camera_detection: cameraDetection,
        notifications_enabled: notificationsEnabled,
        traffic_alerts: trafficAlerts,
        flood_alerts: floodAlerts,
        auto_archive: autoArchive,
        map_layer_preference: mapLayer,
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      setSaveError(err.response?.data?.detail || "Failed to update settings.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col h-full gap-6 max-w-4xl mx-auto w-full pb-10">
      {/* Top Header */}
      <div className="flex flex-wrap justify-between items-center gap-4 bg-card p-5 rounded-xl border border-border shadow-sm">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">System & User Settings</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your account security, AI detection preferences, and live map layer feeds.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {saveSuccess && (
            <span className="text-xs font-semibold text-emerald-400 bg-emerald-950/60 border border-emerald-800/80 px-3 py-1.5 rounded-lg flex items-center gap-1.5 animate-in fade-in">
              <Check size={14} /> Saved Successfully
            </span>
          )}
          {saveError && (
            <span className="text-xs font-semibold text-red-400 bg-red-950/60 border border-red-800/80 px-3 py-1.5 rounded-lg flex items-center gap-1.5 animate-in fade-in">
              <AlertTriangle size={14} /> {saveError}
            </span>
          )}
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-xl hover:bg-primary/90 transition-all font-medium text-sm shadow-md disabled:opacity-50"
          >
            {saving ? <RefreshCw className="animate-spin h-4 w-4" /> : <Save size={16} />}
            Save Changes
          </button>
        </div>
      </div>

      <div className="grid gap-6">
        {/* User Profile Card */}
        <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
          <div className="p-4 border-b border-border bg-muted/40 flex items-center gap-2">
            <User className="text-primary" size={18} />
            <h2 className="font-semibold text-sm sm:text-base">Authenticated Profile</h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-background p-4 rounded-xl border border-border">
                <div className="text-xs text-muted-foreground uppercase font-semibold">User Name</div>
                <div className="text-base font-bold text-foreground mt-1">
                  {user?.full_name || "Inspector R. Sharma"}
                </div>
              </div>
              <div className="bg-background p-4 rounded-xl border border-border">
                <div className="text-xs text-muted-foreground uppercase font-semibold">Contact Email</div>
                <div className="text-base font-medium text-foreground mt-1 truncate">
                  {user?.email || "officer@traffic.gov.in"}
                </div>
              </div>
              <div className="bg-background p-4 rounded-xl border border-border">
                <div className="text-xs text-muted-foreground uppercase font-semibold">Security Role</div>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`px-2.5 py-0.5 rounded-md text-xs font-semibold ${
                    user?.role === "OFFICER" 
                      ? "bg-blue-900/60 text-blue-300 border border-blue-700/60" 
                      : "bg-emerald-900/60 text-emerald-300 border border-emerald-700/60"
                  }`}>
                    {user?.role || "OFFICER"}
                  </span>
                  {user?.badge_number && (
                    <span className="text-xs text-muted-foreground font-mono">
                      #{user.badge_number}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Free Map & Flood Outlook Settings */}
        <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
          <div className="p-4 border-b border-border bg-muted/40 flex items-center gap-2">
            <Waves className="text-cyan-400" size={18} />
            <h2 className="font-semibold text-sm sm:text-base">Free Map & Hazard Outlook</h2>
          </div>
          <div className="p-6 flex flex-col gap-5">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">Real-Time Flood & Waterlogging Outlook</div>
                <div className="text-sm text-muted-foreground">
                  Displays live flood depth (cm), road submergence warnings, and detour bypasses on maps using free telemetry.
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={floodAlerts}
                  onChange={(e) => setFloodAlerts(e.target.checked)}
                />
                <div className="w-11 h-6 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
              </label>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">Live Traffic Congestion Polylines</div>
                <div className="text-sm text-muted-foreground">
                  Overlay simulated colored speed zones (red/yellow/green) without requiring Google Maps API keys.
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={trafficAlerts}
                  onChange={(e) => setTrafficAlerts(e.target.checked)}
                />
                <div className="w-11 h-6 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
              </label>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">Default Free Map Provider</div>
                <div className="text-sm text-muted-foreground">
                  100% Free OpenStreetMap & CartoDB tiles with unlimited requests and zero billing requirements.
                </div>
              </div>
              <select
                value={mapLayer}
                onChange={(e) => setMapLayer(e.target.value)}
                className="bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary"
              >
                <option value="standard">OpenStreetMap Standard</option>
                <option value="carto">CartoDB Voyager (Clean Vector)</option>
                <option value="dark">CartoDB Dark Matter</option>
              </select>
            </div>
          </div>
        </div>

        {/* AI Camera & Detection Settings */}
        <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
          <div className="p-4 border-b border-border bg-muted/40 flex items-center gap-2">
            <Camera className="text-primary" size={18} />
            <h2 className="font-semibold text-sm sm:text-base">AI Camera Surveillance</h2>
          </div>
          <div className="p-6 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">Automatic Violation Detection</div>
                <div className="text-sm text-muted-foreground">
                  Continuously detect helmet violations, triple riding, speeding, and red-light infractions from active camera feeds.
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={cameraDetection}
                  onChange={(e) => setCameraDetection(e.target.checked)}
                />
                <div className="w-11 h-6 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
              </label>
            </div>
          </div>
        </div>

        {/* Notification Settings */}
        <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
          <div className="p-4 border-b border-border bg-muted/40 flex items-center gap-2">
            <Bell className="text-primary" size={18} />
            <h2 className="font-semibold text-sm sm:text-base">Alerts & Notifications</h2>
          </div>
          <div className="p-6 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">Live Violation Audio/Visual Alerts</div>
                <div className="text-sm text-muted-foreground">
                  Receive instant notifications when high-confidence violations are flagged by the AI pipeline.
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={notificationsEnabled}
                  onChange={(e) => setNotificationsEnabled(e.target.checked)}
                />
                <div className="w-11 h-6 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
              </label>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">Auto-Archive Old Records</div>
                <div className="text-sm text-muted-foreground">
                  Archive settled violation records older than 30 days to optimize system memory.
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={autoArchive}
                  onChange={(e) => setAutoArchive(e.target.checked)}
                />
                <div className="w-11 h-6 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
