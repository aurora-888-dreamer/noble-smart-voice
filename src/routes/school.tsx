import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import {
  GraduationCap, Users, ClipboardCheck, CalendarDays, BookOpen, Clock, Megaphone,
  MessageSquare, LineChart, FolderKanban, UserPlus, Baby, Plus, Trash2, Save, X,
  School, Shield, Home as HomeIcon,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { SchoolTools } from "@/components/SchoolTools";
import { usePlugin } from "@/lib/plugins-store";
import { useLicenseInfo } from "@/lib/auth-store";
import {
  getSchoolDb, ROLE_LABEL, DIVISION_LABEL, KG_LEVELS, startOfDay, startOfWeek,
  type SchoolRole, type Division, type KgLevel, type AttendanceStatus, type AssessmentPeriod,
} from "@/lib/school-db";
import { useSchoolRole, setSchoolRole, setActorId, getParentStudentIds, setParentStudentIds } from "@/lib/school-store";

export const Route = createFileRoute("/school")({
  head: () => ({ meta: [
    { title: "School Dashboard — Noble" },
    { name: "description", content: "Kindergarten management dashboard for teachers, parents, principals and Head of School." },
  ] }),
  component: SchoolPage,
});

function SchoolPage() {
  const hasPlugin = usePlugin("school");
  const license = useLicenseInfo();
  const isAdmin = license.code === "NOBLE440077" || license.tier === "premium";
  const role = useSchoolRole();

  if (!hasPlugin && !isAdmin) {
    return (
      <AppShell title="School Dashboard">
        <div className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          The School Dashboard plugin is not enabled for your account.
          <div className="mt-3">
            <Link to="/upgrade" className="rounded-xl bg-primary text-primary-foreground px-4 py-2 text-xs font-semibold">Upgrade / Enable</Link>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title="School Dashboard">
      {!role ? <RolePicker /> : <RoleRouter role={role} />}
    </AppShell>
  );
}

// ---------------- Role picker ----------------
function RolePicker() {
  const roles: { r: SchoolRole; Icon: typeof School }[] = [
    { r: "hos", Icon: Shield },
    { r: "principal", Icon: GraduationCap },
    { r: "teacher_homeroom", Icon: BookOpen },
    { r: "teacher_shadow", Icon: BookOpen },
    { r: "teacher_subject", Icon: BookOpen },
    { r: "parent", Icon: HomeIcon },
  ];
  return (
    <div>
      <p className="text-sm text-muted-foreground mb-4">
        Sample: <span className="font-semibold text-foreground">Stella Maris International School</span> · Step 1: Kindergarten (Toddler · Nursery · K1 · K2)
      </p>
      <h2 className="text-lg font-semibold mb-3">Choose your role</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {roles.map(({ r, Icon }) => (
          <button
            key={r}
            onClick={() => setSchoolRole(r)}
            className="rounded-2xl bg-card border border-border p-4 text-left active:scale-[0.98]"
          >
            <Icon size={22} className="text-primary mb-2" />
            <p className="text-sm font-semibold">{ROLE_LABEL[r]}</p>
          </button>
        ))}
      </div>
    </div>
  );
}

function RoleRouter({ role }: { role: SchoolRole }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Signed in as</p>
          <p className="text-sm font-semibold">{ROLE_LABEL[role]}</p>
        </div>
        <button
          onClick={() => { setSchoolRole(null); setActorId(null); }}
          className="text-xs rounded-full border border-border px-3 py-1.5"
        >Switch role</button>
      </div>
      {role === "parent" ? <ParentDashboard /> :
       role === "hos" || role === "principal" ? <PrincipalDashboard role={role} /> :
       <TeacherDashboard role={role} />}
    </div>
  );
}

// ---------------- Teacher Dashboard ----------------
type TeacherTab = "overview" | "students" | "attendance" | "activity" | "lesson" | "timetable" | "projects" | "calendar" | "assessment" | "messages";

function TeacherDashboard({ role }: { role: SchoolRole }) {
  const [tab, setTab] = useState<TeacherTab>("overview");
  const tabs: { id: TeacherTab; label: string; Icon: typeof School }[] = [
    { id: "overview", label: "Overview", Icon: LineChart },
    { id: "students", label: "Students", Icon: Users },
    { id: "attendance", label: "Attendance", Icon: ClipboardCheck },
    { id: "activity", label: "Daily Activity", Icon: BookOpen },
    { id: "lesson", label: "Lesson Plan", Icon: BookOpen },
    { id: "timetable", label: "Timetable", Icon: Clock },
    { id: "projects", label: "Projects", Icon: FolderKanban },
    { id: "calendar", label: "Calendar", Icon: CalendarDays },
    { id: "assessment", label: "Assessment", Icon: LineChart },
    { id: "messages", label: "Messages", Icon: MessageSquare },
  ];
  return (
    <div>
      <SchoolTools />
      <ClassSelector />
      <div className="flex gap-2 overflow-x-auto pb-2 mb-4 -mx-4 px-4 no-scrollbar">
        {tabs.map(({ id, label, Icon }) => (
          <button key={id} onClick={() => setTab(id)}
            className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold border flex items-center gap-1.5 ${tab === id ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border"}`}>
            <Icon size={13} />{label}
          </button>
        ))}
      </div>
      {tab === "overview" && <TeacherOverview />}
      {tab === "students" && <StudentsPanel canEdit />}
      {tab === "attendance" && <AttendancePanel />}
      {tab === "activity" && <DailyActivityPanel />}
      {tab === "lesson" && <LessonPlanPanel />}
      {tab === "timetable" && <TimetablePanel />}
      {tab === "projects" && <ProjectPlanPanel />}
      {tab === "calendar" && <CalendarPanel canEdit />}
      {tab === "assessment" && <AssessmentPanel />}
      {tab === "messages" && <MessagesPanel role={role} />}
    </div>
  );
}

function TeacherOverview() {
  const classId = useSelectedClassId();
  const db = getSchoolDb();
  const today = startOfDay();
  const students = useLiveQuery(async () => classId ? db.students.where("classId").equals(classId).toArray() : [], [classId]);
  const attToday = useLiveQuery(async () => classId ? db.attendance.where("classId").equals(classId).and(a => a.date === today).toArray() : [], [classId, today]);
  const lessonsThisWeek = useLiveQuery(async () => classId ? db.lessons.where("classId").equals(classId).and(l => l.weekStart === startOfWeek()).toArray() : [], [classId]);
  const upcoming = useLiveQuery(async () => db.calendar.where("eventAt").aboveOrEqual(Date.now()).limit(5).toArray(), []);
  const present = (attToday ?? []).filter(a => a.status === "present").length;
  return (
    <div className="grid grid-cols-2 gap-3">
      <Stat label="Students" value={students?.length ?? 0} Icon={Baby} />
      <Stat label="Present today" value={`${present}/${students?.length ?? 0}`} Icon={ClipboardCheck} />
      <Stat label="Lessons this week" value={lessonsThisWeek?.length ?? 0} Icon={BookOpen} />
      <Stat label="Upcoming events" value={upcoming?.length ?? 0} Icon={CalendarDays} />
    </div>
  );
}
function Stat({ label, value, Icon }: { label: string; value: number | string; Icon: typeof School }) {
  return (
    <div className="rounded-2xl bg-card border border-border p-4">
      <Icon size={16} className="text-primary mb-2" />
      <p className="text-2xl font-semibold">{value}</p>
      <p className="text-xs text-muted-foreground mt-1">{label}</p>
    </div>
  );
}

// ---------------- Class selector (shared) ----------------
function useSelectedClassId(): number | null {
  const [_, setBump] = useState(0);
  useMemo(() => {
    const sync = () => setBump(x => x + 1);
    window.addEventListener("noble:school", sync);
    return () => window.removeEventListener("noble:school", sync);
  }, []);
  const id = typeof window === "undefined" ? null : (localStorage.getItem("noble.school.classId") ? Number(localStorage.getItem("noble.school.classId")) : null);
  return id;
}
function setSelectedClassId(id: number | null) {
  if (id == null) localStorage.removeItem("noble.school.classId");
  else localStorage.setItem("noble.school.classId", String(id));
  window.dispatchEvent(new Event("noble:school"));
}
function ClassSelector() {
  const db = getSchoolDb();
  const classes = useLiveQuery(async () => db.classes.toArray(), []);
  const selected = useSelectedClassId();
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [level, setLevel] = useState<KgLevel>("k1");

  async function addClass() {
    if (!name.trim()) return;
    const id = await db.classes.add({ name: name.trim(), division: "kindergarten", level, createdAt: Date.now() });
    setSelectedClassId(id as number);
    setName(""); setCreating(false);
  }

  return (
    <div className="rounded-2xl bg-card border border-border p-3 mb-4">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-muted-foreground">Class:</span>
        <select
          value={selected ?? ""}
          onChange={(e) => setSelectedClassId(e.target.value ? Number(e.target.value) : null)}
          className="rounded-lg bg-background border border-border px-2 py-1 text-sm"
        >
          <option value="">— select —</option>
          {(classes ?? []).map(c => (
            <option key={c.id} value={c.id}>{c.name} ({c.level})</option>
          ))}
        </select>
        <button onClick={() => setCreating(v => !v)} className="ml-auto text-xs rounded-full border border-border px-3 py-1 flex items-center gap-1">
          <Plus size={12} />New class
        </button>
      </div>
      {creating && (
        <div className="mt-3 flex gap-2 flex-wrap">
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Class name (e.g. K1 Sunflower)"
            className="flex-1 min-w-40 rounded-lg bg-background border border-border px-3 py-1.5 text-sm" />
          <select value={level} onChange={e => setLevel(e.target.value as KgLevel)} className="rounded-lg bg-background border border-border px-2 py-1.5 text-sm">
            {KG_LEVELS.map(l => <option key={l} value={l}>{l.toUpperCase()}</option>)}
          </select>
          <button onClick={addClass} className="rounded-lg bg-primary text-primary-foreground px-3 py-1.5 text-sm font-semibold">Save</button>
        </div>
      )}
    </div>
  );
}

// ---------------- Students ----------------
function StudentsPanel({ canEdit }: { canEdit: boolean }) {
  const db = getSchoolDb();
  const classId = useSelectedClassId();
  const students = useLiveQuery(async () => classId ? db.students.where("classId").equals(classId).toArray() : db.students.toArray(), [classId]);
  const [openId, setOpenId] = useState<number | null>(null);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [nick, setNick] = useState("");

  async function add() {
    if (!name.trim() || !classId) return;
    await db.students.add({ fullName: name.trim(), nickname: nick.trim() || undefined, classId, createdAt: Date.now() });
    setName(""); setNick(""); setAdding(false);
  }
  if (!classId) return <Hint>Select a class first.</Hint>;
  return (
    <div>
      {canEdit && (
        <div className="mb-3">
          {!adding ? (
            <button onClick={() => setAdding(true)} className="rounded-full border border-border px-3 py-1.5 text-xs flex items-center gap-1"><UserPlus size={13} />Add student</button>
          ) : (
            <div className="flex gap-2 flex-wrap">
              <input value={name} onChange={e => setName(e.target.value)} placeholder="Full name" className="flex-1 min-w-40 rounded-lg bg-background border border-border px-3 py-1.5 text-sm" />
              <input value={nick} onChange={e => setNick(e.target.value)} placeholder="Nickname" className="w-32 rounded-lg bg-background border border-border px-3 py-1.5 text-sm" />
              <button onClick={add} className="rounded-lg bg-primary text-primary-foreground px-3 py-1.5 text-sm font-semibold">Save</button>
              <button onClick={() => setAdding(false)} className="rounded-lg border border-border px-3 py-1.5 text-sm"><X size={13} /></button>
            </div>
          )}
        </div>
      )}
      <ul className="space-y-2">
        {(students ?? []).map(s => (
          <li key={s.id} className="rounded-xl bg-card border border-border p-3">
            <button onClick={() => setOpenId(openId === s.id ? null : s.id!)} className="w-full flex items-center justify-between">
              <div className="text-left">
                <p className="text-sm font-semibold">{s.fullName}</p>
                {s.nickname && <p className="text-xs text-muted-foreground">"{s.nickname}"</p>}
              </div>
              <span className="text-xs text-muted-foreground">{openId === s.id ? "▾" : "▸"}</span>
            </button>
            {openId === s.id && <StudentDetails studentId={s.id!} canEdit={canEdit} />}
          </li>
        ))}
        {(students ?? []).length === 0 && <Hint>No students yet.</Hint>}
      </ul>
    </div>
  );
}

function StudentDetails({ studentId, canEdit }: { studentId: number; canEdit: boolean }) {
  const db = getSchoolDb();
  const guardians = useLiveQuery(async () => db.guardians.where("studentId").equals(studentId).toArray(), [studentId]);
  const [gName, setGName] = useState(""); const [gRel, setGRel] = useState<"father" | "mother" | "guardian">("mother");
  const [gEmail, setGEmail] = useState(""); const [gWA, setGWA] = useState("");
  async function addGuardian() {
    if (!gName.trim()) return;
    await db.guardians.add({ studentId, fullName: gName.trim(), relation: gRel, email: gEmail || undefined, whatsapp: gWA || undefined, isPrimary: (guardians?.length ?? 0) === 0 });
    setGName(""); setGEmail(""); setGWA("");
  }
  return (
    <div className="mt-3 pt-3 border-t border-border">
      <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Guardians</p>
      <ul className="space-y-1 mb-3">
        {(guardians ?? []).map(g => (
          <li key={g.id} className="text-xs flex items-center justify-between">
            <span>{g.fullName} · <span className="text-muted-foreground">{g.relation}</span>{g.email && ` · ${g.email}`}{g.whatsapp && ` · ${g.whatsapp}`}</span>
            {canEdit && <button onClick={() => db.guardians.delete(g.id!)} className="text-destructive"><Trash2 size={12} /></button>}
          </li>
        ))}
      </ul>
      {canEdit && (
        <div className="grid grid-cols-2 gap-2">
          <input value={gName} onChange={e => setGName(e.target.value)} placeholder="Guardian name" className="rounded-lg bg-background border border-border px-2 py-1 text-xs" />
          <select value={gRel} onChange={e => setGRel(e.target.value as "father" | "mother" | "guardian")} className="rounded-lg bg-background border border-border px-2 py-1 text-xs">
            <option value="mother">Mother</option><option value="father">Father</option><option value="guardian">Guardian</option>
          </select>
          <input value={gEmail} onChange={e => setGEmail(e.target.value)} placeholder="Email" className="rounded-lg bg-background border border-border px-2 py-1 text-xs" />
          <input value={gWA} onChange={e => setGWA(e.target.value)} placeholder="WhatsApp" className="rounded-lg bg-background border border-border px-2 py-1 text-xs" />
          <button onClick={addGuardian} className="col-span-2 rounded-lg bg-primary text-primary-foreground px-3 py-1.5 text-xs font-semibold">Add guardian</button>
        </div>
      )}
    </div>
  );
}

// ---------------- Attendance ----------------
function AttendancePanel() {
  const db = getSchoolDb();
  const classId = useSelectedClassId();
  const [dateStr, setDateStr] = useState(new Date().toISOString().slice(0, 10));
  const date = startOfDay(new Date(dateStr).getTime());
  const students = useLiveQuery(async () => classId ? db.students.where("classId").equals(classId).toArray() : [], [classId]);
  const records = useLiveQuery(async () => classId ? db.attendance.where("classId").equals(classId).and(a => a.date === date).toArray() : [], [classId, date]);
  if (!classId) return <Hint>Select a class first.</Hint>;
  const byStudent = new Map<number, AttendanceStatus>();
  (records ?? []).forEach(r => byStudent.set(r.studentId, r.status));
  async function mark(studentId: number, status: AttendanceStatus) {
    const existing = (records ?? []).find(r => r.studentId === studentId);
    if (existing) await db.attendance.update(existing.id!, { status });
    else await db.attendance.add({ classId: classId!, studentId, date, status, createdAt: Date.now() });
  }
  const statuses: { s: AttendanceStatus; label: string; cls: string }[] = [
    { s: "present", label: "P", cls: "bg-primary text-primary-foreground" },
    { s: "absent", label: "A", cls: "bg-destructive text-destructive-foreground" },
    { s: "sick", label: "S", cls: "bg-amber-500 text-white" },
    { s: "permission", label: "I", cls: "bg-blue-500 text-white" },
    { s: "late", label: "L", cls: "bg-orange-500 text-white" },
  ];
  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <input type="date" value={dateStr} onChange={e => setDateStr(e.target.value)} className="rounded-lg bg-background border border-border px-2 py-1 text-sm" />
      </div>
      <ul className="space-y-2">
        {(students ?? []).map(s => (
          <li key={s.id} className="rounded-xl bg-card border border-border p-3 flex items-center justify-between gap-2">
            <span className="text-sm truncate">{s.fullName}</span>
            <div className="flex gap-1">
              {statuses.map(({ s: st, label, cls }) => (
                <button key={st} onClick={() => mark(s.id!, st)}
                  className={`w-8 h-8 rounded-full text-xs font-bold ${byStudent.get(s.id!) === st ? cls : "bg-secondary text-secondary-foreground"}`}>{label}</button>
              ))}
            </div>
          </li>
        ))}
        {(students ?? []).length === 0 && <Hint>Add students first.</Hint>}
      </ul>
      <p className="text-[10px] text-muted-foreground mt-3">P=Present · A=Absent · S=Sick · I=Permission · L=Late</p>
    </div>
  );
}

// ---------------- Daily activity ----------------
function DailyActivityPanel() {
  const db = getSchoolDb();
  const classId = useSelectedClassId();
  const [title, setTitle] = useState(""); const [body, setBody] = useState("");
  const items = useLiveQuery(async () => classId ? db.activities.where("classId").equals(classId).reverse().sortBy("date") : [], [classId]);
  if (!classId) return <Hint>Select a class first.</Hint>;
  async function save() {
    if (!title.trim()) return;
    await db.activities.add({ classId: classId!, date: startOfDay(), title: title.trim(), body, createdAt: Date.now() });
    setTitle(""); setBody("");
  }
  return (
    <div>
      <div className="rounded-2xl bg-card border border-border p-3 mb-3">
        <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Activity title" className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm mb-2" />
        <textarea value={body} onChange={e => setBody(e.target.value)} rows={4} placeholder="Narrative (EN/ID mix OK)" className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm" />
        <button onClick={save} className="mt-2 rounded-lg bg-primary text-primary-foreground px-3 py-1.5 text-sm font-semibold flex items-center gap-1"><Save size={13} />Post</button>
      </div>
      <ul className="space-y-2">
        {(items ?? []).map(i => (
          <li key={i.id} className="rounded-xl bg-card border border-border p-3">
            <div className="flex justify-between">
              <p className="text-sm font-semibold">{i.title}</p>
              <button onClick={() => db.activities.delete(i.id!)} className="text-destructive"><Trash2 size={13} /></button>
            </div>
            <p className="text-xs text-muted-foreground mt-1">{new Date(i.date).toLocaleDateString()}</p>
            {i.body && <p className="text-sm mt-2 whitespace-pre-wrap">{i.body}</p>}
          </li>
        ))}
      </ul>
    </div>
  );
}

// ---------------- Lesson plan ----------------
function LessonPlanPanel() {
  const db = getSchoolDb();
  const classId = useSelectedClassId();
  const [subject, setSubject] = useState(""); const [obj, setObj] = useState(""); const [acts, setActs] = useState(""); const [mat, setMat] = useState(""); const [ass, setAss] = useState("");
  const items = useLiveQuery(async () => classId ? db.lessons.where("classId").equals(classId).reverse().sortBy("weekStart") : [], [classId]);
  if (!classId) return <Hint>Select a class first.</Hint>;
  async function save() {
    if (!obj.trim()) return;
    await db.lessons.add({ classId: classId!, weekStart: startOfWeek(), subject: subject || undefined, objective: obj, activities: acts, materials: mat || undefined, assessment: ass || undefined, createdAt: Date.now() });
    setSubject(""); setObj(""); setActs(""); setMat(""); setAss("");
  }
  return (
    <div>
      <div className="rounded-2xl bg-card border border-border p-3 mb-3 grid gap-2">
        <input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Subject / theme" className="rounded-lg bg-background border border-border px-3 py-2 text-sm" />
        <textarea value={obj} onChange={e => setObj(e.target.value)} rows={2} placeholder="Learning objective" className="rounded-lg bg-background border border-border px-3 py-2 text-sm" />
        <textarea value={acts} onChange={e => setActs(e.target.value)} rows={3} placeholder="Activities" className="rounded-lg bg-background border border-border px-3 py-2 text-sm" />
        <input value={mat} onChange={e => setMat(e.target.value)} placeholder="Materials" className="rounded-lg bg-background border border-border px-3 py-2 text-sm" />
        <input value={ass} onChange={e => setAss(e.target.value)} placeholder="Assessment method" className="rounded-lg bg-background border border-border px-3 py-2 text-sm" />
        <button onClick={save} className="justify-self-start rounded-lg bg-primary text-primary-foreground px-3 py-1.5 text-sm font-semibold">Save lesson plan</button>
      </div>
      <ul className="space-y-2">
        {(items ?? []).map(l => (
          <li key={l.id} className="rounded-xl bg-card border border-border p-3 text-sm">
            <div className="flex justify-between">
              <p className="font-semibold">{l.subject ?? "Lesson"} · week of {new Date(l.weekStart).toLocaleDateString()}</p>
              <button onClick={() => db.lessons.delete(l.id!)} className="text-destructive"><Trash2 size={13} /></button>
            </div>
            <p className="mt-1"><span className="text-muted-foreground">Objective: </span>{l.objective}</p>
            {l.activities && <p><span className="text-muted-foreground">Activities: </span>{l.activities}</p>}
            {l.materials && <p><span className="text-muted-foreground">Materials: </span>{l.materials}</p>}
            {l.assessment && <p><span className="text-muted-foreground">Assessment: </span>{l.assessment}</p>}
          </li>
        ))}
      </ul>
    </div>
  );
}

// ---------------- Timetable ----------------
function TimetablePanel() {
  const db = getSchoolDb();
  const classId = useSelectedClassId();
  const slots = useLiveQuery(async () => classId ? db.timetable.where("classId").equals(classId).toArray() : [], [classId]);
  const [dow, setDow] = useState(1); const [st, setSt] = useState("08:00"); const [en, setEn] = useState("08:45"); const [subj, setSubj] = useState("");
  if (!classId) return <Hint>Select a class first.</Hint>;
  async function add() {
    if (!subj.trim()) return;
    await db.timetable.add({ classId: classId!, dayOfWeek: dow, startTime: st, endTime: en, subject: subj.trim() });
    setSubj("");
  }
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return (
    <div>
      <div className="rounded-2xl bg-card border border-border p-3 mb-3 grid grid-cols-4 gap-2">
        <select value={dow} onChange={e => setDow(Number(e.target.value))} className="rounded-lg bg-background border border-border px-2 py-1.5 text-sm">
          {days.map((d, i) => <option key={i} value={i}>{d}</option>)}
        </select>
        <input type="time" value={st} onChange={e => setSt(e.target.value)} className="rounded-lg bg-background border border-border px-2 py-1.5 text-sm" />
        <input type="time" value={en} onChange={e => setEn(e.target.value)} className="rounded-lg bg-background border border-border px-2 py-1.5 text-sm" />
        <input value={subj} onChange={e => setSubj(e.target.value)} placeholder="Subject" className="rounded-lg bg-background border border-border px-2 py-1.5 text-sm" />
        <button onClick={add} className="col-span-4 justify-self-start rounded-lg bg-primary text-primary-foreground px-3 py-1.5 text-sm font-semibold">Add slot</button>
      </div>
      {days.map((d, i) => {
        const daySlots = (slots ?? []).filter(s => s.dayOfWeek === i).sort((a, b) => a.startTime.localeCompare(b.startTime));
        if (daySlots.length === 0) return null;
        return (
          <div key={i} className="mb-3">
            <p className="text-xs uppercase text-muted-foreground mb-1">{d}</p>
            <ul className="space-y-1">
              {daySlots.map(s => (
                <li key={s.id} className="rounded-lg bg-card border border-border p-2 text-sm flex justify-between">
                  <span>{s.startTime}–{s.endTime} · {s.subject}</span>
                  <button onClick={() => db.timetable.delete(s.id!)} className="text-destructive"><Trash2 size={12} /></button>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}

// ---------------- Projects ----------------
function ProjectPlanPanel() {
  const db = getSchoolDb();
  const classId = useSelectedClassId();
  const items = useLiveQuery(async () => classId ? db.projects.where("classId").equals(classId).reverse().sortBy("createdAt") : [], [classId]);
  const [title, setTitle] = useState(""); const [summary, setSummary] = useState("");
  if (!classId) return <Hint>Select a class first.</Hint>;
  async function add() {
    if (!title.trim()) return;
    await db.projects.add({ classId: classId!, title: title.trim(), summary, milestones: [], createdAt: Date.now() });
    setTitle(""); setSummary("");
  }
  return (
    <div>
      <div className="rounded-2xl bg-card border border-border p-3 mb-3">
        <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Project title" className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm mb-2" />
        <textarea value={summary} onChange={e => setSummary(e.target.value)} rows={3} placeholder="Summary / learning goals" className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm" />
        <button onClick={add} className="mt-2 rounded-lg bg-primary text-primary-foreground px-3 py-1.5 text-sm font-semibold">Add project</button>
      </div>
      <ul className="space-y-2">
        {(items ?? []).map(p => (
          <li key={p.id} className="rounded-xl bg-card border border-border p-3">
            <div className="flex justify-between">
              <p className="text-sm font-semibold">{p.title}</p>
              <button onClick={() => db.projects.delete(p.id!)} className="text-destructive"><Trash2 size={13} /></button>
            </div>
            {p.summary && <p className="text-xs text-muted-foreground mt-1">{p.summary}</p>}
          </li>
        ))}
      </ul>
    </div>
  );
}

// ---------------- Calendar ----------------
function CalendarPanel({ canEdit }: { canEdit: boolean }) {
  const db = getSchoolDb();
  const classId = useSelectedClassId();
  const items = useLiveQuery(async () => db.calendar.orderBy("eventAt").toArray(), []);
  const [title, setTitle] = useState(""); const [when, setWhen] = useState(""); const [scope, setScope] = useState<"all" | "class">("class");
  async function add() {
    if (!title.trim() || !when) return;
    await db.calendar.add({
      scope, division: scope === "all" ? undefined : "kindergarten", classId: scope === "class" ? classId ?? undefined : undefined,
      title: title.trim(), eventAt: new Date(when).getTime(), createdAt: Date.now(),
    });
    setTitle(""); setWhen("");
  }
  return (
    <div>
      {canEdit && (
        <div className="rounded-2xl bg-card border border-border p-3 mb-3 grid gap-2">
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Event title" className="rounded-lg bg-background border border-border px-3 py-2 text-sm" />
          <div className="flex gap-2">
            <input type="datetime-local" value={when} onChange={e => setWhen(e.target.value)} className="flex-1 rounded-lg bg-background border border-border px-3 py-2 text-sm" />
            <select value={scope} onChange={e => setScope(e.target.value as "all" | "class")} className="rounded-lg bg-background border border-border px-2 py-2 text-sm">
              <option value="class">My class</option><option value="all">Whole school</option>
            </select>
          </div>
          <button onClick={add} className="justify-self-start rounded-lg bg-primary text-primary-foreground px-3 py-1.5 text-sm font-semibold">Add event</button>
        </div>
      )}
      <ul className="space-y-2">
        {(items ?? []).map(c => (
          <li key={c.id} className="rounded-xl bg-card border border-border p-3 text-sm flex justify-between">
            <div>
              <p className="font-semibold">{c.title}</p>
              <p className="text-xs text-muted-foreground">{new Date(c.eventAt).toLocaleString()} · {c.scope}</p>
            </div>
            {canEdit && <button onClick={() => db.calendar.delete(c.id!)} className="text-destructive"><Trash2 size={13} /></button>}
          </li>
        ))}
      </ul>
    </div>
  );
}

// ---------------- Assessment ----------------
function AssessmentPanel() {
  const db = getSchoolDb();
  const classId = useSelectedClassId();
  const students = useLiveQuery(async () => classId ? db.students.where("classId").equals(classId).toArray() : [], [classId]);
  const [studentId, setStudentId] = useState<number | null>(null);
  const [period, setPeriod] = useState<AssessmentPeriod>("weekly");
  const [scores, setScores] = useState({ Language: 3, Motor: 3, Social: 3, Cognitive: 3, Creativity: 3 });
  const [comment, setComment] = useState("");
  const existing = useLiveQuery(async () => studentId ? db.assessments.where("studentId").equals(studentId).reverse().sortBy("periodStart") : [], [studentId]);
  if (!classId) return <Hint>Select a class first.</Hint>;
  async function save() {
    if (!studentId) return;
    const now = Date.now();
    const periodStart = period === "weekly" ? startOfWeek(now) : period === "monthly" ? new Date(new Date(now).getFullYear(), new Date(now).getMonth(), 1).getTime() : new Date(new Date(now).getFullYear(), new Date(now).getMonth() < 6 ? 0 : 6, 1).getTime();
    await db.assessments.add({
      studentId, classId: classId!, period, periodStart,
      domains: Object.entries(scores).map(([name, score]) => ({ name, score })),
      overallComment: comment || undefined, createdAt: now,
    });
    setComment("");
  }
  return (
    <div>
      <div className="rounded-2xl bg-card border border-border p-3 mb-3 grid gap-2">
        <div className="flex gap-2">
          <select value={studentId ?? ""} onChange={e => setStudentId(e.target.value ? Number(e.target.value) : null)} className="flex-1 rounded-lg bg-background border border-border px-2 py-1.5 text-sm">
            <option value="">— pick student —</option>
            {(students ?? []).map(s => <option key={s.id} value={s.id}>{s.fullName}</option>)}
          </select>
          <select value={period} onChange={e => setPeriod(e.target.value as AssessmentPeriod)} className="rounded-lg bg-background border border-border px-2 py-1.5 text-sm">
            <option value="weekly">Weekly</option><option value="monthly">Monthly</option><option value="semester">Semester</option>
          </select>
        </div>
        {Object.entries(scores).map(([k, v]) => (
          <label key={k} className="flex items-center gap-2 text-xs">
            <span className="w-24 text-muted-foreground">{k}</span>
            <input type="range" min={1} max={5} value={v} onChange={e => setScores(s => ({ ...s, [k]: Number(e.target.value) }))} className="flex-1" />
            <span className="w-6 text-right font-semibold">{v}</span>
          </label>
        ))}
        <textarea value={comment} onChange={e => setComment(e.target.value)} rows={2} placeholder="Overall comment" className="rounded-lg bg-background border border-border px-3 py-2 text-sm" />
        <button onClick={save} disabled={!studentId} className="justify-self-start rounded-lg bg-primary text-primary-foreground px-3 py-1.5 text-sm font-semibold disabled:opacity-40">Save assessment</button>
      </div>
      {studentId && (
        <ul className="space-y-2">
          {(existing ?? []).map(a => (
            <li key={a.id} className="rounded-xl bg-card border border-border p-3 text-sm">
              <div className="flex justify-between">
                <p className="font-semibold capitalize">{a.period} · {new Date(a.periodStart).toLocaleDateString()}</p>
                <button onClick={() => db.assessments.delete(a.id!)} className="text-destructive"><Trash2 size={12} /></button>
              </div>
              <div className="grid grid-cols-5 gap-1 mt-2 text-[10px] text-center">
                {a.domains.map(d => (
                  <div key={d.name} className="rounded bg-secondary p-1">
                    <p className="text-muted-foreground">{d.name.slice(0, 4)}</p>
                    <p className="font-bold">{d.score}</p>
                  </div>
                ))}
              </div>
              {a.overallComment && <p className="mt-2 text-xs">{a.overallComment}</p>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ---------------- Messages ----------------
function MessagesPanel({ role }: { role: SchoolRole }) {
  const db = getSchoolDb();
  const classId = useSelectedClassId();
  const students = useLiveQuery(async () => classId ? db.students.where("classId").equals(classId).toArray() : [], [classId]);
  const [studentId, setStudentId] = useState<number | null>(null);
  const [body, setBody] = useState("");
  const thread = useLiveQuery(async () => studentId ? db.messages.where("toStudentId").equals(studentId).sortBy("createdAt") : [], [studentId]);
  async function send() {
    if (!body.trim() || !studentId) return;
    await db.messages.add({ fromRole: role, toStudentId: studentId, body: body.trim(), createdAt: Date.now() });
    setBody("");
  }
  return (
    <div>
      <select value={studentId ?? ""} onChange={e => setStudentId(e.target.value ? Number(e.target.value) : null)} className="w-full rounded-lg bg-background border border-border px-2 py-1.5 text-sm mb-3">
        <option value="">— pick student thread —</option>
        {(students ?? []).map(s => <option key={s.id} value={s.id}>{s.fullName}</option>)}
      </select>
      <div className="rounded-2xl bg-card border border-border p-3 mb-3 space-y-2 max-h-80 overflow-y-auto">
        {(thread ?? []).map(m => (
          <div key={m.id} className={`text-sm ${m.fromRole === "parent" ? "text-right" : ""}`}>
            <div className={`inline-block rounded-2xl px-3 py-2 ${m.fromRole === "parent" ? "bg-secondary" : "bg-primary/15"}`}>
              <p className="text-[10px] text-muted-foreground">{ROLE_LABEL[m.fromRole]}</p>
              <p>{m.body}</p>
            </div>
          </div>
        ))}
        {(!thread || thread.length === 0) && <p className="text-xs text-muted-foreground">No messages yet.</p>}
      </div>
      <div className="flex gap-2">
        <input value={body} onChange={e => setBody(e.target.value)} placeholder="Write a message…" className="flex-1 rounded-lg bg-background border border-border px-3 py-2 text-sm" onKeyDown={e => e.key === "Enter" && send()} />
        <button onClick={send} className="rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm font-semibold">Send</button>
      </div>
    </div>
  );
}

// ---------------- Principal / HoS ----------------
function PrincipalDashboard({ role }: { role: SchoolRole }) {
  const [tab, setTab] = useState<"overview" | "teachers" | "classes" | "announcements" | "calendar" | "browse">("overview");
  const db = getSchoolDb();
  const classes = useLiveQuery(async () => db.classes.toArray(), []);
  const students = useLiveQuery(async () => db.students.toArray(), []);
  const staff = useLiveQuery(async () => db.staff.toArray(), []);
  const tabs = [
    { id: "overview", label: "Overview" }, { id: "teachers", label: "Staff" },
    { id: "classes", label: "Classes" }, { id: "announcements", label: "Announcements" },
    { id: "calendar", label: "Calendar" }, { id: "browse", label: "Teacher view" },
  ] as const;
  return (
    <div>
      <p className="text-xs text-muted-foreground mb-3">{role === "hos" ? "Head of School" : "Principal"} · Full read access to teacher dashboards.</p>
      <div className="flex gap-2 overflow-x-auto pb-2 mb-4 no-scrollbar">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold border ${tab === t.id ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border"}`}>{t.label}</button>
        ))}
      </div>
      {tab === "overview" && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Stat label="Classes" value={classes?.length ?? 0} Icon={School} />
          <Stat label="Students" value={students?.length ?? 0} Icon={Baby} />
          <Stat label="Staff" value={staff?.length ?? 0} Icon={Users} />
          <Stat label="Divisions" value={4} Icon={GraduationCap} />
          <div className="col-span-2 md:col-span-4 rounded-2xl bg-card border border-border p-3">
            <p className="text-xs uppercase text-muted-foreground mb-2">Divisions</p>
            <ul className="text-sm space-y-1">
              {(Object.keys(DIVISION_LABEL) as Division[]).map(d => (
                <li key={d}>· {DIVISION_LABEL[d]}</li>
              ))}
            </ul>
            <p className="text-[10px] text-muted-foreground mt-2">Step 1 focuses on Kindergarten. Other divisions will be added in Step 2.</p>
          </div>
        </div>
      )}
      {tab === "teachers" && <StaffPanel />}
      {tab === "classes" && <ClassManager />}
      {tab === "announcements" && <AnnouncementsPanel canPost role={role} />}
      {tab === "calendar" && <CalendarPanel canEdit />}
      {tab === "browse" && <div><ClassSelector /><TeacherDashboardReadonly /></div>}
    </div>
  );
}

function StaffPanel() {
  const db = getSchoolDb();
  const staff = useLiveQuery(async () => db.staff.toArray(), []);
  const [name, setName] = useState(""); const [srole, setSRole] = useState<SchoolRole>("teacher_homeroom"); const [division, setDivision] = useState<Division>("kindergarten"); const [email, setEmail] = useState("");
  async function add() {
    if (!name.trim()) return;
    await db.staff.add({ fullName: name.trim(), role: srole, division, email: email || undefined, createdAt: Date.now() });
    setName(""); setEmail("");
  }
  return (
    <div>
      <div className="rounded-2xl bg-card border border-border p-3 mb-3 grid grid-cols-2 gap-2">
        <input value={name} onChange={e => setName(e.target.value)} placeholder="Full name" className="col-span-2 rounded-lg bg-background border border-border px-3 py-1.5 text-sm" />
        <select value={srole} onChange={e => setSRole(e.target.value as SchoolRole)} className="rounded-lg bg-background border border-border px-2 py-1.5 text-sm">
          {(["hos", "principal", "teacher_homeroom", "teacher_shadow", "teacher_subject"] as SchoolRole[]).map(r => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
        </select>
        <select value={division} onChange={e => setDivision(e.target.value as Division)} className="rounded-lg bg-background border border-border px-2 py-1.5 text-sm">
          {(Object.keys(DIVISION_LABEL) as Division[]).map(d => <option key={d} value={d}>{DIVISION_LABEL[d]}</option>)}
        </select>
        <input value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" className="col-span-2 rounded-lg bg-background border border-border px-3 py-1.5 text-sm" />
        <button onClick={add} className="col-span-2 justify-self-start rounded-lg bg-primary text-primary-foreground px-3 py-1.5 text-sm font-semibold">Add staff</button>
      </div>
      <ul className="space-y-2">
        {(staff ?? []).map(s => (
          <li key={s.id} className="rounded-xl bg-card border border-border p-3 text-sm flex justify-between">
            <div>
              <p className="font-semibold">{s.fullName}</p>
              <p className="text-xs text-muted-foreground">{ROLE_LABEL[s.role]} · {DIVISION_LABEL[s.division]}{s.email && ` · ${s.email}`}</p>
            </div>
            <button onClick={() => db.staff.delete(s.id!)} className="text-destructive"><Trash2 size={13} /></button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ClassManager() {
  const db = getSchoolDb();
  const classes = useLiveQuery(async () => db.classes.toArray(), []);
  return (
    <div>
      <ClassSelector />
      <ul className="space-y-2">
        {(classes ?? []).map(c => (
          <li key={c.id} className="rounded-xl bg-card border border-border p-3 text-sm flex justify-between">
            <span>{c.name} · {DIVISION_LABEL[c.division]}{c.level && ` · ${c.level.toUpperCase()}`}</span>
            <button onClick={() => db.classes.delete(c.id!)} className="text-destructive"><Trash2 size={13} /></button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function TeacherDashboardReadonly() {
  const [tab, setTab] = useState<"attendance" | "activity" | "lesson" | "assessment">("activity");
  const tabs = [
    { id: "attendance", label: "Attendance" }, { id: "activity", label: "Daily Activity" },
    { id: "lesson", label: "Lesson" }, { id: "assessment", label: "Assessment" },
  ] as const;
  return (
    <div>
      <div className="flex gap-2 overflow-x-auto pb-2 mb-3 no-scrollbar">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold border ${tab === t.id ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border"}`}>{t.label}</button>
        ))}
      </div>
      {tab === "attendance" && <AttendancePanel />}
      {tab === "activity" && <DailyActivityPanel />}
      {tab === "lesson" && <LessonPlanPanel />}
      {tab === "assessment" && <AssessmentPanel />}
    </div>
  );
}

function AnnouncementsPanel({ canPost, role }: { canPost: boolean; role: SchoolRole }) {
  const db = getSchoolDb();
  const items = useLiveQuery(async () => db.announcements.reverse().sortBy("createdAt"), []);
  const [title, setTitle] = useState(""); const [body, setBody] = useState(""); const [scope, setScope] = useState<"all" | "division">("all");
  async function post() {
    if (!title.trim()) return;
    await db.announcements.add({ scope, division: scope === "division" ? "kindergarten" : undefined, title: title.trim(), body, createdAt: Date.now() });
    setTitle(""); setBody("");
  }
  return (
    <div>
      {canPost && (
        <div className="rounded-2xl bg-card border border-border p-3 mb-3">
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Announcement title" className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm mb-2" />
          <textarea value={body} onChange={e => setBody(e.target.value)} rows={3} placeholder="Message" className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm mb-2" />
          <div className="flex gap-2">
            <select value={scope} onChange={e => setScope(e.target.value as "all" | "division")} className="rounded-lg bg-background border border-border px-2 py-1.5 text-sm">
              <option value="all">Whole school</option><option value="division">Kindergarten only</option>
            </select>
            <button onClick={post} className="rounded-lg bg-primary text-primary-foreground px-3 py-1.5 text-sm font-semibold flex items-center gap-1"><Megaphone size={13} />Broadcast</button>
          </div>
          <p className="text-[10px] text-muted-foreground mt-2">Posted as {ROLE_LABEL[role]}.</p>
        </div>
      )}
      <ul className="space-y-2">
        {(items ?? []).map(a => (
          <li key={a.id} className="rounded-xl bg-card border border-border p-3">
            <div className="flex justify-between">
              <p className="text-sm font-semibold">{a.title}</p>
              {canPost && <button onClick={() => db.announcements.delete(a.id!)} className="text-destructive"><Trash2 size={12} /></button>}
            </div>
            <p className="text-[10px] text-muted-foreground">{new Date(a.createdAt).toLocaleString()} · {a.scope}</p>
            {a.body && <p className="text-sm mt-1 whitespace-pre-wrap">{a.body}</p>}
          </li>
        ))}
        {(items ?? []).length === 0 && <Hint>No announcements yet.</Hint>}
      </ul>
    </div>
  );
}

// ---------------- Parent ----------------
function ParentDashboard() {
  const db = getSchoolDb();
  const allStudents = useLiveQuery(async () => db.students.toArray(), []);
  const linked = getParentStudentIds();
  const [selected, setSelected] = useState<number | null>(linked[0] ?? null);
  const myChildren = (allStudents ?? []).filter(s => linked.includes(s.id!));
  const announcements = useLiveQuery(async () => db.announcements.reverse().sortBy("createdAt"), []);
  const calendar = useLiveQuery(async () => db.calendar.orderBy("eventAt").toArray(), []);
  const assessments = useLiveQuery(async () => selected ? db.assessments.where("studentId").equals(selected).reverse().sortBy("periodStart") : [], [selected]);
  const activities = useLiveQuery(async () => {
    if (!selected) return [];
    const student = allStudents?.find(s => s.id === selected);
    if (!student?.classId) return [];
    return db.activities.where("classId").equals(student.classId).reverse().sortBy("date");
  }, [selected, allStudents]);
  const messages = useLiveQuery(async () => selected ? db.messages.where("toStudentId").equals(selected).sortBy("createdAt") : [], [selected]);
  const [reply, setReply] = useState("");

  if (myChildren.length === 0) {
    return <ParentLinker allStudents={allStudents ?? []} onLinked={id => setSelected(id)} />;
  }

  async function send() {
    if (!reply.trim() || !selected) return;
    await db.messages.add({ fromRole: "parent", toStudentId: selected, body: reply.trim(), createdAt: Date.now() });
    setReply("");
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-4 overflow-x-auto no-scrollbar">
        {myChildren.map(c => (
          <button key={c.id} onClick={() => setSelected(c.id!)} className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold border flex items-center gap-1 ${selected === c.id ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border"}`}>
            <Baby size={12} />{c.nickname || c.fullName}
          </button>
        ))}
        <button onClick={() => setParentStudentIds([])} className="ml-auto text-[10px] text-muted-foreground underline">Unlink</button>
      </div>

      <Section title="Announcements" Icon={Megaphone}>
        <ul className="space-y-2">
          {(announcements ?? []).slice(0, 5).map(a => (
            <li key={a.id} className="rounded-xl bg-card border border-border p-3">
              <p className="text-sm font-semibold">{a.title}</p>
              <p className="text-[10px] text-muted-foreground">{new Date(a.createdAt).toLocaleString()}</p>
              {a.body && <p className="text-sm mt-1">{a.body}</p>}
            </li>
          ))}
          {(announcements ?? []).length === 0 && <Hint>No announcements.</Hint>}
        </ul>
      </Section>

      <Section title="School Calendar" Icon={CalendarDays}>
        <ul className="space-y-2">
          {(calendar ?? []).filter(e => e.eventAt >= Date.now()).slice(0, 5).map(e => (
            <li key={e.id} className="rounded-xl bg-card border border-border p-3 text-sm">
              <p className="font-semibold">{e.title}</p>
              <p className="text-xs text-muted-foreground">{new Date(e.eventAt).toLocaleString()}</p>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Daily Activities" Icon={BookOpen}>
        <ul className="space-y-2">
          {(activities ?? []).slice(0, 5).map(a => (
            <li key={a.id} className="rounded-xl bg-card border border-border p-3 text-sm">
              <p className="font-semibold">{a.title}</p>
              <p className="text-xs text-muted-foreground">{new Date(a.date).toLocaleDateString()}</p>
              {a.body && <p className="mt-1">{a.body}</p>}
            </li>
          ))}
          {(activities ?? []).length === 0 && <Hint>No activity reports yet.</Hint>}
        </ul>
      </Section>

      <Section title="Assessment Reports" Icon={LineChart}>
        <ul className="space-y-2">
          {(assessments ?? []).map(a => (
            <li key={a.id} className="rounded-xl bg-card border border-border p-3 text-sm">
              <p className="font-semibold capitalize">{a.period} report · {new Date(a.periodStart).toLocaleDateString()}</p>
              <div className="grid grid-cols-5 gap-1 mt-2 text-[10px] text-center">
                {a.domains.map(d => (
                  <div key={d.name} className="rounded bg-secondary p-1">
                    <p className="text-muted-foreground">{d.name.slice(0, 4)}</p>
                    <p className="font-bold">{d.score}/5</p>
                  </div>
                ))}
              </div>
              {a.overallComment && <p className="mt-2 text-xs italic">"{a.overallComment}"</p>}
            </li>
          ))}
          {(assessments ?? []).length === 0 && <Hint>No assessments yet.</Hint>}
        </ul>
      </Section>

      <Section title="Messages with Teacher" Icon={MessageSquare}>
        <div className="rounded-2xl bg-card border border-border p-3 mb-2 space-y-2 max-h-60 overflow-y-auto">
          {(messages ?? []).map(m => (
            <div key={m.id} className={`text-sm ${m.fromRole === "parent" ? "text-right" : ""}`}>
              <div className={`inline-block rounded-2xl px-3 py-2 ${m.fromRole === "parent" ? "bg-secondary" : "bg-primary/15"}`}>
                <p className="text-[10px] text-muted-foreground">{ROLE_LABEL[m.fromRole]}</p>
                <p>{m.body}</p>
              </div>
            </div>
          ))}
          {(!messages || messages.length === 0) && <p className="text-xs text-muted-foreground">No messages yet.</p>}
        </div>
        <div className="flex gap-2">
          <input value={reply} onChange={e => setReply(e.target.value)} onKeyDown={e => e.key === "Enter" && send()} placeholder="Reply…" className="flex-1 rounded-lg bg-background border border-border px-3 py-2 text-sm" />
          <button onClick={send} className="rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm font-semibold">Send</button>
        </div>
      </Section>
    </div>
  );
}

function ParentLinker({ allStudents, onLinked }: { allStudents: { id?: number; fullName: string; classId?: number }[]; onLinked: (id: number) => void }) {
  const [ids, setIds] = useState<number[]>([]);
  return (
    <div className="rounded-2xl bg-card border border-border p-4">
      <p className="text-sm font-semibold mb-2">Link your child(ren)</p>
      <p className="text-xs text-muted-foreground mb-3">Select which student(s) belong to you. In production, the school would issue a pairing code.</p>
      <ul className="space-y-2 max-h-64 overflow-y-auto mb-3">
        {allStudents.map(s => (
          <li key={s.id}>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={ids.includes(s.id!)} onChange={e => setIds(v => e.target.checked ? [...v, s.id!] : v.filter(x => x !== s.id!))} className="accent-primary" />
              {s.fullName}
            </label>
          </li>
        ))}
        {allStudents.length === 0 && <Hint>No students exist yet. Ask a teacher to add students first.</Hint>}
      </ul>
      <button disabled={ids.length === 0} onClick={() => { setParentStudentIds(ids); onLinked(ids[0]); }} className="rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm font-semibold disabled:opacity-40">Link</button>
    </div>
  );
}

function Section({ title, Icon, children }: { title: string; Icon: typeof School; children: React.ReactNode }) {
  return (
    <section className="mb-5">
      <div className="flex items-center gap-2 mb-2">
        <Icon size={14} className="text-primary" />
        <h3 className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">{title}</h3>
      </div>
      {children}
    </section>
  );
}
function Hint({ children }: { children: React.ReactNode }) {
  return <p className="text-xs text-muted-foreground text-center py-4">{children}</p>;
}
