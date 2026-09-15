import { useState, useEffect, useRef } from "react";
import { 
  Camera, 
  ShieldCheck, 
  AlertTriangle, 
  Sliders, 
  Gauge, 
  Car, 
  Bike, 
  Volume2, 
  VolumeX, 
  Download, 
  Crosshair, 
  Sparkles, 
  CheckCircle2, 
  Zap, 
  RefreshCw,
  Video
} from "lucide-react";
import { apiClient } from "@/services/api";

// Sound synthesizer using Web Audio API for alert beeps
function playAlertBeep(frequency = 880, duration = 0.25) {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(frequency, ctx.currentTime);
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch (e) {
    // Audio may be blocked before interaction
  }
}

interface SimulatedVehicle {
  id: string;
  category: "TWO_WHEELER" | "FOUR_WHEELER";
  model: string;
  x: number;
  y: number;
  speed: number;
  targetSpeed: number;
  lane: number;
  plate: string;
  violation: string | null;
  violationTitle: string | null;
  penalty: string | null;
  color: string;
  width: number;
  height: number;
  tracked: boolean;
}

export default function LiveDetection() {
  // Feed source: 'simulator' | 'webcam' | 'node'
  const [feedSource, setFeedSource] = useState<"simulator" | "webcam" | "node">("simulator");
  const [status, setStatus] = useState<"active" | "connecting" | "paused" | "error">("active");
  const [errorMsg, setErrorMsg] = useState("");
  
  // Audio Mute
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [nightVision, setNightVision] = useState(false);
  const [trafficSignal, setTrafficSignal] = useState<"GREEN" | "YELLOW" | "RED">("GREEN");

  // Modular AI Camera Commands & Options
  const [vehicleFilter, setVehicleFilter] = useState<"ALL" | "TWO_WHEELER" | "FOUR_WHEELER">("ALL");
  const [radarEnabled, setRadarEnabled] = useState(true);
  const [speedLimit, setSpeedLimit] = useState(50);
  const [speedTolerance, setSpeedTolerance] = useState(5);
  const [confidenceThreshold, setConfidenceThreshold] = useState(75);
  const [autoChallan, setAutoChallan] = useState(true);

  // Modular Violation Rule Switches
  const [activeRules, setActiveRules] = useState<Record<string, boolean>>({
    // Two-Wheeler Rules
    NO_HELMET: true,
    PILLION_NO_HELMET: true,
    TRIPLE_RIDING: true,
    RASH_WEAVING: true,
    // Four-Wheeler Rules
    NO_SEATBELT: true,
    PHONE_USAGE: true,
    OVERLOADED_VEHICLE: true,
    // Universal Rules
    SPEEDING: true,
    RED_LIGHT: true,
    STOP_LINE_BREACH: true,
    WRONG_WAY: true,
    SOLID_LANE_CROSSING: true
  });

  // Telemetry Metrics
  const [stats, setStats] = useState({
    totalPassed: 0,
    twoWheelers: 0,
    fourWheelers: 0,
    violationsCount: 0,
    speedViolations: 0,
    avgSpeed: 48
  });

  // Violation Ledger
  const [detectionsLog, setDetectionsLog] = useState<any[]>([]);
  const [activeChallanModal, setActiveChallanModal] = useState<any | null>(null);

  // Refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const webcamStreamRef = useRef<MediaStream | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const animationRef = useRef<number | null>(null);

  // Active simulated vehicles pool
  const vehiclesRef = useRef<SimulatedVehicle[]>([]);
  const lastSpawnTime = useRef(0);
  const speedSpeedsRef = useRef<number[]>([]);

  // Toggle individual rule
  const toggleRule = (ruleKey: string) => {
    setActiveRules(prev => {
      const updated = { ...prev, [ruleKey]: !prev[ruleKey] };
      // Sync with WebSocket if open
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          action: "toggle_rule",
          rule: ruleKey,
          enabled: updated[ruleKey]
        }));
      }
      return updated;
    });
  };

  // Switch Feed Source
  const handleSelectFeed = async (src: "simulator" | "webcam" | "node") => {
    setFeedSource(src);
    // Cleanup webcam if switching away
    if (src !== "webcam" && webcamStreamRef.current) {
      webcamStreamRef.current.getTracks().forEach(t => t.stop());
      webcamStreamRef.current = null;
    }
    // Cleanup WS if switching away
    if (src !== "node" && wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    if (src === "webcam") {
      try {
        setStatus("connecting");
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } } 
        });
        webcamStreamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setStatus("active");
      } catch (err: any) {
        setStatus("error");
        setErrorMsg("Webcam access denied or unavailable.");
      }
    } else if (src === "node") {
      // Connect to backend WebSocket
      try {
        setStatus("connecting");
        const wsProtocol = window.location.protocol === "https:" ? "wss:" : "ws:";
        const wsHost = window.location.host;
        const wsUrl = import.meta.env.VITE_API_BASE_URL 
          ? import.meta.env.VITE_API_BASE_URL.replace(/^http/, 'ws') + '/cameras/stream/DEMO-CAM-01'
          : `${wsProtocol}//${wsHost}/api/v1/cameras/stream/DEMO-CAM-01`;
        const ws = new WebSocket(wsUrl);
        
        ws.onopen = () => {
          setStatus("active");
          ws.send(JSON.stringify({
            action: "update_options",
            options: {
              vehicle_filter: vehicleFilter,
              speed_limit: speedLimit,
              speed_tolerance: speedTolerance,
              radar_enabled: radarEnabled
            }
          }));
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === "frame_update" && data.detection) {
              const det = data.detection;
              handleNewDetection({
                id: Math.random().toString(),
                category: det.vehicle_category,
                model: det.vehicle_model,
                plate: det.plate_number,
                speed: det.speed,
                speedLimit: det.speed_limit,
                violation: det.violation_type !== "NONE" ? det.violation_type : null,
                violationTitle: det.penalty_title,
                penalty: det.penalty_amount,
                confidence: Math.round(det.confidence * 100),
                time: new Date()
              });
            }
          } catch (e) {
            console.error("WS Parse error", e);
          }
        };

        ws.onerror = () => {
          setStatus("error");
          setErrorMsg("Camera Node WebSocket error. Check if backend is running.");
        };

        ws.onclose = () => {
          if (feedSource === "node") setStatus("paused");
        };

        wsRef.current = ws;
      } catch (err: any) {
        setStatus("error");
        setErrorMsg(err.message || "Failed to connect to backend camera stream.");
      }
    } else {
      setStatus("active");
    }
  };

  // Dispatch new detection event
  const handleNewDetection = (item: any) => {
    // Check vehicle filter match
    if (vehicleFilter === "TWO_WHEELER" && item.category !== "TWO_WHEELER") return;
    if (vehicleFilter === "FOUR_WHEELER" && item.category !== "FOUR_WHEELER") return;

    // Update telemetry stats
    setStats(prev => {
      const is2W = item.category === "TWO_WHEELER";
      const isViolation = !!item.violation;
      const isSpeedViol = item.violation === "SPEEDING";
      const newTotal = prev.totalPassed + 1;
      
      speedSpeedsRef.current.push(item.speed);
      if (speedSpeedsRef.current.length > 50) speedSpeedsRef.current.shift();
      const avg = Math.round(speedSpeedsRef.current.reduce((a, b) => a + b, 0) / speedSpeedsRef.current.length);

      return {
        totalPassed: newTotal,
        twoWheelers: prev.twoWheelers + (is2W ? 1 : 0),
        fourWheelers: prev.fourWheelers + (!is2W ? 1 : 0),
        violationsCount: prev.violationsCount + (isViolation ? 1 : 0),
        speedViolations: prev.speedViolations + (isSpeedViol ? 1 : 0),
        avgSpeed: avg || item.speed
      };
    });

    if (item.violation) {
      if (soundEnabled) {
        playAlertBeep(item.violation === "SPEEDING" ? 1100 : 780, 0.2);
      }

      setDetectionsLog(prev => [item, ...prev].slice(0, 30));

      // Auto issue challan to backend if enabled
      if (autoChallan) {
        apiClient.post("/cameras/DEMO-CAM-01/issue_challan", {
          violation_type: item.violation,
          confidence: (item.confidence || 90) / 100,
          plate_number: item.plate,
          plate_confidence: 0.96,
          bbox: [120, 80, 240, 160],
          vehicle_type: item.category,
          speed: item.speed,
          speed_limit: item.speedLimit || speedLimit
        }).catch(err => console.error("Auto challan save err", err));
      }
    }
  };

  // Interactive AI Road Simulation Engine Loop
  useEffect(() => {
    if (feedSource !== "simulator") return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas dimensions
    canvas.width = 960;
    canvas.height = 540;

    const lanes = [140, 220, 300, 380]; // Y coordinates of 4 highway lanes
    const twoWheelerModels = ["Bajaj Pulsar", "Honda Activa", "Royal Enfield", "Yamaha R15", "TVS Jupiter"];
    const fourWheelerModels = ["Hyundai Creta", "Maruti Swift", "Honda City", "Tata Nexon", "Mahindra Thar", "Bajaj Auto"];

    const spawnVehicle = (forceSpeeding = false, forceCategory?: "TWO_WHEELER" | "FOUR_WHEELER") => {
      let cat: "TWO_WHEELER" | "FOUR_WHEELER";
      if (forceCategory) {
        cat = forceCategory;
      } else if (vehicleFilter === "TWO_WHEELER") {
        cat = "TWO_WHEELER";
      } else if (vehicleFilter === "FOUR_WHEELER") {
        cat = "FOUR_WHEELER";
      } else {
        cat = Math.random() < 0.45 ? "TWO_WHEELER" : "FOUR_WHEELER";
      }

      const laneIdx = Math.floor(Math.random() * lanes.length);
      const laneY = lanes[laneIdx];
      const model = cat === "TWO_WHEELER" 
        ? twoWheelerModels[Math.floor(Math.random() * twoWheelerModels.length)]
        : fourWheelerModels[Math.floor(Math.random() * fourWheelerModels.length)];

      const states = ["TS", "MH", "KA", "DL", "AP"];
      const plate = `${states[Math.floor(Math.random() * states.length)]}0${Math.floor(1 + Math.random()*9)}E${Math.floor(1000 + Math.random()*8999)}`;

      // Calculate speed
      let spd = speedLimit - 15 + Math.random() * 20;
      let violation: string | null = null;
      let violationTitle: string | null = null;
      let penalty: string | null = null;

      // Speed Radar evaluation
      if (forceSpeeding || (radarEnabled && activeRules.SPEEDING && Math.random() < 0.22)) {
        spd = speedLimit + speedTolerance + 12 + Math.floor(Math.random() * 28);
        violation = "SPEEDING";
        violationTitle = `Overspeeding (+${Math.round(spd - speedLimit)} km/h)`;
        penalty = "₹2,000";
      } else if (trafficSignal === "RED" && activeRules.RED_LIGHT && Math.random() < 0.4) {
        violation = "RED_LIGHT";
        violationTitle = "Red Light Signal Jumping";
        penalty = "₹5,000";
      } else if (cat === "TWO_WHEELER") {
        if (activeRules.NO_HELMET && Math.random() < 0.25) {
          violation = "NO_HELMET";
          violationTitle = "Rider Without Safety Helmet";
          penalty = "₹1,000";
        } else if (activeRules.TRIPLE_RIDING && Math.random() < 0.15) {
          violation = "TRIPLE_RIDING";
          violationTitle = "Triple Riding Overload";
          penalty = "₹1,500";
        } else if (activeRules.PILLION_NO_HELMET && Math.random() < 0.18) {
          violation = "PILLION_NO_HELMET";
          violationTitle = "Pillion Without Helmet";
          penalty = "₹1,000";
        }
      } else if (cat === "FOUR_WHEELER") {
        if (activeRules.NO_SEATBELT && Math.random() < 0.24) {
          violation = "NO_SEATBELT";
          violationTitle = "Driver No Seatbelt Fastened";
          penalty = "₹1,000";
        } else if (activeRules.PHONE_USAGE && Math.random() < 0.18) {
          violation = "PHONE_USAGE";
          violationTitle = "Handheld Phone Usage";
          penalty = "₹5,000";
        } else if (activeRules.SOLID_LANE_CROSSING && Math.random() < 0.12) {
          violation = "SOLID_LANE_CROSSING";
          violationTitle = "Illegal Lane Crossing";
          penalty = "₹1,000";
        }
      }

      const colors = ["#3b82f6", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899", "#ffffff"];
      const v: SimulatedVehicle = {
        id: Math.random().toString(),
        category: cat,
        model,
        x: -120,
        y: laneY + (Math.random() * 20 - 10),
        speed: Math.round(spd),
        targetSpeed: Math.round(spd),
        lane: laneIdx,
        plate,
        violation,
        violationTitle,
        penalty,
        color: colors[Math.floor(Math.random() * colors.length)],
        width: cat === "TWO_WHEELER" ? 54 : 110,
        height: cat === "TWO_WHEELER" ? 28 : 50,
        tracked: false
      };

      vehiclesRef.current.push(v);
    };

    // Pre-populate with a couple vehicles
    if (vehiclesRef.current.length === 0) {
      spawnVehicle();
      spawnVehicle();
    }

    let lastTime = performance.now();

    const render = (time: number) => {
      const dt = (time - lastTime) / 1000;
      lastTime = time;

      // Clear canvas with asphalt dark gradient
      ctx.fillStyle = nightVision ? "#05160e" : "#0d1117";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw Road Surface & Lanes
      ctx.fillStyle = nightVision ? "#082115" : "#161b22";
      ctx.fillRect(0, 90, canvas.width, 350);

      // Road shoulder lines (solid white)
      ctx.strokeStyle = nightVision ? "#10b981" : "#ffffff";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(0, 95);
      ctx.lineTo(canvas.width, 95);
      ctx.moveTo(0, 435);
      ctx.lineTo(canvas.width, 435);
      ctx.stroke();

      // Dashed lane dividers
      ctx.strokeStyle = nightVision ? "rgba(16, 185, 129, 0.4)" : "rgba(255, 255, 255, 0.35)";
      ctx.lineWidth = 2;
      ctx.setLineDash([20, 18]);
      [180, 260, 340].forEach(y => {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      });
      ctx.setLineDash([]); // reset

      // Radar Detection Beam Area (between x=400 and x=640)
      if (radarEnabled) {
        const grad = ctx.createLinearGradient(380, 0, 680, 0);
        grad.addColorStop(0, "rgba(59, 130, 246, 0.0)");
        grad.addColorStop(0.5, nightVision ? "rgba(16, 185, 129, 0.15)" : "rgba(59, 130, 246, 0.15)");
        grad.addColorStop(1, "rgba(59, 130, 246, 0.0)");
        ctx.fillStyle = grad;
        ctx.fillRect(380, 95, 300, 340);

        // Radar Scan Line
        const scanX = 380 + ((time / 15) % 300);
        ctx.strokeStyle = nightVision ? "rgba(52, 211, 153, 0.6)" : "rgba(96, 165, 250, 0.7)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(scanX, 95);
        ctx.lineTo(scanX, 435);
        ctx.stroke();

        // Speed Gun Label
        ctx.fillStyle = nightVision ? "#34d399" : "#60a5fa";
        ctx.font = "bold 11px monospace";
        ctx.fillText(`RADAR BEAM: ${speedLimit} km/h LIMIT (±${speedTolerance})`, 400, 115);
      }

      // Stop Line & Traffic Signal Box at x=780
      ctx.strokeStyle = trafficSignal === "RED" ? "#ef4444" : trafficSignal === "YELLOW" ? "#f59e0b" : "#10b981";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(760, 95);
      ctx.lineTo(760, 435);
      ctx.stroke();

      // Zebra Crossing strips
      ctx.fillStyle = "rgba(255, 255, 255, 0.15)";
      for (let zy = 100; zy < 430; zy += 25) {
        ctx.fillRect(765, zy, 20, 15);
      }

      // Signal Light Indicator
      ctx.fillStyle = "#1e293b";
      ctx.fillRect(750, 40, 60, 26);
      ctx.strokeStyle = "#475569";
      ctx.strokeRect(750, 40, 60, 26);
      ctx.fillStyle = trafficSignal === "RED" ? "#ef4444" : "#450a0a";
      ctx.beginPath(); ctx.arc(762, 53, 6, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = trafficSignal === "YELLOW" ? "#f59e0b" : "#451a03";
      ctx.beginPath(); ctx.arc(780, 53, 6, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = trafficSignal === "GREEN" ? "#10b981" : "#022c22";
      ctx.beginPath(); ctx.arc(798, 53, 6, 0, Math.PI*2); ctx.fill();

      // Spawn periodic vehicles
      if (time - lastSpawnTime.current > 2400) {
        spawnVehicle();
        lastSpawnTime.current = time;
      }

      // Update & Draw Vehicles
      const updatedVehicles: SimulatedVehicle[] = [];

      vehiclesRef.current.forEach(v => {
        // Move vehicle horizontally based on speed
        const pixelsPerSecond = (v.speed / 50) * 160;
        v.x += pixelsPerSecond * dt;

        // If traffic light is RED and vehicle is near stop line, brake unless violating
        if (trafficSignal === "RED" && v.x > 620 && v.x < 740 && v.violation !== "RED_LIGHT") {
          v.speed = Math.max(0, v.speed - 50 * dt);
        }

        // Check if vehicle reaches Radar Trigger Zone (x=500)
        if (v.x >= 460 && !v.tracked) {
          v.tracked = true;
          handleNewDetection({
            id: v.id,
            category: v.category,
            model: v.model,
            plate: v.plate,
            speed: v.speed,
            speedLimit: speedLimit,
            violation: v.violation,
            violationTitle: v.violationTitle,
            penalty: v.penalty,
            confidence: Math.round(confidenceThreshold + Math.random() * (98 - confidenceThreshold)),
            time: new Date()
          });
        }

        // Draw Vehicle Body
        ctx.save();
        if (v.category === "TWO_WHEELER") {
          // Two-Wheeler graphic
          ctx.fillStyle = v.color;
          ctx.fillRect(v.x, v.y, v.width, v.height);
          // Rider helmet circle
          ctx.fillStyle = v.violation === "NO_HELMET" ? "#ef4444" : "#e2e8f0";
          ctx.beginPath();
          ctx.arc(v.x + 24, v.y + v.height / 2, 8, 0, Math.PI * 2);
          ctx.fill();
          // Wheels
          ctx.fillStyle = "#000000";
          ctx.fillRect(v.x + 4, v.y - 3, 10, 4);
          ctx.fillRect(v.x + v.width - 14, v.y - 3, 10, 4);
        } else {
          // Four-Wheeler graphic
          ctx.fillStyle = v.color;
          ctx.beginPath();
          ctx.roundRect(v.x, v.y, v.width, v.height, [8]);
          ctx.fill();
          // Windshield
          ctx.fillStyle = "#0f172a";
          ctx.fillRect(v.x + 28, v.y + 6, v.width - 45, v.height - 12);
          // Headlights
          ctx.fillStyle = "#fef08a";
          ctx.fillRect(v.x + v.width - 6, v.y + 4, 4, 8);
          ctx.fillRect(v.x + v.width - 6, v.y + v.height - 12, 4, 8);
        }

        // AI Bounding Box & HUD Label
        const isViol = !!v.violation;
        const boxColor = isViol ? "#ef4444" : "#10b981";

        ctx.strokeStyle = boxColor;
        ctx.lineWidth = 2;
        ctx.strokeRect(v.x - 4, v.y - 4, v.width + 8, v.height + 8);

        // Bounding Box Tag
        ctx.fillStyle = boxColor;
        ctx.fillRect(v.x - 4, v.y - 24, v.width + 8, 20);

        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 10px monospace";
        const catBadge = v.category === "TWO_WHEELER" ? "2W" : "4W";
        ctx.fillText(`[${catBadge}] ${v.speed} km/h`, v.x, v.y - 10);

        // If violation, show floating alert tag
        if (isViol && v.x > 300) {
          ctx.fillStyle = "rgba(239, 68, 68, 0.95)";
          ctx.fillRect(v.x - 10, v.y + v.height + 6, 150, 20);
          ctx.fillStyle = "#ffffff";
          ctx.font = "bold 9px sans-serif";
          ctx.fillText(`⚠ ${v.violationTitle || v.violation}`, v.x - 6, v.y + v.height + 20);
        }

        ctx.restore();

        // Keep vehicle if inside canvas
        if (v.x < canvas.width + 100) {
          updatedVehicles.push(v);
        }
      });

      vehiclesRef.current = updatedVehicles;

      // Draw Top HUD overlay
      ctx.fillStyle = "rgba(15, 23, 42, 0.85)";
      ctx.fillRect(10, 10, 420, 32);
      ctx.strokeStyle = "#334155";
      ctx.strokeRect(10, 10, 420, 32);

      ctx.fillStyle = "#38bdf8";
      ctx.font = "bold 12px monospace";
      ctx.fillText(`CAMERA: DEMO-CAM-01 [AI MODULAR]`, 20, 30);
      ctx.fillStyle = "#a855f7";
      ctx.fillText(`FILTER: ${vehicleFilter}`, 240, 30);
      ctx.fillStyle = "#22c55e";
      ctx.fillText(`FPS: 60`, 370, 30);

      animationRef.current = requestAnimationFrame(render);
    };

    animationRef.current = requestAnimationFrame(render);

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [feedSource, vehicleFilter, speedLimit, speedTolerance, radarEnabled, trafficSignal, activeRules, confidenceThreshold, nightVision]);

  // Command: Manual Spawn of specific vehicle or violation
  const triggerManualSpawn = (type: "speeding" | "2w_helmet" | "4w_seatbelt" | "signal_jump") => {
    if (feedSource !== "simulator") {
      // Trigger via API if on camera node
      apiClient.post("/cameras/DEMO-CAM-01/demo_trigger", null, {
        params: {
          vehicle_filter: vehicleFilter,
          speed_limit: speedLimit,
          active_rules: Object.keys(activeRules).filter(k => activeRules[k]).join(",")
        }
      }).then(res => {
        if (res.data) handleNewDetection(res.data);
      });
      return;
    }

    if (type === "speeding") {
      setTrafficSignal("GREEN");
      // Find or push speeding vehicle
      const lanes = [140, 220, 300, 380];
      const laneY = lanes[Math.floor(Math.random() * lanes.length)];
      const spd = speedLimit + speedTolerance + 25;
      vehiclesRef.current.push({
        id: Math.random().toString(),
        category: "FOUR_WHEELER",
        model: "Mahindra Thar (Speeding)",
        x: -80,
        y: laneY,
        speed: spd,
        targetSpeed: spd,
        lane: 1,
        plate: `TS09EX${Math.floor(1000 + Math.random()*8999)}`,
        violation: "SPEEDING",
        violationTitle: `Overspeeding (+${spd - speedLimit} km/h)`,
        penalty: "₹2,000",
        color: "#dc2626",
        width: 115,
        height: 52,
        tracked: false
      });
    } else if (type === "2w_helmet") {
      vehiclesRef.current.push({
        id: Math.random().toString(),
        category: "TWO_WHEELER",
        model: "Bajaj Pulsar 150",
        x: -60,
        y: 220,
        speed: speedLimit - 5,
        targetSpeed: speedLimit - 5,
        lane: 1,
        plate: `TS07AB${Math.floor(1000 + Math.random()*8999)}`,
        violation: "NO_HELMET",
        violationTitle: "Rider Without Safety Helmet",
        penalty: "₹1,000",
        color: "#ea580c",
        width: 54,
        height: 28,
        tracked: false
      });
    } else if (type === "4w_seatbelt") {
      vehiclesRef.current.push({
        id: Math.random().toString(),
        category: "FOUR_WHEELER",
        model: "Hyundai Creta",
        x: -100,
        y: 300,
        speed: speedLimit - 2,
        targetSpeed: speedLimit - 2,
        lane: 2,
        plate: `MH12CD${Math.floor(1000 + Math.random()*8999)}`,
        violation: "NO_SEATBELT",
        violationTitle: "Driver No Seatbelt Fastened",
        penalty: "₹1,000",
        color: "#2563eb",
        width: 110,
        height: 50,
        tracked: false
      });
    } else if (type === "signal_jump") {
      setTrafficSignal("RED");
      vehiclesRef.current.push({
        id: Math.random().toString(),
        category: "FOUR_WHEELER",
        model: "Maruti Swift",
        x: 480,
        y: 220,
        speed: 65,
        targetSpeed: 65,
        lane: 1,
        plate: `DL03EE${Math.floor(1000 + Math.random()*8999)}`,
        violation: "RED_LIGHT",
        violationTitle: "Red Light Signal Jumping",
        penalty: "₹5,000",
        color: "#e11d48",
        width: 105,
        height: 48,
        tracked: false
      });
    }
  };

  // Export detections log to CSV
  const exportLogCSV = () => {
    if (detectionsLog.length === 0) return;
    const headers = "ID,Time,Category,Plate,Speed_kmh,Violation,Penalty\n";
    const rows = detectionsLog.map(d => 
      `"${d.id}","${d.time.toISOString()}","${d.category}","${d.plate}","${d.speed}","${d.violation || 'COMPLIANT'}","${d.penalty || '₹0'}"`
    ).join("\n");
    const blob = new Blob([headers + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `traffic_ai_detections_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col h-full gap-5">
      {/* Top Header & Telemetry Bar */}
      <div className="flex flex-wrap items-center justify-between bg-card p-4 rounded-xl border border-border gap-4 shadow-sm">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 text-primary rounded-lg">
              <Camera size={22} />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                Live Modular AI Camera System
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 font-semibold border border-emerald-500/20">
                  v2.4 ACTIVE
                </span>
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                Multi-spectrum Computer Vision • Speed Radar Enforcement • 2-Wheeler & 4-Wheeler Detection Suite
              </p>
            </div>
          </div>
        </div>

        {/* Live Status & Quick Action Switchers */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Audio Beep Switch */}
          <button 
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`p-2 rounded-lg border text-sm flex items-center gap-1.5 transition-colors ${soundEnabled ? 'border-primary/40 bg-primary/10 text-primary' : 'border-border bg-muted text-muted-foreground'}`}
            title={soundEnabled ? "Mute violation alerts" : "Enable violation beeps"}
          >
            {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
            <span className="text-xs font-medium">{soundEnabled ? "Beep ON" : "Muted"}</span>
          </button>

          {/* Night Vision Toggle */}
          <button 
            onClick={() => setNightVision(!nightVision)}
            className={`p-2 rounded-lg border text-sm flex items-center gap-1.5 transition-colors ${nightVision ? 'border-emerald-500/50 bg-emerald-950/30 text-emerald-400' : 'border-border bg-muted text-muted-foreground'}`}
          >
            <Sparkles size={16} />
            <span className="text-xs font-medium">Night IR</span>
          </button>

          {/* Feed Selector Buttons */}
          <div className="flex items-center bg-muted p-1 rounded-lg border border-border">
            <button
              onClick={() => handleSelectFeed("simulator")}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${feedSource === "simulator" ? 'bg-card text-foreground shadow-sm font-bold' : 'text-muted-foreground hover:text-foreground'}`}
            >
              Road Simulator
            </button>
            <button
              onClick={() => handleSelectFeed("webcam")}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${feedSource === "webcam" ? 'bg-card text-foreground shadow-sm font-bold' : 'text-muted-foreground hover:text-foreground'}`}
            >
              Laptop Webcam
            </button>
            <button
              onClick={() => handleSelectFeed("node")}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${feedSource === "node" ? 'bg-card text-foreground shadow-sm font-bold' : 'text-muted-foreground hover:text-foreground'}`}
            >
              Camera Node
            </button>
          </div>
        </div>
      </div>

      {/* Real-time Telemetry Metrics Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-card p-3 rounded-lg border border-border flex items-center justify-between">
          <div>
            <div className="text-xs text-muted-foreground font-medium">Total Monitored</div>
            <div className="text-xl font-bold font-mono mt-0.5">{stats.totalPassed}</div>
          </div>
          <Car size={20} className="text-blue-400 opacity-60" />
        </div>

        <div className="bg-card p-3 rounded-lg border border-border flex items-center justify-between">
          <div>
            <div className="text-xs text-muted-foreground font-medium">Two-Wheelers (2W)</div>
            <div className="text-xl font-bold font-mono text-emerald-400 mt-0.5">{stats.twoWheelers}</div>
          </div>
          <Bike size={20} className="text-emerald-400 opacity-60" />
        </div>

        <div className="bg-card p-3 rounded-lg border border-border flex items-center justify-between">
          <div>
            <div className="text-xs text-muted-foreground font-medium">Four-Wheelers (4W)</div>
            <div className="text-xl font-bold font-mono text-cyan-400 mt-0.5">{stats.fourWheelers}</div>
          </div>
          <Car size={20} className="text-cyan-400 opacity-60" />
        </div>

        <div className="bg-card p-3 rounded-lg border border-border flex items-center justify-between">
          <div>
            <div className="text-xs text-muted-foreground font-medium">Speed Violations</div>
            <div className="text-xl font-bold font-mono text-amber-400 mt-0.5">{stats.speedViolations}</div>
          </div>
          <Gauge size={20} className="text-amber-400 opacity-60" />
        </div>

        <div className="bg-card p-3 rounded-lg border border-border flex items-center justify-between">
          <div>
            <div className="text-xs text-muted-foreground font-medium">Total Challans</div>
            <div className="text-xl font-bold font-mono text-red-400 mt-0.5">{stats.violationsCount}</div>
          </div>
          <AlertTriangle size={20} className="text-red-400 opacity-60" />
        </div>

        <div className="bg-card p-3 rounded-lg border border-border flex items-center justify-between">
          <div>
            <div className="text-xs text-muted-foreground font-medium">Radar Speed Limit</div>
            <div className="text-xl font-bold font-mono text-primary mt-0.5">{speedLimit} <span className="text-xs">km/h</span></div>
          </div>
          <Crosshair size={20} className="text-primary opacity-60" />
        </div>
      </div>

      {/* Main Grid: Feed Area (Left) + Modular Commands Panel (Right) */}
      <div className="grid lg:grid-cols-12 gap-5 flex-1 min-h-0">
        {/* Left Column: Live Video / Canvas Simulator (7 cols) */}
        <div className="lg:col-span-8 flex flex-col gap-4">
          <div className="bg-card rounded-xl border border-border flex flex-col overflow-hidden relative shadow-md">
            {/* Viewport Header */}
            <div className="p-3 border-b border-border bg-muted/40 flex justify-between items-center text-xs">
              <div className="flex items-center gap-2 font-mono">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                <span className="font-semibold text-foreground uppercase">
                  {feedSource === "simulator" ? "REAL-TIME AI TRAFFIC JUNCTION SIMULATOR" : feedSource === "webcam" ? "LAPTOP WEBCAM / LOCAL SENSOR FEED" : "REMOTE CAMERA NODE STREAM"}
                </span>
              </div>
              <div className="flex items-center gap-3 text-muted-foreground">
                <span>RADAR: {radarEnabled ? "ACTIVE" : "STANDBY"}</span>
                <span>•</span>
                <span>SIGNAL: <strong className={trafficSignal === "GREEN" ? "text-emerald-500" : trafficSignal === "YELLOW" ? "text-amber-500" : "text-red-500"}>{trafficSignal}</strong></span>
              </div>
            </div>

            {/* Visual Stream Canvas / Video container */}
            <div className="relative aspect-video bg-black flex items-center justify-center overflow-hidden">
              {feedSource === "simulator" && (
                <canvas 
                  ref={canvasRef} 
                  className="w-full h-full object-contain"
                />
              )}

              {feedSource === "webcam" && (
                <div className="relative w-full h-full">
                  <video 
                    ref={videoRef} 
                    autoPlay 
                    playsInline 
                    muted 
                    className="w-full h-full object-cover"
                  />
                  {/* Artificial HUD Crosshair */}
                  <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                    <div className="border border-primary/40 rounded-full w-48 h-48 flex items-center justify-center">
                      <div className="w-2 h-2 bg-red-500 rounded-full animate-ping"></div>
                    </div>
                  </div>
                  <div className="absolute top-4 left-4 bg-black/70 border border-border p-2 rounded text-xs font-mono text-emerald-400">
                    <div>AI VISION: ACTIVE</div>
                    <div>MODE: {vehicleFilter}</div>
                    <div>SPEED RADAR: {speedLimit} KM/H</div>
                  </div>
                </div>
              )}

              {feedSource === "node" && (
                <div className="relative w-full h-full bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px] flex flex-col items-center justify-center text-center p-6">
                  <Video size={56} className="text-primary animate-pulse mb-3" />
                  <h3 className="text-lg font-bold">Connected to Camera Node DEMO-CAM-01</h3>
                  <p className="text-xs text-muted-foreground max-w-sm mt-1">
                    Streaming live telemetry and bounding box metadata from backend detector pipeline.
                  </p>
                  <div className="mt-4 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    <span className="text-xs font-mono text-emerald-400">WebSocket /api/v1/cameras/stream/DEMO-CAM-01 CONNECTED</span>
                  </div>
                </div>
              )}

              {status === "error" && (
                <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center text-destructive p-4 text-center z-20">
                  <AlertTriangle size={40} className="mb-2" />
                  <div className="font-bold">{errorMsg}</div>
                  <button 
                    onClick={() => handleSelectFeed("simulator")}
                    className="mt-3 px-3 py-1.5 bg-primary text-primary-foreground rounded text-xs"
                  >
                    Return to Road Simulator
                  </button>
                </div>
              )}
            </div>

            {/* Quick Interactive Command Buttons Bar */}
            <div className="p-3 bg-card border-t border-border flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="font-semibold text-muted-foreground flex items-center gap-1.5">
                <Zap size={14} className="text-amber-400" /> AI Simulation Triggers:
              </span>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => triggerManualSpawn("speeding")}
                  className="px-2.5 py-1 rounded bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 font-medium flex items-center gap-1 transition-colors"
                >
                  <Gauge size={13} /> Test Speeding Vehicle
                </button>
                <button
                  onClick={() => triggerManualSpawn("2w_helmet")}
                  className="px-2.5 py-1 rounded bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 font-medium flex items-center gap-1 transition-colors"
                >
                  <Bike size={13} /> Test 2W No Helmet
                </button>
                <button
                  onClick={() => triggerManualSpawn("4w_seatbelt")}
                  className="px-2.5 py-1 rounded bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/30 font-medium flex items-center gap-1 transition-colors"
                >
                  <Car size={13} /> Test 4W No Seatbelt
                </button>
                <button
                  onClick={() => setTrafficSignal(prev => prev === "RED" ? "GREEN" : prev === "GREEN" ? "YELLOW" : "RED")}
                  className="px-2.5 py-1 rounded bg-muted hover:bg-muted/80 text-foreground border border-border font-medium flex items-center gap-1 transition-colors"
                >
                  🚦 Toggle Signal ({trafficSignal})
                </button>
              </div>
            </div>
          </div>

          {/* Live Violations Feed Ledger Table */}
          <div className="bg-card rounded-xl border border-border p-4 flex flex-col flex-1 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="text-primary" size={18} />
                <h3 className="font-bold text-sm">Real-time Violations Ledger</h3>
                <span className="text-xs px-2 py-0.5 rounded-full bg-muted font-mono">{detectionsLog.length} recorded</span>
              </div>
              <button 
                onClick={exportLogCSV}
                disabled={detectionsLog.length === 0}
                className="text-xs flex items-center gap-1 text-muted-foreground hover:text-foreground disabled:opacity-40 transition-colors"
              >
                <Download size={14} /> Export CSV
              </button>
            </div>

            <div className="flex-1 overflow-y-auto max-h-56 divide-y divide-border/50 text-xs">
              {detectionsLog.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  Scanning road for traffic violations... No violations recorded yet.
                </div>
              ) : (
                detectionsLog.map((log) => (
                  <div key={log.id} className="py-2.5 flex items-center justify-between gap-2 hover:bg-muted/30 px-2 rounded transition-colors">
                    <div className="flex items-center gap-3">
                      <div className={`p-1.5 rounded-md ${log.category === 'TWO_WHEELER' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-blue-500/10 text-blue-400'}`}>
                        {log.category === 'TWO_WHEELER' ? <Bike size={16} /> : <Car size={16} />}
                      </div>
                      <div>
                        <div className="font-semibold flex items-center gap-2">
                          <span className="font-mono text-foreground">{log.plate}</span>
                          <span className="text-red-400 font-bold bg-red-500/10 px-2 py-0.5 rounded text-[11px] border border-red-500/20">
                            {log.violationTitle || log.violation}
                          </span>
                        </div>
                        <div className="text-muted-foreground text-[11px] mt-0.5 flex items-center gap-2">
                          <span>{log.model}</span>
                          <span>•</span>
                          <span className="font-mono text-amber-300">Recorded: {log.speed} km/h</span>
                          <span>•</span>
                          <span>Conf: {log.confidence}%</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right flex items-center gap-2">
                      <div>
                        <div className="font-mono font-bold text-red-400">{log.penalty || "₹1,000"}</div>
                        <div className="text-[10px] text-muted-foreground">{log.time?.toLocaleTimeString()}</div>
                      </div>
                      <button
                        onClick={() => setActiveChallanModal(log)}
                        className="px-2.5 py-1 bg-primary text-primary-foreground rounded text-[11px] font-semibold hover:bg-primary/90 transition-colors"
                      >
                        View Challan
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Modular AI Camera Options & Command Center (5 cols) */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          <div className="bg-card rounded-xl border border-border p-4 shadow-sm flex flex-col gap-4">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h2 className="font-bold text-base flex items-center gap-2">
                <Sliders size={18} className="text-primary" /> AI Camera Commands
              </h2>
              <span className="text-[11px] px-2 py-0.5 rounded bg-primary/10 text-primary font-mono font-semibold">
                CONFIG PANEL
              </span>
            </div>

            {/* COMMAND 1: Target Vehicle Classification Filter */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                <span>Target Vehicle Classification</span>
                <span className="text-primary font-mono lowercase">{vehicleFilter}</span>
              </label>
              <div className="grid grid-cols-3 gap-1.5 bg-muted p-1 rounded-lg border border-border">
                <button
                  onClick={() => setVehicleFilter("ALL")}
                  className={`py-1.5 px-2 rounded-md text-xs font-medium transition-colors ${vehicleFilter === "ALL" ? 'bg-card text-foreground shadow-sm font-bold' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  All Vehicles
                </button>
                <button
                  onClick={() => setVehicleFilter("TWO_WHEELER")}
                  className={`py-1.5 px-2 rounded-md text-xs font-medium transition-colors flex items-center justify-center gap-1 ${vehicleFilter === "TWO_WHEELER" ? 'bg-card text-emerald-400 shadow-sm font-bold' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  <Bike size={13} /> 2-Wheelers
                </button>
                <button
                  onClick={() => setVehicleFilter("FOUR_WHEELER")}
                  className={`py-1.5 px-2 rounded-md text-xs font-medium transition-colors flex items-center justify-center gap-1 ${vehicleFilter === "FOUR_WHEELER" ? 'bg-card text-cyan-400 shadow-sm font-bold' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  <Car size={13} /> 4-Wheelers
                </button>
              </div>
            </div>

            {/* COMMAND 2: Speed Radar Control & Limit Adjuster */}
            <div className="space-y-3 pt-2 border-t border-border">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Gauge size={14} className="text-primary" /> Speed Radar Gun
                </label>
                <button 
                  onClick={() => setRadarEnabled(!radarEnabled)}
                  className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold transition-colors ${radarEnabled ? 'bg-emerald-500/20 text-emerald-400' : 'bg-muted text-muted-foreground'}`}
                >
                  {radarEnabled ? "ACTIVE (ON)" : "DISABLED"}
                </button>
              </div>

              {/* Speed Limit Slider */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-muted-foreground">Speed Limit:</span>
                  <span className="font-bold text-primary text-sm">{speedLimit} km/h</span>
                </div>
                <input 
                  type="range" 
                  min="20" 
                  max="120" 
                  step="5"
                  value={speedLimit}
                  onChange={(e) => setSpeedLimit(Number(e.target.value))}
                  className="w-full accent-primary h-1.5 bg-muted rounded-lg cursor-pointer"
                />
              </div>

              {/* Quick Preset Buttons */}
              <div className="grid grid-cols-4 gap-1">
                {[
                  { label: "30 School", val: 30 },
                  { label: "50 City", val: 50 },
                  { label: "80 Arterial", val: 80 },
                  { label: "100 Highway", val: 100 }
                ].map(p => (
                  <button
                    key={p.val}
                    onClick={() => setSpeedLimit(p.val)}
                    className={`px-1.5 py-1 rounded text-[10px] font-mono border transition-colors ${speedLimit === p.val ? 'bg-primary/20 border-primary text-primary font-bold' : 'border-border text-muted-foreground hover:bg-muted'}`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              {/* Speed Tolerance */}
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Tolerance Buffer:</span>
                <div className="flex gap-1">
                  {[0, 5, 10].map(tol => (
                    <button
                      key={tol}
                      onClick={() => setSpeedTolerance(tol)}
                      className={`px-2 py-0.5 rounded text-[11px] font-mono transition-colors ${speedTolerance === tol ? 'bg-primary text-primary-foreground font-bold' : 'bg-muted text-muted-foreground'}`}
                    >
                      +{tol} km/h
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* COMMAND 3: Modular Violation Rules Toggles */}
            <div className="space-y-3 pt-2 border-t border-border">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                <span>Modular Violation Detectors</span>
                <span className="text-[10px] text-muted-foreground font-normal">Toggle rules</span>
              </label>

              {/* Two-Wheeler Specific Rules */}
              <div className="space-y-1.5">
                <div className="text-[11px] font-semibold text-emerald-400 flex items-center gap-1">
                  <Bike size={12} /> Two-Wheeler Violations:
                </div>
                <div className="grid grid-cols-2 gap-1.5 text-xs">
                  <label className="flex items-center gap-2 p-1.5 rounded bg-muted/40 border border-border/50 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={activeRules.NO_HELMET} 
                      onChange={() => toggleRule("NO_HELMET")} 
                      className="accent-primary rounded" 
                    />
                    <span className="text-[11px]">Rider No Helmet</span>
                  </label>
                  <label className="flex items-center gap-2 p-1.5 rounded bg-muted/40 border border-border/50 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={activeRules.TRIPLE_RIDING} 
                      onChange={() => toggleRule("TRIPLE_RIDING")} 
                      className="accent-primary rounded" 
                    />
                    <span className="text-[11px]">Triple Riding</span>
                  </label>
                  <label className="flex items-center gap-2 p-1.5 rounded bg-muted/40 border border-border/50 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={activeRules.PILLION_NO_HELMET} 
                      onChange={() => toggleRule("PILLION_NO_HELMET")} 
                      className="accent-primary rounded" 
                    />
                    <span className="text-[11px]">Pillion No Helmet</span>
                  </label>
                  <label className="flex items-center gap-2 p-1.5 rounded bg-muted/40 border border-border/50 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={activeRules.RASH_WEAVING} 
                      onChange={() => toggleRule("RASH_WEAVING")} 
                      className="accent-primary rounded" 
                    />
                    <span className="text-[11px]">Rash Weaving</span>
                  </label>
                </div>
              </div>

              {/* Four-Wheeler Specific Rules */}
              <div className="space-y-1.5">
                <div className="text-[11px] font-semibold text-cyan-400 flex items-center gap-1">
                  <Car size={12} /> Four-Wheeler Violations:
                </div>
                <div className="grid grid-cols-2 gap-1.5 text-xs">
                  <label className="flex items-center gap-2 p-1.5 rounded bg-muted/40 border border-border/50 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={activeRules.NO_SEATBELT} 
                      onChange={() => toggleRule("NO_SEATBELT")} 
                      className="accent-primary rounded" 
                    />
                    <span className="text-[11px]">No Seatbelt</span>
                  </label>
                  <label className="flex items-center gap-2 p-1.5 rounded bg-muted/40 border border-border/50 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={activeRules.PHONE_USAGE} 
                      onChange={() => toggleRule("PHONE_USAGE")} 
                      className="accent-primary rounded" 
                    />
                    <span className="text-[11px]">Mobile In Hand</span>
                  </label>
                  <label className="flex items-center gap-2 p-1.5 rounded bg-muted/40 border border-border/50 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={activeRules.SOLID_LANE_CROSSING} 
                      onChange={() => toggleRule("SOLID_LANE_CROSSING")} 
                      className="accent-primary rounded" 
                    />
                    <span className="text-[11px]">Solid Lane Breach</span>
                  </label>
                  <label className="flex items-center gap-2 p-1.5 rounded bg-muted/40 border border-border/50 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={activeRules.OVERLOADED_VEHICLE} 
                      onChange={() => toggleRule("OVERLOADED_VEHICLE")} 
                      className="accent-primary rounded" 
                    />
                    <span className="text-[11px]">Cargo Overload</span>
                  </label>
                </div>
              </div>

              {/* Universal Rules */}
              <div className="space-y-1.5">
                <div className="text-[11px] font-semibold text-amber-400 flex items-center gap-1">
                  <AlertTriangle size={12} /> Intersection & Highway Rules:
                </div>
                <div className="grid grid-cols-2 gap-1.5 text-xs">
                  <label className="flex items-center gap-2 p-1.5 rounded bg-muted/40 border border-border/50 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={activeRules.SPEEDING} 
                      onChange={() => toggleRule("SPEEDING")} 
                      className="accent-primary rounded" 
                    />
                    <span className="text-[11px] font-medium text-amber-300">Radar Overspeed</span>
                  </label>
                  <label className="flex items-center gap-2 p-1.5 rounded bg-muted/40 border border-border/50 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={activeRules.RED_LIGHT} 
                      onChange={() => toggleRule("RED_LIGHT")} 
                      className="accent-primary rounded" 
                    />
                    <span className="text-[11px]">Red Light Jump</span>
                  </label>
                  <label className="flex items-center gap-2 p-1.5 rounded bg-muted/40 border border-border/50 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={activeRules.WRONG_WAY} 
                      onChange={() => toggleRule("WRONG_WAY")} 
                      className="accent-primary rounded" 
                    />
                    <span className="text-[11px]">Wrong Way Driving</span>
                  </label>
                  <label className="flex items-center gap-2 p-1.5 rounded bg-muted/40 border border-border/50 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={activeRules.STOP_LINE_BREACH} 
                      onChange={() => toggleRule("STOP_LINE_BREACH")} 
                      className="accent-primary rounded" 
                    />
                    <span className="text-[11px]">Zebra/Stop Line</span>
                  </label>
                </div>
              </div>
            </div>

            {/* COMMAND 4: AI Engine Tuning */}
            <div className="space-y-2 pt-2 border-t border-border">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-muted-foreground">Confidence Threshold:</span>
                <span className="font-bold text-primary">{confidenceThreshold}%</span>
              </div>
              <input 
                type="range" 
                min="50" 
                max="95" 
                step="5"
                value={confidenceThreshold}
                onChange={(e) => setConfidenceThreshold(Number(e.target.value))}
                className="w-full accent-primary h-1.5 bg-muted rounded-lg cursor-pointer"
              />

              <div className="flex items-center justify-between pt-1">
                <span className="text-xs text-muted-foreground">Auto-Save Challan to DB:</span>
                <button 
                  onClick={() => setAutoChallan(!autoChallan)}
                  className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold transition-colors ${autoChallan ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'}`}
                >
                  {autoChallan ? "ENABLED" : "OFF"}
                </button>
              </div>
            </div>

            {/* Reset Stats Command */}
            <button
              onClick={() => {
                setStats({ totalPassed: 0, twoWheelers: 0, fourWheelers: 0, violationsCount: 0, speedViolations: 0, avgSpeed: 50 });
                setDetectionsLog([]);
              }}
              className="w-full py-2 bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground text-xs font-semibold rounded-lg border border-border flex items-center justify-center gap-1.5 transition-colors"
            >
              <RefreshCw size={13} /> Reset Telemetry & Counters
            </button>
          </div>
        </div>
      </div>

      {/* Interactive Challan Modal */}
      {activeChallanModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-xs font-mono font-bold text-red-500 uppercase">OFFICIAL E-CHALLAN DRAFT</span>
                <h3 className="text-lg font-bold mt-0.5">{activeChallanModal.violationTitle || activeChallanModal.violation}</h3>
              </div>
              <button 
                onClick={() => setActiveChallanModal(null)}
                className="text-muted-foreground hover:text-foreground text-lg"
              >
                ✕
              </button>
            </div>

            <div className="bg-muted/50 p-3 rounded-lg space-y-2 text-xs font-mono">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Registration Plate:</span>
                <span className="font-bold text-foreground">{activeChallanModal.plate}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Vehicle Classification:</span>
                <span className="font-semibold text-foreground">{activeChallanModal.category} ({activeChallanModal.model})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Recorded Speed:</span>
                <span className="font-bold text-amber-400">{activeChallanModal.speed} km/h (Limit: {activeChallanModal.speedLimit || speedLimit} km/h)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Penalty Assessment:</span>
                <span className="font-bold text-red-400 text-sm">{activeChallanModal.penalty || "₹1,000"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Detection Confidence:</span>
                <span className="font-semibold text-emerald-400">{activeChallanModal.confidence}%</span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setActiveChallanModal(null)}
                className="px-4 py-2 bg-muted text-foreground text-xs font-semibold rounded-lg hover:bg-muted/80"
              >
                Close
              </button>
              <button
                onClick={() => {
                  alert(`E-Challan #${Math.floor(100000 + Math.random()*900000)} dispatched to RTO & Vehicle Owner (${activeChallanModal.plate})`);
                  setActiveChallanModal(null);
                }}
                className="px-4 py-2 bg-primary text-primary-foreground text-xs font-semibold rounded-lg hover:bg-primary/90 flex items-center gap-1.5"
              >
                <CheckCircle2 size={14} /> Confirm & Dispatch Challan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}