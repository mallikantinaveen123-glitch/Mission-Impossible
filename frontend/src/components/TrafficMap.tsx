import { useState } from 'react';
import { GoogleMap, useJsApiLoader, TrafficLayer, DirectionsRenderer, Marker } from '@react-google-maps/api';
import { MapContainer, TileLayer, Marker as LeafletMarker, Popup as LeafletPopup, Polyline, CircleMarker } from 'react-leaflet';

const containerStyle = {
  width: '100%',
  height: '500px',
  borderRadius: '12px'
};

const center = {
  lat: 17.3850,
  lng: 78.4867
};

const fallbackTrafficLines = [
  { positions: [[17.3850, 78.4867], [17.3950, 78.4967], [17.4050, 78.4967]], color: '#ef4444' },
  { positions: [[17.3750, 78.4767], [17.3850, 78.4867], [17.3850, 78.4700]], color: '#f59e0b' },
  { positions: [[17.4050, 78.4967], [17.4150, 78.5067], [17.4250, 78.5167]], color: '#10b981' },
];

export default function TrafficMap() {
  const googleMapsApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';
  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey,
    libraries: ['places']
  });

  const [directionsResponse, setDirectionsResponse] = useState<google.maps.DirectionsResult | null>(null);
  const [origin, setOrigin] = useState('Jubilee Hills, Hyderabad');
  const [destination, setDestination] = useState('Banjara Hills, Hyderabad');
  const [showTraffic, setShowTraffic] = useState(true);

  const calculateRoute = () => {
    if (!googleMapsApiKey) {
      setDirectionsResponse(null);
      return;
    }
    if (!origin || !destination) return;
    const directionsService = new window.google.maps.DirectionsService();
    directionsService.route(
      {
        origin,
        destination,
        travelMode: window.google.maps.TravelMode.DRIVING,
      },
      (result, status) => {
        if (status === 'OK' && result) {
          setDirectionsResponse(result);
        } else {
          console.error(`Directions request failed: ${status}`);
          setDirectionsResponse(null);
        }
      }
    );
  };

  if (!googleMapsApiKey) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3 bg-[#101C2E] p-4 rounded-xl border border-slate-800">
          <div className="text-sm text-amber-300">
            Google Maps API key not configured. Showing the fallback live traffic map.
          </div>
          <button
            onClick={() => setShowTraffic(!showTraffic)}
            className="bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 px-3 py-1.5 rounded border border-slate-700"
          >
            {showTraffic ? 'Hide Traffic' : 'Show Traffic'}
          </button>
        </div>
        <div className="rounded-xl overflow-hidden border border-slate-700 h-[500px]">
          <MapContainer center={[17.3850, 78.4867]} zoom={13} style={{ width: '100%', height: '100%' }}>
            <TileLayer
              attribution='&copy; OpenStreetMap contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {showTraffic && fallbackTrafficLines.map((line, idx) => (
              <Polyline key={idx} positions={line.positions as [number, number][]} pathOptions={{ color: line.color, weight: 6, opacity: 0.8 }} />
            ))}
            <CircleMarker center={[17.3850, 78.4867]} radius={9} pathOptions={{ color: '#f97316', fillColor: '#f97316', fillOpacity: 0.75 }}>
              <LeafletPopup>Hyderabad traffic monitoring node</LeafletPopup>
            </CircleMarker>
            <LeafletMarker position={[17.3850, 78.4867]}>
              <LeafletPopup>Traffic hotspot</LeafletPopup>
            </LeafletMarker>
          </MapContainer>
        </div>
      </div>
    );
  }

  if (loadError) return <div className="text-red-400 p-6">Error loading Google Maps script. Check your API key.</div>;
  if (!isLoaded) return <div className="text-slate-400 p-6">Loading Google Maps Intelligence Layer...</div>;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#101C2E] p-4 rounded-xl border border-slate-800">
        <div className="flex items-center gap-3">
          <input 
            type="text" 
            value={origin} 
            onChange={(e) => setOrigin(e.target.value)} 
            placeholder="Starting Junction" 
            className="bg-[#08111F] border border-slate-700 rounded px-3 py-1.5 text-xs text-white"
          />
          <span className="text-slate-400 text-xs">to</span>
          <input 
            type="text" 
            value={destination} 
            onChange={(e) => setDestination(e.target.value)} 
            placeholder="Target Hotspot" 
            className="bg-[#08111F] border border-slate-700 rounded px-3 py-1.5 text-xs text-white"
          />
          <button onClick={calculateRoute} className="bg-blue-600 hover:bg-blue-500 text-white text-xs px-3 py-1.5 rounded font-medium">
            Calculate Navigation Route
          </button>
        </div>
        <button 
          onClick={() => setShowTraffic(!showTraffic)} 
          className="bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 px-3 py-1.5 rounded border border-slate-700"
        >
          {showTraffic ? "Hide Live Traffic Layer" : "Show Live Traffic Layer"}
        </button>
      </div>

      <GoogleMap
        mapContainerStyle={containerStyle}
        center={center}
        zoom={13}
        options={{
          styles: [
            { elementType: "geometry", stylers: [{ color: "#101C2E" }] },
            { elementType: "labels.text.fill", stylers: [{ color: "#8a9ba8" }] },
            { featureType: "road", elementType: "geometry", stylers: [{ color: "#1c2a44" }] },
            { featureType: "water", elementType: "geometry", stylers: [{ color: "#08111F" }] }
          ]
        }}
      >
        {showTraffic && <TrafficLayer />}
        <Marker position={center} title="Jubilee Hills Central Node" />
        {directionsResponse && <DirectionsRenderer directions={directionsResponse} />}
      </GoogleMap>
    </div>
  );
}
