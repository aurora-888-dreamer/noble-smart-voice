import { useState } from "react";
import { X, Check, Loader2 } from "lucide-react";
import { CameraCapture, type CapturedMedia } from "./CameraCapture";
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
  const [pending, setPending] = useState<CapturedMedia | null>(null);
  const [category, setCategory] = useState<ItemType>(presetType ?? "note");
  const [caption, setCaption] = useState("");
  const [aiBusy, setAiBusy] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  function onCaptured(media: CapturedMedia) {
    setPending(media);
    if (presetType) {
      pickCategory(presetType, media);
    } else {
      setPhase("category");
    }
  }

  function pickCategory(picked: ItemType, mediaOverride?: CapturedMedia) {
    const media = mediaOverride ?? pending;
    setCategory(picked);
    setPhase("caption");
    setCaption("");
    setAiError(null);
    // AI captioning only works on images — videos just get a manual caption.
    if (media?.kind === "image" && isPremium() && typeof navigator !== "undefined" && navigator.onLine) {
      setAiBusy(true);
      // Wrapped in an async IIFE so ANY failure — sync or async, including a
      // bad dataUrl — is guaranteed to reset aiBusy instead of leaving the
      // spinner stuck forever (which is what a synchronous throw before the
      // promise chain attaches would otherwise cause).
      (async () => {
        try {
          console.log("[Noble] Captured image dataUrl length:", media.dataUrl?.length, "prefix:", media.dataUrl?.slice(0, 30));
          const { base64, mimeType } = stripDataUrlPrefix(media.dataUrl);
          if (!base64 || base64.length < 100) {
            throw new Error(`Captured image data looks invalid (length ${base64?.length ?? 0})`);
          }
          const timeout = new Promise<never>((_, reject) => setTimeout(() => reject(new Error("AI caption timed out after 30s")), 30000));
          const res = await Promise.race([captionPhoto({ data: { imageBase64: base64, mimeType, category: picked } }), timeout]);
          if (res.ok) {
            setCaption(res.text);
          } else {
            console.error("[Noble] captionPhoto failed:", res.error);
            setAiError(res.error);
          }
        } catch (err) {
          console.error("[Noble] AI captioning threw:", err);
          setAiError(err instanceof Error ? err.message : String(err));
        } finally {
          setAiBusy(false);
        }
      })();
    }
  }

  function cancel() {
    if (pending?.kind === "video") URL.revokeObjectURL(pending.previewUrl);
    setPending(null);
    setCaption("");
    setCategory(presetType ?? "note");
    setPhase("capture");
  }

  async function save() {
    if (!pending) return;
    if (pending.kind === "video") {
      await getDb().photos.add({
        kind: "video",
        dataUrl: "",
        videoBlob: pending.blob,
        videoMimeType: pending.mimeType,
        caption: caption.trim() || undefined,
        category,
        createdAt: Date.now(),
      });
      URL.revokeObjectURL(pending.previewUrl);
    } else {
      await getDb().photos.add({
        kind: "image",
        dataUrl: pending.dataUrl,
        caption: caption.trim() || undefined,
        category,
        createdAt: Date.now(),
      });
    }
    setPending(null);
    setCaption("");
    setCategory(presetType ?? "note");
    setPhase("capture");
  }

  if (phase === "capture") {
    return <CameraCapture onCapture={onCaptured} />;
  }

  const previewSrc = pending?.kind === "video" ? pending.previewUrl : pending?.kind === "image" ? pending.dataUrl : undefined;

  if (phase === "category") {
    return (
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold">{t(lang, "recPickCategory")}</p>
          <button onClick={cancel} className="p-1.5 rounded-full hover:bg-secondary text-muted-foreground" aria-label="Cancel">
            <X size={16} />
          </button>
        </div>
        {pending?.kind === "video" ? (
          <video src={previewSrc} controls className="w-full max-w-sm rounded-2xl border border-border mb-3" />
        ) : (
          previewSrc && (
            <img
              src={previewSrc}
              alt="Captured"
              onError={() => console.error("[Noble] Category-phase preview <img> failed to load. Length:", previewSrc?.length)}
              className="w-full max-w-sm rounded-2xl border border-border mb-3"
            />
          )
        )}
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
      {pending?.kind === "video" ? (
        <video src={previewSrc} controls className="w-full max-w-sm rounded-2xl border border-border mb-3" />
      ) : (
        previewSrc && (
          <img
            src={previewSrc}
            alt="Captured"
            onError={() => console.error("[Noble] Preview <img> failed to load — dataUrl is invalid. Length:", previewSrc?.length, "First 50 chars:", previewSrc?.slice(0, 50))}
            className="w-full max-w-sm rounded-2xl border border-border mb-3"
          />
        )
      )}
      {aiBusy && (
        <p className="text-xs text-primary animate-pulse mb-2 flex items-center gap-1.5">
          <Loader2 size={12} className="animate-spin" /> {t(lang, "recAiRefining")}
        </p>
      )}
      {aiError && <p className="text-xs text-destructive mb-2">{lang === "id" ? "AI gagal: " : "AI failed: "}{aiError}</p>}
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
