import { useEffect, useState } from "react";
import { CircleMarker, MapContainer, Polyline, Popup, TileLayer } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { getFloodOutlook, type FloodHazard } from "@/services/api";

const trafficLines: Array<{ positions: [number, number][]; color: string; label: string }> = [
  { positions: [[17.385, 78.4867], [17.395, 78.4967], [17.405, 78.4967]], color: "#ef4444", label: "Severe congestion" },
  { positions: [[17.375, 78.4767], [17.385, 78.4867], [17.385, 78.47]], color: "#f59e0b", label: "Moderate flow" },
  { positions: [[17.405, 78.4967], [17.415, 78.5067], [17.425, 78.5167]], color: "#10b981", label: "Clear corridor" },
];

export default function TrafficMap() {
  const [showTraffic, setShowTraffic] = useState(true);
  const [showFloodOutlook, setShowFloodOutlook] = useState(true);
  const [floodHazards, setFloodHazards] = useState<FloodHazard[]>([]);

  useEffect(() => {
    getFloodOutlook().then((data) => setFloodHazards(data.hazards || [])).catch(() => setFloodHazards([]));
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#101C2E] p-4 rounded-xl border border-slate-800">
        <div>
          <div className="text-sm font-semibold text-white">OpenStreetMap + CartoDB</div>
          <div className="text-xs text-slate-400 mt-1">Free map tiles, traffic overlays, and flood outlook. No API key required.</div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowTraffic((value) => !value)} className="text-xs px-3 py-1.5 rounded border border-slate-700 text-slate-200">
            Traffic {showTraffic ? "ON" : "OFF"}
          </button>
          <button onClick={() => setShowFloodOutlook((value) => !value)} className="text-xs px-3 py-1.5 rounded border border-slate-700 text-slate-200">
            Flood outlook {showFloodOutlook ? "ON" : "OFF"}
          </button>
        </div>
      </div>
      <div className="rounded-xl overflow-hidden border border-slate-700 h-[500px]">
        <MapContainer center={[17.395, 78.46]} zoom={12} style={{ width: "100%", height: "100%" }}>
          <TileLayer attribution='&copy; OpenStreetMap contributors &copy; CartoDB' url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" />
          {showTraffic && trafficLines.map((line) => (
            <Polyline key={line.label} positions={line.positions} pathOptions={{ color: line.color, weight: 6, opacity: 0.85 }}>
              <Popup>{line.label}</Popup>
            </Polyline>
          ))}
          {showFloodOutlook && floodHazards.map((hazard) => (
            <CircleMarker key={hazard.id} center={[hazard.lat, hazard.lng]} radius={9} pathOptions={{ color: hazard.severity === "CRITICAL" ? "#ef4444" : "#f59e0b", fillOpacity: 0.75 }}>
              <Popup><strong>{hazard.location_name}</strong><br />{hazard.status_label}<br />Water depth: {hazard.water_depth_cm} cm</Popup>
            </CircleMarker>
          ))}
        </MapContainer>
      </div>
    </div>
  );
}
