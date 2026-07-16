import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Trash2 } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { getDb } from "@/lib/db";
import { useLang } from "@/lib/settings-store";
import { t } from "@/lib/i18n";

export const Route = createFileRoute("/notes")({
  head: () => ({ meta: [{ title: "Notes — VoiceTag" }] }),
  component: NotesPage,
});

function NotesPage() {
  const [lang] = useLang();
  const [q, setQ] = useState("");
  const notes = useLiveQuery(async () => {
    if (typeof window === "undefined") return [];
    return getDb().notes.orderBy("createdAt").reverse().toArray();
  }, []);

  const filtered = (notes ?? []).filter(
    (n) =>
      !q ||
      n.title.toLowerCase().includes(q.toLowerCase()) ||
      n.transcript.toLowerCase().includes(q.toLowerCase()),
  );

  return (
    <AppShell title={t(lang, "notes")}>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={t(lang, "search")}
        className="w-full rounded-full border border-border bg-card px-4 py-2.5 text-sm mb-4 outline-none focus:border-primary"
      />
      {filtered.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground py-8">{t(lang, "empty")}</p>
      ) : (
        <ul className="space-y-3">
          {filtered.map((n) => (
            <li key={n.id} className="rounded-2xl bg-card border border-border p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <p className="text-sm font-semibold">{n.title}</p>
                  <p className="text-sm text-muted-foreground mt-1">{n.transcript}</p>
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground mt-2">
                    {new Date(n.createdAt).toLocaleString()} · {n.language.toUpperCase()}
                  </p>
                </div>
                <button
                  onClick={() => n.id && getDb().notes.delete(n.id)}
                  aria-label={t(lang, "delete")}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </AppShell>
  );
}