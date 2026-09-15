import { useState } from "react";
import { Upload, Video as VideoIcon, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";

export default function VideoDetection() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [violations, setViolations] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [completed, setCompleted] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      setFile(selected);
      setPreview(URL.createObjectURL(selected));
      setViolations([]);
      setProgress(0);
      setCompleted(false);
      setError(null);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    setViolations([]);
    setProgress(0);
    setCompleted(false);
    
    try {
      const formData = new FormData();
      formData.append("file", file);
      const baseUrl = import.meta.env.VITE_API_BASE_URL || "/api/v1";
      const response = await fetch(`${baseUrl}/detect/video`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok || !response.body) {
        throw new Error("Failed to process video");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");

      let done = false;
      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        if (value) {
          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split("\n\n");
          
          for (const line of lines) {
            if (line.startsWith("data: ")) {
              try {
                const data = JSON.parse(line.substring(6));
                
                if (data.status === "progress") {
                  setProgress(data.progress);
                  if (data.violation) {
                    setViolations(prev => [...prev, data.violation]);
                  }
                } else if (data.status === "completed") {
                  setCompleted(true);
                  setLoading(false);
                }
              } catch (e) {
                console.error("Error parsing SSE data", e);
              }
            }
          }
        }
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to process video.");
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 h-full">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Video Analysis</h1>
        <p className="text-muted-foreground mt-1">Upload video files for continuous frame-by-frame AI detection via SSE stream.</p>
      </div>

      {error && (
        <div className="bg-destructive/10 text-destructive border border-destructive/20 p-4 rounded-md flex items-center gap-2">
          <AlertCircle size={20} />
          {error}
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6 flex-1 min-h-0">
        <div className="flex flex-col gap-4">
          <div className="border-2 border-dashed border-border rounded-xl p-8 flex flex-col items-center justify-center bg-card text-center flex-1">
            {preview ? (
              <video src={preview} controls className="max-h-[300px] object-contain mb-4 rounded-md shadow-sm border border-border" />
            ) : (
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <VideoIcon size={32} className="text-primary" />
              </div>
            )}
            <h3 className="font-semibold text-lg mb-1">{preview ? file?.name : "Upload Video"}</h3>
            <p className="text-sm text-muted-foreground mb-4">MP4, AVI, MKV up to 50MB</p>
            
            <label className="bg-primary text-primary-foreground px-4 py-2 rounded-md font-medium cursor-pointer hover:bg-primary/90 transition-colors">
              Browse Files
              <input type="file" className="hidden" accept="video/*" onChange={handleFileChange} />
            </label>
          </div>
          
          <button 
            onClick={handleUpload} 
            disabled={!file || loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-md font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <><Loader2 className="animate-spin" size={20} /> Processing Stream...</>
            ) : (
              <><Upload size={20} /> Start AI Processing</>
            )}
          </button>
        </div>

        <div className="bg-card border border-border rounded-xl p-6 flex flex-col">
          <h2 className="text-xl font-bold mb-4 border-b border-border pb-2">Live Analysis Feed</h2>
          
          {!loading && !completed && violations.length === 0 && (
             <div className="flex-1 flex items-center justify-center text-muted-foreground">
               Upload a video to see real-time extraction.
             </div>
          )}

          {(loading || completed) && (
            <div className="mb-4">
              <div className="flex justify-between text-sm font-medium mb-1">
                <span>Progress</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2.5">
                <div className="bg-primary h-2.5 rounded-full transition-all duration-300" style={{ width: `${progress}%` }}></div>
              </div>
            </div>
          )}

          {completed && (
             <div className="mb-4 p-3 rounded-md border border-emerald-500/50 bg-emerald-500/10 text-emerald-500 font-medium flex items-center gap-2">
               <CheckCircle2 size={18} /> Processing Complete! Found {violations.length} violations.
             </div>
          )}

          <div className="flex flex-col gap-3 flex-1 overflow-y-auto pr-2">
            {violations.map((v: any, idx: number) => (
              <div key={idx} className="p-3 bg-background border border-border rounded-md flex justify-between items-center animate-in fade-in slide-in-from-right-4">
                <div>
                  <div className="font-bold text-destructive">{v.type.replace("_", " ")}</div>
                  {v.plate_number && <div className="text-xs font-mono font-semibold mt-1">Plate: {v.plate_number}</div>}
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold">{(v.confidence * 100).toFixed(1)}%</div>
                  <div className="text-xs text-muted-foreground">ID: {v.id}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}