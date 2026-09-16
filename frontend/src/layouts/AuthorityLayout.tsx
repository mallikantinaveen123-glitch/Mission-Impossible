import React from "react";
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
  BookOpen, 
  Radio, 
  LogOut,
  Shield
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";

export default function AuthorityLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="flex h-screen w-full bg-[#090d16] text-slate-100 overflow-hidden font-sans">
      {/* Clean Minimal Sidebar */}
      <aside className="w-60 border-r border-slate-800 bg-[#0d1322] flex flex-col hidden md:flex shrink-0">
        {/* Brand */}
        <div className="p-4 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-600 flex items-center justify-center text-white font-bold shadow-sm">
              <Shield size={18} />
            </div>
            <div>
              <span className="font-bold text-sm tracking-wide text-white block leading-tight">
                SMART TRAFFIC
              </span>
              <span className="text-[10px] text-cyan-400 font-mono">
                AI SYSTEM 2027
              </span>
            </div>
          </div>
        </div>
        
        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-3 flex flex-col gap-1">
          <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider px-2 mt-2 mb-1">
            Operations
          </div>
          <NavItem to="/dashboard" icon={<LayoutDashboard size={16} />} label="Dashboard" />
          <NavItem to="/stations" icon={<Radio size={16} className="text-red-400" />} label="Station BOLO" />
          <NavItem to="/map" icon={<MapIcon size={16} />} label="Traffic & Flood Map" />
          <NavItem to="/analytics" icon={<BarChart3 size={16} />} label="Analytics" />
          
          <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider px-2 mt-4 mb-1">
            AI Detection
          </div>
          <NavItem to="/detect/live" icon={<Cctv size={16} />} label="Live Camera AI" />
          <NavItem to="/cameras" icon={<Video size={16} />} label="Camera Nodes" />
          <NavItem to="/detect/photo" icon={<ImageIcon size={16} />} label="Photo Analysis" />
          <NavItem to="/detect/video" icon={<Video size={16} />} label="Video Analysis" />
          
          <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider px-2 mt-4 mb-1">
            Management
          </div>
          <NavItem to="/violations" icon={<AlertTriangle size={16} />} label="Violations" />
          <NavItem to="/traffic-rules" icon={<BookOpen size={16} />} label="Traffic Rules" />
          <NavItem to="/settings" icon={<Settings size={16} />} label="Settings" />
        </nav>
        
        {/* Footer Status */}
        <div className="p-3 border-t border-slate-800 text-xs text-slate-400 flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            System Online
          </span>
          <span className="text-[10px] text-slate-500 font-mono">v2027.1</span>
        </div>
      </aside>

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#090d16] overflow-hidden">
        {/* Minimal Header */}
        <header className="h-14 border-b border-slate-800 bg-[#0d1322] flex items-center justify-between px-5 shrink-0">
          <div className="flex items-center gap-3 flex-1 max-w-md">
            <div className="relative w-full">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-500" />
              <input 
                type="text" 
                placeholder="Search plate number, camera ID, or alert..." 
                className="w-full bg-[#090d16] border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <button className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors">
              <Bell size={16} />
            </button>

            <div className="flex items-center gap-2 pl-3 border-l border-slate-800">
              <UserCircle size={22} className="text-cyan-400" />
              <div className="hidden sm:block text-xs">
                <div className="font-semibold text-slate-200 leading-tight">
                  {user?.full_name || "Inspector R. Sharma"}
                </div>
                <div className="text-[10px] text-slate-500">
                  {user?.role || "OFFICER"}
                </div>
              </div>
              <button
                onClick={handleLogout}
                title="Sign Out"
                className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-slate-800 transition-colors ml-1"
              >
                <LogOut size={15} />
              </button>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto bg-[#090d16] p-5">
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
      className={({isActive}) => 
        `flex items-center gap-2.5 px-3 py-2 rounded-lg transition-colors text-xs font-medium ${
          isActive 
            ? 'bg-cyan-500/10 text-cyan-400 font-semibold' 
            : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
        }`
      }
    >
      <span>{icon}</span>
      <span>{label}</span>
    </NavLink>
  );
}