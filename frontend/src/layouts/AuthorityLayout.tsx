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
  LogOut
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
    <div className="flex h-screen w-full bg-background text-foreground overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 border-r border-border bg-card flex flex-col hidden md:flex">
        <div className="p-4 flex items-center gap-2 border-b border-border">
          <div className="w-8 h-8 rounded-md bg-primary flex items-center justify-center text-primary-foreground font-bold">
            AI
          </div>
          <span className="font-semibold text-lg tracking-tight">SMART TRAFFIC AI</span>
        </div>
        
        <nav className="flex-1 overflow-y-auto p-4 flex flex-col gap-1">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 mt-4 px-2">Overview</div>
          <NavItem to="/dashboard" icon={<LayoutDashboard size={18} />} label="Dashboard" />
          <NavItem to="/stations" icon={<Radio size={18} className="text-destructive animate-pulse" />} label="Station Network (BOLO)" />
          <NavItem to="/map" icon={<MapIcon size={18} />} label="Traffic Map" />
          <NavItem to="/navigation" icon={<NavigationIcon size={18} />} label="Navigation" />
          <NavItem to="/analytics" icon={<BarChart3 size={18} />} label="Analytics" />
          
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 mt-6 px-2">Detection</div>
          <NavItem to="/detect/live" icon={<Cctv size={18} />} label="Live AI Camera" />
          <NavItem to="/cameras" icon={<Video size={18} />} label="Camera Nodes" />
          <NavItem to="/detect/photo" icon={<ImageIcon size={18} />} label="Photo Analysis" />
          <NavItem to="/detect/video" icon={<Video size={18} />} label="Video Analysis" />
          
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 mt-6 px-2">Management</div>
          <NavItem to="/violations" icon={<AlertTriangle size={18} />} label="Violations & Challans" />
          <NavItem to="/traffic-rules" icon={<BookOpen size={18} />} label="Traffic Rules" />
          <NavItem to="/settings" icon={<Settings size={18} />} label="Settings" />
        </nav>
        
        <div className="p-4 border-t border-border text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            System Online
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="h-16 border-b border-border bg-card flex items-center justify-between px-6 shrink-0">
          <div className="flex items-center gap-4 flex-1">
            <div className="relative w-full max-w-md hidden sm:block">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <input 
                type="text" 
                placeholder="Search vehicles, cameras, or violation IDs..." 
                className="w-full bg-background border border-border rounded-md pl-9 pr-4 py-2 text-sm focus:outline-none focus:border-primary transition-colors"
              />
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <button className="relative p-2 text-muted-foreground hover:text-foreground transition-colors">
              <Bell size={20} />
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-destructive"></span>
            </button>
            <div className="flex items-center gap-3 pl-4 border-l border-border">
              <UserCircle size={28} className="text-primary" />
              <div className="hidden md:block text-sm">
                <div className="font-semibold text-foreground leading-tight">{user?.full_name || "Inspector R. Sharma"}</div>
                <div className="text-[11px] text-muted-foreground">{user?.role || "OFFICER"} {user?.badge_number ? `• #${user.badge_number}` : ""}</div>
              </div>
              <button
                onClick={handleLogout}
                title="Sign Out"
                className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors ml-1"
              >
                <LogOut size={18} />
              </button>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto bg-background p-6">
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
      className={({isActive}) => "flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors text-sm font-medium " + (isActive ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted hover:text-foreground')}
    >
      {icon}
      {label}
    </NavLink>
  );
}