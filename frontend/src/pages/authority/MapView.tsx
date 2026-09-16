import React from "react";
import TrafficMap from "@/components/TrafficMap";

export default function MapView() {
  return (
    <div className="flex flex-col gap-4 max-w-6xl mx-auto w-full">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-white">Live Traffic & Flood Outlook Map</h1>
        <p className="text-xs text-slate-400 mt-0.5">
          Real-time OpenStreetMap with simulated traffic flow and waterlogging hazard points.
        </p>
      </div>

      <TrafficMap />
    </div>
  );
}