import React, { useState, useEffect } from "react";
import { 
  MapContainer, 
  TileLayer, 
  Marker, 
  Popup, 
  CircleMarker, 
  Polyline, 
  LayersControl 
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { Waves, Car, AlertTriangle, ShieldCheck } from "lucide-react";
import { apiClient, getFloodOutlook, FloodHazard } from "@/services/api";
import TrafficMap from "@/components/TrafficMap";

// Fix for default marker icons in Leaflet with Vite
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const center: [number, number] = [17.3850, 78.4867];

// Mock Traffic Polylines (Simulating live traffic lines)
const trafficLines = [
  { positions: [[17.3850, 78.4867], [17.3950, 78.4967], [17.4050, 78.4967]], color: '#ef4444' }, // Heavy Traffic (Red)
  { positions: [[17.3750, 78.4767], [17.3850, 78.4867], [17.3850, 78.4700]], color: '#f59e0b' }, // Moderate Traffic (Yellow)
  { positions: [[17.4050, 78.4967], [17.4150, 78.5067], [17.4250, 78.5167]], color: '#10b981' }, // Clear Traffic (Green)
  { positions: [[17.3850, 78.4700], [17.3950, 78.4600], [17.4050, 78.4500]], color: '#ef4444' }  // Heavy Traffic (Red)
];

export default function MapView() {
  const [showTraffic, setShowTraffic] = useState(true);
  const [showFlood, setShowFlood] = useState(true);
  const [hotspots, setHotspots] = useState<any[]>([]);
  const [liveIncidents, setLiveIncidents] = useState<any[]>([]);
  const [floodHazards, setFloodHazards] = useState<FloodHazard[]>([]);

  useEffect(() => {
    // Fetch initial camera hotspots
    async function fetchHotspots() {
      try {
        const res = await apiClient.get("/analytics/hotspots");
        setHotspots(res.data);
      } catch (err) {
        setHotspots([
          { latitude: 17.3850, longitude: 78.4867, camera: "Cam-01 (Charminar)", violation_count: 142, dominant_violation: "Red Light" },
          { latitude: 17.4050, longitude: 78.4967, camera: "Cam-05 (Banjara Hills)", violation_count: 89, dominant_violation: "No Helmet" },
          { latitude: 17.3950, longitude: 78.4600, camera: "Cam-12 (Mehdipatnam)", violation_count: 215, dominant_violation: "Speeding" }
        ]);
      }
    }
    fetchHotspots();

    // Fetch Flood outlook
    async function fetchFlood() {
      try {
        const res = await getFloodOutlook();
        setFloodHazards(res.hazards || []);
      } catch (e) {
        console.warn("Flood outlook offline fallback");
      }
    }
    fetchFlood();

    // Simulate live incident streams
    const interval = setInterval(() => {
      if (Math.random() > 0.5) {
        const newIncident = {
          id: Math.random().toString(),
          lat: 17.35 + Math.random() * 0.1,
          lng: 78.45 + Math.random() * 0.1,
          type: ["Speeding", "Triple Riding", "No Helmet", "Wrong Way"][Math.floor(Math.random() * 4)],
          time: Date.now()
        };
        setLiveIncidents(prev => [newIncident, ...prev].slice(0, 10)); // Keep last 10
      }
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col h-full gap-5">
      {/* Top Header */}
      <div className="flex flex-wrap justify-between items-center gap-4 bg-card p-4 rounded-xl border border-border shadow-sm">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Traffic Hotspots & Flood Outlook</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Free OpenStreetMap tiles with live traffic congestion, waterlogging hazard telemetry, and AI camera nodes.
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setShowFlood(!showFlood)}
            className={`px-3.5 py-2 rounded-lg font-semibold text-xs flex items-center gap-1.5 transition-all ${
              showFlood 
                ? 'bg-cyan-600 text-white shadow-[0_0_10px_rgba(6,182,212,0.4)]' 
                : 'bg-muted text-foreground'
            }`}
          >
            <Waves size={15} />
            {showFlood ? "Flood Outlook ON" : "Flood Outlook OFF"}
          </button>

          <button 
            onClick={() => setShowTraffic(!showTraffic)}
            className={`px-3.5 py-2 rounded-lg font-semibold text-xs flex items-center gap-1.5 transition-all ${
              showTraffic 
                ? 'bg-blue-600 text-white shadow-[0_0_10px_rgba(37,99,235,0.4)]' 
                : 'bg-muted text-foreground'
            }`}
          >
            <Car size={15} />
            {showTraffic ? "Live Traffic ON" : "Live Traffic OFF"}
          </button>
        </div>
      </div>

      {/* Main Map Container */}
      <div className="bg-card rounded-xl overflow-hidden border border-border z-0 shadow-lg h-[460px]">
        <MapContainer center={center} zoom={13} style={{ width: '100%', height: '100%', zIndex: 0 }}>
          <LayersControl position="topright">
            <LayersControl.BaseLayer checked name="OpenStreetMap Standard">
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
            </LayersControl.BaseLayer>
            <LayersControl.BaseLayer name="CartoDB Voyager">
              <TileLayer
                attribution='&copy; <a href="https://carto.com/">CartoDB</a>'
                url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
              />
            </LayersControl.BaseLayer>
            <LayersControl.BaseLayer name="CartoDB Dark Matter">
              <TileLayer
                attribution='&copy; <a href="https://carto.com/">CartoDB</a>'
                url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
              />
            </LayersControl.BaseLayer>
          </LayersControl>
          
          {/* Simulated Traffic Lines */}
          {showTraffic && trafficLines.map((line, idx) => (
             <Polyline 
                key={`traffic-${idx}`}
                positions={line.positions as any} 
                pathOptions={{ color: line.color, weight: 6, opacity: 0.8 }} 
             />
          ))}
          
          {/* Static Camera Hotspots */}
          {hotspots.map((hotspot, idx) => (
            <Marker key={idx} position={[hotspot.latitude, hotspot.longitude]}>
              <Popup className="custom-popup">
                <div className="p-1 min-w-[160px] text-xs">
                  <h3 className="font-bold border-b pb-1 mb-2 text-slate-900">{hotspot.camera}</h3>
                  <div className="flex justify-between mb-1">
                    <span className="text-gray-500">Violations:</span>
                    <span className="font-semibold text-slate-800">{hotspot.violation_count}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Dominant:</span>
                    <span className="font-semibold text-red-600">{hotspot.dominant_violation}</span>
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}

          {/* Flood Outlook Markers */}
          {showFlood && floodHazards.map((h) => (
            <CircleMarker
              key={h.id}
              center={[h.lat, h.lng]}
              radius={h.severity === "CRITICAL" ? 12 : 9}
              pathOptions={{
                color: "#06b6d4",
                fillColor: "#0891b2",
                fillOpacity: 0.8,
                weight: 2
              }}
            >
              <Popup>
                <div className="p-1 min-w-[200px] text-xs text-slate-800">
                  <div className="font-bold text-cyan-700 flex items-center gap-1 mb-1">
                    <Waves size={14} /> {h.location_name}
                  </div>
                  <div>Water Depth: <strong>{h.water_depth_cm} cm</strong></div>
                  <div className="text-[11px] text-red-600 font-semibold">{h.status_label}</div>
                  <div className="text-[11px] text-slate-600 mt-1">Detour: {h.recommended_bypass}</div>
                </div>
              </Popup>
            </CircleMarker>
          ))}

          {/* Live Pulsing Incidents */}
          {showTraffic && liveIncidents.map(incident => (
            <CircleMarker 
              key={incident.id}
              center={[incident.lat, incident.lng]}
              radius={8}
              fillColor="#ef4444"
              color="#ef4444"
              weight={2}
              opacity={1}
              fillOpacity={0.7}
              className="animate-ping"
            >
              <Popup>
                <div className="text-red-500 font-bold text-xs">{incident.type}</div>
                <div className="text-[10px] text-gray-500">Live AI Detection</div>
              </Popup>
            </CircleMarker>
          ))}
        </MapContainer>
      </div>

      {/* Free Interactive Intelligence & Route Layer */}
      <div className="bg-card rounded-xl p-5 border border-border shadow-lg">
        <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
          <ShieldCheck size={20} className="text-primary" />
          Smart City Free Map & Hazard Outlook Engine
        </h2>
        <TrafficMap />
      </div>
    </div>
  );
}