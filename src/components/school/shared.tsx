// Shared building blocks for every School dashboard (HoS, Admin HoS,
// Principal, Teacher, Parent). Extracted out of the old single-file
// /school route so each role can live on its own URL.
import { useEffect, useRef, useState } from "react";
import {
  Shield, Users, Trash2, UserPlus, Upload, Send, Megaphone, Bell, X, GraduationCap,
} from "lucide-react";
import { getStoredSchoolPassword, type AdminSubrole } from "@/lib/school-store";
import {
  listSchoolClasses, createSchoolClass, listSchoolStaff, createSchoolStaff, deleteSchoolStaff,
  listSchoolStudents, upsertSchoolStudent, deleteSchoolStudent, importSchoolStudents, seedStellaMarisPhase1,
  listGuardians, addGuardian, deleteGuardian,
  listAllActivities, postAnnouncement, listAnnouncements,
  listMessagesForStudent, postMessageAsTeacher, closeThreadAsTeacher,
  listMessagesForCode, postMessageAsParent, closeThreadAsParent,
  debugSupabaseUrl, type SchoolRole,
} from "@/lib/school.functions";

export const DIVISIONS = [
  { id: "kindergarten", label: "Kindergarten" },
  { id: "primary", label: "Primary (1–6)" },
  { id: "secondary", label: "Secondary / Junior High (7–10)" },
  { id: "ib", label: "IB Diploma (11–12)" },
  { id: "All Divisions", label: "All Divisions" },
];

export const ROLE_LABEL: Record<SchoolRole, string> = {
  hos: "Head of School",
  admin_hos: "Admin HoS",
  principal: "Principal",
  teacher_homeroom: "Homeroom Teacher",
  teacher_shadow: "Shadow Teacher",
  teacher_subject: "Subject Teacher",
};

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

export function Tabs({ tabs, tab, onChange }: { tabs: { id: string; label: string }[]; tab: string; onChange: (id: string) => void }) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-2 mb-4 no-scrollbar">
      {tabs.map((t) => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          className={"shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold border " + (tab === t.id ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border")}
        >{t.label}</button>
      ))}
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
    ? [{ v: "teacher_homeroom", label: "Homeroom Teacher" }, { v: "teacher_shadow", label: "Shadow Teacher" }, { v: "teacher_subject", label: "Subject Teacher" }]
    : [{ v: "principal", label: "Principal" }]);
  const [name, setName] = useState("");
  const [role, setRole] = useState<SchoolRole>(options[0]?.v ?? "principal");
  const [division, setDivision] = useState(scopeDivision ?? "kindergarten");
  const [classId, setClassId] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const isSchoolWide = role === "hos" || role === "admin_hos";

  async function add() {
    if (!name.trim()) return;
    setBusy(true); setErr(null);
    const res = await createSchoolStaff({
      data: {
        password: pw, schoolId: getSchoolIdSync(), fullName: name.trim(), role,
        division: isSchoolWide ? "All Divisions" : (scopeDivision ?? division),
        classId: classId || undefined,
      },
    });
    setBusy(false);
    if (!res.ok) { setErr(res.error); return; }
    setName(""); setClassId(""); setReload((x) => x + 1);
  }
  async function remove(id: string) {
    await deleteSchoolStaff({ data: { password: pw, id } });
    setReload((x) => x + 1);
  }
  const list = (staff.data && "staff" in staff.data ? (staff.data.staff ?? []) : []) as { id: string; full_name: string; role: SchoolRole; division?: string; pin_is_default?: boolean }[];
  const filtered = scopeDivision ? list.filter((s) => s.division === scopeDivision) : list;
  return (
    <div>
      {canEdit && (
        <div className="rounded-2xl bg-card border border-border p-3 mb-3 grid gap-2">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nama lengkap" className="rounded-lg bg-background border border-border px-3 py-1.5 text-sm" />
          <div className="grid grid-cols-2 gap-2">
            <select value={role} onChange={(e) => setRole(e.target.value as SchoolRole)} className="rounded-lg bg-background border border-border px-2 py-1.5 text-sm">
              {options.map((r) => <option key={r.v} value={r.v}>{r.label}</option>)}
            </select>
            {!scopeDivision && !isSchoolWide && (
              <select value={division} onChange={(e) => setDivision(e.target.value)} className="rounded-lg bg-background border border-border px-2 py-1.5 text-sm">
                {DIVISIONS.filter((d) => d.id !== "All Divisions").map((d) => <option key={d.id} value={d.id}>{d.label}</option>)}
              </select>
            )}
            {scopeDivision && (
              <select value={classId} onChange={(e) => setClassId(e.target.value)} className="rounded-lg bg-background border border-border px-2 py-1.5 text-sm">
                <option value="">pilih kelas opsional</option>
                {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            )}
          </div>
          <p className="text-[11px] text-muted-foreground">PIN awal <code className="font-mono">123456</code> — diganti sendiri saat login pertama.</p>
          <button onClick={add} disabled={busy} className="justify-self-start rounded-lg bg-primary text-primary-foreground px-3 py-1.5 text-sm font-semibold disabled:opacity-50 flex items-center gap-1"><UserPlus size={13} /> Tambah Staff</button>
          {err && <p className="text-xs text-destructive">{err}</p>}
        </div>
      )}
      <ul className="space-y-2">
        {filtered.map((s) => (
          <li key={s.id} className="rounded-xl bg-card border border-border p-3 text-sm flex justify-between">
            <div>
              <p className="font-semibold">{s.full_name}</p>
              <p className="text-xs text-muted-foreground">
                {ROLE_LABEL[s.role] ?? s.role}{s.division ? " · " + (DIVISIONS.find((d) => d.id === s.division)?.label ?? s.division) : ""}
                {s.pin_is_default ? " · PIN default" : ""}
              </p>
            </div>
            {canEdit && <button onClick={() => remove(s.id)} className="text-destructive"><Trash2 size={14} /></button>}
          </li>
        ))}
        {filtered.length === 0 && <Hint>Belum ada staff.</Hint>}
      </ul>
    </div>
  );
}

/* ───────────── students ───────────── */
export function StudentRoster({ canEdit, classes }: { canEdit: boolean; classes: { id: string; name: string }[] }) {
  const pw = getStoredPassword();
  const [reload, setReload] = useState(0);
  const [classId, setClassId] = useState("");
  const students = useAsync(() => listSchoolStudents({ data: { password: pw, classId: classId || undefined } }), [pw, classId, reload]);
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
        <option value="">semua kelas</option>
        {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
      </select>
      {canEdit && (
        <div className="mb-3">
          {!adding ? (
            <button onClick={() => setAdding(true)} disabled={!classId} className="rounded-full border border-border px-3 py-1.5 text-xs flex items-center gap-1 disabled:opacity-40"><UserPlus size={13} /> Tambah Murid {!classId ? "(pilih kelas dulu)" : ""}</button>
          ) : (
            <div className="flex gap-2 flex-wrap">
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nama lengkap" className="flex-1 min-w-40 rounded-lg bg-background border border-border px-3 py-1.5 text-sm" />
              <input value={studentNumber} onChange={(e) => setStudentNumber(e.target.value)} placeholder="Student ID" className="w-32 rounded-lg bg-background border border-border px-3 py-1.5 text-sm" />
              <button onClick={add} className="rounded-lg bg-primary text-primary-foreground px-3 py-1.5 text-sm font-semibold">Simpan</button>
            </div>
          )}
        </div>
      )}
      <ul className="space-y-2">
        {list.map((s) => <StudentRow key={s.id} student={s} canEdit={canEdit} onDelete={() => remove(s.id)} />)}
        {list.length === 0 && <Hint>Belum ada murid.</Hint>}
      </ul>
    </div>
  );
}

function StudentRow({ student, canEdit, onDelete }: { student: { id: string; full_name: string; student_number?: string }; canEdit: boolean; onDelete: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <li className="rounded-xl bg-card border border-border p-3">
      <button onClick={() => setOpen((v) => !v)} className="w-full flex items-center justify-between">
        <div className="text-left"><p className="text-sm font-semibold">{student.full_name}</p>{student.student_number && <p className="text-xs text-muted-foreground">{student.student_number}</p>}</div>
        <span className="text-xs text-muted-foreground">{open ? "v" : ">"}</span>
      </button>
      {open && (
        <div className="mt-3 pt-3 border-t border-border">
          <GuardianEditor studentId={student.id} canEdit={canEdit} />
          {canEdit && <button onClick={onDelete} className="mt-3 text-xs text-destructive flex items-center gap-1"><Trash2 size={12} /> Hapus murid</button>}
        </div>
      )}
    </li>
  );
}

export function GuardianEditor({ studentId, canEdit }: { studentId: string; canEdit: boolean }) {
  const pw = getStoredPassword();
  const [reload, setReload] = useState(0);
  const guardians = useAsync(() => listGuardians({ data: { password: pw, studentId } }), [pw, studentId, reload]);
  const [name, setName] = useState("");
  const [relation, setRelation] = useState<"father" | "mother" | "guardian">("mother");
  const [wa, setWa] = useState("");
  async function add() {
    if (!name.trim()) return;
    await addGuardian({ data: { password: pw, studentId, fullName: name.trim(), relation, whatsapp: wa || undefined } });
    setName(""); setWa(""); setReload((x) => x + 1);
  }
  async function remove(id: string) {
    await deleteGuardian({ data: { password: pw, id } });
    setReload((x) => x + 1);
  }
  function shareCode(g: { invite_code: string; full_name: string }) {
    const text = encodeURIComponent("Halo " + g.full_name + "! Kode undangan School Dashboard untuk memantau anak Anda: " + g.invite_code + ". Buka Noble - School Dashboard - Orangtua - masukkan kode ini.");
    window.open("https://wa.me/?text=" + text, "_blank", "noopener");
  }
  const list = (guardians.data && "guardians" in guardians.data ? (guardians.data.guardians ?? []) : []) as { id: string; full_name: string; relation: string; whatsapp?: string; invite_code: string; invite_used_at?: string }[];
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Guardians</p>
      <ul className="space-y-2 mb-3">
        {list.map((g) => (
          <li key={g.id} className="rounded-lg bg-secondary/50 p-2 text-xs">
            <div className="flex items-center justify-between gap-2">
              <span>{g.full_name} - {g.relation}{g.whatsapp ? " - " + g.whatsapp : ""}</span>
              {canEdit && <button onClick={() => remove(g.id)} className="text-destructive shrink-0"><Trash2 size={12} /></button>}
            </div>
            <div className="flex items-center gap-2 mt-1">
              <code className="font-mono bg-background rounded px-1.5 py-0.5">{g.invite_code}</code>
              {g.invite_used_at && <span className="text-primary">sudah dibuka</span>}
              <button onClick={() => shareCode(g)} className="ml-auto text-primary flex items-center gap-1"><Send size={11} /> Kirim WA</button>
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
          <input value={wa} onChange={(e) => setWa(e.target.value)} placeholder="No. WhatsApp" className="col-span-2 rounded-lg bg-background border border-border px-2 py-1 text-xs" />
          <button onClick={add} className="col-span-2 rounded-lg bg-primary text-primary-foreground px-3 py-1.5 text-xs font-semibold">Tambah Wali</button>
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
        <input ref={fileRef} type="file" accept=".csv,text/csv" onChange={handleFile} className="hidden" />
        {result && <p className="text-xs mt-3 whitespace-pre-wrap">{result}</p>}
      </div>
    </div>
  );
}

/* ───────────── activities & announcements ───────────── */
export function AllActivitiesView({ division }: { division: string | null }) {
  const pw = getStoredPassword();
  const activities = useAsync(() => listAllActivities({ data: { password: pw, division: division || undefined } }), [pw, division]);
  const list = (activities.data && "activities" in activities.data ? (activities.data.activities ?? []) : []) as { id: string; title: string; body?: string; activity_date: string; author_name?: string; school_classes?: { name: string } }[];
  return (
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
  );
}

export function AnnouncementPanel({ subrole, division, classes }: { subrole: AdminSubrole; division: string | null; classes: { id: string; name: string }[] }) {
  const pw = getStoredPassword();
  const [reload, setReload] = useState(0);
  const list = useAsync(() => listAnnouncements({ data: { password: pw } }), [pw, reload]);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [scope, setScope] = useState<"school" | "division" | "class">(subrole === "principal" ? "division" : "school");
  const [classId, setClassId] = useState("");
  const [err, setErr] = useState<string | null>(null);

  async function post() {
    if (!title.trim()) return;
    setErr(null);
    const res = await postAnnouncement({
      data: { password: pw, subrole, schoolId: getSchoolIdSync(), scope, division: scope === "division" ? (division ?? undefined) : undefined, classId: scope === "class" ? classId : undefined, title: title.trim(), body },
    });
    if (!res.ok) { setErr(res.error); return; }
    setTitle(""); setBody(""); setReload((x) => x + 1);
  }
  const items = (list.data && "announcements" in list.data ? (list.data.announcements ?? []) : []) as { id: string; title: string; body?: string; scope: string; created_at: string }[];
  return (
    <div>
      <div className="rounded-2xl bg-card border border-border p-3 mb-3">
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Judul pengumuman" className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm mb-2" />
        <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={3} placeholder="Isi" className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm mb-2" />
        <div className="flex gap-2 flex-wrap">
          <select value={scope} onChange={(e) => setScope(e.target.value as typeof scope)} className="rounded-lg bg-background border border-border px-2 py-1.5 text-sm">
            {subrole !== "principal" && <option value="school">Seluruh Sekolah</option>}
            <option value="division">Divisi Saya</option>
            <option value="class">Kelas Tertentu</option>
          </select>
          {scope === "class" && (
            <select value={classId} onChange={(e) => setClassId(e.target.value)} className="rounded-lg bg-background border border-border px-2 py-1.5 text-sm">
              <option value="">pilih kelas</option>
              {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          )}
          <button onClick={post} className="rounded-lg bg-primary text-primary-foreground px-3 py-1.5 text-sm font-semibold flex items-center gap-1"><Megaphone size={13} /> Umumkan</button>
        </div>
        {err && <p className="text-xs text-destructive mt-2">{err}</p>}
      </div>
      <ul className="space-y-2">
        {items.map((a) => (
          <li key={a.id} className="rounded-xl bg-card border border-border p-3">
            <div className="flex justify-between text-sm"><p className="font-semibold">{a.title}</p><span className="text-[10px] uppercase text-muted-foreground">{a.scope}</span></div>
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
