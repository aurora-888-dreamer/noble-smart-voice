import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { ArrowLeft, Flag, Trash2, X } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { getDb, type TimelineMilestone, type ProjectActivity } from "@/lib/db";
import { useLang } from "@/lib/settings-store";
import { t } from "@/lib/i18n";

export const Route = createFileRoute("/projects/$id")({
  head: () => ({ meta: [{ title: "Project — Noble" }] }),
  component: ProjectDetailPage,
});

function toTs(v: string) {
  return v ? new Date(v).getTime() : undefined;
}
function toDateInput(ts?: number) {
  return ts ? new Date(ts).toISOString().slice(0, 10) : "";
}

function ProjectDetailPage() {
  const { id } = useParams({ from: "/projects/$id" });
  const [lang] = useLang();
  const projectId = Number(id);

  const project = useLiveQuery(async () => {
    if (typeof window === "undefined") return undefined;
    return (await getDb().projects.get(projectId)) ?? null;
  }, [projectId]);

  const [label, setLabel] = useState("");
  const [due, setDue] = useState("");
  const [activityText, setActivityText] = useState("");

  if (project === undefined) return null;
  if (project === null) {
    return (
      <AppShell title={t(lang, "projects")}>
        <p className="text-center text-sm text-muted-foreground py-8">{t(lang, "empty")}</p>
      </AppShell>
    );
  }

  async function updateField(patch: Partial<typeof project>) {
    if (!project?.id) return;
    await getDb().projects.update(project.id, patch);
  }

  async function addMilestone() {
    if (!label.trim() || !project?.id) return;
    const m: TimelineMilestone = { label: label.trim(), dueAt: toTs(due), status: "todo" };
    await getDb().projects.update(project.id, { milestones: [...project.milestones, m] });
    setLabel("");
    setDue("");
  }
  async function cycleStatus(idx: number) {
    if (!project?.id) return;
    const order: TimelineMilestone["status"][] = ["todo", "in-progress", "done"];
    const next = project.milestones.map((m, i) => {
      if (i !== idx) return m;
      const nextStatus = order[(order.indexOf(m.status) + 1) % order.length];
      return { ...m, status: nextStatus };
    });
    await getDb().projects.update(project.id, { milestones: next });
  }
  async function removeMilestone(idx: number) {
    if (!project?.id) return;
    await getDb().projects.update(project.id, {
      milestones: project.milestones.filter((_, i) => i !== idx),
    });
  }

  async function addActivity() {
    if (!activityText.trim() || !project?.id) return;
    const entry: ProjectActivity = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      text: activityText.trim(),
      createdAt: Date.now(),
    };
    const next = [entry, ...(project.activities ?? [])];
    await getDb().projects.update(project.id, { activities: next });
    setActivityText("");
  }
  async function removeActivity(entryId: string) {
    if (!project?.id) return;
    await getDb().projects.update(project.id, {
      activities: (project.activities ?? []).filter((a) => a.id !== entryId),
    });
  }

  const sortedMilestones = [...project.milestones].sort((a, b) => (a.dueAt ?? Infinity) - (b.dueAt ?? Infinity));
  const activities = [...(project.activities ?? [])].sort((a, b) => b.createdAt - a.createdAt);

  return (
    <AppShell title={project.name}>
      <Link to="/projects" className="mb-4 inline-flex items-center gap-1 text-xs text-muted-foreground">
        <ArrowLeft size={14} /> {t(lang, "back")}
      </Link>

      <div className="rounded-2xl bg-card border border-border p-4 mb-4 space-y-3">
        <Field label={t(lang, "name")} value={project.name} onChange={(v) => updateField({ name: v })} />
        <Field label={t(lang, "summary")} value={project.summary ?? ""} onChange={(v) => updateField({ summary: v })} />
        <div className="grid grid-cols-2 gap-2">
          <Field
            label={t(lang, "startDate")}
            type="date"
            value={toDateInput(project.startAt)}
            onChange={(v) => updateField({ startAt: toTs(v) })}
          />
          <Field
            label={t(lang, "endDate")}
            type="date"
            value={toDateInput(project.endAt)}
            onChange={(v) => updateField({ endAt: toTs(v) })}
          />
        </div>
      </div>

      <div className="rounded-2xl bg-card border border-border p-4 mb-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">{t(lang, "milestones")}</p>
        {sortedMilestones.length > 0 && (
          <ol className="relative border-l border-border pl-4 space-y-3 mb-3">
            {sortedMilestones.map((m, i) => (
              <li key={i} className="relative">
                <span
                  className={`absolute -left-[21px] top-1 grid place-items-center w-3 h-3 rounded-full ${
                    m.status === "done" ? "bg-primary" : m.status === "in-progress" ? "bg-accent" : "bg-muted"
                  }`}
                />
                <div className="flex items-start justify-between gap-2">
                  <button onClick={() => cycleStatus(project.milestones.indexOf(m))} className="text-left flex-1">
                    <p className={`text-sm font-medium ${m.status === "done" ? "line-through text-muted-foreground" : ""}`}>
                      {m.label}
                    </p>
                    <p className="text-[11px] text-muted-foreground flex items-center gap-2">
                      {m.dueAt && <span>{new Date(m.dueAt).toLocaleDateString()}</span>}
                      <span className="inline-flex items-center gap-1">
                        <Flag size={10} />
                        {m.status === "in-progress" ? t(lang, "inProgress") : m.status === "done" ? t(lang, "done") : t(lang, "todo")}
                      </span>
                    </p>
                  </button>
                  <button onClick={() => removeMilestone(project.milestones.indexOf(m))} className="text-muted-foreground p-1" aria-label={t(lang, "removeMilestone")}>
                    <X size={14} />
                  </button>
                </div>
              </li>
            ))}
          </ol>
        )}
        <div className="flex gap-2">
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder={t(lang, "addMilestone")}
            className="flex-1 rounded-lg bg-secondary text-secondary-foreground px-3 py-2 text-sm"
          />
          <input type="date" value={due} onChange={(e) => setDue(e.target.value)} className="rounded-lg bg-secondary text-secondary-foreground px-2 py-2 text-sm" />
          <button onClick={addMilestone} className="px-3 rounded-lg bg-primary text-primary-foreground text-sm">+</button>
        </div>
      </div>

      <div className="rounded-2xl bg-card border border-border p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">{t(lang, "activityLog")}</p>
        <div className="flex gap-2 mb-3">
          <textarea
            value={activityText}
            onChange={(e) => setActivityText(e.target.value)}
            rows={2}
            placeholder={t(lang, "addActivity")}
            className="flex-1 rounded-xl bg-secondary text-secondary-foreground px-3 py-2 text-sm resize-none"
          />
          <button onClick={addActivity} className="px-3 rounded-lg bg-primary text-primary-foreground text-sm self-end h-9">+</button>
        </div>
        {activities.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-4">{t(lang, "empty")}</p>
        ) : (
          <ul className="space-y-2">
            {activities.map((a) => (
              <li key={a.id} className="rounded-xl bg-secondary/50 border border-border p-3 flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm whitespace-pre-wrap">{a.text}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">{new Date(a.createdAt).toLocaleString()}</p>
                </div>
                <button onClick={() => removeActivity(a.id)} className="text-muted-foreground p-1 shrink-0" aria-label={t(lang, "delete")}>
                  <Trash2 size={14} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </AppShell>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <label className="block text-xs font-semibold text-muted-foreground">
      {label}
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-lg bg-secondary text-secondary-foreground px-3 py-2 text-sm font-normal"
      />
    </label>
  );
}
