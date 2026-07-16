import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { AppShell } from "@/components/AppShell";
import { ItemActions } from "@/components/ItemActions";
import { getDb } from "@/lib/db";
import { useLang } from "@/lib/settings-store";
import { t } from "@/lib/i18n";

export const Route = createFileRoute("/notes")({
  head: () => ({ meta: [{ title: "Notes — Noble" }] }),
  component: NotesPage,
});

function NotesPage() {
  const [lang] = useLang();
  const [q, setQ] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const notes = useLiveQuery(async () => {
    if (typeof window === "undefined") return [];
    return getDb().notes.orderBy("createdAt").reverse().toArray();
  }, []);

  const fromT = from ? new Date(from).getTime() : 0;
  const toT = to ? new Date(to).getTime() + 86_400_000 : Infinity;

  const filtered = (notes ?? []).filter((n) => {
    const inRange = n.createdAt >= fromT && n.createdAt <= toT;
    if (!inRange) return false;
    if (!q) return true;
    const s = q.toLowerCase();
    return n.title.toLowerCase().includes(s) || n.transcript.toLowerCase().includes(s);
  });

  return (
    <AppShell title={t(lang, "notes")}>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={t(lang, "search")}
        className="w-full rounded-full border border-border bg-card px-4 py-2.5 text-sm mb-2 outline-none focus:border-primary"
      />
      <div className="grid grid-cols-2 gap-2 mb-4 text-xs">
        <input
          type="date"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          className="rounded-xl border border-border bg-card px-3 py-2 text-xs"
        />
        <input
          type="date"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          className="rounded-xl border border-border bg-card px-3 py-2 text-xs"
        />
      </div>
      {filtered.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground py-8">{t(lang, "empty")}</p>
      ) : (
        <ul className="space-y-3">
          {filtered.map((n) => (
            <li key={n.id} className="rounded-2xl bg-card border border-border p-4 relative">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <p className="text-sm font-semibold">{n.title}</p>
                  <p className="text-sm text-muted-foreground mt-1">{n.transcript}</p>
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground mt-2">
                    {new Date(n.createdAt).toLocaleString()} · {n.language.toUpperCase()}
                    {n.tags?.length > 0 && ` · ${n.tags.join(", ")}`}
                  </p>
                </div>
                <ItemActions
                  title={n.title}
                  body={n.transcript}
                  onDelete={() => n.id && getDb().notes.delete(n.id)}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </AppShell>
  );
}