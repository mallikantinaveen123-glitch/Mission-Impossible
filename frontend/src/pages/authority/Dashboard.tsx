import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { 
  Activity, 
  AlertOctagon, 
  CheckCircle2, 
  Video, 
  Map as MapIcon,
  ArrowUpRight,
  Clock
} from "lucide-react";
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts";
import { getViolationsSummary, ViolationSummaryData } from "@/services/api";

const hourlyTelemetry = [
  { time: "08:00", count: 18 },
  { time: "10:00", count: 42 },
  { time: "12:00", count: 28 },
  { time: "14:00", count: 35 },
  { time: "16:00", count: 52 },
  { time: "18:00", count: 68 },
  { time: "20:00", count: 44 },
];

export default function Dashboard() {
  const [summary, setSummary] = useState<ViolationSummaryData>({
    total: 124,
    today: 28,
    pending: 12,
    verified: 15,
    rejected: 1
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadSummary() {
      try {
        const data = await getViolationsSummary();
        if (data) setSummary(data);
      } catch (e) {
        console.warn("Using offline summary snapshot");
      } finally {
        setLoading(false);
      }
    }
    loadSummary();
  }, []);

  return (
    <div className="flex flex-col gap-5 max-w-6xl mx-auto w-full">
      {/* Page Title */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white">Operations Overview</h1>
          <p className="text-xs text-slate-400 mt-0.5">Real-time traffic telemetry and automated violations summary.</p>
        </div>
        <Link
          to="/map"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold transition-colors"
        >
          <MapIcon size={14} />
          View Live Traffic Map
        </Link>
      </div>

      {/* 4 Clean Minimal KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-xl bg-[#0d1322] border border-slate-800">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
            <span>Violations Today</span>
            <Activity size={15} className="text-cyan-400" />
          </div>
          <div className="text-2xl font-bold text-white">
            {loading ? "..." : summary.today}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Total lifetime: {summary.total}
          </div>
        </div>

        <div className="p-4 rounded-xl bg-[#0d1322] border border-slate-800">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
            <span>Pending Review</span>
            <AlertOctagon size={15} className="text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-amber-400">
            {loading ? "..." : summary.pending}
          </div>
          <div className="text-[11px] text-amber-500/80 mt-1">
            Requires officer verification
          </div>
        </div>

        <div className="p-4 rounded-xl bg-[#0d1322] border border-slate-800">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
            <span>Verified Incidents</span>
            <CheckCircle2 size={15} className="text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-emerald-400">
            {loading ? "..." : summary.verified}
          </div>
          <div className="text-[11px] text-emerald-500/80 mt-1">
            Challans generated
          </div>
        </div>

        <div className="p-4 rounded-xl bg-[#0d1322] border border-slate-800">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
            <span>Camera Nodes</span>
            <Video size={15} className="text-blue-400" />
          </div>
          <div className="text-2xl font-bold text-white">
            14 / 14
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            All nodes streaming online
          </div>
        </div>
      </div>

      {/* Main Grid: Hourly Chart & Priority Violations */}
      <div className="grid grid-cols-1 lg:grid-cols-7 gap-5">
        {/* Hourly Chart (4 cols) */}
        <div className="lg:col-span-4 p-4 rounded-xl bg-[#0d1322] border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-white">Violations Distribution (Today)</h2>
            <span className="text-[11px] text-slate-500">Hourly telemetry</span>
          </div>
          <div className="h-[220px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={hourlyTelemetry}>
                <XAxis dataKey="time" stroke="#475569" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#475569" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ background: "#090d16", borderColor: "#1e293b", borderRadius: "8px", color: "#f8fafc", fontSize: "12px" }}
                />
                <Bar dataKey="count" fill="#0284c7" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Priority Violations (3 cols) */}
        <div className="lg:col-span-3 p-4 rounded-xl bg-[#0d1322] border border-slate-800 flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-white">Recent Violations</h2>
            <Link to="/violations" className="text-xs text-cyan-400 hover:underline flex items-center gap-0.5">
              View all <ArrowUpRight size={12} />
            </Link>
          </div>

          <div className="space-y-2.5 flex-1">
            {[
              { id: "V-9021", type: "Riding without helmet", plate: "TS09AB1234", time: "2 min ago", status: "PENDING" },
              { id: "V-9020", type: "Red light jumping", plate: "KA01EF9012", time: "5 min ago", status: "VERIFIED" },
              { id: "V-9019", type: "Speeding (68 in 50 zone)", plate: "MH12CD5678", time: "11 min ago", status: "VERIFIED" },
              { id: "V-9018", type: "Triple riding", plate: "TS08XY4432", time: "18 min ago", status: "PENDING" },
            ].map(v => (
              <div key={v.id} className="p-2.5 rounded-lg bg-[#090d16] border border-slate-800/80 flex items-center justify-between text-xs">
                <div>
                  <div className="font-semibold text-slate-200">{v.type}</div>
                  <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                    <span className="font-mono text-slate-400">{v.plate}</span>
                    <span>•</span>
                    <span className="flex items-center gap-1"><Clock size={10} /> {v.time}</span>
                  </div>
                </div>
                <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                  v.status === "VERIFIED" ? "bg-emerald-950/80 text-emerald-300 border border-emerald-800" : "bg-amber-950/80 text-amber-300 border border-amber-800"
                }`}>
                  {v.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}