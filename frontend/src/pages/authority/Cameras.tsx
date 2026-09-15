import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Camera, Activity } from "lucide-react";
import { apiClient } from "@/services/api";

export default function Cameras() {
  const [cameras, setCameras] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadCameras() {
      try {
        const res = await apiClient.get("/cameras");
        setCameras(res.data);
      } catch (err) {
        console.error(err);
        setError("Failed to load cameras");
      } finally {
        setLoading(false);
      }
    }
    loadCameras();
  }, []);

  if (loading) return <div className="p-8">Loading cameras...</div>;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">AI Camera Management</h1>
          <p className="text-muted-foreground mt-1">Manage physical and demo cameras connected to the YOLO processing pipeline.</p>
        </div>
        <div className="flex gap-3">
          <Link to="/detect/live" className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-md font-semibold text-sm flex items-center gap-2">
            <Activity size={16} /> Open Live Modular AI Camera
          </Link>
          <button className="bg-primary text-primary-foreground px-4 py-2 rounded-md font-semibold text-sm">
            + Add Camera
          </button>
        </div>
      </div>
      
      {error && <div className="text-destructive">{error}</div>}

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {cameras.map((cam) => (
          <Link to={`/cameras/${cam.id}`} key={cam.id} className="block group">
            <div className="bg-card border border-border rounded-xl p-5 hover:border-primary transition-colors cursor-pointer relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-emerald-500"></div>
              
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 text-primary rounded-lg">
                    <Camera size={24} />
                  </div>
                  <div>
                    <h3 className="font-bold">{cam.id}</h3>
                    <p className="text-xs text-muted-foreground">{cam.name}</p>
                  </div>
                </div>
                <div className="text-xs font-semibold px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-500">
                  {cam.status}
                </div>
              </div>
              
              <div className="flex items-center justify-between text-sm pt-4 border-t border-border/50">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Activity size={16} /> Type: {cam.camera_type}
                </div>
                <div className="font-medium text-primary flex items-center gap-1">
                  View Feed &rarr;
                </div>
              </div>
            </div>
          </Link>
        ))}
        {cameras.length === 0 && (
          <div className="col-span-full p-8 text-center bg-muted/20 border border-dashed rounded-lg">
            No cameras found.
          </div>
        )}
      </div>
    </div>
  );
}
