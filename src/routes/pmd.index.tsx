import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Plus, FolderKanban, Users, Trash2, Pencil } from "lucide-react";
import { useLang } from "@/lib/settings-store";
import { tp } from "@/lib/pmd-i18n";
import {
  deleteProjectCascade,
  getPmdDb,
  PMD_STATUSES,
  statusTone,
  type PmdContact,
  type PmdContactStatus,
  type PmdProject,
  type PmdStatus,
} from "@/lib/pmd-db";

export const Route = createFileRoute("/pmd/")({
  component: PmdHome,
});

const FIELD =
  "w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary";

function PmdHome() {
  const [lang] = useLang();
  const [tab, setTab] = useState<"projects" | "contacts">("projects");

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-xl font-semibold">{tp(lang, "title")}</h1>
        <p className="text-sm text-muted-foreground">{tp(lang, "subtitle")}</p>
      </header>

      <div className="flex gap-2">
        {(["projects", "contacts"] as const).map((key) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`rounded-xl border px-4 py-2 text-sm font-medium ${
              tab === key ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"
            }`}
          >
            {key === "projects" ? tp(lang, "projects") : tp(lang, "contacts")}
          </button>
        ))}
      </div>

      {tab === "projects" ? <ProjectsTab lang={lang} /> : <ContactsTab lang={lang} />}
    </div>
  );
}

function ProjectsTab({ lang }: { lang: "en" | "id" }) {
  const [filter, setFilter] = useState<PmdStatus | "all">("all");
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<PmdProject | null>(null);
  const [query, setQuery] = useState("");
  const projects = useLiveQuery(async () => {
    if (typeof window === "undefined") return [];
    return getPmdDb().projects.orderBy("createdAt").reverse().toArray();
  }, []);

  const q = query.trim().toLowerCase();
  const list = (projects ?? [])
    .filter((p) => filter === "all" || p.status === filter)
    .filter(
      (p) =>
        !q ||
        [p.name, p.code, p.location, p.managerName, p.summary]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(q)),
    );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => {
            setEditing(null);
            setCreating(true);
          }}
          className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
        >
          <Plus size={16} /> {tp(lang, "newProject")}
        </button>
        <div className="flex flex-wrap gap-1.5">
          {(["all", ...PMD_STATUSES] as const).map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`rounded-lg border px-3 py-1.5 text-xs ${
                filter === s ? "border-primary text-primary" : "border-border text-muted-foreground"
              }`}
            >
              {tp(lang, s === "all" ? "all" : s)}
            </button>
          ))}
        </div>
      </div>

      <input
        className={FIELD}
        placeholder={tp(lang, "search")}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      {(creating || editing) && (
        <ProjectForm
          key={editing?.id ?? "new"}
          lang={lang}
          existing={editing}
          onDone={() => {
            setCreating(false);
            setEditing(null);
          }}
        />
      )}

      {list.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          {(projects ?? []).length === 0 ? tp(lang, "empty") : tp(lang, "noResults")}
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {list.map((p) => (
            <div key={p.id} className="rounded-2xl border border-border bg-card p-4 hover:border-primary/50">
              <div className="mb-2 flex items-start justify-between gap-2">
                <Link
                  to="/pmd/$id"
                  params={{ id: String(p.id) }}
                  className="flex min-w-0 items-center gap-2"
                >
                  <FolderKanban size={18} className="shrink-0 text-primary" />
                  <span className="truncate text-sm font-semibold">{p.name}</span>
                </Link>
                <span className={`shrink-0 rounded-lg border px-2 py-0.5 text-[10px] ${statusTone(p.status)}`}>
                  {tp(lang, p.status)}
                </span>
              </div>
              <Link to="/pmd/$id" params={{ id: String(p.id) }} className="block">
                <p className="font-mono text-xs text-muted-foreground">{p.code}</p>
                {p.location && <p className="mt-1 truncate text-xs text-muted-foreground">{p.location}</p>}
                <p className="mt-2 text-xs text-muted-foreground">
                  {tp(lang, "manager")}: {p.managerName || "—"}
                </p>
              </Link>
              <div className="mt-3 flex justify-end gap-3 border-t border-border pt-2">
                <button
                  onClick={() => {
                    setCreating(false);
                    setEditing(p);
                  }}
                  title={tp(lang, "editProject")}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <Pencil size={14} />
                </button>
                <button
                  onClick={async () => {
                    if (confirm(tp(lang, "confirmDeleteProject"))) await deleteProjectCascade(p.id!);
                  }}
                  title={tp(lang, "deleteProject")}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const toDateInput = (ts?: number) => (ts ? new Date(ts).toISOString().slice(0, 10) : "");

function ProjectForm({
  lang,
  existing,
  onDone,
}: {
  lang: "en" | "id";
  existing?: PmdProject | null;
  onDone: () => void;
}) {
  const [name, setName] = useState(existing?.name ?? "");
  const [code, setCode] = useState(existing?.code ?? "");
  const [location, setLocation] = useState(existing?.location ?? "");
  const [summary, setSummary] = useState(existing?.summary ?? "");
  const [startAt, setStartAt] = useState(toDateInput(existing?.startAt));
  const [targetAt, setTargetAt] = useState(toDateInput(existing?.targetAt));
  const [managerId, setManagerId] = useState(existing?.managerId ?? "");
  const [managerName, setManagerName] = useState(existing?.managerName ?? "");
  const [participantIds, setParticipantIds] = useState<number[]>(existing?.participantIds ?? []);
  const [error, setError] = useState<string | null>(null);

  const contacts = useLiveQuery(async () => {
    if (typeof window === "undefined") return [];
    return getPmdDb().contacts.toArray();
  }, []);

  async function save() {
    if (!name.trim() || !code.trim()) {
      setError(tp(lang, "required"));
      return;
    }
    const project: PmdProject = {
      ...(existing ?? {}),
      name: name.trim(),
      code: code.trim().toUpperCase(),
      location: location.trim() || undefined,
      summary: summary.trim() || undefined,
      createdAt: existing?.createdAt ?? Date.now(),
      startAt: startAt ? new Date(startAt).getTime() : undefined,
      targetAt: targetAt ? new Date(targetAt).getTime() : undefined,
      managerId: managerId.trim() || undefined,
      managerName: managerName.trim() || undefined,
      participantIds,
      properties: existing?.properties ?? [],
      budget: existing?.budget ?? [],
      status: existing?.status ?? "active",
      updatedAt: Date.now(),
    };
    if (existing?.id) await getPmdDb().projects.put(project);
    else await getPmdDb().projects.add(project);
    onDone();
  }

  return (
    <div className="space-y-3 rounded-2xl border border-border bg-card p-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-xs text-muted-foreground">
          {tp(lang, "name")}
          <input className={`${FIELD} mt-1`} value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label className="text-xs text-muted-foreground">
          {tp(lang, "code")}
          <input className={`${FIELD} mt-1`} value={code} onChange={(e) => setCode(e.target.value)} />
        </label>
        <label className="text-xs text-muted-foreground">
          {tp(lang, "location")}
          <input className={`${FIELD} mt-1`} value={location} onChange={(e) => setLocation(e.target.value)} />
        </label>
        <label className="text-xs text-muted-foreground">
          {tp(lang, "managerId")}
          <input className={`${FIELD} mt-1`} value={managerId} onChange={(e) => setManagerId(e.target.value)} />
        </label>
        <label className="text-xs text-muted-foreground">
          {tp(lang, "manager")}
          <input className={`${FIELD} mt-1`} value={managerName} onChange={(e) => setManagerName(e.target.value)} />
        </label>
        <label className="text-xs text-muted-foreground">
          {tp(lang, "startAt")}
          <input type="date" className={`${FIELD} mt-1`} value={startAt} onChange={(e) => setStartAt(e.target.value)} />
        </label>
        <label className="text-xs text-muted-foreground">
          {tp(lang, "targetAt")}
          <input type="date" className={`${FIELD} mt-1`} value={targetAt} onChange={(e) => setTargetAt(e.target.value)} />
        </label>
      </div>
      <label className="block text-xs text-muted-foreground">
        {tp(lang, "summary")}
        <textarea rows={3} className={`${FIELD} mt-1`} value={summary} onChange={(e) => setSummary(e.target.value)} />
      </label>

      <div>
        <p className="mb-1 text-xs text-muted-foreground">{tp(lang, "pickParticipants")}</p>
        {(contacts ?? []).length === 0 ? (
          <p className="text-xs text-muted-foreground">{tp(lang, "noContacts")}</p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {(contacts ?? []).map((c) => {
              const on = participantIds.includes(c.id!);
              return (
                <button
                  key={c.id}
                  onClick={() =>
                    setParticipantIds((prev) => (on ? prev.filter((x) => x !== c.id) : [...prev, c.id!]))
                  }
                  className={`rounded-lg border px-3 py-1.5 text-xs ${
                    on ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"
                  }`}
                >
                  {c.name}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}
      <div className="flex gap-2">
        <button onClick={save} className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
          {tp(lang, "save")}
        </button>
        <button onClick={onDone} className="rounded-xl border border-border px-4 py-2 text-sm">
          {tp(lang, "cancel")}
        </button>
      </div>
    </div>
  );
}

const EMPTY_CONTACT: PmdContact = {
  userId: "",
  name: "",
  company: "",
  role: "",
  whatsapp: "",
  email: "",
  status: "active",
  createdAt: 0,
};

function ContactsTab({ lang }: { lang: "en" | "id" }) {
  const [draft, setDraft] = useState<PmdContact | null>(null);
  const contacts = useLiveQuery(async () => {
    if (typeof window === "undefined") return [];
    return getPmdDb().contacts.orderBy("name").toArray();
  }, []);

  async function save() {
    if (!draft || !draft.name.trim()) return;
    const db = getPmdDb();
    if (draft.id) await db.contacts.put({ ...draft, updatedAt: Date.now() });
    else await db.contacts.add({ ...draft, createdAt: Date.now() });
    setDraft(null);
  }

  return (
    <div className="space-y-4">
      <button
        onClick={() => setDraft({ ...EMPTY_CONTACT })}
        className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
      >
        <Plus size={16} /> {tp(lang, "addContact")}
      </button>

      {draft && (
        <div className="space-y-3 rounded-2xl border border-border bg-card p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-xs text-muted-foreground">
              {tp(lang, "userId")}
              <input className={`${FIELD} mt-1`} value={draft.userId} onChange={(e) => setDraft({ ...draft, userId: e.target.value })} />
            </label>
            <label className="text-xs text-muted-foreground">
              {tp(lang, "contactName")}
              <input className={`${FIELD} mt-1`} value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
            </label>
            <label className="text-xs text-muted-foreground">
              {tp(lang, "company")}
              <input className={`${FIELD} mt-1`} value={draft.company ?? ""} onChange={(e) => setDraft({ ...draft, company: e.target.value })} />
            </label>
            <label className="text-xs text-muted-foreground">
              {tp(lang, "role")}
              <input className={`${FIELD} mt-1`} value={draft.role ?? ""} onChange={(e) => setDraft({ ...draft, role: e.target.value })} />
            </label>
            <label className="text-xs text-muted-foreground">
              {tp(lang, "whatsapp")}
              <input className={`${FIELD} mt-1`} value={draft.whatsapp ?? ""} onChange={(e) => setDraft({ ...draft, whatsapp: e.target.value })} />
            </label>
            <label className="text-xs text-muted-foreground">
              {tp(lang, "email")}
              <input className={`${FIELD} mt-1`} value={draft.email ?? ""} onChange={(e) => setDraft({ ...draft, email: e.target.value })} />
            </label>
            <label className="text-xs text-muted-foreground">
              {tp(lang, "status")}
              <select
                className={`${FIELD} mt-1`}
                value={draft.status}
                onChange={(e) => setDraft({ ...draft, status: e.target.value as PmdContactStatus })}
              >
                <option value="active">{tp(lang, "statusActive")}</option>
                <option value="inactive">{tp(lang, "statusInactive")}</option>
                <option value="blocked">{tp(lang, "statusBlocked")}</option>
              </select>
            </label>
          </div>
          <div className="flex gap-2">
            <button onClick={save} className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
              {tp(lang, "save")}
            </button>
            <button onClick={() => setDraft(null)} className="rounded-xl border border-border px-4 py-2 text-sm">
              {tp(lang, "cancel")}
            </button>
          </div>
        </div>
      )}

      {(contacts ?? []).length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          {tp(lang, "empty")}
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {(contacts ?? []).map((c) => (
            <div key={c.id} className="rounded-2xl border border-border bg-card p-4">
              <div className="mb-1 flex items-start justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2">
                  <Users size={16} className="shrink-0 text-primary" />
                  <span className="truncate text-sm font-semibold">{c.name}</span>
                </div>
                <div className="flex shrink-0 gap-1">
                  <button onClick={() => setDraft(c)} className="text-muted-foreground hover:text-foreground">
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={async () => {
                      if (confirm(tp(lang, "confirmDelete"))) await getPmdDb().contacts.delete(c.id!);
                    }}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">{[c.role, c.company].filter(Boolean).join(" · ") || "—"}</p>
              <p className="text-xs text-muted-foreground">{c.whatsapp || "—"}</p>
              <p className="truncate text-xs text-muted-foreground">{c.email || "—"}</p>
              <p className="mt-1 text-[10px] uppercase tracking-wide text-muted-foreground">
                {tp(lang, c.status === "active" ? "statusActive" : c.status === "inactive" ? "statusInactive" : "statusBlocked")}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
