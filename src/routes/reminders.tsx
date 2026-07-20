import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Bell, Gift, Plus, X } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { DateRangeFilter, inRange } from "@/components/DateRangeFilter";
import { SelectionBar } from "@/components/SelectionBar";
import { EditModal } from "@/components/EditModal";
import { AddFab } from "@/components/AddFab";
import { useMultiSelect } from "@/hooks/useMultiSelect";
import { getDb, nextOccurrence, type Reminder, type EventEntry } from "@/lib/db";
import { useLang } from "@/lib/settings-store";
import { t } from "@/lib/i18n";
import { sendViaBluetooth } from "@/lib/bluetooth-share";
import { shareManyEmail, shareManyWA, printMany } from "@/lib/bulk-share";

export const Route = createFileRoute("/reminders")({
  head: () => ({ meta: [{ title: "Reminders — Noble" }] }),
  component: RemindersPage,
});

function toLocalInput(ts: number) {
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function RemindersPage() {
  const [lang] = useLang();
  const [q, setQ] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [editing, setEditing] = useState<Reminder | null>(null);
  const [adding, setAdding] = useState(false);
  const sel = useMultiSelect<number>();

  const reminders = useLiveQuery(async () => {
    if (typeof window === "undefined") return [];
    return getDb().reminders.orderBy("remindAt").toArray();
  }, []);

  const eventEntries = useLiveQuery(async () => {
    if (typeof window === "undefined") return [];
    const rows = await getDb().events.toArray();
    return rows.sort((a, b) => nextOccurrence(a.eventAt, a.recurring) - nextOccurrence(b.eventAt, b.recurring));
  }, []);
  const [addingEvent, setAddingEvent] = useState(false);
  const [editingEvent, setEditingEvent] = useState<EventEntry | null>(null);

  const filtered = useMemo(() => {
    return (reminders ?? []).filter((r) => {
      if (!inRange(r.remindAt, from, to)) return false;
      if (!q) return true;
      return r.label.toLowerCase().includes(q.toLowerCase());
    });
  }, [reminders, q, from, to]);

  const visibleIds = filtered.map((n) => n.id!).filter(Boolean);
  const selectedRows = filtered.filter((n) => n.id && sel.isSelected(n.id));
  const payload = selectedRows.map((r) => ({
    title: r.label,
    body: `${new Date(r.remindAt).toLocaleString()} · ${r.status}`,
  }));

  async function bulkDelete() {
    await getDb().reminders.bulkDelete([...sel.selected]);
    sel.exit();
  }
  async function bulkDuplicate() {
    await getDb().reminders.bulkAdd(
      selectedRows.map((r) => ({
        targetType: r.targetType,
        targetId: r.targetId,
        label: `${r.label} (copy)`,
        remindAt: r.remindAt,
        status: "pending" as const,
      })),
    );
    sel.exit();
  }
  async function saveEdit(vals: Record<string, string>) {
    if (!editing?.id) return;
    await getDb().reminders.update(editing.id, {
      label: vals.label,
      remindAt: vals.remindAt ? new Date(vals.remindAt).getTime() : editing.remindAt,
    });
    setEditing(null);
    sel.exit();
  }
  async function saveNew(vals: Record<string, string>) {
    const db = getDb();
    const label = vals.label || "Reminder";
    const remindAt = vals.remindAt ? new Date(vals.remindAt).getTime() : Date.now() + 3600000;
    const noteId = await db.notes.add({
      title: label,
      transcript: label,
      language: lang,
      tags: ["reminder"],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    await db.reminders.add({
      targetType: "note",
      targetId: noteId as number,
      label,
      remindAt,
      status: "pending",
    });
    setAdding(false);
  }

  async function saveNewEvent(title: string, eventAtMs: number, recurring: "none" | "yearly") {
    await getDb().events.add({
      title: title || (lang === "id" ? "Acara" : "Event"),
      eventAt: eventAtMs,
      recurring,
      createdAt: Date.now(),
    });
    setAddingEvent(false);
  }
  async function saveEditEvent(title: string, eventAtMs: number, recurring: "none" | "yearly") {
    if (!editingEvent?.id) return;
    await getDb().events.update(editingEvent.id, { title, eventAt: eventAtMs, recurring });
    setEditingEvent(null);
  }
  async function deleteEvent(id?: number) {
    if (!id) return;
    await getDb().events.delete(id);
  }

  function daysUntil(ts: number): number {
    return Math.ceil((ts - Date.now()) / 86_400_000);
  }

  return (
    <AppShell title={t(lang, "reminders")}>
      {/* Events (birthdays, anniversaries, etc.) — a separate list from
          auto-generated reminders, but shown together on this page. */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
            <Gift size={13} /> {lang === "id" ? "Acara (Ultah, Anniversary, dll)" : "Events (Birthdays, Anniversaries, etc.)"}
          </h3>
          <button onClick={() => setAddingEvent(true)} className="text-primary" aria-label="Add event">
            <Plus size={16} />
          </button>
        </div>
        {!eventEntries || eventEntries.length === 0 ? (
          <p className="text-xs text-muted-foreground">{t(lang, "empty")}</p>
        ) : (
          <ul className="space-y-2">
            {eventEntries.map((ev) => {
              const next = nextOccurrence(ev.eventAt, ev.recurring);
              const days = daysUntil(next);
              return (
                <li
                  key={ev.id}
                  onClick={() => setEditingEvent(ev)}
                  className="rounded-2xl border border-border bg-card p-3 flex items-center gap-3 cursor-pointer"
                >
                  <Gift size={16} className="text-primary shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-medium flex items-center gap-1.5">
                      {ev.title}
                      {ev.recurring === "yearly" && (
                        <span className="text-[10px] font-semibold text-primary bg-primary/10 rounded-full px-1.5 py-0.5">
                          {lang === "id" ? "tiap tahun" : "yearly"}
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(next).toLocaleDateString()} ·{" "}
                      {days === 0
                        ? lang === "id" ? "hari ini!" : "today!"
                        : days === 1
                          ? lang === "id" ? "besok" : "tomorrow"
                          : lang === "id" ? `${days} hari lagi` : `in ${days} days`}
                    </p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteEvent(ev.id);
                    }}
                    className="text-muted-foreground p-1"
                    aria-label="Delete event"
                  >
                    <X size={14} />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5">
        <Bell size={13} /> {t(lang, "reminders")}
      </h3>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={t(lang, "search")}
        className="w-full rounded-full border border-border bg-card px-4 py-2.5 text-sm mb-2 outline-none focus:border-primary"
      />
      <DateRangeFilter from={from} to={to} onFrom={setFrom} onTo={setTo} />

      <div className="flex justify-between items-center mb-2 gap-2">
        <p className="text-xs text-muted-foreground">{filtered.length}</p>
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
        <ul className="space-y-2">
          {filtered.map((r) => {
            const selected = r.id ? sel.isSelected(r.id) : false;
            return (
              <li
                key={r.id}
                onClick={() => sel.selectMode && r.id && sel.toggle(r.id)}
                onContextMenu={(e) => { e.preventDefault(); if (!sel.selectMode && r.id) sel.enter(r.id); }}
                className={`rounded-2xl border p-3 flex items-center gap-3 transition-colors select-none ${
                  selected
                    ? "border-primary bg-primary/10"
                    : r.status === "pending"
                      ? "bg-accent/15 border-accent/40"
                      : "bg-card border-border opacity-60"
                }`}
              >
                {sel.selectMode ? (
                  <input
                    type="checkbox"
                    checked={selected}
                    onChange={() => r.id && sel.toggle(r.id)}
                    className="accent-primary"
                  />
                ) : (
                  <Bell size={16} className="text-primary" />
                )}
                <div className="flex-1">
                  <p className="text-sm font-medium">{r.label}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(r.remindAt).toLocaleString()} · {r.status}
                  </p>
                </div>
              </li>
            );
          })}
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
            const one = selectedRows[0];
            if (one) setEditing(one);
          }}
          onShareWA={() => shareManyWA(payload)}
          onShareEmail={() => shareManyEmail(payload)}
          onPrint={() => printMany(payload)}
          onBluetooth={() => void sendViaBluetooth("reminder", selectedRows)}
        />
      )}

      {editing && (
        <EditModal
          title={t(lang, "edit")}
          fields={[
            { key: "label", label: t(lang, "title"), value: editing.label },
            { key: "remindAt", label: t(lang, "when"), type: "datetime-local", value: toLocalInput(editing.remindAt) },
          ]}
          onClose={() => setEditing(null)}
          onSave={saveEdit}
        />
      )}

      {adding && (
        <EditModal
          title={t(lang, "addManually")}
          fields={[
            { key: "label", label: t(lang, "title"), value: "" },
            { key: "remindAt", label: t(lang, "when"), type: "datetime-local", value: "" },
          ]}
          onClose={() => setAdding(false)}
          onSave={saveNew}
        />
      )}

      {addingEvent && (
        <EventFormModal
          lang={lang}
          title={lang === "id" ? "Tambah Acara" : "Add Event"}
          onClose={() => setAddingEvent(false)}
          onSave={saveNewEvent}
        />
      )}

      {editingEvent && (
        <EventFormModal
          lang={lang}
          title={t(lang, "edit")}
          initialTitle={editingEvent.title}
          initialWhen={toLocalInput(editingEvent.eventAt)}
          initialRecurring={editingEvent.recurring === "yearly"}
          onClose={() => setEditingEvent(null)}
          onSave={saveEditEvent}
        />
      )}
    </AppShell>
  );
}

function EventFormModal({
  lang,
  title,
  initialTitle = "",
  initialWhen = "",
  initialRecurring = false,
  onClose,
  onSave,
}: {
  lang: "en" | "id";
  title: string;
  initialTitle?: string;
  initialWhen?: string;
  initialRecurring?: boolean;
  onClose: () => void;
  onSave: (title: string, eventAtMs: number, recurring: "none" | "yearly") => void;
}) {
  const [name, setName] = useState(initialTitle);
  const [when, setWhen] = useState(initialWhen);
  const [yearly, setYearly] = useState(initialRecurring);

  function submit() {
    const ms = when ? new Date(when).getTime() : Date.now();
    onSave(name.trim(), ms, yearly ? "yearly" : "none");
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-background/80 backdrop-blur p-4">
      <div className="w-full max-w-md rounded-2xl bg-card border border-primary/30 p-4 shadow-2xl">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold text-primary">{title}</p>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-secondary text-muted-foreground">
            <X size={16} />
          </button>
        </div>

        <label className="block text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          {lang === "id" ? "Nama acara" : "Event name"}
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
            placeholder={lang === "id" ? "mis. Ulang tahun Budi" : "e.g. Budi's birthday"}
            className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground font-normal normal-case tracking-normal"
          />
        </label>

        <label className="block text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          {lang === "id" ? "Tanggal" : "Date"}
          <input
            type="datetime-local"
            value={when}
            onChange={(e) => setWhen(e.target.value)}
            className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground font-normal normal-case tracking-normal"
          />
        </label>

        <button
          onClick={() => setYearly((y) => !y)}
          className="w-full flex items-center justify-between rounded-xl border border-border bg-background px-3 py-2.5 mb-1"
        >
          <span className="text-sm">
            {lang === "id" ? "Ingatkan tiap tahun" : "Remind every year"}
            <span className="block text-[11px] text-muted-foreground font-normal">
              {lang === "id" ? "Cocok untuk ulang tahun, anniversary, dll." : "Good for birthdays, anniversaries, etc."}
            </span>
          </span>
          <span className={`w-11 h-6 rounded-full transition-colors relative shrink-0 ${yearly ? "bg-primary" : "bg-secondary"}`}>
            <span
              className={`absolute top-0.5 w-5 h-5 rounded-full bg-background transition-transform ${yearly ? "translate-x-[22px]" : "translate-x-0.5"}`}
            />
          </span>
        </button>

        <div className="flex gap-2 mt-4">
          <button onClick={onClose} className="flex-1 py-2 rounded-full bg-secondary text-secondary-foreground text-sm font-semibold">
            {t(lang, "cancel")}
          </button>
          <button onClick={submit} className="flex-1 py-2 rounded-full bg-primary text-primary-foreground text-sm font-semibold">
            {t(lang, "save")}
          </button>
        </div>
      </div>
    </div>
  );
}
