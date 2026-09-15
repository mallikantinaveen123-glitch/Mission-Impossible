import { useState, useEffect, useRef } from "react";
import {
  ShieldAlert,
  Radio,
  Send,
  CheckCircle2,
  AlertTriangle,
  Car,
  Bike,
  Building2,
  TrendingUp,
  CreditCard,
  QrCode,
  Check,
  Flame,
  Volume2,
  VolumeX,
  ExternalLink,
  Users,
  Clock,
  ArrowRight,
  PlusCircle,
  Siren
} from "lucide-react";
import {
  getStations,
  getStationAlerts,
  broadcastStationAlert,
  interceptStationAlert,
  collectChallanAndResolveAlert,
  getStationMessages,
  sendStationMessage,
  getStationAnalytics,
  type PoliceStation,
  type InterStationAlert,
  type StationMessage,
  type CrossJurisdictionStats,
} from "@/services/api";

export default function InterStationHub() {
  // Active operating station selection
  const [currentStationId, setCurrentStationId] = useState<string>("PS-BANJARA");
  const [stations, setStations] = useState<PoliceStation[]>([]);
  const [alerts, setAlerts] = useState<InterStationAlert[]>([]);
  const [messages, setMessages] = useState<StationMessage[]>([]);
  const [analytics, setAnalytics] = useState<CrossJurisdictionStats | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Sound toggle
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  // Tabs: 'alerts' | 'comms' | 'stations' | 'analytics'
  const [activeTab, setActiveTab] = useState<"alerts" | "comms" | "stations" | "analytics">("alerts");

  // New Dispatch / Chat input
  const [messageInput, setMessageInput] = useState<string>("");
  const [messageRecipient, setMessageRecipient] = useState<string>("ALL");
  const [sendingMessage, setSendingMessage] = useState<boolean>(false);

  // New BOLO Modal
  const [isBoloModalOpen, setIsBoloModalOpen] = useState<boolean>(false);
  const [boloForm, setBoloForm] = useState({
    plate_number: "",
    target_station_id: "ALL",
    alert_type: "INTERCEPT_DEFAULTER",
    priority: "HIGH",
    vehicle_type: "FOUR_WHEELER",
    total_unpaid_amount: "₹4,500",
    unpaid_challans_count: 3,
    last_seen_junction: "Sector Border Camera #2",
    heading_direction: "Heading towards adjacent sector",
    notes: "Repeat violator. Skip signal and speeding. Intercept at border checkpoint.",
  });

  // Challan Collection Modal
  const [settleModalAlert, setSettleModalAlert] = useState<InterStationAlert | null>(null);
  const [settlementMethod, setSettlementMethod] = useState<string>("UPI_QR");
  const [settling, setSettling] = useState<boolean>(false);
  const [settleSuccess, setSettleSuccess] = useState<any | null>(null);

  // Filter for alerts
  const [alertFilter, setAlertFilter] = useState<string>("ALL");

  const chatScrollRef = useRef<HTMLDivElement>(null);

  // Audio effect generator using Web Audio API (zero external asset dependencies)
  const playAlertChime = () => {
    if (!soundEnabled) return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(880, audioCtx.currentTime); // A5
      osc.frequency.exponentialRampToValueAtTime(440, audioCtx.currentTime + 0.3);
      gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.3);
    } catch (e) {
      // Audio context might be restricted before user gesture
    }
  };

  // Load all data
  const loadAllData = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [stData, alData, msgData, anaData] = await Promise.all([
        getStations(),
        getStationAlerts(currentStationId),
        getStationMessages(currentStationId),
        getStationAnalytics(),
      ]);
      setStations(stData);
      setAlerts(alData);
      setMessages(msgData);
      setAnalytics(anaData);
    } catch (err) {
      console.error("Failed to load inter-station data:", err);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, [currentStationId]);

  // Periodic polling fallback for real-time updates every 4 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      loadAllData(true);
    }, 4000);
    return () => clearInterval(interval);
  }, [currentStationId]);

  // WebSocket real-time connection
  useEffect(() => {
    const wsProtocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsHost = window.location.hostname || "localhost";
    const wsUrl = `${wsProtocol}//${wsHost}:8000/api/v1/stations/ws/${currentStationId}`;

    let socket: WebSocket | null = null;
    try {
      socket = new WebSocket(wsUrl);
      socket.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload.event === "NEW_ALERT") {
            playAlertChime();
            loadAllData(true);
          } else if (payload.event === "NEW_MESSAGE") {
            loadAllData(true);
          }
        } catch (e) {}
      };
    } catch (e) {
      console.warn("WebSocket not available, falling back to live polling.", e);
    }

    return () => {
      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.close();
      }
    };
  }, [currentStationId]);

  // Current operating station object
  const currentStation = stations.find((s) => s.id === currentStationId) || {
    id: currentStationId,
    name: "Banjara Hills Traffic PS",
    zone: "West Zone",
    jurisdiction: "Road No. 1 to 14",
    status: "ONLINE",
    duty_officer: "Inspector K. Vijay Kumar",
    active_checkpoints: 4,
    contact_number: "+91 40 2335 1100",
  };

  // Send message handler
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!messageInput.trim()) return;

    setSendingMessage(true);
    try {
      await sendStationMessage({
        from_station_id: currentStationId,
        to_station_id: messageRecipient,
        sender_name: currentStation.duty_officer || "Station Duty Officer",
        message_type: "DISPATCH",
        content: messageInput.trim(),
      });
      setMessageInput("");
      await loadAllData(true);
      if (chatScrollRef.current) {
        chatScrollRef.current.scrollTop = 0;
      }
    } catch (err) {
      alert("Failed to send dispatch message");
    } finally {
      setSendingMessage(false);
    }
  };

  // Intercept Alert handler
  const handleIntercept = async (alert: InterStationAlert) => {
    try {
      await interceptStationAlert(alert.id, currentStationId, currentStation.duty_officer);
      await loadAllData(true);
      playAlertChime();
    } catch (err) {
      alert("Failed to update intercept status");
    }
  };

  // Collect Challan and Resolve Alert handler
  const handleCollectChallan = async () => {
    if (!settleModalAlert) return;
    setSettling(true);
    try {
      const res = await collectChallanAndResolveAlert(settleModalAlert.id, {
        station_id: currentStationId,
        officer_name: currentStation.duty_officer || "Patrol Officer",
        amount: settleModalAlert.total_unpaid_amount,
        payment_method: settlementMethod,
      });
      setSettleSuccess(res);
      await loadAllData(true);
    } catch (err) {
      alert("Failed to process challan recovery");
    } finally {
      setSettling(false);
    }
  };

  // Broadcast BOLO Submit handler
  const handleBroadcastBolo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!boloForm.plate_number.trim()) {
      alert("Please enter a vehicle license plate");
      return;
    }

    try {
      await broadcastStationAlert({
        ...boloForm,
        source_station_id: currentStationId,
      });
      setIsBoloModalOpen(false);
      setBoloForm({
        plate_number: "",
        target_station_id: "ALL",
        alert_type: "INTERCEPT_DEFAULTER",
        priority: "HIGH",
        vehicle_type: "FOUR_WHEELER",
        total_unpaid_amount: "₹4,500",
        unpaid_challans_count: 3,
        last_seen_junction: "Sector Border Camera #2",
        heading_direction: "Heading towards adjacent sector",
        notes: "Repeat violator. Skip signal and speeding. Intercept at border checkpoint.",
      });
      await loadAllData(true);
      playAlertChime();
    } catch (err) {
      alert("Failed to broadcast alert");
    }
  };

  // Quick Dispatch Macros
  const handleQuickMacro = (macroText: string) => {
    setMessageInput(macroText);
  };

  // Filtered alerts
  const filteredAlerts = alerts.filter((a) => {
    if (alertFilter === "ALL") return true;
    if (alertFilter === "ACTIVE") return a.status === "ACTIVE";
    if (alertFilter === "INTERCEPTED") return a.status === "INTERCEPTED";
    if (alertFilter === "COLLECTED") return a.status === "CHALLAN_COLLECTED";
    return true;
  });

  const activeAlertsCount = alerts.filter((a) => a.status === "ACTIVE").length;

  return (
    <div className="flex flex-col gap-6 pb-12">
      {/* Top Header & Station Switcher Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-card border border-border p-5 rounded-2xl shadow-sm">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-inner">
            <Radio className="animate-pulse" size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight">Inter-Station Police Intelligence Grid</h1>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                LIVE GRID SYNC
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Instant cross-jurisdiction violation sharing, fleeing offender interception, and rapid challan fine collection.
            </p>
          </div>
        </div>

        {/* Station Operating Switcher & Controls */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-muted/60 border border-border px-3 py-1.5 rounded-xl">
            <Building2 size={16} className="text-primary" />
            <span className="text-xs font-medium text-muted-foreground">Operating Station:</span>
            <select
              value={currentStationId}
              onChange={(e) => setCurrentStationId(e.target.value)}
              className="bg-background border border-border rounded-lg px-2.5 py-1 text-xs font-bold text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            >
              {stations.map((st) => (
                <option key={st.id} value={st.id}>
                  {st.name} ({st.zone})
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`p-2 rounded-xl border text-xs flex items-center gap-1.5 transition-colors ${
              soundEnabled
                ? "bg-primary/10 border-primary/20 text-primary hover:bg-primary/20"
                : "bg-muted border-border text-muted-foreground hover:text-foreground"
            }`}
            title={soundEnabled ? "Audio alert chimes enabled" : "Audio muted"}
          >
            {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
            <span className="hidden sm:inline font-medium">{soundEnabled ? "Sound ON" : "Muted"}</span>
          </button>

          <button
            onClick={() => setIsBoloModalOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2 bg-destructive hover:bg-destructive/90 text-destructive-foreground font-semibold rounded-xl text-xs shadow-md transition-all active:scale-95"
          >
            <Siren size={16} className="animate-bounce" />
            <span>Broadcast Inter-Station BOLO</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-xl p-4 flex items-center justify-between shadow-sm">
          <div>
            <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Active Cross-BOLO Alerts</div>
            <div className="text-2xl font-bold font-mono text-destructive mt-1 flex items-center gap-2">
              {activeAlertsCount}
              {activeAlertsCount > 0 && (
                <span className="text-[11px] font-sans font-semibold bg-destructive/10 text-destructive px-2 py-0.5 rounded-full border border-destructive/20 animate-pulse">
                  URGENT
                </span>
              )}
            </div>
            <div className="text-[11px] text-muted-foreground mt-1">Pending checkpoint interception</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-destructive/10 border border-destructive/20 flex items-center justify-center text-destructive">
            <AlertTriangle size={20} />
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-4 flex items-center justify-between shadow-sm">
          <div>
            <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Vehicles Intercepted</div>
            <div className="text-2xl font-bold font-mono text-emerald-400 mt-1">
              {analytics?.intercepted_count || 14}
            </div>
            <div className="text-[11px] text-emerald-400/80 mt-1">Border checkpoints apprehended</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <CheckCircle2 size={20} />
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-4 flex items-center justify-between shadow-sm">
          <div>
            <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Challan Fines Recovered</div>
            <div className="text-2xl font-bold font-mono text-primary mt-1">
              {analytics?.total_fines_recovered || "₹48,500"}
            </div>
            <div className="text-[11px] text-muted-foreground mt-1">Cross-jurisdiction settlement</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
            <TrendingUp size={20} />
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-4 flex items-center justify-between shadow-sm">
          <div>
            <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Apprehension Rate</div>
            <div className="text-2xl font-bold font-mono text-amber-400 mt-1">
              {analytics?.recovery_rate || "91.2%"}
            </div>
            <div className="text-[11px] text-muted-foreground mt-1">Across 6 connected stations</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <Flame size={20} />
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-border gap-2">
        <button
          onClick={() => setActiveTab("alerts")}
          className={`pb-3 px-4 text-xs font-semibold border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === "alerts"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <AlertTriangle size={15} />
          Live Intercept Queue
          <span className="px-1.5 py-0.5 text-[10px] rounded-full bg-primary/20 text-primary font-mono">
            {alerts.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("comms")}
          className={`pb-3 px-4 text-xs font-semibold border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === "comms"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Radio size={15} />
          Station Radio & Dispatch
          <span className="px-1.5 py-0.5 text-[10px] rounded-full bg-muted text-muted-foreground font-mono">
            {messages.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("stations")}
          className={`pb-3 px-4 text-xs font-semibold border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === "stations"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Building2 size={15} />
          Station Grid Network ({stations.length})
        </button>

        <button
          onClick={() => setActiveTab("analytics")}
          className={`pb-3 px-4 text-xs font-semibold border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === "analytics"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <TrendingUp size={15} />
          Defaulter Intelligence & Revenue
        </button>
      </div>

      {/* TAB CONTENT: ALERTS QUEUE */}
      {activeTab === "alerts" && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Main Alerts Stream (Left 2 cols) */}
          <div className="xl:col-span-2 flex flex-col gap-4">
            {/* Filter Pills */}
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-1.5 bg-muted/40 p-1 rounded-xl border border-border">
                {["ALL", "ACTIVE", "INTERCEPTED", "COLLECTED"].map((st) => (
                  <button
                    key={st}
                    onClick={() => setAlertFilter(st)}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                      alertFilter === st
                        ? "bg-card text-foreground shadow-sm border border-border"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {st === "ALL" && "All Dispatches"}
                    {st === "ACTIVE" && "🚨 Active BOLO"}
                    {st === "INTERCEPTED" && "🚔 Intercepted"}
                    {st === "COLLECTED" && "💰 Fine Settled"}
                  </button>
                ))}
              </div>

              <div className="text-xs text-muted-foreground">
                Showing {filteredAlerts.length} incidents affecting{" "}
                <span className="font-semibold text-foreground">{currentStation.name}</span>
              </div>
            </div>

            {/* Alert Cards */}
            {loading ? (
              <div className="py-16 text-center text-muted-foreground bg-card rounded-2xl border border-border">
                <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-3"></div>
                Syncing inter-station police intelligence...
              </div>
            ) : filteredAlerts.length === 0 ? (
              <div className="py-16 text-center bg-card rounded-2xl border border-border p-6">
                <CheckCircle2 className="mx-auto text-emerald-400 mb-2" size={36} />
                <h3 className="text-base font-bold">No Active Intercepts for Current Filter</h3>
                <p className="text-xs text-muted-foreground max-w-md mx-auto mt-1">
                  Sector borders are currently secure. Click "Broadcast Inter-Station BOLO" above to report a fleeing vehicle or repeat challan defaulter.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {filteredAlerts.map((alert) => {
                  const isCritical = alert.priority === "CRITICAL";
                  const isTwoWheeler = alert.vehicle_type === "TWO_WHEELER";
                  const isCollected = alert.status === "CHALLAN_COLLECTED";
                  const isIntercepted = alert.status === "INTERCEPTED";

                  return (
                    <div
                      key={alert.id}
                      className={`relative rounded-2xl border transition-all p-5 shadow-sm ${
                        isCritical && alert.status === "ACTIVE"
                          ? "bg-destructive/5 border-destructive/40 shadow-destructive/10"
                          : alert.status === "ACTIVE"
                          ? "bg-card border-amber-500/30"
                          : "bg-card/70 border-border opacity-90"
                      }`}
                    >
                      {/* Top Bar of Alert Card */}
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/50 pb-3">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider ${
                              alert.priority === "CRITICAL"
                                ? "bg-destructive text-destructive-foreground animate-pulse"
                                : alert.priority === "HIGH"
                                ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                                : "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                            }`}
                          >
                            {alert.priority} PRIORITY
                          </span>
                          <span className="text-xs font-mono text-muted-foreground font-semibold">
                            BOLO #{alert.id}
                          </span>
                          <span className="text-[11px] text-muted-foreground">
                            • {alert.created_at ? new Date(alert.created_at).toLocaleTimeString() : "Just now"}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2.5 py-0.5 rounded-md text-[11px] font-mono font-bold uppercase ${
                              isCollected
                                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                                : isIntercepted
                                ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                                : "bg-destructive/20 text-destructive border border-destructive/30 animate-pulse"
                            }`}
                          >
                            {isCollected ? "CHALLAN SETTLED" : isIntercepted ? "VEHICLE HELD" : "ACTIVE PURSUIT / INTERCEPT"}
                          </span>
                        </div>
                      </div>

                      {/* Station Origin -> Destination Route Strip */}
                      <div className="mt-3 flex items-center gap-2 text-xs bg-muted/40 p-2.5 rounded-xl border border-border/60">
                        <div className="flex items-center gap-1.5 font-medium text-foreground">
                          <Building2 size={13} className="text-primary" />
                          <span className="font-semibold">{alert.source_station_name}</span>
                        </div>
                        <ArrowRight size={14} className="text-muted-foreground mx-1" />
                        <div className="flex items-center gap-1.5 font-medium text-foreground">
                          <Building2 size={13} className="text-amber-400" />
                          <span className="font-semibold text-amber-400">{alert.target_station_name}</span>
                        </div>
                        <div className="ml-auto text-[11px] text-muted-foreground font-mono">
                          ETA to Sector Checkpoint: <span className="font-bold text-foreground">~3-5 mins</span>
                        </div>
                      </div>

                      {/* Main Vehicle Intel & Defaulter Stats Grid */}
                      <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Vehicle Plate Card */}
                        <div className="bg-background border border-border p-3 rounded-xl flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                            {isTwoWheeler ? <Bike size={20} /> : <Car size={20} />}
                          </div>
                          <div>
                            <div className="text-[10px] text-muted-foreground uppercase font-semibold">Plate Number</div>
                            <div className="text-base font-black font-mono tracking-wider text-foreground">
                              {alert.plate_number}
                            </div>
                            <div className="text-[10px] text-muted-foreground">
                              {isTwoWheeler ? "Two-Wheeler Class" : "Four-Wheeler"}
                            </div>
                          </div>
                        </div>

                        {/* Unpaid Challan Recovery Intel */}
                        <div className="bg-background border border-border p-3 rounded-xl flex items-center justify-between">
                          <div>
                            <div className="text-[10px] text-muted-foreground uppercase font-semibold">Outstanding Fine</div>
                            <div className="text-base font-black font-mono text-destructive">
                              {alert.total_unpaid_amount}
                            </div>
                            <div className="text-[10px] text-muted-foreground">
                              {alert.unpaid_challans_count} Pending Challans
                            </div>
                          </div>
                          <div className="w-10 h-10 rounded-lg bg-destructive/10 border border-destructive/20 flex items-center justify-center text-destructive">
                            <CreditCard size={18} />
                          </div>
                        </div>

                        {/* Telemetry / Junction */}
                        <div className="bg-background border border-border p-3 rounded-xl">
                          <div className="text-[10px] text-muted-foreground uppercase font-semibold">Last Camera Sighting</div>
                          <div className="text-xs font-bold text-foreground truncate mt-0.5">
                            {alert.last_seen_junction}
                          </div>
                          <div className="text-[10px] text-amber-400 font-mono mt-0.5">
                            {alert.speed_recorded ? `${alert.speed_recorded} km/h recorded` : "Speeding tracked"}
                          </div>
                        </div>
                      </div>

                      {/* Notes & Dispatch Remarks */}
                      <div className="mt-3 text-xs text-muted-foreground bg-muted/20 p-2.5 rounded-lg border border-border/40 flex items-start gap-2">
                        <span className="font-semibold text-foreground uppercase text-[10px] shrink-0 mt-0.5">
                          OFFICER NOTE:
                        </span>
                        <span>{alert.notes || "Intercept for challan clearance and traffic safety compliance."}</span>
                      </div>

                      {/* Action Buttons */}
                      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-border/50">
                        <div className="text-[11px] text-muted-foreground">
                          {alert.heading_direction && (
                            <span className="inline-flex items-center gap-1 font-medium text-foreground">
                              <span className="w-2 h-2 rounded-full bg-primary"></span>
                              {alert.heading_direction}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          {alert.status === "ACTIVE" && (
                            <button
                              onClick={() => handleIntercept(alert)}
                              className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold shadow-sm transition-all flex items-center gap-1.5 active:scale-95"
                            >
                              <ShieldAlert size={14} />
                              Checkpoint Intercept
                            </button>
                          )}

                          {!isCollected && (
                            <button
                              onClick={() => {
                                setSettleModalAlert(alert);
                                setSettleSuccess(null);
                              }}
                              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold shadow-sm transition-all flex items-center gap-1.5 active:scale-95"
                            >
                              <QrCode size={14} />
                              Collect Challan ({alert.total_unpaid_amount})
                            </button>
                          )}

                          {isCollected && (
                            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-semibold">
                              <Check size={14} />
                              Challan Cleared by {alert.intercepted_by_station_name || "Sector Unit"}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Quick Dispatch Radio Stream (Right Column) */}
          <div className="flex flex-col gap-4">
            <div className="bg-card border border-border rounded-2xl p-5 shadow-sm flex flex-col h-[650px]">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <div className="flex items-center gap-2">
                  <Radio className="text-primary animate-pulse" size={18} />
                  <h3 className="font-bold text-sm">Station Dispatch Radio</h3>
                </div>
                <span className="text-[10px] font-mono bg-primary/10 text-primary px-2 py-0.5 rounded-full border border-primary/20">
                  FREQ: 154.65 MHz
                </span>
              </div>

              {/* Quick Macros */}
              <div className="py-2 flex flex-wrap gap-1.5 border-b border-border/60">
                <button
                  onClick={() => handleQuickMacro("🚨 Request border checkpoint unit to screen outbound traffic.")}
                  className="px-2 py-1 bg-muted hover:bg-muted/80 text-[11px] font-medium rounded-lg text-muted-foreground hover:text-foreground transition-colors"
                >
                  + Border Checkpoint
                </button>
                <button
                  onClick={() => handleQuickMacro("⚠️ Flagged defaulter plate spotted moving along corridor.")}
                  className="px-2 py-1 bg-muted hover:bg-muted/80 text-[11px] font-medium rounded-lg text-muted-foreground hover:text-foreground transition-colors"
                >
                  + Plate Sighting
                </button>
                <button
                  onClick={() => handleQuickMacro("🚑 Clear green corridor for emergency ambulance.")}
                  className="px-2 py-1 bg-muted hover:bg-muted/80 text-[11px] font-medium rounded-lg text-muted-foreground hover:text-foreground transition-colors"
                >
                  + Green Corridor
                </button>
              </div>

              {/* Messages Stream */}
              <div ref={chatScrollRef} className="flex-1 overflow-y-auto py-3 space-y-3 pr-1 text-xs">
                {messages.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    No dispatch traffic recorded yet.
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isFromMe = msg.from_station_id === currentStationId;
                    const isAlert = msg.message_type === "ALERT";
                    const isPayment = msg.message_type === "CHALLAN_INTEL";

                    return (
                      <div
                        key={msg.id}
                        className={`p-3 rounded-xl border text-xs leading-relaxed ${
                          isAlert
                            ? "bg-destructive/10 border-destructive/30 text-destructive-foreground"
                            : isPayment
                            ? "bg-emerald-500/10 border-emerald-500/30 text-foreground"
                            : isFromMe
                            ? "bg-primary/10 border-primary/20 text-foreground ml-2"
                            : "bg-muted/40 border-border text-foreground mr-2"
                        }`}
                      >
                        <div className="flex items-center justify-between text-[10px] font-semibold text-muted-foreground mb-1">
                          <span className="text-foreground font-bold">{msg.from_station_name}</span>
                          <span className="font-mono">
                            {msg.created_at ? new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "now"}
                          </span>
                        </div>
                        <div className="font-medium">{msg.content}</div>
                        {msg.attached_plate && (
                          <div className="mt-1.5 inline-flex items-center gap-1 px-2 py-0.5 rounded bg-background/80 font-mono font-bold text-[10px] border border-border">
                            PLATE: {msg.attached_plate}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              {/* Send Box */}
              <form onSubmit={handleSendMessage} className="pt-3 border-t border-border space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-muted-foreground shrink-0 font-medium">To:</span>
                  <select
                    value={messageRecipient}
                    onChange={(e) => setMessageRecipient(e.target.value)}
                    className="w-full bg-background border border-border rounded-lg px-2 py-1 text-xs text-foreground focus:outline-none focus:border-primary"
                  >
                    <option value="ALL">All Stations (City-Wide Broadcast)</option>
                    {stations
                      .filter((s) => s.id !== currentStationId)
                      .map((st) => (
                        <option key={st.id} value={st.id}>
                          {st.name}
                        </option>
                      ))}
                  </select>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    placeholder="Broadcast police dispatch message..."
                    className="flex-1 bg-background border border-border rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-primary"
                  />
                  <button
                    type="submit"
                    disabled={sendingMessage || !messageInput.trim()}
                    className="px-3.5 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl text-xs font-semibold flex items-center justify-center disabled:opacity-50 transition-colors"
                  >
                    <Send size={14} />
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: RADIO DISPATCH */}
      {activeTab === "comms" && (
        <div className="bg-card border border-border rounded-2xl p-6 max-w-4xl mx-auto w-full">
          <div className="flex items-center justify-between border-b border-border pb-4 mb-4">
            <div>
              <h2 className="text-lg font-bold">Inter-Station Police Radio Channel Log</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Archived transmission logs of cross-border pursuit alerts, checkpoint dispatches, and fine settlements.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping"></span>
              <span className="text-xs font-mono text-emerald-400 font-bold">MONITORING</span>
            </div>
          </div>

          <div className="space-y-3">
            {messages.map((m) => (
              <div key={m.id} className="p-4 bg-muted/30 rounded-xl border border-border flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
                  <Radio size={18} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between flex-wrap gap-1">
                    <span className="font-bold text-xs text-foreground">{m.from_station_name}</span>
                    <span className="text-xs text-muted-foreground font-mono">
                      {m.created_at ? new Date(m.created_at).toLocaleString() : "Just now"}
                    </span>
                  </div>
                  <p className="text-xs text-foreground mt-1 leading-relaxed">{m.content}</p>
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-[10px] font-mono uppercase bg-background px-2 py-0.5 rounded border border-border text-muted-foreground">
                      Channel: {m.to_station_id === "ALL" ? "City-Wide Broadcast" : m.to_station_id}
                    </span>
                    {m.attached_plate && (
                      <span className="text-[10px] font-mono font-bold bg-destructive/10 text-destructive px-2 py-0.5 rounded border border-destructive/20">
                        VEHICLE: {m.attached_plate}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB CONTENT: STATION GRID */}
      {activeTab === "stations" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {stations.map((st) => {
            const isOperating = st.id === currentStationId;
            return (
              <div
                key={st.id}
                className={`rounded-2xl border p-5 transition-all ${
                  isOperating
                    ? "bg-primary/5 border-primary/40 shadow-lg ring-1 ring-primary/30"
                    : "bg-card border-border hover:border-primary/20"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-muted border border-border flex items-center justify-center text-primary">
                      <Building2 size={22} />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-foreground leading-tight">{st.name}</h3>
                      <span className="text-xs text-muted-foreground font-mono">{st.zone}</span>
                    </div>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                      st.status === "ONLINE"
                        ? "bg-emerald-500/20 text-emerald-400"
                        : st.status === "HIGH_ALERT"
                        ? "bg-destructive/20 text-destructive animate-pulse"
                        : "bg-amber-500/20 text-amber-400"
                    }`}
                  >
                    {st.status}
                  </span>
                </div>

                <div className="mt-4 space-y-2 text-xs">
                  <div className="flex justify-between py-1 border-b border-border/50">
                    <span className="text-muted-foreground">Duty Officer:</span>
                    <span className="font-semibold text-foreground">{st.duty_officer}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-border/50">
                    <span className="text-muted-foreground">Hotline:</span>
                    <span className="font-mono text-foreground">{st.contact_number}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-border/50">
                    <span className="text-muted-foreground">Active Checkpoints:</span>
                    <span className="font-mono font-bold text-foreground">{st.active_checkpoints} units</span>
                  </div>
                  <div className="py-1">
                    <span className="text-muted-foreground block text-[11px]">Jurisdiction:</span>
                    <span className="text-foreground text-[11px] leading-tight block mt-0.5">{st.jurisdiction}</span>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-border flex items-center justify-between">
                  {isOperating ? (
                    <span className="text-xs font-bold text-primary flex items-center gap-1">
                      <CheckCircle2 size={14} /> Currently Active Console
                    </span>
                  ) : (
                    <button
                      onClick={() => setCurrentStationId(st.id)}
                      className="text-xs font-semibold text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
                    >
                      Switch to this Station <ArrowRight size={13} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* TAB CONTENT: DEFAULTER INTELLIGENCE & REVENUE */}
      {activeTab === "analytics" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Defaulters Leaderboard */}
            <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <Flame className="text-destructive" size={20} />
                <h3 className="font-bold text-base">High-Risk Repeat Challan Defaulters</h3>
              </div>
              <p className="text-xs text-muted-foreground mb-4">
                Vehicles with multiple outstanding traffic violations moving across sector boundaries without clearance.
              </p>

              <div className="divide-y divide-border">
                {analytics?.top_defaulters?.map((d, idx) => (
                  <div key={d.plate} className="py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-xs font-bold text-muted-foreground w-6">#{idx + 1}</span>
                      <div>
                        <div className="font-mono font-bold text-sm text-foreground">{d.plate}</div>
                        <div className="text-[11px] text-muted-foreground">
                          {d.unpaid_count} Unpaid Violations • Last sighted: {d.last_station}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono font-bold text-sm text-destructive">{d.unpaid_amount}</div>
                      <span className="text-[10px] font-semibold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                        IMPOUND TARGET
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Cross-Jurisdiction Challan Settlement Rules */}
            <div className="bg-card border border-border rounded-2xl p-6 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <TrendingUp className="text-primary" size={20} />
                  <h3 className="font-bold text-base">Cross-Station Revenue Settlement Protocol</h3>
                </div>
                <div className="space-y-3 text-xs text-muted-foreground leading-relaxed">
                  <div className="p-3 bg-muted/40 rounded-xl border border-border">
                    <span className="font-semibold text-foreground block mb-1">
                      1. Multi-Zone Vehicle Interception:
                    </span>
                    When a vehicle with unpaid challans issued in Station A enters Station B, Station B checkpoint officers are authorized to stop the vehicle and demand immediate fine clearance.
                  </div>
                  <div className="p-3 bg-muted/40 rounded-xl border border-border">
                    <span className="font-semibold text-foreground block mb-1">
                      2. Instant UPI & POS Settlement:
                    </span>
                    Fines collected at Station B checkpoints automatically credit the centralized municipal traffic ledger, issuing a digital receipt and clearing the violation in real-time.
                  </div>
                  <div className="p-3 bg-muted/40 rounded-xl border border-border">
                    <span className="font-semibold text-foreground block mb-1">
                      3. Inter-Station Audit Trail:
                    </span>
                    All transactions generate an automated dispatch notification to the originating station confirming apprehension and revenue collection.
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-border flex items-center justify-between text-xs">
                <span className="text-muted-foreground">System Protocol:</span>
                <span className="font-mono font-bold text-emerald-400">AUTOMATIC REAL-TIME RECONCILIATION</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: BROADCAST NEW BOLO ALERT */}
      {isBoloModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <Siren className="text-destructive animate-pulse" size={20} />
                <h3 className="text-lg font-bold">Broadcast Inter-Station BOLO Alert</h3>
              </div>
              <button
                onClick={() => setIsBoloModalOpen(false)}
                className="text-muted-foreground hover:text-foreground text-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleBroadcastBolo} className="space-y-3 text-xs">
              <div>
                <label className="block text-muted-foreground mb-1 font-semibold">License Registration Plate *</label>
                <input
                  type="text"
                  required
                  value={boloForm.plate_number}
                  onChange={(e) => setBoloForm({ ...boloForm, plate_number: e.target.value.toUpperCase() })}
                  placeholder="e.g. TS09AB1234"
                  className="w-full bg-background border border-border rounded-xl px-3 py-2 font-mono font-bold text-sm tracking-wider focus:outline-none focus:border-primary uppercase"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-muted-foreground mb-1 font-semibold">Vehicle Class</label>
                  <select
                    value={boloForm.vehicle_type}
                    onChange={(e) => setBoloForm({ ...boloForm, vehicle_type: e.target.value })}
                    className="w-full bg-background border border-border rounded-xl px-3 py-2 focus:outline-none focus:border-primary"
                  >
                    <option value="FOUR_WHEELER">4-Wheeler (Car/SUV)</option>
                    <option value="TWO_WHEELER">2-Wheeler (Motorcycle)</option>
                    <option value="HEAVY_VEHICLE">Commercial Truck/Bus</option>
                  </select>
                </div>

                <div>
                  <label className="block text-muted-foreground mb-1 font-semibold">Alert Priority</label>
                  <select
                    value={boloForm.priority}
                    onChange={(e) => setBoloForm({ ...boloForm, priority: e.target.value })}
                    className="w-full bg-background border border-border rounded-xl px-3 py-2 font-semibold text-destructive focus:outline-none focus:border-primary"
                  >
                    <option value="CRITICAL">🚨 CRITICAL (Immediate Stop)</option>
                    <option value="HIGH">⚠️ HIGH (Checkpoint Intercept)</option>
                    <option value="MEDIUM">ℹ️ MEDIUM (Screen & Record)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-muted-foreground mb-1 font-semibold">Target Destination Station</label>
                  <select
                    value={boloForm.target_station_id}
                    onChange={(e) => setBoloForm({ ...boloForm, target_station_id: e.target.value })}
                    className="w-full bg-background border border-border rounded-xl px-3 py-2 focus:outline-none focus:border-primary"
                  >
                    <option value="ALL">All Stations (City-Wide Broadcast)</option>
                    {stations
                      .filter((s) => s.id !== currentStationId)
                      .map((st) => (
                        <option key={st.id} value={st.id}>
                          {st.name}
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="block text-muted-foreground mb-1 font-semibold">Total Outstanding Fines</label>
                  <input
                    type="text"
                    value={boloForm.total_unpaid_amount}
                    onChange={(e) => setBoloForm({ ...boloForm, total_unpaid_amount: e.target.value })}
                    placeholder="e.g. ₹5,000"
                    className="w-full bg-background border border-border rounded-xl px-3 py-2 font-mono font-bold focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div>
                <label className="block text-muted-foreground mb-1 font-semibold">Last Known Camera / Junction</label>
                <input
                  type="text"
                  value={boloForm.last_seen_junction}
                  onChange={(e) => setBoloForm({ ...boloForm, last_seen_junction: e.target.value })}
                  placeholder="e.g. Outer Ring Road Junction #4"
                  className="w-full bg-background border border-border rounded-xl px-3 py-2 focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-muted-foreground mb-1 font-semibold">Officer Dispatch Instructions</label>
                <textarea
                  rows={2}
                  value={boloForm.notes}
                  onChange={(e) => setBoloForm({ ...boloForm, notes: e.target.value })}
                  className="w-full bg-background border border-border rounded-xl p-3 focus:outline-none focus:border-primary text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsBoloModalOpen(false)}
                  className="px-4 py-2 bg-muted hover:bg-muted/80 rounded-xl font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-destructive hover:bg-destructive/90 text-destructive-foreground rounded-xl font-semibold flex items-center gap-1.5 shadow-md"
                >
                  <Radio size={14} />
                  Transmit Live Alert
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: INSTANT CHALLAN SETTLEMENT */}
      {settleModalAlert && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            {!settleSuccess ? (
              <>
                <div className="flex items-center justify-between border-b border-border pb-3">
                  <div>
                    <span className="text-[10px] font-mono font-bold text-emerald-400 uppercase">
                      CROSS-JURISDICTION CLEARANCE
                    </span>
                    <h3 className="text-base font-bold mt-0.5">Collect Outstanding Challan</h3>
                  </div>
                  <button
                    onClick={() => setSettleModalAlert(null)}
                    className="text-muted-foreground hover:text-foreground text-lg"
                  >
                    ✕
                  </button>
                </div>

                <div className="bg-muted/30 p-4 rounded-xl space-y-2 text-xs font-mono">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Intercepted Vehicle:</span>
                    <span className="font-bold text-foreground">{settleModalAlert.plate_number}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Originating Station:</span>
                    <span className="font-semibold text-foreground">{settleModalAlert.source_station_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Settlement Station:</span>
                    <span className="font-semibold text-primary">{currentStation.name}</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-border/60">
                    <span className="text-foreground font-bold">Total Fine Amount:</span>
                    <span className="font-black text-base text-destructive">{settleModalAlert.total_unpaid_amount}</span>
                  </div>
                </div>

                <div className="space-y-2 text-xs">
                  <label className="block text-muted-foreground font-semibold">Payment Mode</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setSettlementMethod("UPI_QR")}
                      className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition-all ${
                        settlementMethod === "UPI_QR"
                          ? "bg-primary/10 border-primary text-primary font-bold"
                          : "bg-muted/40 border-border text-muted-foreground"
                      }`}
                    >
                      <QrCode size={20} />
                      <span>Instant UPI QR</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSettlementMethod("CASH_POS")}
                      className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition-all ${
                        settlementMethod === "CASH_POS"
                          ? "bg-primary/10 border-primary text-primary font-bold"
                          : "bg-muted/40 border-border text-muted-foreground"
                      }`}
                    >
                      <CreditCard size={20} />
                      <span>Cash / Police POS</span>
                    </button>
                  </div>
                </div>

                {settlementMethod === "UPI_QR" && (
                  <div className="bg-white p-4 rounded-xl flex flex-col items-center justify-center text-black">
                    <div className="w-32 h-32 bg-zinc-100 rounded-lg flex items-center justify-center border-2 border-dashed border-zinc-300">
                      <QrCode size={96} className="text-zinc-800" />
                    </div>
                    <span className="text-[11px] font-mono font-bold mt-2">
                      Scan via PhonePe / GPay / Paytm
                    </span>
                    <span className="text-[10px] text-zinc-500 font-mono">
                      Payable: {settleModalAlert.total_unpaid_amount}
                    </span>
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-2 border-t border-border">
                  <button
                    onClick={() => setSettleModalAlert(null)}
                    className="px-4 py-2 bg-muted hover:bg-muted/80 rounded-xl text-xs font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCollectChallan}
                    disabled={settling}
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-md disabled:opacity-50"
                  >
                    {settling ? (
                      "Recording Payment..."
                    ) : (
                      <>
                        <Check size={14} />
                        Confirm & Issue Clearance
                      </>
                    )}
                  </button>
                </div>
              </>
            ) : (
              <div className="py-4 text-center space-y-4">
                <div className="w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mx-auto">
                  <CheckCircle2 size={32} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground">Challan Settled Successfully</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    Digital clearance receipt generated and broadcasted across all police stations.
                  </p>
                </div>

                <div className="bg-muted/30 p-4 rounded-xl space-y-2 text-xs font-mono text-left">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Receipt Number:</span>
                    <span className="font-bold text-foreground">{settleSuccess.transaction_id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Amount Paid:</span>
                    <span className="font-black text-emerald-400">{settleSuccess.amount_recovered}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Plate Number:</span>
                    <span className="font-bold text-foreground">{settleSuccess.plate_number}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Status:</span>
                    <span className="text-emerald-400 font-bold uppercase">CLEARED / PAID</span>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setSettleModalAlert(null);
                    setSettleSuccess(null);
                  }}
                  className="w-full py-2 bg-primary text-primary-foreground font-semibold rounded-xl text-xs"
                >
                  Return to Dashboard
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
