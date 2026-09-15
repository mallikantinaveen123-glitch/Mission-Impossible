import { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, CircleMarker, Polyline, LayersControl } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { apiClient } from "@/services/api";
import TrafficMap from "@/components/TrafficMap";

// Fix for default marker icons in Leaflet with Vite
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const center: [number, number] = [17.3850, 78.4867];

// Mock Traffic Polylines (Simulating Google Maps traffic lines)
const trafficLines = [
  { positions: [[17.3850, 78.4867], [17.3950, 78.4967], [17.4050, 78.4967]], color: '#ef4444' }, // Heavy Traffic (Red)
  { positions: [[17.3750, 78.4767], [17.3850, 78.4867], [17.3850, 78.4700]], color: '#f59e0b' }, // Moderate Traffic (Yellow)
  { positions: [[17.4050, 78.4967], [17.4150, 78.5067], [17.4250, 78.5167]], color: '#10b981' }, // Clear Traffic (Green)
  { positions: [[17.3850, 78.4700], [17.3950, 78.4600], [17.4050, 78.4500]], color: '#ef4444' }  // Heavy Traffic (Red)
];

export default function MapView() {
  const [showTraffic, setShowTraffic] = useState(true);
  const [hotspots, setHotspots] = useState<any[]>([]);
  const [liveIncidents, setLiveIncidents] = useState<any[]>([]);

  useEffect(() => {
    // Fetch initial hotspots
    async function fetchHotspots() {
      try {
        const res = await apiClient.get("/analytics/hotspots");
        setHotspots(res.data);
      } catch (err) {
        console.error("Hotspots Error", err);
        // Fallback mock data if backend fails
        setHotspots([
          { latitude: 17.3850, longitude: 78.4867, camera: "Cam-01 (Charminar)", violation_count: 142, dominant_violation: "Red Light" },
          { latitude: 17.4050, longitude: 78.4967, camera: "Cam-05 (Banjara Hills)", violation_count: 89, dominant_violation: "No Helmet" },
          { latitude: 17.3950, longitude: 78.4600, camera: "Cam-12 (Mehdipatnam)", violation_count: 215, dominant_violation: "Speeding" }
        ]);
      }
    }
    fetchHotspots();

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
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col h-full gap-4">
      <div className="flex justify-between items-center bg-card p-4 rounded-lg border border-border">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Traffic Hotspots (Detailed)</h1>
          <p className="text-sm text-muted-foreground mt-1">Highly detailed street view with live traffic flows and incidents.</p>
        </div>
        
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setShowTraffic(!showTraffic)}
            className={`px-4 py-2 rounded-md font-semibold text-sm transition-colors ${showTraffic ? 'bg-blue-600 text-white shadow-[0_0_10px_rgba(37,99,235,0.5)]' : 'bg-muted text-foreground'}`}
          >
            {showTraffic ? "Live Traffic ON" : "Live Traffic OFF"}
          </button>
        </div>
      </div>

      <div className="flex-1 bg-card rounded-lg overflow-hidden border border-border z-0 shadow-lg">
        <MapContainer center={center} zoom={13} style={{ width: '100%', height: '100%', zIndex: 0 }}>
          <LayersControl position="topright">
            <LayersControl.BaseLayer checked name="Standard View">
              <TileLayer
                attribution='&copy; Google Maps'
                url="https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}"
              />
            </LayersControl.BaseLayer>
            <LayersControl.BaseLayer name="Satellite View">
              <TileLayer
                attribution='&copy; Google Maps Satellite'
                url="https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}"
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
                <div className="p-1 min-w-[150px]">
                  <h3 className="font-bold border-b pb-1 mb-2">{hotspot.camera}</h3>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">Violations:</span>
                    <span className="font-semibold">{hotspot.violation_count}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Dominant:</span>
                    <span className="font-semibold text-red-600">{hotspot.dominant_violation}</span>
                  </div>
                </div>
              </Popup>
            </Marker>
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
                <div className="text-red-500 font-bold">{incident.type}</div>
                <div className="text-xs text-gray-500">Live AI Detection</div>
              </Popup>
            </CircleMarker>
          ))}
        </MapContainer>
      </div>

      {/* Google Maps Integration */}
      <div className="mt-4 bg-card rounded-lg p-4 border border-border shadow-lg">
        <h2 className="text-xl font-bold mb-4">Google Maps Intelligence Layer</h2>
        <TrafficMap />
      </div>
    </div>
  );
}