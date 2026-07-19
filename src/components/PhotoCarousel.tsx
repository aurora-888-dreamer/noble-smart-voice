import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { X, Trash2 } from "lucide-react";
import { getDb } from "@/lib/db";
import { useLang } from "@/lib/settings-store";
import { t } from "@/lib/i18n";

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

  const active = photos.find((p) => p.id === viewing);

  return (
    <>
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        {photos.map((p) => (
          <button
            key={p.id}
            onClick={() => setViewing(p.id ?? null)}
            className="shrink-0 w-20 h-20 rounded-xl overflow-hidden border border-border"
          >
            <img src={p.dataUrl} alt={p.caption ?? "photo"} className="w-full h-full object-cover" />
          </button>
        ))}
      </div>

      {active && (
        <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur grid place-items-center p-4" onClick={() => setViewing(null)}>
          <div className="max-w-lg w-full" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center gap-2 mb-2">
              {active.category ? (
                <span className="rounded-full bg-primary/10 text-primary text-[11px] font-semibold px-2.5 py-1">
                  {t(lang, active.category)}
                </span>
              ) : (
                <span />
              )}
              <div className="flex gap-2">
                <button onClick={() => remove(active.id)} className="p-2 rounded-full bg-destructive/15 text-destructive">
                  <Trash2 size={16} />
                </button>
                <button onClick={() => setViewing(null)} className="p-2 rounded-full bg-secondary text-secondary-foreground">
                  <X size={16} />
                </button>
              </div>
            </div>
            <img src={active.dataUrl} alt={active.caption ?? "photo"} className="w-full rounded-2xl" />
            {active.caption && <p className="text-sm text-muted-foreground mt-2">{active.caption}</p>}
          </div>
        </div>
      )}
    </>
  );
}
