import { useState, useRef } from "react";
import { MapContainer, TileLayer, Marker, Polyline, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { Search, Navigation as NavigationIcon, X, MapPin } from "lucide-react";
import axios from "axios";

// Fix for default marker icons in Leaflet with Vite
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const center: [number, number] = [17.3850, 78.4867];

// Helper to update map bounds when route changes
function MapBoundsUpdate({ bounds }: { bounds: L.LatLngBounds | null }) {
  const map = useMap();
  if (bounds) {
    map.fitBounds(bounds, { padding: [50, 50] });
  }
  return null;
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

  // Simple mock geocoding (Nominatim OpenStreetMap)
  async function geocode(query: string): Promise<[number, number] | null> {
    try {
      const res = await axios.get(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`);
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
    if (!originRef.current?.value || !destinationRef.current?.value) {
      setError("Please enter both origin and destination");
      return;
    }
    
    setLoading(true);
    try {
      const startLoc = await geocode(originRef.current.value);
      const endLoc = await geocode(destinationRef.current.value);

      if (!startLoc || !endLoc) {
        setError("Could not find one of the locations. Try being more specific.");
        setLoading(false);
        return;
      }

      setOrigin(startLoc);
      setDestination(endLoc);

      // OSRM Routing API (lon,lat)
      const res = await axios.get(`https://router.project-osrm.org/route/v1/driving/${startLoc[1]},${startLoc[0]};${endLoc[1]},${endLoc[0]}?overview=full&geometries=geojson`);
      
      if (res.data.code === "Ok") {
        const route = res.data.routes[0];
        // OSRM returns GeoJSON (lon, lat), Leaflet uses (lat, lon)
        const coords = route.geometry.coordinates.map((c: any) => [c[1], c[0]] as [number, number]);
        setRouteCoordinates(coords);
        
        // Format distance and duration
        const distKm = (route.distance / 1000).toFixed(1);
        setDistance(`${distKm} km`);
        
        const durMin = Math.round(route.duration / 60);
        setDuration(`${durMin} mins`);

        // Calculate bounds
        const bounds = L.latLngBounds(coords);
        setRouteBounds(bounds);
      }
    } catch (err) {
      console.error("Routing error:", err);
      setError("Error calculating route. Please try again.");
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
    <div className="flex flex-col md:flex-row h-full gap-4">
      {/* Sidebar for Navigation Controls */}
      <div className="w-full md:w-80 bg-card border border-border rounded-lg p-4 flex flex-col gap-4 z-10">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <NavigationIcon size={24} className="text-primary" /> Routing
        </h2>
        
        {error && <div className="text-destructive text-sm bg-destructive/10 p-2 rounded">{error}</div>}

        <div className="flex flex-col gap-3 mt-4">
          <div className="relative">
            <div className="text-xs font-semibold text-muted-foreground mb-1">ORIGIN</div>
            <div className="flex items-center bg-background border border-border rounded-md px-3 py-2">
              <MapPin size={16} className="text-emerald-500 mr-2 shrink-0" />
              <input type="text" placeholder="e.g. Charminar, Hyderabad" className="bg-transparent w-full focus:outline-none text-sm" ref={originRef} onKeyDown={e => e.key === 'Enter' && calculateRoute()} />
            </div>
          </div>
          
          <div className="relative">
            <div className="text-xs font-semibold text-muted-foreground mb-1">DESTINATION</div>
            <div className="flex items-center bg-background border border-border rounded-md px-3 py-2">
              <MapPin size={16} className="text-destructive mr-2 shrink-0" />
              <input type="text" placeholder="e.g. Gachibowli, Hyderabad" className="bg-transparent w-full focus:outline-none text-sm" ref={destinationRef} onKeyDown={e => e.key === 'Enter' && calculateRoute()} />
            </div>
          </div>

          <div className="flex gap-2 mt-2">
            <button onClick={calculateRoute} disabled={loading} className="flex-1 bg-primary text-primary-foreground py-2 rounded-md font-semibold text-sm transition-colors hover:bg-primary/90 flex items-center justify-center gap-2 disabled:opacity-50">
              {loading ? <span className="animate-spin text-xl">⟳</span> : <><Search size={16} /> Route</>}
            </button>
            <button onClick={clearRoute} className="px-3 bg-muted text-foreground py-2 rounded-md transition-colors hover:bg-muted/80">
              <X size={16} />
            </button>
          </div>
        </div>

        {distance && duration && (
          <div className="mt-4 border-t border-border pt-4 animate-in fade-in">
            <h3 className="font-semibold mb-2">Route Summary</h3>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-muted-foreground">Distance:</span>
              <span className="font-medium">{distance}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Est. Time:</span>
              <span className="font-medium text-amber-500">{duration}</span>
            </div>
          </div>
        )}
      </div>

      {/* Map Area */}
      <div className="flex-1 bg-card rounded-lg overflow-hidden border border-border z-0">
        <MapContainer center={center} zoom={12} style={{ width: '100%', height: '100%' }}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          />
          
          {origin && <Marker position={origin} />}
          {destination && <Marker position={destination} />}
          
          {routeCoordinates.length > 0 && (
            <Polyline positions={routeCoordinates} color="#3b82f6" weight={5} opacity={0.8} />
          )}

          <MapBoundsUpdate bounds={routeBounds} />
        </MapContainer>
      </div>
      <style>{`
        .leaflet-container {
          background-color: #000000;
        }
      `}</style>
    </div>
  );
}
