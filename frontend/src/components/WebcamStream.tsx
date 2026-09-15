import { useRef, useEffect, useState } from 'react';
import { Video, ShieldAlert } from 'lucide-react';
import { apiClient } from '../services/api';

export default function WebcamStream() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [streaming, setStreaming] = useState(false);
  const [lastDetection, setLastDetection] = useState<any>(null);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setStreaming(true);
      }
    } catch (err) {
      console.error("Webcam access error:", err);
      alert("Could not access laptop webcam. Check browser permissions.");
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
      setStreaming(false);
    }
  };

  const captureAndInspect = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(async (blob) => {
        if (!blob) return;
        const file = new File([blob], "webcam_capture.jpg", { type: "image/jpeg" });
        const formData = new FormData();
        formData.append('file', file);
        try {
          const res = await apiClient.post('/detect/photo', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
          });
          if (res.data && res.data.violation_type && res.data.violation_type !== 'NONE') {
            setLastDetection({
              type: res.data.violation_type,
              plate_number: res.data.plate_number,
            });
          }
        } catch (e) {
          console.error("Frame detection upload failed", e);
        }
      }, 'image/jpeg');
    }
  };

  useEffect(() => {
    let interval: any;
    if (streaming) {
      interval = setInterval(captureAndInspect, 5000); // Send frame every 5s for AI check
    }
    return () => clearInterval(interval);
  }, [streaming]);

  return (
    <div className="bg-[#101C2E] border border-slate-800 rounded-xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-2">
          <Video className="h-4 w-4 text-blue-400" /> Laptop Dashcam / Local AI Camera Feed
        </h3>
        <div className="flex gap-2">
          {!streaming ? (
            <button onClick={startCamera} className="bg-blue-600 hover:bg-blue-500 text-white text-xs px-3 py-1.5 rounded font-medium">
              Start Webcam Feed
            </button>
          ) : (
            <button onClick={stopCamera} className="bg-red-600 hover:bg-red-500 text-white text-xs px-3 py-1.5 rounded font-medium">
              Stop Feed
            </button>
          )}
        </div>
      </div>

      <div className="relative aspect-video bg-[#08111F] rounded-lg overflow-hidden border border-slate-800 flex items-center justify-center">
        <video ref={videoRef} autoPlay playsInline muted className={`w-full h-full object-cover ${!streaming && 'hidden'}`} />
        {!streaming && (
          <div className="text-slate-500 text-xs flex flex-col items-center">
            <Video className="h-8 w-8 mb-2 opacity-40" />
            Camera offline. Click "Start Webcam Feed" to initialize.
          </div>
        )}
        {streaming && lastDetection && (
          <div className="absolute bottom-3 left-3 bg-red-600/90 text-white px-3 py-1.5 rounded text-xs font-mono flex items-center gap-2 shadow-lg">
            <ShieldAlert className="h-4 w-4" /> Detected: {lastDetection.type} ({lastDetection.plate_number})
          </div>
        )}
      </div>
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
