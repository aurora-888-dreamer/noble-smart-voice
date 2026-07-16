import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Trash2, Plus, Flag, X } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { getDb, type Project, type TimelineMilestone } from "@/lib/db";
import { useLang } from "@/lib/settings-store";
import { t } from "@/lib/i18n";

export const Route = createFileRoute("/projects")({
  head: () => ({ meta: [{ title: "Project Timeline — VoiceTag" }] }),
  component: ProjectsPage,
});

function toTs(v: string) {
  return v ? new Date(v).getTime() : undefined;
}

function ProjectsPage() {
  const [lang] = useLang();
  const [open, setOpen] = useState(false);
  const projects = useLiveQuery(async () => {
    if (typeof window === "undefined") return [];
    return getDb().projects.orderBy("createdAt").reverse().toArray();
  }, []);

  return (
    <AppShell title={t(lang, "projects")}>
      <button
        onClick={() => setOpen(true)}
        className="w-full mb-4 rounded-2xl bg-primary text-primary-foreground py-3 font-semibold flex items-center justify-center gap-2"
      >
        <Plus size={18} /> {t(lang, "newProject")}
      </button>

      {open && <NewProjectForm lang={lang} onClose={() => setOpen(false)} />}

      {projects && projects.length > 0 ? (
        <ul className="space-y-3">
          {projects.map((p) => (
            <ProjectCard key={p.id} project={p} lang={lang} />
          ))}
        </ul>
      ) : (
        !open && (
          <p className="text-center text-sm text-muted-foreground py-8">
            {t(lang, "empty")}
          </p>
        )
      )}
    </AppShell>
  );
}

function NewProjectForm({ lang, onClose }: { lang: "en" | "id"; onClose: () => void }) {
  const [name, setName] = useState("");
  const [summary, setSummary] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");

  async function save() {
    if (!name.trim()) return;
    await getDb().projects.add({
      name: name.trim(),
      summary: summary.trim() || undefined,
      startAt: toTs(start),
      endAt: toTs(end),
      milestones: [],
      createdAt: Date.now(),
    });
    onClose();
  }

  return (
    <div className="mb-4 rounded-2xl bg-card border border-border p-4 space-y-3">
      <Field label={t(lang, "name")} value={name} onChange={setName} />
      <Field label={t(lang, "summary")} value={summary} onChange={setSummary} />
      <div className="grid grid-cols-2 gap-2">
        <Field label={t(lang, "startDate")} value={start} onChange={setStart} type="date" />
        <Field label={t(lang, "endDate")} value={end} onChange={setEnd} type="date" />
      </div>
      <div className="flex gap-2">
        <button onClick={onClose} className="flex-1 py-2 rounded-full bg-secondary text-secondary-foreground text-sm font-semibold">
          {t(lang, "cancel")}
        </button>
        <button onClick={save} className="flex-1 py-2 rounded-full bg-primary text-primary-foreground text-sm font-semibold">
          {t(lang, "save")}
        </button>
      </div>
    </div>
  );
}

function ProjectCard({ project, lang }: { project: Project; lang: "en" | "id" }) {
  const [label, setLabel] = useState("");
  const [due, setDue] = useState("");

  async function addMilestone() {
    if (!label.trim() || !project.id) return;
    const m: TimelineMilestone = {
      label: label.trim(),
      dueAt: toTs(due),
      status: "todo",
    };
    await getDb().projects.update(project.id, { milestones: [...project.milestones, m] });
    setLabel("");
    setDue("");
  }

  async function cycleStatus(idx: number) {
    if (!project.id) return;
    const order: TimelineMilestone["status"][] = ["todo", "in-progress", "done"];
    const next = project.milestones.map((m, i) => {
      if (i !== idx) return m;
      const nextStatus = order[(order.indexOf(m.status) + 1) % order.length];
      return { ...m, status: nextStatus };
    });
    await getDb().projects.update(project.id, { milestones: next });
  }

  async function removeMilestone(idx: number) {
    if (!project.id) return;
    const next = project.milestones.filter((_, i) => i !== idx);
    await getDb().projects.update(project.id, { milestones: next });
  }

  const sorted = [...project.milestones].sort(
    (a, b) => (a.dueAt ?? Infinity) - (b.dueAt ?? Infinity),
  );

  return (
    <li className="rounded-2xl bg-card border border-border p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-semibold">{project.name}</p>
          {project.summary && (
            <p className="text-xs text-muted-foreground mt-0.5">{project.summary}</p>
          )}
          {(project.startAt || project.endAt) && (
            <p className="text-xs text-muted-foreground mt-0.5">
              {project.startAt ? new Date(project.startAt).toLocaleDateString() : "?"} –{" "}
              {project.endAt ? new Date(project.endAt).toLocaleDateString() : "?"}
            </p>
          )}
        </div>
        <button
          onClick={() => project.id && getDb().projects.delete(project.id)}
          className="text-muted-foreground"
          aria-label={t(lang, "delete")}
        >
          <Trash2 size={16} />
        </button>
      </div>

      <div className="mt-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
          {t(lang, "milestones")}
        </p>
        {sorted.length > 0 && (
          <ol className="relative border-l border-border pl-4 space-y-3 mb-3">
            {sorted.map((m, i) => (
              <li key={i} className="relative">
                <span
                  className={`absolute -left-[21px] top-1 grid place-items-center w-3 h-3 rounded-full ${
                    m.status === "done"
                      ? "bg-primary"
                      : m.status === "in-progress"
                        ? "bg-accent"
                        : "bg-muted"
                  }`}
                />
                <div className="flex items-start justify-between gap-2">
                <button
                  onClick={() => cycleStatus(project.milestones.indexOf(m))}
                  className="text-left flex-1"
                >
                  <p
                    className={`text-sm font-medium ${
                      m.status === "done" ? "line-through text-muted-foreground" : ""
                    }`}
                  >
                    {m.label}
                  </p>
                  <p className="text-[11px] text-muted-foreground flex items-center gap-2">
                    {m.dueAt && <span>{new Date(m.dueAt).toLocaleDateString()}</span>}
                    <span className="inline-flex items-center gap-1">
                      <Flag size={10} />
                      {m.status === "in-progress"
                        ? t(lang, "inProgress")
                        : m.status === "done"
                          ? t(lang, "done")
                          : t(lang, "todo")}
                    </span>
                  </p>
                </button>
                <button
                  onClick={() => removeMilestone(project.milestones.indexOf(m))}
                  className="text-muted-foreground p-1"
                  aria-label={t(lang, "removeMilestone")}
                >
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
          <input
            type="date"
            value={due}
            onChange={(e) => setDue(e.target.value)}
            className="rounded-lg bg-secondary text-secondary-foreground px-2 py-2 text-sm"
          />
          <button onClick={addMilestone} className="px-3 rounded-lg bg-primary text-primary-foreground text-sm">
            +
          </button>
        </div>
      </div>
    </li>
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