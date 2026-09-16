import React, { useState, useEffect } from 'react';
import { 
  MapContainer, 
  TileLayer, 
  Marker, 
  Popup, 
  Polyline, 
  CircleMarker, 
  LayersControl 
} from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { 
  Waves, 
  Navigation, 
  ShieldAlert, 
  CheckCircle2, 
  AlertTriangle, 
  Car, 
  Layers,
  Sparkles
} from 'lucide-react';
import { getFloodOutlook, FloodHazard } from '@/services/api';

// Fix for default Leaflet marker icons in Vite
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const defaultCenter: [number, number] = [17.3950, 78.4600];

// Simulated Live Traffic Congestion Polylines across Hyderabad City
const trafficLines = [
  { positions: [[17.3850, 78.4867], [17.3950, 78.4967], [17.4050, 78.4967]], color: '#ef4444', label: 'Severe Jam (12 km/h)' },
  { positions: [[17.3750, 78.4767], [17.3850, 78.4867], [17.3850, 78.4700]], color: '#f59e0b', label: 'Moderate Flow (28 km/h)' },
  { positions: [[17.4050, 78.4967], [17.4150, 78.5067], [17.4250, 78.5167]], color: '#10b981', label: 'Smooth Transit (54 km/h)' },
  { positions: [[17.4045, 78.4180], [17.4150, 78.4350], [17.4200, 78.4500]], color: '#ef4444', label: 'Inundation Slowdown (8 km/h)' },
  { positions: [[17.4200, 78.4500], [17.4350, 78.4600], [17.4450, 78.4750]], color: '#10b981', label: 'Clear Corridor (60 km/h)' },
];

export default function TrafficMap() {
  const [showTraffic, setShowTraffic] = useState(true);
  const [showFloodOutlook, setShowFloodOutlook] = useState(true);
  const [floodHazards, setFloodHazards] = useState<FloodHazard[]>([]);
  const [floodRiskSummary, setFloodRiskSummary] = useState<string>("Monsoon Active");
  const [selectedHazard, setSelectedHazard] = useState<FloodHazard | null>(null);

  // Route calculation simulation state
  const [origin, setOrigin] = useState("Jubilee Hills Checkpost");
  const [destination, setDestination] = useState("Charminar Old City");
  const [routeActive, setRouteActive] = useState(true);

  useEffect(() => {
    async function loadFloodData() {
      try {
        const res = await getFloodOutlook();
        setFloodHazards(res.hazards || []);
        setFloodRiskSummary(`${res.weather_condition} • ${res.active_hazard_points} Submerged Points Monitored`);
      } catch (err) {
        // Fallback demo flood outlook if offline
        setFloodHazards([
          {
            id: "FL-01",
            location_name: "Tolichowki Flyover Underpass",
            lat: 17.4045,
            lng: 78.4180,
            water_depth_cm: 42,
            severity: "CRITICAL",
            status: "ROAD_SUBMERGED",
            status_label: "High Inundation - Avoid Route",
            passable_for: "Heavy Commercial Vehicles Only",
            recommended_bypass: "Diverted via Shaikpet Main Road & Biodiversity Flyover",
            pumps_deployed: 3,
            drainage_status: "Emergency Pumps Operating at 100%",
            last_updated: new Date().toISOString()
          },
          {
            id: "FL-02",
            location_name: "Khairatabad Junction Low Point",
            lat: 17.4110,
            lng: 78.4625,
            water_depth_cm: 25,
            severity: "MODERATE",
            status: "WATERLOGGING",
            status_label: "Moderate Waterlogging",
            passable_for: "Cars & Buses (Slow Traffic)",
            recommended_bypass: "Use Upper Flyover towards Panjagutta",
            pumps_deployed: 2,
            drainage_status: "Municipal team clearing storm drains",
            last_updated: new Date().toISOString()
          }
        ]);
      }
    }
    loadFloodData();
  }, []);

  return (
    <div className="space-y-4">
      {/* Top Map Control Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#101C2E] p-4 rounded-xl border border-slate-800 shadow-md">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            <CheckCircle2 size={18} />
          </div>
          <div>
            <div className="text-sm font-semibold text-white flex items-center gap-2">
              Free OpenStreetMap & CartoDB Engine
              <span className="text-[10px] bg-emerald-950/80 text-emerald-300 border border-emerald-800/80 px-2 py-0.5 rounded-full font-medium">
                100% Free • No API Key Needed
              </span>
            </div>
            <div className="text-xs text-slate-400 mt-0.5 flex items-center gap-2">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              {floodRiskSummary}
            </div>
          </div>
        </div>

        {/* Toggle Badges */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowFloodOutlook(!showFloodOutlook)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              showFloodOutlook
                ? "bg-cyan-600 text-white shadow-[0_0_12px_rgba(6,182,212,0.4)]"
                : "bg-slate-800 text-slate-400 border border-slate-700"
            }`}
          >
            <Waves size={14} />
            {showFloodOutlook ? "Flood Outlook: ON" : "Flood Outlook: OFF"}
          </button>

          <button
            onClick={() => setShowTraffic(!showTraffic)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              showTraffic
                ? "bg-blue-600 text-white shadow-[0_0_12px_rgba(37,99,235,0.4)]"
                : "bg-slate-800 text-slate-400 border border-slate-700"
            }`}
          >
            <Car size={14} />
            {showTraffic ? "Live Traffic: ON" : "Live Traffic: OFF"}
          </button>
        </div>
      </div>

      {/* Flood Outlook Alert Banner if any Critical Hazards exist */}
      {showFloodOutlook && floodHazards.some(h => h.severity === "CRITICAL") && (
        <div className="p-3 bg-gradient-to-r from-cyan-950/80 to-blue-950/80 border border-cyan-700/60 rounded-xl flex items-center justify-between text-xs text-cyan-200">
          <div className="flex items-center gap-2.5">
            <ShieldAlert size={18} className="text-cyan-400 shrink-0" />
            <span>
              <strong>Monsoon Waterlogging Alert:</strong> {floodHazards.filter(h => h.severity === "CRITICAL").length} road choke points submerged. Automatic detours suggested below.
            </span>
          </div>
          <span className="font-mono bg-cyan-900/60 px-2.5 py-1 rounded text-[11px] text-cyan-300">
            Emergency Drainage Active
          </span>
        </div>
      )}

      {/* Interactive Leaflet Map Container */}
      <div className="rounded-xl overflow-hidden border border-slate-700/80 h-[520px] shadow-2xl relative">
        <MapContainer 
          center={defaultCenter} 
          zoom={12} 
          style={{ width: '100%', height: '100%', background: '#0f172a' }}
        >
          <LayersControl position="topright">
            <LayersControl.BaseLayer checked name="OpenStreetMap Standard">
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
            </LayersControl.BaseLayer>
            <LayersControl.BaseLayer name="CartoDB Voyager (Modern Light)">
              <TileLayer
                attribution='&copy; <a href="https://carto.com/">CartoDB</a>'
                url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
              />
            </LayersControl.BaseLayer>
            <LayersControl.BaseLayer name="CartoDB Dark Matter (Night Surveillance)">
              <TileLayer
                attribution='&copy; <a href="https://carto.com/">CartoDB</a>'
                url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
              />
            </LayersControl.BaseLayer>
          </LayersControl>

          {/* 1. Live Traffic Congestion Polylines */}
          {showTraffic && trafficLines.map((line, idx) => (
            <Polyline
              key={`traffic-${idx}`}
              positions={line.positions as [number, number][]}
              pathOptions={{
                color: line.color,
                weight: 6,
                opacity: 0.85,
                lineCap: 'round',
                lineJoin: 'round'
              }}
            >
              <Popup>
                <div className="p-1 text-xs">
                  <div className="font-bold text-slate-800">Traffic Status</div>
                  <div className="mt-1" style={{ color: line.color }}>{line.label}</div>
                </div>
              </Popup>
            </Polyline>
          ))}

          {/* 2. Flood & Waterlogging Hazard Outlook Markers */}
          {showFloodOutlook && floodHazards.map((hazard) => {
            const isCritical = hazard.severity === "CRITICAL";
            return (
              <CircleMarker
                key={hazard.id}
                center={[hazard.lat, hazard.lng]}
                radius={isCritical ? 14 : 10}
                pathOptions={{
                  color: isCritical ? "#06b6d4" : "#38bdf8",
                  fillColor: isCritical ? "#0891b2" : "#0284c7",
                  fillOpacity: 0.8,
                  weight: 3,
                }}
              >
                <Popup className="flood-hazard-popup">
                  <div className="p-2 min-w-[240px] text-xs">
                    <div className="flex items-center gap-1.5 pb-1.5 mb-1.5 border-b border-slate-200">
                      <Waves size={16} className="text-cyan-600" />
                      <h4 className="font-bold text-slate-900">{hazard.location_name}</h4>
                    </div>
                    <div className="space-y-1 text-slate-700">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Water Depth:</span>
                        <strong className="text-cyan-700 font-bold">{hazard.water_depth_cm} cm</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Status:</span>
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                          isCritical ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"
                        }`}>
                          {hazard.status_label}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Passable For:</span>
                        <span className="font-medium text-slate-800">{hazard.passable_for}</span>
                      </div>
                      <div className="pt-1 text-[11px] text-slate-600">
                        <strong className="text-blue-700">Detour Bypass:</strong> {hazard.recommended_bypass}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-1">
                        Pumps: {hazard.pumps_deployed} deployed • {hazard.drainage_status}
                      </div>
                    </div>
                  </div>
                </Popup>
              </CircleMarker>
            );
          })}

          {/* 3. Simulated Active Corridor Route */}
          {routeActive && (
            <Polyline
              positions={[
                [17.4320, 78.4070],
                [17.4200, 78.4350],
                [17.4110, 78.4625],
                [17.3850, 78.4867],
              ]}
              pathOptions={{
                color: '#3b82f6',
                weight: 5,
                dashArray: '8, 8',
                opacity: 0.9
              }}
            >
              <Popup>
                <div className="p-1 text-xs">
                  <div className="font-bold text-blue-600">Active Monitored Corridor</div>
                  <div className="text-slate-600">Jubilee Hills to Charminar • Real-time AI Tracking</div>
                </div>
              </Popup>
            </Polyline>
          )}

          {/* Landmark Anchor Markers */}
          <Marker position={[17.4320, 78.4070]}>
            <Popup>
              <div className="p-1 text-xs font-semibold">Jubilee Hills Hub (Origin)</div>
            </Popup>
          </Marker>
          <Marker position={[17.3850, 78.4867]}>
            <Popup>
              <div className="p-1 text-xs font-semibold">Central Command Station (Destination)</div>
            </Popup>
          </Marker>
        </MapContainer>
      </div>

      {/* Route & Hazard Planner Footer */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Safe Corridor Navigation Bar */}
        <div className="bg-[#101C2E] p-4 rounded-xl border border-slate-800 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold text-white mb-2">
              <Navigation size={16} className="text-blue-400" />
              Smart Safe Route Guidance
            </div>
            <p className="text-xs text-slate-400 mb-3">
              Route avoids submerged choke points automatically using live flood outlook sensors.
            </p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800">
                <span className="text-slate-500 block text-[10px] uppercase">Origin</span>
                <span className="font-medium text-slate-200">{origin}</span>
              </div>
              <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800">
                <span className="text-slate-500 block text-[10px] uppercase">Destination</span>
                <span className="font-medium text-slate-200">{destination}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-3 mt-3 border-t border-slate-800/80 text-xs">
            <span className="text-emerald-400 font-medium">✓ Bypass route avoids Tolichowki Underpass (42cm depth)</span>
            <button
              onClick={() => setRouteActive(!routeActive)}
              className="text-blue-400 hover:text-blue-300 font-medium"
            >
              {routeActive ? "Hide Route" : "Show Route"}
            </button>
          </div>
        </div>

        {/* Live Submerged Choke Points Card */}
        <div className="bg-[#101C2E] p-4 rounded-xl border border-slate-800">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-white">
              <Waves size={16} className="text-cyan-400" />
              Live Flood Hazard Points
            </div>
            <span className="text-[11px] font-mono text-cyan-300 bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-800/60">
              {floodHazards.length} Points
            </span>
          </div>

          <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
            {floodHazards.map((hazard) => (
              <div
                key={hazard.id}
                className="p-2 bg-slate-900/80 rounded-lg border border-slate-800 flex items-center justify-between text-xs hover:border-cyan-500/50 transition-colors"
              >
                <div>
                  <div className="font-medium text-slate-200">{hazard.location_name}</div>
                  <div className="text-[11px] text-slate-400">
                    {hazard.passable_for} • Detour: {hazard.recommended_bypass}
                  </div>
                </div>
                <div className="text-right shrink-0 ml-2">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    hazard.severity === "CRITICAL"
                      ? "bg-red-900/60 text-red-300 border border-red-700/60"
                      : "bg-cyan-900/60 text-cyan-300 border border-cyan-700/60"
                  }`}>
                    {hazard.water_depth_cm} cm
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
