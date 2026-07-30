// Shared building blocks for every School dashboard (HoS, Admin HoS,
// Principal, Teacher, Parent). Extracted out of the old single-file
// /school route so each role can live on its own URL.
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  Shield, Users, Trash2, UserPlus, Upload, Send, Megaphone, Bell, X, GraduationCap,
  KeyRound, Copy, Check, Pencil, Power, Eye,
} from "lucide-react";
import { getStoredSchoolPassword, changeSchoolPin, useSchoolSession } from "@/lib/school-store";
import { usePreview } from "@/lib/preview-context";
import { getStaffProfileForViewer, getStudentProfileForViewer, saveStaffStatus, saveStudentStatus } from "@/lib/school-profile.functions";
import { CREATABLE_ROLES, ROLE_LABELS, roleLabel, type SchoolRole } from "@/lib/school-roles";
import {
  listSchoolClasses, createSchoolClass, listSchoolStaff, deleteSchoolStaff,
  listSchoolStudents, upsertSchoolStudent, deleteSchoolStudent, importSchoolStudents, seedStellaMarisPhase1,
  listGuardians, deleteGuardian,
  listAllActivities, postAnnouncement, listAnnouncements,
  listMessagesForStudent, postMessageAsTeacher, closeThreadAsTeacher,
  listMessagesForCode, postMessageAsParent, closeThreadAsParent,
  debugSupabaseUrl,
} from "@/lib/school.functions";
import {
  createStaffAccount, updateStaffAccount, ensureStaffUserId,
  inviteParentAccount, updateGuardianAccount, listAllPersonnel,
} from "@/lib/school-accounts.functions";

export type AdminSubrole = "hos" | "admin_hos" | "principal";

// Considered "online" if a heartbeat landed within the last 2 minutes.
function isRecentlyOnline(lastSeenAt?: string | null): boolean {
  if (!lastSeenAt) return false;
  return Date.now() - new Date(lastSeenAt).getTime() < 2 * 60 * 1000;
}

export const DIVISIONS = [
  { id: "kindergarten", label: "Kindergarten" },
  { id: "primary", label: "Primary (1–6)" },
  { id: "secondary", label: "Secondary / Junior High (7–10)" },
  { id: "ib", label: "IB Diploma (11–12)" },
  { id: "All Divisions", label: "All Divisions" },
];

export const ROLE_LABEL = ROLE_LABELS;
export { roleLabel };

export function getStoredPassword(): string {
  return getStoredSchoolPassword();
}

export function getSchoolIdSync(): string {
  if (typeof window === "undefined") return "";
  return sessionStorage.getItem("noble.school.id") || "";
}


/* ───────────── generic hooks / atoms ───────────── */
export function useAsync<T>(fn: () => Promise<T> | null, deps: unknown[]): { data: T | null; loading: boolean } {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let cancelled = false;
    const p = fn();
    if (!p) { setData(null); setLoading(false); return; }
    setLoading(true);
    p.then((res) => { if (!cancelled) { setData(res); setLoading(false); } });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return { data, loading };
}

export function usePolling<T>(fn: () => Promise<T> | null, deps: unknown[], intervalMs: number): { data: T | null; loading: boolean } {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let cancelled = false;
    const run = () => {
      const p = fn();
      if (!p) return;
      p.then((res) => { if (!cancelled) { setData(res); setLoading(false); } });
    };
    run();
    const id = setInterval(run, intervalMs);
    return () => { cancelled = true; clearInterval(id); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return { data, loading };
}

export function Section({ title, Icon, children }: { title: string; Icon: typeof Shield; children: React.ReactNode }) {
  return (
    <section className="mb-5">
      <div className="flex items-center gap-2 mb-2"><Icon size={14} className="text-primary" /><h3 className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">{title}</h3></div>
      {children}
    </section>
  );
}

export function Hint({ children }: { children: React.ReactNode }) {
  return <p className="text-xs text-muted-foreground text-center py-4">{children}</p>;
}

export function StatCard({ label, value, Icon }: { label: string; value: number; Icon: typeof Shield }) {
  return (
    <div className="rounded-2xl bg-card border border-border p-4">
      <Icon size={16} className="text-primary mb-2" />
      <p className="text-2xl font-semibold">{value}</p>
      <p className="text-xs text-muted-foreground mt-1">{label}</p>
    </div>
  );
}

export function Tabs({ tabs, tab, onChange, children }: { tabs: { id: string; label: string }[]; tab: string; onChange: (id: string) => void; children?: ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row gap-4">
      <div className="flex flex-wrap sm:flex-col gap-1.5 sm:gap-1 sm:w-40 shrink-0 sm:border-r sm:border-border sm:pr-3">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => onChange(t.id)}
            className={
              "shrink-0 sm:shrink sm:w-full sm:text-left rounded-full sm:rounded-lg px-3 py-1.5 text-xs font-semibold border " +
              (tab === t.id ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border")
            }
          >{t.label}</button>
        ))}
      </div>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}

export function ReadOnlyNote() {
  return (
    <p className="text-[11px] text-muted-foreground rounded-lg bg-secondary/50 px-3 py-2 mb-3">
      Tampilan hanya-baca — data akademik dibuat dan diubah oleh Guru.
    </p>
  );
}

/* ───────────── classes ───────────── */
export function useClasses(division?: string | null) {
  const pw = getStoredPassword();
  const res = useAsync(() => listSchoolClasses({ data: { password: pw } }), [pw]);
  const all = (res.data && "classes" in res.data ? (res.data.classes ?? []) : []) as { id: string; name: string; division: string; level?: string }[];
  return division && division !== "All Divisions" ? all.filter((c) => c.division === division) : all;
}

export function ClassManagerPrincipal({ division, classes }: { division: string; classes: { id: string; name: string; level?: string }[] }) {
  const pw = getStoredPassword();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [reload, setReload] = useState(0);
  async function add() {
    if (!name.trim()) return;
    setBusy(true);
    await createSchoolClass({ data: { password: pw, schoolId: getSchoolIdSync(), name: name.trim(), division } });
    setBusy(false); setName(""); setReload((x) => x + 1);
  }
  return (
    <div key={reload}>
      <div className="rounded-2xl bg-card border border-border p-3 mb-3 flex gap-2">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nama kelas (mis. K1 Sunflower)" className="flex-1 rounded-lg bg-background border border-border px-3 py-1.5 text-sm" />
        <button onClick={add} disabled={busy} className="rounded-lg bg-primary text-primary-foreground px-3 py-1.5 text-sm font-semibold disabled:opacity-50">Tambah</button>
      </div>
      <ul className="space-y-2">
        {classes.map((c) => <li key={c.id} className="rounded-xl bg-card border border-border p-3 text-sm">{c.name}{c.level ? " - " + c.level.toUpperCase() : ""}</li>)}
        {classes.length === 0 && <Hint>Belum ada kelas di divisi ini.</Hint>}
      </ul>
    </div>
  );
}

/* ───────────── staff ───────────── */
type StaffRow = {
  id: string; full_name: string; role: SchoolRole; division?: string; class_id?: string | null;
  user_id?: string | null; pin_is_default?: boolean; is_active?: boolean; subjects?: string[] | null; email?: string | null;
};

export function CredentialCard({ userId, pin, onDismiss }: { userId: string; pin: string; onDismiss?: () => void }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(`UserID: ${userId} · PIN: ${pin}`);
      setCopied(true); setTimeout(() => setCopied(false), 1200);
    } catch { /* clipboard unavailable */ }
  }
  return (
    <div className="rounded-xl border border-primary/40 bg-primary/10 p-3 text-xs space-y-2">
      <p className="font-semibold text-primary">Akun berhasil dibuat</p>
      <p>UserID: <code className="font-mono font-semibold">{userId}</code> · PIN default: <code className="font-mono font-semibold">{pin}</code></p>
      <p className="text-destructive font-semibold">Segera ganti PIN setelah login pertama.</p>
      <div className="flex gap-2">
        <button onClick={copy} className="rounded-lg border border-border px-2 py-1 flex items-center gap-1">{copied ? <Check size={12} /> : <Copy size={12} />} Salin</button>
        {onDismiss && <button onClick={onDismiss} className="text-muted-foreground underline">Tutup</button>}
      </div>
    </div>
  );
}

export function StaffRoster({
  canEdit, classes, scopeDivision, roleOptions,
}: {
  canEdit: boolean;
  classes: { id: string; name: string }[];
  scopeDivision: string | null;
  roleOptions?: { v: SchoolRole; label: string }[];
}) {
  const pw = getStoredPassword();
  const [reload, setReload] = useState(0);
  const staff = useAsync(() => listSchoolStaff({ data: { password: pw } }), [pw, reload]);
  const options: { v: SchoolRole; label: string }[] = roleOptions ?? (scopeDivision
    ? [{ v: "teacher_homeroom", label: "Homeroom Teacher" }, { v: "teacher_subject", label: "Subject Teacher" }]
    : CREATABLE_ROLES);
  const [name, setName] = useState("");
  const [role, setRole] = useState<SchoolRole>(options[0]?.v ?? "principal");
  const [division, setDivision] = useState(scopeDivision ?? "kindergarten");
  const [classId, setClassId] = useState("");
  const [subjects, setSubjects] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [created, setCreated] = useState<{ userId: string; pin: string } | null>(null);

  const isSchoolWide = role === "hos" || role === "vice_hos" || role === "admin_hos";
  const isHomeroom = role === "teacher_homeroom";
  const isSubject = role === "teacher_subject";

  async function add() {
    if (!name.trim()) return;
    setBusy(true); setErr(null);
    const res = await createStaffAccount({
      data: {
        password: pw, schoolId: getSchoolIdSync(), fullName: name.trim(), role,
        division: isSchoolWide ? "All Divisions" : (scopeDivision ?? division),
        email: email || undefined,
        classId: isHomeroom ? (classId || undefined) : undefined,
        subjects: isSubject ? subjects.split(",").map((s) => s.trim()).filter(Boolean) : [],
      },
    });
    setBusy(false);
    if (!res.ok) { setErr(res.error); return; }
    setCreated({ userId: res.userId, pin: res.defaultPin });
    setName(""); setClassId(""); setSubjects(""); setEmail(""); setReload((x) => x + 1);
  }
  async function remove(id: string) {
    await deleteSchoolStaff({ data: { password: pw, id } });
    setReload((x) => x + 1);
  }
  const list = (staff.data && "staff" in staff.data ? (staff.data.staff ?? []) : []) as StaffRow[];
  const filtered = scopeDivision ? list.filter((s) => s.division === scopeDivision) : list;
  return (
    <div>
      {canEdit && (
        <div className="rounded-2xl bg-card border border-border p-3 mb-3 grid gap-2">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nama lengkap" className="rounded-lg bg-background border border-border px-3 py-1.5 text-sm" />
          <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email (dipakai untuk reset PIN)" className="rounded-lg bg-background border border-border px-3 py-1.5 text-sm" />
          <div className="grid grid-cols-2 gap-2">
            <select value={role} onChange={(e) => setRole(e.target.value as SchoolRole)} className="rounded-lg bg-background border border-border px-2 py-1.5 text-sm">
              {options.map((r) => <option key={r.v} value={r.v}>{r.label}</option>)}
            </select>
            {!isSchoolWide && !scopeDivision && (
              <select value={division} onChange={(e) => setDivision(e.target.value)} className="rounded-lg bg-background border border-border px-2 py-1.5 text-sm">
                {DIVISIONS.filter((d) => d.id !== "All Divisions").map((d) => <option key={d.id} value={d.id}>{d.label}</option>)}
              </select>
            )}
            {isHomeroom && (
              <select value={classId} onChange={(e) => setClassId(e.target.value)} className="rounded-lg bg-background border border-border px-2 py-1.5 text-sm">
                <option value="">assign kelas (opsional)</option>
                {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            )}
          </div>
          {isSubject && (
            <input value={subjects} onChange={(e) => setSubjects(e.target.value)} placeholder="Mata pelajaran, pisahkan dengan koma (mis. Math, Science)" className="rounded-lg bg-background border border-border px-3 py-1.5 text-sm" />
          )}
          <p className="text-[11px] text-muted-foreground">UserID dibuat otomatis (5 huruf + 3 angka). PIN awal <code className="font-mono">123456</code> — wajib diganti saat login pertama.</p>
          <button onClick={add} disabled={busy} className="justify-self-start rounded-lg bg-primary text-primary-foreground px-3 py-1.5 text-sm font-semibold disabled:opacity-50 flex items-center gap-1"><UserPlus size={13} /> Buat Akun Staff</button>
          {err && <p className="text-xs text-destructive">{err}</p>}
          {created && <CredentialCard userId={created.userId} pin={created.pin} onDismiss={() => setCreated(null)} />}
        </div>
      )}
      <ul className="space-y-2">
        {filtered.map((s) => (
          <StaffRow key={s.id} staff={s} classes={classes} canEdit={canEdit} onChanged={() => setReload((x) => x + 1)} onRemove={() => remove(s.id)} />
        ))}
        {filtered.length === 0 && <Hint>Belum ada staff.</Hint>}
      </ul>
    </div>
  );
}

export function StaffProfilePreviewButton({ staffId, fullName }: { staffId: string; fullName: string }) {
  const pw = getStoredPassword();
  const { session } = useSchoolSession();
  const { openPreview } = usePreview();
  if (!session || session.kind !== "staff") return null;
  return (
    <button
      onClick={(e) => { e.stopPropagation(); openPreview({ title: fullName, body: <StaffProfilePreviewBody pw={pw} viewerId={session.id} targetStaffId={staffId} /> }); }}
      className="text-muted-foreground" aria-label="Lihat Profile"
    >
      <Eye size={14} />
    </button>
  );
}

const STATUS_SUGGESTIONS = ["Active", "Inactive", "Leave"];

function StatusNoteEditor({ status, note, canEdit, onSave }: { status: string; note?: string; canEdit: boolean; onSave: (status: string, note: string) => Promise<void> }) {
  const [s, setS] = useState(status || "Active");
  const [n, setN] = useState(note || "");
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  if (!canEdit) {
    return (
      <div className="rounded-lg bg-secondary/40 px-3 py-2">
        <p className="text-xs"><span className="text-muted-foreground">Status: </span>{status || "Active"}</p>
        {note && <p className="text-xs mt-1"><span className="text-muted-foreground">Note: </span>{note}</p>}
      </div>
    );
  }
  return (
    <div className="rounded-lg bg-secondary/40 px-3 py-2 grid gap-2">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">Status & Note</p>
      <input list="status-suggestions" value={s} onChange={(e) => setS(e.target.value)} placeholder="Status (pilih atau ketik kategori baru)" className="rounded-lg bg-background border border-border px-2 py-1.5 text-xs" />
      <datalist id="status-suggestions">
        {STATUS_SUGGESTIONS.map((o) => <option key={o} value={o} />)}
      </datalist>
      <textarea value={n} onChange={(e) => setN(e.target.value)} rows={2} placeholder="Catatan (opsional)" className="rounded-lg bg-background border border-border px-2 py-1.5 text-xs" />
      <button
        onClick={async () => { setBusy(true); await onSave(s, n); setBusy(false); setSaved(true); setTimeout(() => setSaved(false), 1500); }}
        disabled={busy} className="rounded-lg bg-primary text-primary-foreground px-3 py-1.5 text-xs font-semibold justify-self-start"
      >
        {saved ? "Tersimpan" : "Simpan"}
      </button>
    </div>
  );
}

function StaffProfilePreviewBody({ pw, viewerId, targetStaffId }: { pw: string; viewerId: string; targetStaffId: string }) {
  const [reload, setReload] = useState(0);
  const { session } = useSchoolSession();
  const res = useAsync(() => getStaffProfileForViewer({ data: { password: pw, viewerId, targetStaffId } }), [pw, viewerId, targetStaffId, reload]);
  const p = res.data && "ok" in res.data && res.data.ok ? res.data.profile : null;
  if (!p) return <Hint>Memuat profile…</Hint>;
  const canEditStatus = !!session && (session.role === "hos" || (session.role === "principal" && session.division === p.division));
  const rows: [string, unknown][] = [
    ["Nama", p.full_name], ["Panggilan", p.nickname], ["Jenis kelamin", p.gender],
    ["Tempat, tanggal lahir", [p.birthplace, p.birth_date].filter(Boolean).join(", ")],
    ["Alamat tinggal", p.home_address], ["Alamat KTP", p.id_card_address],
    ["WhatsApp", p.whatsapp], ["Email", p.email], ["Agama", p.religion],
    ["Alergi", p.allergies], ["Catatan kesehatan", p.health_notes],
  ];
  return (
    <div className="space-y-3">
      {p.photo_url && <img src={p.photo_url} alt={p.full_name} className="w-24 h-24 rounded-full object-cover border border-border" />}
      <ul className="space-y-1.5 text-sm">
        {rows.filter(([, v]) => v).map(([label, v]) => (
          <li key={label}><span className="text-muted-foreground text-xs">{label}: </span>{String(v)}</li>
        ))}
      </ul>
      <StatusNoteEditor
        status={p.status} note={p.admin_note} canEdit={canEditStatus}
        onSave={async (status, note) => { await saveStaffStatus({ data: { password: pw, viewerId, targetStaffId, status, note } }); setReload((x) => x + 1); }}
      />
    </div>
  );
}

export function StudentProfilePreviewButton({ studentId, fullName }: { studentId: string; fullName: string }) {
  const pw = getStoredPassword();
  const { session } = useSchoolSession();
  const { openPreview } = usePreview();
  if (!session || session.kind !== "staff") return null;
  return (
    <button
      onClick={(e) => { e.stopPropagation(); openPreview({ title: fullName, body: <StudentProfilePreviewBody pw={pw} viewerId={session.id} targetStudentId={studentId} /> }); }}
      className="text-muted-foreground" aria-label="Lihat Profile"
    >
      <Eye size={14} />
    </button>
  );
}

function StudentProfilePreviewBody({ pw, viewerId, targetStudentId }: { pw: string; viewerId: string; targetStudentId: string }) {
  const [reload, setReload] = useState(0);
  const { session } = useSchoolSession();
  const res = useAsync(() => getStudentProfileForViewer({ data: { password: pw, viewerId, targetStudentId } }), [pw, viewerId, targetStudentId, reload]);
  const p = res.data && "ok" in res.data && res.data.ok ? res.data.profile : null;
  if (!p) return <Hint>Memuat profile…</Hint>;
  const studentDivision = p.school_classes?.division;
  const canEditStatus = !!session && (session.role === "hos" || (session.role === "principal" && session.division === studentDivision));
  const rows: [string, unknown][] = [
    ["Nama", p.full_name], ["Panggilan", p.nickname], ["Jenis kelamin", p.gender],
    ["Tempat, tanggal lahir", [p.pob, p.dob].filter(Boolean).join(", ")],
    ["Alamat tinggal", p.address], ["Alamat KTP", p.id_card_address],
    ["WhatsApp", p.whatsapp], ["Agama", p.religion],
    ["Alergi", p.allergies], ["Catatan kesehatan", p.notes],
  ];
  return (
    <div className="space-y-3">
      {p.photo_url && <img src={p.photo_url} alt={p.full_name} className="w-24 h-24 rounded-full object-cover border border-border" />}
      <ul className="space-y-1.5 text-sm">
        {rows.filter(([, v]) => v).map(([label, v]) => (
          <li key={label}><span className="text-muted-foreground text-xs">{label}: </span>{String(v)}</li>
        ))}
      </ul>
      <StatusNoteEditor
        status={p.status} note={p.admin_note} canEdit={canEditStatus}
        onSave={async (status, note) => { await saveStudentStatus({ data: { password: pw, viewerId, targetStudentId, status, note } }); setReload((x) => x + 1); }}
      />
    </div>
  );
}

function StaffRow({ staff, classes, canEdit, onChanged, onRemove }: {
  staff: StaffRow; classes: { id: string; name: string }[]; canEdit: boolean; onChanged: () => void; onRemove: () => void;
}) {
  const pw = getStoredPassword();
  const [open, setOpen] = useState(false);
  const [role, setRole] = useState<SchoolRole>(staff.role as SchoolRole);
  const [division, setDivision] = useState(staff.division ?? "kindergarten");
  const [classId, setClassId] = useState(staff.class_id ?? "");
  const [subjects, setSubjects] = useState((staff.subjects ?? []).join(", "));
  const [msg, setMsg] = useState<string | null>(null);
  // Reflect the role/division picked in THIS edit panel, not the staff's
  // original role — so switching e.g. Vice Principal → Principal in the
  // dropdown immediately shows the right fields (class/subject pickers etc).
  const isHomeroom = role === "teacher_homeroom";
  const isSubject = role === "teacher_subject";
  const isSchoolWide = role === "hos" || role === "vice_hos" || role === "admin_hos";
  const roleChanged = role !== staff.role;
  const divisionChanged = !isSchoolWide && division !== (staff.division ?? "kindergarten");

  async function save() {
    await updateStaffAccount({
      data: {
        password: pw, id: staff.id,
        role: roleChanged ? role : undefined,
        division: roleChanged || divisionChanged ? (isSchoolWide ? "All Divisions" : division) : undefined,
        classId: isHomeroom ? (classId || null) : undefined,
        subjects: isSubject ? subjects.split(",").map((s) => s.trim()).filter(Boolean) : undefined,
      },
    });
    setMsg("Tersimpan.");
    onChanged();
  }
  async function toggleActive() {
    await updateStaffAccount({ data: { password: pw, id: staff.id, isActive: staff.is_active === false } });
    onChanged();
  }
  async function resetPin() {
    await updateStaffAccount({ data: { password: pw, id: staff.id, resetPin: true } });
    setMsg("PIN dikembalikan ke 123456.");
    onChanged();
  }
  async function makeUserId() {
    const res = await ensureStaffUserId({ data: { password: pw, id: staff.id } });
    setMsg(res.ok ? `UserID: ${res.userId} · PIN 123456` : res.error);
    onChanged();
  }

  return (
    <li className="rounded-xl bg-card border border-border p-3 text-sm">
      <div className="flex justify-between gap-2">
        <div>
          <p className="font-semibold flex items-center gap-1.5">
            <span className={"inline-block w-2 h-2 rounded-full shrink-0 " + (isRecentlyOnline(staff.last_seen_at) ? "bg-emerald-500" : "bg-muted-foreground/40")} title={isRecentlyOnline(staff.last_seen_at) ? "Online" : "Offline"} />
            {staff.full_name}{staff.is_active === false && <span className="ml-2 text-[10px] text-destructive">nonaktif</span>}
          </p>
          <p className="text-xs text-muted-foreground">
            {roleLabel(staff.role)}{staff.division ? " · " + (DIVISIONS.find((d) => d.id === staff.division)?.label ?? staff.division) : ""}
          </p>
          <p className="text-[11px] text-muted-foreground">
            UserID: <code className="font-mono">{staff.user_id || "belum ada"}</code>{staff.pin_is_default ? " · PIN default" : ""}
          </p>
          {isSubject && (staff.subjects?.length ?? 0) > 0 && <p className="text-[11px] text-muted-foreground">Subjects: {staff.subjects!.join(", ")}</p>}
        </div>
        {canEdit && (
          <div className="flex items-start gap-2">
            <StaffProfilePreviewButton staffId={staff.id} fullName={staff.full_name} />
            <button onClick={() => setOpen((v) => !v)} className="text-muted-foreground" aria-label="Edit"><Pencil size={14} /></button>
            <button onClick={onRemove} className="text-destructive" aria-label="Hapus"><Trash2 size={14} /></button>
          </div>
        )}
      </div>
      {canEdit && open && (
        <div className="mt-3 pt-3 border-t border-border grid gap-2">
          <div>
            <label className="text-[11px] text-muted-foreground">Role (bisa diubah kapan saja, misal penempatan berubah)</label>
            <select value={role} onChange={(e) => setRole(e.target.value as SchoolRole)} className="w-full mt-1 rounded-lg bg-background border border-border px-2 py-1.5 text-sm">
              {CREATABLE_ROLES.map((r) => <option key={r.v} value={r.v}>{r.label}</option>)}
            </select>
          </div>
          {!isSchoolWide && (
            <select value={division} onChange={(e) => setDivision(e.target.value)} className="rounded-lg bg-background border border-border px-2 py-1.5 text-sm">
              {DIVISIONS.filter((d) => d.id !== "All Divisions").map((d) => <option key={d.id} value={d.id}>{d.label}</option>)}
            </select>
          )}
          {isHomeroom && (
            <select value={classId} onChange={(e) => setClassId(e.target.value)} className="rounded-lg bg-background border border-border px-2 py-1.5 text-sm">
              <option value="">tanpa kelas</option>
              {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          )}
          {isSubject && (
            <input value={subjects} onChange={(e) => setSubjects(e.target.value)} placeholder="Mata pelajaran (pisahkan koma)" className="rounded-lg bg-background border border-border px-3 py-1.5 text-sm" />
          )}
          {roleChanged && (
            <p className="text-[11px] rounded-lg bg-primary/10 text-primary px-3 py-2">
              Role akan berubah dari <span className="font-semibold">{roleLabel(staff.role)}</span> menjadi <span className="font-semibold">{roleLabel(role)}</span>.
            </p>
          )}
          <div className="flex gap-2 flex-wrap">
            <button onClick={save} className="rounded-lg bg-primary text-primary-foreground px-3 py-1.5 text-xs font-semibold">Simpan</button>
            <button onClick={toggleActive} className="rounded-lg border border-border px-3 py-1.5 text-xs flex items-center gap-1"><Power size={12} /> {staff.is_active === false ? "Aktifkan" : "Nonaktifkan"}</button>
            <button onClick={resetPin} className="rounded-lg border border-border px-3 py-1.5 text-xs flex items-center gap-1"><KeyRound size={12} /> Reset PIN</button>
            {!staff.user_id && <button onClick={makeUserId} className="rounded-lg border border-border px-3 py-1.5 text-xs">Buatkan UserID</button>}
          </div>
          {msg && <p className="text-xs text-primary">{msg}</p>}
        </div>
      )}
    </li>
  );
}


/* ───────────── students ───────────── */
export function StudentRoster({ canEdit, classes }: { canEdit: boolean; classes: { id: string; name: string }[] }) {
  const pw = getStoredPassword();
  const [reload, setReload] = useState(0);
  const [classId, setClassId] = useState("");
  const students = useAsync(() => listSchoolStudents({ data: { password: pw, classId: classId || undefined } }), [pw, classId, reload]);
  const staffRes = useAsync(() => (classId ? listSchoolStaff({ data: { password: pw } }) : Promise.resolve(null)), [pw, classId]);
  const classTeachers = (staffRes.data && "staff" in staffRes.data ? (staffRes.data.staff ?? []) : []).filter((s: { class_id?: string }) => s.class_id === classId) as { id: string; full_name: string; role: string }[];
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [studentNumber, setStudentNumber] = useState("");
  async function add() {
    if (!name.trim() || !classId) return;
    await upsertSchoolStudent({ data: { password: pw, schoolId: getSchoolIdSync(), classId, fullName: name.trim(), studentNumber: studentNumber || undefined } });
    setName(""); setStudentNumber(""); setAdding(false); setReload((x) => x + 1);
  }
  async function remove(id: string) {
    await deleteSchoolStudent({ data: { password: pw, id } });
    setReload((x) => x + 1);
  }
  const list = (students.data && "students" in students.data ? (students.data.students ?? []) : []) as { id: string; full_name: string; student_number?: string }[];
  return (
    <div>
      <select value={classId} onChange={(e) => setClassId(e.target.value)} className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm mb-3">
        <option value="">all classes</option>
        {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
      </select>
      {classId && (
        <div className="rounded-xl bg-secondary/40 px-3 py-2 mb-3">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold mb-1">Teachers</p>
          {classTeachers.length > 0 ? (
            <p className="text-sm">{classTeachers.map((t) => t.full_name + (t.role === "teacher_homeroom" ? " (Homeroom)" : " (Subject)")).join(", ")}</p>
          ) : (
            <p className="text-xs text-muted-foreground">No teacher assigned to this class yet.</p>
          )}
        </div>
      )}
      {canEdit && (
        <div className="mb-3">
          {!adding ? (
            <button onClick={() => setAdding(true)} disabled={!classId} className="rounded-full border border-border px-3 py-1.5 text-xs flex items-center gap-1 disabled:opacity-40"><UserPlus size={13} /> Add Student {!classId ? "(pick a class first)" : ""}</button>
          ) : (
            <div className="flex gap-2 flex-wrap">
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" className="flex-1 min-w-40 rounded-lg bg-background border border-border px-3 py-1.5 text-sm" />
              <input value={studentNumber} onChange={(e) => setStudentNumber(e.target.value)} placeholder="Student ID" className="w-32 rounded-lg bg-background border border-border px-3 py-1.5 text-sm" />
              <button onClick={add} className="rounded-lg bg-primary text-primary-foreground px-3 py-1.5 text-sm font-semibold">Save</button>
            </div>
          )}
        </div>
      )}
      <ul className="space-y-2">
        {list.map((s) => <StudentRow key={s.id} student={s} canEdit={canEdit} onDelete={() => remove(s.id)} />)}
        {list.length === 0 && <Hint>No students yet.</Hint>}
      </ul>
    </div>
  );
}

function StudentRow({ student, canEdit, onDelete }: { student: { id: string; full_name: string; student_number?: string }; canEdit: boolean; onDelete: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <li className="rounded-xl bg-card border border-border p-3">
      <div onClick={() => setOpen((v) => !v)} className="w-full flex items-center justify-between cursor-pointer">
        <div className="text-left"><p className="text-sm font-semibold">{student.full_name}</p>{student.student_number && <p className="text-xs text-muted-foreground">{student.student_number}</p>}</div>
        <div className="flex items-center gap-2">
          <StudentProfilePreviewButton studentId={student.id} fullName={student.full_name} />
          <span className="text-xs text-muted-foreground">{open ? "v" : ">"}</span>
        </div>
      </div>
      {open && (
        <div className="mt-3 pt-3 border-t border-border">
          <GuardianEditor studentId={student.id} canEdit={canEdit} />
          {canEdit && <button onClick={onDelete} className="mt-3 text-xs text-destructive flex items-center gap-1"><Trash2 size={12} /> Hapus murid</button>}
        </div>
      )}
    </li>
  );
}

/** Invite Parent — creates a login account (UserID + default PIN) for a guardian. */
export function GuardianEditor({ studentId, canEdit }: { studentId: string; canEdit: boolean }) {
  const pw = getStoredPassword();
  const [reload, setReload] = useState(0);
  const guardians = useAsync(() => listGuardians({ data: { password: pw, studentId } }), [pw, studentId, reload]);
  const [name, setName] = useState("");
  const [relation, setRelation] = useState<"father" | "mother" | "guardian">("mother");
  const [wa, setWa] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [created, setCreated] = useState<{ userId: string; pin: string } | null>(null);

  async function invite() {
    if (!name.trim()) return;
    setBusy(true); setErr(null);
    const res = await inviteParentAccount({
      data: { password: pw, studentId, fullName: name.trim(), relation, whatsapp: wa || undefined, email: email || undefined },
    });
    setBusy(false);
    if (!res.ok) { setErr(res.error); return; }
    setCreated({ userId: res.userId, pin: res.defaultPin });
    setName(""); setWa(""); setEmail(""); setReload((x) => x + 1);
  }
  async function remove(id: string) {
    await deleteGuardian({ data: { password: pw, id } });
    setReload((x) => x + 1);
  }
  async function resetPin(id: string) {
    await updateGuardianAccount({ data: { password: pw, id, resetPin: true } });
    setReload((x) => x + 1);
  }
  function shareAccount(g: { full_name: string; user_id?: string | null; invite_code: string }) {
    const text = encodeURIComponent(
      `Halo ${g.full_name}! Akun School Dashboard Anda sudah aktif.\nUserID: ${g.user_id || g.invite_code}\nPIN sementara: 123456\n\nPENTING: segera ganti PIN setelah login pertama (menu Ganti PIN).`,
    );
    window.open("https://wa.me/?text=" + text, "_blank", "noopener");
  }
  const list = (guardians.data && "guardians" in guardians.data ? (guardians.data.guardians ?? []) : []) as {
    id: string; full_name: string; relation: string; whatsapp?: string; email?: string | null;
    invite_code: string; invite_used_at?: string; user_id?: string | null; pin_is_default?: boolean;
  }[];

  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Orangtua / Wali</p>
      <ul className="space-y-2 mb-3">
        {list.map((g) => (
          <li key={g.id} className="rounded-lg bg-secondary/50 p-2 text-xs">
            <div className="flex items-center justify-between gap-2">
              <span>{g.full_name} - {g.relation}{g.whatsapp ? " - " + g.whatsapp : ""}</span>
              {canEdit && <button onClick={() => remove(g.id)} className="text-destructive shrink-0" aria-label="Hapus wali"><Trash2 size={12} /></button>}
            </div>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <code className="font-mono bg-background rounded px-1.5 py-0.5">{g.user_id || "belum ada UserID"}</code>
              {g.pin_is_default && <span className="text-destructive">PIN masih default</span>}
              {g.invite_used_at && <span className="text-primary">sudah login</span>}
              {canEdit && <button onClick={() => resetPin(g.id)} className="text-muted-foreground flex items-center gap-1"><KeyRound size={11} /> Reset PIN</button>}
              <button onClick={() => shareAccount(g)} className="ml-auto text-primary flex items-center gap-1"><Send size={11} /> Kirim WA</button>
            </div>
          </li>
        ))}
        {list.length === 0 && <p className="text-xs text-muted-foreground">Belum ada wali.</p>}
      </ul>
      {canEdit && (
        <div className="grid grid-cols-2 gap-2">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nama wali" className="rounded-lg bg-background border border-border px-2 py-1 text-xs" />
          <select value={relation} onChange={(e) => setRelation(e.target.value as "father" | "mother" | "guardian")} className="rounded-lg bg-background border border-border px-2 py-1 text-xs">
            <option value="mother">Ibu</option><option value="father">Ayah</option><option value="guardian">Wali</option>
          </select>
          <input value={wa} onChange={(e) => setWa(e.target.value)} placeholder="No. WhatsApp" className="rounded-lg bg-background border border-border px-2 py-1 text-xs" />
          <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email (untuk reset PIN)" className="rounded-lg bg-background border border-border px-2 py-1 text-xs" />
          <button onClick={invite} disabled={busy} className="col-span-2 rounded-lg bg-primary text-primary-foreground px-3 py-1.5 text-xs font-semibold disabled:opacity-50 flex items-center justify-center gap-1">
            <UserPlus size={12} /> {busy ? "Membuat akun…" : "Invite Parent (buat UserID + PIN)"}
          </button>
          {err && <p className="col-span-2 text-xs text-destructive">{err}</p>}
          {created && <div className="col-span-2"><CredentialCard userId={created.userId} pin={created.pin} onDismiss={() => setCreated(null)} /></div>}
        </div>
      )}
    </div>
  );
}


/* ───────────── import ───────────── */
export function CsvImportPanel({ classes }: { classes: { id: string; name: string }[] }) {
  const pw = getStoredPassword();
  const fileRef = useRef<HTMLInputElement>(null);
  const [result, setResult] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [seedResult, setSeedResult] = useState<string | null>(null);
  const [debugUrl, setDebugUrl] = useState<string | null>(null);
  const [debugKeyTail, setDebugKeyTail] = useState<string | null>(null);

  async function runDebug() {
    const res = await debugSupabaseUrl();
    setDebugUrl(res.url || "(kosong / belum diset)");
    setDebugKeyTail(res.keyTail || "(kosong / belum diset)");
  }

  async function runSeed() {
    setSeeding(true);
    setSeedResult(null);
    const res = await seedStellaMarisPhase1({ data: { password: pw, schoolId: getSchoolIdSync() } });
    setSeeding(false);
    setSeedResult(res.ok
      ? (res.classesAdded + " kelas baru, " + res.teachersAdded + " guru baru, " + res.studentsAdded + " murid baru ditambahkan (" + res.studentsSkipped + " sudah ada sebelumnya).\n\n[DEBUG] " + res.debug)
      : ("Gagal: " + res.error));
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    const text = await file.text();
    const lines = text.split(/\r?\n/).filter((l) => l.trim());
    const headerLine = lines[0];
    const dataLines = lines.slice(1);
    const headers = headerLine.split(",").map((h) => h.trim().toLowerCase());
    const idx = (key: string) => headers.indexOf(key);
    const rows = dataLines.map((line) => {
      const cols = line.split(",").map((c) => c.trim());
      return {
        studentNumber: idx("studentnumber") >= 0 ? cols[idx("studentnumber")] : undefined,
        fullName: cols[idx("fullname")] ?? "",
        nickname: idx("nickname") >= 0 ? cols[idx("nickname")] : undefined,
        gender: (idx("gender") >= 0 ? cols[idx("gender")] : undefined) as "M" | "F" | undefined,
        className: cols[idx("classname")] ?? "",
      };
    });
    const res = await importSchoolStudents({ data: { password: pw, schoolId: getSchoolIdSync(), rows } });
    setBusy(false);
    setResult(res.ok ? (res.imported + " murid diimpor, " + res.skipped + " dilewati.") : ("Gagal: " + res.error));
    e.target.value = "";
  }
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-accent/40 bg-accent/10 p-4">
        <p className="text-sm font-semibold mb-2">Debug: Cek Koneksi Database</p>
        <button onClick={runDebug} className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold">Tampilkan URL Backend yang Dipakai</button>
        {debugUrl && (
          <div className="mt-2 space-y-1">
            <p className="text-xs font-mono break-all bg-background rounded-lg p-2">URL: {debugUrl}</p>
            <p className="text-xs font-mono break-all bg-background rounded-lg p-2">Key (6 huruf terakhir): {debugKeyTail}</p>
          </div>
        )}
      </div>

      <div className="rounded-2xl bg-card border border-border p-4">
        <p className="text-sm font-semibold mb-2">Import Data Contoh (Stella Maris)</p>
        <p className="text-xs text-muted-foreground mb-3">Isi otomatis 9 kelas, guru per kelas, dan 133 murid sekaligus &mdash; aman dijalankan berkali-kali, data yang sudah ada dilewati.</p>
        <button onClick={runSeed} disabled={seeding} className="rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm font-semibold disabled:opacity-50">
          {seeding ? "Mengimpor" : "Import Data Contoh Sekarang"}
        </button>
        {seedResult && <p className="text-xs mt-3 whitespace-pre-wrap">{seedResult}</p>}
      </div>

      <div className="rounded-2xl bg-card border border-border p-4">
        <p className="text-sm font-semibold mb-2">Import Data Murid Sendiri (CSV)</p>
        <p className="text-xs text-muted-foreground mb-3">Kolom wajib: <code className="font-mono">fullName, className</code>. Opsional: <code className="font-mono">studentNumber, nickname, gender</code>.</p>
        <p className="text-[11px] text-muted-foreground mb-3">Kelas tersedia: {classes.map((c) => c.name).join(", ") || "(belum ada)"}</p>
        <button onClick={() => fileRef.current?.click()} disabled={busy} className="rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm font-semibold flex items-center gap-2 disabled:opacity-50"><Upload size={15} /> {busy ? "Mengimpor" : "Pilih File CSV"}</button>
        <input ref={fileRef} type="file" accept=".csv,text/csv,text/plain,application/vnd.ms-excel,text/comma-separated-values" onChange={handleFile} className="hidden" />
        {result && <p className="text-xs mt-3 whitespace-pre-wrap">{result}</p>}
      </div>
    </div>
  );
}

/* ───────────── activities & announcements ───────────── */
export function AllActivitiesView({ division }: { division: string | null }) {
  const pw = getStoredPassword();
  const [teacherId, setTeacherId] = useState("");
  const activities = useAsync(() => listAllActivities({ data: { password: pw, division: division || undefined } }), [pw, division]);
  const staffRes = useAsync(() => listSchoolStaff({ data: { password: pw } }), [pw]);
  const teacherList = ((staffRes.data && "staff" in staffRes.data ? (staffRes.data.staff ?? []) : []) as { id: string; full_name: string; role: string; division?: string }[])
    .filter((s) => s.role === "teacher_homeroom" || s.role === "teacher_subject")
    .filter((s) => !division || s.division === division);
  const selectedTeacher = teacherList.find((t) => t.id === teacherId);
  const list = ((activities.data && "activities" in activities.data ? (activities.data.activities ?? []) : []) as { id: string; title: string; body?: string; activity_date: string; author_name?: string; school_classes?: { name: string } }[])
    .filter((a) => !selectedTeacher || a.author_name === selectedTeacher.full_name);
  return (
    <div>
      <select value={teacherId} onChange={(e) => setTeacherId(e.target.value)} className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm mb-3">
        <option value="">Select Teacher</option>
        {teacherList.map((t) => <option key={t.id} value={t.id}>{t.full_name} ({t.role === "teacher_homeroom" ? "Homeroom" : "Subject"})</option>)}
      </select>
      {!teacherId ? (
        <Hint>Pick a teacher above to see their activity.</Hint>
      ) : (
        <ul className="space-y-2">
          {list.map((a) => (
            <li key={a.id} className="rounded-xl bg-card border border-border p-3">
              <div className="flex justify-between text-sm">
                <p className="font-semibold">{a.title}</p>
                <span className="text-xs text-muted-foreground">{a.school_classes?.name}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">{new Date(a.activity_date).toLocaleDateString()}{a.author_name ? " - " + a.author_name : ""}</p>
              {a.body && <p className="text-sm mt-2 whitespace-pre-wrap">{a.body}</p>}
            </li>
          ))}
          {list.length === 0 && <Hint>Belum ada activity.</Hint>}
        </ul>
      )}
    </div>
  );
}

export function AnnouncementPanel({ subrole, division, classes }: { subrole: AdminSubrole; division: string | null; classes: { id: string; name: string }[] }) {
  const pw = getStoredPassword();
  const [reload, setReload] = useState(0);
  const list = useAsync(() => listAnnouncements({ data: { password: pw } }), [pw, reload]);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const isPrincipal = subrole === "principal";
  const [audience, setAudience] = useState<"external" | "internal" | "principal">("external");
  const [scope, setScope] = useState<"school" | "division" | "class">(isPrincipal ? "division" : "school");
  const [classId, setClassId] = useState("");
  const [err, setErr] = useState<string | null>(null);

  async function post() {
    if (!title.trim()) return;
    setErr(null);
    const res = await postAnnouncement({
      data: { password: pw, subrole, schoolId: getSchoolIdSync(), audience, scope, division: scope === "division" ? (division ?? undefined) : undefined, classId: scope === "class" ? classId : undefined, title: title.trim(), body },
    });
    if (!res.ok) { setErr(res.error); return; }
    setTitle(""); setBody(""); setReload((x) => x + 1);
  }
  const items = (list.data && "announcements" in list.data ? (list.data.announcements ?? []) : []) as { id: string; title: string; body?: string; scope: string; audience?: string; created_at: string }[];
  const AUDIENCE_LABEL: Record<string, string> = { external: "External (Parent)", internal: "Internal (Staff)", principal: "Principal" };
  return (
    <div>
      <div className="rounded-2xl bg-card border border-border p-3 mb-3">
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Judul pengumuman" className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm mb-2" />
        <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={3} placeholder="Isi" className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm mb-2" />
        <div className="flex gap-2 flex-wrap">
          <select
            value={audience}
            onChange={(e) => { const v = e.target.value as typeof audience; setAudience(v); setScope(v === "principal" ? "school" : (isPrincipal ? "division" : "school")); }}
            className="rounded-lg bg-background border border-border px-2 py-1.5 text-sm"
          >
            <option value="external">External (Parent)</option>
            <option value="internal">Internal (Staff)</option>
            {!isPrincipal && <option value="principal">Principal</option>}
          </select>
          {audience !== "principal" && (
            <select value={scope} onChange={(e) => setScope(e.target.value as typeof scope)} className="rounded-lg bg-background border border-border px-2 py-1.5 text-sm">
              {!isPrincipal && <option value="school">Seluruh Sekolah</option>}
              <option value="division">Divisi Saya</option>
              <option value="class">Kelas Tertentu</option>
            </select>
          )}
          {audience !== "principal" && scope === "class" && (
            <select value={classId} onChange={(e) => setClassId(e.target.value)} className="rounded-lg bg-background border border-border px-2 py-1.5 text-sm">
              <option value="">pilih kelas</option>
              {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          )}
          <button onClick={post} className="rounded-lg bg-primary text-primary-foreground px-3 py-1.5 text-sm font-semibold flex items-center gap-1"><Megaphone size={13} /> Umumkan</button>
        </div>
        {audience === "principal" && <p className="text-[11px] text-muted-foreground mt-2">Dikirim ke semua Principal di seluruh sekolah.</p>}
        {err && <p className="text-xs text-destructive mt-2">{err}</p>}
      </div>
      <ul className="space-y-2">
        {items.map((a) => (
          <li key={a.id} className="rounded-xl bg-card border border-border p-3">
            <div className="flex justify-between text-sm"><p className="font-semibold">{a.title}</p><span className="text-[10px] uppercase text-muted-foreground">{AUDIENCE_LABEL[a.audience ?? "external"]}</span></div>
            <p className="text-xs text-muted-foreground">{new Date(a.created_at).toLocaleString()}</p>
            {a.body && <p className="text-sm mt-1">{a.body}</p>}
          </li>
        ))}
        {items.length === 0 && <Hint>Belum ada pengumuman.</Hint>}
      </ul>
    </div>
  );
}

/* ───────────── messaging ───────────── */
export function TeacherMessageThread({ studentId, staffName }: { studentId: string; staffName: string }) {
  const pw = getStoredPassword();
  const [reload, setReload] = useState(0);
  const msgs = usePolling(() => listMessagesForStudent({ data: { password: pw, studentId } }), [pw, studentId, reload], 6000);
  const [body, setBody] = useState("");
  const list = (msgs.data && "messages" in msgs.data ? (msgs.data.messages ?? []) : []) as { id: string; from_side: string; body: string; author_name?: string; closed_by_teacher: boolean }[];
  const unread = list.filter((m) => m.from_side === "parent" && !m.closed_by_teacher).length;

  async function send() {
    if (!body.trim()) return;
    await postMessageAsTeacher({ data: { password: pw, schoolId: getSchoolIdSync(), studentId, body: body.trim(), authorName: staffName } });
    setBody(""); setReload((x) => x + 1);
  }
  async function close() {
    await closeThreadAsTeacher({ data: { password: pw, studentId } });
    setReload((x) => x + 1);
  }
  return (
    <div>
      {unread > 0 && (
        <div className="flex items-center justify-between rounded-xl bg-primary/15 text-primary px-3 py-2 text-xs font-semibold mb-2">
          <span className="flex items-center gap-1.5"><Bell size={13} /> {unread} pesan baru dari orangtua</span>
          <button onClick={close} className="flex items-center gap-1"><X size={13} /> Tutup notifikasi</button>
        </div>
      )}
      <div className="rounded-2xl bg-card border border-border p-3 mb-2 space-y-2 max-h-72 overflow-y-auto">
        {list.map((m) => (
          <div key={m.id} className={"text-sm " + (m.from_side === "teacher" ? "text-right" : "")}>
            <div className={"inline-block rounded-2xl px-3 py-2 " + (m.from_side === "teacher" ? "bg-primary/15" : "bg-secondary")}>
              <p className="text-[10px] text-muted-foreground">{m.author_name || (m.from_side === "teacher" ? "Guru" : "Orangtua")}</p>
              <p>{m.body}</p>
            </div>
          </div>
        ))}
        {list.length === 0 && <p className="text-xs text-muted-foreground">Belum ada pesan.</p>}
      </div>
      <div className="flex gap-2">
        <input value={body} onChange={(e) => setBody(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} placeholder="Tulis pesan" className="flex-1 rounded-lg bg-background border border-border px-3 py-2 text-sm" />
        <button onClick={send} className="rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm font-semibold">Kirim</button>
      </div>
    </div>
  );
}

export function ParentMessageThread({ code }: { code: string }) {
  const [reload, setReload] = useState(0);
  const msgs = usePolling(() => listMessagesForCode({ data: { code } }), [code, reload], 6000);
  const [body, setBody] = useState("");
  const list = (msgs.data && "messages" in msgs.data ? (msgs.data.messages ?? []) : []) as { id: string; from_side: string; body: string; author_name?: string; closed_by_parent: boolean }[];
  const unread = list.filter((m) => m.from_side === "teacher" && !m.closed_by_parent).length;

  async function send() {
    if (!body.trim()) return;
    await postMessageAsParent({ data: { code, body: body.trim() } });
    setBody(""); setReload((x) => x + 1);
  }
  async function close() {
    await closeThreadAsParent({ data: { code } });
    setReload((x) => x + 1);
  }
  return (
    <div>
      {unread > 0 && (
        <div className="flex items-center justify-between rounded-xl bg-primary/15 text-primary px-3 py-2 text-xs font-semibold mb-2">
          <span className="flex items-center gap-1.5"><Bell size={13} /> {unread} pesan baru dari Guru</span>
          <button onClick={close} className="flex items-center gap-1"><X size={13} /> Tutup notifikasi</button>
        </div>
      )}
      <div className="rounded-2xl bg-card border border-border p-3 mb-2 space-y-2 max-h-72 overflow-y-auto">
        {list.map((m) => (
          <div key={m.id} className={"text-sm " + (m.from_side === "parent" ? "text-right" : "")}>
            <div className={"inline-block rounded-2xl px-3 py-2 " + (m.from_side === "parent" ? "bg-primary/15" : "bg-secondary")}>
              <p className="text-[10px] text-muted-foreground">{m.author_name || (m.from_side === "teacher" ? "Guru" : "Anda")}</p>
              <p>{m.body}</p>
            </div>
          </div>
        ))}
        {list.length === 0 && <p className="text-xs text-muted-foreground">Belum ada pesan.</p>}
      </div>
      <div className="flex gap-2">
        <input value={body} onChange={(e) => setBody(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} placeholder="Tulis pesan" className="flex-1 rounded-lg bg-background border border-border px-3 py-2 text-sm" />
        <button onClick={send} className="rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm font-semibold">Kirim</button>
      </div>
    </div>
  );
}

/* re-exported so dashboards can render quick stats without extra imports */
export const StatIcons = { Users, GraduationCap };

/* ───────────── Ganti PIN (all roles) ───────────── */
export function ChangePinPanel() {
  const { session } = useSchoolSession();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function submit() {
    setErr(null); setMsg(null);
    if (!/^\d{6}$/.test(next)) { setErr("PIN baru harus 6 digit angka."); return; }
    if (next !== confirm) { setErr("Konfirmasi PIN tidak cocok."); return; }
    if (next === "123456") { setErr("Jangan gunakan PIN default."); return; }
    setBusy(true);
    const res = await changeSchoolPin(current, next);
    setBusy(false);
    if (!res.ok) { setErr(res.error); return; }
    setCurrent(""); setNext(""); setConfirm("");
    setMsg("PIN berhasil diganti.");
  }

  return (
    <div className="rounded-2xl bg-card border border-border p-4 grid gap-2 max-w-sm">
      <p className="text-sm font-semibold flex items-center gap-2"><KeyRound size={14} /> Ganti PIN</p>
      <p className="text-xs text-muted-foreground">UserID Anda: <code className="font-mono">{session?.userId ?? "-"}</code></p>
      {session?.pinIsDefault && <p className="text-xs text-destructive font-semibold">PIN Anda masih default — segera ganti.</p>}
      <input value={current} onChange={(e) => setCurrent(e.target.value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" placeholder="PIN saat ini" className="rounded-lg bg-background border border-border px-3 py-2 text-sm tracking-widest" />
      <input value={next} onChange={(e) => setNext(e.target.value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" placeholder="PIN baru (6 digit)" className="rounded-lg bg-background border border-border px-3 py-2 text-sm tracking-widest" />
      <input value={confirm} onChange={(e) => setConfirm(e.target.value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" placeholder="Ulangi PIN baru" className="rounded-lg bg-background border border-border px-3 py-2 text-sm tracking-widest" />
      <button onClick={submit} disabled={busy} className="justify-self-start rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm font-semibold disabled:opacity-50">{busy ? "Menyimpan…" : "Simpan PIN"}</button>
      {err && <p className="text-xs text-destructive">{err}</p>}
      {msg && <p className="text-xs text-primary">{msg}</p>}
    </div>
  );
}

/* ───────────── Kelola Personil (Admin HoS) ───────────── */
type PersonnelStaff = {
  id: string; full_name: string; role: SchoolRole; division?: string | null; class_id?: string | null;
  email?: string | null; user_id?: string | null; pin_is_default?: boolean; is_active?: boolean; subjects?: string[] | null;
};
type PersonnelStudent = { id: string; full_name: string; student_number?: string | null; class_id?: string | null; status?: string | null };
type PersonnelGuardian = {
  id: string; full_name: string; relation: string; email?: string | null; whatsapp?: string | null;
  user_id?: string | null; pin_is_default?: boolean; is_active?: boolean; student_id: string;
};

export function PersonnelManager({ classes }: { classes: { id: string; name: string }[] }) {
  const pw = getStoredPassword();
  const [reload, setReload] = useState(0);
  const [group, setGroup] = useState<"staff" | "students" | "parents">("staff");
  const data = useAsync(() => listAllPersonnel({ data: { password: pw } }), [pw, reload]);
  const payload = data.data && "staff" in data.data ? data.data : null;
  const staff = (payload?.staff ?? []) as PersonnelStaff[];
  const students = (payload?.students ?? []) as PersonnelStudent[];
  const guardians = (payload?.guardians ?? []) as PersonnelGuardian[];
  const className = (id?: string | null) => classes.find((c) => c.id === id)?.name ?? "-";

  async function staffAction(id: string, patch: { isActive?: boolean; resetPin?: boolean }) {
    await updateStaffAccount({ data: { password: pw, id, ...patch } });
    setReload((x) => x + 1);
  }
  async function guardianAction(id: string, patch: { isActive?: boolean; resetPin?: boolean }) {
    await updateGuardianAccount({ data: { password: pw, id, ...patch } });
    setReload((x) => x + 1);
  }
  async function removeStaff(id: string) {
    await deleteSchoolStaff({ data: { password: pw, id } });
    setReload((x) => x + 1);
  }
  async function removeGuardian(id: string) {
    await deleteGuardian({ data: { password: pw, id } });
    setReload((x) => x + 1);
  }
  async function removeStudent(id: string) {
    await deleteSchoolStudent({ data: { password: pw, id } });
    setReload((x) => x + 1);
  }

  if (data.loading) return <Hint>Memuat data personil…</Hint>;
  if (!payload) return <Hint>{(data.data && "error" in data.data && data.data.error) || "Tidak dapat memuat personil."}</Hint>;

  return (
    <div>
      <Tabs
        tabs={[
          { id: "staff", label: `Staff (${staff.length})` },
          { id: "students", label: `Student (${students.length})` },
          { id: "parents", label: `Parent (${guardians.length})` },
        ]}
        tab={group}
        onChange={(id) => setGroup(id as "staff" | "students" | "parents")}
      />

      {group === "staff" && (
        <ul className="space-y-2">
          {staff.map((s) => (
            <li key={s.id} className="rounded-xl bg-card border border-border p-3 text-sm">
              <div className="flex justify-between gap-2">
                <div>
                  <p className="font-semibold">{s.full_name}{s.is_active === false && <span className="ml-2 text-[10px] text-destructive">nonaktif</span>}</p>
                  <p className="text-xs text-muted-foreground">{roleLabel(s.role)}{s.division ? " · " + s.division : ""}{s.class_id ? " · " + className(s.class_id) : ""}</p>
                  <p className="text-[11px] text-muted-foreground">UserID: <code className="font-mono">{s.user_id || "belum ada"}</code>{s.pin_is_default ? " · PIN default" : ""}</p>
                </div>
                <button onClick={() => removeStaff(s.id)} className="text-destructive shrink-0" aria-label="Hapus"><Trash2 size={14} /></button>
              </div>
              <div className="flex gap-2 mt-2 flex-wrap">
                <button onClick={() => staffAction(s.id, { isActive: s.is_active === false })} className="rounded-lg border border-border px-2 py-1 text-xs flex items-center gap-1"><Power size={11} /> {s.is_active === false ? "Aktifkan" : "Nonaktifkan"}</button>
                <button onClick={() => staffAction(s.id, { resetPin: true })} className="rounded-lg border border-border px-2 py-1 text-xs flex items-center gap-1"><KeyRound size={11} /> Reset PIN</button>
              </div>
            </li>
          ))}
          {staff.length === 0 && <Hint>Belum ada staff.</Hint>}
        </ul>
      )}

      {group === "students" && (
        <ul className="space-y-2">
          {students.map((s) => (
            <li key={s.id} className="rounded-xl bg-card border border-border p-3 text-sm flex justify-between gap-2">
              <div>
                <p className="font-semibold">{s.full_name}</p>
                <p className="text-xs text-muted-foreground">{className(s.class_id)}{s.student_number ? " · " + s.student_number : ""}{s.status ? " · " + s.status : ""}</p>
              </div>
              <button onClick={() => removeStudent(s.id)} className="text-destructive shrink-0" aria-label="Hapus"><Trash2 size={14} /></button>
            </li>
          ))}
          {students.length === 0 && <Hint>Belum ada murid.</Hint>}
        </ul>
      )}

      {group === "parents" && (
        <ul className="space-y-2">
          {guardians.map((g) => (
            <li key={g.id} className="rounded-xl bg-card border border-border p-3 text-sm">
              <div className="flex justify-between gap-2">
                <div>
                  <p className="font-semibold">{g.full_name}{g.is_active === false && <span className="ml-2 text-[10px] text-destructive">nonaktif</span>}</p>
                  <p className="text-xs text-muted-foreground">{g.relation}{g.whatsapp ? " · " + g.whatsapp : ""}{g.email ? " · " + g.email : ""}</p>
                  <p className="text-[11px] text-muted-foreground">UserID: <code className="font-mono">{g.user_id || "belum ada"}</code>{g.pin_is_default ? " · PIN default" : ""}</p>
                </div>
                <button onClick={() => removeGuardian(g.id)} className="text-destructive shrink-0" aria-label="Hapus"><Trash2 size={14} /></button>
              </div>
              <div className="flex gap-2 mt-2 flex-wrap">
                <button onClick={() => guardianAction(g.id, { isActive: g.is_active === false })} className="rounded-lg border border-border px-2 py-1 text-xs flex items-center gap-1"><Power size={11} /> {g.is_active === false ? "Aktifkan" : "Nonaktifkan"}</button>
                <button onClick={() => guardianAction(g.id, { resetPin: true })} className="rounded-lg border border-border px-2 py-1 text-xs flex items-center gap-1"><KeyRound size={11} /> Reset PIN</button>
              </div>
            </li>
          ))}
          {guardians.length === 0 && <Hint>Belum ada akun orangtua.</Hint>}
        </ul>
      )}
    </div>
  );
}
