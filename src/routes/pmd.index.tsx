import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Plus, FolderKanban, Users, Trash2, Pencil } from "lucide-react";
import { useLang } from "@/lib/settings-store";
import { tp } from "@/lib/pmd-i18n";
import { usePmdSession, setPmdSession, clearPmdSession } from "@/lib/pmd-session";
import { updatePmdProfile, changePmdPin } from "@/lib/pmd-auth.functions";
import {
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
  const [tab, setTab] = useState<"projects" | "contacts" | "settings">("projects");

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-xl font-semibold">{tp(lang, "title")}</h1>
        <p className="text-sm text-muted-foreground">{tp(lang, "subtitle")}</p>
      </header>

      <div className="flex gap-2">
        {(["projects", "contacts", "settings"] as const).map((key) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`rounded-xl border px-4 py-2 text-sm font-medium ${
              tab === key ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"
            }`}
          >
            {key === "projects" ? tp(lang, "projects") : key === "contacts" ? tp(lang, "contacts") : (lang === "id" ? "Pengaturan" : "Settings")}
          </button>
        ))}
      </div>

      {tab === "projects" && <ProjectsTab lang={lang} />}
      {tab === "contacts" && <ContactsTab lang={lang} />}
      {tab === "settings" && <SettingsTab lang={lang} />}
    </div>
  );
}

function ProjectsTab({ lang }: { lang: "en" | "id" }) {
  const [filter, setFilter] = useState<PmdStatus | "all">("all");
  const [creating, setCreating] = useState(false);
  const projects = useLiveQuery(async () => {
    if (typeof window === "undefined") return [];
    return getPmdDb().projects.orderBy("createdAt").reverse().toArray();
  }, []);

  const list = (projects ?? []).filter((p) => filter === "all" || p.status === filter);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => setCreating(true)}
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

      {creating && <ProjectForm lang={lang} onDone={() => setCreating(false)} />}

      {list.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          {tp(lang, "empty")}
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {list.map((p) => (
            <Link
              key={p.id}
              to="/pmd/$id"
              params={{ id: String(p.id) }}
              className="rounded-2xl border border-border bg-card p-4 hover:border-primary/50"
            >
              <div className="mb-2 flex items-start justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2">
                  <FolderKanban size={18} className="shrink-0 text-primary" />
                  <span className="truncate text-sm font-semibold">{p.name}</span>
                </div>
                <span className={`shrink-0 rounded-lg border px-2 py-0.5 text-[10px] ${statusTone(p.status)}`}>
                  {tp(lang, p.status)}
                </span>
              </div>
              <p className="font-mono text-xs text-muted-foreground">{p.code}</p>
              {p.location && <p className="mt-1 truncate text-xs text-muted-foreground">{p.location}</p>}
              <p className="mt-2 text-xs text-muted-foreground">
                {tp(lang, "manager")}: {p.managerName || "—"}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function ProjectForm({ lang, onDone }: { lang: "en" | "id"; onDone: () => void }) {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [location, setLocation] = useState("");
  const [summary, setSummary] = useState("");
  const [startAt, setStartAt] = useState("");
  const [targetAt, setTargetAt] = useState("");
  const [managerId, setManagerId] = useState("");
  const [managerName, setManagerName] = useState("");
  const [participantIds, setParticipantIds] = useState<number[]>([]);
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
      name: name.trim(),
      code: code.trim().toUpperCase(),
      location: location.trim() || undefined,
      summary: summary.trim() || undefined,
      createdAt: Date.now(),
      startAt: startAt ? new Date(startAt).getTime() : undefined,
      targetAt: targetAt ? new Date(targetAt).getTime() : undefined,
      managerId: managerId.trim() || undefined,
      managerName: managerName.trim() || undefined,
      participantIds,
      properties: [],
      budget: [],
      status: "active",
    };
    await getPmdDb().projects.add(project);
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

function SettingsTab({ lang }: { lang: "en" | "id" }) {
  const session = usePmdSession();
  const [fullName, setFullName] = useState(session?.fullName ?? "");
  const [company, setCompany] = useState(session?.company ?? "");
  const [position, setPosition] = useState(session?.position ?? "");
  const [whatsapp, setWhatsapp] = useState(session?.whatsapp ?? "");
  const [email, setEmail] = useState(session?.email ?? "");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [pinBusy, setPinBusy] = useState(false);
  const [pinNote, setPinNote] = useState<string | null>(null);
  const [pinError, setPinError] = useState<string | null>(null);

  if (!session) return null;

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setNote(null);
    setError(null);
    const res = await updatePmdProfile({ data: { userId: session!.userId, fullName, company, position, whatsapp, email } });
    setBusy(false);
    if (!res.ok) { setError(res.error); return; }
    setPmdSession(res.profile);
    setNote(lang === "id" ? "Profil tersimpan." : "Profile saved.");
  }

  async function savePin(e: React.FormEvent) {
    e.preventDefault();
    setPinBusy(true);
    setPinNote(null);
    setPinError(null);
    const res = await changePmdPin({ data: { userId: session!.userId, currentPin, newPin } });
    setPinBusy(false);
    if (!res.ok) { setPinError(res.error); return; }
    setCurrentPin(""); setNewPin("");
    setPinNote(lang === "id" ? "PIN berhasil diubah." : "PIN changed successfully.");
  }

  return (
    <div className="space-y-4 max-w-md">
      <div className="rounded-2xl border border-border bg-card p-4">
        <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">User ID</p>
        <p className="text-lg font-mono font-bold tracking-widest">{session.userId}</p>
      </div>

      <form onSubmit={saveProfile} className="rounded-2xl border border-border bg-card p-4 space-y-2">
        <p className="text-sm font-semibold mb-1">{lang === "id" ? "Edit Profil" : "Edit Profile"}</p>
        <input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder={lang === "id" ? "Nama" : "Full Name"} required className={FIELD} />
        <input value={company} onChange={(e) => setCompany(e.target.value)} placeholder={lang === "id" ? "Perusahaan" : "Company"} className={FIELD} />
        <input value={position} onChange={(e) => setPosition(e.target.value)} placeholder={lang === "id" ? "Jabatan" : "Position"} className={FIELD} />
        <input value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder={lang === "id" ? "No. WhatsApp" : "WhatsApp Number"} required className={FIELD} />
        <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="Email" required className={FIELD} />
        {note && <p className="text-xs text-primary">{note}</p>}
        {error && <p className="text-xs text-destructive">{error}</p>}
        <button type="submit" disabled={busy} className="w-full rounded-xl bg-primary text-primary-foreground py-2.5 text-sm font-semibold disabled:opacity-50">
          {busy ? "…" : lang === "id" ? "Simpan Profil" : "Save Profile"}
        </button>
      </form>

      <form onSubmit={savePin} className="rounded-2xl border border-border bg-card p-4 space-y-2">
        <p className="text-sm font-semibold mb-1">{lang === "id" ? "Ganti PIN" : "Change PIN"}</p>
        <input value={currentPin} onChange={(e) => setCurrentPin(e.target.value.replace(/\D/g, "").slice(0, 6))} placeholder={lang === "id" ? "PIN saat ini" : "Current PIN"} inputMode="numeric" required className={FIELD + " font-mono tracking-widest"} />
        <input value={newPin} onChange={(e) => setNewPin(e.target.value.replace(/\D/g, "").slice(0, 6))} placeholder={lang === "id" ? "PIN baru 6 digit" : "New 6-digit PIN"} inputMode="numeric" required className={FIELD + " font-mono tracking-widest"} />
        {pinNote && <p className="text-xs text-primary">{pinNote}</p>}
        {pinError && <p className="text-xs text-destructive">{pinError}</p>}
        <button type="submit" disabled={pinBusy} className="w-full rounded-xl bg-primary text-primary-foreground py-2.5 text-sm font-semibold disabled:opacity-50">
          {pinBusy ? "…" : lang === "id" ? "Simpan PIN Baru" : "Save New PIN"}
        </button>
      </form>

      <button
        onClick={() => clearPmdSession()}
        className="w-full rounded-xl border border-destructive/40 text-destructive py-2.5 text-sm font-semibold"
      >
        {lang === "id" ? "Keluar" : "Sign Out"}
      </button>
    </div>
  );
}
