import { useRef } from "react";
import { Camera, Upload } from "lucide-react";
import { useLang } from "@/lib/settings-store";

// Two plain file inputs, no live getUserMedia preview: one opens the
// gallery/file picker ("Unggah"), the other has capture="environment"
// which tells mobile browsers to open the native camera app directly
// ("Jepret") — this is the same mechanism that already worked reliably on
// your device, so there's no custom in-browser camera preview to fight
// with anymore.
export function CameraCapture({ onCapture }: { onCapture: (dataUrl: string) => void }) {
  const [lang] = useLang();
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

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
          onClick={() => cameraInputRef.current?.click()}
          className="flex-1 rounded-xl bg-primary text-primary-foreground py-2.5 text-sm font-semibold flex items-center justify-center gap-2"
        >
          <Camera size={15} /> {lang === "id" ? "Jepret" : "Capture"}
        </button>
      </div>
      {/* Gallery picker — no capture attribute */}
      <input ref={galleryInputRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />
      {/* Native camera app — capture attribute forces it open directly */}
      <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" onChange={handleFile} className="hidden" />
    </div>
  );
}