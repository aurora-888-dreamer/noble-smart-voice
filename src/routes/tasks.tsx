import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Trash2, Circle, CheckCircle2 } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { getDb, type Task } from "@/lib/db";
import { useLang } from "@/lib/settings-store";
import { t } from "@/lib/i18n";

export const Route = createFileRoute("/tasks")({
  head: () => ({ meta: [{ title: "Tasks — Noble" }] }),
  component: TasksPage,
});

function TasksPage() {
  const [lang] = useLang();
  const [filter, setFilter] = useState<"today" | "upcoming" | "completed">("today");
  const tasks = useLiveQuery(async () => {
    if (typeof window === "undefined") return [];
    return getDb().tasks.orderBy("createdAt").reverse().toArray();
  }, []);

  const now = Date.now();
  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);

  const filtered = (tasks ?? []).filter((task: Task) => {
    if (filter === "completed") return task.status === "done";
    if (task.status !== "open") return false;
    if (filter === "today") return !task.dueAt || task.dueAt <= endOfToday.getTime();
    return !!(task.dueAt && task.dueAt > endOfToday.getTime());
  });

  async function toggle(task: Task) {
    if (!task.id) return;
    await getDb().tasks.update(task.id, {
      status: task.status === "done" ? "open" : "done",
    });
  }

  const tabs = [
    { k: "today", label: t(lang, "today") },
    { k: "upcoming", label: t(lang, "upcoming") },
    { k: "completed", label: t(lang, "completed") },
  ] as const;

  return (
    <AppShell title={t(lang, "tasks")}>
      <div className="flex gap-2 mb-4">
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

      {filtered.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground py-8">{t(lang, "empty")}</p>
      ) : (
        <ul className="space-y-2">
          {filtered.map((task) => (
            <li
              key={task.id}
              className="rounded-2xl bg-card border border-border p-3 flex items-start gap-3"
            >
              <button onClick={() => toggle(task)} className="mt-0.5 text-primary">
                {task.status === "done" ? <CheckCircle2 size={20} /> : <Circle size={20} />}
              </button>
              <div className="flex-1">
                <p
                  className={`text-sm font-medium ${
                    task.status === "done" ? "line-through text-muted-foreground" : ""
                  }`}
                >
                  {task.title}
                </p>
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
              <button
                onClick={() => task.id && getDb().tasks.delete(task.id)}
                className="text-muted-foreground"
                aria-label={t(lang, "delete")}
              >
                <Trash2 size={16} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </AppShell>
  );
}