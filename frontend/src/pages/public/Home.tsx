import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { 
  Activity, 
  ShieldCheck, 
  Zap, 
  Radio, 
  Cpu, 
  Waves, 
  Layers, 
  Car, 
  ArrowRight, 
  Play, 
  Sparkles,
  Terminal,
  Navigation,
  Globe2
} from "lucide-react";
import { playCyberClick, playCyberBeep, playCyberSuccess, playCyberAlert } from "@/lib/cyberSound";

export default function Home() {
  // 2027 Interactive Simulation State
  const [simMode, setSimMode] = useState<"NORMAL" | "MONSOON" | "VIOLATION" | "GREEN_CORRIDOR">("NORMAL");
  const [simLog, setSimLog] = useState<string>("Neural Grid Online. All 48 sector nodes operating at 99.8% precision.");
  const [liveThroughput, setLiveThroughput] = useState(14820);
  const [activeAlerts, setActiveAlerts] = useState(2);
  const [responseLatency, setResponseLatency] = useState(3.4);

  useEffect(() => {
    const timer = setInterval(() => {
      setLiveThroughput(prev => prev + Math.floor(Math.random() * 7) - 3);
    }, 2000);
    return () => clearInterval(timer);
  }, []);

  const handleSimulate = (mode: "NORMAL" | "MONSOON" | "VIOLATION" | "GREEN_CORRIDOR") => {
    setSimMode(mode);
    if (mode === "MONSOON") {
      playCyberAlert();
      setActiveAlerts(5);
      setSimLog("MONSOON SURGE DETECTED: Tolichowki Underpass submerged (42cm). Autonomous bypass active via Shaikpet.");
    } else if (mode === "VIOLATION") {
      playCyberBeep();
      setActiveAlerts(3);
      setSimLog("NEURAL INTERCEPT: Vehicle TS09AB1234 flagged at Jubilee Hills Checkpost. 4 unpaid challans totaling ₹6,000.");
    } else if (mode === "GREEN_CORRIDOR") {
      playCyberSuccess();
      setActiveAlerts(1);
      setSimLog("EMERGENCY GREEN CORRIDOR: Apollo Hospital route cleared. Signals synchronized for medical transit.");
    } else {
      playCyberClick();
      setActiveAlerts(2);
      setSimLog("Autonomous urban flow restored. Standard surveillance protocol active.");
    }
  };

  return (
    <div className="min-h-screen bg-[#060A14] text-slate-100 relative overflow-hidden flex flex-col items-center justify-center px-4 py-16">
      {/* 2027 Ambient Cyber Glows */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[450px] bg-gradient-to-b from-cyan-500/15 via-indigo-500/10 to-transparent blur-[140px] pointer-events-none" />
      <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-cyan-600/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-purple-600/10 rounded-full blur-[140px] pointer-events-none" />

      <div className="max-w-6xl mx-auto w-full z-10 flex flex-col items-center text-center space-y-10">
        {/* Top 2027 Pill Badge */}
        <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-cyan-950/60 border border-cyan-500/40 text-xs font-mono text-cyan-300 backdrop-blur-xl shadow-[0_0_20px_rgba(6,182,212,0.2)]">
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-400"></span>
          </span>
          <span className="font-semibold tracking-wider">AEGIS PROTOCOL 2027</span>
          <span className="text-slate-500">•</span>
          <span className="text-slate-400">NEXT-GEN QUANTUM MOBILITY GRID</span>
        </div>

        {/* Hero Title */}
        <div className="space-y-4 max-w-4xl">
          <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight leading-none text-white">
            Autonomous Traffic <br />
            <span className="hologram-text">Intelligence Grid</span>
          </h1>
          <p className="text-base sm:text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed font-light">
            Real-time computer vision enforcement, instant 6-digit OTP authentication, zero-cost OpenStreetMap telemetry, and live road waterlogging outlook.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
          <Link to="/dashboard" onClick={() => playCyberClick()}>
            <Button size="lg" className="h-13 px-8 text-sm sm:text-base font-bold rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black shadow-[0_0_25px_rgba(6,182,212,0.4)] border border-cyan-300/60 transition-all flex items-center gap-2">
              <Zap size={18} className="text-black" />
              Access 2027 Command Deck
              <ArrowRight size={16} className="text-black" />
            </Button>
          </Link>
          <Link to="/login" onClick={() => playCyberClick()}>
            <Button size="lg" variant="outline" className="h-13 px-8 text-sm sm:text-base font-semibold rounded-xl bg-slate-900/80 border-cyan-800/60 hover:bg-slate-800/80 text-cyan-300 hover:text-white transition-all backdrop-blur-md">
              Secure Auth & OTP Portal
            </Button>
          </Link>
        </div>

        {/* 2027 INTERACTIVE NEURAL SIMULATOR WIDGET */}
        <div className="w-full max-w-4xl mt-6 p-6 rounded-2xl bg-gradient-to-b from-[#0e1628]/90 to-[#090d18]/90 border border-cyan-500/30 backdrop-blur-2xl shadow-2xl text-left relative overflow-hidden">
          {/* Holographic Header Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-cyan-900/40">
            <div className="flex items-center gap-2.5">
              <Terminal size={18} className="text-cyan-400" />
              <span className="font-mono text-xs font-bold tracking-widest text-cyan-300 uppercase">
                // 2027 LIVE SIMULATION ENGINE
              </span>
            </div>
            <div className="flex items-center gap-3 text-xs font-mono text-slate-400">
              <span className="flex items-center gap-1.5">
                <Globe2 size={13} className="text-cyan-400" /> SATELLITE: SYNCED
              </span>
              <span className="text-cyan-400">{responseLatency}ms PING</span>
            </div>
          </div>

          {/* Interactive Scenario Controls */}
          <div className="py-4">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2.5">
              Select Live Interactive Scenario:
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                onClick={() => handleSimulate("NORMAL")}
                className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                  simMode === "NORMAL"
                    ? "bg-cyan-500/20 border-cyan-400 text-cyan-200 shadow-[0_0_12px_rgba(6,182,212,0.3)]"
                    : "bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200"
                }`}
              >
                <Activity size={14} /> Normal Flow
              </button>
              <button
                onClick={() => handleSimulate("MONSOON")}
                className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                  simMode === "MONSOON"
                    ? "bg-blue-600/30 border-blue-400 text-blue-200 shadow-[0_0_12px_rgba(59,130,246,0.4)]"
                    : "bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200"
                }`}
              >
                <Waves size={14} /> Monsoon Flood
              </button>
              <button
                onClick={() => handleSimulate("VIOLATION")}
                className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                  simMode === "VIOLATION"
                    ? "bg-red-600/30 border-red-400 text-red-200 shadow-[0_0_12px_rgba(239,68,68,0.4)]"
                    : "bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200"
                }`}
              >
                <Radio size={14} /> Defaulter BOLO
              </button>
              <button
                onClick={() => handleSimulate("GREEN_CORRIDOR")}
                className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                  simMode === "GREEN_CORRIDOR"
                    ? "bg-emerald-600/30 border-emerald-400 text-emerald-200 shadow-[0_0_12px_rgba(16,185,129,0.4)]"
                    : "bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200"
                }`}
              >
                <Sparkles size={14} /> Green Corridor
              </button>
            </div>
          </div>

          {/* Real-time Telemetry Stats Strip */}
          <div className="grid grid-cols-3 gap-3 p-3 bg-slate-950/70 rounded-xl border border-slate-800/80 mb-4">
            <div>
              <div className="text-[10px] font-mono text-slate-500 uppercase">Throughput Rate</div>
              <div className="text-base font-bold text-white font-mono mt-0.5">
                {liveThroughput.toLocaleString()} <span className="text-[11px] font-normal text-slate-400">veh/hr</span>
              </div>
            </div>
            <div>
              <div className="text-[10px] font-mono text-slate-500 uppercase">Active Incidents</div>
              <div className="text-base font-bold text-cyan-400 font-mono mt-0.5">
                {activeAlerts} <span className="text-[11px] font-normal text-slate-400">nodes</span>
              </div>
            </div>
            <div>
              <div className="text-[10px] font-mono text-slate-500 uppercase">AI Neural Sync</div>
              <div className="text-base font-bold text-emerald-400 font-mono mt-0.5">
                99.8% <span className="text-[11px] font-normal text-slate-400">precision</span>
              </div>
            </div>
          </div>

          {/* Live System Log Box */}
          <div className="p-3 bg-slate-950/90 rounded-xl border border-cyan-900/40 text-xs font-mono text-cyan-300 flex items-start gap-2">
            <span className="text-cyan-500 shrink-0 font-bold">&gt;</span>
            <span className="leading-relaxed">{simLog}</span>
          </div>
        </div>

        {/* 3 Pillars Matrix */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6 text-left w-full">
          <div className="cyber-card p-6 border-cyan-800/30">
            <div className="h-12 w-12 rounded-xl bg-cyan-950/80 border border-cyan-500/40 flex items-center justify-center mb-4 text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.2)]">
              <Activity className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Quantum Analytics</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Sub-millisecond vehicle telemetry tracking, density heatmaps, and high-frequency violation logging.
            </p>
          </div>

          <div className="cyber-card p-6 border-cyan-800/30">
            <div className="h-12 w-12 rounded-xl bg-emerald-950/80 border border-emerald-500/40 flex items-center justify-center mb-4 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Neural Enforcement</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Instant AI detection for no-helmet, triple riding, speeding, and cross-sector defaulter intercept dispatch.
            </p>
          </div>

          <div className="cyber-card p-6 border-cyan-800/30">
            <div className="h-12 w-12 rounded-xl bg-purple-950/80 border border-purple-500/40 flex items-center justify-center mb-4 text-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.2)]">
              <Waves className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Free Map & Flood Outlook</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              100% Free OpenStreetMap engine with live waterlogging hazard depth and automated smart vehicle detours.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}