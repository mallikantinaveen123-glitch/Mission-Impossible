import { useState, useEffect } from "react";
import { 
  Search, 
  Bike, 
  Car, 
  RefreshCw,
  Eye,
  Radio,
  CheckCircle2
} from "lucide-react";
import { apiClient, broadcastStationAlert, getStations, type PoliceStation } from "@/services/api";

export default function Violations() {
  const [violations, setViolations] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>({ total: 0, today: 0, pending: 0, verified: 0, rejected: 0 });
  const [loading, setLoading] = useState(true);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [vehicleFilter, setVehicleFilter] = useState<string>("ALL");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedViolation, setSelectedViolation] = useState<any | null>(null);

  // Inter-Station Broadcast Modal State
  const [broadcastViolation, setBroadcastViolation] = useState<any | null>(null);
  const [stationsList, setStationsList] = useState<PoliceStation[]>([]);
  const [targetStation, setTargetStation] = useState<string>("ALL");
  const [broadcastPriority, setBroadcastPriority] = useState<string>("HIGH");
  const [broadcastNotes, setBroadcastNotes] = useState<string>("");
  const [broadcasting, setBroadcasting] = useState<boolean>(false);
  const [broadcastSuccess, setBroadcastSuccess] = useState<boolean>(false);

  useEffect(() => {
    getStations().then(setStationsList).catch(() => {});
  }, []);

  const fetchSummary = async () => {
    try {
      const res = await apiClient.get("/violations/summary");
      setSummary(res.data);
    } catch (e) {
      console.error("Failed to load summary", e);
    }
  };

  const fetchViolations = async () => {
    setLoading(true);
    try {
      const params: any = { page_size: 50 };
      if (statusFilter !== "ALL") params.status = statusFilter;
      const res = await apiClient.get("/violations", { params });
      setViolations(res.data.items || []);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
    fetchViolations();
  }, [statusFilter]);

  const handleUpdateStatus = async (id: number, newStatus: string) => {
    try {
      await apiClient.patch(`/violations/${id}/status`, { status: newStatus });
      fetchViolations();
      fetchSummary();
      if (selectedViolation && selectedViolation.id === id) {
        setSelectedViolation((prev: any) => ({ ...prev, status: newStatus }));
      }
    } catch (e) {
      alert("Failed to update violation status");
    }
  };

  // Filtered list by search term and vehicle type
  const filteredViolations = violations.filter(v => {
    const matchesSearch = 
      (v.plate_number || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (v.violation_type || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(v.id).includes(searchTerm);

    const matchesVehicle = 
      vehicleFilter === "ALL" ||
      (vehicleFilter === "TWO_WHEELER" && (v.vehicle_type === "TWO_WHEELER" || v.violation_type?.includes("HELMET") || v.violation_type?.includes("TRIPLE"))) ||
      (vehicleFilter === "FOUR_WHEELER" && (v.vehicle_type === "FOUR_WHEELER" || v.violation_type?.includes("SEATBELT") || v.violation_type?.includes("PHONE")));

    return matchesSearch && matchesVehicle;
  });

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-wrap justify-between items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Traffic Violations & Challans</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Real-time record of all traffic infringements captured by AI speed radar and camera nodes.
          </p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => { fetchSummary(); fetchViolations(); }}
            className="px-3 py-2 bg-card hover:bg-muted text-muted-foreground hover:text-foreground rounded-lg border border-border text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Refresh
          </button>
        </div>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-card p-4 rounded-xl border border-border">
          <div className="text-xs font-medium text-muted-foreground">Total Violations</div>
          <div className="text-2xl font-bold font-mono mt-1">{summary.total}</div>
          <div className="text-[11px] text-muted-foreground mt-0.5">{summary.today} logged today</div>
        </div>
        <div className="bg-card p-4 rounded-xl border border-border">
          <div className="text-xs font-medium text-amber-400">Pending Review</div>
          <div className="text-2xl font-bold font-mono text-amber-400 mt-1">{summary.pending}</div>
          <div className="text-[11px] text-muted-foreground mt-0.5">Awaiting officer action</div>
        </div>
        <div className="bg-card p-4 rounded-xl border border-border">
          <div className="text-xs font-medium text-emerald-400">Verified & Dispatched</div>
          <div className="text-2xl font-bold font-mono text-emerald-400 mt-1">{summary.verified}</div>
          <div className="text-[11px] text-muted-foreground mt-0.5">E-Challan generated</div>
        </div>
        <div className="bg-card p-4 rounded-xl border border-border">
          <div className="text-xs font-medium text-red-400">Dismissed / Rejected</div>
          <div className="text-2xl font-bold font-mono text-red-400 mt-1">{summary.rejected}</div>
          <div className="text-[11px] text-muted-foreground mt-0.5">False positives</div>
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div className="bg-card p-4 rounded-xl border border-border flex flex-wrap gap-4 items-center justify-between">
        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <input 
              type="text"
              placeholder="Search by license plate, violation, ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-background border border-border rounded-lg pl-9 pr-3 py-1.5 text-xs focus:outline-none focus:border-primary"
            />
          </div>

          {/* Vehicle Type Tabs */}
          <div className="flex items-center bg-muted p-1 rounded-lg border border-border text-xs">
            <button
              onClick={() => setVehicleFilter("ALL")}
              className={`px-3 py-1 rounded-md transition-colors font-medium ${vehicleFilter === "ALL" ? 'bg-card text-foreground font-bold shadow-sm' : 'text-muted-foreground'}`}
            >
              All Types
            </button>
            <button
              onClick={() => setVehicleFilter("TWO_WHEELER")}
              className={`px-3 py-1 rounded-md transition-colors flex items-center gap-1 font-medium ${vehicleFilter === "TWO_WHEELER" ? 'bg-card text-emerald-400 font-bold shadow-sm' : 'text-muted-foreground'}`}
            >
              <Bike size={13} /> 2-Wheelers
            </button>
            <button
              onClick={() => setVehicleFilter("FOUR_WHEELER")}
              className={`px-3 py-1 rounded-md transition-colors flex items-center gap-1 font-medium ${vehicleFilter === "FOUR_WHEELER" ? 'bg-card text-cyan-400 font-bold shadow-sm' : 'text-muted-foreground'}`}
            >
              <Car size={13} /> 4-Wheelers
            </button>
          </div>
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-2 text-xs">
          <span className="text-muted-foreground">Status:</span>
          {["ALL", "PENDING", "VERIFIED", "REJECTED"].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-2.5 py-1 rounded-md font-mono text-[11px] font-semibold border transition-colors ${statusFilter === st ? 'bg-primary text-primary-foreground border-primary' : 'bg-muted border-border text-muted-foreground hover:text-foreground'}`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Violations Table */}
      <div className="bg-card rounded-xl border border-border overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/60 text-muted-foreground uppercase text-[10px] tracking-wider border-b border-border">
              <tr>
                <th className="py-3 px-4 font-semibold">Challan ID</th>
                <th className="py-3 px-4 font-semibold">Vehicle & Class</th>
                <th className="py-3 px-4 font-semibold">License Plate</th>
                <th className="py-3 px-4 font-semibold">Violation Type</th>
                <th className="py-3 px-4 font-semibold">Speed Recorded</th>
                <th className="py-3 px-4 font-semibold">Status</th>
                <th className="py-3 px-4 font-semibold">Timestamp</th>
                <th className="py-3 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-muted-foreground">
                    Loading traffic violations...
                  </td>
                </tr>
              ) : filteredViolations.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-muted-foreground">
                    No violations found matching the criteria.
                  </td>
                </tr>
              ) : (
                filteredViolations.map((v) => {
                  const is2W = v.vehicle_type === "TWO_WHEELER" || v.violation_type?.includes("HELMET") || v.violation_type?.includes("TRIPLE");
                  return (
                    <tr key={v.id} className="hover:bg-muted/40 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-foreground">
                        #{v.id}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold ${is2W ? 'bg-emerald-500/10 text-emerald-400' : 'bg-blue-500/10 text-blue-400'}`}>
                          {is2W ? <Bike size={13} /> : <Car size={13} />}
                          {is2W ? "2-Wheeler" : "4-Wheeler"}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono font-bold tracking-wider text-foreground">
                        {v.plate_number || "NO PLATE"}
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-semibold text-red-400 bg-red-500/10 px-2 py-0.5 rounded border border-red-500/20 text-[11px]">
                          {v.violation_type}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono">
                        {v.speed ? (
                          <span className={v.speed > (v.speed_limit || 60) ? "text-red-400 font-bold" : "text-emerald-400"}>
                            {v.speed} km/h {v.speed_limit && <span className="text-[10px] text-muted-foreground">({v.speed_limit} max)</span>}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">--</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                          v.status === 'VERIFIED' ? 'bg-emerald-500/20 text-emerald-400' :
                          v.status === 'REJECTED' ? 'bg-red-500/20 text-red-400' :
                          'bg-amber-500/20 text-amber-400'
                        }`}>
                          {v.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-muted-foreground font-mono text-[11px]">
                        {v.created_at ? new Date(v.created_at).toLocaleString() : "Just now"}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {v.status === "PENDING" && (
                            <>
                              <button
                                onClick={() => handleUpdateStatus(v.id, "VERIFIED")}
                                className="px-2 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-medium text-[10px] transition-colors"
                                title="Verify & Issue Official Challan"
                              >
                                Verify
                              </button>
                              <button
                                onClick={() => handleUpdateStatus(v.id, "REJECTED")}
                                className="px-2 py-1 bg-muted hover:bg-destructive/20 text-muted-foreground hover:text-destructive rounded font-medium text-[10px] transition-colors"
                                title="Dismiss as False Positive"
                              >
                                Dismiss
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => setSelectedViolation(v)}
                            className="p-1 text-muted-foreground hover:text-foreground rounded hover:bg-muted"
                            title="Inspect Details"
                          >
                            <Eye size={15} />
                          </button>
                          <button
                            onClick={() => {
                              setBroadcastViolation(v);
                              setBroadcastSuccess(false);
                              setBroadcastNotes(`Alert: ${v.violation_type} detected. Plate ${v.plate_number || "UNRECORDED"} moving through sector.`);
                            }}
                            className="px-2 py-1 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 rounded font-medium text-[10px] transition-colors flex items-center gap-1"
                            title="Broadcast to Neighboring Police Stations"
                          >
                            <Radio size={12} />
                            <span>BOLO</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Inspect Modal */}
      {selectedViolation && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-xs font-mono font-bold text-primary uppercase">EVI-LOG #{selectedViolation.id}</span>
                <h3 className="text-lg font-bold mt-0.5">{selectedViolation.violation_type}</h3>
              </div>
              <button 
                onClick={() => setSelectedViolation(null)}
                className="text-muted-foreground hover:text-foreground text-lg"
              >
                ✕
              </button>
            </div>

            <div className="bg-muted/40 p-4 rounded-lg space-y-2 text-xs font-mono">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Vehicle Classification:</span>
                <span className="font-semibold text-foreground">{selectedViolation.vehicle_type || "DETECTED VEHICLE"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Registration Plate:</span>
                <span className="font-bold text-foreground">{selectedViolation.plate_number || "NO PLATE"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">AI Confidence:</span>
                <span className="font-semibold text-emerald-400">{Math.round((selectedViolation.confidence || 0.9) * 100)}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Speed Telemetry:</span>
                <span className="font-semibold text-amber-400">{selectedViolation.speed ? `${selectedViolation.speed} km/h` : "N/A"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Review Status:</span>
                <span className="font-bold text-foreground uppercase">{selectedViolation.status}</span>
              </div>
            </div>

            <div className="flex flex-wrap justify-between items-center gap-2 pt-2 border-t border-border">
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => handleUpdateStatus(selectedViolation.id, "VERIFIED")}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-semibold"
                >
                  Verify & Issue Challan
                </button>
                <button
                  onClick={() => handleUpdateStatus(selectedViolation.id, "REJECTED")}
                  className="px-3 py-1.5 bg-destructive/10 text-destructive hover:bg-destructive/20 rounded text-xs font-semibold"
                >
                  Reject
                </button>
                <button
                  onClick={() => {
                    const v = selectedViolation;
                    setSelectedViolation(null);
                    setBroadcastViolation(v);
                    setBroadcastSuccess(false);
                    setBroadcastNotes(`URGENT: ${v.violation_type} by vehicle ${v.plate_number || "UNKNOWN"} at recorded speed ${v.speed || "--"} km/h.`);
                  }}
                  className="px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 rounded text-xs font-semibold flex items-center gap-1.5"
                >
                  <Radio size={13} />
                  Broadcast BOLO to Station
                </button>
              </div>
              <button
                onClick={() => setSelectedViolation(null)}
                className="px-4 py-1.5 bg-muted text-foreground text-xs font-semibold rounded"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Broadcast BOLO Dialog */}
      {broadcastViolation && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <Radio className="text-destructive animate-pulse" size={20} />
                <h3 className="text-base font-bold">Broadcast Cross-Station BOLO</h3>
              </div>
              <button
                onClick={() => setBroadcastViolation(null)}
                className="text-muted-foreground hover:text-foreground text-lg"
              >
                ✕
              </button>
            </div>

            {!broadcastSuccess ? (
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  setBroadcasting(true);
                  try {
                    await broadcastStationAlert({
                      source_station_id: "PS-BANJARA",
                      target_station_id: targetStation,
                      priority: broadcastPriority as any,
                      alert_type: "INTERCEPT_DEFAULTER",
                      plate_number: broadcastViolation.plate_number || "TS09AB1234",
                      vehicle_type: broadcastViolation.vehicle_type || "FOUR_WHEELER",
                      violation_id: broadcastViolation.id,
                      total_unpaid_amount: "₹1,500",
                      unpaid_challans_count: 1,
                      last_seen_junction: "Sector Camera Junction",
                      heading_direction: "Proceeding to Adjacent Sector",
                      speed_recorded: broadcastViolation.speed,
                      notes: broadcastNotes || "Flagged violation broadcasted from enforcement database.",
                    });
                    setBroadcastSuccess(true);
                  } catch (err) {
                    alert("Failed to broadcast alert");
                  } finally {
                    setBroadcasting(false);
                  }
                }}
                className="space-y-3 text-xs"
              >
                <div className="bg-muted/40 p-3 rounded-xl space-y-1.5 font-mono text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Vehicle Plate:</span>
                    <span className="font-bold text-foreground">{broadcastViolation.plate_number || "UNRECORDED"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Violation:</span>
                    <span className="font-bold text-destructive">{broadcastViolation.violation_type}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Telemetry:</span>
                    <span className="text-amber-400">{broadcastViolation.speed ? `${broadcastViolation.speed} km/h` : "Tracked"}</span>
                  </div>
                </div>

                <div>
                  <label className="block text-muted-foreground mb-1 font-semibold">Destination Police Station</label>
                  <select
                    value={targetStation}
                    onChange={(e) => setTargetStation(e.target.value)}
                    className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-primary"
                  >
                    <option value="ALL">All Stations (City-Wide Dispatch)</option>
                    {stationsList.map((st) => (
                      <option key={st.id} value={st.id}>
                        {st.name} ({st.zone})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-muted-foreground mb-1 font-semibold">Priority Level</label>
                  <select
                    value={broadcastPriority}
                    onChange={(e) => setBroadcastPriority(e.target.value)}
                    className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs font-semibold text-destructive focus:outline-none focus:border-primary"
                  >
                    <option value="CRITICAL">🚨 CRITICAL (Immediate Border Intercept)</option>
                    <option value="HIGH">⚠️ HIGH (Flag for Checkpoint Inspection)</option>
                    <option value="MEDIUM">ℹ️ MEDIUM (Log & Screen)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-muted-foreground mb-1 font-semibold">Dispatch Remarks</label>
                  <textarea
                    rows={2}
                    value={broadcastNotes}
                    onChange={(e) => setBroadcastNotes(e.target.value)}
                    className="w-full bg-background border border-border rounded-xl p-2.5 text-xs focus:outline-none focus:border-primary"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-border">
                  <button
                    type="button"
                    onClick={() => setBroadcastViolation(null)}
                    className="px-4 py-2 bg-muted hover:bg-muted/80 rounded-xl font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={broadcasting}
                    className="px-5 py-2 bg-destructive hover:bg-destructive/90 text-destructive-foreground rounded-xl font-semibold flex items-center gap-1.5 shadow-md disabled:opacity-50"
                  >
                    <Radio size={14} />
                    {broadcasting ? "Transmitting..." : "Dispatch BOLO"}
                  </button>
                </div>
              </form>
            ) : (
              <div className="py-4 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mx-auto">
                  <CheckCircle2 size={28} />
                </div>
                <div>
                  <h4 className="font-bold text-sm">Alert Transmitted Successfully</h4>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Target stations have received live telemetry and vehicle details.
                  </p>
                </div>
                <button
                  onClick={() => setBroadcastViolation(null)}
                  className="w-full py-2 bg-primary text-primary-foreground font-semibold rounded-xl text-xs"
                >
                  Done
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}