import { useState } from "react";
import { Upload, Image as ImageIcon, Loader2, AlertCircle } from "lucide-react";
import { detectPhoto, getImageUrl } from "@/services/api";

export default function PhotoDetection() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      setFile(selected);
      setPreview(URL.createObjectURL(selected));
      setResult(null);
      setError(null);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    
    try {
      const data = await detectPhoto(file);
      setResult(data);
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.detail || "Failed to process image. Backend might be down.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Photo Analysis</h1>
        <p className="text-muted-foreground mt-1">Upload still frames for YOLOv8 violation detection.</p>
      </div>

      {error && (
        <div className="bg-destructive/10 text-destructive border border-destructive/20 p-4 rounded-md flex items-center gap-2">
          <AlertCircle size={20} />
          {error}
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        {/* Upload Column */}
        <div className="flex flex-col gap-4">
          <div className="border-2 border-dashed border-border rounded-xl p-8 flex flex-col items-center justify-center bg-card text-center min-h-[300px] relative">
            {preview ? (
              <div className="relative mb-4 flex items-center justify-center" style={{ maxWidth: '100%', maxHeight: '250px' }}>
                <img src={preview} alt="Preview" className="max-h-[250px] object-contain rounded-md shadow-sm" />
                {result && result.bbox && (
                  <div 
                    className="absolute border-2 border-red-500 bg-red-500/20 z-10 transition-all duration-300 shadow-[0_0_15px_rgba(239,68,68,0.5)]"
                    style={{
                      left: `${(result.bbox[0] / 640) * 100}%`,
                      top: `${(result.bbox[1] / 480) * 100}%`,
                      width: `${((result.bbox[2] - result.bbox[0]) / 640) * 100}%`,
                      height: `${((result.bbox[3] - result.bbox[1]) / 480) * 100}%`,
                    }}
                  >
                    <div className="absolute -top-6 left-[-2px] bg-red-500 text-white text-xs font-bold px-2 py-1 whitespace-nowrap z-20">
                      {result.violation_type.replace("_", " ")}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <ImageIcon size={32} className="text-primary" />
              </div>
            )}
            <h3 className="font-semibold text-lg mb-1">{preview ? "Image Selected" : "Upload Image"}</h3>
            <p className="text-sm text-muted-foreground mb-4">PNG, JPG up to 10MB</p>
            
            <label className="bg-primary text-primary-foreground px-4 py-2 rounded-md font-medium cursor-pointer hover:bg-primary/90 transition-colors">
              Browse Files
              <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
            </label>
          </div>
          
          <button 
            onClick={handleUpload} 
            disabled={!file || loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-md font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <><Loader2 className="animate-spin" size={20} /> Analyzing with YOLOv8...</>
            ) : (
              <><Upload size={20} /> Run AI Analysis</>
            )}
          </button>
        </div>

        {/* Results Column */}
        <div className="bg-card border border-border rounded-xl p-6 min-h-[300px] flex flex-col">
          <h2 className="text-xl font-bold mb-4 border-b border-border pb-2">Analysis Results</h2>
          
          {!loading && !result && (
             <div className="flex-1 flex items-center justify-center text-muted-foreground">
               No results yet. Upload an image to begin.
             </div>
          )}

          {loading && (
             <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-4">
                <Loader2 className="animate-spin text-primary" size={48} />
                <p>Simulating 3-second YOLO & EasyOCR Pipeline...</p>
             </div>
          )}

          {result && (
             <div className="flex flex-col gap-4">
                <div className="p-4 rounded-md border border-border bg-background">
                  <div className="text-sm text-muted-foreground mb-1">Detection Status</div>
                  {result.violation_type === "NONE" ? (
                    <div className="text-xl font-bold text-emerald-500">NO VIOLATION DETECTED</div>
                  ) : (
                    <div className="text-xl font-bold text-destructive">{result.violation_type}</div>
                  )}
                </div>

                {result.violation_type !== "NONE" && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 rounded-md border border-border bg-background">
                        <div className="text-sm text-muted-foreground mb-1">AI Confidence</div>
                        <div className="text-xl font-bold">{(result.confidence * 100).toFixed(1)}%</div>
                      </div>
                      <div className="p-4 rounded-md border border-border bg-background">
                        <div className="text-sm text-muted-foreground mb-1">License Plate</div>
                        <div className="text-xl font-bold">{result.plate_number || "Not Visible"}</div>
                      </div>
                    </div>
                    
                    {result.image_url && (
                      <div className="mt-2">
                        <div className="text-sm text-muted-foreground mb-2">Saved Evidence File:</div>
                        <a href={getImageUrl(result.image_url)} target="_blank" rel="noreferrer" className="text-primary hover:underline truncate block">
                          {result.image_url}
                        </a>
                      </div>
                    )}
                  </>
                )}
             </div>
          )}
        </div>
      </div>
    </div>
  );
}