import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import {
  ArrowLeft,
  Download,
  Loader2,
  Mail,
  RotateCcw,
  Search,
  Send,
  Trash2,
} from "lucide-react";
import {
  deleteHistoryEntry,
  listHistory,
  RECALL_STORAGE_KEY,
  type HistoryEntry,
} from "@/lib/history-store";
import { dataUrlToFile, sendViaChannel } from "@/lib/share";

export const Route = createFileRoute("/history")({
  head: () => ({
    meta: [
      { title: "History — Magic Talk" },
      { name: "description", content: "Your last 100 saved Magic Talk memos on this device." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: HistoryPage,
});

function filesFromEntry(entry: HistoryEntry): File[] {
  return entry.attachments
    .map((a, i) => {
      const ext = (a.dataUrl.match(/^data:image\/(\w+);/)?.[1] ?? "jpg").replace("jpeg", "jpg");
      const base = `${entry.docNo || "magictalk"}-${String(i + 1).padStart(2, "0")}`;
      return dataUrlToFile(a.dataUrl, a.fileName ?? `${base}.${ext}`);
    })
    .filter((f): f is File => f !== null);
}

function HistoryPage() {
  const router = useRouter();
  const [entries, setEntries] = useState<HistoryEntry[] | null>(null);
  const [search, setSearch] = useState("");

  async function refresh() {
    try {
      setEntries(await listHistory());
    } catch {
      toast.error("Could not read History on this device.");
      setEntries([]);
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  const filtered = useMemo(() => {
    if (!entries) return [];
    const q = search.trim().toLowerCase();
    if (!q) return entries;
    return entries.filter((e) =>
      [e.subject, e.transcript, e.attn, e.from, e.docNo].some((f) => f.toLowerCase().includes(q)),
    );
  }, [entries, search]);

  function recall(entry: HistoryEntry) {
    sessionStorage.setItem(RECALL_STORAGE_KEY, JSON.stringify(entry));
    void router.navigate({ to: "/" });
  }

  async function resend(entry: HistoryEntry, channel: "whatsapp" | "email" | "other") {
    const files = filesFromEntry(entry);
    await sendViaChannel(channel, `Memo ${entry.docNo}`, entry.plainText, files, (msg) => toast.success(msg));
  }

  async function remove(id: string) {
    try {
      await deleteHistoryEntry(id);
      setEntries((prev) => (prev ? prev.filter((e) => e.id !== id) : prev));
      toast.success("Deleted from History.");
    } catch {
      toast.error("Could not delete that entry.");
    }
  }

  function backup() {
    if (!entries?.length) {
      toast.error("Nothing to back up yet.");
      return;
    }
    const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), entries }, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `magictalk-history-backup-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("History backup downloaded.");
  }

  const label = "text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground";
  const field =
    "mt-1 w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-ring/25";

  return (
    <main className="min-h-screen bg-background pb-16">
      <Toaster position="top-center" />
      <header className="border-b border-border bg-card/70 px-5 py-5">
        <div className="flex items-center justify-between gap-3">
          <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground">
            <ArrowLeft className="size-4" /> Back to Magic Talk
          </Link>
          <button
            onClick={backup}
            className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-xs font-medium"
          >
            <Download className="size-4" /> Backup
          </button>
        </div>
        <h1 className="mt-2 text-3xl leading-none text-foreground">History</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Your last {entries?.length ?? "…"} saved memos on this device (up to 100, oldest drop off first).
        </p>
      </header>

      <div className="mx-auto max-w-2xl space-y-3 px-4 py-6">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search subject, transcript, name…"
            className={`${field} pl-9`}
          />
        </div>

        {entries === null && (
          <p className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Loading…
          </p>
        )}

        {entries !== null && !filtered.length && (
          <p className="py-10 text-center text-sm text-muted-foreground">
            {entries.length ? "No memos match your search." : "No saved memos yet — use Save on the homepage."}
          </p>
        )}

        {filtered.map((entry) => (
          <div key={entry.id} className="rounded-xl border border-border bg-card p-3 shadow-sm">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-foreground">
                  {entry.subject || "(No subject)"}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {new Date(entry.savedAt).toLocaleString()} · {entry.docNo}
                  {entry.attachments.length ? ` · ${entry.attachments.length} attachment${entry.attachments.length > 1 ? "s" : ""}` : ""}
                </p>
              </div>
              <button
                aria-label="Delete from History"
                onClick={() => void remove(entry.id)}
                className="shrink-0 text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
            {entry.transcript && (
              <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{entry.transcript}</p>
            )}

            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                onClick={() => recall(entry)}
                className="inline-flex items-center justify-center gap-2 rounded-md border border-border px-2 py-2 text-xs font-medium"
              >
                <RotateCcw className="size-3.5" /> Recall
              </button>
              <div className="grid grid-cols-3 gap-1">
                <button
                  onClick={() => void resend(entry, "whatsapp")}
                  aria-label="Resend via WhatsApp"
                  title="Resend via WhatsApp"
                  className="inline-flex items-center justify-center rounded-md border border-border px-2 py-2 text-xs font-medium"
                >
                  <Send className="size-3.5" />
                </button>
                <button
                  onClick={() => void resend(entry, "email")}
                  aria-label="Resend via Email"
                  title="Resend via Email"
                  className="inline-flex items-center justify-center rounded-md border border-border px-2 py-2 text-xs font-medium"
                >
                  <Mail className="size-3.5" />
                </button>
                <button
                  onClick={() => void resend(entry, "other")}
                  aria-label="Resend via other app"
                  title="Resend via other app"
                  className="inline-flex items-center justify-center rounded-md border border-border px-2 py-2 text-xs font-medium"
                >
                  <Send className="size-3.5 rotate-45" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
