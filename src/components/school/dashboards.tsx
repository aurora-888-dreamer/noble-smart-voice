// Role-specific School dashboards. Each one is rendered by its own route
// under /school/* — see src/routes/school.*.tsx.
import { useState, useEffect } from "react";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>;
import {
  GraduationCap, Users, Baby, BookOpen, MessageSquare, Megaphone, Bell, Save, Trash2, LogOut, Shield, ArrowLeft, KeyRound,
} from "lucide-react";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  CalendarPanel, TimetablePanel, LessonPlanPanel, ProjectPanel, AssessmentPanel, AttendancePanel, AgendaPanel, StaffMessagePanel, CasePanel, CompetencyManager,
  IncidentalContactPanel,
} from "./SchoolAcademic";

import {
  DIVISIONS, ROLE_LABEL, Hint, Section, StatCard, Tabs, ReadOnlyNote, useAsync, useClasses,
  getStoredPassword, getSchoolIdSync, StaffRoster, StudentRoster, GuardianEditor, CsvImportPanel,
  AllActivitiesView, AnnouncementPanel, TeacherMessageThread, ParentMessageThread,
  ChangePinPanel, PersonnelManager, StaffProfilePreviewButton, StudentProfilePreviewButton,
} from "./shared";
import {
  listSchoolStaff, listSchoolStudents, postSchoolActivity, deleteSchoolActivity, listActivitiesForClass,
  getStudentForCode, listActivitiesForCode, listAnnouncementsForCode, listUnreadParentStudentIds,
  getParentNotifications, markAnnouncementsSeenForParent, type SchoolRole,
} from "@/lib/school.functions";
import { updateStaffAccount } from "@/lib/school-accounts.functions";
import { getPendingCounts } from "@/lib/school-pending-counts.functions";
import { listUnreadStaffSenderIds } from "@/lib/school-staff-messages.functions";
import { sendHeartbeat } from "@/lib/school-presence.functions";
import { schoolLogout, type SchoolSession } from "@/lib/school-store";
import {
  checkMyProfileStatus, getMyStaffProfile, saveMyStaffProfile,
  checkMyStudentProfileStatus, getMyStudentProfile, saveMyStudentProfile,
} from "@/lib/school-profile.functions";

const ACADEMIC_TABS = [
  { id: "calendar", label: "Calendar" }, { id: "timetable", label: "Timetable" },
  { id: "lesson", label: "Lesson Plan" }, { id: "projects", label: "Official Letter" },
  { id: "assessment", label: "Assessment" }, { id: "attendance", label: "Attendance" },
];

const PIN_TAB = { id: "pin", label: "Change PIN" };

export function StaffHeader({ session }: { session: SchoolSession }) {
  const navigate = useNavigate();
  const pw = getStoredPassword();
  const divisionLabel = session.division ? (DIVISIONS.find((d) => d.id === session.division)?.label ?? session.division) : null;
  useEffect(() => {
    sendHeartbeat({ data: { password: pw, staffId: session.id } });
    const t = setInterval(() => sendHeartbeat({ data: { password: pw, staffId: session.id } }), 45000);
    return () => clearInterval(t);
  }, [pw, session.id]);
  return (
    <div className="mb-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Signed in as</p>
          <p className="text-sm font-semibold">{session.name}</p>
          <p className="text-[11px] text-muted-foreground">
            {session.role ? ROLE_LABEL[session.role as SchoolRole] ?? session.role : ""}{divisionLabel ? " · " + divisionLabel : ""} · <code className="font-mono">{session.userId}</code>
          </p>
        </div>
        <button onClick={() => { schoolLogout(); navigate({ to: "/school" }); }} className="text-xs rounded-full border border-border px-3 py-1.5 flex items-center gap-1"><LogOut size={12} /> Keluar</button>
      </div>
      {session.pinIsDefault && (
        <p className="mt-2 rounded-lg bg-destructive/10 text-destructive text-[11px] px-3 py-2">
          PIN Anda masih default (123456). Segera ganti lewat tab “Ganti PIN”.
        </p>
      )}
    </div>
  );
}


/** Blocks access to the dashboard until the staff member's own Profile is
 * complete — exempt only for the HoS account with user_id "Noble888". */
export function StaffProfileGate({ session, children }: { session: SchoolSession; children: React.ReactNode }) {
  const pw = getStoredPassword();
  const [reload, setReload] = useState(0);
  const status = useAsync(() => checkMyProfileStatus({ data: { password: pw, staffId: session.id } }), [pw, session.id, reload]);
  if (!status.data) return null;
  if (!status.data.ok) return <p className="text-sm text-destructive">{status.data.error}</p>;
  if (status.data.exempt || status.data.isComplete) return <>{children}</>;
  return <StaffProfileForm pw={pw} staffId={session.id} onSaved={() => setReload((x) => x + 1)} />;
}

/** Same, but for Parent — completing their Student's profile (not their own). */
export function ParentProfileGate({ code, children }: { code: string; children: React.ReactNode }) {
  const [reload, setReload] = useState(0);
  const status = useAsync(() => checkMyStudentProfileStatus({ data: { code } }), [code, reload]);
  if (!status.data) return null;
  if (!status.data.ok) return <p className="text-sm text-destructive">{status.data.error}</p>;
  if (status.data.isComplete) return <>{children}</>;
  return <StudentProfileForm code={code} onSaved={() => setReload((x) => x + 1)} />;
}

const GENDERS = ["Laki-laki", "Perempuan"];
const RELIGIONS = ["Islam", "Kristen Protestan", "Katolik", "Hindu", "Buddha", "Konghucu", "Lainnya"];

function ProfileFields({ f, set }: { f: Row; set: (patch: Row) => void }) {
  return (
    <div className="grid gap-2">
      <input value={f.fullName ?? ""} onChange={(e) => set({ fullName: e.target.value })} placeholder="Nama lengkap *" className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm" />
      <input value={f.nickname ?? ""} onChange={(e) => set({ nickname: e.target.value })} placeholder="Nama panggilan" className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm" />
      <select value={f.gender ?? ""} onChange={(e) => set({ gender: e.target.value })} className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm">
        <option value="">Jenis kelamin</option>
        {GENDERS.map((g) => <option key={g} value={g}>{g}</option>)}
      </select>
      <div className="grid grid-cols-2 gap-2">
        <input value={f.birthplace ?? ""} onChange={(e) => set({ birthplace: e.target.value })} placeholder="Tempat lahir" className="rounded-lg bg-background border border-border px-3 py-2 text-sm" />
        <input type="date" value={f.birthDate ?? ""} onChange={(e) => set({ birthDate: e.target.value })} className="rounded-lg bg-background border border-border px-3 py-2 text-sm" />
      </div>
      <textarea value={f.homeAddress ?? ""} onChange={(e) => set({ homeAddress: e.target.value })} rows={2} placeholder="Alamat tinggal" className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm" />
      <textarea value={f.idCardAddress ?? ""} onChange={(e) => set({ idCardAddress: e.target.value })} rows={2} placeholder="Alamat sesuai KTP" className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm" />
      <div className="grid grid-cols-2 gap-2">
        <input value={f.whatsapp ?? ""} onChange={(e) => set({ whatsapp: e.target.value })} placeholder="Nomor WhatsApp" className="rounded-lg bg-background border border-border px-3 py-2 text-sm" />
        <select value={f.religion ?? ""} onChange={(e) => set({ religion: e.target.value })} className="rounded-lg bg-background border border-border px-3 py-2 text-sm">
          <option value="">Agama</option>
          {RELIGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
      </div>
      <input value={f.allergies ?? ""} onChange={(e) => set({ allergies: e.target.value })} placeholder="Alergi (kalau ada)" className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm" />
      <textarea value={f.healthNotes ?? ""} onChange={(e) => set({ healthNotes: e.target.value })} rows={2} placeholder="Catatan kesehatan lainnya (kalau ada)" className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm" />
      <div>
        <label className="text-xs text-muted-foreground block mb-1">Foto Profile</label>
        <input type="file" accept="image/*" onChange={(e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          const reader = new FileReader();
          reader.onload = () => set({ photoUrl: String(reader.result) });
          reader.readAsDataURL(file);
        }} className="text-xs" />
        {f.photoUrl && <img src={f.photoUrl} alt="preview" className="mt-2 w-20 h-20 rounded-full object-cover border border-border" />}
      </div>
    </div>
  );
}

function StaffProfileForm({ pw, staffId, onSaved }: { pw: string; staffId: string; onSaved: () => void }) {
  const [f, setF] = useState<Row>({});
  const [loaded, setLoaded] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    getMyStaffProfile({ data: { password: pw, staffId } }).then((r) => {
      if (r.ok) {
        const p = r.profile;
        setF({
          fullName: p.full_name ?? "", nickname: p.nickname ?? "", gender: p.gender ?? "",
          homeAddress: p.home_address ?? "", idCardAddress: p.id_card_address ?? "",
          birthplace: p.birthplace ?? "", birthDate: p.birth_date ?? "", whatsapp: p.whatsapp ?? "",
          email: p.email ?? "", religion: p.religion ?? "", allergies: p.allergies ?? "",
          healthNotes: p.health_notes ?? "", photoUrl: p.photo_url ?? "",
        });
      }
      setLoaded(true);
    });
  }, [pw, staffId]);
  async function save() {
    if (!f.fullName?.trim()) { setErr("Nama lengkap wajib diisi."); return; }
    setBusy(true); setErr(null);
    const r = await saveMyStaffProfile({ data: { password: pw, staffId, ...(f as Row), fullName: String(f.fullName) } });
    setBusy(false);
    if (!r.ok) { setErr(r.error); return; }
    onSaved();
  }
  if (!loaded) return null;
  return (
    <div className="max-w-lg mx-auto">
      <h2 className="text-lg font-semibold mb-1">Lengkapi Profile Anda</h2>
      <p className="text-sm text-muted-foreground mb-4">Wajib diisi sebelum bisa mengakses dashboard.</p>
      <ProfileFields f={f} set={(patch) => setF((x) => ({ ...x, ...patch }))} />
      <input value={f.email ?? ""} onChange={(e) => setF((x) => ({ ...x, email: e.target.value }))} placeholder="Email" className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm mt-2" />
      {err && <p className="text-xs text-destructive mt-2">{err}</p>}
      <button onClick={save} disabled={busy} className="mt-3 rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm font-semibold disabled:opacity-50">Simpan & Lanjutkan</button>
    </div>
  );
}

function StudentProfileForm({ code, onSaved }: { code: string; onSaved: () => void }) {
  const [f, setF] = useState<Row>({});
  const [loaded, setLoaded] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    getMyStudentProfile({ data: { code } }).then((r) => {
      if (r.ok) {
        const p = r.profile;
        setF({
          fullName: p.full_name ?? "", nickname: p.nickname ?? "", gender: p.gender ?? "",
          homeAddress: p.address ?? "", idCardAddress: p.id_card_address ?? "",
          birthplace: p.pob ?? "", birthDate: p.dob ?? "", whatsapp: p.whatsapp ?? "",
          religion: p.religion ?? "", allergies: p.allergies ?? "", healthNotes: p.notes ?? "",
          photoUrl: p.photo_url ?? "",
        });
      }
      setLoaded(true);
    });
  }, [code]);
  async function save() {
    if (!f.fullName?.trim()) { setErr("Nama lengkap wajib diisi."); return; }
    setBusy(true); setErr(null);
    const r = await saveMyStudentProfile({ data: { code, ...(f as Row), fullName: String(f.fullName) } });
    setBusy(false);
    if (!r.ok) { setErr(r.error); return; }
    onSaved();
  }
  if (!loaded) return null;
  return (
    <div className="max-w-lg mx-auto">
      <h2 className="text-lg font-semibold mb-1">Lengkapi Profile Anak Anda</h2>
      <p className="text-sm text-muted-foreground mb-4">Wajib diisi sebelum bisa mengakses dashboard Parent.</p>
      <ProfileFields f={f} set={(patch) => setF((x) => ({ ...x, ...patch }))} />
      {err && <p className="text-xs text-destructive mt-2">{err}</p>}
      <button onClick={save} disabled={busy} className="mt-3 rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm font-semibold disabled:opacity-50">Simpan & Lanjutkan</button>
    </div>
  );
}


/** Read-only academic viewer shared by HoS / Admin HoS / Principal — except
 * Calendar, which HoS and Principal can edit for their OWN agenda entries
 * (everyone still sees everyone else's, per the "stay in sync" rule). */
function AcademicReadOnly({ tab, classes, reviewerRole, reviewerName, calendarStaffId, timetableStaffId, staffId, division }: {
  tab: string;
  classes: { id: string; name: string }[];
  reviewerRole: "principal" | "hos" | null;
  reviewerName?: string;
  calendarStaffId?: string | null;
  timetableStaffId?: string | null;
  staffId?: string | null;
  division?: string | null;
}) {
  const pw = getStoredPassword();
  if (!ACADEMIC_TABS.some((t) => t.id === tab)) return null;
  if (tab === "calendar" && calendarStaffId) {
    return <CalendarPanel access={{ pw, staffId: calendarStaffId }} classes={classes} canEdit compact roleScope={reviewerRole ?? undefined} fixedDivision={reviewerRole === "principal" ? (division ?? undefined) : undefined} />;
  }
  if (tab === "timetable" && reviewerRole === "principal" && timetableStaffId) {
    return <TimetablePanel access={{ pw }} classes={classes} canEdit staffId={timetableStaffId} />;
  }
  if (tab === "projects" && reviewerRole === "principal") {
    return <ProjectPanel pw={pw} classes={classes} canSubmit staffId={staffId} reviewerRole={reviewerRole} reviewerName={reviewerName} />;
  }
  if (tab === "assessment" && reviewerRole === "principal" && staffId) {
    return (
      <div>
        <CompetencyManager pw={pw} staffId={staffId} />
        <ReadOnlyNote />
        <AssessmentPanel access={{ pw }} classes={classes} canEdit={false} />
      </div>
    );
  }
  return (
    <div>
      <ReadOnlyNote />
      {tab === "calendar" && <CalendarPanel access={{ pw }} classes={classes} canEdit={false} compact />}
      {tab === "timetable" && <TimetablePanel access={{ pw }} classes={classes} canEdit={false} />}
      {tab === "lesson" && <LessonPlanPanel pw={pw} classes={classes} canEdit={false} />}
      {tab === "projects" && <ProjectPanel pw={pw} classes={classes} canSubmit={false} reviewerRole={reviewerRole} reviewerName={reviewerName} />}
      {tab === "assessment" && <AssessmentPanel access={{ pw }} classes={classes} canEdit={false} />}
      {tab === "attendance" && <AttendancePanel access={{ pw }} classes={classes} canEdit={false} />}
    </div>
  );
}

/* ───────────── HoS ───────────── */
const SP_DIVISIONS = DIVISIONS.filter((d) => d.id !== "All Divisions");

/** School Profile (SP) — replaces the old Overview + Staff & Role tabs.
 * Browsing (Division/Class/Staff/Student) is read-only view+search; actual
 * add/edit/delete only happens in the separate "Profile Update" section. */
function SchoolProfilePanel({ pw, staffId, classes, scopeDivision = null }: { pw: string; staffId: string; classes: { id: string; name: string; division: string }[]; scopeDivision?: string | null }) {
  const scoped = !!scopeDivision;
  const [view, setView] = useState<"overview" | "division" | "class" | "staff" | "student" | "update">(scoped ? "division" : "overview");
  const [divisionSel, setDivisionSel] = useState<string | null>(scopeDivision);
  const [classSel, setClassSel] = useState("");
  const [updateTab, setUpdateTab] = useState<"staff" | "student">("staff");
  const [search, setSearch] = useState("");
  const [academicSub, setAcademicSub] = useState("profile");

  const staffRes = useAsync(() => listSchoolStaff({ data: { password: pw } }), [pw]);
  const allStaff = (staffRes.data && "staff" in staffRes.data ? (staffRes.data.staff ?? []) : []) as Row[];
  const studentsRes = useAsync(() => listSchoolStudents({ data: { password: pw } }), [pw]);
  const allStudents = (studentsRes.data && "students" in studentsRes.data ? (studentsRes.data.students ?? []) : []) as Row[];
  const classDivision = new Map(classes.map((c) => [c.id, c.division]));
  const classIds = new Set(classes.map((c) => c.id));
  // Principal view: everything is clamped to their own division.
  const staffList = scoped ? allStaff.filter((s) => s.division === scopeDivision) : allStaff;
  const studentList = scoped ? allStudents.filter((s) => classIds.has(s.class_id)) : allStudents;

  function countsFor(divId: string) {
    return {
      classCount: classes.filter((c) => c.division === divId).length,
      staffCount: allStaff.filter((s) => s.division === divId).length,
      studentCount: allStudents.filter((s) => classDivision.get(s.class_id) === divId).length,
    };
  }

  function back() { setView(scoped ? "division" : "overview"); setDivisionSel(scopeDivision); setClassSel(""); setSearch(""); setAcademicSub("profile"); }

  const scopedNav = scoped ? (
    <div className="flex gap-2 flex-wrap mb-4">
      {([["division", "Division"], ["staff", "All Staff"], ["student", "All Student"], ["update", "Profile Update"]] as const).map(([id, label]) => (
        <button key={id} onClick={() => { setView(id); setSearch(""); setAcademicSub("profile"); }}
          className={"rounded-full px-3 py-1.5 text-xs font-semibold border " + (view === id ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border")}>{label}</button>
      ))}
    </div>
  ) : null;

  if (view !== "overview") {
    return (
      <div>
        {scoped ? scopedNav : (
          <button onClick={back} className="text-xs text-muted-foreground underline mb-4 flex items-center gap-1"><ArrowLeft size={12} /> Kembali ke School Profile</button>
        )}


        {view === "division" && divisionSel && (
          <div>
            <h3 className="text-sm font-semibold mb-3">{SP_DIVISIONS.find((d) => d.id === divisionSel)?.label}</h3>
            <div className="flex gap-2 mb-3 flex-wrap">
              <button onClick={() => setAcademicSub("profile")} className={"rounded-full px-3 py-1 text-xs font-semibold border " + (academicSub === "profile" ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border")}>Profile</button>
              <button onClick={() => setAcademicSub("activity")} className={"rounded-full px-3 py-1 text-xs font-semibold border " + (academicSub === "activity" ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border")}>Activity</button>
              <button onClick={() => setAcademicSub("timetable")} className={"rounded-full px-3 py-1 text-xs font-semibold border " + (academicSub === "timetable" ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border")}>Time Table</button>
              <button onClick={() => setAcademicSub("attendance")} className={"rounded-full px-3 py-1 text-xs font-semibold border " + (academicSub === "attendance" ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border")}>Attendance</button>
            </div>
            {academicSub === "profile" && (
              <>
                <p className="text-xs uppercase tracking-wide text-muted-foreground font-semibold mb-1.5">Principal & Vice Principal</p>
                <ul className="space-y-1.5 mb-4">
                  {staffList.filter((s) => s.division === divisionSel && (s.role === "principal" || s.role === "vice_principal")).map((s) => (
                    <li key={s.id} className="flex items-center justify-between rounded-lg bg-card border border-border px-3 py-2 text-sm">
                      {s.full_name} <StaffProfilePreviewButton staffId={s.id} fullName={s.full_name} />
                    </li>
                  ))}
                </ul>
                <p className="text-xs uppercase tracking-wide text-muted-foreground font-semibold mb-1.5">Kelas di Divisi Ini</p>
                <ul className="space-y-1.5">
                  {classes.filter((c) => c.division === divisionSel).map((c) => (
                    <li key={c.id}>
                      <button onClick={() => { setClassSel(c.id); setView("class"); }} className="w-full text-left rounded-lg bg-card border border-border px-3 py-2 text-sm">{c.name}</button>
                    </li>
                  ))}
                </ul>
              </>
            )}
            {academicSub === "activity" && <AllActivitiesView division={divisionSel} />}
            {academicSub === "timetable" && <TimetablePanel access={{ pw }} classes={classes.filter((c) => c.division === divisionSel)} canEdit={false} />}
            {academicSub === "attendance" && <AttendancePanel access={{ pw }} classes={classes.filter((c) => c.division === divisionSel)} canEdit={false} />}
          </div>
        )}

        {view === "class" && (
          <div>
            <select value={classSel} onChange={(e) => setClassSel(e.target.value)} className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm mb-3">
              <option value="">pilih kelas</option>
              {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            {classSel && (
              <>
                <p className="text-xs uppercase tracking-wide text-muted-foreground font-semibold mb-1.5">Homeroom</p>
                <p className="text-sm mb-4">{staffList.filter((s) => s.class_id === classSel && s.role === "teacher_homeroom").map((s) => s.full_name).join(", ") || "-"}</p>
                <p className="text-xs uppercase tracking-wide text-muted-foreground font-semibold mb-1.5">Students ({studentList.filter((s) => s.class_id === classSel).length})</p>
                <ul className="space-y-1.5">
                  {studentList.filter((s) => s.class_id === classSel).map((s) => (
                    <li key={s.id} className="flex items-center justify-between rounded-lg bg-card border border-border px-3 py-2 text-sm">
                      <span className="flex items-center gap-2">
                        {s.photo_url ? <img src={s.photo_url} alt={s.full_name} className="w-6 h-6 rounded-full object-cover" /> : <Baby size={14} className="text-muted-foreground" />}
                        {s.full_name}
                      </span>
                      <StudentProfilePreviewButton studentId={s.id} fullName={s.full_name} />
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        )}

        {view === "staff" && (
          <div>
            <div className="flex gap-2 mb-3 flex-wrap">
              <button onClick={() => setAcademicSub("profile")} className={"rounded-full px-3 py-1 text-xs font-semibold border " + (academicSub === "profile" ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border")}>Profile</button>
              <button onClick={() => setAcademicSub("activity")} className={"rounded-full px-3 py-1 text-xs font-semibold border " + (academicSub === "activity" ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border")}>Activity</button>
              <button onClick={() => setAcademicSub("lesson")} className={"rounded-full px-3 py-1 text-xs font-semibold border " + (academicSub === "lesson" ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border")}>Lesson Plan</button>
            </div>
            {academicSub === "profile" && (
              <>
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari staff…" className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm mb-3" />
                <ul className="space-y-1.5">
                  {staffList.filter((s) => s.full_name.toLowerCase().includes(search.toLowerCase())).map((s) => (
                    <li key={s.id} className="flex items-center justify-between rounded-lg bg-card border border-border px-3 py-2 text-sm">
                      <span>{s.full_name}<span className="text-[10px] text-muted-foreground ml-2">{ROLE_LABEL[s.role] ?? s.role}</span></span>
                      <StaffProfilePreviewButton staffId={s.id} fullName={s.full_name} />
                    </li>
                  ))}
                </ul>
              </>
            )}
            {academicSub === "activity" && <AllActivitiesView division={null} />}
            {academicSub === "lesson" && <LessonPlanPanel pw={pw} classes={classes} canEdit={false} />}
          </div>
        )}

        {view === "student" && (
          <div>
            <div className="flex gap-2 mb-3 flex-wrap">
              <button onClick={() => setAcademicSub("profile")} className={"rounded-full px-3 py-1 text-xs font-semibold border " + (academicSub === "profile" ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border")}>Profile</button>
              <button onClick={() => setAcademicSub("activity")} className={"rounded-full px-3 py-1 text-xs font-semibold border " + (academicSub === "activity" ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border")}>Activity</button>
              <button onClick={() => setAcademicSub("assessment")} className={"rounded-full px-3 py-1 text-xs font-semibold border " + (academicSub === "assessment" ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border")}>Assessment</button>
              <button onClick={() => setAcademicSub("attendance")} className={"rounded-full px-3 py-1 text-xs font-semibold border " + (academicSub === "attendance" ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border")}>Attendance</button>
            </div>
            {academicSub === "profile" && (
              <>
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari murid…" className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm mb-3" />
                <ul className="space-y-1.5">
                  {studentList.filter((s) => s.full_name.toLowerCase().includes(search.toLowerCase())).map((s) => (
                    <li key={s.id} className="flex items-center justify-between rounded-lg bg-card border border-border px-3 py-2 text-sm">
                      {s.full_name}
                      <StudentProfilePreviewButton studentId={s.id} fullName={s.full_name} />
                    </li>
                  ))}
                </ul>
              </>
            )}
            {academicSub === "activity" && <AllActivitiesView division={null} />}
            {academicSub === "assessment" && <AssessmentPanel access={{ pw }} classes={classes} canEdit={false} />}
            {academicSub === "attendance" && <AttendancePanel access={{ pw }} classes={classes} canEdit={false} />}
          </div>
        )}

        {view === "update" && (
          <div>
            <div className="flex gap-2 mb-3">
              <button onClick={() => setUpdateTab("staff")} className={"rounded-full px-3 py-1 text-xs font-semibold border " + (updateTab === "staff" ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border")}>Staff</button>
              <button onClick={() => setUpdateTab("student")} className={"rounded-full px-3 py-1 text-xs font-semibold border " + (updateTab === "student" ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border")}>Student</button>
            </div>
            {updateTab === "staff" ? (
              <div>
                <p className="text-xs text-muted-foreground mb-3">
                  Buat akun baru: Vice HoS, Admin HoS, Principal, Vice Principal, Admin Principal, Homeroom Teacher (bisa assign/lepas kelas)
                  dan Subject Teacher (bisa assign/lepas mata pelajaran). UserID dibuat otomatis, PIN awal <code className="font-mono">123456</code> —
                  wajib diganti saat login pertama.
                </p>
                <StaffRoster canEdit classes={classes} scopeDivision={null} />
              </div>
            ) : <StudentRoster canEdit classes={classes} />}
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      <div className="grid grid-cols-2 gap-3 mb-4">
        {SP_DIVISIONS.map((d) => {
          const c = countsFor(d.id);
          return (
            <button key={d.id} onClick={() => { setDivisionSel(d.id); setView("division"); }} className="rounded-2xl bg-card border border-border p-3 text-left hover:border-primary transition-colors">
              <p className="text-sm font-semibold mb-2">{d.label}</p>
              <p className="text-xs text-muted-foreground">Class: {c.classCount}</p>
              <p className="text-xs text-muted-foreground">Staff: {c.staffCount}</p>
              <p className="text-xs text-muted-foreground">Student: {c.studentCount}</p>
            </button>
          );
        })}
      </div>
      <div className="flex gap-2 flex-wrap">
        <button onClick={() => setView("staff")} className="rounded-full border border-border px-3 py-1.5 text-xs font-semibold">All Staff</button>
        <button onClick={() => setView("student")} className="rounded-full border border-border px-3 py-1.5 text-xs font-semibold">All Student</button>
        <button onClick={() => setView("update")} className="rounded-full border border-border px-3 py-1.5 text-xs font-semibold">Profile Update</button>
      </div>
      <p className="text-[11px] text-muted-foreground mt-4">EoY Backup dan BoY Import belum tersedia — fitur ini menyusul di giliran berikutnya.</p>
    </div>
  );
}

/** Messages hub (HoS & Principal) — merges Direct Message, Announcements,
 * Official Letter, and Incidental Contacts into one tab with sub-navigation.
 * For a Principal everything is scoped to their own division. */
function MessagesHubPanel({ pw, staffId, classes, role = "hos", division = null, staffName = "Head of School" }: {
  pw: string; staffId: string; classes: { id: string; name: string }[];
  role?: "hos" | "principal"; division?: string | null; staffName?: string;
}) {
  const [sub, setSub] = useState<"direct" | "announce" | "letter" | "incidental">("direct");
  return (
    <div>
      <div className="flex gap-2 mb-3 flex-wrap">
        <button onClick={() => setSub("direct")} className={"rounded-full px-3 py-1 text-xs font-semibold border " + (sub === "direct" ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border")}>Direct Message</button>
        <button onClick={() => setSub("announce")} className={"rounded-full px-3 py-1 text-xs font-semibold border " + (sub === "announce" ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border")}>Announcements</button>
        <button onClick={() => setSub("letter")} className={"rounded-full px-3 py-1 text-xs font-semibold border " + (sub === "letter" ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border")}>Official Letter</button>
        <button onClick={() => setSub("incidental")} className={"rounded-full px-3 py-1 text-xs font-semibold border " + (sub === "incidental" ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border")}>Incidental Link</button>
      </div>
      {sub === "direct" && <StaffMessagePanel pw={pw} staffId={staffId} />}
      {sub === "announce" && <AnnouncementPanel subrole={role} division={division} classes={classes} />}
      {sub === "letter" && <ProjectPanel pw={pw} classes={classes} canSubmit={role === "principal"} staffId={staffId} reviewerRole={role} reviewerName={staffName} />}
      {sub === "incidental" && <IncidentalContactPanel pw={pw} staffId={staffId} context="message" />}
    </div>
  );
}

function ReportHubPanel({ pw, staffId, classes, role = "hos", division = null, staffName = "Head of School" }: {
  pw: string; staffId: string; classes: { id: string; name: string }[];
  role?: "hos" | "principal"; division?: string | null; staffName?: string;
}) {
  const [sub, setSub] = useState<"report" | "incidental">("report");
  return (
    <div>
      <div className="flex gap-2 mb-3 flex-wrap">
        <button onClick={() => setSub("report")} className={"rounded-full px-3 py-1 text-xs font-semibold border " + (sub === "report" ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border")}>Report</button>
        <button onClick={() => setSub("incidental")} className={"rounded-full px-3 py-1 text-xs font-semibold border " + (sub === "incidental" ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border")}>Incidental Link</button>
      </div>
      {sub === "report" && <CasePanel access={{ pw }} role={role} staffId={staffId} staffName={staffName} division={division ?? undefined} classes={classes} />}
      {sub === "incidental" && <IncidentalContactPanel pw={pw} staffId={staffId} context="report" />}
    </div>
  );
}


function SettingsPanel({ pw, staffId, scopeDivision = null, roleLabel = "HoS" }: { pw: string; staffId: string; scopeDivision?: string | null; roleLabel?: string }) {
  const [sub, setSub] = useState<"profile" | "pin" | "userid">("profile");
  const [editingProfile, setEditingProfile] = useState(false);
  const [reload, setReload] = useState(0);
  const [search, setSearch] = useState("");
  const staffRes = useAsync(() => listSchoolStaff({ data: { password: pw } }), [pw, reload]);
  const allStaff = (staffRes.data && "staff" in staffRes.data ? (staffRes.data.staff ?? []) : []) as Row[];
  const staffList = scopeDivision ? allStaff.filter((s) => s.division === scopeDivision) : allStaff;


  async function toggleActive(id: string, isActive: boolean) {
    await updateStaffAccount({ data: { password: pw, id, isActive } });
    setReload((x) => x + 1);
  }
  async function requestReset(id: string) {
    await updateStaffAccount({ data: { password: pw, id, resetPin: true } });
    setReload((x) => x + 1);
  }
  async function saveUserId(id: string, userId: string) {
    await updateStaffAccount({ data: { password: pw, id, userId } });
    setReload((x) => x + 1);
  }

  return (
    <div>
      <div className="flex gap-2 mb-3 flex-wrap">
        <button onClick={() => setSub("profile")} className={"rounded-full px-3 py-1 text-xs font-semibold border " + (sub === "profile" ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border")}>My Profile</button>
        <button onClick={() => setSub("pin")} className={"rounded-full px-3 py-1 text-xs font-semibold border " + (sub === "pin" ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border")}>Change PIN</button>
        <button onClick={() => setSub("userid")} className={"rounded-full px-3 py-1 text-xs font-semibold border " + (sub === "userid" ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border")}>UserID & Reset PIN Request</button>
      </div>

      {sub === "profile" && !editingProfile && (
        <div>
          <p className="text-xs text-muted-foreground mb-2">Edit profile Anda sendiri (HoS).</p>
          <button onClick={() => setEditingProfile(true)} className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold">Edit Profile</button>
        </div>
      )}
      {sub === "profile" && editingProfile && (
        <StaffProfileForm pw={pw} staffId={staffId} onSaved={() => setEditingProfile(false)} />
      )}

      {sub === "pin" && <ChangePinPanel />}

      {sub === "userid" && (
        <div>
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari staff…" className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm mb-3" />
          <ul className="space-y-2">
            {staffList.filter((s) => s.full_name.toLowerCase().includes(search.toLowerCase())).map((s) => (
              <li key={s.id} className="rounded-lg bg-card border border-border p-3">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="text-sm font-semibold">{s.full_name}</span>
                  {s.is_active === false && <span className="text-[10px] text-destructive">Nonaktif</span>}
                </div>
                <div className="flex gap-2 flex-wrap items-center">
                  <input
                    defaultValue={s.user_id ?? ""}
                    onBlur={(e) => { if (e.target.value.trim() && e.target.value.trim() !== s.user_id) saveUserId(s.id, e.target.value.trim()); }}
                    className="rounded-lg bg-background border border-border px-2 py-1 text-xs w-28"
                  />
                  <button onClick={() => requestReset(s.id)} className="rounded-lg border border-border px-2 py-1 text-xs font-semibold flex items-center gap-1"><KeyRound size={11} /> Reset PIN</button>
                  <button onClick={() => toggleActive(s.id, s.is_active === false)} className="rounded-lg border border-border px-2 py-1 text-xs font-semibold">
                    {s.is_active === false ? "Aktifkan" : "Nonaktifkan"}
                  </button>
                </div>
              </li>
            ))}
            {staffList.length === 0 && <Hint>Belum ada staff.</Hint>}
          </ul>
        </div>
      )}
    </div>
  );
}
export function HosDashboard({ staffId }: { staffId: string }) {
  const [tab, setTab] = useState("sp");
  const pw = getStoredPassword();
  const classes = useClasses();
  const counts = useAsync(() => getPendingCounts({ data: { password: pw, role: "hos" } }), [pw]);
  const pending = counts.data && "ok" in counts.data && counts.data.ok ? counts.data : { officialLetters: 0, agendas: 0, reports: 0 };
  const unreadStaffRes = useAsync(() => listUnreadStaffSenderIds({ data: { password: pw, staffId } }), [pw, staffId]);
  const unreadStaffCount = unreadStaffRes.data && "ok" in unreadStaffRes.data && unreadStaffRes.data.ok ? unreadStaffRes.data.senderIds.length : 0;
  const withCount = (label: string, n: number) => (n > 0 ? `${label} (${n})` : label);
  const calendarOnlyTab = ACADEMIC_TABS.filter((t) => t.id === "calendar");
  const tabs = [
    { id: "sp", label: "School Profile" }, { id: "agenda", label: withCount("Agenda", pending.agendas) },
    { id: "message", label: unreadStaffCount > 0 ? `Messages 🟠${unreadStaffCount}` : "Messages" }, { id: "laporan", label: withCount("Report", pending.reports) },
    ...calendarOnlyTab, { id: "settings", label: "Settings" },
  ];
  return (
    <div>
      <Tabs tabs={tabs} tab={tab} onChange={setTab} mobileGrid>
        {tab === "sp" && <SchoolProfilePanel pw={pw} staffId={staffId} classes={classes} />}
        {tab === "agenda" && <AgendaPanel pw={pw} role="hos" staffId={staffId} staffName="Head of School" classes={classes} />}
        {tab === "message" && <MessagesHubPanel pw={pw} staffId={staffId} classes={classes} />}
        {tab === "laporan" && <ReportHubPanel pw={pw} staffId={staffId} classes={classes} />}
        {tab === "settings" && <SettingsPanel pw={pw} staffId={staffId} />}
        <AcademicReadOnly tab={tab} classes={classes} reviewerRole="hos" reviewerName="Head of School" calendarStaffId={staffId} />
      </Tabs>
    </div>
  );
}

/** HoS-only: create any school account (Vice HoS, Admin HoS, Principal, Vice/Admin Principal, Teachers). */
export function RoleManager({ classes }: { classes: { id: string; name: string }[] }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground mb-3">
        Buat akun baru: Vice HoS, Admin HoS, Principal, Vice Principal, Admin Principal, Homeroom Teacher (bisa assign/lepas kelas)
        dan Subject Teacher (bisa assign/lepas mata pelajaran). UserID dibuat otomatis, PIN awal <code className="font-mono">123456</code> —
        wajib diganti saat login pertama. Role yang mencakup semua divisi otomatis diberi divisi <span className="font-semibold">All Divisions</span>.
      </p>
      <StaffRoster canEdit classes={classes} scopeDivision={null} />
    </div>
  );
}

/* ───────────── Admin HoS ───────────── */
export function AdminHosDashboard() {
  const [tab, setTab] = useState("import");
  const classes = useClasses();
  const tabs = [
    { id: "import", label: "Import Data" }, { id: "students", label: "Students" },
    { id: "staff", label: "Staff" }, { id: "personnel", label: "Manage Personnel" },
    { id: "announce", label: "Announcements" }, ...ACADEMIC_TABS, PIN_TAB,
  ];
  return (
    <div>
      <Tabs tabs={tabs} tab={tab} onChange={setTab}>
        {tab === "import" && <CsvImportPanel classes={classes} />}
        {tab === "students" && <StudentRoster canEdit classes={classes} />}
        {tab === "staff" && <StaffRoster canEdit classes={classes} scopeDivision={null} />}
        {tab === "personnel" && <PersonnelManager classes={classes} />}
        {tab === "announce" && <AnnouncementPanel subrole="admin_hos" division={null} classes={classes} />}
        {tab === "pin" && <ChangePinPanel />}
        <AcademicReadOnly tab={tab} classes={classes} reviewerRole={null} />
      </Tabs>
    </div>
  );
}

/* ───────────── Principal ───────────── */
export function PrincipalDashboard({ division, staffId, staffName }: { division: string; staffId: string; staffName: string }) {
  const [tab, setTab] = useState("overview");
  const pw = getStoredPassword();
  const classes = useClasses(division);
  const counts = useAsync(() => getPendingCounts({ data: { password: pw, role: "principal", division } }), [pw, division]);
  const pending = counts.data && "ok" in counts.data && counts.data.ok ? counts.data : { officialLetters: 0, agendas: 0, reports: 0 };
  const unreadStaffRes = useAsync(() => listUnreadStaffSenderIds({ data: { password: pw, staffId } }), [pw, staffId]);
  const unreadStaffCount = unreadStaffRes.data && "ok" in unreadStaffRes.data && unreadStaffRes.data.ok ? unreadStaffRes.data.senderIds.length : 0;
  const withCount = (label: string, n: number) => (n > 0 ? `${label} (${n})` : label);
  const academicTabsWithCount = ACADEMIC_TABS.map((t) => t.id === "projects" ? { ...t, label: withCount(t.label, pending.officialLetters) } : t);
  const tabs = [
    { id: "overview", label: "Overview" }, { id: "students", label: "Student" },
    { id: "staff", label: "Staff" }, { id: "message", label: unreadStaffCount > 0 ? `Message 🟠${unreadStaffCount}` : "Message" }, { id: "agenda", label: "Agenda" }, { id: "laporan", label: withCount("Report", pending.reports) }, { id: "activity", label: "Teacher Activity" },
    { id: "announce", label: "Announcements" }, ...academicTabsWithCount, PIN_TAB,
  ];
  return (
    <div>
      <p className="text-xs text-muted-foreground mb-3">Divisi: {DIVISIONS.find((d) => d.id === division)?.label ?? division}</p>
      <Tabs tabs={tabs} tab={tab} onChange={setTab}>
        {tab === "overview" && <div className="grid grid-cols-2 gap-3"><StatCard label="Classes" value={classes.length} Icon={GraduationCap} /></div>}
        {tab === "students" && <StudentRoster canEdit classes={classes} />}
        {tab === "staff" && <StaffRoster canEdit classes={classes} scopeDivision={division} />}
        {tab === "message" && <StaffMessagePanel pw={pw} staffId={staffId} />}
        {tab === "agenda" && <AgendaPanel pw={pw} role="principal" staffId={staffId} staffName={staffName} division={division} classes={classes} />}
        {tab === "laporan" && <CasePanel access={{ pw }} role="principal" staffId={staffId} staffName={staffName} division={division} classes={classes} />}
        {tab === "activity" && <AllActivitiesView division={division} />}
        {tab === "announce" && <AnnouncementPanel subrole="principal" division={division} classes={classes} />}
        {tab === "pin" && <ChangePinPanel />}
        <AcademicReadOnly tab={tab} classes={classes} reviewerRole="principal" reviewerName="Principal" calendarStaffId={staffId} timetableStaffId={staffId} staffId={staffId} division={division} />
      </Tabs>
    </div>
  );
}


/* ───────────── Teacher ───────────── */
export function TeacherDashboard({ staffId, staffName, role, defaultClassId }: { staffId: string; staffName: string; role: string | null; defaultClassId: string | null }) {
  const pw = getStoredPassword();
  const [reload, setReload] = useState(0);
  const allClasses = useClasses();
  const isHomeroom = role === "teacher_homeroom";
  const isSubject = role === "teacher_subject";
  // Homeroom teachers are scoped to their assigned class everywhere (Kelas tab,
  // Attendance, Assessment …) so every tab always shows the same class.
  const classList = isHomeroom && defaultClassId ? allClasses.filter((c) => c.id === defaultClassId) : allClasses;
  const [classId, setClassId] = useState(defaultClassId ?? "");
  const students = useAsync(() => (classId ? listSchoolStudents({ data: { password: pw, classId } }) : Promise.resolve(null)), [pw, classId, reload]);
  const activities = useAsync(() => (classId ? listActivitiesForClass({ data: { password: pw, classId } }) : Promise.resolve(null)), [pw, classId, reload]);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [selectedStudent, setSelectedStudent] = useState<{ id: string; full_name: string } | null>(null);
  const [tab, setTab] = useState("kelas");

  const studentList = (students.data && "students" in students.data ? (students.data.students ?? []) : []) as { id: string; full_name: string }[];
  const activityList = (activities.data && "activities" in activities.data ? (activities.data.activities ?? []) : []) as { id: string; title: string; body?: string; activity_date: string; author_name?: string }[];
  const unreadRes = useAsync(() => (classId ? listUnreadParentStudentIds({ data: { password: pw, classId } }) : Promise.resolve(null)), [pw, classId, selectedStudent]);
  const unreadStudentIds = new Set(unreadRes.data && "ok" in unreadRes.data && unreadRes.data.ok ? unreadRes.data.studentIds : []);
  const unreadStaffRes = useAsync(() => listUnreadStaffSenderIds({ data: { password: pw, staffId } }), [pw, staffId, reload]);
  const unreadStaffCount = unreadStaffRes.data && "ok" in unreadStaffRes.data && unreadStaffRes.data.ok ? unreadStaffRes.data.senderIds.length : 0;

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
        <Section title="Invite Parent" Icon={Users}><GuardianEditor studentId={selectedStudent.id} canEdit /></Section>
        <Section title="Messages with Parent" Icon={MessageSquare}><TeacherMessageThread studentId={selectedStudent.id} staffName={staffName} /></Section>
      </div>
    );
  }

  const tabs = [
    { id: "kelas", label: unreadStudentIds.size > 0 ? `Class 🔴${unreadStudentIds.size}` : "Class" }, { id: "calendar", label: "Calendar" }, { id: "timetable", label: "Timetable" },
    { id: "lesson", label: "Lesson Plan" }, { id: "projects", label: "Official Letter" },
    { id: "assessment", label: "Assessment" },
    ...(isHomeroom ? [{ id: "attendance", label: "Attendance" }] : []),
    { id: "message", label: unreadStaffCount > 0 ? `Message 🟠${unreadStaffCount}` : "Message" },
    { id: "agenda", label: "Agenda" },
    { id: "laporan", label: "Report" },
    PIN_TAB,
  ];

  return (
    <div>
      <Tabs tabs={tabs} tab={tab} onChange={setTab}>
        {tab === "calendar" && <CalendarPanel access={{ pw, staffId }} classes={classList} canEdit roleScope="teacher" fixedDivision={classList[0]?.division} />}
        {tab === "timetable" && <TimetablePanel access={{ pw }} classes={classList} canEdit={false} />}
        {tab === "lesson" && <LessonPlanPanel pw={pw} classes={classList} canEdit />}
        {tab === "projects" && <ProjectPanel pw={pw} classes={classList} canSubmit reviewerRole={null} reviewerName={staffName} staffId={staffId} />}
        {tab === "assessment" && <AssessmentPanel access={{ pw }} classes={classList} canEdit={isSubject || isHomeroom} />}
        {tab === "attendance" && isHomeroom && <AttendancePanel access={{ pw }} classes={classList} canEdit />}
        {tab === "message" && <StaffMessagePanel pw={pw} staffId={staffId} />}
        {tab === "agenda" && <AgendaPanel pw={pw} role="teacher" staffId={staffId} staffName={staffName} classes={classList} />}
        {tab === "laporan" && <CasePanel access={{ pw }} role="teacher" staffId={staffId} staffName={staffName} classes={classList} />}
        {tab === "pin" && <ChangePinPanel />}

        {tab === "kelas" && (
          <>
            {isHomeroom ? (
              <p className="text-sm font-semibold mb-4">Kelas: {classList[0]?.name ?? "-"}</p>
            ) : (
              <select value={classId} onChange={(e) => setClassId(e.target.value)} className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm mb-4">
                <option value="">pilih kelas</option>
                {classList.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            )}

            {classId && (
              <>
                <Section title="Students" Icon={Baby}>
                  <ul className="space-y-2">
                    {studentList.map((s) => (
                      <li key={s.id}>
                        <button onClick={() => setSelectedStudent(s)} className="w-full rounded-xl bg-card border border-border p-3 text-left text-sm flex items-center justify-between">
                          <span className="flex items-center gap-1.5">
                            {unreadStudentIds.has(s.id) && <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" title="Pesan baru dari orangtua" />}
                            {s.full_name}
                          </span>
                          <span className="text-xs text-muted-foreground">Pesan / Wali</span>
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
                    {activityList.map((a) => (
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
          </>
        )}
      </Tabs>
    </div>
  );
}

function ParentSettingsPanel({ code }: { code: string }) {
  const [editing, setEditing] = useState(false);
  const [savedMsg, setSavedMsg] = useState(false);
  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-wide text-muted-foreground font-semibold mb-2">Change PIN</p>
        <ChangePinPanel />
      </div>
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">Edit Profile</p>
          {!editing && <button onClick={() => setEditing(true)} className="text-xs text-primary underline">Edit</button>}
        </div>
        {savedMsg && <p className="text-xs text-emerald-600 mb-2">Profile tersimpan.</p>}
        {editing ? (
          <StudentProfileForm code={code} onSaved={() => { setEditing(false); setSavedMsg(true); setTimeout(() => setSavedMsg(false), 2000); }} />
        ) : (
          <p className="text-xs text-muted-foreground">Klik "Edit" untuk mengubah data profile anak Anda.</p>
        )}
      </div>
    </div>
  );
}

/* ───────────── Parent ───────────── */
const PARENT_MENU = [
  { id: "settings", label: "Settings", Icon: Shield, color: "bg-slate-500/15 text-slate-600" },
  { id: "announce", label: "Announcements", Icon: Megaphone, color: "bg-blue-500/15 text-blue-600" },
  { id: "activities", label: "Daily Activities", Icon: BookOpen, color: "bg-emerald-500/15 text-emerald-600" },
  { id: "calendar", label: "Calendar", Icon: Bell, color: "bg-purple-500/15 text-purple-600" },
  { id: "timetable", label: "Timetable", Icon: BookOpen, color: "bg-amber-500/15 text-amber-600" },
  { id: "assessment", label: "Assessment", Icon: GraduationCap, color: "bg-pink-500/15 text-pink-600" },
  { id: "attendance", label: "Attendance", Icon: Baby, color: "bg-teal-500/15 text-teal-600" },
  { id: "message", label: "Messages with Teacher", Icon: MessageSquare, color: "bg-red-500/15 text-red-600" },
  { id: "report", label: "Report", Icon: Shield, color: "bg-orange-500/15 text-orange-600" },
];

export function ParentDashboard({ code }: { code: string }) {
  const navigate = useNavigate();
  const [section, setSection] = useState<string | null>(null);
  const info = useAsync(() => getStudentForCode({ data: { code } }), [code]);
  const activities = useAsync(() => listActivitiesForCode({ data: { code } }), [code]);
  const announcements = useAsync(() => listAnnouncementsForCode({ data: { code } }), [code]);
  const notif = useAsync(() => getParentNotifications({ data: { code } }), [code]);
  const unreadMessages = notif.data && "ok" in notif.data && notif.data.ok ? notif.data.unreadMessages : 0;
  const newAnnouncements = notif.data && "ok" in notif.data && notif.data.ok ? notif.data.newAnnouncements : 0;
  const student = (info.data && "student" in info.data ? info.data.student : null) as { nickname?: string | null; full_name: string; id: string; photo_url?: string } | null;
  const activityList = (activities.data && "activities" in activities.data ? (activities.data.activities ?? []) : []) as { id: string; title: string; body?: string; activity_date: string }[];
  const announcementList = (announcements.data && "announcements" in announcements.data ? (announcements.data.announcements ?? []) : []) as { id: string; title: string; body?: string; created_at: string }[];

  if (info.loading) return <p className="text-sm text-muted-foreground text-center py-8">Memuat</p>;
  if (!student) return <p className="text-sm text-destructive text-center py-8">{(info.data && "error" in info.data && info.data.error) || "Data tidak ditemukan."}</p>;

  const badgeFor = (id: string): number => (id === "announce" ? newAnnouncements : id === "message" ? unreadMessages : 0);

  if (section) {
    const item = PARENT_MENU.find((m) => m.id === section);
    return (
      <div className="max-w-lg mx-auto">
        <button onClick={() => setSection(null)} className="text-xs text-muted-foreground underline mb-4 flex items-center gap-1"><ArrowLeft size={12} /> Kembali ke Home</button>
        <h2 className="text-base font-semibold mb-3 flex items-center gap-2">{item?.Icon && <item.Icon size={16} className="text-primary" />} {item?.label}</h2>

        {section === "settings" && <ParentSettingsPanel code={code} />}
        {section === "announce" && (
          <>
            <ul className="space-y-2">
              {announcementList.map((a) => (
                <li key={a.id} className="rounded-xl bg-card border border-border p-3 text-sm"><p className="font-semibold">{a.title}</p><p className="text-xs text-muted-foreground">{new Date(a.created_at).toLocaleString()}</p>{a.body && <p className="mt-1">{a.body}</p>}</li>
              ))}
              {announcementList.length === 0 && <Hint>Belum ada pengumuman.</Hint>}
            </ul>
            {newAnnouncements > 0 && (
              <button onClick={() => markAnnouncementsSeenForParent({ data: { code } })} className="mt-2 text-xs text-primary underline">Tandai sudah dibaca</button>
            )}
          </>
        )}
        {section === "activities" && (
          <ul className="space-y-2">
            {activityList.map((a) => (
              <li key={a.id} className="rounded-xl bg-card border border-border p-3 text-sm"><p className="font-semibold">{a.title}</p><p className="text-xs text-muted-foreground">{new Date(a.activity_date).toLocaleDateString()}</p>{a.body && <p className="mt-1">{a.body}</p>}</li>
            ))}
            {activityList.length === 0 && <Hint>Belum ada laporan aktivitas.</Hint>}
          </ul>
        )}
        {section === "calendar" && <CalendarPanel access={{ code }} classes={[]} canEdit={false} />}
        {section === "timetable" && <TimetablePanel access={{ code }} classes={[]} canEdit={false} />}
        {section === "assessment" && <AssessmentPanel access={{ code }} classes={[]} canEdit={false} />}
        {section === "attendance" && <AttendancePanel access={{ code }} classes={[]} canEdit={false} />}
        {section === "message" && <ParentMessageThread code={code} />}
        {section === "report" && <CasePanel access={{ code }} role="parent" classes={[]} />}
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto">
      <div className="flex flex-col items-center gap-2 mb-6">
        {student.photo_url ? (
          <img src={student.photo_url} alt={student.full_name} className="w-24 h-24 rounded-full object-cover border-2 border-primary" />
        ) : (
          <div className="w-24 h-24 rounded-full bg-primary/15 text-primary flex items-center justify-center"><Baby size={36} /></div>
        )}
        <p className="text-base font-semibold">{student.nickname || student.full_name}</p>
        <button onClick={() => { schoolLogout(); navigate({ to: "/school" }); }} className="text-xs rounded-full border border-border px-3 py-1.5 flex items-center gap-1"><LogOut size={12} /> Keluar</button>
      </div>

      <div className="grid grid-cols-3 gap-3 max-w-sm mx-auto lg:max-w-md">
        {PARENT_MENU.map((m) => {
          const badge = badgeFor(m.id);
          return (
            <button
              key={m.id}
              onClick={() => setSection(m.id)}
              className="relative aspect-square rounded-2xl bg-card border border-border flex flex-col items-center justify-center gap-2 p-2 text-center hover:border-primary transition-colors"
            >
              {badge > 0 && (
                <span className={"absolute top-1.5 right-1.5 rounded-full text-[9px] font-bold text-white w-4 h-4 flex items-center justify-center " + (m.id === "message" ? "bg-red-500" : "bg-blue-500")}>
                  {badge}
                </span>
              )}
              <div className={"w-10 h-10 rounded-xl flex items-center justify-center " + m.color}>
                <m.Icon size={18} />
              </div>
              <span className="text-[11px] font-semibold leading-tight">{m.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Shown when someone opens a role dashboard they are not signed in for. */
export function NotSignedIn() {
  return (
    <div className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
      <Shield size={20} className="mx-auto mb-2 text-primary" />
      Sesi Anda belum aktif untuk dashboard ini.
      <div className="mt-3"><Link to="/school" className="rounded-xl bg-primary text-primary-foreground px-4 py-2 text-xs font-semibold">Kembali ke Login</Link></div>
    </div>
  );
}
