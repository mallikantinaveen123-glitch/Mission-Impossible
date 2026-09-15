import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, AlertOctagon, CheckCircle2, Video } from "lucide-react";
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts";
import { useEffect, useState } from "react";
import { getViolationsSummary } from "@/services/api";

const mockData = [
  { time: "08:00", violations: 12 },
  { time: "09:00", violations: 45 },
  { time: "10:00", violations: 32 },
  { time: "11:00", violations: 28 },
  { time: "12:00", violations: 15 },
  { time: "13:00", violations: 20 },
  { time: "14:00", violations: 38 },
];

export default function Dashboard() {
  const [summary, setSummary] = useState({ total: 0, today: 0, pending: 0, verified: 0, rejected: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const data = await getViolationsSummary();
        setSummary(data);
        setError(null);
      } catch (err) {
        console.error("Failed to load dashboard summary:", err);
        setError("Unable to connect to the backend API.");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  return (
    <div className="flex flex-col gap-6">
      {error && (
        <div className="bg-destructive/10 text-destructive border border-destructive/20 p-4 rounded-md">
          {error}
        </div>
      )}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Live Operations Overview</h1>
        <p className="text-muted-foreground mt-1">Real-time traffic intelligence and system health.</p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KPICard title="Total Violations (Today)" value={loading ? "..." : String(summary.today)} icon={<Activity className="text-primary" />} trend={`Total Lifetime: ${summary.total}`} />
        <KPICard title="Pending Review" value={loading ? "..." : String(summary.pending)} icon={<AlertOctagon className="text-amber-500" />} trend="Requires immediate attention" />
        <KPICard title="Verified Incidents" value={loading ? "..." : String(summary.verified)} icon={<CheckCircle2 className="text-emerald-500" />} trend="Confirmed by authorities" />
        <KPICard title="Active Cameras" value="12 / 14" icon={<Video className="text-blue-400" />} trend="2 cameras degraded" />
      </div>

      <div className="grid gap-6 md:grid-cols-7 lg:grid-cols-7">
        {/* Main Area: Map / Feed Placeholder */}
        <Card className="md:col-span-4 lg:col-span-5 h-[400px] flex flex-col">
          <CardHeader>
            <CardTitle>Traffic Hotspot Map</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex items-center justify-center bg-muted/20 border-t border-border mt-4">
            <div className="text-center text-muted-foreground">
              <MapIcon size={48} className="mx-auto mb-4 opacity-20" />
              <p>Map visualization will load here.</p>
              <p className="text-sm">Powered by React-Leaflet</p>
            </div>
          </CardContent>
        </Card>

        {/* Priority Sidebar */}
        <Card className="md:col-span-3 lg:col-span-2 flex flex-col">
          <CardHeader>
            <CardTitle>Priority Incidents</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto pr-2">
            <div className="flex flex-col gap-4">
              <IncidentItem type="Triple Riding" time="2 min ago" id="V-8492" level="high" />
              <IncidentItem type="Red Light" time="5 min ago" id="V-8491" level="high" />
              <IncidentItem type="No Helmet" time="12 min ago" id="V-8488" level="medium" />
              <IncidentItem type="No Helmet" time="14 min ago" id="V-8487" level="medium" />
              <IncidentItem type="Triple Riding" time="18 min ago" id="V-8482" level="high" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Analytics Row */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Violations by Hour</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={mockData}>
                  <XAxis dataKey="time" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => String(value)} />
                  <Tooltip cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }} contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }} />
                  <Bar dataKey="violations" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function KPICard({ title, value, icon, trend }: { title: string, value: string, icon: React.ReactNode, trend: string }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground mt-1">{trend}</p>
      </CardContent>
    </Card>
  );
}

function IncidentItem({ type, time, id, level }: { type: string, time: string, id: string, level: 'high' | 'medium' }) {
  return (
    <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-card hover:bg-muted/50 transition-colors cursor-pointer">
      <div className="flex flex-col">
        <span className="text-sm font-semibold flex items-center gap-2">
          {level === 'high' && <span className="w-2 h-2 rounded-full bg-destructive"></span>}
          {level === 'medium' && <span className="w-2 h-2 rounded-full bg-amber-500"></span>}
          {type}
        </span>
        <span className="text-xs text-muted-foreground">{id}</span>
      </div>
      <span className="text-xs text-muted-foreground">{time}</span>
    </div>
  );
}

import { Map as MapIcon } from "lucide-react";