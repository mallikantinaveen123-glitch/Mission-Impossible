import React from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { 
  ShieldCheck, 
  Activity, 
  Waves, 
  ArrowRight, 
  Lock,
  Radio
} from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 flex flex-col justify-center items-center px-4 py-12 selection:bg-cyan-500/20">
      <div className="max-w-4xl mx-auto w-full text-center space-y-8">
        {/* Subtle pill */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/60 border border-cyan-800/40 text-xs font-mono text-cyan-400">
          <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
          SMART TRAFFIC AI 2027 • LIVE
        </div>

        {/* Minimal Headline */}
        <div className="space-y-3">
          <h1 className="text-4xl sm:text-6xl font-bold tracking-tight text-white leading-tight">
            Intelligent Traffic <br />
            <span className="text-cyan-400">Surveillance Network</span>
          </h1>
          <p className="text-sm sm:text-base text-slate-400 max-w-xl mx-auto leading-relaxed">
            Real-time automated traffic violation detection, instant OTP authentication, and live road waterlogging outlook.
          </p>
        </div>

        {/* Primary Call to Action */}
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <Link to="/dashboard">
            <Button size="lg" className="h-11 px-6 text-sm font-semibold rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white shadow-sm flex items-center gap-2">
              Launch Dashboard
              <ArrowRight size={15} />
            </Button>
          </Link>
          <Link to="/login">
            <Button size="lg" variant="outline" className="h-11 px-6 text-sm font-semibold rounded-lg bg-[#0d1322] border-slate-700 hover:bg-slate-800 text-slate-200">
              Sign In / OTP
            </Button>
          </Link>
          <Link to="/map">
            <Button size="lg" variant="ghost" className="h-11 px-6 text-sm font-semibold text-slate-400 hover:text-white">
              View Live Map
            </Button>
          </Link>
        </div>

        {/* Minimal 3 Feature Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-10 text-left">
          <div className="p-5 rounded-xl bg-[#0d1322] border border-slate-800">
            <div className="w-9 h-9 rounded-lg bg-cyan-950 text-cyan-400 flex items-center justify-center mb-3">
              <Activity size={18} />
            </div>
            <h3 className="text-sm font-semibold text-white mb-1">Live AI Detection</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Detects helmet violations, triple riding, speeding, and signal infractions with sub-second latency.
            </p>
          </div>

          <div className="p-5 rounded-xl bg-[#0d1322] border border-slate-800">
            <div className="w-9 h-9 rounded-lg bg-blue-950 text-blue-400 flex items-center justify-center mb-3">
              <Waves size={18} />
            </div>
            <h3 className="text-sm font-semibold text-white mb-1">Free Flood Outlook</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              100% Free OpenStreetMap telemetry tracking road submergence depth and auto-routing bypasses.
            </p>
          </div>

          <div className="p-5 rounded-xl bg-[#0d1322] border border-slate-800">
            <div className="w-9 h-9 rounded-lg bg-emerald-950 text-emerald-400 flex items-center justify-center mb-3">
              <Lock size={18} />
            </div>
            <h3 className="text-sm font-semibold text-white mb-1">Secure OTP & Auth</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              PBKDF2-HMAC-SHA256 encrypted authentication with 6-digit OTP delivery for citizens and officers.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}