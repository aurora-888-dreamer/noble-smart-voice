import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { AppShell } from "@/components/AppShell";
import { DateRangeFilter, inRange } from "@/components/DateRangeFilter";
import { SelectionBar, type MoveTarget } from "@/components/SelectionBar";
import { EditModal } from "@/components/EditModal";
import { AddFab } from "@/components/AddFab";
import { useMultiSelect } from "@/hooks/useMultiSelect";
import { getDb, type Meeting } from "@/lib/db";
import { useLang } from "@/lib/settings-store";
import { t } from "@/lib/i18n";
import { sendViaBluetooth } from "@/lib/bluetooth-share";
import { shareManyEmail, shareManyWA, printMany } from "@/lib/bulk-share";

export const Route = createFileRoute("/meetings")({
  head: () => ({ meta: [{ title: "Meetings — Noble" }] }),
  component: MeetingsPage,
});

function toLocalInput(ts?: number) {
  if (!ts) return "";
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function MeetingsPage() {
  const [lang] = useLang();
  const [q, setQ] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [editing, setEditing] = useState<Meeting | null>(null);
  const sel = useMultiSelect<number>();

  const meetings = useLiveQuery(async () => {
    if (typeof window === "undefined") return [];
    return getDb().meetings.orderBy("createdAt").reverse().toArray();
  }, []);

  const filtered = useMemo(() => {
    return (meetings ?? []).filter((m) => {
      if (!inRange(m.createdAt, from, to)) return false;
      if (!q) return true;
      const s = q.toLowerCase();
      return m.title.toLowerCase().includes(s) || m.summary.toLowerCase().includes(s);
    });
  }, [meetings, q, from, to]);

  const visibleIds = filtered.map((n) => n.id!).filter(Boolean);
  const selectedRows = filtered.filter((n) => n.id && sel.isSelected(n.id));
  const payload = selectedRows.map((r) => ({
    title: r.title,
    body: `${r.summary}\n\nAttendees: ${r.attendees.join(", ")}\n\nActions:\n${r.actionItems.map((a) => `- ${a}`).join("\n")}`,
  }));

  async function bulkDelete() {
    await getDb().meetings.bulkDelete([...sel.selected]);
    sel.exit();
  }
  async function bulkDuplicate() {
    const now = Date.now();
    await getDb().meetings.bulkAdd(
      selectedRows.map((r) => ({
        title: `${r.title} (copy)`,
        summary: r.summary,
        attendees: [...r.attendees],
        actionItems: [...r.actionItems],
        meetingAt: r.meetingAt,
        createdAt: now,
      })),
    );
    sel.exit();
  }
  async function bulkMove(tgt: MoveTarget) {
    const db = getDb();
    const now = Date.now();
    if (tgt === "note") {
      await db.notes.bulkAdd(
        selectedRows.map((r) => ({
          title: r.title,
          transcript: r.summary,
          language: "en" as const,
          tags: ["meeting"],
          createdAt: now,
          updatedAt: now,
        })),
      );
    } else if (tgt === "task") {
      await db.tasks.bulkAdd(
        selectedRows.map((r) => ({
          title: r.title,
          description: r.summary,
          priority: "med" as const,
          status: "open" as const,
          dueAt: r.meetingAt,
          createdAt: now,
        })),
      );
    } else if (tgt === "appointment") {
      await db.appointments.bulkAdd(
        selectedRows.map((r) => ({
          title: r.title,
          appointmentAt: r.meetingAt ?? now,
          notes: r.summary,
        })),
      );
    } else if (tgt === "message") {
      await db.messages.bulkAdd(
        selectedRows.map((r) => ({
          content: `${r.title}\n${r.summary}`,
          status: "draft" as const,
          createdAt: now,
        })),
      );
    }
    await db.meetings.bulkDelete([...sel.selected]);
    sel.exit();
  }

  async function saveEdit(vals: Record<string, string>) {
    if (!editing?.id) return;
    await getDb().meetings.update(editing.id, {
      title: vals.title,
      summary: vals.summary,
      attendees: vals.attendees.split(",").map((s) => s.trim()).filter(Boolean),
      actionItems: vals.actionItems.split("\n").map((s) => s.trim()).filter(Boolean),
      meetingAt: vals.meetingAt ? new Date(vals.meetingAt).getTime() : undefined,
    });
    setEditing(null);
    sel.exit();
  }

  return (
    <AppShell title={t(lang, "meetings")}>
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
          {filtered.map((m) => {
            const selected = m.id ? sel.isSelected(m.id) : false;
            return (
              <li
                key={m.id}
                onClick={() => sel.selectMode && m.id && sel.toggle(m.id)}
                className={`rounded-2xl border p-4 transition-colors ${
                  selected ? "border-primary bg-primary/10" : "bg-card border-border"
                }`}
              >
                <div className="flex items-start gap-2">
                  {sel.selectMode && (
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={() => m.id && sel.toggle(m.id)}
                      className="mt-1 accent-primary"
                    />
                  )}
                  <div className="flex-1">
                    <p className="text-sm font-semibold">{m.title}</p>
                    {m.meetingAt && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(m.meetingAt).toLocaleString()}
                      </p>
                    )}
                    {m.summary && <p className="text-sm text-muted-foreground mt-2">{m.summary}</p>}
                    {m.attendees.length > 0 && (
                      <p className="text-xs mt-2">
                        <span className="text-muted-foreground">{t(lang, "attendees")}: </span>
                        {m.attendees.join(", ")}
                      </p>
                    )}
                    {m.actionItems.length > 0 && (
                      <div className="mt-2">
                        <p className="text-xs text-muted-foreground">{t(lang, "actionItems")}:</p>
                        <ul className="list-disc list-inside text-xs mt-1 space-y-0.5">
                          {m.actionItems.map((a, i) => (
                            <li key={i}>{a}</li>
                          ))}
                        </ul>
                      </div>
                    )}
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
          moveTargets={["note", "task", "appointment", "message"]}
          onShareWA={() => shareManyWA(payload)}
          onShareEmail={() => shareManyEmail(payload)}
          onPrint={() => printMany(payload)}
          onBluetooth={() => void sendViaBluetooth("meeting", selectedRows)}
        />
      )}

      {editing && (
        <EditModal
          title={t(lang, "edit")}
          fields={[
            { key: "title", label: t(lang, "title"), value: editing.title },
            { key: "summary", label: t(lang, "summary"), type: "textarea", value: editing.summary },
            { key: "attendees", label: t(lang, "attendees"), value: editing.attendees.join(", ") },
            { key: "actionItems", label: t(lang, "actionItems"), type: "textarea", value: editing.actionItems.join("\n") },
            { key: "meetingAt", label: t(lang, "when"), type: "datetime-local", value: toLocalInput(editing.meetingAt) },
          ]}
          onClose={() => setEditing(null)}
          onSave={saveEdit}
        />
      )}
    </AppShell>
  );
}
