import { useState } from "react";
import { X, Check, Loader2 } from "lucide-react";
import { CameraCapture } from "./CameraCapture";
import { getDb, type ItemType } from "@/lib/db";
import { useLang } from "@/lib/settings-store";
import { t } from "@/lib/i18n";
import { isPremium } from "@/lib/auth-store";
import { captionPhoto } from "@/lib/ai.functions";

const TYPES: ItemType[] = ["note", "diary", "task", "meeting", "appointment", "trip", "project", "message", "contact"];

type Phase = "capture" | "category" | "caption";

function stripDataUrlPrefix(dataUrl: string): { base64: string; mimeType: string } {
  const match = dataUrl.match(/^data:([^;]+);base64,(.*)$/s);
  return match ? { mimeType: match[1], base64: match[2] } : { mimeType: "image/jpeg", base64: dataUrl };
}

export function PhotoCaptureFlow({ presetType }: { presetType?: ItemType } = {}) {
  const [lang] = useLang();
  const [phase, setPhase] = useState<Phase>("capture");
  const [pendingImage, setPendingImage] = useState<string | null>(null);
  const [category, setCategory] = useState<ItemType>(presetType ?? "note");
  const [caption, setCaption] = useState("");
  const [aiBusy, setAiBusy] = useState(false);

  function onCaptured(dataUrl: string) {
    setPendingImage(dataUrl);
    if (presetType) {
      pickCategory(presetType, dataUrl);
    } else {
      setPhase("category");
    }
  }

  function pickCategory(picked: ItemType, imageOverride?: string) {
    const image = imageOverride ?? pendingImage;
    setCategory(picked);
    setPhase("caption");
    setCaption("");
    if (isPremium() && image && typeof navigator !== "undefined" && navigator.onLine) {
      setAiBusy(true);
      const { base64, mimeType } = stripDataUrlPrefix(image);
      captionPhoto({ data: { imageBase64: base64, mimeType, category: picked } })
        .then((res) => {
          if (res.ok) setCaption(res.text);
        })
        .catch(() => {})
        .finally(() => setAiBusy(false));
    }
  }

  function cancel() {
    setPendingImage(null);
    setCaption("");
    setCategory(presetType ?? "note");
    setPhase("capture");
  }

  async function save() {
    if (!pendingImage) return;
    await getDb().photos.add({
      dataUrl: pendingImage,
      caption: caption.trim() || undefined,
      category,
      createdAt: Date.now(),
    });
    cancel();
  }

  if (phase === "capture") {
    return <CameraCapture onCapture={onCaptured} />;
  }

  if (phase === "category") {
    return (
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold">{t(lang, "recPickCategory")}</p>
          <button onClick={cancel} className="p-1.5 rounded-full hover:bg-secondary text-muted-foreground" aria-label="Cancel">
            <X size={16} />
          </button>
        </div>
        {pendingImage && <img src={pendingImage} alt="Captured" className="w-full max-w-sm rounded-2xl border border-border mb-3" />}
        <div className="grid grid-cols-3 gap-2">
          {TYPES.map((tp) => (
            <button
              key={tp}
              onClick={() => pickCategory(tp)}
              className="rounded-xl border border-border bg-card px-2 py-2.5 text-xs font-semibold active:scale-[0.97]"
            >
              {t(lang, tp)}
            </button>
          ))}
        </div>
      </div>
    );
  }

  // ---- Phase: caption ----
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-semibold">{t(lang, category)}</p>
        <button onClick={cancel} className="p-1.5 rounded-full hover:bg-secondary text-muted-foreground" aria-label="Cancel">
          <X size={16} />
        </button>
      </div>
      {pendingImage && <img src={pendingImage} alt="Captured" className="w-full max-w-sm rounded-2xl border border-border mb-3" />}
      {aiBusy && (
        <p className="text-xs text-primary animate-pulse mb-2 flex items-center gap-1.5">
          <Loader2 size={12} className="animate-spin" /> {t(lang, "recAiRefining")}
        </p>
      )}
      <label className="text-xs text-muted-foreground mb-1 block">
        {lang === "id" ? "Keterangan (caption)" : "Caption"}
      </label>
      <textarea
        value={caption}
        onChange={(e) => setCaption(e.target.value)}
        rows={3}
        placeholder={lang === "id" ? "Tulis keterangan…" : "Write a caption…"}
        className="w-full rounded-xl bg-secondary text-secondary-foreground px-3 py-2 text-sm resize-none mb-3"
      />
      <div className="flex gap-2">
        <button onClick={cancel} className="flex-1 rounded-xl border border-border py-2.5 text-sm font-semibold">
          {t(lang, "recDiscard")}
        </button>
        <button onClick={save} className="flex-1 rounded-xl bg-primary text-primary-foreground py-2.5 text-sm font-semibold flex items-center justify-center gap-2">
          <Check size={15} /> {t(lang, "recSave")}
        </button>
      </div>
    </div>
  );
}
