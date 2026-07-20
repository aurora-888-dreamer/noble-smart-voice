import { useEffect, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { X, Trash2, Play, ImageOff } from "lucide-react";
import { getDb, type Photo } from "@/lib/db";
import { useLang } from "@/lib/settings-store";
import { t } from "@/lib/i18n";

// Blobs can't be used directly as an <img>/<video> src — this creates an
// object URL for a video's Blob and revokes it on cleanup to avoid leaking
// memory as the carousel re-renders.
function useVideoUrl(blob?: Blob): string | undefined {
  const [url, setUrl] = useState<string | undefined>(undefined);
  useEffect(() => {
    if (!blob) {
      setUrl(undefined);
      return;
    }
    const objUrl = URL.createObjectURL(blob);
    setUrl(objUrl);
    return () => URL.revokeObjectURL(objUrl);
  }, [blob]);
  return url;
}

// Old test attempts (before earlier bugs were fixed) may have left corrupt
// rows in the local database — dataUrl that isn't actually a valid
// "data:image/...;base64,..." string. Never let one bad row crash the whole
// gallery; detect it up front and show a clear placeholder instead.
function isValidImageDataUrl(value: unknown): value is string {
  return typeof value === "string" && value.startsWith("data:image/") && value.includes(";base64,") && value.length > 100;
}

function Thumb({ p, onOpen, onDelete }: { p: Photo; onOpen: () => void; onDelete: () => void }) {
  const videoUrl = useVideoUrl(p.kind === "video" ? p.videoBlob : undefined);
  const isVideo = p.kind === "video";
  const validImage = !isVideo && isValidImageDataUrl(p.dataUrl);

  if (!isVideo && !validImage) {
    console.warn("[Noble] Corrupt photo record in gallery (id:", p.id, ") — dataUrl is invalid:", typeof p.dataUrl, String(p.dataUrl).slice(0, 40));
    return (
      <div className="shrink-0 w-20 h-20 rounded-xl overflow-hidden border border-destructive/40 bg-destructive/10 relative flex flex-col items-center justify-center gap-1">
        <ImageOff size={18} className="text-destructive" />
        <button onClick={onDelete} aria-label="Delete corrupt photo" className="absolute top-1 right-1 p-0.5 rounded-full bg-background/80">
          <Trash2 size={11} className="text-destructive" />
        </button>
      </div>
    );
  }

  return (
    <button onClick={onOpen} className="shrink-0 w-20 h-20 rounded-xl overflow-hidden border border-border relative">
      {isVideo ? (
        <>
          {videoUrl && <video src={videoUrl} className="w-full h-full object-cover" muted />}
          <span className="absolute inset-0 grid place-items-center bg-black/25">
            <Play size={20} className="text-white" fill="white" />
          </span>
        </>
      ) : (
        <img src={p.dataUrl} alt={p.caption ?? "photo"} className="w-full h-full object-cover" />
      )}
    </button>
  );
}

export function PhotoCarousel() {
  const [lang] = useLang();
  const [viewing, setViewing] = useState<number | null>(null);
  const photos = useLiveQuery(async () => {
    if (typeof window === "undefined") return [];
    return getDb().photos.orderBy("createdAt").reverse().toArray();
  }, []);

  async function remove(id?: number) {
    if (!id) return;
    await getDb().photos.delete(id);
    setViewing(null);
  }

  if (!photos || photos.length === 0) {
    return <p className="text-xs text-muted-foreground text-center py-4">{t(lang, "empty")}</p>;
  }

  const corruptIds = photos.filter((p) => p.kind !== "video" && !isValidImageDataUrl(p.dataUrl)).map((p) => p.id).filter((id): id is number => id != null);

  async function cleanupCorrupt() {
    await getDb().photos.bulkDelete(corruptIds);
  }

  const active = photos.find((p) => p.id === viewing);

  return (
    <>
      {corruptIds.length > 0 && (
        <button
          onClick={cleanupCorrupt}
          className="mb-2 text-[11px] text-destructive underline"
        >
          {lang === "id"
            ? `Hapus ${corruptIds.length} foto lama yang rusak`
            : `Delete ${corruptIds.length} corrupt old photo${corruptIds.length > 1 ? "s" : ""}`}
        </button>
      )}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        {photos.map((p) => (
          <Thumb key={p.id} p={p} onOpen={() => setViewing(p.id ?? null)} onDelete={() => remove(p.id)} />
        ))}
      </div>

      {active && <ActiveViewer photo={active} onClose={() => setViewing(null)} onDelete={() => remove(active.id)} lang={lang} />}
    </>
  );
}

function ActiveViewer({
  photo,
  onClose,
  onDelete,
  lang,
}: {
  photo: Photo;
  onClose: () => void;
  onDelete: () => void;
  lang: "en" | "id";
}) {
  const videoUrl = useVideoUrl(photo.kind === "video" ? photo.videoBlob : undefined);
  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur grid place-items-center p-4" onClick={onClose}>
      <div className="max-w-lg w-full" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center gap-2 mb-2">
          {photo.category ? (
            <span className="rounded-full bg-primary/10 text-primary text-[11px] font-semibold px-2.5 py-1">
              {t(lang, photo.category)}
            </span>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <button onClick={onDelete} className="p-2 rounded-full bg-destructive/15 text-destructive">
              <Trash2 size={16} />
            </button>
            <button onClick={onClose} className="p-2 rounded-full bg-secondary text-secondary-foreground">
              <X size={16} />
            </button>
          </div>
        </div>
        {photo.kind === "video" ? (
          videoUrl && <video src={videoUrl} controls autoPlay className="w-full rounded-2xl" />
        ) : (
          <img src={photo.dataUrl} alt={photo.caption ?? "photo"} className="w-full rounded-2xl" />
        )}
        {photo.caption && <p className="text-sm text-muted-foreground mt-2">{photo.caption}</p>}
      </div>
    </div>
  );
}
