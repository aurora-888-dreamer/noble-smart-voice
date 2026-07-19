import { useRef, useState } from "react";
import { Camera, RotateCcw, Check, Upload, Video } from "lucide-react";
import { useLang } from "@/lib/settings-store";

type Stage = "idle" | "requesting" | "streaming" | "error";

export function CameraCapture({ onCapture }: { onCapture: (dataUrl: string) => void }) {
  const [lang] = useLang();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [stage, setStage] = useState<Stage>("idle");
  const [snapshot, setSnapshot] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Deliberately NOT auto-requested on mount: some mobile browsers (seen on
  // MIUI/HyperOS Chrome, same as the earlier mic issue) silently refuse or
  // hang a getUserMedia call that isn't triggered by a direct tap. Asking
  // only inside this onClick — a genuine user gesture — is the compatible
  // pattern.
  async function openCamera() {
    setStage("requesting");
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      setStage("streaming");
    } catch (err) {
      const e = err as DOMException;
      console.error("[Noble] Camera getUserMedia failed:", e?.name, e?.message);
      let msg =
        lang === "id" ? "Kamera tidak tersedia — pakai tombol unggah di bawah." : "Camera unavailable — use the upload button below.";
      if (e?.name === "NotAllowedError") {
        msg =
          lang === "id"
            ? "Izin kamera ditolak. Cek izin kamera untuk browser ini di pengaturan HP/browser kamu."
            : "Camera permission denied. Check this browser's camera permission in your device/browser settings.";
      } else if (e?.name === "NotFoundError") {
        msg = lang === "id" ? "Tidak ada kamera terdeteksi di perangkat ini." : "No camera detected on this device.";
      } else if (e?.name === "NotReadableError") {
        msg =
          lang === "id"
            ? "Kamera sedang dipakai aplikasi lain. Tutup app lain yang mungkin pakai kamera, lalu coba lagi."
            : "Camera is already in use by another app. Close anything else using it and try again.";
      } else if (e?.name === "OverconstrainedError") {
        // Rear camera constraint couldn't be satisfied — retry with no constraint.
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: true });
          streamRef.current = stream;
          if (videoRef.current) videoRef.current.srcObject = stream;
          setStage("streaming");
          return;
        } catch {
          /* fall through to showing the error below */
        }
      }
      setError(msg);
      setStage("error");
    }
  }

  function closeCamera() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setStage("idle");
  }

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
    closeCamera();
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
      {stage === "streaming" ? (
        <video ref={videoRef} autoPlay playsInline muted className="w-full max-w-sm rounded-2xl border border-border bg-black aspect-[3/4] object-cover" />
      ) : (
        <button
          onClick={openCamera}
          disabled={stage === "requesting"}
          className="w-full max-w-sm rounded-2xl border border-dashed border-border grid place-items-center aspect-[3/4] text-muted-foreground text-xs text-center p-4 gap-2 active:scale-[0.99] disabled:opacity-60"
        >
          <Video size={28} />
          {stage === "requesting"
            ? lang === "id" ? "Meminta izin kamera…" : "Requesting camera permission…"
            : stage === "error"
              ? error
              : lang === "id" ? "Ketuk untuk buka kamera" : "Tap to open camera"}
        </button>
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
          disabled={stage !== "streaming"}
          className="flex-1 rounded-xl bg-primary text-primary-foreground py-2.5 text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-40"
        >
          <Camera size={15} /> {lang === "id" ? "Jepret" : "Capture"}
        </button>
      </div>
      <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />
    </div>
  );
}