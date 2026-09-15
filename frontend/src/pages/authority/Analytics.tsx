import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, LineChart, Line, PieChart, Pie, Cell } from "recharts";
import { Activity, AlertTriangle, TrendingUp, Users } from "lucide-react";

// Mock data for analytics
const weeklyData = [
  { day: "Mon", violations: 120, traffic: 4500 },
  { day: "Tue", violations: 150, traffic: 4800 },
  { day: "Wed", violations: 180, traffic: 5200 },
  { day: "Thu", violations: 140, traffic: 4900 },
  { day: "Fri", violations: 210, traffic: 5800 },
  { day: "Sat", violations: 250, traffic: 6200 },
  { day: "Sun", violations: 190, traffic: 5100 },
];

const violationTypes = [
  { name: "Speeding", value: 45 },
  { name: "No Helmet", value: 30 },
  { name: "Red Light", value: 15 },
  { name: "Wrong Way", value: 10 },
];

const COLORS = ['#ef4444', '#f59e0b', '#3b82f6', '#8b5cf6'];

const cameraPerformance = [
  { name: "Cam-01 (Jubilee Hills)", detections: 420 },
  { name: "Cam-02 (Banjara Hills)", detections: 380 },
  { name: "Cam-03 (Madhapur)", detections: 510 },
  { name: "Cam-04 (Gachibowli)", detections: 490 },
  { name: "Cam-05 (Kukatpally)", detections: 310 },
];

export default function Analytics() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">System Analytics</h1>
        <p className="text-muted-foreground mt-1">Deep insights into traffic patterns and AI performance.</p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KPICard title="Total Processed Vehicles" value="36,500" icon={<Activity className="text-primary" />} trend="+12% from last week" />
        <KPICard title="Total Violations Detected" value="1,240" icon={<AlertTriangle className="text-destructive" />} trend="+4% from last week" />
        <KPICard title="Avg Detection Confidence" value="94.8%" icon={<TrendingUp className="text-emerald-500" />} trend="Steady" />
        <KPICard title="Active Field Agents" value="42" icon={<Users className="text-blue-500" />} trend="Online and receiving alerts" />
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Weekly Trend Line Chart */}
        <Card className="col-span-2">
          <CardHeader>
            <CardTitle>Violations vs Traffic Volume (7 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={weeklyData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                  <XAxis dataKey="day" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis yAxisId="left" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis yAxisId="right" orientation="right" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                    itemStyle={{ color: 'hsl(var(--foreground))' }}
                  />
                  <Line yAxisId="left" type="monotone" dataKey="violations" stroke="#ef4444" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                  <Line yAxisId="right" type="monotone" dataKey="traffic" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Violation Types Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Violation Distribution</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center">
            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={violationTypes}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={5}
                    dataKey="value"
                    stroke="none"
                  >
                    {violationTypes.map((_entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                    itemStyle={{ color: 'hsl(var(--foreground))' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-2 gap-4 w-full mt-4">
              {violationTypes.map((type, i) => (
                <div key={type.name} className="flex items-center gap-2 text-sm">
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i] }}></span>
                  <span className="text-muted-foreground">{type.name} ({type.value}%)</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Camera Performance Bar Chart */}
        <Card className="col-span-2 lg:col-span-3">
          <CardHeader>
            <CardTitle>Detections by Camera Location</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={cameraPerformance} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                  <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip 
                    cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }} 
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }} 
                  />
                  <Bar dataKey="detections" fill="#10b981" radius={[4, 4, 0, 0]} />
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
    <Card className="hover:border-primary/50 transition-colors">
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