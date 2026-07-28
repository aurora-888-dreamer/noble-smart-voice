// Role-specific School dashboards. Each one is rendered by its own route
// under /school/* — see src/routes/school.*.tsx.
import { useState } from "react";
import {
  GraduationCap, Users, Baby, BookOpen, MessageSquare, Megaphone, Bell, Save, Trash2, LogOut, Shield,
} from "lucide-react";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  CalendarPanel, TimetablePanel, LessonPlanPanel, ProjectPanel, AssessmentPanel, AttendancePanel,
} from "@/components/SchoolAcademic";
import {
  DIVISIONS, ROLE_LABEL, Hint, Section, StatCard, Tabs, ReadOnlyNote, useAsync, useClasses,
  getStoredPassword, getSchoolIdSync, StaffRoster, StudentRoster, GuardianEditor, CsvImportPanel,
  AllActivitiesView, AnnouncementPanel, TeacherMessageThread, ParentMessageThread,
  ChangePinPanel, PersonnelManager,
} from "./shared";
import {
  listSchoolStaff, listSchoolStudents, postSchoolActivity, deleteSchoolActivity, listActivitiesForClass,
  getStudentForCode, listActivitiesForCode, listAnnouncementsForCode, type SchoolRole,
} from "@/lib/school.functions";
import { schoolLogout, type SchoolSession } from "@/lib/school-store";

const ACADEMIC_TABS = [
  { id: "calendar", label: "Kalender" }, { id: "timetable", label: "Timetable" },
  { id: "lesson", label: "Lesson Plan" }, { id: "projects", label: "Project & Surat Resmi" },
  { id: "assessment", label: "Assessment" }, { id: "attendance", label: "Attendance" },
];

const PIN_TAB = { id: "pin", label: "Ganti PIN" };

export function StaffHeader({ session }: { session: SchoolSession }) {
  const navigate = useNavigate();
  const divisionLabel = session.division ? (DIVISIONS.find((d) => d.id === session.division)?.label ?? session.division) : null;
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
        <button onClick={() => { schoolLogout(); navigate({ to: "/" }); }} className="text-xs rounded-full border border-border px-3 py-1.5 flex items-center gap-1"><LogOut size={12} /> Keluar</button>
      </div>
      {session.pinIsDefault && (
        <p className="mt-2 rounded-lg bg-destructive/10 text-destructive text-[11px] px-3 py-2">
          PIN Anda masih default (123456). Segera ganti lewat tab “Ganti PIN”.
        </p>
      )}
    </div>
  );
}


/** Read-only academic viewer shared by HoS / Admin HoS / Principal. */
function AcademicReadOnly({ tab, classes, reviewerRole, reviewerName }: {
  tab: string;
  classes: { id: string; name: string }[];
  reviewerRole: "principal" | "hos" | null;
  reviewerName?: string;
}) {
  const pw = getStoredPassword();
  if (!ACADEMIC_TABS.some((t) => t.id === tab)) return null;
  return (
    <div>
      <ReadOnlyNote />
      {tab === "calendar" && <CalendarPanel access={{ pw }} classes={classes} canEdit={false} />}
      {tab === "timetable" && <TimetablePanel access={{ pw }} classes={classes} canEdit={false} />}
      {tab === "lesson" && <LessonPlanPanel pw={pw} classes={classes} canEdit={false} />}
      {tab === "projects" && <ProjectPanel pw={pw} classes={classes} canSubmit={false} reviewerRole={reviewerRole} reviewerName={reviewerName} />}
      {tab === "assessment" && <AssessmentPanel access={{ pw }} classes={classes} canEdit={false} />}
      {tab === "attendance" && <AttendancePanel access={{ pw }} classes={classes} canEdit={false} />}
    </div>
  );
}

/* ───────────── HoS ───────────── */
export function HosDashboard() {
  const [tab, setTab] = useState("overview");
  const pw = getStoredPassword();
  const classes = useClasses();
  const staff = useAsync(() => listSchoolStaff({ data: { password: pw } }), [pw]);
  const staffList = (staff.data && "staff" in staff.data ? (staff.data.staff ?? []) : []) as unknown[];
  const tabs = [
    { id: "overview", label: "Overview" }, { id: "staff", label: "Staff" }, { id: "roles", label: "Kelola Role" },
    { id: "activity", label: "Teacher Activity" }, { id: "announce", label: "Pengumuman" }, ...ACADEMIC_TABS, PIN_TAB,
  ];
  return (
    <div>
      <Tabs tabs={tabs} tab={tab} onChange={setTab} />
      {tab === "overview" && (
        <div className="grid grid-cols-2 gap-3">
          <StatCard label="Classes" value={classes.length} Icon={GraduationCap} />
          <StatCard label="Staff" value={staffList.length} Icon={Users} />
        </div>
      )}
      {tab === "staff" && <StaffRoster canEdit classes={classes} scopeDivision={null} />}
      {tab === "roles" && <RoleManager classes={classes} />}
      {tab === "activity" && <AllActivitiesView division={null} />}
      {tab === "announce" && <AnnouncementPanel subrole="hos" division={null} classes={classes} />}
      {tab === "pin" && <ChangePinPanel />}
      <AcademicReadOnly tab={tab} classes={classes} reviewerRole="hos" reviewerName="Head of School" />
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
    { id: "import", label: "Import Data" }, { id: "students", label: "Data Murid" },
    { id: "staff", label: "Staff" }, { id: "personnel", label: "Kelola Personil" },
    { id: "announce", label: "Pengumuman" }, ...ACADEMIC_TABS, PIN_TAB,
  ];
  return (
    <div>
      <Tabs tabs={tabs} tab={tab} onChange={setTab} />
      {tab === "import" && <CsvImportPanel classes={classes} />}
      {tab === "students" && <StudentRoster canEdit classes={classes} />}
      {tab === "staff" && <StaffRoster canEdit classes={classes} scopeDivision={null} />}
      {tab === "personnel" && <PersonnelManager classes={classes} />}
      {tab === "announce" && <AnnouncementPanel subrole="admin_hos" division={null} classes={classes} />}
      {tab === "pin" && <ChangePinPanel />}
      <AcademicReadOnly tab={tab} classes={classes} reviewerRole={null} />
    </div>
  );
}

/* ───────────── Principal ───────────── */
export function PrincipalDashboard({ division }: { division: string }) {
  const [tab, setTab] = useState("overview");
  const classes = useClasses(division);
  const tabs = [
    { id: "overview", label: "Overview" }, { id: "students", label: "Murid & Guru" },
    { id: "staff", label: "Staff" }, { id: "activity", label: "Teacher Activity" },
    { id: "announce", label: "Pengumuman" }, ...ACADEMIC_TABS, PIN_TAB,
  ];
  return (
    <div>
      <p className="text-xs text-muted-foreground mb-3">Divisi: {DIVISIONS.find((d) => d.id === division)?.label ?? division}</p>
      <Tabs tabs={tabs} tab={tab} onChange={setTab} />
      {tab === "overview" && <div className="grid grid-cols-2 gap-3"><StatCard label="Classes" value={classes.length} Icon={GraduationCap} /></div>}
      {tab === "students" && <StudentRoster canEdit classes={classes} />}
      {tab === "staff" && <StaffRoster canEdit classes={classes} scopeDivision={division} />}
      {tab === "activity" && <AllActivitiesView division={division} />}
      {tab === "announce" && <AnnouncementPanel subrole="principal" division={division} classes={classes} />}
      {tab === "pin" && <ChangePinPanel />}
      <AcademicReadOnly tab={tab} classes={classes} reviewerRole="principal" reviewerName="Principal" />
    </div>
  );
}


/* ───────────── Teacher ───────────── */
export function TeacherDashboard({ staffName, role, defaultClassId }: { staffName: string; role: string | null; defaultClassId: string | null }) {
  const pw = getStoredPassword();
  const [reload, setReload] = useState(0);
  const classList = useClasses();
  const [classId, setClassId] = useState(defaultClassId ?? "");
  const students = useAsync(() => (classId ? listSchoolStudents({ data: { password: pw, classId } }) : Promise.resolve(null)), [pw, classId, reload]);
  const activities = useAsync(() => (classId ? listActivitiesForClass({ data: { password: pw, classId } }) : Promise.resolve(null)), [pw, classId, reload]);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [selectedStudent, setSelectedStudent] = useState<{ id: string; full_name: string } | null>(null);
  const [tab, setTab] = useState("kelas");

  const studentList = (students.data && "students" in students.data ? (students.data.students ?? []) : []) as { id: string; full_name: string }[];
  const activityList = (activities.data && "activities" in activities.data ? (activities.data.activities ?? []) : []) as { id: string; title: string; body?: string; activity_date: string; author_name?: string }[];

  const isHomeroom = role === "teacher_homeroom";
  const isSubject = role === "teacher_subject";

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

  const tabs = [
    { id: "kelas", label: "Kelas" }, { id: "calendar", label: "Kalender" }, { id: "timetable", label: "Timetable" },
    { id: "lesson", label: "Lesson Plan" }, { id: "projects", label: "Project & Surat Resmi" },
    ...(isSubject ? [{ id: "assessment", label: "Assessment" }] : []),
    ...(isHomeroom ? [{ id: "attendance", label: "Attendance" }] : []),
  ];

  return (
    <div>
      <Tabs tabs={tabs} tab={tab} onChange={setTab} />

      {tab === "calendar" && <CalendarPanel access={{ pw }} classes={classList} canEdit />}
      {tab === "timetable" && <TimetablePanel access={{ pw }} classes={classList} canEdit />}
      {tab === "lesson" && <LessonPlanPanel pw={pw} classes={classList} canEdit />}
      {tab === "projects" && <ProjectPanel pw={pw} classes={classList} canSubmit reviewerRole={null} reviewerName={staffName} />}
      {tab === "assessment" && isSubject && <AssessmentPanel access={{ pw }} classes={classList} canEdit />}
      {tab === "attendance" && isHomeroom && <AttendancePanel access={{ pw }} classes={classList} canEdit />}

      {tab === "kelas" && (
        <>
          <select value={classId} onChange={(e) => setClassId(e.target.value)} className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm mb-4">
            <option value="">pilih kelas</option>
            {classList.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          {classId && (
            <>
              <Section title="Murid" Icon={Baby}>
                <ul className="space-y-2">
                  {studentList.map((s) => (
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
    </div>
  );
}

/* ───────────── Parent ───────────── */
export function ParentDashboard({ code }: { code: string }) {
  const navigate = useNavigate();
  const info = useAsync(() => getStudentForCode({ data: { code } }), [code]);
  const activities = useAsync(() => listActivitiesForCode({ data: { code } }), [code]);
  const announcements = useAsync(() => listAnnouncementsForCode({ data: { code } }), [code]);
  const student = (info.data && "student" in info.data ? info.data.student : null) as { nickname?: string | null; full_name: string; id: string } | null;
  const activityList = (activities.data && "activities" in activities.data ? (activities.data.activities ?? []) : []) as { id: string; title: string; body?: string; activity_date: string }[];
  const announcementList = (announcements.data && "announcements" in announcements.data ? (announcements.data.announcements ?? []) : []) as { id: string; title: string; body?: string; created_at: string }[];

  if (info.loading) return <p className="text-sm text-muted-foreground text-center py-8">Memuat</p>;
  if (!student) return <p className="text-sm text-destructive text-center py-8">{(info.data && "error" in info.data && info.data.error) || "Data tidak ditemukan."}</p>;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="rounded-full bg-primary/15 text-primary px-3 py-1.5 text-sm font-semibold flex items-center gap-1.5"><Baby size={14} /> {student.nickname || student.full_name}</div>
        <button onClick={() => { parentLogout(); navigate({ to: "/school" }); }} className="text-xs rounded-full border border-border px-3 py-1.5 flex items-center gap-1"><LogOut size={12} /> Keluar</button>
      </div>

      <Section title="Pengumuman" Icon={Megaphone}>
        <ul className="space-y-2">
          {announcementList.slice(0, 5).map((a) => (
            <li key={a.id} className="rounded-xl bg-card border border-border p-3 text-sm"><p className="font-semibold">{a.title}</p><p className="text-xs text-muted-foreground">{new Date(a.created_at).toLocaleString()}</p>{a.body && <p className="mt-1">{a.body}</p>}</li>
          ))}
          {announcementList.length === 0 && <Hint>Belum ada pengumuman.</Hint>}
        </ul>
      </Section>

      <Section title="Daily Activities" Icon={BookOpen}>
        <ul className="space-y-2">
          {activityList.map((a) => (
            <li key={a.id} className="rounded-xl bg-card border border-border p-3 text-sm"><p className="font-semibold">{a.title}</p><p className="text-xs text-muted-foreground">{new Date(a.activity_date).toLocaleDateString()}</p>{a.body && <p className="mt-1">{a.body}</p>}</li>
          ))}
          {activityList.length === 0 && <Hint>Belum ada laporan aktivitas.</Hint>}
        </ul>
      </Section>

      <Section title="Kalender Akademik" Icon={Bell}><CalendarPanel access={{ code }} classes={[]} canEdit={false} /></Section>
      <Section title="Timetable" Icon={BookOpen}><TimetablePanel access={{ code }} classes={[]} canEdit={false} /></Section>
      <Section title="Assessment" Icon={GraduationCap}><AssessmentPanel access={{ code }} classes={[]} canEdit={false} /></Section>
      <Section title="Kehadiran" Icon={Baby}><AttendancePanel access={{ code }} classes={[]} canEdit={false} /></Section>
      <Section title="Pesan dengan Guru" Icon={MessageSquare}><ParentMessageThread code={code} /></Section>
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
