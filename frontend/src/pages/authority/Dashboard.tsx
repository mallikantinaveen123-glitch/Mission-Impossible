import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { 
  Activity, 
  AlertOctagon, 
  CheckCircle2, 
  Video, 
  Map as MapIcon,
  ArrowUpRight,
  Clock,
  Radio,
  Wifi
} from "lucide-react";
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts";
import { getViolationsSummary, ViolationSummaryData } from "@/services/api";

const initialHourlyTelemetry = [
  { time: "08:00", count: 18 },
  { time: "10:00", count: 42 },
  { time: "12:00", count: 28 },
  { time: "14:00", count: 35 },
  { time: "16:00", count: 52 },
  { time: "18:00", count: 68 },
  { time: "20:00", count: 44 },
];

interface RecentViolationItem {
  id: string;
  type: string;
  plate: string;
  time: string;
  status: string;
}

export default function Dashboard() {
  const [summary, setSummary] = useState<ViolationSummaryData>({
    total: 124,
    today: 28,
    pending: 12,
    verified: 15,
    rejected: 1
  });
  const [recentViolations, setRecentViolations] = useState<RecentViolationItem[]>([
    { id: "V-9021", type: "Riding without helmet", plate: "TS09AB1234", time: "Just now", status: "PENDING" },
    { id: "V-9020", type: "Red light jumping", plate: "KA01EF9012", time: "5 min ago", status: "VERIFIED" },
    { id: "V-9019", type: "Speeding (68 in 50 zone)", plate: "MH12CD5678", time: "11 min ago", status: "VERIFIED" },
    { id: "V-9018", type: "Triple riding", plate: "TS08XY4432", time: "18 min ago", status: "PENDING" },
  ]);
  const [loading, setLoading] = useState(true);
  const [wsConnected, setWsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  // Initial summary load
  useEffect(() => {
    async function loadSummary() {
      try {
        const data = await getViolationsSummary();
        if (data) setSummary(data);
      } catch {
        console.warn("Using offline summary snapshot");
      } finally {
        setLoading(false);
      }
    }
    loadSummary();
  }, []);

  // WebSocket Live Telemetry Stream
  useEffect(() => {
    const wsProtocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const host = window.location.hostname === "localhost" ? "localhost:8000" : window.location.host;
    const wsUrl = `${wsProtocol}//${host}/api/v1/ws/telemetry`;

    let socket: WebSocket | null = null;
    let heartbeatTimer: any = null;

    try {
      socket = new WebSocket(wsUrl);
      wsRef.current = socket;

      socket.onopen = () => {
        setWsConnected(true);
        // Send heartbeat ping every 25 seconds
        heartbeatTimer = setInterval(() => {
          if (socket && socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({ type: "PING" }));
          }
        }, 25000);
      };

      socket.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload.event === "VIOLATION_DETECTED" && payload.data) {
            const v = payload.data;
            setSummary(prev => ({
              ...prev,
              total: prev.total + 1,
              today: prev.today + 1,
              pending: prev.pending + 1
            }));

            setRecentViolations(prev => [
              {
                id: `V-${v.violation_id || Math.floor(Math.random() * 9000 + 1000)}`,
                type: v.violation_type?.replace(/_/g, " ") || "Traffic Violation",
                plate: v.plate_number || "UNRECORDED",
                time: "Just now",
                status: "PENDING"
              },
              ...prev.slice(0, 4)
            ]);
          } else if (payload.event === "VIOLATION_VERIFIED") {
            setSummary(prev => ({
              ...prev,
              pending: Math.max(0, prev.pending - 1),
              verified: prev.verified + 1
            }));
          } else if (payload.event === "CHALLAN_PAID") {
            setSummary(prev => ({
              ...prev,
              verified: Math.max(0, prev.verified - 1)
            }));
          }
        } catch {
          // Ignore parse errors
        }
      };

      socket.onclose = () => {
        setWsConnected(false);
      };

      socket.onerror = () => {
        setWsConnected(false);
      };
    } catch {
      setWsConnected(false);
    }

    return () => {
      if (heartbeatTimer) clearInterval(heartbeatTimer);
      if (socket) socket.close();
    };
  }, []);

  return (
    <div className="flex flex-col gap-5 max-w-6xl mx-auto w-full">
      {/* Page Title & Live Stream Status */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-white">Operations Command Deck</h1>
            <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide uppercase border ${
              wsConnected
                ? "bg-emerald-950/80 text-emerald-300 border-emerald-700/60"
                : "bg-slate-900 text-slate-400 border-slate-700"
            }`}>
              <span className={`h-1.5 w-1.5 rounded-full ${wsConnected ? "bg-emerald-400 animate-pulse" : "bg-slate-500"}`} />
              {wsConnected ? "WebSocket Live Stream" : "REST Sync"}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">Real-time traffic telemetry and automated violations stream.</p>
        </div>
        <Link
          to="/map"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold transition-colors shadow-sm"
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
            Electronic challans issued
          </div>
        </div>

        <div className="p-4 rounded-xl bg-[#0d1322] border border-slate-800">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
            <span>Active Sensors</span>
            <Video size={15} className="text-blue-400" />
          </div>
          <div className="text-2xl font-bold text-white">
            14 / 14
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            ANPR nodes connected & streaming
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
              <BarChart data={initialHourlyTelemetry}>
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
            {recentViolations.map(v => (
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