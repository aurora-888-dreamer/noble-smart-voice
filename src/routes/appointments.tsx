import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { MapPin, Bell } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { DateRangeFilter, inRange } from "@/components/DateRangeFilter";
import { SelectionBar, type MoveTarget } from "@/components/SelectionBar";
import { EditModal } from "@/components/EditModal";
import { AddFab } from "@/components/AddFab";
import { useMultiSelect } from "@/hooks/useMultiSelect";
import { getDb, type Appointment } from "@/lib/db";
import { useLang } from "@/lib/settings-store";
import { t } from "@/lib/i18n";
import { sendViaBluetooth } from "@/lib/bluetooth-share";
import { shareManyEmail, shareManyWA, printMany } from "@/lib/bulk-share";

export const Route = createFileRoute("/appointments")({
  head: () => ({ meta: [{ title: "Appointments — Noble" }] }),
  component: AppointmentsPage,
});

function toLocalInput(ts?: number) {
  if (!ts) return "";
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function AppointmentsPage() {
  const [lang] = useLang();
  const [q, setQ] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [editing, setEditing] = useState<Appointment | null>(null);
  const [adding, setAdding] = useState(false);
  const sel = useMultiSelect<number>();

  const items = useLiveQuery(async () => {
    if (typeof window === "undefined") return [];
    return getDb().appointments.orderBy("appointmentAt").toArray();
  }, []);

  const filtered = useMemo(() => {
    return (items ?? []).filter((a) => {
      if (!inRange(a.appointmentAt, from, to)) return false;
      if (!q) return true;
      const s = q.toLowerCase();
      return a.title.toLowerCase().includes(s) || (a.notes ?? "").toLowerCase().includes(s);
    });
  }, [items, q, from, to]);

  const visibleIds = filtered.map((n) => n.id!).filter(Boolean);
  const selectedRows = filtered.filter((n) => n.id && sel.isSelected(n.id));
  const payload = selectedRows.map((r) => ({
    title: r.title,
    body: `${new Date(r.appointmentAt).toLocaleString()}\n${r.location ?? ""}\n${r.notes ?? ""}`,
  }));

  async function bulkDelete() {
    await getDb().appointments.bulkDelete([...sel.selected]);
    sel.exit();
  }
  async function bulkDuplicate() {
    await getDb().appointments.bulkAdd(
      selectedRows.map((r) => ({
        title: `${r.title} (copy)`,
        appointmentAt: r.appointmentAt,
        location: r.location,
        reminderAt: r.reminderAt,
        notes: r.notes,
      })),
    );
    sel.exit();
  }
  async function bulkMove(tgt: MoveTarget) {
    const db = getDb();
    const now = Date.now();
    if (tgt === "task") {
      await db.tasks.bulkAdd(
        selectedRows.map((r) => ({
          title: r.title,
          description: r.notes,
          dueAt: r.appointmentAt,
          priority: "med" as const,
          status: "open" as const,
          createdAt: now,
        })),
      );
    } else if (tgt === "meeting") {
      await db.meetings.bulkAdd(
        selectedRows.map((r) => ({
          title: r.title,
          summary: r.notes ?? "",
          attendees: [],
          actionItems: [],
          meetingAt: r.appointmentAt,
          createdAt: now,
        })),
      );
    } else if (tgt === "note") {
      await db.notes.bulkAdd(
        selectedRows.map((r) => ({
          title: r.title,
          transcript: `${new Date(r.appointmentAt).toLocaleString()}\n${r.notes ?? ""}`,
          language: "en" as const,
          tags: ["appointment"],
          createdAt: now,
          updatedAt: now,
        })),
      );
    } else if (tgt === "message") {
      await db.messages.bulkAdd(
        selectedRows.map((r) => ({
          content: `${r.title} — ${new Date(r.appointmentAt).toLocaleString()}`,
          status: "draft" as const,
          createdAt: now,
        })),
      );
    }
    await db.appointments.bulkDelete([...sel.selected]);
    sel.exit();
  }

  async function saveEdit(vals: Record<string, string>) {
    if (!editing?.id) return;
    await getDb().appointments.update(editing.id, {
      title: vals.title,
      appointmentAt: vals.appointmentAt ? new Date(vals.appointmentAt).getTime() : editing.appointmentAt,
      location: vals.location || undefined,
      notes: vals.notes || undefined,
    });
    setEditing(null);
    sel.exit();
  }

  return (
    <AppShell title={t(lang, "appointments")}>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={t(lang, "search")}
        className="w-full rounded-full border border-border bg-card px-4 py-2.5 text-sm mb-2 outline-none focus:border-primary"
      />
      <DateRangeFilter from={from} to={to} onFrom={setFrom} onTo={setTo} />

      <div className="flex justify-between items-center mb-2">
        <p className="text-xs text-muted-foreground">{filtered.length}</p>
        {!sel.selectMode && filtered.length > 0 && (
          <button onClick={() => sel.enter()} className="text-xs font-semibold text-primary">
            {t(lang, "select")}
          </button>
        )}
      </div>

      {filtered.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground py-8">{t(lang, "empty")}</p>
      ) : (
        <ul className="space-y-3">
          {filtered.map((a) => {
            const selected = a.id ? sel.isSelected(a.id) : false;
            return (
              <li
                key={a.id}
                onClick={() => sel.selectMode && a.id && sel.toggle(a.id)}
                className={`rounded-2xl border p-4 transition-colors ${
                  selected ? "border-primary bg-primary/10" : "bg-card border-border"
                }`}
              >
                <div className="flex items-start gap-2">
                  {sel.selectMode && (
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={() => a.id && sel.toggle(a.id)}
                      className="mt-1 accent-primary"
                    />
                  )}
                  <div className="flex-1">
                    <p className="text-sm font-semibold">{a.title}</p>
                    <p className="text-xs text-primary font-medium mt-1">
                      {new Date(a.appointmentAt).toLocaleString()}
                    </p>
                    {a.location && (
                      <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                        <MapPin size={12} /> {a.location}
                      </p>
                    )}
                    {a.reminderAt && (
                      <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                        <Bell size={12} /> {new Date(a.reminderAt).toLocaleString()}
                      </p>
                    )}
                    {a.notes && <p className="text-sm mt-2 text-muted-foreground">{a.notes}</p>}
                  </div>
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
          onMove={bulkMove}
          moveTargets={["task", "meeting", "note", "message"]}
          onShareWA={() => shareManyWA(payload)}
          onShareEmail={() => shareManyEmail(payload)}
          onPrint={() => printMany(payload)}
          onBluetooth={() => void sendViaBluetooth("appointment", selectedRows)}
        />
      )}

      {editing && (
        <EditModal
          title={t(lang, "edit")}
          fields={[
            { key: "title", label: t(lang, "title"), value: editing.title },
            { key: "appointmentAt", label: t(lang, "when"), type: "datetime-local", value: toLocalInput(editing.appointmentAt) },
            { key: "location", label: t(lang, "where"), value: editing.location ?? "" },
            { key: "notes", label: t(lang, "notesField"), type: "textarea", value: editing.notes ?? "" },
          ]}
          onClose={() => setEditing(null)}
          onSave={saveEdit}
        />
      )}
    </AppShell>
  );
}
