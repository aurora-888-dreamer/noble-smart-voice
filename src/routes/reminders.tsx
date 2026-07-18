import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Bell } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { DateRangeFilter, inRange } from "@/components/DateRangeFilter";
import { SelectionBar } from "@/components/SelectionBar";
import { EditModal } from "@/components/EditModal";
import { AddFab } from "@/components/AddFab";
import { useMultiSelect } from "@/hooks/useMultiSelect";
import { getDb, type Reminder } from "@/lib/db";
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

  return (
    <AppShell title={t(lang, "reminders")}>
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
                className={`rounded-2xl border p-3 flex items-center gap-3 transition-colors ${
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
    </AppShell>
  );
}
