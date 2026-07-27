import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  Shield, GraduationCap, BookOpen, Home as HomeIcon, Baby, Users, Trash2,
  UserPlus, Upload, Send, LogOut, Save, Megaphone, MessageSquare, X, Bell, Lock, Delete,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { usePlugin } from "@/lib/plugins-store";
import { useLicenseInfo } from "@/lib/auth-store";
import {
  loginSchoolStaff, schoolLogout, setAdminSubrole, useSchoolSession,
  redeemParentCode, parentLogout, useParentCode, getStoredSchoolPassword,
  loginTeacherPin, completeTeacherSetup, clearTeacherDevice, type AdminSubrole, type TeacherDevice,
} from "@/lib/school-store";
import {
  listSchoolClasses, createSchoolClass, listSchoolStaff, createSchoolStaff, deleteSchoolStaff,
  listSchoolStudents, upsertSchoolStudent, deleteSchoolStudent, importSchoolStudents, seedStellaMarisPhase1,
  listGuardians, addGuardian, deleteGuardian, getStudentForCode, listTeacherStaffPublic,
  postSchoolActivity, deleteSchoolActivity, listActivitiesForClass, listActivitiesForCode, listAllActivities,
  postMessageAsTeacher, postMessageAsParent, listMessagesForStudent, listMessagesForCode,
  closeThreadAsTeacher, closeThreadAsParent,
  postAnnouncement, listAnnouncements, listAnnouncementsForCode, getSchoolId,
  type SchoolRole,
} from "@/lib/school.functions";

// SCHOOL_ID now comes from the SCHOOL_ID Secret (see getSchoolId in
// school.functions.ts) — not hardcoded here anymore, since a hardcoded
// value kept getting reverted whenever this file was re-edited/republished.

export const Route = createFileRoute("/school")({
  head: () => ({ meta: [{ title: "School Dashboard — Noble" }] }),
  component: SchoolPage,
});

const DIVISIONS = [
  { id: "kindergarten", label: "Kindergarten" },
  { id: "primary", label: "Primary (1–6)" },
  { id: "secondary", label: "Secondary / Junior High (7–10)" },
  { id: "ib", label: "IB Diploma (11–12)" },
];
const ROLE_LABEL: Record<SchoolRole, string> = {
  hos: "Head of School", principal: "Principal",
  teacher_homeroom: "Homeroom Teacher", teacher_shadow: "Shadow Teacher", teacher_subject: "Subject Teacher",
};

function getStoredPassword(): string {
  return getStoredSchoolPassword();
}

// SCHOOL_ID is fetched once from the server (env var) and cached in
// sessionStorage for the rest of the tab's session — same pattern as the
// password, so every helper below can read it synchronously.
function getSchoolIdSync(): string {
  if (typeof window === "undefined") return "";
  return sessionStorage.getItem("noble.school.id") || "";
}

function SchoolPage() {
  const hasPlugin = usePlugin("school");
  const license = useLicenseInfo();
  const isAdmin = license.code === "NOBLE440077" || license.tier === "premium";
  const session = useSchoolSession();
  const parentCode = useParentCode();
  const [mode, setMode] = useState<"pick" | "staff" | "parent">("pick");
  const [schoolId, setSchoolId] = useState<string | null>(null); // never read sessionStorage here — server has no access to it, causes hydration mismatch

  useEffect(() => {
    const cached = getSchoolIdSync();
    if (cached) {
      setSchoolId(cached);
      return;
    }
    getSchoolId().then((res) => {
      if (res.id) {
        sessionStorage.setItem("noble.school.id", res.id);
        setSchoolId(res.id);
      } else {
        setSchoolId(""); // fetched, but not configured — distinguishes from "still loading"
      }
    });
  }, []);

  if (!hasPlugin && !isAdmin) {
    return (
      <AppShell title="School Dashboard">
        <div className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          Plugin School Dashboard belum aktif.
          <div className="mt-3"><Link to="/upgrade" className="rounded-xl bg-primary text-primary-foreground px-4 py-2 text-xs font-semibold">Upgrade / Enable</Link></div>
        </div>
      </AppShell>
    );
  }
  if (schoolId === null) return null; // still loading, avoid a flash of the setup notice
  if (!schoolId) {
    return (
      <AppShell title="School Dashboard">
        <div className="rounded-2xl border border-dashed border-destructive/40 bg-destructive/5 p-6 text-center text-sm">
          <p className="font-semibold text-destructive mb-1">Setup belum selesai</p>
          <p className="text-muted-foreground">
            Jalankan SQL, lalu <code className="font-mono text-xs">insert into school_schools(name) values ('Stella Maris') returning id;</code>
            {" "}tambahkan Secret baru bernama <code className="font-mono">SCHOOL_ID</code> di Lovable, isi dengan UUID hasil query tadi.
          </p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title="School Dashboard">
      {parentCode ? (
        <ParentDashboard code={parentCode} />
      ) : session.teacherDevice && !session.teacherUnlocked ? (
        <TeacherPinPad device={session.teacherDevice} />
      ) : session.tier ? (
        <StaffRouter />
      ) : mode === "pick" ? (
        <EntryPicker onPick={setMode} />
      ) : mode === "staff" ? <StaffLogin onBack={() => setMode("pick")} /> : <ParentLogin onBack={() => setMode("pick")} />}
    </AppShell>
  );
}

function EntryPicker({ onPick }: { onPick: (m: "staff" | "parent") => void }) {
  return (
    <div>
      <p className="text-sm text-muted-foreground mb-4">
        Sample: <span className="font-semibold text-foreground">Stella Maris International School</span> · Kindergarten
      </p>
      <h2 className="text-lg font-semibold mb-3">Masuk sebagai</h2>
      <div className="grid grid-cols-2 gap-3">
        <button onClick={() => onPick("staff")} className="rounded-2xl bg-card border border-border p-5 text-left active:scale-[0.98]">
          <Shield size={22} className="text-primary mb-2" />
          <p className="text-sm font-semibold">Staff</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">HoS · Admin HoS · Principal · Guru</p>
        </button>
        <button onClick={() => onPick("parent")} className="rounded-2xl bg-card border border-border p-5 text-left active:scale-[0.98]">
          <HomeIcon size={22} className="text-primary mb-2" />
          <p className="text-sm font-semibold">Orangtua</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">Pakai kode undangan dari Guru</p>
        </button>
      </div>
    </div>
  );
}

function StaffLogin({ onBack }: { onBack: () => void }) {
  const [pw, setPw] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setChecking(true); setErr(null);
    const res = await loginSchoolStaff(pw);
    setChecking(false);
    if (!res.ok) setErr("Password salah.");
  }
  return (
    <div className="max-w-sm mx-auto">
      <button onClick={onBack} className="text-xs text-muted-foreground underline mb-4">Kembali</button>
      <form onSubmit={submit} className="rounded-2xl bg-card border border-border p-5 space-y-3">
        <p className="text-sm font-semibold">Masuk sebagai Staff</p>
        <input type="password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="Password" className="w-full rounded-xl bg-secondary px-4 py-3 text-sm outline-none" autoFocus />
        {err && <p className="text-xs text-destructive">{err}</p>}
        <button type="submit" disabled={checking || !pw.trim()} className="w-full rounded-full bg-primary text-primary-foreground py-3 text-sm font-semibold disabled:opacity-50">{checking ? "Memeriksa" : "Masuk"}</button>
      </form>
    </div>
  );
}

function ParentLogin({ onBack }: { onBack: () => void }) {
  const [code, setCode] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setChecking(true); setErr(null);
    const res = await redeemParentCode(code);
    setChecking(false);
    if (!res.ok) setErr(("error" in res && res.error) || "Kode tidak valid.");
  }
  return (
    <div className="max-w-sm mx-auto">
      <button onClick={onBack} className="text-xs text-muted-foreground underline mb-4">Kembali</button>
      <form onSubmit={submit} className="rounded-2xl bg-card border border-border p-5 space-y-3">
        <p className="text-sm font-semibold">Masukkan kode undangan</p>
        <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="mis. XK7QM2NP" className="w-full rounded-xl bg-secondary px-4 py-3 text-sm outline-none font-mono tracking-wider text-center" autoFocus />
        {err && <p className="text-xs text-destructive">{err}</p>}
        <button type="submit" disabled={checking || !code.trim()} className="w-full rounded-full bg-primary text-primary-foreground py-3 text-sm font-semibold disabled:opacity-50">{checking ? "Memeriksa" : "Buka"}</button>
      </form>
    </div>
  );
}

function StaffRouter() {
  const { tier, subrole, division, staffName, teacherDevice } = useSchoolSession();
  if (tier === "admin" && !subrole) return <AdminSubrolePicker />;
  if (tier === "admin" && subrole === "principal" && !division) return <DivisionPicker />;
  if (tier === "teacher" && !staffName) return <TeacherFirstTimeSetup />;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Signed in as</p>
          <p className="text-sm font-semibold">
            {tier === "admin" ? (subrole === "hos" ? "Head of School" : subrole === "admin_hos" ? "Admin HoS" : "Principal - " + DIVISIONS.find((d) => d.id === division)?.label) : staffName}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={schoolLogout} className="text-xs rounded-full border border-border px-3 py-1.5 flex items-center gap-1"><LogOut size={12} /> Keluar</button>
          {tier === "teacher" && teacherDevice && (
            <button onClick={clearTeacherDevice} className="text-xs text-muted-foreground underline">Bukan Anda?</button>
          )}
        </div>
      </div>
      {tier === "admin" && (subrole === "hos" || subrole === "admin_hos") && <HosDashboard subrole={subrole} />}
      {tier === "admin" && subrole === "principal" && <PrincipalDashboard division={division!} />}
      {tier === "teacher" && <TeacherDashboard staffName={staffName!} defaultClassId={teacherDevice?.classId ?? null} />}
    </div>
  );
}

// Returning teacher — this device already knows who you are, just confirm your PIN.
function TeacherPinPad({ device }: { device: TeacherDevice }) {
  const [pin, setPin] = useState("");
  const [err, setErr] = useState(false);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    if (pin.length === 4) {
      setChecking(true);
      loginTeacherPin(device.id, pin).then((res) => {
        setChecking(false);
        if (!res.ok) {
          setErr(true);
          setTimeout(() => {
            setErr(false);
            setPin("");
          }, 500);
        }
      });
    }
  }, [pin, device.id]);

  const press = (d: string) => {
    if (d === "del") setPin((p) => p.slice(0, -1));
    else if (pin.length < 4) setPin((p) => p + d);
  };

  return (
    <div className="max-w-xs mx-auto text-center pt-8">
      <div className="grid place-items-center w-12 h-12 rounded-full bg-primary/15 text-primary mx-auto mb-3"><Lock size={20} /></div>
      <p className="text-sm font-semibold mb-1">Halo, {device.name}</p>
      <p className="text-xs text-muted-foreground mb-6">Masukkan PIN Anda</p>
      <div className={"flex justify-center gap-3 mb-8 " + (err ? "shake" : "")}>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className={"w-3.5 h-3.5 rounded-full " + (i < pin.length ? (err ? "bg-destructive" : "bg-primary") : "bg-muted")} />
        ))}
      </div>
      <div className="grid grid-cols-3 gap-3">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
          <button key={d} onClick={() => press(d)} disabled={checking} className="aspect-square rounded-full bg-card border border-border text-xl font-light active:scale-90">{d}</button>
        ))}
        <div />
        <button onClick={() => press("0")} disabled={checking} className="aspect-square rounded-full bg-card border border-border text-xl font-light active:scale-90">0</button>
        <button onClick={() => press("del")} disabled={checking} className="aspect-square rounded-full bg-card border border-border grid place-items-center active:scale-90"><Delete size={18} /></button>
      </div>
      <button onClick={clearTeacherDevice} className="mt-6 text-xs text-muted-foreground underline">Bukan {device.name}?</button>
    </div>
  );
}

function AdminSubrolePicker() {
  const roles: { r: AdminSubrole; label: string; desc: string }[] = [
    { r: "hos", label: "Head of School", desc: "Lihat semua data + umumkan ke seluruh sekolah" },
    { r: "admin_hos", label: "Admin HoS", desc: "Kelola data murid & staff, import CSV" },
    { r: "principal", label: "Principal", desc: "Kelola 1 Divisi, buat akun Guru" },
  ];
  return (
    <div className="grid gap-3">
      {roles.map(({ r, label, desc }) => (
        <button key={r} onClick={() => setAdminSubrole(r)} className="rounded-2xl bg-card border border-border p-4 text-left active:scale-[0.98]">
          <p className="text-sm font-semibold">{label}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
        </button>
      ))}
    </div>
  );
}
function DivisionPicker() {
  return (
    <div className="grid gap-3">
      <p className="text-sm text-muted-foreground mb-1">Pilih Divisi yang Anda kelola:</p>
      {DIVISIONS.map((d) => (
        <button key={d.id} onClick={() => setAdminSubrole("principal", d.id)} className="rounded-2xl bg-card border border-border p-4 text-left active:scale-[0.98]"><p className="text-sm font-semibold">{d.label}</p></button>
      ))}
    </div>
  );
}
function TeacherFirstTimeSetup() {
  const pw = getStoredPassword();
  const staff = useAsync(() => listTeacherStaffPublic({ data: { password: pw } }), [pw]);
  const [picked, setPicked] = useState<{ id: string; full_name: string } | null>(null);
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const list = staff.data && "staff" in staff.data ? staff.data.staff : [];

  async function finish() {
    if (pin.length !== 4) { setErr("PIN harus 4 angka."); return; }
    if (pin !== confirmPin) { setErr("Konfirmasi PIN tidak sama."); return; }
    if (!picked) return;
    setSaving(true);
    setErr(null);
    const res = await completeTeacherSetup(pw, picked.id, pin);
    setSaving(false);
    if (!res.ok) setErr(res.error);
  }

  if (!picked) {
    return (
      <div className="max-w-sm mx-auto">
        <p className="text-sm font-semibold mb-1">Siapa Anda?</p>
        <p className="text-xs text-muted-foreground mb-3">Pilih nama Anda dari daftar staff yang sudah didaftarkan Principal.</p>
        <ul className="space-y-2">
          {list.map((s: { id: string; full_name: string; role: string }) => (
            <li key={s.id}>
              <button onClick={() => setPicked(s)} className="w-full rounded-xl bg-card border border-border p-3 text-left text-sm">{s.full_name}</button>
            </li>
          ))}
          {list.length === 0 && <Hint>Nama Anda belum terdaftar. Minta Principal menambahkan Anda dulu di menu Staff.</Hint>}
        </ul>
      </div>
    );
  }

  return (
    <div className="max-w-sm mx-auto rounded-2xl bg-card border border-border p-5">
      <p className="text-sm font-semibold mb-1">Halo, {picked.full_name}</p>
      <p className="text-xs text-muted-foreground mb-4">Buat PIN 4 angka untuk masuk lebih cepat lain kali (tidak perlu password lagi).</p>
      <input type="password" inputMode="numeric" maxLength={4} value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))} placeholder="PIN baru (4 angka)" className="w-full rounded-xl bg-secondary px-4 py-3 text-sm outline-none mb-3 text-center tracking-widest" autoFocus />
      <input type="password" inputMode="numeric" maxLength={4} value={confirmPin} onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ""))} placeholder="Ulangi PIN" className="w-full rounded-xl bg-secondary px-4 py-3 text-sm outline-none mb-3 text-center tracking-widest" />
      {err && <p className="text-xs text-destructive mb-3">{err}</p>}
      <button onClick={finish} disabled={saving || pin.length !== 4} className="w-full rounded-full bg-primary text-primary-foreground py-3 text-sm font-semibold disabled:opacity-50">{saving ? "Menyimpan…" : "Selesai"}</button>
      <button onClick={() => setPicked(null)} className="w-full text-center text-xs text-muted-foreground underline mt-3">Bukan saya</button>
    </div>
  );
}

function HosDashboard({ subrole }: { subrole: AdminSubrole }) {
  const [tab, setTab] = useState<"overview" | "students" | "staff" | "activity" | "announce" | "import">("overview");
  const canEditProfile = subrole === "admin_hos";
  const pw = getStoredPassword();
  const classes = useAsync(() => listSchoolClasses({ data: { password: pw } }), [pw]);
  const staff = useAsync(() => listSchoolStaff({ data: { password: pw } }), [pw]);
  const classList = classes.data && "classes" in classes.data ? classes.data.classes : [];
  const staffList = staff.data && "staff" in staff.data ? staff.data.staff : [];
  const tabs = [
    { id: "overview", label: "Overview" }, { id: "students", label: "Data Murid" },
    { id: "staff", label: "Staff" }, { id: "activity", label: "Semua Activity" }, { id: "announce", label: "Pengumuman" },
    ...(canEditProfile ? [{ id: "import" as const, label: "Import CSV" }] : []),
  ] as const;
  return (
    <div>
      <div className="flex gap-2 overflow-x-auto pb-2 mb-4 no-scrollbar">
        {tabs.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)} className={"shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold border " + (tab === t.id ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border")}>{t.label}</button>
        ))}
      </div>
      {tab === "overview" && (
        <div className="grid grid-cols-2 gap-3">
          <StatCard label="Classes" value={classList.length} Icon={GraduationCap} />
          <StatCard label="Staff" value={staffList.length} Icon={Users} />
        </div>
      )}
      {tab === "students" && <StudentRoster canEdit={canEditProfile} classes={classList} />}
      {tab === "staff" && <StaffRoster canEdit={canEditProfile} classes={classList} scopeDivision={null} />}
      {tab === "activity" && <AllActivitiesView division={null} />}
      {tab === "announce" && <AnnouncementPanel subrole={subrole} division={null} classes={classList} />}
      {tab === "import" && canEditProfile && <CsvImportPanel classes={classList} />}
    </div>
  );
}
function StatCard({ label, value, Icon }: { label: string; value: number; Icon: typeof Shield }) {
  return (
    <div className="rounded-2xl bg-card border border-border p-4">
      <Icon size={16} className="text-primary mb-2" />
      <p className="text-2xl font-semibold">{value}</p>
      <p className="text-xs text-muted-foreground mt-1">{label}</p>
    </div>
  );
}

function PrincipalDashboard({ division }: { division: string }) {
  const [tab, setTab] = useState<"overview" | "students" | "classes" | "staff" | "activity" | "announce">("overview");
  const pw = getStoredPassword();
  const classesAll = useAsync(() => listSchoolClasses({ data: { password: pw } }), [pw]);
  const classes = (classesAll.data && "classes" in classesAll.data ? classesAll.data.classes : []).filter((c: { division: string }) => c.division === division);
  const tabs = [
    { id: "overview", label: "Overview" }, { id: "students", label: "Data Murid" }, { id: "classes", label: "Classes" },
    { id: "staff", label: "Staff" }, { id: "activity", label: "Activity Guru" }, { id: "announce", label: "Pengumuman" },
  ] as const;
  return (
    <div>
      <p className="text-xs text-muted-foreground mb-3">Principal - {DIVISIONS.find((d) => d.id === division)?.label}</p>
      <div className="flex gap-2 overflow-x-auto pb-2 mb-4 no-scrollbar">
        {tabs.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)} className={"shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold border " + (tab === t.id ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border")}>{t.label}</button>
        ))}
      </div>
      {tab === "overview" && <div className="grid grid-cols-2 gap-3"><StatCard label="Classes" value={classes.length} Icon={GraduationCap} /></div>}
      {tab === "students" && <StudentRoster canEdit classes={classes} />}
      {tab === "classes" && <ClassManagerPrincipal division={division} classes={classes} />}
      {tab === "staff" && <StaffRoster canEdit classes={classes} scopeDivision={division} />}
      {tab === "activity" && <AllActivitiesView division={division} />}
      {tab === "announce" && <AnnouncementPanel subrole="principal" division={division} classes={classes} />}
    </div>
  );
}
function ClassManagerPrincipal({ division, classes }: { division: string; classes: { id: string; name: string; level?: string }[] }) {
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

function StaffRoster({ canEdit, classes, scopeDivision }: { canEdit: boolean; classes: { id: string; name: string }[]; scopeDivision: string | null }) {
  const pw = getStoredPassword();
  const [reload, setReload] = useState(0);
  const staff = useAsync(() => listSchoolStaff({ data: { password: pw } }), [pw, reload]);
  const [name, setName] = useState("");
  const [role, setRole] = useState<SchoolRole>(scopeDivision ? "teacher_homeroom" : "principal");
  const [classId, setClassId] = useState("");
  const [busy, setBusy] = useState(false);
  const roleOptions: { v: SchoolRole; label: string }[] = scopeDivision
    ? [{ v: "teacher_homeroom", label: "Homeroom Teacher" }, { v: "teacher_shadow", label: "Shadow Teacher" }, { v: "teacher_subject", label: "Subject Teacher" }]
    : [{ v: "principal", label: "Principal" }];
  async function add() {
    if (!name.trim()) return;
    setBusy(true);
    await createSchoolStaff({ data: { password: pw, schoolId: getSchoolIdSync(), fullName: name.trim(), role, division: scopeDivision ?? "kindergarten", classId: classId || undefined } });
    setBusy(false); setName(""); setReload((x) => x + 1);
  }
  async function remove(id: string) {
    await deleteSchoolStaff({ data: { password: pw, id } });
    setReload((x) => x + 1);
  }
  const list = staff.data && "staff" in staff.data ? staff.data.staff : [];
  const filtered = scopeDivision ? list.filter((s: { division: string }) => s.division === scopeDivision) : list;
  return (
    <div>
      {canEdit && (
        <div className="rounded-2xl bg-card border border-border p-3 mb-3 grid gap-2">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nama lengkap" className="rounded-lg bg-background border border-border px-3 py-1.5 text-sm" />
          <div className="grid grid-cols-2 gap-2">
            <select value={role} onChange={(e) => setRole(e.target.value as SchoolRole)} className="rounded-lg bg-background border border-border px-2 py-1.5 text-sm">
              {roleOptions.map((r) => <option key={r.v} value={r.v}>{r.label}</option>)}
            </select>
            {scopeDivision && (
              <select value={classId} onChange={(e) => setClassId(e.target.value)} className="rounded-lg bg-background border border-border px-2 py-1.5 text-sm">
                <option value="">pilih kelas opsional</option>
                {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            )}
          </div>
          <button onClick={add} disabled={busy} className="justify-self-start rounded-lg bg-primary text-primary-foreground px-3 py-1.5 text-sm font-semibold disabled:opacity-50 flex items-center gap-1"><UserPlus size={13} /> Tambah Staff</button>
        </div>
      )}
      <ul className="space-y-2">
        {filtered.map((s: { id: string; full_name: string; role: SchoolRole }) => (
          <li key={s.id} className="rounded-xl bg-card border border-border p-3 text-sm flex justify-between">
            <div><p className="font-semibold">{s.full_name}</p><p className="text-xs text-muted-foreground">{ROLE_LABEL[s.role]}</p></div>
            {canEdit && <button onClick={() => remove(s.id)} className="text-destructive"><Trash2 size={14} /></button>}
          </li>
        ))}
        {filtered.length === 0 && <Hint>Belum ada staff.</Hint>}
      </ul>
    </div>
  );
}

function StudentRoster({ canEdit, classes }: { canEdit: boolean; classes: { id: string; name: string }[] }) {
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
  const list = students.data && "students" in students.data ? students.data.students : [];
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
        {list.map((s: { id: string; full_name: string; student_number?: string }) => (
          <StudentRow key={s.id} student={s} canEdit={canEdit} onDelete={() => remove(s.id)} />
        ))}
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
function GuardianEditor({ studentId, canEdit }: { studentId: string; canEdit: boolean }) {
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
  const list = guardians.data && "guardians" in guardians.data ? guardians.data.guardians : [];
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Guardians</p>
      <ul className="space-y-2 mb-3">
        {list.map((g: { id: string; full_name: string; relation: string; whatsapp?: string; invite_code: string; invite_used_at?: string }) => (
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

function CsvImportPanel({ classes }: { classes: { id: string; name: string }[] }) {
  const pw = getStoredPassword();
  const fileRef = useRef<HTMLInputElement>(null);
  const [result, setResult] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [seedResult, setSeedResult] = useState<string | null>(null);

  async function runSeed() {
    setSeeding(true);
    setSeedResult(null);
    const res = await seedStellaMarisPhase1({ data: { password: pw, schoolId: getSchoolIdSync() } });
    setSeeding(false);
    setSeedResult(res.ok
      ? (res.classesAdded + " kelas baru, " + res.teachersAdded + " guru baru, " + res.studentsAdded + " murid baru ditambahkan (" + res.studentsSkipped + " sudah ada sebelumnya).")
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

function AllActivitiesView({ division }: { division: string | null }) {
  const pw = getStoredPassword();
  const activities = useAsync(() => listAllActivities({ data: { password: pw, division: division || undefined } }), [pw, division]);
  const list = activities.data && "activities" in activities.data ? activities.data.activities : [];
  return (
    <ul className="space-y-2">
      {list.map((a: { id: string; title: string; body?: string; activity_date: string; author_name?: string; school_classes?: { name: string } }) => (
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

function AnnouncementPanel({ subrole, division, classes }: { subrole: AdminSubrole; division: string | null; classes: { id: string; name: string }[] }) {
  const pw = getStoredPassword();
  const [reload, setReload] = useState(0);
  const list = useAsync(() => listAnnouncements({ data: { password: pw } }), [pw, reload]);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [scope, setScope] = useState<"school" | "division" | "class">(subrole === "hos" ? "school" : "division");
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
  const items = list.data && "announcements" in list.data ? list.data.announcements : [];
  return (
    <div>
      <div className="rounded-2xl bg-card border border-border p-3 mb-3">
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Judul pengumuman" className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm mb-2" />
        <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={3} placeholder="Isi" className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm mb-2" />
        <div className="flex gap-2 flex-wrap">
          <select value={scope} onChange={(e) => setScope(e.target.value as typeof scope)} className="rounded-lg bg-background border border-border px-2 py-1.5 text-sm">
            {subrole === "hos" && <option value="school">Seluruh Sekolah</option>}
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
        {items.map((a: { id: string; title: string; body?: string; scope: string; created_at: string }) => (
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

function TeacherDashboard({ staffName, defaultClassId }: { staffName: string; defaultClassId: string | null }) {
  const pw = getStoredPassword();
  const [reload, setReload] = useState(0);
  const classes = useAsync(() => listSchoolClasses({ data: { password: pw } }), [pw]);
  const [classId, setClassId] = useState(defaultClassId ?? "");
  const students = useAsync(() => (classId ? listSchoolStudents({ data: { password: pw, classId } }) : Promise.resolve(null)), [pw, classId, reload]);
  const activities = useAsync(() => (classId ? listActivitiesForClass({ data: { password: pw, classId } }) : Promise.resolve(null)), [pw, classId, reload]);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [selectedStudent, setSelectedStudent] = useState<{ id: string; full_name: string } | null>(null);

  const classList = classes.data && "classes" in classes.data ? classes.data.classes : [];
  const studentList = students.data && "students" in students.data ? students.data.students : [];
  const activityList = activities.data && "activities" in activities.data ? activities.data.activities : [];

  async function post() {
    if (!title.trim() || !classId) return;
    await postSchoolActivity({ data: { password: pw, schoolId: getSchoolIdSync(), classId, title: title.trim(), body, authorName: staffName } });
    setTitle(""); setBody(""); setReload((x) => x + 1);
  }
  async function removeActivity(id: string) {
    await deleteSchoolActivity({ data: { password: pw, id } });
    setReload((x) => x + 1);
  }

  if (selectedStudent) {
    return (
      <div>
        <button onClick={() => setSelectedStudent(null)} className="text-xs text-muted-foreground underline mb-3">Kembali ke kelas</button>
        <p className="text-sm font-semibold mb-3">{selectedStudent.full_name}</p>
        <Section title="Guardians dan Undangan" Icon={Users}><GuardianEditor studentId={selectedStudent.id} canEdit /></Section>
        <Section title="Pesan dengan Orangtua" Icon={MessageSquare}><TeacherMessageThread studentId={selectedStudent.id} staffName={staffName} /></Section>
      </div>
    );
  }

  return (
    <div>
      <select value={classId} onChange={(e) => setClassId(e.target.value)} className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm mb-4">
        <option value="">pilih kelas</option>
        {classList.map((c: { id: string; name: string }) => <option key={c.id} value={c.id}>{c.name}</option>)}
      </select>
      {classId && (
        <>
          <Section title="Murid" Icon={Baby}>
            <ul className="space-y-2">
              {studentList.map((s: { id: string; full_name: string }) => (
                <li key={s.id}>
                  <button onClick={() => setSelectedStudent(s)} className="w-full rounded-xl bg-card border border-border p-3 text-left text-sm flex items-center justify-between">
                    {s.full_name} <span className="text-xs text-muted-foreground">Pesan / Wali</span>
                  </button>
                </li>
              ))}
              {studentList.length === 0 && <Hint>Belum ada murid di kelas ini.</Hint>}
            </ul>
          </Section>
          <Section title="Daily Activity" Icon={BookOpen}>
            <div className="rounded-2xl bg-card border border-border p-3 mb-3">
              <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Judul aktivitas" className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm mb-2" />
              <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={3} placeholder="Cerita" className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm" />
              <button onClick={post} className="mt-2 rounded-lg bg-primary text-primary-foreground px-3 py-1.5 text-sm font-semibold flex items-center gap-1"><Save size={13} /> Kirim</button>
            </div>
            <ul className="space-y-2">
              {activityList.map((a: { id: string; title: string; body?: string; activity_date: string; author_name?: string }) => (
                <li key={a.id} className="rounded-xl bg-card border border-border p-3">
                  <div className="flex justify-between"><p className="text-sm font-semibold">{a.title}</p><button onClick={() => removeActivity(a.id)} className="text-destructive"><Trash2 size={13} /></button></div>
                  <p className="text-xs text-muted-foreground mt-0.5">{new Date(a.activity_date).toLocaleDateString()}{a.author_name ? " - " + a.author_name : ""}</p>
                  {a.body && <p className="text-sm mt-2 whitespace-pre-wrap">{a.body}</p>}
                </li>
              ))}
            </ul>
          </Section>
        </>
      )}
    </div>
  );
}

function TeacherMessageThread({ studentId, staffName }: { studentId: string; staffName: string }) {
  const pw = getStoredPassword();
  const [reload, setReload] = useState(0);
  const msgs = usePolling(() => listMessagesForStudent({ data: { password: pw, studentId } }), [pw, studentId, reload], 6000);
  const [body, setBody] = useState("");
  const list = msgs.data && "messages" in msgs.data ? msgs.data.messages : [];
  const unread = list.filter((m: { from_side: string; closed_by_teacher: boolean }) => m.from_side === "parent" && !m.closed_by_teacher).length;

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
        {list.map((m: { id: string; from_side: string; body: string; author_name?: string }) => (
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
function ParentMessageThread({ code }: { code: string }) {
  const [reload, setReload] = useState(0);
  const msgs = usePolling(() => listMessagesForCode({ data: { code } }), [code, reload], 6000);
  const [body, setBody] = useState("");
  const list = msgs.data && "messages" in msgs.data ? msgs.data.messages : [];
  const unread = list.filter((m: { from_side: string; closed_by_parent: boolean }) => m.from_side === "teacher" && !m.closed_by_parent).length;

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
        {list.map((m: { id: string; from_side: string; body: string; author_name?: string }) => (
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

function ParentDashboard({ code }: { code: string }) {
  const info = useAsync(() => getStudentForCode({ data: { code } }), [code]);
  const activities = useAsync(() => listActivitiesForCode({ data: { code } }), [code]);
  const announcements = useAsync(() => listAnnouncementsForCode({ data: { code } }), [code]);
  const student = info.data && "student" in info.data ? info.data.student : null;
  const activityList = activities.data && "activities" in activities.data ? activities.data.activities : [];
  const announcementList = announcements.data && "announcements" in announcements.data ? announcements.data.announcements : [];

  if (info.loading) return <p className="text-sm text-muted-foreground text-center py-8">Memuat</p>;
  if (!student) return <p className="text-sm text-destructive text-center py-8">{(info.data && "error" in info.data && info.data.error) || "Data tidak ditemukan."}</p>;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="rounded-full bg-primary/15 text-primary px-3 py-1.5 text-sm font-semibold flex items-center gap-1.5"><Baby size={14} /> {student.nickname || student.full_name}</div>
        <button onClick={parentLogout} className="text-xs rounded-full border border-border px-3 py-1.5 flex items-center gap-1"><LogOut size={12} /> Keluar</button>
      </div>

      <Section title="Pengumuman" Icon={Megaphone}>
        <ul className="space-y-2">
          {announcementList.slice(0, 5).map((a: { id: string; title: string; body?: string; created_at: string }) => (
            <li key={a.id} className="rounded-xl bg-card border border-border p-3 text-sm"><p className="font-semibold">{a.title}</p><p className="text-xs text-muted-foreground">{new Date(a.created_at).toLocaleString()}</p>{a.body && <p className="mt-1">{a.body}</p>}</li>
          ))}
          {announcementList.length === 0 && <Hint>Belum ada pengumuman.</Hint>}
        </ul>
      </Section>

      <Section title="Daily Activities" Icon={BookOpen}>
        <ul className="space-y-2">
          {activityList.map((a: { id: string; title: string; body?: string; activity_date: string }) => (
            <li key={a.id} className="rounded-xl bg-card border border-border p-3 text-sm"><p className="font-semibold">{a.title}</p><p className="text-xs text-muted-foreground">{new Date(a.activity_date).toLocaleDateString()}</p>{a.body && <p className="mt-1">{a.body}</p>}</li>
          ))}
          {activityList.length === 0 && <Hint>Belum ada laporan aktivitas.</Hint>}
        </ul>
      </Section>

      <Section title="Pesan dengan Guru" Icon={MessageSquare}><ParentMessageThread code={code} /></Section>
    </div>
  );
}

function useAsync<T>(fn: () => Promise<T> | null, deps: unknown[]): { data: T | null; loading: boolean } {
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
function usePolling<T>(fn: () => Promise<T> | null, deps: unknown[], intervalMs: number): { data: T | null; loading: boolean } {
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
function Section({ title, Icon, children }: { title: string; Icon: typeof Shield; children: React.ReactNode }) {
  return (
    <section className="mb-5">
      <div className="flex items-center gap-2 mb-2"><Icon size={14} className="text-primary" /><h3 className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">{title}</h3></div>
      {children}
    </section>
  );
}
function Hint({ children }: { children: React.ReactNode }) {
  return <p className="text-xs text-muted-foreground text-center py-4">{children}</p>;
}
