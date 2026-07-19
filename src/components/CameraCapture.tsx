import { useEffect, useRef, useState } from "react";
import { Camera, RotateCcw, Check, Upload } from "lucide-react";
import { useLang } from "@/lib/settings-store";

export function CameraCapture({ onCapture }: { onCapture: (dataUrl: string) => void }) {
  const [lang] = useLang();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [streaming, setStreaming] = useState(false);
  const [snapshot, setSnapshot] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    navigator.mediaDevices
      ?.getUserMedia({ video: { facingMode: "environment" } })
      .then((stream) => {
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
        setStreaming(true);
      })
      .catch(() => setError(lang === "id" ? "Kamera tidak tersedia — pakai tombol unggah di bawah." : "Camera unavailable — use the upload button below."));
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function takeSnapshot() {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    setSnapshot(canvas.toDataURL("image/jpeg", 0.85));
  }

  function retake() {
    setSnapshot(null);
  }

  function confirm() {
    if (snapshot) onCapture(snapshot);
    setSnapshot(null);
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") onCapture(reader.result);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  if (snapshot) {
    return (
      <div className="flex flex-col items-center gap-3">
        <img src={snapshot} alt="Snapshot" className="w-full max-w-sm rounded-2xl border border-border" />
        <div className="flex gap-3 w-full max-w-sm">
          <button onClick={retake} className="flex-1 rounded-xl border border-border py-2.5 text-sm font-semibold flex items-center justify-center gap-2">
            <RotateCcw size={15} /> {lang === "id" ? "Ambil ulang" : "Retake"}
          </button>
          <button onClick={confirm} className="flex-1 rounded-xl bg-primary text-primary-foreground py-2.5 text-sm font-semibold flex items-center justify-center gap-2">
            <Check size={15} /> {lang === "id" ? "Gunakan" : "Use photo"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3">
      {streaming ? (
        <video ref={videoRef} autoPlay playsInline muted className="w-full max-w-sm rounded-2xl border border-border bg-black aspect-[3/4] object-cover" />
      ) : (
        <div className="w-full max-w-sm rounded-2xl border border-dashed border-border grid place-items-center aspect-[3/4] text-muted-foreground text-xs text-center p-4">
          {error ?? (lang === "id" ? "Menyiapkan kamera…" : "Starting camera…")}
        </div>
      )}
      <div className="flex gap-3 w-full max-w-sm">
        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex-1 rounded-xl border border-border py-2.5 text-sm font-semibold flex items-center justify-center gap-2"
        >
          <Upload size={15} /> {lang === "id" ? "Unggah" : "Upload"}
        </button>
        <button
          onClick={takeSnapshot}
          disabled={!streaming}
          className="flex-1 rounded-xl bg-primary text-primary-foreground py-2.5 text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-40"
        >
          <Camera size={15} /> {lang === "id" ? "Jepret" : "Capture"}
        </button>
      </div>
      <input ref={fileInputRef} type="file" accept="image/*" capture="environment" onChange={handleFile} className="hidden" />
    </div>
  );
}
