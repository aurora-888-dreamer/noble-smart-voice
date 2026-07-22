import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Circle, CheckCircle2 } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { DateRangeFilter, inRange } from "@/components/DateRangeFilter";
import { SelectionBar, type MoveTarget } from "@/components/SelectionBar";
import { EditModal } from "@/components/EditModal";
import { AddFab } from "@/components/AddFab";
import { useMultiSelect } from "@/hooks/useMultiSelect";
import { getDb, type Task } from "@/lib/db";
import { useLang } from "@/lib/settings-store";
import { t } from "@/lib/i18n";
import { sendViaBluetooth } from "@/lib/bluetooth-share";
import { shareManyEmail, shareManyWA, printMany } from "@/lib/bulk-share";
import { ItemActions } from "@/components/ItemActions";

export const Route = createFileRoute("/tasks")({
  head: () => ({ meta: [{ title: "Tasks — Noble" }] }),
  component: TasksPage,
});

function toLocalInput(ts?: number) {
  if (!ts) return "";
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function TasksPage() {
  const [lang] = useLang();
  const [filter, setFilter] = useState<"today" | "upcoming" | "completed" | "all">("today");
  const [q, setQ] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [editing, setEditing] = useState<Task | null>(null);
  const [adding, setAdding] = useState(false);
  const sel = useMultiSelect<number>();

  const tasks = useLiveQuery(async () => {
    if (typeof window === "undefined") return [];
    return getDb().tasks.orderBy("createdAt").reverse().toArray();
  }, []);

  const endOfToday = useMemo(() => {
    const d = new Date();
    d.setHours(23, 59, 59, 999);
    return d.getTime();
  }, []);

  const filtered = useMemo(() => {
    return (tasks ?? []).filter((task) => {
      if (!inRange(task.createdAt, from, to)) return false;
      if (q && !task.title.toLowerCase().includes(q.toLowerCase())) return false;
      if (filter === "all") return true;
      if (filter === "completed") return task.status === "done";
      if (task.status !== "open") return false;
      if (filter === "today") return !task.dueAt || task.dueAt <= endOfToday;
      return !!(task.dueAt && task.dueAt > endOfToday);
    });
  }, [tasks, filter, q, from, to, endOfToday]);

  const visibleIds = filtered.map((n) => n.id!).filter(Boolean);
  const selectedRows = filtered.filter((n) => n.id && sel.isSelected(n.id));
  const payload = selectedRows.map((r) => ({ title: r.title, body: r.description ?? "" }));

  async function toggle(task: Task) {
    if (!task.id) return;
    await getDb().tasks.update(task.id, { status: task.status === "done" ? "open" : "done" });
  }

  async function bulkDelete() {
    await getDb().tasks.bulkDelete([...sel.selected]);
    sel.exit();
  }
  async function bulkDuplicate() {
    const now = Date.now();
    await getDb().tasks.bulkAdd(
      selectedRows.map((r) => ({
        title: `${r.title} (copy)`,
        description: r.description,
        dueAt: r.dueAt,
        priority: r.priority,
        status: "open" as const,
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
          transcript: r.description ?? "",
          language: "en" as const,
          tags: ["task"],
          createdAt: now,
          updatedAt: now,
        })),
      );
    } else if (tgt === "meeting") {
      await db.meetings.bulkAdd(
        selectedRows.map((r) => ({
          title: r.title,
          summary: r.description ?? "",
          attendees: [],
          actionItems: [],
          meetingAt: r.dueAt,
          createdAt: now,
        })),
      );
    } else if (tgt === "appointment") {
      await db.appointments.bulkAdd(
        selectedRows.map((r) => ({
          title: r.title,
          appointmentAt: r.dueAt ?? now,
          notes: r.description,
        })),
      );
    } else if (tgt === "message") {
      await db.messages.bulkAdd(
        selectedRows.map((r) => ({
          content: `${r.title}\n${r.description ?? ""}`,
          status: "draft" as const,
          createdAt: now,
        })),
      );
    }
    await db.tasks.bulkDelete([...sel.selected]);
    sel.exit();
  }

  async function saveEdit(vals: Record<string, string>) {
    if (!editing?.id) return;
    await getDb().tasks.update(editing.id, {
      title: vals.title,
      description: vals.description || undefined,
      dueAt: vals.dueAt ? new Date(vals.dueAt).getTime() : undefined,
      priority: (vals.priority as Task["priority"]) || editing.priority,
    });
    setEditing(null);
    sel.exit();
  }
  async function saveNew(vals: Record<string, string>) {
    await getDb().tasks.add({
      title: vals.title || "Untitled",
      description: vals.description || undefined,
      dueAt: vals.dueAt ? new Date(vals.dueAt).getTime() : undefined,
      priority: (vals.priority as Task["priority"]) || "med",
      status: "open",
      createdAt: Date.now(),
    });
    setAdding(false);
  }

  const tabs = [
    { k: "today", label: t(lang, "today") },
    { k: "upcoming", label: t(lang, "upcoming") },
    { k: "completed", label: t(lang, "completed") },
    { k: "all", label: t(lang, "all") },
  ] as const;

  return (
    <AppShell title={t(lang, "tasks")}>
      <div className="flex gap-2 mb-3">
        {tabs.map((tab) => (
          <button
            key={tab.k}
            onClick={() => setFilter(tab.k)}
            className={`flex-1 py-2 rounded-full text-xs font-semibold ${
              filter === tab.k
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-secondary-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={t(lang, "search")}
        className="w-full rounded-full border border-border bg-card px-4 py-2 text-sm mb-2 outline-none focus:border-primary"
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
          {filtered.map((task) => {
            const selected = task.id ? sel.isSelected(task.id) : false;
            return (
              <li
                key={task.id}
                onClick={() => sel.selectMode && task.id && sel.toggle(task.id)}
                onContextMenu={(e) => { e.preventDefault(); if (!sel.selectMode && task.id) sel.enter(task.id); }}
                className={`rounded-2xl border p-3 flex items-start gap-3 transition-colors select-none ${
                  selected ? "border-primary bg-primary/10" : "bg-card border-border"
                }`}
              >
                {sel.selectMode ? (
                  <input
                    type="checkbox"
                    checked={selected}
                    onChange={() => task.id && sel.toggle(task.id)}
                    className="mt-1 accent-primary"
                  />
                ) : (
                  <button onClick={() => toggle(task)} className="mt-0.5 text-primary">
                    {task.status === "done" ? <CheckCircle2 size={20} /> : <Circle size={20} />}
                  </button>
                )}
                <div className="flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p
                      className={`text-sm font-medium flex-1 ${
                        task.status === "done" ? "line-through text-muted-foreground" : ""
                      }`}
                    >
                      {task.title}
                    </p>
                    {!sel.selectMode && (
                      <ItemActions
                        title={task.title}
                        body={task.description ?? ""}
                        onEdit={() => setEditing(task)}
                        onDelete={async () => { if (task.id) await getDb().tasks.delete(task.id); }}
                      />
                    )}
                  </div>
                  {task.dueAt && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {new Date(task.dueAt).toLocaleString()}
                    </p>
                  )}
                  <span
                    className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                      task.priority === "high"
                        ? "bg-destructive/15 text-destructive"
                        : task.priority === "med"
                          ? "bg-accent/25 text-accent-foreground"
                          : "bg-secondary text-secondary-foreground"
                    }`}
                  >
                    {t(lang, task.priority)}
                  </span>
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
          moveTargets={["note", "meeting", "appointment", "message"]}
          onShareWA={() => shareManyWA(payload)}
          onShareEmail={() => shareManyEmail(payload)}
          onPrint={() => printMany(payload)}
          onBluetooth={() => void sendViaBluetooth("task", selectedRows)}
        />
      )}

      {editing && (
        <EditModal
          title={t(lang, "edit")}
          fields={[
            { key: "title", label: t(lang, "title"), value: editing.title },
            { key: "description", label: t(lang, "content"), type: "textarea", value: editing.description ?? "" },
            { key: "dueAt", label: t(lang, "dueDate"), type: "datetime-local", value: toLocalInput(editing.dueAt) },
            { key: "priority", label: t(lang, "priority"), value: editing.priority },
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
            { key: "description", label: t(lang, "content"), type: "textarea", value: "" },
            { key: "dueAt", label: t(lang, "dueDate"), type: "datetime-local", value: "" },
            { key: "priority", label: t(lang, "priority"), value: "med" },
          ]}
          onClose={() => setAdding(false)}
          onSave={saveNew}
        />
      )}
    </AppShell>
  );
}
