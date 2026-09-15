import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Video, Square, Play } from "lucide-react";
import { apiClient } from "@/services/api";
import WebcamStream from "@/components/WebcamStream";

export default function CameraFeed() {
  const { id } = useParams();
  const [camera, setCamera] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isAiRunning, setIsAiRunning] = useState(false);
  const [feedLogs, setFeedLogs] = useState<any[]>([]);
  
  useEffect(() => {
    async function fetchCam() {
      try {
        const res = await apiClient.get(`/cameras/${id}`);
        setCamera(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchCam();
  }, [id]);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isAiRunning) {
      // Simulate polling backend for new violations from this camera every 5 seconds
      interval = setInterval(async () => {
        try {
          // Trigger a fake generation in the backend
          const res = await apiClient.post(`/cameras/${id}/demo_trigger`);
          if (res.data && res.data.violation_type !== "NONE") {
             setFeedLogs(prev => [res.data, ...prev].slice(0, 10)); // Keep last 10
          }
        } catch (e) {
          console.error(e);
        }
      }, 5000);
    }
    return () => clearInterval(interval);
  }, [isAiRunning, id]);

  const toggleAI = () => {
    setIsAiRunning(!isAiRunning);
  };

  if (loading) return <div>Loading Feed...</div>;
  if (!camera) return <div>Camera Not Found</div>;

  return (
    <div className="flex flex-col gap-6 h-full">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            {camera.name} <span className="text-sm px-2 py-1 bg-muted rounded-md text-muted-foreground font-mono">{camera.id}</span>
          </h1>
          <p className="text-muted-foreground mt-1">Live Feed & AI Analytics</p>
        </div>
        <button 
          onClick={toggleAI}
          className={`px-4 py-2 flex items-center gap-2 rounded-md font-bold text-white transition-colors ${isAiRunning ? 'bg-destructive hover:bg-destructive/90' : 'bg-emerald-600 hover:bg-emerald-700'}`}
        >
          {isAiRunning ? <><Square fill="currentColor" size={16}/> STOP AI</> : <><Play fill="currentColor" size={16}/> START AI</>}
        </button>
      </div>

      <div className="grid md:grid-cols-3 gap-6 h-[500px]">
        {/* Main Feed */}
        <div className="md:col-span-2 bg-black rounded-xl overflow-hidden relative flex items-center justify-center border border-border">
          {isAiRunning ? (
            <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1449824913935-59a10b8d2000?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center opacity-40"></div>
          ) : (
            <div className="text-zinc-600 flex flex-col items-center">
               <Video size={64} className="mb-4 opacity-50"/>
               <p className="font-medium text-lg">AI Feed Paused</p>
            </div>
          )}
          
          {/* Overlays */}
          {isAiRunning && (
            <>
              <div className="absolute top-4 left-4 bg-red-600 text-white text-xs font-bold px-2 py-1 rounded flex items-center gap-2 animate-pulse">
                <div className="w-2 h-2 bg-white rounded-full"></div> LIVE AI TRACKING
              </div>
              <div className="absolute bottom-4 left-4 font-mono text-emerald-400 text-xs">
                FPS: 24.3 | YOLOv8-N | Latency: 42ms
              </div>
            </>
          )}
        </div>

        {/* Live Logs */}
        <div className="bg-card border border-border rounded-xl flex flex-col">
          <div className="p-4 border-b border-border font-bold flex justify-between items-center">
            Live Detections
            {isAiRunning && <span className="animate-spin text-muted-foreground">...</span>}
          </div>
          <div className="flex-1 p-4 overflow-y-auto flex flex-col gap-3">
             {!isAiRunning && feedLogs.length === 0 && (
               <div className="text-muted-foreground text-sm text-center mt-10">
                 Start AI to begin detecting violations.
               </div>
             )}
             
             {feedLogs.map((log, i) => (
               <div key={i} className="p-3 bg-destructive/10 border border-destructive/20 rounded-md text-sm">
                 <div className="font-bold text-destructive mb-1">{log.violation_type}</div>
                 <div className="flex justify-between text-muted-foreground text-xs">
                   <span>Conf: {(log.confidence * 100).toFixed(1)}%</span>
                   <span>{log.plate_number || "NO PLATE"}</span>
                 </div>
               </div>
             ))}
          </div>
        </div>
      </div>
      
      {/* Laptop Dashcam Integration */}
      <div className="mt-4">
        <WebcamStream />
      </div>
    </div>
  )
}
