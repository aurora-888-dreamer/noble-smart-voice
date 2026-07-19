import { useEffect, useRef, useState } from "react";
import { Camera, Upload, RotateCcw, Check, Video } from "lucide-react";
import { useLang } from "@/lib/settings-store";

export type CapturedMedia =
  | { kind: "image"; dataUrl: string }
  | { kind: "video"; blob: Blob; mimeType: string; previewUrl: string };

function isMobileDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}

// Mobile: two plain file inputs — "Unggah" opens the gallery/file picker
// (photos AND videos), "Jepret" has capture="environment" which tells
// mobile browsers to open the native camera app for a photo. This is the
// mechanism that already worked reliably on real phone hardware.
//
// Desktop: capture="environment" is simply ignored by desktop browsers —
// there's no "native camera app" to hand off to, so it would just open the
// same file picker as Upload (confusing). Desktop handles multiple
// simultaneous media streams fine (unlike the mic-contention issues we hit
// on mobile), so "Jepret" instead opens a real live webcam preview here.
export function CameraCapture({ onCapture }: { onCapture: (media: CapturedMedia) => void }) {
  const [lang] = useLang();
  const [mobile, setMobile] = useState(true);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMobile(isMobileDevice());
  }, []);

  function handleGalleryFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type.startsWith("video/")) {
      onCapture({ kind: "video", blob: file, mimeType: file.type, previewUrl: URL.createObjectURL(file) });
    } else {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === "string") onCapture({ kind: "image", dataUrl: reader.result });
      };
      reader.readAsDataURL(file);
    }
    e.target.value = "";
  }

  function handleCameraFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") onCapture({ kind: "image", dataUrl: reader.result });
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  const [webcamOpen, setWebcamOpen] = useState(false);

  if (webcamOpen) {
    return <WebcamCapture lang={lang} onCapture={onCapture} onClose={() => setWebcamOpen(false)} />;
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex gap-3 w-full max-w-sm">
        <button
          onClick={() => galleryInputRef.current?.click()}
          className="flex-1 rounded-xl border border-border py-2.5 text-sm font-semibold flex items-center justify-center gap-2"
        >
          <Upload size={15} /> {lang === "id" ? "Unggah" : "Upload"}
        </button>
        <button
          onClick={() => (mobile ? cameraInputRef.current?.click() : setWebcamOpen(true))}
          className="flex-1 rounded-xl bg-primary text-primary-foreground py-2.5 text-sm font-semibold flex items-center justify-center gap-2"
        >
          <Camera size={15} /> {lang === "id" ? "Jepret" : "Capture"}
        </button>
      </div>
      <p className="text-[11px] text-muted-foreground text-center">
        {mobile
          ? lang === "id"
            ? "Unggah menerima foto & video. Jepret khusus foto (buka kamera HP)."
            : "Upload accepts photos & videos. Capture is photo-only (opens your phone's camera)."
          : lang === "id"
            ? "Unggah menerima foto & video. Jepret buka webcam laptop."
            : "Upload accepts photos & videos. Capture opens your laptop's webcam."}
      </p>
      {/* Gallery picker — accepts photos and videos, no capture attribute */}
      <input ref={galleryInputRef} type="file" accept="image/*,video/*" onChange={handleGalleryFile} className="hidden" />
      {/* Mobile only: native camera app for a photo */}
      <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" onChange={handleCameraFile} className="hidden" />
    </div>
  );
}

function WebcamCapture({
  lang,
  onCapture,
  onClose,
}: {
  lang: "en" | "id";
  onCapture: (media: CapturedMedia) => void;
  onClose: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [stage, setStage] = useState<"requesting" | "streaming" | "error">("requesting");
  const [error, setError] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    navigator.mediaDevices
      .getUserMedia({ video: true })
      .then((stream) => {
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        setStage("streaming");
      })
      .catch((err: DOMException) => {
        console.error("[Noble] Webcam getUserMedia failed:", err?.name, err?.message);
        setError(
          err?.name === "NotAllowedError"
            ? lang === "id"
              ? "Izin webcam ditolak. Cek izin kamera untuk browser ini di pengaturan sistem."
              : "Webcam permission denied. Check this browser's camera permission in your system settings."
            : lang === "id"
              ? "Webcam tidak tersedia."
              : "Webcam unavailable.",
        );
        setStage("error");
      });
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, [lang]);

  useEffect(() => {
    if (stage === "streaming" && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
    }
  }, [stage]);

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

  function confirm() {
    if (snapshot) onCapture({ kind: "image", dataUrl: snapshot });
    onClose();
  }

  if (snapshot) {
    return (
      <div className="flex flex-col items-center gap-3">
        <img src={snapshot} alt="Snapshot" className="w-full max-w-sm rounded-2xl border border-border" />
        <div className="flex gap-3 w-full max-w-sm">
          <button onClick={() => setSnapshot(null)} className="flex-1 rounded-xl border border-border py-2.5 text-sm font-semibold flex items-center justify-center gap-2">
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
        <video ref={videoRef} autoPlay playsInline muted className="w-full max-w-sm rounded-2xl border border-border bg-black aspect-video object-cover" />
      ) : (
        <div className="w-full max-w-sm rounded-2xl border border-dashed border-border grid place-items-center aspect-video text-muted-foreground text-xs text-center p-4 gap-2">
          <Video size={28} />
          {stage === "error" ? error : lang === "id" ? "Menyiapkan webcam…" : "Setting up webcam…"}
        </div>
      )}
      <div className="flex gap-3 w-full max-w-sm">
        <button onClick={onClose} className="flex-1 rounded-xl border border-border py-2.5 text-sm font-semibold">
          {lang === "id" ? "Batal" : "Cancel"}
        </button>
        <button
          onClick={takeSnapshot}
          disabled={stage !== "streaming"}
          className="flex-1 rounded-xl bg-primary text-primary-foreground py-2.5 text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-40"
        >
          <Camera size={15} /> {lang === "id" ? "Jepret" : "Capture"}
        </button>
      </div>
    </div>
  );
}
