// UI panels for the 6 academic modules of the School Dashboard.
// Pure presentation + calls into src/lib/school-academic.functions.ts.
// Style matches the existing /school tabs (rounded-2xl cards, pill tabs).
import { useEffect, useRef, useState } from "react";
import { Trash2, Save, Sparkles, Plus, Check, X, BarChart3 } from "lucide-react";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell } from "recharts";
import {
  listCalendarEvents, saveCalendarEvent, deleteCalendarEvent, bulkImportCalendarEvents,
  listTimetable, saveTimetableSlot, deleteTimetableSlot,
  listLessonPlans, saveLessonPlan, deleteLessonPlan,
  listProjects, saveProject, reviewProject, listProjectReviews,
  listAssessments, saveAssessment, deleteAssessment, draftAssessmentNote,
  listAttendance, saveAttendance,
} from "@/lib/school-academic.functions";
import { listAgendas, saveAgenda, deleteAgenda, addAgendaPic, removeAgendaPic } from "@/lib/school-agenda.functions";
import { listMessagingContacts, listStaffConversation, sendStaffMessage } from "@/lib/school-staff-messages.functions";
import {
  reportCaseAsTeacher, reportCaseAsParent, listCases, listCasesForParent,
  listCaseTimeline, listCaseTimelineForParent, addCaseComment, addCaseCommentAsParent,
  listCaseParticipants, addCaseParticipant, escalateCaseToHos, closeCase, reopenCase,
} from "@/lib/school-case.functions";
import { listSchoolStudents, listSchoolStaff } from "@/lib/school.functions";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>;
export type ClassOpt = { id: string; name: string };

/** Shared access shape: staff use a password, parents use an invite code. */
export type Access = { pw: string; code?: undefined; staffId?: string } | { pw?: undefined; code: string; staffId?: undefined };

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
function Hint({ children }: { children: React.ReactNode }) {
  return <p className="text-xs text-muted-foreground text-center py-4">{children}</p>;
}
function Err({ msg }: { msg: string | null }) {
  return msg ? <p className="text-xs text-destructive mt-2">{msg}</p> : null;
}
const card = "rounded-2xl bg-card border border-border p-3";
const field = "w-full rounded-lg bg-background border border-border px-3 py-2 text-sm";
const btn = "rounded-lg bg-primary text-primary-foreground px-3 py-1.5 text-sm font-semibold disabled:opacity-50 flex items-center gap-1";
const today = () => new Date().toISOString().slice(0, 10);

function ClassPicker({ value, onChange, classes, allLabel = "semua kelas" }: { value: string; onChange: (v: string) => void; classes: ClassOpt[]; allLabel?: string }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className={field + " mb-3"}>
      <option value="">{allLabel}</option>
      {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
    </select>
  );
}

/* ───────────── 1. Academic calendar ───────────── */
const EVENT_TYPES = [
  { v: "libur", label: "Libur", cls: "bg-emerald-500/15 text-emerald-600" },
  { v: "ujian", label: "Ujian", cls: "bg-red-500/15 text-red-600" },
  { v: "acara", label: "Acara", cls: "bg-blue-500/15 text-blue-600" },
];

export function CalendarPanel({ access, classes, canEdit, compact }: { access: Access; classes: ClassOpt[]; canEdit: boolean; compact?: boolean }) {
  const [classId, setClassId] = useState("");
  const [reload, setReload] = useState(0);
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [date, setDate] = useState(today());
  const [type, setType] = useState("acara");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [importMsg, setImportMsg] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const staffId = access.staffId;

  const res = useAsync(
    () => listCalendarEvents({ data: access.code ? { code: access.code } : { password: access.pw, classId: classId || undefined } }),
    [access.pw, access.code, classId, reload],
  );
  const events: Row[] = res.data && res.data.ok ? res.data.events : [];

  async function add() {
    if (!title.trim() || !access.pw) return;
    setBusy(true); setErr(null);
    const r = await saveCalendarEvent({ data: { password: access.pw, classId: classId || undefined, title, description: desc, eventDate: date, eventType: type, staffId: staffId ?? "" } });
    setBusy(false);
    if (!r.ok) { setErr(r.error); return; }
    setTitle(""); setDesc(""); setReload((x) => x + 1);
  }
  async function remove(id: string) {
    if (!access.pw) return;
    const r = await deleteCalendarEvent({ data: { password: access.pw, id, staffId: staffId ?? "" } });
    if (!r.ok) { setErr(r.error); return; }
    setReload((x) => x + 1);
  }

  async function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !access.pw) return;
    setImportMsg(null);
    const text = await file.text();
    const lines = text.split(/\r?\n/).filter((l) => l.trim());
    const headers = (lines[0] ?? "").split(",").map((h) => h.trim().toLowerCase());
    const idx = (key: string) => headers.indexOf(key);
    const rows = lines.slice(1).map((line) => {
      const cols = line.split(",").map((c) => c.trim());
      const className = idx("classname") >= 0 ? cols[idx("classname")] : "";
      const matchedClass = classes.find((c) => c.name.toLowerCase() === (className ?? "").toLowerCase());
      return {
        title: cols[idx("title")] ?? "",
        eventDate: cols[idx("eventdate")] ?? "",
        eventType: idx("eventtype") >= 0 ? cols[idx("eventtype")] : "acara",
        description: idx("description") >= 0 ? cols[idx("description")] : undefined,
        classId: matchedClass?.id,
      };
    });
    const r = await bulkImportCalendarEvents({ data: { password: access.pw, staffId: staffId ?? "", rows } });
    setImportMsg(r.ok ? `${r.added} event berhasil diimport.` : `Gagal: ${r.error}`);
    if (r.ok) setReload((x) => x + 1);
    if (fileRef.current) fileRef.current.value = "";
  }

  return (
    <div className={compact ? "mx-auto" : undefined} style={compact ? { maxWidth: 560 } : undefined}>
      {!access.code && <ClassPicker value={classId} onChange={setClassId} classes={classes} />}
      {canEdit && (
        <div className={card + " mb-3 grid gap-2"}>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Judul event" className={field} />
          <textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={2} placeholder="Deskripsi (opsional)" className={field} />
          <div className="flex gap-2 flex-wrap">
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="rounded-lg bg-background border border-border px-2 py-1.5 text-sm" />
            <select value={type} onChange={(e) => setType(e.target.value)} className="rounded-lg bg-background border border-border px-2 py-1.5 text-sm">
              {EVENT_TYPES.map((t) => <option key={t.v} value={t.v}>{t.label}</option>)}
            </select>
            <button onClick={add} disabled={busy} className={btn}><Plus size={13} /> Tambah Event</button>
          </div>
          <p className="text-[11px] text-muted-foreground">Anda hanya bisa mengubah/menghapus agenda yang Anda buat sendiri — agenda milik orang lain tetap bisa dilihat.</p>
          <div className="flex items-center gap-2 pt-1 border-t border-border mt-1">
            <button onClick={() => fileRef.current?.click()} className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold">Import Agenda Tahunan (CSV)</button>
            <input ref={fileRef} type="file" accept=".csv,text/csv" onChange={handleImportFile} className="hidden" />
            <span className="text-[10px] text-muted-foreground">Kolom: title, eventDate (YYYY-MM-DD), eventType, description, className (opsional)</span>
          </div>
          {importMsg && <p className="text-xs">{importMsg}</p>}
          <Err msg={err} />
        </div>
      )}
      <CalendarGrid events={events} canEdit={canEdit} staffId={staffId} onRemove={remove} compact={compact} />
    </div>
  );
}

const MONTHS = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
const WEEKDAYS = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];

/** Visual month grid with the day cells highlighted when they carry events. */
function CalendarGrid({ events, canEdit, staffId, onRemove, compact }: { events: Row[]; canEdit: boolean; staffId?: string; onRemove: (id: string) => void; compact?: boolean }) {
  const now = new Date();
  const [cursor, setCursor] = useState({ y: now.getFullYear(), m: now.getMonth() });
  const [selected, setSelected] = useState<string | null>(null);

  const byDate = new Map<string, Row[]>();
  for (const e of events) {
    const key = String(e.event_date).slice(0, 10);
    byDate.set(key, [...(byDate.get(key) ?? []), e]);
  }

  const first = new Date(cursor.y, cursor.m, 1);
  const daysInMonth = new Date(cursor.y, cursor.m + 1, 0).getDate();
  const lead = (first.getDay() + 6) % 7; // Monday-first
  const cells: (number | null)[] = [...Array(lead).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  while (cells.length % 7 !== 0) cells.push(null);
  const key = (d: number) => `${cursor.y}-${String(cursor.m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  const shift = (delta: number) => {
    const d = new Date(cursor.y, cursor.m + delta, 1);
    setCursor({ y: d.getFullYear(), m: d.getMonth() });
    setSelected(null);
  };
  const todayKey = new Date().toISOString().slice(0, 10);
  const selectedEvents = selected ? (byDate.get(selected) ?? []) : [];

  return (
    <div className={"rounded-2xl bg-card border border-border " + (compact ? "p-2 text-xs" : "p-3")}>
      <div className="grid grid-cols-2 gap-3 items-start">
        <div>
          <div className="flex items-center justify-between mb-2">
            <button onClick={() => shift(-1)} className="rounded-lg border border-border px-2 py-1 text-xs">‹</button>
            <p className={compact ? "text-xs font-semibold" : "text-sm font-semibold"}>{MONTHS[cursor.m]} {cursor.y}</p>
            <button onClick={() => shift(1)} className="rounded-lg border border-border px-2 py-1 text-xs">›</button>
          </div>
          <div className="grid grid-cols-7 gap-0.5 text-center text-[9px] uppercase text-muted-foreground mb-1">
            {WEEKDAYS.map((d) => <div key={d}>{d[0]}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-0.5">
            {cells.map((d, i) => {
              if (d === null) return <div key={i} />;
              const k = key(d);
              const dayEvents = byDate.get(k) ?? [];
              const isToday = k === todayKey;
              return (
                <button
                  key={i}
                  onClick={() => setSelected(dayEvents.length ? k : null)}
                  className={
                    "aspect-square rounded-md text-[9px] sm:text-[10px] " +
                    "flex flex-col items-center justify-center gap-0.5 border " +
                    (selected === k ? "border-primary bg-primary/15 " : isToday ? "border-primary/60 " : "border-transparent ") +
                    (dayEvents.length ? "bg-secondary font-semibold" : "text-muted-foreground")
                  }
                >
                  {d}
                  {dayEvents.length > 0 && <span className="w-1 h-1 rounded-full bg-primary" />}
                </button>
              );
            })}
          </div>
        </div>

        <div className="border-l border-border pl-3">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold mb-1.5">
            {selected ? new Date(selected).toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" }) : "Detail Event"}
          </p>
          {selected ? (
            <ul className="space-y-2 max-h-64 overflow-y-auto">
              {selectedEvents.map((e) => {
                const t = EVENT_TYPES.find((x) => x.v === e.event_type) ?? EVENT_TYPES[2];
                const isOwn = !!staffId && e.created_by === staffId;
                return (
                  <li key={e.id} className="rounded-xl bg-background border border-border p-2">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-semibold">{e.title}</p>
                      <span className={"shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase " + t.cls}>{t.label}</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {e.school_staff?.full_name ? "oleh " + e.school_staff.full_name : ""}
                    </p>
                    {e.description && <p className="text-xs mt-1 whitespace-pre-wrap">{e.description}</p>}
                    {canEdit && isOwn && <button onClick={() => onRemove(e.id)} className="mt-1.5 text-[10px] text-destructive flex items-center gap-1"><Trash2 size={11} /> Hapus</button>}
                  </li>
                );
              })}
            </ul>
          ) : (
            <Hint>{events.length === 0 ? "Belum ada event." : "Pilih tanggal bertanda."}</Hint>
          )}
        </div>
      </div>
    </div>
  );
}


/* ───────────── 2. Timetable ───────────── */
const DAYS = [
  { v: 1, label: "Senin" }, { v: 2, label: "Selasa" }, { v: 3, label: "Rabu" },
  { v: 4, label: "Kamis" }, { v: 5, label: "Jumat" },
];

export function TimetablePanel({ access, classes, canEdit, staffId }: { access: Access; classes: ClassOpt[]; canEdit: boolean; staffId?: string | null }) {
  const [classId, setClassId] = useState(classes[0]?.id ?? "");
  const [reload, setReload] = useState(0);
  const [day, setDay] = useState(1);
  const [subject, setSubject] = useState("");
  const [start, setStart] = useState("07:30");
  const [end, setEnd] = useState("08:30");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const res = useAsync(
    () => listTimetable({ data: access.code ? { code: access.code } : { password: access.pw, classId: classId || undefined } }),
    [access.pw, access.code, classId, reload],
  );
  const slots: Row[] = res.data && res.data.ok ? res.data.slots : [];

  async function add() {
    if (!subject.trim() || !classId || !access.pw) return;
    setBusy(true); setErr(null);
    const r = await saveTimetableSlot({ data: { password: access.pw, classId, dayOfWeek: day, subject, teacherId: staffId || undefined, startTime: start, endTime: end } });
    setBusy(false);
    if (!r.ok) { setErr(r.error); return; }
    setSubject(""); setReload((x) => x + 1);
  }
  async function remove(id: string) {
    if (!access.pw) return;
    await deleteTimetableSlot({ data: { password: access.pw, id } });
    setReload((x) => x + 1);
  }

  return (
    <div>
      {!access.code && <ClassPicker value={classId} onChange={setClassId} classes={classes} allLabel="pilih kelas" />}
      {canEdit && classId && (
        <div className={card + " mb-3 grid gap-2"}>
          <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Mata pelajaran" className={field} />
          <div className="flex gap-2 flex-wrap items-center">
            <select value={day} onChange={(e) => setDay(Number(e.target.value))} className="rounded-lg bg-background border border-border px-2 py-1.5 text-sm">
              {DAYS.map((d) => <option key={d.v} value={d.v}>{d.label}</option>)}
            </select>
            <input type="time" value={start} onChange={(e) => setStart(e.target.value)} className="rounded-lg bg-background border border-border px-2 py-1.5 text-sm" />
            <span className="text-xs text-muted-foreground">-</span>
            <input type="time" value={end} onChange={(e) => setEnd(e.target.value)} className="rounded-lg bg-background border border-border px-2 py-1.5 text-sm" />
            <button onClick={add} disabled={busy} className={btn}><Plus size={13} /> Tambah Slot</button>
          </div>
          <Err msg={err} />
        </div>
      )}
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {DAYS.map((d) => {
          const items = slots.filter((s) => s.day_of_week === d.v);
          return (
            <div key={d.v} className="rounded-2xl bg-card border border-border p-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground font-semibold mb-2">{d.label}</p>
              <ul className="space-y-1.5">
                {items.map((s) => (
                  <li key={s.id} className="rounded-lg bg-secondary/50 px-2.5 py-1.5 text-xs flex items-center gap-2">
                    <span className="font-mono text-muted-foreground shrink-0">{String(s.start_time).slice(0, 5)}</span>
                    <span className="flex-1 font-semibold">{s.subject}</span>
                    {s.school_staff?.full_name && <span className="text-muted-foreground truncate max-w-24">{s.school_staff.full_name}</span>}
                    {canEdit && <button onClick={() => remove(s.id)} className="text-destructive shrink-0"><Trash2 size={11} /></button>}
                  </li>
                ))}
                {items.length === 0 && <p className="text-xs text-muted-foreground">-</p>}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ───────────── 3. Lesson plans ───────────── */
function mondayOf(d = new Date()): string {
  const x = new Date(d);
  const diff = (x.getDay() + 6) % 7;
  x.setDate(x.getDate() - diff);
  return x.toISOString().slice(0, 10);
}

export function LessonPlanPanel({ pw, classes, canEdit, staffId }: { pw: string; classes: ClassOpt[]; canEdit: boolean; staffId?: string | null }) {
  const [classId, setClassId] = useState("");
  const [reload, setReload] = useState(0);
  const [weekOf, setWeekOf] = useState(mondayOf());
  const [subject, setSubject] = useState("");
  const [topic, setTopic] = useState("");
  const [objectives, setObjectives] = useState("");
  const [materials, setMaterials] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const res = useAsync(() => listLessonPlans({ data: { password: pw, classId: classId || undefined } }), [pw, classId, reload]);
  const plans: Row[] = res.data && res.data.ok ? res.data.plans : [];

  async function add() {
    if (!subject.trim() || !topic.trim() || !classId) return;
    setBusy(true); setErr(null);
    const r = await saveLessonPlan({ data: { password: pw, classId, subject, teacherId: staffId || undefined, weekOf, topic, objectives, materials } });
    setBusy(false);
    if (!r.ok) { setErr(r.error); return; }
    setTopic(""); setObjectives(""); setMaterials(""); setReload((x) => x + 1);
  }
  async function remove(id: string) {
    await deleteLessonPlan({ data: { password: pw, id } });
    setReload((x) => x + 1);
  }

  const byWeek = plans.reduce<Record<string, Row[]>>((acc, p) => {
    (acc[p.week_of] ||= []).push(p);
    return acc;
  }, {});

  return (
    <div>
      <ClassPicker value={classId} onChange={setClassId} classes={classes} />
      {canEdit && (
        <div className={card + " mb-3 grid gap-2"}>
          <div className="grid grid-cols-2 gap-2">
            <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Mata pelajaran" className={field} />
            <input type="date" value={weekOf} onChange={(e) => setWeekOf(e.target.value)} className={field} />
          </div>
          <input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="Topik minggu ini" className={field} />
          <textarea value={objectives} onChange={(e) => setObjectives(e.target.value)} rows={2} placeholder="Tujuan pembelajaran" className={field} />
          <textarea value={materials} onChange={(e) => setMaterials(e.target.value)} rows={2} placeholder="Materi / alat bantu" className={field} />
          <button onClick={add} disabled={busy || !classId} className={btn + " justify-self-start"}><Save size={13} /> Simpan Lesson Plan</button>
          <Err msg={err} />
        </div>
      )}
      <div className="space-y-4">
        {Object.keys(byWeek).sort().reverse().map((week) => (
          <div key={week}>
            <p className="text-xs uppercase tracking-wide text-muted-foreground font-semibold mb-2">Minggu {new Date(week).toLocaleDateString()}</p>
            <ul className="space-y-2">
              {byWeek[week].map((p) => (
                <li key={p.id} className="rounded-xl bg-card border border-border p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold">{p.subject} - {p.topic}</p>
                    <span className="text-xs text-muted-foreground shrink-0">{p.school_classes?.name}</span>
                  </div>
                  {p.objectives && <p className="text-xs mt-1"><span className="text-muted-foreground">Tujuan: </span>{p.objectives}</p>}
                  {p.materials && <p className="text-xs mt-0.5"><span className="text-muted-foreground">Materi: </span>{p.materials}</p>}
                  {canEdit && <button onClick={() => remove(p.id)} className="mt-2 text-xs text-destructive flex items-center gap-1"><Trash2 size={12} /> Hapus</button>}
                </li>
              ))}
            </ul>
          </div>
        ))}
        {plans.length === 0 && <Hint>Belum ada lesson plan.</Hint>}
      </div>
    </div>
  );
}

/* ───────────── 4. Projects & official letters ───────────── */
const REVISI_TAG = "[REVISI]";
function projectBadge(p: Row): { label: string; cls: string } {
  const notes: string = p.last_review_notes ?? "";
  if (p.status === "draft" && notes.startsWith(REVISI_TAG)) return { label: "Minta Revisi", cls: "bg-blue-500/15 text-blue-600" };
  switch (p.status) {
    case "diajukan_principal": return { label: "Di Principal", cls: "bg-yellow-500/20 text-yellow-700" };
    case "diajukan_hos": return { label: "Di Head of School", cls: "bg-orange-500/20 text-orange-700" };
    case "disetujui": return { label: "Disetujui", cls: "bg-emerald-500/15 text-emerald-600" };
    case "ditolak": return { label: "Ditolak", cls: "bg-red-500/15 text-red-600" };
    default: return { label: "Draft", cls: "bg-muted text-muted-foreground" };
  }
}

export function ProjectPanel({
  pw, classes, canSubmit, reviewerRole, reviewerName, staffId,
}: {
  pw: string; classes: ClassOpt[]; canSubmit: boolean;
  reviewerRole: "principal" | "hos" | null; reviewerName?: string; staffId?: string | null;
}) {
  const [view, setView] = useState<"list" | "pending">(reviewerRole ? "pending" : "list");
  const [reload, setReload] = useState(0);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [classId, setClassId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [requiresHos, setRequiresHos] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const res = useAsync(() => listProjects({ data: { password: pw } }), [pw, reload]);
  const all: Row[] = res.data && res.data.ok ? res.data.projects : [];
  const pendingStatus = reviewerRole === "principal" ? "diajukan_principal" : "diajukan_hos";
  const pending = all.filter((p) => p.status === pendingStatus);
  // For Principal/HoS, "history" is only what's actually finished — anything
  // still moving through the approval chain stays in "Menunggu Approval"
  // (at whichever stage it's currently at) and never shows here until then.
  const history = all.filter((p) => p.status === "disetujui" || p.status === "ditolak");

  function startEdit(p: Row) {
    setEditingId(p.id);
    setClassId(p.class_id ?? "");
    setTitle(p.title ?? "");
    setDescription(p.description ?? "");
    setRequiresHos(p.requires_hos ?? true);
    setView("list");
  }

  async function submit(asDraft: boolean) {
    if (!title.trim() || !classId) return;
    setBusy(true); setErr(null);
    const r = await saveProject({ data: { password: pw, id: editingId || undefined, classId, teacherId: staffId || undefined, title, description, submit: !asDraft, requiresHos } });
    setBusy(false);
    if (!r.ok) { setErr(r.error); return; }
    setTitle(""); setDescription(""); setEditingId(null); setReload((x) => x + 1);
  }

  return (
    <div>
      {reviewerRole && (
        <div className="flex gap-2 mb-3">
          {(["pending", "list"] as const).map((v) => (
            <button key={v} onClick={() => setView(v)} className={"rounded-full px-3 py-1.5 text-xs font-semibold border " + (view === v ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border")}>
              {v === "pending" ? `Menunggu Approval (${pending.length})` : "Riwayat Semua Pengajuan"}
            </button>
          ))}
        </div>
      )}

      {canSubmit && view === "list" && (
        <div className={card + " mb-3 grid gap-2"}>
          {editingId && <p className="text-xs text-primary font-semibold">Mengedit project yang diminta revisi — ajukan ulang setelah diperbaiki.</p>}
          <select value={classId} onChange={(e) => setClassId(e.target.value)} className={field}>
            <option value="">pilih kelas</option>
            {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Judul project / surat resmi" className={field} />
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} placeholder="Isi / deskripsi" className={field} />
          <label className="flex items-center gap-2 text-xs">
            <input type="checkbox" checked={requiresHos} onChange={(e) => setRequiresHos(e.target.checked)} />
            Perlu approval Head of School (kalau tidak dicentang, keputusan Principal sudah final)
          </label>
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => submit(true)} disabled={busy} className="rounded-lg border border-border px-3 py-1.5 text-sm font-semibold disabled:opacity-50">Simpan Draft</button>
            <button onClick={() => submit(false)} disabled={busy} className={btn}><Save size={13} /> {editingId ? "Ajukan Ulang ke Principal" : "Ajukan ke Principal"}</button>
            {editingId && <button onClick={() => { setEditingId(null); setTitle(""); setDescription(""); setClassId(""); }} className="rounded-lg border border-border px-3 py-1.5 text-sm">Batal Edit</button>}
          </div>
          <Err msg={err} />
        </div>
      )}

      <ul className="space-y-2">
        {(view === "pending" ? pending : (reviewerRole ? history : all)).map((p) => (
          <ProjectRow
            key={p.id} project={p} pw={pw}
            reviewerRole={reviewerRole}
            reviewerName={reviewerName}
            canEditDraft={canSubmit && p.status === "draft"}
            onEdit={() => startEdit(p)}
            onChanged={() => setReload((x) => x + 1)}
          />
        ))}
        {(view === "pending" ? pending : (reviewerRole ? history : all)).length === 0 && (
          <Hint>{view === "pending" ? "Tidak ada project yang menunggu approval." : "Belum ada project."}</Hint>
        )}
      </ul>
    </div>
  );
}

function ProjectRow({
  project, pw, reviewerRole, reviewerName, canEditDraft, onEdit, onChanged,
}: {
  project: Row; pw: string; reviewerRole: "principal" | "hos" | null; reviewerName?: string;
  canEditDraft?: boolean; onEdit?: () => void; onChanged: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const badge = projectBadge(project);
  const history = useAsync(() => (open ? listProjectReviews({ data: { password: pw, projectId: project.id } }) : Promise.resolve(null)), [open, pw, project.id]);
  const reviews: Row[] = history.data && history.data.ok ? history.data.reviews : [];

  async function decide(kind: "approve" | "reject" | "revisi") {
    if (!reviewerRole) return;
    setBusy(true); setErr(null);
    const r = await reviewProject({
      data: {
        password: pw, id: project.id, reviewerRole, reviewerName,
        decision: kind === "approve" ? "approve" : "reject",
        isRevisi: kind === "revisi",
        notes: kind === "revisi" ? REVISI_TAG + " " + notes : notes,
      },
    });
    setBusy(false);
    if (!r.ok) { setErr(r.error); return; }
    setNotes(""); onChanged();
  }

  return (
    <li className="rounded-xl bg-card border border-border p-3">
      <button onClick={() => setOpen((v) => !v)} className="w-full text-left">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-semibold">{project.title}</p>
          <span className={"shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase " + badge.cls}>{badge.label}</span>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">
          {project.school_classes?.name}{project.school_staff?.full_name ? " - " + project.school_staff.full_name : ""}
          {project.requires_hos === false && <span className="ml-2 text-[10px] uppercase text-muted-foreground">· Final di Principal</span>}
        </p>
      </button>
      {open && (
        <div className="mt-3 pt-3 border-t border-border space-y-3">
          {project.description && <p className="text-sm whitespace-pre-wrap">{project.description}</p>}
          {project.last_review_notes && (
            <p className="text-xs rounded-lg bg-secondary/50 p-2"><span className="text-muted-foreground">Catatan terakhir: </span>{project.last_review_notes}</p>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {reviews.length > 0 && (
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground font-semibold mb-1.5">Riwayat Revisi & Review</p>
                <ul className="space-y-1">
                  {reviews.map((r) => (
                    <li key={r.id} className="text-[11px] text-muted-foreground">
                      {new Date(r.reviewed_at).toLocaleDateString()} - {r.reviewer_role} - {r.decision}{r.notes ? ": " + r.notes : ""}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {reviewerRole && (
              <div className="grid gap-2 content-start">
                <p className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">Catatan & Keputusan</p>
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Catatan untuk guru (opsional)" className={field} />
                <div className="flex gap-2 flex-wrap">
                  <button onClick={() => decide("approve")} disabled={busy} className="rounded-lg bg-emerald-600 text-white px-3 py-1.5 text-sm font-semibold disabled:opacity-50 flex items-center gap-1"><Check size={13} /> Approve</button>
                  <button onClick={() => decide("revisi")} disabled={busy} className="rounded-lg bg-blue-600 text-white px-3 py-1.5 text-sm font-semibold disabled:opacity-50">Minta Revisi</button>
                  <button onClick={() => decide("reject")} disabled={busy} className="rounded-lg bg-destructive text-destructive-foreground px-3 py-1.5 text-sm font-semibold disabled:opacity-50 flex items-center gap-1"><X size={13} /> Reject</button>
                </div>
                <Err msg={err} />
              </div>
            )}
          </div>
          {canEditDraft && onEdit && (
            <button onClick={onEdit} className="rounded-lg border border-primary text-primary px-3 py-1.5 text-sm font-semibold">Edit & Ajukan Ulang</button>
          )}
        </div>
      )}
    </li>
  );
}

/* ───────────── 5. Subject assessment ───────────── */
type FormRow = { competency: string; achieved: boolean; rating: number };

export function AssessmentPanel({ access, classes, canEdit, staffId }: { access: Access; classes: ClassOpt[]; canEdit: boolean; staffId?: string | null }) {
  const [classId, setClassId] = useState("");
  const [reload, setReload] = useState(0);
  const [studentId, setStudentId] = useState("");
  const [subject, setSubject] = useState("");
  const [period, setPeriod] = useState("mingguan");
  const [periodStart, setPeriodStart] = useState(today());
  const [forms, setForms] = useState<FormRow[]>([{ competency: "", achieved: false, rating: 3 }]);
  const [note, setNote] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [drafting, setDrafting] = useState(false);

  const studentsRes = useAsync(
    () => (access.pw && classId ? listSchoolStudents({ data: { password: access.pw, classId } }) : Promise.resolve(null)),
    [access.pw, classId],
  );
  const students: Row[] = studentsRes.data && "students" in studentsRes.data ? (studentsRes.data.students ?? []) : [];

  const res = useAsync(
    () => listAssessments({ data: access.code ? { code: access.code } : { password: access.pw, classId: classId || undefined } }),
    [access.pw, access.code, classId, reload],
  );
  const list: Row[] = res.data && res.data.ok ? res.data.assessments : [];

  function setForm(i: number, patch: Partial<FormRow>) {
    setForms((f) => f.map((row, idx) => (idx === i ? { ...row, ...patch } : row)));
  }

  async function generate() {
    if (!access.pw) return;
    const student = students.find((s) => s.id === studentId);
    setDrafting(true); setErr(null);
    const r = await draftAssessmentNote({
      data: {
        password: access.pw, studentName: student?.full_name ?? "murid", subject: subject || "umum", period,
        forms: forms.filter((f) => f.competency.trim()),
      },
    });
    setDrafting(false);
    if (!r.ok) { setErr(r.error); return; }
    setNote(r.note);
  }

  async function save() {
    if (!access.pw || !studentId || !classId || !subject.trim()) return;
    setBusy(true); setErr(null);
    const r = await saveAssessment({
      data: {
        password: access.pw, studentId, classId, subject, teacherId: staffId || undefined, period, periodStart,
        forms: forms.filter((f) => f.competency.trim()),
        finalNote: note,
      },
    });
    setBusy(false);
    if (!r.ok) { setErr(r.error); return; }
    setForms([{ competency: "", achieved: false, rating: 3 }]);
    setNote("");
    setReload((x) => x + 1);
  }
  async function remove(id: string) {
    if (!access.pw) return;
    await deleteAssessment({ data: { password: access.pw, id } });
    setReload((x) => x + 1);
  }

  return (
    <div>
      {!access.code && <ClassPicker value={classId} onChange={setClassId} classes={classes} />}
      {list.length > 0 && <AssessmentCharts assessments={list} focusStudentId={(studentId || (access.code ? list[0]?.student_id : undefined)) || undefined} />}
      {canEdit && (
        <div className={card + " mb-3 grid gap-2"}>
          <div className="grid grid-cols-2 gap-2">
            <select value={studentId} onChange={(e) => setStudentId(e.target.value)} className={field}>
              <option value="">pilih murid</option>
              {students.map((s) => <option key={s.id} value={s.id}>{s.full_name}</option>)}
            </select>
            <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Mata pelajaran" className={field} />
            <select value={period} onChange={(e) => setPeriod(e.target.value)} className={field}>
              <option value="mingguan">Mingguan</option>
              <option value="bulanan">Bulanan</option>
              <option value="semester">Semester</option>
            </select>
            <input type="date" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} className={field} />
          </div>

          <p className="text-xs uppercase tracking-wide text-muted-foreground font-semibold mt-1">Checklist Kompetensi</p>
          <ul className="space-y-2">
            {forms.map((f, i) => (
              <li key={i} className="rounded-lg bg-secondary/40 p-2 grid gap-2">
                <div className="flex items-center gap-2">
                  <input value={f.competency} onChange={(e) => setForm(i, { competency: e.target.value })} placeholder={"Kompetensi " + (i + 1)} className="flex-1 rounded-lg bg-background border border-border px-2 py-1.5 text-sm" />
                  <label className="flex items-center gap-1 text-xs shrink-0">
                    <input type="checkbox" checked={f.achieved} onChange={(e) => setForm(i, { achieved: e.target.checked })} /> Tercapai
                  </label>
                  {forms.length > 1 && <button onClick={() => setForms((x) => x.filter((_, idx) => idx !== i))} className="text-destructive"><Trash2 size={13} /></button>}
                </div>
                <div className="flex items-center gap-1.5">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button key={n} onClick={() => setForm(i, { rating: n })} className={"w-7 h-7 rounded-full text-xs font-semibold border " + (f.rating === n ? "bg-primary text-primary-foreground border-primary" : "bg-background border-border")}>{n}</button>
                  ))}
                  <span className="text-[11px] text-muted-foreground ml-1">skala 1-5</span>
                </div>
              </li>
            ))}
          </ul>
          <button onClick={() => setForms((f) => [...f, { competency: "", achieved: false, rating: 3 }])} className="justify-self-start rounded-lg border border-border px-3 py-1.5 text-xs font-semibold flex items-center gap-1"><Plus size={12} /> Tambah Kompetensi</button>

          <p className="text-xs uppercase tracking-wide text-muted-foreground font-semibold mt-1">Catatan Umum</p>
          <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={5} placeholder="Catatan narasi untuk orangtua (bisa diedit setelah digenerate AI)" className={field} />
          <div className="flex gap-2 flex-wrap">
            <button onClick={generate} disabled={drafting} className="rounded-lg border border-primary text-primary px-3 py-1.5 text-sm font-semibold disabled:opacity-50 flex items-center gap-1">
              <Sparkles size={13} /> {drafting ? "Membuat catatan…" : "Generate Catatan AI"}
            </button>
            <button onClick={save} disabled={busy || !studentId} className={btn}><Save size={13} /> Simpan Assessment</button>
          </div>
          <Err msg={err} />
        </div>
      )}

      <ul className="space-y-2">
        {list.map((a) => (
          <li key={a.id} className="rounded-xl bg-card border border-border p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold">{a.school_students?.full_name} - {a.subject}</p>
              <span className="text-xs text-muted-foreground shrink-0">{a.period} - {new Date(a.period_start).toLocaleDateString()}</span>
            </div>
            <ul className="mt-2 space-y-0.5">
              {(a.school_assessment_forms ?? []).map((f: Row) => (
                <li key={f.id} className="text-xs flex items-center gap-2">
                  <span className={f.achieved ? "text-emerald-600" : "text-muted-foreground"}>{f.achieved ? "✓" : "○"}</span>
                  <span className="flex-1">{f.competency}</span>
                  <span className="text-muted-foreground">{f.rating}/5</span>
                </li>
              ))}
            </ul>
            {(a.school_assessment_notes ?? []).map((n: Row) => n.final_note && (
              <p key={n.id} className="text-sm mt-2 whitespace-pre-wrap rounded-lg bg-secondary/40 p-2">{n.final_note}</p>
            ))}
            {canEdit && <button onClick={() => remove(a.id)} className="mt-2 text-xs text-destructive flex items-center gap-1"><Trash2 size={12} /> Hapus</button>}
          </li>
        ))}
        {list.length === 0 && <Hint>Belum ada assessment.</Hint>}
      </ul>
    </div>
  );
}

/** Two chart views: average rating per student in the class (overview),
 * and one student's average rating over time (progress) — students pick
 * that student the same way they pick one to assess (studentId). */
function AssessmentCharts({ assessments, focusStudentId }: { assessments: Row[]; focusStudentId?: string }) {
  const avgRating = (a: Row) => {
    const forms: Row[] = a.school_assessment_forms ?? [];
    const rated = forms.filter((f) => typeof f.rating === "number");
    return rated.length ? rated.reduce((s, f) => s + f.rating, 0) / rated.length : 0;
  };

  const byStudent = new Map<string, { name: string; total: number; count: number }>();
  for (const a of assessments) {
    const id = a.student_id as string;
    const name = a.school_students?.full_name ?? "?";
    const entry = byStudent.get(id) ?? { name, total: 0, count: 0 };
    entry.total += avgRating(a);
    entry.count += 1;
    byStudent.set(id, entry);
  }
  const classData = Array.from(byStudent.values()).map((s) => ({ name: s.name, rata2: Math.round((s.total / s.count) * 10) / 10 }));

  const progress = focusStudentId
    ? assessments
        .filter((a) => a.student_id === focusStudentId)
        .sort((a, b) => String(a.period_start).localeCompare(String(b.period_start)))
        .map((a) => ({ tanggal: new Date(a.period_start).toLocaleDateString(undefined, { month: "short", day: "numeric" }), rata2: Math.round(avgRating(a) * 10) / 10 }))
    : [];

  return (
    <div className={card + " mb-3 grid gap-4"}>
      <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground font-semibold"><BarChart3 size={14} /> Ringkasan Assessment</div>
      <div>
        <p className="text-xs text-muted-foreground mb-1">Rata-rata rating per murid (kelas ini)</p>
        <ResponsiveContainer width="100%" height={Math.max(160, classData.length * 28)}>
          <BarChart data={classData} layout="vertical" margin={{ left: 8, right: 8 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
            <XAxis type="number" domain={[0, 5]} fontSize={11} />
            <YAxis type="category" dataKey="name" width={100} fontSize={11} />
            <Tooltip />
            <Bar dataKey="rata2" fill="hsl(var(--primary))" radius={4} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      {focusStudentId && (
        <div>
          <p className="text-xs text-muted-foreground mb-1">Perkembangan murid terpilih dari waktu ke waktu</p>
          {progress.length > 0 ? (
            <ResponsiveContainer width="100%" height={160}>
              <LineChart data={progress} margin={{ left: 8, right: 8 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="tanggal" fontSize={11} />
                <YAxis domain={[0, 5]} fontSize={11} />
                <Tooltip />
                <Line type="monotone" dataKey="rata2" stroke="hsl(var(--primary))" strokeWidth={2} dot />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <Hint>Belum ada riwayat assessment untuk murid ini.</Hint>
          )}
        </div>
      )}
    </div>
  );
}

/* ───────────── 6. Attendance ───────────── */
const STATUSES = [
  { v: "hadir", label: "Hadir", cls: "text-emerald-600" },
  { v: "izin", label: "Izin", cls: "text-blue-600" },
  { v: "sakit", label: "Sakit", cls: "text-orange-600" },
  { v: "alpha", label: "Alpha", cls: "text-red-600" },
];

/** Per-class and per-child attendance breakdown over the last 30 days. */
function AttendanceCharts({ access, classId, students }: { access: Access; classId: string; students: Row[] }) {
  const [studentId, setStudentId] = useState("");
  const to = today();
  const from = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const res = useAsync(
    () => listAttendance({ data: access.code ? { code: access.code } : { password: access.pw, classId, from, to } }),
    [access.pw, access.code, classId, from, to],
  );
  const records: Row[] = res.data && res.data.ok ? res.data.records : [];

  const STATUS_COLORS: Record<string, string> = { hadir: "#10b981", izin: "#3b82f6", sakit: "#f97316", alpha: "#ef4444" };
  const classCounts = STATUSES.map((st) => ({ status: st.label, jumlah: records.filter((r) => r.status === st.v).length }));

  const studentRecords = studentId ? records.filter((r) => r.student_id === studentId) : [];
  const studentCounts = STATUSES.map((st) => ({ status: st.label, jumlah: studentRecords.filter((r) => r.status === st.v).length }));

  if (records.length === 0) return null;

  return (
    <div className={card + " mb-3 grid gap-4"}>
      <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground font-semibold"><BarChart3 size={14} /> Ringkasan Attendance (30 hari terakhir)</div>
      <div>
        <p className="text-xs text-muted-foreground mb-1">Per kelas</p>
        <ResponsiveContainer width="100%" height={140}>
          <BarChart data={classCounts}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="status" fontSize={11} />
            <YAxis allowDecimals={false} fontSize={11} />
            <Tooltip />
            <Bar dataKey="jumlah" radius={4}>
              {classCounts.map((c, i) => <Cell key={i} fill={STATUS_COLORS[STATUSES[i].v]} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div>
        <div className="flex items-center justify-between mb-1">
          <p className="text-xs text-muted-foreground">Per murid</p>
          <select value={studentId} onChange={(e) => setStudentId(e.target.value)} className="rounded-lg bg-background border border-border px-2 py-1 text-xs">
            <option value="">pilih murid</option>
            {students.map((s) => <option key={s.id} value={s.id}>{s.full_name}</option>)}
          </select>
        </div>
        {studentId ? (
          <ResponsiveContainer width="100%" height={140}>
            <BarChart data={studentCounts}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="status" fontSize={11} />
              <YAxis allowDecimals={false} fontSize={11} />
              <Tooltip />
              <Bar dataKey="jumlah" radius={4}>
                {studentCounts.map((c, i) => <Cell key={i} fill={STATUS_COLORS[STATUSES[i].v]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <Hint>Pilih murid untuk lihat rincian kehadirannya.</Hint>
        )}
      </div>
    </div>
  );
}

export function AttendancePanel({ access, classes, canEdit, staffId }: { access: Access; classes: ClassOpt[]; canEdit: boolean; staffId?: string | null }) {
  const [classId, setClassId] = useState(classes[0]?.id ?? "");
  const [date, setDate] = useState(today());
  const [reload, setReload] = useState(0);
  const [marks, setMarks] = useState<Record<string, string>>({});
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  const studentsRes = useAsync(
    () => (access.pw && classId ? listSchoolStudents({ data: { password: access.pw, classId } }) : Promise.resolve(null)),
    [access.pw, classId],
  );
  const students: Row[] = studentsRes.data && "students" in studentsRes.data ? (studentsRes.data.students ?? []) : [];

  const res = useAsync(
    () => listAttendance({ data: access.code ? { code: access.code } : { password: access.pw, classId: classId || undefined, date } }),
    [access.pw, access.code, classId, date, reload],
  );
  const records: Row[] = res.data && res.data.ok ? res.data.records : [];

  useEffect(() => {
    if (access.code) return;
    const next: Record<string, string> = {};
    for (const r of records) next[r.student_id] = r.status;
    setMarks(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [res.data]);

  async function save() {
    if (!access.pw || !classId) return;
    setBusy(true); setErr(null); setSaved(false);
    const r = await saveAttendance({
      data: {
        password: access.pw, classId, date, recordedBy: staffId || undefined,
        entries: students.map((s) => ({ studentId: s.id, status: marks[s.id] ?? "hadir" })),
      },
    });
    setBusy(false);
    if (!r.ok) { setErr(r.error); return; }
    setSaved(true); setReload((x) => x + 1);
  }

  // Parent view: history only.
  if (access.code) {
    return (
      <ul className="space-y-2">
        {records.map((r) => {
          const st = STATUSES.find((s) => s.v === r.status);
          return (
            <li key={r.id} className="rounded-xl bg-card border border-border p-3 flex items-center justify-between text-sm">
              <span>{new Date(r.date).toLocaleDateString()}</span>
              <span className={"font-semibold " + (st?.cls ?? "")}>{st?.label ?? r.status}</span>
            </li>
          );
        })}
        {records.length === 0 && <Hint>Belum ada riwayat kehadiran.</Hint>}
      </ul>
    );
  }

  return (
    <div>
      {classId && <AttendanceCharts access={access} classId={classId} students={students} />}
      <div className="flex gap-2 mb-3">
        <select value={classId} onChange={(e) => setClassId(e.target.value)} className={field}>
          <option value="">pilih kelas</option>
          {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="rounded-lg bg-background border border-border px-2 py-2 text-sm" />
      </div>
      {!classId ? (
        <Hint>Pilih kelas dulu.</Hint>
      ) : (
        <>
          <ul className="space-y-2">
            {students.map((s) => (
              <li key={s.id} className="rounded-xl bg-card border border-border p-3">
                <p className="text-sm font-semibold mb-2">{s.full_name}</p>
                <div className="flex gap-1.5 flex-wrap">
                  {STATUSES.map((st) => (
                    <button
                      key={st.v}
                      disabled={!canEdit}
                      onClick={() => setMarks((m) => ({ ...m, [s.id]: st.v }))}
                      className={"rounded-full px-3 py-1 text-xs font-semibold border disabled:opacity-60 " + ((marks[s.id] ?? "hadir") === st.v ? "bg-primary text-primary-foreground border-primary" : "bg-background border-border")}
                    >{st.label}</button>
                  ))}
                </div>
              </li>
            ))}
            {students.length === 0 && <Hint>Belum ada murid di kelas ini.</Hint>}
          </ul>
          {canEdit && students.length > 0 && (
            <div className="mt-3 flex items-center gap-2">
              <button onClick={save} disabled={busy} className={btn}><Save size={13} /> Simpan Absensi</button>
              {saved && <span className="text-xs text-emerald-600">Tersimpan.</span>}
            </div>
          )}
          <Err msg={err} />
        </>
      )}
    </div>
  );
}

/* ───────────── 7. Agenda Sekolah (HoS only) ───────────── */
export function AgendaPanel({ pw, staffId }: { pw: string; staffId: string }) {
  const [reload, setReload] = useState(0);
  const [open, setOpen] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [purpose, setPurpose] = useState("");
  const [theme, setTheme] = useState("");
  const [startDate, setStartDate] = useState(today());
  const [endDate, setEndDate] = useState(today());
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const res = useAsync(() => listAgendas({ data: { password: pw } }), [pw, reload]);
  const agendas: Row[] = res.data && res.data.ok ? res.data.agendas : [];

  const staffRes = useAsync(() => listSchoolStaff({ data: { password: pw } }), [pw]);
  const staffList: Row[] = staffRes.data && "staff" in staffRes.data ? (staffRes.data.staff ?? []) : [];

  async function create() {
    if (!title.trim()) return;
    setBusy(true); setErr(null);
    const r = await saveAgenda({ data: { password: pw, staffId, title, purpose, theme, startDate, endDate } });
    setBusy(false);
    if (!r.ok) { setErr(r.error); return; }
    setTitle(""); setPurpose(""); setTheme(""); setReload((x) => x + 1);
  }
  async function remove(id: string) {
    await deleteAgenda({ data: { password: pw, id } });
    setReload((x) => x + 1);
  }

  return (
    <div>
      <div className={card + " mb-3 grid gap-2"}>
        <p className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">Agenda Sekolah Baru</p>
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Judul" className={field} />
        <input value={purpose} onChange={(e) => setPurpose(e.target.value)} placeholder="Tujuan" className={field} />
        <input value={theme} onChange={(e) => setTheme(e.target.value)} placeholder="Tema" className={field} />
        <div className="flex gap-2 flex-wrap items-center">
          <label className="text-xs text-muted-foreground">Mulai</label>
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="rounded-lg bg-background border border-border px-2 py-1.5 text-sm" />
          <label className="text-xs text-muted-foreground">Selesai</label>
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="rounded-lg bg-background border border-border px-2 py-1.5 text-sm" />
        </div>
        <button onClick={create} disabled={busy} className={btn + " justify-self-start"}><Plus size={13} /> Buat Agenda</button>
        <Err msg={err} />
      </div>

      <ul className="space-y-2">
        {agendas.map((a) => (
          <AgendaRow key={a.id} agenda={a} pw={pw} staffList={staffList} open={open === a.id} onToggle={() => setOpen(open === a.id ? null : a.id)} onRemove={() => remove(a.id)} onChanged={() => setReload((x) => x + 1)} />
        ))}
        {agendas.length === 0 && <Hint>Belum ada agenda sekolah.</Hint>}
      </ul>
    </div>
  );
}

function AgendaRow({ agenda, pw, staffList, open, onToggle, onRemove, onChanged }: {
  agenda: Row; pw: string; staffList: Row[]; open: boolean; onToggle: () => void; onRemove: () => void; onChanged: () => void;
}) {
  const [picStaffId, setPicStaffId] = useState("");
  const [extName, setExtName] = useState("");
  const [extContact, setExtContact] = useState("");
  const [addingExternal, setAddingExternal] = useState(false);
  const picList: Row[] = agenda.school_agenda_pic ?? [];

  async function addInternal() {
    if (!picStaffId) return;
    await addAgendaPic({ data: { password: pw, agendaId: agenda.id, staffId: picStaffId, isExternal: false } });
    setPicStaffId(""); onChanged();
  }
  async function addExternal() {
    if (!extName.trim()) return;
    await addAgendaPic({ data: { password: pw, agendaId: agenda.id, externalName: extName, externalContact: extContact, isExternal: true } });
    setExtName(""); setExtContact(""); setAddingExternal(false); onChanged();
  }
  async function removePic(id: string) {
    await removeAgendaPic({ data: { password: pw, id } });
    onChanged();
  }

  return (
    <li className="rounded-xl bg-card border border-border p-3">
      <button onClick={onToggle} className="w-full text-left">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-semibold">{agenda.title}</p>
          <span className="text-[10px] uppercase text-muted-foreground shrink-0">{agenda.status}</span>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">
          {agenda.theme ? agenda.theme + " · " : ""}
          {agenda.start_date ? new Date(agenda.start_date).toLocaleDateString() : ""}{agenda.end_date ? " – " + new Date(agenda.end_date).toLocaleDateString() : ""}
        </p>
        {picList.length > 0 && (
          <p className="text-[11px] text-muted-foreground mt-1">
            PIC: {picList.map((p) => p.is_external ? p.external_name : p.school_staff?.full_name).join(", ")}
          </p>
        )}
      </button>
      {open && (
        <div className="mt-3 pt-3 border-t border-border space-y-3">
          {agenda.purpose && <p className="text-sm"><span className="text-muted-foreground">Tujuan: </span>{agenda.purpose}</p>}

          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground font-semibold mb-1.5">PIC (Person in Charge)</p>
            <ul className="space-y-1.5 mb-2">
              {picList.map((p) => (
                <li key={p.id} className="flex items-center justify-between text-sm rounded-lg bg-secondary/40 px-2 py-1.5">
                  <span>{p.is_external ? p.external_name + " (eksternal)" : p.school_staff?.full_name}</span>
                  <button onClick={() => removePic(p.id)} className="text-destructive"><Trash2 size={13} /></button>
                </li>
              ))}
              {picList.length === 0 && <Hint>Belum ada PIC ditunjuk.</Hint>}
            </ul>
            <div className="flex gap-2 flex-wrap">
              <select value={picStaffId} onChange={(e) => setPicStaffId(e.target.value)} className="rounded-lg bg-background border border-border px-2 py-1.5 text-sm">
                <option value="">pilih staff internal</option>
                {staffList.map((s) => <option key={s.id} value={s.id}>{s.full_name}</option>)}
              </select>
              <button onClick={addInternal} disabled={!picStaffId} className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold disabled:opacity-40">Tambah PIC Internal</button>
              <button onClick={() => setAddingExternal((v) => !v)} className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold">+ PIC Eksternal</button>
            </div>
            {addingExternal && (
              <div className="mt-2 flex gap-2 flex-wrap">
                <input value={extName} onChange={(e) => setExtName(e.target.value)} placeholder="Nama PIC eksternal" className="rounded-lg bg-background border border-border px-2 py-1.5 text-sm" />
                <input value={extContact} onChange={(e) => setExtContact(e.target.value)} placeholder="Kontak (opsional)" className="rounded-lg bg-background border border-border px-2 py-1.5 text-sm" />
                <button onClick={addExternal} className="rounded-lg bg-primary text-primary-foreground px-3 py-1.5 text-xs font-semibold">Tambah</button>
              </div>
            )}
            <p className="text-[11px] text-muted-foreground mt-1.5">PIC eksternal cuma dicatat nama & kontak — tidak bisa login untuk mengisi timeline sendiri.</p>
          </div>

          <button onClick={onRemove} className="text-xs text-destructive flex items-center gap-1"><Trash2 size={12} /> Hapus Agenda</button>
        </div>
      )}
    </li>
  );
}

/* ───────────── 8. Staff Messaging (HoS<->Principal, Principal<->Teacher) ───────────── */
export function StaffMessagePanel({ pw, staffId }: { pw: string; staffId: string }) {
  const [otherId, setOtherId] = useState("");
  const [body, setBody] = useState("");
  const [reload, setReload] = useState(0);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const contactsRes = useAsync(() => listMessagingContacts({ data: { password: pw, staffId } }), [pw, staffId]);
  const contacts: Row[] = contactsRes.data && contactsRes.data.ok ? contactsRes.data.contacts : [];

  const convoRes = useAsync(
    () => (otherId ? listStaffConversation({ data: { password: pw, staffId, otherId } }) : Promise.resolve(null)),
    [pw, staffId, otherId, reload],
  );
  const messages: Row[] = convoRes.data && convoRes.data.ok ? convoRes.data.messages : [];

  async function send() {
    if (!body.trim() || !otherId) return;
    setBusy(true); setErr(null);
    const r = await sendStaffMessage({ data: { password: pw, staffId, otherId, body } });
    setBusy(false);
    if (!r.ok) { setErr(r.error); return; }
    setBody(""); setReload((x) => x + 1);
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-4">
      <div>
        <p className="text-xs uppercase tracking-wide text-muted-foreground font-semibold mb-2">Kontak</p>
        <ul className="space-y-1.5">
          {contacts.map((c) => (
            <li key={c.id}>
              <button
                onClick={() => setOtherId(c.id)}
                className={"w-full text-left rounded-lg px-3 py-2 text-sm border " + (otherId === c.id ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border")}
              >
                {c.full_name}
                <span className="block text-[10px] opacity-70">{roleLabelForMessaging(c.role)}</span>
              </button>
            </li>
          ))}
          {contacts.length === 0 && <Hint>Belum ada kontak yang bisa dihubungi.</Hint>}
        </ul>
      </div>

      <div>
        {!otherId ? (
          <Hint>Pilih kontak di sebelah kiri (atau di atas, kalau di HP) untuk mulai chat.</Hint>
        ) : (
          <div className="flex flex-col gap-3">
            <div className="rounded-2xl bg-card border border-border p-3 max-h-80 overflow-y-auto space-y-2">
              {messages.map((m) => {
                const mine = m.sender_id === staffId;
                return (
                  <div key={m.id} className={"max-w-[80%] rounded-xl px-3 py-2 text-sm " + (mine ? "ml-auto bg-primary text-primary-foreground" : "bg-secondary")}>
                    <p>{m.body}</p>
                    <p className="text-[10px] opacity-70 mt-0.5">{new Date(m.created_at).toLocaleString()}</p>
                  </div>
                );
              })}
              {messages.length === 0 && <Hint>Belum ada pesan. Mulai percakapan.</Hint>}
            </div>
            <div className="flex gap-2">
              <input value={body} onChange={(e) => setBody(e.target.value)} placeholder="Tulis pesan…" className={field} onKeyDown={(e) => { if (e.key === "Enter") send(); }} />
              <button onClick={send} disabled={busy} className={btn}>Kirim</button>
            </div>
            <Err msg={err} />
          </div>
        )}
      </div>
    </div>
  );
}

function roleLabelForMessaging(role: string): string {
  const map: Record<string, string> = {
    hos: "Head of School", vice_hos: "Vice HoS",
    principal: "Principal", vice_principal: "Vice Principal", admin_principal: "Admin Principal",
    teacher_homeroom: "Homeroom Teacher", teacher_subject: "Subject Teacher", teacher_shadow: "Shadow Teacher",
  };
  return map[role] ?? role;
}

/* ───────────── 9. Laporan / Case Reporting ───────────── */
const CASE_STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  open: { label: "Di Principal", cls: "bg-yellow-500/20 text-yellow-700" },
  hos: { label: "Di Head of School", cls: "bg-orange-500/20 text-orange-700" },
  selesai: { label: "Selesai (Arsip)", cls: "bg-emerald-500/15 text-emerald-600" },
};

export function CasePanel({
  access, role, staffId, staffName, division, classes,
}: {
  access: Access; role: "teacher" | "principal" | "hos" | "parent";
  staffId?: string; staffName?: string; division?: string; classes: ClassOpt[];
}) {
  const [reload, setReload] = useState(0);
  const [openId, setOpenId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [classId, setClassId] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const res = useAsync(
    () => access.code
      ? listCasesForParent({ data: { code: access.code } })
      : listCases({ data: { password: access.pw!, role: role as "teacher" | "principal" | "hos", staffId: staffId ?? "", division } }),
    [access.pw, access.code, role, staffId, division, reload],
  );
  const cases: Row[] = res.data && res.data.ok ? res.data.cases : [];

  async function report() {
    if (!title.trim()) return;
    setBusy(true); setErr(null);
    const r = access.code
      ? await reportCaseAsParent({ data: { code: access.code, title, description } })
      : await reportCaseAsTeacher({ data: { password: access.pw!, staffId: staffId ?? "", staffName: staffName ?? "", classId: classId || undefined, division, title, description } });
    setBusy(false);
    if (!r.ok) { setErr(r.error); return; }
    setTitle(""); setDescription(""); setReload((x) => x + 1);
  }

  return (
    <div>
      {(role === "teacher" || role === "parent") && (
        <div className={card + " mb-3 grid gap-2"}>
          <p className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">Lapor Kasus Baru ke Principal</p>
          {role === "teacher" && (
            <select value={classId} onChange={(e) => setClassId(e.target.value)} className={field}>
              <option value="">kelas terkait (opsional)</option>
              {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          )}
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Judul kasus" className={field} />
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="Detail kasus" className={field} />
          <button onClick={report} disabled={busy} className={btn + " justify-self-start"}>Lapor ke Principal</button>
          <Err msg={err} />
        </div>
      )}

      <ul className="space-y-2">
        {cases.map((c) => (
          <CaseRow
            key={c.id} kase={c} access={access} role={role} staffId={staffId} staffName={staffName}
            open={openId === c.id} onToggle={() => setOpenId(openId === c.id ? null : c.id)}
            onChanged={() => setReload((x) => x + 1)}
          />
        ))}
        {cases.length === 0 && <Hint>Belum ada kasus.</Hint>}
      </ul>
    </div>
  );
}

function CaseRow({ kase, access, role, staffId, staffName, open, onToggle, onChanged }: {
  kase: Row; access: Access; role: "teacher" | "principal" | "hos" | "parent"; staffId?: string; staffName?: string;
  open: boolean; onToggle: () => void; onChanged: () => void;
}) {
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [showInvite, setShowInvite] = useState(false);
  const [extName, setExtName] = useState("");
  const [extContact, setExtContact] = useState("");

  const timelineRes = useAsync(
    () => open
      ? (access.code ? listCaseTimelineForParent({ data: { code: access.code, caseId: kase.id } }) : listCaseTimeline({ data: { password: access.pw!, caseId: kase.id } }))
      : Promise.resolve(null),
    [open, access.pw, access.code, kase.id],
  );
  const timeline: Row[] = timelineRes.data && timelineRes.data.ok ? timelineRes.data.entries : [];

  const participantsRes = useAsync(
    () => (open && !access.code ? listCaseParticipants({ data: { password: access.pw!, caseId: kase.id } }) : Promise.resolve(null)),
    [open, access.pw, access.code, kase.id],
  );
  const participants: Row[] = participantsRes.data && participantsRes.data.ok ? participantsRes.data.participants : [];

  const badge = CASE_STATUS_LABEL[kase.status] ?? CASE_STATUS_LABEL.open;
  const isOwner = (role === "principal" && kase.status === "open") || (role === "hos" && kase.status === "hos");

  async function sendComment() {
    if (!comment.trim()) return;
    setBusy(true); setErr(null);
    const r = access.code
      ? await addCaseCommentAsParent({ data: { code: access.code, caseId: kase.id, body: comment } })
      : await addCaseComment({ data: { password: access.pw!, caseId: kase.id, authorName: staffName ?? "", authorRole: role, body: comment } });
    setBusy(false);
    if (!r.ok) { setErr(r.error); return; }
    setComment(""); onChanged();
  }
  async function escalate() {
    if (!access.pw) return;
    const r = await escalateCaseToHos({ data: { password: access.pw, caseId: kase.id, actorName: staffName ?? "" } });
    if (!r.ok) { setErr(r.error); return; }
    onChanged();
  }
  async function close() {
    if (!access.pw) return;
    const r = await closeCase({ data: { password: access.pw, caseId: kase.id, actorName: staffName ?? "", actorRole: role as "principal" | "hos" } });
    if (!r.ok) { setErr(r.error); return; }
    onChanged();
  }
  async function reopen() {
    if (!access.pw) return;
    const r = await reopenCase({ data: { password: access.pw, caseId: kase.id, actorName: staffName ?? "", actorRole: role as "principal" | "hos" } });
    if (!r.ok) { setErr(r.error); return; }
    onChanged();
  }
  async function inviteExternal() {
    if (!access.pw || !extName.trim()) return;
    await addCaseParticipant({
      data: { password: access.pw, caseId: kase.id, invitedBy: staffId ?? "", invitedByName: staffName ?? "", participantType: "external", externalName: extName, externalContact: extContact },
    });
    setExtName(""); setExtContact(""); setShowInvite(false); onChanged();
  }

  return (
    <li className="rounded-xl bg-card border border-border p-3">
      <button onClick={onToggle} className="w-full text-left">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-semibold">{kase.title}</p>
          <span className={"shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase " + badge.cls}>{badge.label}</span>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">
          {kase.school_students?.full_name ?? kase.school_classes?.name ?? ""}
        </p>
      </button>
      {open && (
        <div className="mt-3 pt-3 border-t border-border space-y-3">
          {kase.description && <p className="text-sm whitespace-pre-wrap">{kase.description}</p>}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground font-semibold mb-1.5">Riwayat Timeline</p>
              <ul className="space-y-1.5 max-h-64 overflow-y-auto">
                {timeline.map((t) => (
                  <li key={t.id} className={"text-xs rounded-lg p-2 " + (t.entry_type === "system" ? "bg-secondary/40 text-muted-foreground italic" : "bg-secondary/60")}>
                    <span className="font-semibold not-italic">{t.author_name}</span>{t.author_role ? " (" + t.author_role + ")" : ""}: {t.body}
                    <span className="block text-[10px] opacity-60 mt-0.5">{new Date(t.created_at).toLocaleString()}</span>
                  </li>
                ))}
                {timeline.length === 0 && <Hint>Belum ada riwayat.</Hint>}
              </ul>
            </div>

            <div className="grid gap-2 content-start">
              {kase.status !== "selesai" && (
                <>
                  <textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={2} placeholder="Tambahkan pendapat/komentar…" className={field} />
                  <button onClick={sendComment} disabled={busy} className={btn + " justify-self-start"}>Kirim Komentar</button>
                </>
              )}

              {!access.code && (
                <div className="flex gap-2 flex-wrap pt-1">
                  {role === "principal" && kase.status === "open" && (
                    <button onClick={escalate} className="rounded-lg bg-orange-600 text-white px-3 py-1.5 text-xs font-semibold">Teruskan ke HoS</button>
                  )}
                  {isOwner && (
                    <button onClick={close} className="rounded-lg bg-emerald-600 text-white px-3 py-1.5 text-xs font-semibold">Tandai Selesai</button>
                  )}
                  {kase.status === "selesai" && (role === "principal" || role === "hos") && (
                    <button onClick={reopen} className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold">Buka Kembali</button>
                  )}
                  {role === "principal" && (
                    <button onClick={() => setShowInvite((v) => !v)} className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold">+ Undang Pihak Lain</button>
                  )}
                </div>
              )}
              <Err msg={err} />

              {showInvite && (
                <div className="flex gap-2 flex-wrap mt-1">
                  <input value={extName} onChange={(e) => setExtName(e.target.value)} placeholder="Nama (staff/parent lain/eksternal)" className="rounded-lg bg-background border border-border px-2 py-1.5 text-sm" />
                  <input value={extContact} onChange={(e) => setExtContact(e.target.value)} placeholder="Kontak" className="rounded-lg bg-background border border-border px-2 py-1.5 text-sm" />
                  <button onClick={inviteExternal} className="rounded-lg bg-primary text-primary-foreground px-3 py-1.5 text-xs font-semibold">Undang</button>
                </div>
              )}

              {participants.length > 0 && (
                <div className="mt-1">
                  <p className="text-[11px] text-muted-foreground uppercase tracking-wide font-semibold mb-1">Pihak Terlibat</p>
                  <p className="text-xs">{participants.map((p) => p.external_name ?? p.school_staff?.full_name ?? p.school_guardians?.full_name).join(", ")}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </li>
  );
}
