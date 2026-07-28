// UI panels for the 6 academic modules of the School Dashboard.
// Pure presentation + calls into src/lib/school-academic.functions.ts.
// Style matches the existing /school tabs (rounded-2xl cards, pill tabs).
import { useEffect, useState } from "react";
import { Trash2, Save, Sparkles, Plus, Check, X, BarChart3 } from "lucide-react";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell } from "recharts";
import {
  listCalendarEvents, saveCalendarEvent, deleteCalendarEvent,
  listTimetable, saveTimetableSlot, deleteTimetableSlot,
  listLessonPlans, saveLessonPlan, deleteLessonPlan,
  listProjects, saveProject, reviewProject, listProjectReviews,
  listAssessments, saveAssessment, deleteAssessment, draftAssessmentNote,
  listAttendance, saveAttendance,
} from "@/lib/school-academic.functions";
import { listSchoolStudents } from "@/lib/school.functions";

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

  return (
    <div className={compact ? "max-w-md" : undefined}>
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
      <div className="flex items-center justify-between mb-2">
        <button onClick={() => shift(-1)} className="rounded-lg border border-border px-2 py-1 text-xs">‹</button>
        <p className={compact ? "text-xs font-semibold" : "text-sm font-semibold"}>{MONTHS[cursor.m]} {cursor.y}</p>
        <button onClick={() => shift(1)} className="rounded-lg border border-border px-2 py-1 text-xs">›</button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-[10px] uppercase text-muted-foreground mb-1">
        {WEEKDAYS.map((d) => <div key={d}>{d}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-1">
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
                (compact ? "aspect-square rounded-md text-[10px] " : "aspect-square rounded-lg text-xs ") +
                "flex flex-col items-center justify-center gap-0.5 border " +
                (selected === k ? "border-primary bg-primary/15 " : isToday ? "border-primary/60 " : "border-transparent ") +
                (dayEvents.length ? "bg-secondary font-semibold" : "text-muted-foreground")
              }
            >
              {d}
              {dayEvents.length > 0 && <span className="w-1.5 h-1.5 rounded-full bg-primary" />}
            </button>
          );
        })}
      </div>

      <div className="mt-3 border-t border-border pt-3">
        {selected ? (
          <ul className="space-y-2">
            {selectedEvents.map((e) => {
              const t = EVENT_TYPES.find((x) => x.v === e.event_type) ?? EVENT_TYPES[2];
              const isOwn = !!staffId && e.created_by === staffId;
              return (
                <li key={e.id} className="rounded-xl bg-background border border-border p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold">{e.title}</p>
                    <span className={"shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase " + t.cls}>{t.label}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {new Date(e.event_date).toLocaleDateString()}{e.school_staff?.full_name ? " · dibuat oleh " + e.school_staff.full_name : ""}
                  </p>
                  {e.description && <p className="text-sm mt-1 whitespace-pre-wrap">{e.description}</p>}
                  {canEdit && isOwn && <button onClick={() => onRemove(e.id)} className="mt-2 text-xs text-destructive flex items-center gap-1"><Trash2 size={12} /> Hapus</button>}
                </li>
              );
            })}
          </ul>
        ) : (
          <Hint>{events.length === 0 ? "Belum ada event di kalender." : "Pilih tanggal bertanda untuk melihat detail event."}</Hint>
        )}
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
  if (p.status === "ditolak" && notes.startsWith(REVISI_TAG)) return { label: "Minta Revisi", cls: "bg-blue-500/15 text-blue-600" };
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
  const [classId, setClassId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const res = useAsync(() => listProjects({ data: { password: pw } }), [pw, reload]);
  const all: Row[] = res.data && res.data.ok ? res.data.projects : [];
  const pendingStatus = reviewerRole === "principal" ? "diajukan_principal" : "diajukan_hos";
  const pending = all.filter((p) => p.status === pendingStatus);

  async function submit(asDraft: boolean) {
    if (!title.trim() || !classId) return;
    setBusy(true); setErr(null);
    const r = await saveProject({ data: { password: pw, classId, teacherId: staffId || undefined, title, description, submit: !asDraft } });
    setBusy(false);
    if (!r.ok) { setErr(r.error); return; }
    setTitle(""); setDescription(""); setReload((x) => x + 1);
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
          <select value={classId} onChange={(e) => setClassId(e.target.value)} className={field}>
            <option value="">pilih kelas</option>
            {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Judul project / surat resmi" className={field} />
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} placeholder="Isi / deskripsi" className={field} />
          <div className="flex gap-2">
            <button onClick={() => submit(true)} disabled={busy} className="rounded-lg border border-border px-3 py-1.5 text-sm font-semibold disabled:opacity-50">Simpan Draft</button>
            <button onClick={() => submit(false)} disabled={busy} className={btn}><Save size={13} /> Ajukan ke Principal</button>
          </div>
          <Err msg={err} />
        </div>
      )}

      <ul className="space-y-2">
        {(view === "pending" ? pending : all).map((p) => (
          <ProjectRow
            key={p.id} project={p} pw={pw}
            reviewerRole={view === "pending" ? reviewerRole : null}
            reviewerName={reviewerName}
            onChanged={() => setReload((x) => x + 1)}
          />
        ))}
        {(view === "pending" ? pending : all).length === 0 && (
          <Hint>{view === "pending" ? "Tidak ada project yang menunggu approval." : "Belum ada project."}</Hint>
        )}
      </ul>
    </div>
  );
}

function ProjectRow({
  project, pw, reviewerRole, reviewerName, onChanged,
}: {
  project: Row; pw: string; reviewerRole: "principal" | "hos" | null; reviewerName?: string; onChanged: () => void;
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
        </p>
      </button>
      {open && (
        <div className="mt-3 pt-3 border-t border-border space-y-3">
          {project.description && <p className="text-sm whitespace-pre-wrap">{project.description}</p>}
          {project.last_review_notes && (
            <p className="text-xs rounded-lg bg-secondary/50 p-2"><span className="text-muted-foreground">Catatan terakhir: </span>{project.last_review_notes}</p>
          )}
          {reviews.length > 0 && (
            <ul className="space-y-1">
              {reviews.map((r) => (
                <li key={r.id} className="text-[11px] text-muted-foreground">
                  {new Date(r.reviewed_at).toLocaleDateString()} - {r.reviewer_role} - {r.decision}{r.notes ? ": " + r.notes : ""}
                </li>
              ))}
            </ul>
          )}
          {reviewerRole && (
            <div className="grid gap-2">
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
