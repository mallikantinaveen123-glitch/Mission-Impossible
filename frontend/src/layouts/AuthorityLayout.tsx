import React, { useState, useEffect } from "react";
import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { 
  LayoutDashboard, 
  Video, 
  Image as ImageIcon, 
  Cctv, 
  AlertTriangle, 
  Map as MapIcon, 
  BarChart3, 
  Settings, 
  Bell, 
  Search, 
  UserCircle, 
  Navigation as NavigationIcon, 
  BookOpen, 
  Radio, 
  Siren, 
  LogOut,
  Volume2,
  VolumeX,
  Cpu,
  Zap,
  Activity,
  Shield,
  Layers
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { playCyberClick, playCyberBeep, isCyberSoundEnabled, toggleCyberSound } from "@/lib/cyberSound";

export default function AuthorityLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [soundActive, setSoundActive] = useState(true);
  const [neuralHealth, setNeuralHealth] = useState(99.8);
  const [latency, setLatency] = useState(4);
  const [activeNodes, setActiveNodes] = useState(48);

  useEffect(() => {
    // Live cyber telemetry subtle fluctuations
    const interval = setInterval(() => {
      setNeuralHealth(+(99.5 + Math.random() * 0.4).toFixed(1));
      setLatency(Math.floor(3 + Math.random() * 3));
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const handleSoundToggle = () => {
    const newState = toggleCyberSound();
    setSoundActive(newState);
    if (newState) playCyberBeep();
  };

  const handleLogout = () => {
    playCyberClick();
    logout();
    navigate("/login");
  };

  return (
    <div className="flex h-screen w-full bg-background text-foreground overflow-hidden font-sans">
      {/* 2027 Futuristic Cyber Sidebar */}
      <aside className="w-64 border-r border-cyan-900/30 bg-[#0a0f1d]/95 backdrop-blur-xl flex flex-col hidden md:flex z-20">
        {/* Brand Header */}
        <div className="p-4 flex items-center justify-between border-b border-cyan-900/30 bg-gradient-to-r from-cyan-950/40 via-transparent to-transparent">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-black font-black shadow-[0_0_15px_rgba(6,182,212,0.4)] border border-cyan-300/40">
              <Shield size={20} className="text-black" />
            </div>
            <div>
              <span className="font-extrabold text-sm tracking-widest text-white block">
                AEGIS <span className="text-cyan-400">2027</span>
              </span>
              <span className="text-[10px] text-cyan-500/80 font-mono tracking-wider block">
                QUANTUM TRAFFIC GRID
              </span>
            </div>
          </div>
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
          </span>
        </div>
        
        {/* Navigation Items */}
        <nav className="flex-1 overflow-y-auto p-3 flex flex-col gap-1.5 custom-scrollbar">
          <div className="text-[10px] font-mono font-semibold text-cyan-400/70 uppercase tracking-widest px-2.5 mt-2 mb-1">
            // TACTICAL INTELLIGENCE
          </div>
          <NavItem to="/dashboard" icon={<LayoutDashboard size={17} />} label="Command Deck" />
          <NavItem to="/stations" icon={<Radio size={17} className="text-destructive animate-pulse" />} label="Inter-Station BOLO" />
          <NavItem to="/map" icon={<MapIcon size={17} />} label="Traffic & Flood Map" />
          <NavItem to="/navigation" icon={<NavigationIcon size={17} />} label="Corridor Guidance" />
          <NavItem to="/analytics" icon={<BarChart3 size={17} />} label="Quantum Analytics" />
          
          <div className="text-[10px] font-mono font-semibold text-cyan-400/70 uppercase tracking-widest px-2.5 mt-4 mb-1">
            // NEURAL SURVEILLANCE
          </div>
          <NavItem to="/detect/live" icon={<Cctv size={17} />} label="Live AI Camera" />
          <NavItem to="/cameras" icon={<Video size={17} />} label="Sensor Array Nodes" />
          <NavItem to="/detect/photo" icon={<ImageIcon size={17} />} label="Frame Forensics" />
          <NavItem to="/detect/video" icon={<Video size={17} />} label="Video Stream AI" />
          
          <div className="text-[10px] font-mono font-semibold text-cyan-400/70 uppercase tracking-widest px-2.5 mt-4 mb-1">
            // SYSTEM GOVERNANCE
          </div>
          <NavItem to="/violations" icon={<AlertTriangle size={17} />} label="Challans & Violations" />
          <NavItem to="/traffic-rules" icon={<BookOpen size={17} />} label="Regulatory Rules" />
          <NavItem to="/settings" icon={<Settings size={17} />} label="System & Security" />
        </nav>
        
        {/* Sidebar Footer Telemetry Box */}
        <div className="p-3 border-t border-cyan-900/30 bg-[#070b14]/90 text-[11px] font-mono">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="flex items-center gap-1.5 text-cyan-400">
              <Cpu size={13} /> NEURAL CORE
            </span>
            <span className="text-emerald-400 font-bold">{neuralHealth}%</span>
          </div>
          <div className="w-full bg-slate-800/80 rounded-full h-1 overflow-hidden">
            <div className="bg-gradient-to-r from-cyan-500 to-emerald-400 h-full rounded-full" style={{ width: `${neuralHealth}%` }}></div>
          </div>
          <div className="flex items-center justify-between text-[10px] text-slate-500 mt-2">
            <span>NODES: {activeNodes}/48 ONLINE</span>
            <span className="text-cyan-400">{latency}ms PING</span>
          </div>
        </div>
      </aside>

      {/* Main Command Deck Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#080d19] overflow-hidden">
        {/* 2027 HUD Header */}
        <header className="h-16 border-b border-cyan-900/30 bg-[#0a0f1d]/90 backdrop-blur-xl flex items-center justify-between px-6 shrink-0 z-10">
          {/* Search / Target Query Input */}
          <div className="flex items-center gap-4 flex-1">
            <div className="relative w-full max-w-md hidden sm:block">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-cyan-500/70" />
              <input 
                type="text" 
                placeholder="Target query: license plate, sensor ID, coordinates..." 
                className="w-full bg-slate-950/70 border border-cyan-900/40 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-cyan-400/80 transition-all font-mono"
              />
            </div>

            {/* Live Ticker Metric */}
            <div className="hidden xl:flex items-center gap-4 text-xs font-mono border-l border-cyan-900/40 pl-4 text-slate-400">
              <div className="flex items-center gap-1.5 text-cyan-300">
                <Activity size={14} className="text-cyan-400 animate-pulse" />
                <span>CITY FLOW: 96.4% OPTIMAL</span>
              </div>
              <div className="flex items-center gap-1.5 text-emerald-300">
                <Zap size={14} className="text-emerald-400" />
                <span>GRID LATENCY: {latency}ms</span>
              </div>
            </div>
          </div>
          
          {/* Header Action Controls */}
          <div className="flex items-center gap-3">
            {/* Cyber Sound Toggle */}
            <button 
              onClick={handleSoundToggle}
              title={soundActive ? "Cyber Audio Feedback: ON" : "Cyber Audio Feedback: MUTED"}
              className="p-2 rounded-xl bg-slate-900/80 border border-cyan-900/40 text-cyan-400 hover:text-cyan-200 hover:bg-slate-800 transition-all"
            >
              {soundActive ? <Volume2 size={16} /> : <VolumeX size={16} className="text-slate-500" />}
            </button>

            {/* Tactical Notifications */}
            <button 
              onClick={() => playCyberBeep()}
              className="relative p-2 rounded-xl bg-slate-900/80 border border-cyan-900/40 text-cyan-400 hover:text-cyan-200 hover:bg-slate-800 transition-all"
            >
              <Bell size={16} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.8)]"></span>
            </button>

            {/* Authenticated Operative Card */}
            <div className="flex items-center gap-3 pl-3 border-l border-cyan-900/40">
              <div className="relative">
                <UserCircle size={28} className="text-cyan-400" />
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-slate-950 rounded-full"></span>
              </div>
              <div className="hidden md:block text-xs">
                <div className="font-bold text-white leading-tight flex items-center gap-1.5">
                  {user?.full_name || "Inspector R. Sharma"}
                </div>
                <div className="text-[10px] font-mono text-cyan-400 flex items-center gap-1">
                  <span>{user?.role || "OFFICER"}</span>
                  <span className="text-slate-500">• LEVEL 4 SEC</span>
                </div>
              </div>
              <button
                onClick={handleLogout}
                title="Sign Out of Command Deck"
                className="p-2 rounded-xl text-slate-400 hover:text-red-400 hover:bg-red-950/40 transition-colors ml-1"
              >
                <LogOut size={16} />
              </button>
            </div>
          </div>
        </header>

        {/* Dynamic Page Content */}
        <main className="flex-1 overflow-auto bg-[#080d19] p-6 scanline-overlay">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function NavItem({ to, icon, label }: { to: string, icon: React.ReactNode, label: string }) {
  return (
    <NavLink 
      to={to} 
      onClick={() => playCyberClick()}
      className={({isActive}) => 
        `flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-xs font-semibold tracking-wide ${
          isActive 
            ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/40 shadow-[0_0_15px_rgba(6,182,212,0.15)] font-bold' 
            : 'text-slate-400 hover:bg-slate-900/70 hover:text-slate-200 border border-transparent hover:border-slate-800'
        }`
      }
    >
      <span className="text-cyan-400">{icon}</span>
      <span>{label}</span>
    </NavLink>
  );
}