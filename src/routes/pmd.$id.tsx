import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { ArrowLeft, Plus, Trash2, Download, MessageCircle, Mail, Paperclip } from "lucide-react";
import { useLang } from "@/lib/settings-store";
import { tp, type PmdKey } from "@/lib/pmd-i18n";
import { shareToWhatsApp, shareToEmail } from "@/lib/share";
import {
  deleteProjectCascade,
  exportProject,
  getPmdDb,
  PMD_STATUSES,
  statusTone,
  type PmdBudgetLine,
  type PmdContactStatus,
  type PmdProject,
  type PmdStatus,
  type PmdTimelineEntry,
  type PmdTimelineKind,
  type PmdVendor,
} from "@/lib/pmd-db";

export const Route = createFileRoute("/pmd/$id")({
  component: PmdDetail,
});

const FIELD = "w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary";
const TABS = ["profile", "participants", "vendors", "documents", "properties", "budget", "timeline"] as const;
type Tab = (typeof TABS)[number];

const KIND_KEYS: Record<PmdTimelineKind, PmdKey> = {
  approval: "kindApproval",
  recommendation: "kindRecommendation",
  task: "kindTask",
  note: "kindNote",
  message: "kindMessage",
};

function fmtDate(ts?: number) {
  return ts ? new Date(ts).toLocaleDateString() : "—";
}

function PmdDetail() {
  const { id } = Route.useParams();
  const projectId = Number(id);
  const [lang] = useLang();
  const [tab, setTab] = useState<Tab>("profile");
  const navigate = useNavigate();

  const project = useLiveQuery(async () => {
    if (typeof window === "undefined") return undefined;
    return getPmdDb().projects.get(projectId);
  }, [projectId]);

  if (!project) return null;

  async function shareSummary(via: "wa" | "email") {
    const p = project!;
    const lines = [
      `${p.name} (${p.code})`,
      `${tp(lang, "status")}: ${tp(lang, p.status)}`,
      `${tp(lang, "location")}: ${p.location || "—"}`,
      `${tp(lang, "manager")}: ${p.managerName || "—"}`,
      `${tp(lang, "targetAt")}: ${fmtDate(p.targetAt)}`,
      p.summary ?? "",
    ].join("\n");
    if (via === "wa") shareToWhatsApp(lines);
    else shareToEmail(`${p.name} (${p.code})`, lines);
  }

  async function saveToFile() {
    const data = await exportProject(projectId);
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${project!.code}.pmd.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <Link to="/pmd" className="rounded-xl border border-border p-2 text-muted-foreground">
            <ArrowLeft size={16} />
          </Link>
          <div className="min-w-0">
            <h1 className="truncate text-lg font-semibold">{project.name}</h1>
            <p className="font-mono text-xs text-muted-foreground">{project.code}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`rounded-lg border px-2 py-1 text-[11px] ${statusTone(project.status)}`}>
            {tp(lang, project.status)}
          </span>
          <button onClick={saveToFile} title={tp(lang, "saveFile")} className="rounded-xl border border-border p-2 text-muted-foreground">
            <Download size={16} />
          </button>
          <button onClick={() => shareSummary("wa")} title={tp(lang, "sendWa")} className="rounded-xl border border-border p-2 text-muted-foreground">
            <MessageCircle size={16} />
          </button>
          <button onClick={() => shareSummary("email")} title={tp(lang, "sendEmail")} className="rounded-xl border border-border p-2 text-muted-foreground">
            <Mail size={16} />
          </button>
          <button
            onClick={async () => {
              if (!confirm(tp(lang, "confirmDeleteProject"))) return;
              await deleteProjectCascade(projectId);
              navigate({ to: "/pmd" });
            }}
            title={tp(lang, "deleteProject")}
            className="rounded-xl border border-border p-2 text-muted-foreground hover:text-destructive"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {TABS.map((key) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`rounded-lg border px-3 py-1.5 text-xs ${
              tab === key ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"
            }`}
          >
            {tp(lang, key)}
          </button>
        ))}
      </div>

      {tab === "profile" && <ProfileTab key={project.updatedAt ?? project.createdAt} lang={lang} project={project} />}
      {tab === "participants" && <ParticipantsTab lang={lang} project={project} />}
      {tab === "vendors" && <VendorsTab lang={lang} projectId={projectId} />}
      {tab === "documents" && <DocumentsTab lang={lang} projectId={projectId} />}
      {tab === "properties" && <PropertiesTab lang={lang} project={project} />}
      {tab === "budget" && <BudgetTab lang={lang} project={project} />}
      {tab === "timeline" && <TimelineTab lang={lang} project={project} />}
    </div>
  );
}

async function patch(project: PmdProject, changes: Partial<PmdProject>) {
  await getPmdDb().projects.put({ ...project, ...changes, updatedAt: Date.now() });
}

function ProfileTab({ lang, project }: { lang: "en" | "id"; project: PmdProject }) {
  const [draft, setDraft] = useState<PmdProject>(project);
  const [saved, setSaved] = useState(false);
  return (
    <div className="space-y-3 rounded-2xl border border-border bg-card p-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-xs text-muted-foreground">
          {tp(lang, "name")}
          <input className={`${FIELD} mt-1`} value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
        </label>
        <label className="text-xs text-muted-foreground">
          {tp(lang, "code")}
          <input className={`${FIELD} mt-1`} value={draft.code} onChange={(e) => setDraft({ ...draft, code: e.target.value })} />
        </label>
        <label className="text-xs text-muted-foreground">
          {tp(lang, "location")}
          <input className={`${FIELD} mt-1`} value={draft.location ?? ""} onChange={(e) => setDraft({ ...draft, location: e.target.value })} />
        </label>
        <label className="text-xs text-muted-foreground">
          {tp(lang, "managerId")}
          <input className={`${FIELD} mt-1`} value={draft.managerId ?? ""} onChange={(e) => setDraft({ ...draft, managerId: e.target.value })} />
        </label>
        <label className="text-xs text-muted-foreground">
          {tp(lang, "manager")}
          <input className={`${FIELD} mt-1`} value={draft.managerName ?? ""} onChange={(e) => setDraft({ ...draft, managerName: e.target.value })} />
        </label>
        <label className="text-xs text-muted-foreground">
          {tp(lang, "status")}
          <select className={`${FIELD} mt-1`} value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value as PmdStatus })}>
            {PMD_STATUSES.map((s) => (
              <option key={s} value={s}>
                {tp(lang, s)}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs text-muted-foreground">
          {tp(lang, "startAt")}
          <input
            type="date"
            className={`${FIELD} mt-1`}
            value={draft.startAt ? new Date(draft.startAt).toISOString().slice(0, 10) : ""}
            onChange={(e) => setDraft({ ...draft, startAt: e.target.value ? new Date(e.target.value).getTime() : undefined })}
          />
        </label>
        <label className="text-xs text-muted-foreground">
          {tp(lang, "targetAt")}
          <input
            type="date"
            className={`${FIELD} mt-1`}
            value={draft.targetAt ? new Date(draft.targetAt).toISOString().slice(0, 10) : ""}
            onChange={(e) => setDraft({ ...draft, targetAt: e.target.value ? new Date(e.target.value).getTime() : undefined })}
          />
        </label>
      </div>
      <label className="block text-xs text-muted-foreground">
        {tp(lang, "summary")}
        <textarea rows={4} className={`${FIELD} mt-1`} value={draft.summary ?? ""} onChange={(e) => setDraft({ ...draft, summary: e.target.value })} />
      </label>
      <p className="text-xs text-muted-foreground">
        {tp(lang, "createdAt")}: {fmtDate(project.createdAt)}
      </p>
      <div className="flex items-center gap-3">
        <button
          onClick={async () => {
            await patch(project, draft);
            setSaved(true);
            setTimeout(() => setSaved(false), 1500);
          }}
          className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
        >
          {tp(lang, "save")}
        </button>
        {saved && <span className="text-xs text-primary">{tp(lang, "saved")}</span>}
      </div>
    </div>
  );
}

function ParticipantsTab({ lang, project }: { lang: "en" | "id"; project: PmdProject }) {
  const contacts = useLiveQuery(async () => {
    if (typeof window === "undefined") return [];
    return getPmdDb().contacts.orderBy("name").toArray();
  }, []);

  if ((contacts ?? []).length === 0) {
    return <p className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">{tp(lang, "noContacts")}</p>;
  }

  return (
    <div className="space-y-2 rounded-2xl border border-border bg-card p-4">
      <p className="text-xs text-muted-foreground">{tp(lang, "pickParticipants")}</p>
      <div className="flex flex-wrap gap-1.5">
        {(contacts ?? []).map((c) => {
          const on = project.participantIds.includes(c.id!);
          return (
            <button
              key={c.id}
              onClick={() =>
                patch(project, {
                  participantIds: on ? project.participantIds.filter((x) => x !== c.id) : [...project.participantIds, c.id!],
                })
              }
              className={`rounded-lg border px-3 py-1.5 text-xs ${
                on ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"
              }`}
            >
              {c.name}
              {c.company ? ` · ${c.company}` : ""}
            </button>
          );
        })}
      </div>
    </div>
  );
}

const EMPTY_VENDOR: PmdVendor = { projectId: 0, company: "", contactName: "", whatsapp: "", email: "", supplyType: "", status: "active", createdAt: 0 };

function VendorsTab({ lang, projectId }: { lang: "en" | "id"; projectId: number }) {
  const [draft, setDraft] = useState<PmdVendor | null>(null);
  const vendors = useLiveQuery(async () => {
    if (typeof window === "undefined") return [];
    return getPmdDb().vendors.where("projectId").equals(projectId).toArray();
  }, [projectId]);

  async function save() {
    if (!draft?.company.trim()) return;
    const db = getPmdDb();
    if (draft.id) await db.vendors.put(draft);
    else await db.vendors.add({ ...draft, projectId, createdAt: Date.now() });
    setDraft(null);
  }

  return (
    <div className="space-y-4">
      <button
        onClick={() => setDraft({ ...EMPTY_VENDOR, projectId })}
        className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
      >
        <Plus size={16} /> {tp(lang, "addVendor")}
      </button>
      {draft && (
        <div className="space-y-3 rounded-2xl border border-border bg-card p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-xs text-muted-foreground">
              {tp(lang, "company")}
              <input className={`${FIELD} mt-1`} value={draft.company} onChange={(e) => setDraft({ ...draft, company: e.target.value })} />
            </label>
            <label className="text-xs text-muted-foreground">
              {tp(lang, "contactName")}
              <input className={`${FIELD} mt-1`} value={draft.contactName ?? ""} onChange={(e) => setDraft({ ...draft, contactName: e.target.value })} />
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
              {tp(lang, "supplyType")}
              <input className={`${FIELD} mt-1`} value={draft.supplyType ?? ""} onChange={(e) => setDraft({ ...draft, supplyType: e.target.value })} />
            </label>
            <label className="text-xs text-muted-foreground">
              {tp(lang, "status")}
              <select className={`${FIELD} mt-1`} value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value as PmdContactStatus })}>
                <option value="active">{tp(lang, "statusActive")}</option>
                <option value="inactive">{tp(lang, "statusInactive")}</option>
                <option value="blocked">{tp(lang, "statusBlocked")}</option>
              </select>
            </label>
          </div>
          <p className="text-[11px] text-muted-foreground">{tp(lang, "vendorOnlyPm")}</p>
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
      {(vendors ?? []).length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">{tp(lang, "empty")}</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {(vendors ?? []).map((v) => (
            <div key={v.id} className="rounded-2xl border border-border bg-card p-4">
              <div className="mb-1 flex items-start justify-between gap-2">
                <span className="truncate text-sm font-semibold">{v.company}</span>
                <button
                  onClick={() => {
                    if (confirm(tp(lang, "confirmDelete"))) getPmdDb().vendors.delete(v.id!);
                  }}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <Trash2 size={14} />
                </button>
              </div>
              <p className="text-xs text-muted-foreground">{v.supplyType || "—"}</p>
              <p className="text-xs text-muted-foreground">{v.contactName || "—"}</p>
              <p className="text-xs text-muted-foreground">{v.whatsapp || "—"}</p>
              <button onClick={() => setDraft(v)} className="mt-2 text-xs text-primary">
                {tp(lang, "edit")}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function DocumentsTab({ lang, projectId }: { lang: "en" | "id"; projectId: number }) {
  const files = useLiveQuery(async () => {
    if (typeof window === "undefined") return [];
    return getPmdDb().files.where("projectId").equals(projectId).reverse().toArray();
  }, [projectId]);

  async function onUpload(fileList: FileList | null) {
    if (!fileList) return;
    for (const file of Array.from(fileList)) {
      const dataUrl: string = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.readAsDataURL(file);
      });
      await getPmdDb().files.add({
        projectId,
        name: file.name,
        mimeType: file.type || "application/octet-stream",
        size: file.size,
        dataUrl,
        createdAt: Date.now(),
      });
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <label className="flex cursor-pointer items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
          <Paperclip size={16} /> {tp(lang, "uploadFile")}
          <input type="file" multiple className="hidden" onChange={(e) => onUpload(e.target.files)} />
        </label>
        <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm">
          📷 {lang === "id" ? "Kamera" : "Camera"}
          <input type="file" accept="image/*,video/*" capture="environment" className="hidden" onChange={(e) => onUpload(e.target.files)} />
        </label>
      </div>
      {(files ?? []).length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">{tp(lang, "empty")}</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {(files ?? []).map((f) => (
            <div key={f.id} className="rounded-2xl border border-border bg-card p-3">
              {f.mimeType.startsWith("image/") ? (
                <img src={f.dataUrl} alt={f.name} className="mb-2 h-32 w-full rounded-xl object-cover" loading="lazy" />
              ) : f.mimeType.startsWith("video/") ? (
                <video src={f.dataUrl} controls className="mb-2 h-32 w-full rounded-xl object-cover" />
              ) : (
                <div className="mb-2 grid h-32 place-items-center rounded-xl bg-muted text-xs text-muted-foreground">{f.mimeType}</div>
              )}
              <input
                className="w-full rounded-lg border border-border bg-background px-2 py-1 text-xs font-medium"
                value={f.name}
                aria-label={tp(lang, "rename")}
                onChange={(e) => getPmdDb().files.update(f.id!, { name: e.target.value })}
              />
              <input
                className="mt-1 w-full rounded-lg border border-border bg-background px-2 py-1 text-[11px]"
                placeholder={tp(lang, "note")}
                value={f.note ?? ""}
                onChange={(e) => getPmdDb().files.update(f.id!, { note: e.target.value })}
              />
              <p className="mt-1 text-[10px] text-muted-foreground">{Math.round(f.size / 1024)} KB</p>
              <div className="mt-2 flex gap-3 text-xs">
                <a href={f.dataUrl} download={f.name} className="text-primary">
                  {tp(lang, "saveFile")}
                </a>
                <button
                  onClick={() => {
                    if (confirm(tp(lang, "confirmDelete"))) getPmdDb().files.delete(f.id!);
                  }}
                  className="text-muted-foreground hover:text-destructive"
                >
                  {tp(lang, "delete")}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function PropertiesTab({ lang, project }: { lang: "en" | "id"; project: PmdProject }) {
  const [label, setLabel] = useState("");
  const [value, setValue] = useState("");

  async function add() {
    if (!label.trim()) return;
    await patch(project, { properties: [...project.properties, { id: crypto.randomUUID(), label: label.trim(), value: value.trim() }] });
    setLabel("");
    setValue("");
  }

  return (
    <div className="space-y-3 rounded-2xl border border-border bg-card p-4">
      <div className="flex flex-wrap gap-2">
        <input className={`${FIELD} flex-1`} placeholder={tp(lang, "label")} value={label} onChange={(e) => setLabel(e.target.value)} />
        <input className={`${FIELD} flex-1`} placeholder={tp(lang, "value")} value={value} onChange={(e) => setValue(e.target.value)} />
        <button onClick={add} className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
          {tp(lang, "add")}
        </button>
      </div>
      {project.properties.length === 0 ? (
        <p className="text-sm text-muted-foreground">{tp(lang, "empty")}</p>
      ) : (
        <ul className="divide-y divide-border">
          {project.properties.map((p) => (
            <li key={p.id} className="flex items-center justify-between gap-3 py-2 text-sm">
              <span className="text-muted-foreground">{p.label}</span>
              <span className="flex items-center gap-3">
                {p.value}
                <button
                  onClick={() => patch(project, { properties: project.properties.filter((x) => x.id !== p.id) })}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <Trash2 size={14} />
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function BudgetTab({ lang, project }: { lang: "en" | "id"; project: PmdProject }) {
  const [label, setLabel] = useState("");
  const [amount, setAmount] = useState("");
  const total = project.budget.reduce((s, b) => s + b.amount, 0);
  const spent = project.budget.reduce((s, b) => s + b.spent, 0);
  const fmt = (n: number) => n.toLocaleString(lang === "id" ? "id-ID" : "en-US");

  async function add() {
    if (!label.trim()) return;
    const line: PmdBudgetLine = { id: crypto.randomUUID(), label: label.trim(), amount: Number(amount) || 0, spent: 0 };
    await patch(project, { budget: [...project.budget, line] });
    setLabel("");
    setAmount("");
  }

  return (
    <div className="space-y-3 rounded-2xl border border-border bg-card p-4">
      <div className="flex flex-wrap gap-2">
        <input className={`${FIELD} flex-1`} placeholder={tp(lang, "label")} value={label} onChange={(e) => setLabel(e.target.value)} />
        <input className={`${FIELD} w-40`} type="number" placeholder={tp(lang, "amount")} value={amount} onChange={(e) => setAmount(e.target.value)} />
        <button onClick={add} className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
          {tp(lang, "addLine")}
        </button>
      </div>
      {project.budget.length > 0 && (
        <ul className="divide-y divide-border">
          {project.budget.map((b) => (
            <li key={b.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
              <span className="min-w-0 flex-1 truncate">{b.label}</span>
              <span className="text-muted-foreground">{fmt(b.amount)}</span>
              <input
                type="number"
                className="w-28 rounded-lg border border-border bg-background px-2 py-1 text-xs"
                value={b.spent}
                onChange={(e) =>
                  patch(project, {
                    budget: project.budget.map((x) => (x.id === b.id ? { ...x, spent: Number(e.target.value) || 0 } : x)),
                  })
                }
              />
              <button
                onClick={() => patch(project, { budget: project.budget.filter((x) => x.id !== b.id) })}
                className="text-muted-foreground hover:text-destructive"
              >
                <Trash2 size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex justify-between border-t border-border pt-2 text-sm">
        <span className="text-muted-foreground">
          {tp(lang, "total")}: {fmt(total)} · {tp(lang, "spent")}: {fmt(spent)}
        </span>
        <span className="font-semibold">
          {tp(lang, "remaining")}: {fmt(total - spent)}
        </span>
      </div>
    </div>
  );
}

function TimelineTab({ lang, project }: { lang: "en" | "id"; project: PmdProject }) {
  const projectId = project.id!;
  const [composing, setComposing] = useState(false);
  const entries = useLiveQuery(async () => {
    if (typeof window === "undefined") return [];
    return getPmdDb().timeline.where("projectId").equals(projectId).sortBy("createdAt");
  }, [projectId]);

  const roots = (entries ?? []).filter((e) => !e.parentId);

  return (
    <div className="space-y-4">
      <button
        onClick={() => setComposing((v) => !v)}
        className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
      >
        <Plus size={16} /> {tp(lang, "newEntry")}
      </button>
      {composing && <EntryForm lang={lang} projectId={projectId} onDone={() => setComposing(false)} />}
      {roots.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">{tp(lang, "empty")}</p>
      ) : (
        <div className="space-y-3">
          {roots.map((entry) => (
            <ThreadCard key={entry.id} lang={lang} entry={entry} replies={(entries ?? []).filter((e) => e.parentId === entry.id)} />
          ))}
        </div>
      )}
    </div>
  );
}

function EntryForm({
  lang,
  projectId,
  parentId,
  onDone,
}: {
  lang: "en" | "id";
  projectId: number;
  parentId?: number;
  onDone: () => void;
}) {
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [author, setAuthor] = useState("");
  const [kind, setKind] = useState<PmdTimelineKind>(parentId ? "note" : "approval");
  const [recipients, setRecipients] = useState("");

  async function save() {
    if (!subject.trim() && !body.trim()) return;
    const entry: PmdTimelineEntry = {
      projectId,
      parentId,
      subject: subject.trim() || tp(lang, "reply"),
      body: body.trim(),
      author: author.trim() || "—",
      kind,
      state: "open",
      recipients: recipients.split(",").map((r) => r.trim()).filter(Boolean),
      createdAt: Date.now(),
    };
    const db = getPmdDb();
    await db.timeline.add(entry);
    if (parentId) await db.timeline.update(parentId, { state: "answered" });
    onDone();
  }

  return (
    <div className="space-y-3 rounded-2xl border border-border bg-card p-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-xs text-muted-foreground">
          {tp(lang, "subject")}
          <input className={`${FIELD} mt-1`} value={subject} onChange={(e) => setSubject(e.target.value)} />
        </label>
        <label className="text-xs text-muted-foreground">
          {tp(lang, "author")}
          <input className={`${FIELD} mt-1`} value={author} onChange={(e) => setAuthor(e.target.value)} />
        </label>
        <label className="text-xs text-muted-foreground">
          {tp(lang, "kind")}
          <select className={`${FIELD} mt-1`} value={kind} onChange={(e) => setKind(e.target.value as PmdTimelineKind)}>
            {(Object.keys(KIND_KEYS) as PmdTimelineKind[]).map((k) => (
              <option key={k} value={k}>
                {tp(lang, KIND_KEYS[k])}
              </option>
            ))}
          </select>
        </label>
        {kind === "message" && (
          <label className="text-xs text-muted-foreground">
            {tp(lang, "recipients")}
            <input className={`${FIELD} mt-1`} value={recipients} onChange={(e) => setRecipients(e.target.value)} />
          </label>
        )}
      </div>
      <label className="block text-xs text-muted-foreground">
        {tp(lang, "body")}
        <textarea rows={3} className={`${FIELD} mt-1`} value={body} onChange={(e) => setBody(e.target.value)} />
      </label>
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

function ThreadCard({ lang, entry, replies }: { lang: "en" | "id"; entry: PmdTimelineEntry; replies: PmdTimelineEntry[] }) {
  const [replying, setReplying] = useState(false);
  const stateKey: PmdKey = entry.state === "open" ? "threadOpen" : entry.state === "answered" ? "threadAnswered" : "threadClosed";

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm font-semibold">{entry.subject}</span>
        <div className="flex items-center gap-2">
          <span className="rounded-lg border border-border px-2 py-0.5 text-[10px] text-muted-foreground">{tp(lang, KIND_KEYS[entry.kind])}</span>
          <span className="rounded-lg border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] text-primary">{tp(lang, stateKey)}</span>
        </div>
      </div>
      <p className="whitespace-pre-wrap text-sm">{entry.body}</p>
      <p className="mt-1 text-[11px] text-muted-foreground">
        {entry.author} · {new Date(entry.createdAt).toLocaleString()}
        {entry.recipients.length > 0 && ` · ${tp(lang, "recipients")}: ${entry.recipients.join(", ")}`}
      </p>

      {replies.length > 0 && (
        <div className="mt-3 space-y-2 border-l-2 border-border pl-3">
          {replies.map((r) => (
            <div key={r.id}>
              <p className="text-xs font-medium">{r.subject}</p>
              <p className="whitespace-pre-wrap text-xs text-muted-foreground">{r.body}</p>
              <p className="text-[10px] text-muted-foreground">
                {r.author} · {new Date(r.createdAt).toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      )}

      <div className="mt-3 flex flex-wrap gap-3 text-xs">
        <button onClick={() => setReplying((v) => !v)} className="text-primary">
          {tp(lang, "reply")}
        </button>
        <button
          onClick={() => getPmdDb().timeline.update(entry.id!, { state: entry.state === "closed" ? "open" : "closed" })}
          className="text-muted-foreground"
        >
          {tp(lang, entry.state === "closed" ? "reopenThread" : "closeThread")}
        </button>
        <button onClick={() => getPmdDb().timeline.delete(entry.id!)} className="text-muted-foreground hover:text-destructive">
          {tp(lang, "delete")}
        </button>
      </div>

      {replying && (
        <div className="mt-3">
          <EntryForm lang={lang} projectId={entry.projectId} parentId={entry.id} onDone={() => setReplying(false)} />
        </div>
      )}
    </div>
  );
}
