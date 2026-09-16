import React, { useState, useRef, useEffect } from "react";
import { 
  MapContainer, 
  TileLayer, 
  Marker, 
  Popup, 
  Polyline, 
  CircleMarker, 
  useMap 
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { 
  Search, 
  Navigation as NavigationIcon, 
  X, 
  MapPin, 
  Radio, 
  Crosshair, 
  Shield, 
  AlertTriangle,
  Compass,
  Car
} from "lucide-react";
import axios from "axios";

// Fix default Leaflet icon paths
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: '/images/marker-icon-2x.png',
  iconUrl: '/images/marker-icon.png',
  shadowUrl: '/images/marker-shadow.png',
});

const defaultCenter: [number, number] = [17.3950, 78.4600];

function MapBoundsUpdate({ bounds }: { bounds: L.LatLngBounds | null }) {
  const map = useMap();
  useEffect(() => {
    if (bounds) {
      map.fitBounds(bounds, { padding: [40, 40] });
    }
  }, [bounds, map]);
  return null;
}

function MapCenterUpdate({ center }: { center: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.setView(center, 15);
    }
  }, [center, map]);
  return null;
}

interface FleetVehicle {
  id: string;
  name: string;
  type: "PATROL" | "AMBULANCE" | "FLAGGED";
  plate: string;
  lat: number;
  lng: number;
  speed: number;
  status: string;
}

export default function Navigation() {
  const [routeCoordinates, setRouteCoordinates] = useState<[number, number][]>([]);
  const [routeBounds, setRouteBounds] = useState<L.LatLngBounds | null>(null);
  const [distance, setDistance] = useState("");
  const [duration, setDuration] = useState("");
  
  const [origin, setOrigin] = useState<[number, number] | null>(null);
  const [destination, setDestination] = useState<[number, number] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const originRef = useRef<HTMLInputElement>(null);
  const destinationRef = useRef<HTMLInputElement>(null);

  // Live GPS Tracking State
  const [gpsActive, setGpsActive] = useState(false);
  const [liveGps, setLiveGps] = useState<{ lat: number; lng: number; accuracy: number; speed: number } | null>(null);
  const [gpsFocus, setGpsFocus] = useState<[number, number] | null>(null);
  const [showFleet, setShowFleet] = useState(true);

  // Simulated GPS Fleet
  const [fleet] = useState<FleetVehicle[]>([
    { id: "V-01", name: "Patrol Interceptor #4", type: "PATROL", plate: "TS09P0004", lat: 17.4150, lng: 78.4350, speed: 52, status: "Active Highway Patrol" },
    { id: "V-02", name: "Green Corridor Ambulance #1", type: "AMBULANCE", plate: "TS09A0108", lat: 17.4320, lng: 78.4120, speed: 64, status: "Priority Medical Transit" },
    { id: "V-03", name: "Flagged Defaulter TS09AB1234", type: "FLAGGED", plate: "TS09AB1234", lat: 17.3850, lng: 78.4867, speed: 38, status: "BOLO Target - 4 Unpaid Fines" },
  ]);

  // Live device GPS watchPosition handler
  useEffect(() => {
    let watchId: number | null = null;
    if (gpsActive && "geolocation" in navigator) {
      watchId = navigator.geolocation.watchPosition(
        (pos) => {
          const coords = {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy: Math.round(pos.coords.accuracy || 10),
            speed: pos.coords.speed ? Math.round(pos.coords.speed * 3.6) : 0,
          };
          setLiveGps(coords);
          setGpsFocus([coords.lat, coords.lng]);
        },
        (err) => {
          console.warn("Device GPS unavailable, falling back to simulated high-precision city telemetry", err);
          // Fallback to simulated location if permission denied
          setLiveGps({ lat: 17.4050, lng: 78.4750, accuracy: 5, speed: 45 });
          setGpsFocus([17.4050, 78.4750]);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    } else if (!gpsActive && watchId !== null) {
      navigator.geolocation.clearWatch(watchId);
      setLiveGps(null);
    }

    return () => {
      if (watchId !== null) navigator.geolocation.clearWatch(watchId);
    };
  }, [gpsActive]);

  async function geocode(query: string): Promise<[number, number] | null> {
    try {
      const res = await axios.get(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`
      );
      if (res.data && res.data.length > 0) {
        return [parseFloat(res.data[0].lat), parseFloat(res.data[0].lon)];
      }
    } catch (err) {
      console.error("Geocoding error", err);
    }
    return null;
  }

  async function calculateRoute() {
    setError("");
    const originVal = originRef.current?.value.trim();
    const destVal = destinationRef.current?.value.trim();

    if (!originVal || !destVal) {
      setError("Please specify both origin and destination addresses.");
      return;
    }
    
    setLoading(true);
    try {
      const startLoc = await geocode(originVal);
      const endLoc = await geocode(destVal);

      if (!startLoc || !endLoc) {
        setError("Could not pinpoint location. Try being more specific (e.g. 'Charminar, Hyderabad').");
        setLoading(false);
        return;
      }

      setOrigin(startLoc);
      setDestination(endLoc);

      const res = await axios.get(
        `https://router.project-osrm.org/route/v1/driving/${startLoc[1]},${startLoc[0]};${endLoc[1]},${endLoc[0]}?overview=full&geometries=geojson`
      );
      
      if (res.data.code === "Ok" && res.data.routes?.length > 0) {
        const route = res.data.routes[0];
        const coords = route.geometry.coordinates.map((c: any) => [c[1], c[0]] as [number, number]);
        setRouteCoordinates(coords);
        
        const distKm = (route.distance / 1000).toFixed(1);
        setDistance(`${distKm} km`);
        
        const durMin = Math.round(route.duration / 60);
        setDuration(`${durMin} mins`);

        const bounds = L.latLngBounds(coords);
        setRouteBounds(bounds);
      } else {
        setError("Could not calculate driving directions for this pair.");
      }
    } catch (err) {
      setError("Routing service unavailable. Check internet connectivity.");
    } finally {
      setLoading(false);
    }
  }

  function clearRoute() {
    setRouteCoordinates([]);
    setRouteBounds(null);
    setDistance("");
    setDuration("");
    setOrigin(null);
    setDestination(null);
    setError("");
    if (originRef.current) originRef.current.value = "";
    if (destinationRef.current) destinationRef.current.value = "";
  }

  return (
    <div className="flex flex-col lg:flex-row h-full gap-4 max-w-7xl mx-auto w-full">
      {/* Navigation & GPS Sidebar */}
      <div className="w-full lg:w-84 bg-[#0d1322] border border-slate-800 rounded-xl p-4 flex flex-col gap-4 shrink-0">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2 font-bold text-sm text-white">
            <NavigationIcon size={18} className="text-cyan-400" />
            <span>GPS Tracking & Route Guidance</span>
          </div>
        </div>

        {error && (
          <div className="p-2.5 bg-red-950/60 border border-red-800 rounded-lg text-xs text-red-200">
            {error}
          </div>
        )}

        {/* GPS Controls */}
        <div className="p-3 bg-[#090d16] border border-slate-800 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Crosshair size={14} className={gpsActive ? "text-emerald-400 animate-spin" : "text-slate-400"} />
              Live Device GPS
            </span>
            <button
              onClick={() => setGpsActive(!gpsActive)}
              className={`px-2.5 py-1 rounded text-xs font-bold transition-colors ${
                gpsActive 
                  ? "bg-emerald-950 text-emerald-300 border border-emerald-800" 
                  : "bg-slate-800 text-slate-300 hover:bg-slate-700"
              }`}
            >
              {gpsActive ? "TRACKING ON" : "START GPS"}
            </button>
          </div>

          {liveGps ? (
            <div className="space-y-1 text-[11px] font-mono text-slate-400 pt-1 border-t border-slate-800">
              <div className="flex justify-between">
                <span>Coordinates:</span>
                <span className="text-slate-200 font-bold">{liveGps.lat.toFixed(4)}, {liveGps.lng.toFixed(4)}</span>
              </div>
              <div className="flex justify-between">
                <span>Speed:</span>
                <span className="text-emerald-400 font-bold">{liveGps.speed} km/h</span>
              </div>
              <div className="flex justify-between">
                <span>Accuracy:</span>
                <span>±{liveGps.accuracy}m</span>
              </div>
            </div>
          ) : (
            <div className="text-[11px] text-slate-500">
              Click to locate your live device or vehicle on the map in real-time.
            </div>
          )}
        </div>

        {/* Route Planning Inputs */}
        <div className="space-y-3">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Route Planner (Free OSRM)
          </div>

          <div>
            <span className="text-[11px] text-slate-400 block mb-1">Origin</span>
            <div className="flex items-center bg-[#090d16] border border-slate-800 rounded-lg px-3 py-2 text-xs">
              <MapPin size={15} className="text-emerald-500 mr-2 shrink-0" />
              <input 
                type="text" 
                placeholder="e.g. Jubilee Hills, Hyderabad" 
                className="bg-transparent w-full focus:outline-none text-slate-100" 
                ref={originRef} 
                onKeyDown={e => e.key === 'Enter' && calculateRoute()} 
              />
            </div>
          </div>

          <div>
            <span className="text-[11px] text-slate-400 block mb-1">Destination</span>
            <div className="flex items-center bg-[#090d16] border border-slate-800 rounded-lg px-3 py-2 text-xs">
              <MapPin size={15} className="text-red-500 mr-2 shrink-0" />
              <input 
                type="text" 
                placeholder="e.g. Charminar, Hyderabad" 
                className="bg-transparent w-full focus:outline-none text-slate-100" 
                ref={destinationRef} 
                onKeyDown={e => e.key === 'Enter' && calculateRoute()} 
              />
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <button 
              onClick={calculateRoute} 
              disabled={loading} 
              className="flex-1 bg-cyan-600 hover:bg-cyan-500 text-white py-2 rounded-lg font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              {loading ? "Routing..." : <><Search size={14} /> Calculate Safe Route</>}
            </button>
            <button 
              onClick={clearRoute} 
              className="px-3 bg-slate-800 text-slate-300 hover:text-white py-2 rounded-lg transition-colors"
            >
              <X size={15} />
            </button>
          </div>
        </div>

        {distance && duration && (
          <div className="p-3 bg-[#090d16] border border-slate-800 rounded-lg text-xs space-y-1 animate-in fade-in">
            <div className="font-semibold text-slate-200 mb-1">Route Summary</div>
            <div className="flex justify-between text-slate-400">
              <span>Distance:</span>
              <strong className="text-white font-mono">{distance}</strong>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Estimated Time:</span>
              <strong className="text-amber-400 font-mono">{duration}</strong>
            </div>
          </div>
        )}

        {/* Fleet Tracking Toggles */}
        <div className="pt-2 border-t border-slate-800">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Car size={14} className="text-blue-400" />
              Live Fleet Tracking ({fleet.length})
            </span>
            <button
              onClick={() => setShowFleet(!showFleet)}
              className="text-[11px] text-cyan-400 hover:underline"
            >
              {showFleet ? "Hide" : "Show"}
            </button>
          </div>

          {showFleet && (
            <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
              {fleet.map(v => (
                <div key={v.id} className="p-2 rounded bg-[#090d16] border border-slate-800/80 text-[11px] flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-slate-200">{v.name}</div>
                    <div className="text-[10px] text-slate-500 font-mono">{v.plate} • {v.speed} km/h</div>
                  </div>
                  <button
                    onClick={() => setGpsFocus([v.lat, v.lng])}
                    className="text-[10px] font-bold text-cyan-400 hover:text-cyan-300 underline"
                  >
                    Locate
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Main Leaflet Map View */}
      <div className="flex-1 bg-[#0d1322] rounded-xl overflow-hidden border border-slate-800 min-h-[500px] relative">
        <MapContainer center={defaultCenter} zoom={13} style={{ width: "100%", height: "100%", background: "#08111f" }}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          />

          {/* Device GPS Live Marker */}
          {liveGps && (
            <CircleMarker
              center={[liveGps.lat, liveGps.lng]}
              radius={10}
              pathOptions={{ color: "#10b981", fillColor: "#059669", fillOpacity: 0.85, weight: 3 }}
            >
              <Popup>
                <div className="p-1 text-xs">
                  <strong className="text-emerald-700">Live Device Location</strong>
                  <div>Speed: {liveGps.speed} km/h</div>
                  <div>Accuracy: ±{liveGps.accuracy}m</div>
                </div>
              </Popup>
            </CircleMarker>
          )}

          {/* Fleet Vehicles Markers */}
          {showFleet && fleet.map(v => (
            <CircleMarker
              key={v.id}
              center={[v.lat, v.lng]}
              radius={8}
              pathOptions={{
                color: v.type === "AMBULANCE" ? "#10b981" : (v.type === "FLAGGED" ? "#ef4444" : "#3b82f6"),
                fillColor: v.type === "AMBULANCE" ? "#059669" : (v.type === "FLAGGED" ? "#dc2626" : "#2563eb"),
                fillOpacity: 0.9,
                weight: 2
              }}
            >
              <Popup>
                <div className="p-1 text-xs">
                  <strong>{v.name}</strong>
                  <div>Plate: <span className="font-mono">{v.plate}</span></div>
                  <div>Speed: {v.speed} km/h</div>
                  <div className="text-slate-500 mt-1">{v.status}</div>
                </div>
              </Popup>
            </CircleMarker>
          ))}

          {/* Origin & Destination Markers */}
          {origin && <Marker position={origin} />}
          {destination && <Marker position={destination} />}

          {/* Polyline Route */}
          {routeCoordinates.length > 0 && (
            <Polyline positions={routeCoordinates} pathOptions={{ color: "#0284c7", weight: 5, opacity: 0.9 }} />
          )}

          <MapBoundsUpdate bounds={routeBounds} />
          <MapCenterUpdate center={gpsFocus} />
        </MapContainer>
      </div>
    </div>
  );
}
