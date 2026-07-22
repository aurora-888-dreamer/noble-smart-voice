import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { AppShell } from "@/components/AppShell";
import { DateRangeFilter, inRange } from "@/components/DateRangeFilter";
import { SelectionBar, type MoveTarget } from "@/components/SelectionBar";
import { EditModal } from "@/components/EditModal";
import { AddFab } from "@/components/AddFab";
import { useMultiSelect } from "@/hooks/useMultiSelect";
import { useLongPress } from "@/hooks/useLongPress";
import { getDb, type Note } from "@/lib/db";
import { useLang } from "@/lib/settings-store";
import { t } from "@/lib/i18n";
import { sendViaBluetooth } from "@/lib/bluetooth-share";
import { shareManyEmail, shareManyWA, printMany } from "@/lib/bulk-share";
import { usePlugin } from "@/lib/plugins-store";
import { TranslateInline } from "@/components/TranslateInline";
import { ItemActions } from "@/components/ItemActions";

export const Route = createFileRoute("/notes")({
  head: () => ({ meta: [{ title: "Notes — Noble" }] }),
  component: NotesPage,
});

function NotesPage() {
  const [lang] = useLang();
  const hasTranslator = usePlugin("translator");
  const [q, setQ] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [editing, setEditing] = useState<Note | null>(null);
  const [adding, setAdding] = useState(false);
  const sel = useMultiSelect<number>();

  const notes = useLiveQuery(async () => {
    if (typeof window === "undefined") return [];
    return getDb().notes.orderBy("createdAt").reverse().toArray();
  }, []);

  const filtered = useMemo(() => {
    return (notes ?? []).filter((n) => {
      if (!inRange(n.createdAt, from, to)) return false;
      if (!q) return true;
      const s = q.toLowerCase();
      return n.title.toLowerCase().includes(s) || n.transcript.toLowerCase().includes(s);
    });
  }, [notes, q, from, to]);

  const visibleIds = filtered.map((n) => n.id!).filter(Boolean);
  const selectedNotes = filtered.filter((n) => n.id && sel.isSelected(n.id));
  const payload = selectedNotes.map((n) => ({ title: n.title, body: n.transcript }));

  async function bulkDelete() {
    await getDb().notes.bulkDelete([...sel.selected]);
    sel.exit();
  }
  async function bulkDuplicate() {
    const now = Date.now();
    await getDb().notes.bulkAdd(
      selectedNotes.map((n) => ({
        title: `${n.title} (copy)`,
        transcript: n.transcript,
        language: n.language,
        tags: n.tags,
        createdAt: now,
        updatedAt: now,
      })),
    );
    sel.exit();
  }
  async function bulkMove(tgt: MoveTarget) {
    const db = getDb();
    const now = Date.now();
    if (tgt === "task") {
      await db.tasks.bulkAdd(
        selectedNotes.map((n) => ({
          title: n.title,
          description: n.transcript,
          priority: "med" as const,
          status: "open" as const,
          createdAt: now,
        })),
      );
    } else if (tgt === "meeting") {
      await db.meetings.bulkAdd(
        selectedNotes.map((n) => ({
          title: n.title,
          summary: n.transcript,
          attendees: [],
          actionItems: [],
          createdAt: now,
        })),
      );
    } else if (tgt === "message") {
      await db.messages.bulkAdd(
        selectedNotes.map((n) => ({
          content: `${n.title}\n${n.transcript}`,
          status: "draft" as const,
          createdAt: now,
        })),
      );
    } else if (tgt === "appointment") {
      await db.appointments.bulkAdd(
        selectedNotes.map((n) => ({
          title: n.title,
          appointmentAt: now,
          notes: n.transcript,
        })),
      );
    }
    await db.notes.bulkDelete([...sel.selected]);
    sel.exit();
  }

  async function saveEdit(vals: Record<string, string>) {
    if (!editing?.id) return;
    await getDb().notes.update(editing.id, {
      title: vals.title,
      transcript: vals.transcript,
      updatedAt: Date.now(),
    });
    setEditing(null);
    sel.exit();
  }
  async function saveNew(vals: Record<string, string>) {
    const now = Date.now();
    await getDb().notes.add({
      title: vals.title || "Untitled",
      transcript: vals.transcript || "",
      language: lang,
      tags: [],
      createdAt: now,
      updatedAt: now,
    });
    setAdding(false);
  }

  return (
    <AppShell title={t(lang, "notes")}>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={t(lang, "search")}
        className="w-full rounded-full border border-border bg-card px-4 py-2.5 text-sm mb-2 outline-none focus:border-primary"
      />
      <DateRangeFilter from={from} to={to} onFrom={setFrom} onTo={setTo} />

      <div className="flex justify-between items-center mb-2 gap-2">
        <p className="text-xs text-muted-foreground">{filtered.length} {t(lang, "notes").toLowerCase()}</p>
        <div className="flex items-center gap-2">
          {!sel.selectMode && filtered.length > 0 && (
            <button onClick={() => sel.enter()} className="text-xs font-semibold text-primary">
              {t(lang, "select")}
            </button>
          )}
          {!sel.selectMode && <AddFab onClick={() => setAdding(true)} />}
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground py-8">{t(lang, "empty")}</p>
      ) : (
        <ul className="space-y-3">
          {filtered.map((n) => (
            <NoteRow
              key={n.id}
              n={n}
              selectMode={sel.selectMode}
              selected={n.id ? sel.isSelected(n.id) : false}
              onToggle={() => n.id && sel.toggle(n.id)}
              onLongPress={() => n.id && !sel.selectMode && sel.enter(n.id)}
              hasTranslator={hasTranslator}
              onEdit={() => setEditing(n)}
              onDelete={async () => { if (n.id) await getDb().notes.delete(n.id); }}
            />
          ))}
        </ul>
      )}

      {sel.selectMode && (
        <SelectionBar
          count={sel.count}
          totalVisible={filtered.length}
          onSelectAll={() => sel.selectAll(visibleIds)}
          onCancel={sel.exit}
          onDelete={bulkDelete}
          onDuplicate={bulkDuplicate}
          onEdit={() => {
            const one = selectedNotes[0];
            if (one) setEditing(one);
          }}
          onMove={bulkMove}
          moveTargets={["task", "meeting", "appointment", "message"]}
          onShareWA={() => shareManyWA(payload)}
          onShareEmail={() => shareManyEmail(payload)}
          onPrint={() => printMany(payload)}
          onBluetooth={() => void sendViaBluetooth("note", selectedNotes)}
        />
      )}

      {editing && (
        <EditModal
          title={t(lang, "edit")}
          fields={[
            { key: "title", label: t(lang, "title"), value: editing.title },
            { key: "transcript", label: t(lang, "content"), type: "textarea", value: editing.transcript },
          ]}
          onClose={() => setEditing(null)}
          onSave={saveEdit}
        />
      )}

      {adding && (
        <EditModal
          title={t(lang, "addManually")}
          fields={[
            { key: "title", label: t(lang, "title"), value: "" },
            { key: "transcript", label: t(lang, "content"), type: "textarea", value: "" },
          ]}
          onClose={() => setAdding(false)}
          onSave={saveNew}
        />
      )}
    </AppShell>
  );
}

function NoteRow({
  n,
  selectMode,
  selected,
  onToggle,
  onLongPress,
  hasTranslator,
}: {
  n: Note;
  selectMode: boolean;
  selected: boolean;
  onToggle: () => void;
  onLongPress: () => void;
  hasTranslator: boolean;
}) {
  const lp = useLongPress(onLongPress);
  return (
    <li
      {...lp}
      onClick={() => selectMode && onToggle()}
      className={`rounded-2xl border p-4 transition-colors select-none ${
        selected ? "border-primary bg-primary/10" : "bg-card border-border"
      }`}
    >
      <div className="flex items-start gap-2">
        {selectMode && (
          <input
            type="checkbox"
            checked={selected}
            onChange={onToggle}
            className="mt-1 accent-primary"
          />
        )}
        <div className="flex-1">
          <p className="text-sm font-semibold">{n.title}</p>
          <p className="text-sm text-muted-foreground mt-1">{n.transcript}</p>
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground mt-2">
            {new Date(n.createdAt).toLocaleString()} · {n.language.toUpperCase()}
            {n.tags?.length > 0 && ` · ${n.tags.join(", ")}`}
          </p>
          {hasTranslator && !selectMode && <TranslateInline text={n.transcript} />}
        </div>
      </div>
    </li>
  );
}
