import React, { useState, useEffect } from "react";
import { 
  Activity, 
  AlertOctagon, 
  CheckCircle2, 
  Video, 
  Radio, 
  ShieldAlert, 
  Navigation, 
  Eye, 
  Zap, 
  Cpu, 
  Waves,
  Sparkles,
  RefreshCw
} from "lucide-react";
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts";
import { getViolationsSummary, ViolationSummaryData } from "@/services/api";
import { playCyberClick, playCyberBeep, playCyberSuccess, playCyberAlert } from "@/lib/cyberSound";
import TrafficMap from "@/components/TrafficMap";

const hourlyTelemetry = [
  { time: "00:00", count: 8 },
  { time: "04:00", count: 4 },
  { time: "08:00", count: 46 },
  { time: "10:00", count: 72 },
  { time: "12:00", count: 54 },
  { time: "14:00", count: 68 },
  { time: "16:00", count: 88 },
  { time: "18:00", count: 96 },
  { time: "20:00", count: 62 },
  { time: "22:00", count: 32 },
];

export default function Dashboard() {
  const [summary, setSummary] = useState<ViolationSummaryData>({
    total: 124,
    today: 28,
    pending: 12,
    verified: 15,
    rejected: 1
  });
  const [loading, setLoading] = useState(false);
  const [activeCam, setActiveCam] = useState<"CAM-01" | "CAM-05" | "CAM-12">("CAM-01");
  const [activeTab, setActiveTab] = useState<"FEED" | "MAP">("MAP");
  const [intercepts, setIntercepts] = useState<Array<{ id: string; plate: string; type: string; station: string; status: string }>>([
    { id: "BOLO-901", plate: "TS09AB1234", type: "Multiple Red Light Jumping", station: "PS-BANJARA", status: "INTERCEPT_ACTIVE" },
    { id: "BOLO-902", plate: "MH12CD5678", type: "Triple Riding & High Speed", station: "PS-JUBILEE", status: "PATROL_ALERT" },
    { id: "BOLO-903", plate: "KA01EF9012", type: "Submerged Route Breach", station: "PS-TOLICHOWKI", status: "DIVERTED" },
  ]);

  useEffect(() => {
    async function loadSummary() {
      try {
        const data = await getViolationsSummary();
        if (data) setSummary(data);
      } catch (e) {
        console.warn("Using local telemetry snapshot");
      }
    }
    loadSummary();
  }, []);

  const handleAuthorizeIntercept = (id: string) => {
    playCyberAlert();
    setIntercepts(prev => prev.map(item => item.id === id ? { ...item, status: "DISPATCHED_TO_CHECKPOINT" } : item));
  };

  return (
    <div className="flex flex-col gap-6 max-w-[1600px] mx-auto w-full">
      {/* 2027 Command Center Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-gradient-to-r from-slate-900/90 via-cyan-950/40 to-slate-900/90 p-5 rounded-2xl border border-cyan-500/30 backdrop-blur-xl shadow-xl">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-400/30 shadow-[0_0_15px_rgba(6,182,212,0.3)]">
            <Cpu size={22} className="animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                AEGIS 2027 <span className="hologram-text">COMMAND DECK</span>
              </h1>
              <span className="text-[10px] font-mono bg-cyan-950 text-cyan-300 border border-cyan-800/80 px-2 py-0.5 rounded-md font-bold">
                GRID LEVEL: OPTIMAL
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5 font-mono">
              Live Neural Vision Engine • 48 Sensor Arrays • 100% Free OpenStreetMap Telemetry
            </p>
          </div>
        </div>

        {/* Action Pills */}
        <div className="flex items-center gap-2 text-xs font-mono">
          <div className="bg-slate-950/80 border border-slate-800 px-3 py-1.5 rounded-xl flex items-center gap-2 text-slate-300">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
            <span>AI CONFIDENCE: 99.4%</span>
          </div>
          <button
            onClick={() => { playCyberClick(); setActiveTab(activeTab === "MAP" ? "FEED" : "MAP"); }}
            className="bg-cyan-600 hover:bg-cyan-500 text-black font-bold px-3.5 py-1.5 rounded-xl transition-all shadow-[0_0_12px_rgba(6,182,212,0.3)] flex items-center gap-1.5"
          >
            <Eye size={14} />
            {activeTab === "MAP" ? "Switch to Neural HUD" : "Switch to Free Map"}
          </button>
        </div>
      </div>

      {/* 2027 Holographic KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="cyber-card p-5">
          <div className="flex items-center justify-between text-slate-400 text-xs font-mono mb-2">
            <span>// TODAY INCIDENTS</span>
            <Activity size={16} className="text-cyan-400" />
          </div>
          <div className="text-3xl font-black text-white font-mono tracking-tight">
            {summary.today}
          </div>
          <div className="flex items-center justify-between text-[11px] text-cyan-400 mt-2 font-mono">
            <span>Lifetime: {summary.total}</span>
            <span className="text-emerald-400 font-bold">↑ 4.2% Flow</span>
          </div>
        </div>

        <div className="cyber-card p-5">
          <div className="flex items-center justify-between text-slate-400 text-xs font-mono mb-2">
            <span>// PENDING VALIDATION</span>
            <AlertOctagon size={16} className="text-amber-400" />
          </div>
          <div className="text-3xl font-black text-amber-400 font-mono tracking-tight">
            {summary.pending}
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2 font-mono">
            <span>Requires Review</span>
            <span className="text-amber-300 font-bold">High Priority</span>
          </div>
        </div>

        <div className="cyber-card p-5">
          <div className="flex items-center justify-between text-slate-400 text-xs font-mono mb-2">
            <span>// VERIFIED CITATIONS</span>
            <CheckCircle2 size={16} className="text-emerald-400" />
          </div>
          <div className="text-3xl font-black text-emerald-400 font-mono tracking-tight">
            {summary.verified}
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2 font-mono">
            <span>Auto-Logged to DB</span>
            <span className="text-emerald-300 font-bold">100% Enforced</span>
          </div>
        </div>

        <div className="cyber-card p-5">
          <div className="flex items-center justify-between text-slate-400 text-xs font-mono mb-2">
            <span>// FLOOD HAZARDS MONITORED</span>
            <Waves size={16} className="text-cyan-400" />
          </div>
          <div className="text-3xl font-black text-cyan-300 font-mono tracking-tight">
            4 <span className="text-xs text-slate-400 font-normal">Active Chokepoints</span>
          </div>
          <div className="flex items-center justify-between text-[11px] text-cyan-400 mt-2 font-mono">
            <span>Bypasses Deployed</span>
            <span className="text-cyan-300 font-bold">Pumps Active</span>
          </div>
        </div>
      </div>

      {/* Main Interactive Stage: Map vs 2027 Neural Camera HUD */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 8 Cols: Map or Interactive Neural Feed */}
        <div className="lg:col-span-8 flex flex-col gap-4">
          <div className="bg-[#0e1628]/90 p-5 rounded-2xl border border-cyan-900/40 backdrop-blur-xl shadow-xl flex-1 flex flex-col">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-cyan-900/40">
              <div className="flex items-center gap-2 text-sm font-bold text-white">
                <Navigation size={17} className="text-cyan-400" />
                <span>{activeTab === "MAP" ? "Real-Time Traffic & Flood Hazard Map" : "Neural Camera Feed HUD v2027"}</span>
              </div>
              <div className="flex items-center gap-2">
                {activeTab === "FEED" && (
                  <div className="flex items-center gap-1.5 text-xs font-mono">
                    {(["CAM-01", "CAM-05", "CAM-12"] as const).map(cam => (
                      <button
                        key={cam}
                        onClick={() => { playCyberClick(); setActiveCam(cam); }}
                        className={`px-2.5 py-1 rounded-lg border transition-all ${
                          activeCam === cam 
                            ? "bg-cyan-500/20 border-cyan-400 text-cyan-300 font-bold" 
                            : "bg-slate-900 border-slate-800 text-slate-400 hover:text-white"
                        }`}
                      >
                        {cam}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Display View */}
            {activeTab === "MAP" ? (
              <div className="flex-1 min-h-[480px]">
                <TrafficMap />
              </div>
            ) : (
              /* Futuristic 2027 Camera Feed Simulator */
              <div className="relative flex-1 min-h-[480px] bg-slate-950 rounded-xl overflow-hidden border border-cyan-500/40 flex items-center justify-center scanline-overlay">
                {/* HUD Overlay Frame */}
                <div className="absolute inset-0 p-4 pointer-events-none flex flex-col justify-between z-10 font-mono text-[11px] text-cyan-400">
                  <div className="flex justify-between items-center bg-slate-950/70 p-2 rounded-lg border border-cyan-900/40">
                    <div>LIVE REC // {activeCam} (Junction HD Stream)</div>
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-red-500 animate-ping"></span>
                      <span className="text-red-400 font-bold">LIVE 120 FPS</span>
                    </div>
                  </div>

                  {/* Simulated Neural Bounding Box */}
                  <div className="self-center my-auto p-4 border-2 border-dashed border-cyan-400/80 bg-cyan-950/20 rounded-xl relative text-center">
                    <div className="text-[10px] text-cyan-300 font-bold mb-1">
                      [TARGET ACQUIRED: TS09AB1234]
                    </div>
                    <div className="text-xs text-white font-bold">
                      SPEED: 68 km/h (Limit: 50 km/h)
                    </div>
                    <div className="text-[10px] text-red-400 font-semibold mt-1">
                      VIOLATION: SPEEDING • CONFIDENCE: 98.6%
                    </div>
                  </div>

                  <div className="flex justify-between items-center bg-slate-950/70 p-2 rounded-lg border border-cyan-900/40">
                    <div>COORDS: 17.3850° N, 78.4867° E</div>
                    <div>NEURAL INFERENCE: 2.1ms</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right 4 Cols: Tactical BOLO Intercept Dispatch */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          <div className="bg-[#0e1628]/90 p-5 rounded-2xl border border-cyan-900/40 backdrop-blur-xl shadow-xl flex-1 flex flex-col">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-cyan-900/40">
              <div className="flex items-center gap-2 text-sm font-bold text-white">
                <Radio size={17} className="text-red-400 animate-pulse" />
                <span>Tactical BOLO Alerts</span>
              </div>
              <span className="text-[11px] font-mono text-cyan-400 bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-800/60 font-semibold">
                {intercepts.length} Active
              </span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-1 max-h-[500px]">
              {intercepts.map(item => (
                <div 
                  key={item.id} 
                  className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 hover:border-cyan-500/40 transition-all text-xs font-mono"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-bold text-white tracking-wider">{item.plate}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      item.status.includes("DISPATCH") 
                        ? "bg-emerald-950 text-emerald-300 border border-emerald-800" 
                        : "bg-red-950 text-red-300 border border-red-800"
                    }`}>
                      {item.status}
                    </span>
                  </div>
                  <div className="text-slate-400 text-[11px] mb-2">{item.type}</div>
                  <div className="flex items-center justify-between text-[10px] text-slate-500 pt-2 border-t border-slate-900">
                    <span>SECTOR: {item.station}</span>
                    <button
                      onClick={() => handleAuthorizeIntercept(item.id)}
                      className="text-cyan-400 hover:text-cyan-300 font-bold uppercase underline"
                    >
                      Dispatch Unit
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Quick Drone Trigger */}
            <button
              onClick={() => { playCyberSuccess(); alert("Autonomous patrol drone dispatched to Sector 4."); }}
              className="mt-4 w-full py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white text-xs font-bold font-mono transition-all shadow-[0_0_15px_rgba(6,182,212,0.25)] flex items-center justify-center gap-2"
            >
              <Sparkles size={14} />
              Deploy Drone Patrol Grid
            </button>
          </div>
        </div>
      </div>

      {/* Hourly Flow Chart */}
      <div className="bg-[#0e1628]/90 p-5 rounded-2xl border border-cyan-900/40 backdrop-blur-xl shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-white">Quantum Violation Frequency (24H)</h3>
            <p className="text-xs text-slate-400 font-mono">Neural frame incident classification distribution</p>
          </div>
          <span className="text-xs font-mono text-cyan-400">PEAK CONGESTION: 18:00</span>
        </div>

        <div className="h-[200px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={hourlyTelemetry}>
              <XAxis dataKey="time" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
              <Tooltip 
                contentStyle={{ background: "#0a0f1d", border: "1px solid #06b6d4", borderRadius: "10px", color: "#fff" }}
              />
              <Bar dataKey="count" fill="#06b6d4" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}