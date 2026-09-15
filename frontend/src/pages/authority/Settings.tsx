import { useState } from "react";
import { Save, Bell, Eye, Database, MapPinned, Camera } from "lucide-react";

export default function Settings() {
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [autoArchive, setAutoArchive] = useState(true);
  const [darkMode, setDarkMode] = useState(true);
  const [cameraDetection, setCameraDetection] = useState(true);
  const [trafficAlerts, setTrafficAlerts] = useState(true);
  const [mapFallback, setMapFallback] = useState(true);

  return (
    <div className="flex flex-col h-full gap-6 max-w-4xl mx-auto w-full">
      <div className="flex justify-between items-center bg-card p-4 rounded-lg border border-border">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">System Settings</h1>
          <p className="text-sm text-muted-foreground mt-1">Control your traffic monitoring, camera AI, and alert configuration.</p>
        </div>
        <button className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 transition-colors font-medium text-sm shadow-md">
          <Save size={16} />
          Save Changes
        </button>
      </div>

      <div className="grid gap-6">
        <div className="bg-card border border-border rounded-lg overflow-hidden shadow-sm">
          <div className="p-4 border-b border-border bg-muted/50 flex items-center gap-2">
            <Eye className="text-primary" size={18} />
            <h2 className="font-semibold">Appearance</h2>
          </div>
          <div className="p-6 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">Dark Mode</div>
                <div className="text-sm text-muted-foreground">Enable dark mode for the application interface.</div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" checked={darkMode} onChange={(e) => setDarkMode(e.target.checked)} />
                <div className="w-11 h-6 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
              </label>
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg overflow-hidden shadow-sm">
          <div className="p-4 border-b border-border bg-muted/50 flex items-center gap-2">
            <Camera className="text-primary" size={18} />
            <h2 className="font-semibold">AI Camera</h2>
          </div>
          <div className="p-6 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">Automatic violation detection</div>
                <div className="text-sm text-muted-foreground">Detect rule violations from connected camera feeds and laptop webcams.</div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" checked={cameraDetection} onChange={(e) => setCameraDetection(e.target.checked)} />
                <div className="w-11 h-6 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
              </label>
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg overflow-hidden shadow-sm">
          <div className="p-4 border-b border-border bg-muted/50 flex items-center gap-2">
            <Bell className="text-primary" size={18} />
            <h2 className="font-semibold">Notifications</h2>
          </div>
          <div className="p-6 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">Live violation alerts</div>
                <div className="text-sm text-muted-foreground">Receive real-time push notifications for new traffic violations.</div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" checked={notificationsEnabled} onChange={(e) => setNotificationsEnabled(e.target.checked)} />
                <div className="w-11 h-6 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
              </label>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">Traffic congestion alerts</div>
                <div className="text-sm text-muted-foreground">Display live alerts for high-traffic hotspots near monitored roads.</div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" checked={trafficAlerts} onChange={(e) => setTrafficAlerts(e.target.checked)} />
                <div className="w-11 h-6 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
              </label>
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg overflow-hidden shadow-sm">
          <div className="p-4 border-b border-border bg-muted/50 flex items-center gap-2">
            <MapPinned className="text-primary" size={18} />
            <h2 className="font-semibold">Map & Data</h2>
          </div>
          <div className="p-6 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">Use map fallback when API key is missing</div>
                <div className="text-sm text-muted-foreground">OpenStreetMap fallback keeps the map working even without Google Maps credentials.</div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" checked={mapFallback} onChange={(e) => setMapFallback(e.target.checked)} />
                <div className="w-11 h-6 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
              </label>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">Auto-archive old records</div>
                <div className="text-sm text-muted-foreground">Automatically archive violation records older than 30 days.</div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" checked={autoArchive} onChange={(e) => setAutoArchive(e.target.checked)} />
                <div className="w-11 h-6 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
              </label>
            </div>
            
            <div className="pt-4 mt-2 border-t border-border">
              <button className="flex items-center gap-2 text-destructive hover:text-destructive/80 transition-colors font-medium text-sm">
                <Database size={16} />
                Clear Local Cache
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
