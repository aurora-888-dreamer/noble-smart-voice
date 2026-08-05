// UI panels for the 6 academic modules of the School Dashboard.
// Pure presentation + calls into src/lib/school-academic.functions.ts.
// Style matches the existing /school tabs (rounded-2xl cards, pill tabs).
import { usePreview, PreviewButton } from "@/lib/preview-context";
import { useEffect, useRef, useState } from "react";
import { Trash2, Save, Sparkles, Plus, Check, X, BarChart3, Pencil, Upload } from "lucide-react";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell } from "recharts";
import {
  listCalendarEvents, saveCalendarEvent, deleteCalendarEvent, bulkImportCalendarEvents,
  listTimetable, saveTimetableSlot, deleteTimetableSlot, bulkImportTimetable,
  listLessonPlans, saveLessonPlan, deleteLessonPlan,
  listProjects, saveProject, reviewProject, listProjectReviews,
  listAssessments, saveAssessment, deleteAssessment, draftAssessmentNote,
  listCompetencies, saveCompetency, deleteCompetency,
  listAttendance, saveAttendance, getAttendanceDayInfo, setAttendanceDayMandatory, listAttendanceDayFlags,
} from "@/lib/school-academic.functions";
import {
  listAgendas, saveAgenda, deleteAgenda, addAgendaPic, removeAgendaPic,
  submitAgendaForApproval, reviewAgenda, startAgendaExecution, closeAgenda,
  listAgendaTimeline, addAgendaComment,
} from "@/lib/school-agenda.functions";
import { listMessagingContacts, listStaffConversation, sendStaffMessage, listUnreadStaffSenderIds } from "@/lib/school-staff-messages.functions";
import {
  reportCaseAsTeacher, reportCaseAsParent, reportCaseAsPrincipal, reportCaseAsHos, listCases, listCasesForParent,
  listCaseTimeline, listCaseTimelineForParent, addCaseComment, addCaseCommentAsParent,
  listCaseParticipants, addCaseParticipant, escalateCaseToHos, closeCase, reopenCase,
} from "@/lib/school-case.functions";
import { listEvaluations, saveEvaluation, deleteEvaluation } from "@/lib/school-evaluation.functions";
import { listRelayThreads, startRelayThread, replyToRelayThread, deleteRelayThread } from "@/lib/nsv-relay.functions";
import { listExternalLinks, saveExternalLink, deleteExternalLink } from "@/lib/school-external-links.functions";
import {
  listAssessmentDomains, saveAssessmentDomain, deleteAssessmentDomain,
  listAssessmentIndicators, saveAssessmentIndicator, deleteAssessmentIndicator,
  listAssessmentRecords, saveAssessmentRecord, deleteAssessmentRecord,
  listAssessmentReports, generateAssessmentReport, reviewAssessmentReport, listAssessmentReportsForCode,
  listCharacters, saveCharacter, deleteCharacter, listCharacterRecords, draftCharacterNarrationBatch, saveCharacterRecordsBatch,
  listDailyDomainRecords, saveDailyDomainRecordsBatch,
} from "@/lib/school-assessment-v2.functions";
import { listSchoolStudents, listSchoolStaff } from "@/lib/school.functions";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>;
export type ClassOpt = { id: string; name: string; division?: string };

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
  useEffect(() => {
    if (classes.length === 1 && value !== classes[0].id) onChange(classes[0].id);
  }, [classes, value, onChange]);
  if (classes.length === 1) {
    return <p className="text-sm font-semibold mb-3">Kelas: {classes[0].name}</p>;
  }
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className={field + " mb-3"}>
      <option value="">{allLabel}</option>
      {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
    </select>
  );
}

/* ───────────── 1. Academic calendar ───────────── */
const EVENT_TYPES = [
  { v: "libur", label: "Libur", cls: "bg-red-500/15 text-red-600" },
  { v: "ujian", label: "Ujian", cls: "bg-slate-500/15 text-slate-600" },
  { v: "acara", label: "Acara", cls: "bg-slate-500/15 text-slate-600" },
];

const CALENDAR_DIVISIONS = [
  { id: "kindergarten", label: "Preschool" },
  { id: "primary", label: "Primary" },
  { id: "secondary", label: "Secondary" },
  { id: "ib", label: "IB" },
];

// Color legend: Holiday always red (overrides division); School Wide = white/
// neutral; each Unit gets its own color so a mixed HoS view can tell them
// apart at a glance.
const DIVISION_STYLE: Record<string, { bg: string; text: string; dot: string; label: string }> = {
  kindergarten: { bg: "bg-yellow-100", text: "text-yellow-800", dot: "bg-yellow-400", label: "Preschool" },
  primary: { bg: "bg-blue-100", text: "text-blue-800", dot: "bg-blue-500", label: "Primary" },
  secondary: { bg: "bg-orange-100", text: "text-orange-800", dot: "bg-orange-500", label: "Secondary" },
  ib: { bg: "bg-purple-100", text: "text-purple-800", dot: "bg-purple-500", label: "IB" },
};
const SCHOOL_WIDE_STYLE = { bg: "bg-white border border-border", text: "text-foreground", dot: "bg-foreground/50", label: "School Wide" };
const HOLIDAY_STYLE = { bg: "bg-red-100", text: "text-red-700", dot: "bg-red-500", label: "Holiday" };

function eventStyle(e: Row): { bg: string; text: string; dot: string; label: string } {
  if (e.event_type === "libur") return HOLIDAY_STYLE;
  if (!e.division) return SCHOOL_WIDE_STYLE;
  return DIVISION_STYLE[e.division] ?? SCHOOL_WIDE_STYLE;
}

export function CalendarPanel({ access, classes, canEdit, compact, roleScope, fixedDivision }: {
  access: Access; classes: ClassOpt[]; canEdit: boolean; compact?: boolean;
  roleScope?: "hos" | "principal" | "teacher"; fixedDivision?: string;
}) {
  // Scope selector: School Wide -> Division ("Principal" level) -> Class.
  // HoS picks the Division freely (any of the 4 units); Principal/Teacher
  // have it fixed to their own division. Class list narrows to whichever
  // division is in play once "Class" is chosen.
  const [scopeMode, setScopeMode] = useState<"school" | "division" | "class">("school");
  const [scopeDivision, setScopeDivision] = useState(fixedDivision ?? "");
  const [classId, setClassId] = useState("");
  const [reload, setReload] = useState(0);
  const effectiveDivision = roleScope === "hos" ? scopeDivision : (fixedDivision ?? "");
  const classesInScope = roleScope === "hos" && effectiveDivision ? classes.filter((c) => c.division === effectiveDivision) : classes;
  const isStaffScoped = roleScope === "principal" || roleScope === "teacher";
  const divisionLabel = CALENDAR_DIVISIONS.find((d) => d.id === effectiveDivision)?.label ?? effectiveDivision;
  useEffect(() => {
    if (scopeMode === "class" && classesInScope.length === 1 && classId !== classesInScope[0].id) setClassId(classesInScope[0].id);
  }, [scopeMode, classesInScope, classId]);

  const now = new Date();
  const [cursor, setCursor] = useState({ y: now.getFullYear(), m: now.getMonth() });
  // No form is shown at all until either a date (Add) or an existing event
  // in the month list (Edit) is clicked.
  const [formMode, setFormMode] = useState<"add" | "edit" | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingIsOwn, setEditingIsOwn] = useState(true);
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
    () => listCalendarEvents({
      data: access.code
        ? { code: access.code }
        : scopeMode === "school"
          ? { password: access.pw, schoolWideOnly: true }
          : scopeMode === "division"
            ? { password: access.pw, division: effectiveDivision || undefined, scopeAll: !effectiveDivision }
            : { password: access.pw, classId: classId || undefined, division: effectiveDivision || undefined, scopeAll: !classId && !effectiveDivision },
    }),
    [access.pw, access.code, scopeMode, effectiveDivision, classId, reload],
  );
  const events: Row[] = res.data && res.data.ok ? res.data.events : [];

  function openAddForm(dateStr: string) {
    if (!canEdit) return;
    setEditingId(null); setEditingIsOwn(true); setTitle(""); setDesc(""); setDate(dateStr); setType("acara"); setErr(null); setFormMode("add");
  }
  function openEditForm(e: Row) {
    const isOwn = !!staffId && e.created_by === staffId;
    setEditingId(e.id); setEditingIsOwn(isOwn);
    setTitle(e.title); setDesc(e.description ?? ""); setDate(String(e.event_date).slice(0, 10)); setType(e.event_type);
    setErr(null); setFormMode("edit");
  }
  function closeForm() {
    setFormMode(null); setEditingId(null); setTitle(""); setDesc("");
  }

  async function submitForm() {
    if (!title.trim() || !access.pw) return;
    setBusy(true); setErr(null);
    const useClassId = scopeMode === "class" ? classId : undefined;
    const useDivisionScope = scopeMode === "division" ? effectiveDivision : undefined;
    const r = await saveCalendarEvent({ data: { password: access.pw, id: editingId || undefined, classId: useClassId, divisionScope: useDivisionScope, title, description: desc, eventDate: date, eventType: type, staffId: staffId ?? "" } });
    setBusy(false);
    if (!r.ok) { setErr(r.error); return; }
    closeForm(); setReload((x) => x + 1);
  }
  async function removeEvent() {
    if (!access.pw || !editingId) return;
    const r = await deleteCalendarEvent({ data: { password: access.pw, id: editingId, staffId: staffId ?? "" } });
    if (!r.ok) { setErr(r.error); return; }
    closeForm(); setReload((x) => x + 1);
  }

  // Accepts CSV with either plain or quoted fields (handles commas inside
  // quotes) so exports from Excel/Sheets that quote text fields still parse.
  function parseCsvLine(line: string): string[] {
    const out: string[] = [];
    let cur = ""; let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') { cur += '"'; i++; } else { inQuotes = !inQuotes; }
      } else if (ch === "," && !inQuotes) {
        out.push(cur.trim()); cur = "";
      } else {
        cur += ch;
      }
    }
    out.push(cur.trim());
    return out;
  }

  async function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !access.pw) return;
    setImportMsg(null);
    const name = file.name.toLowerCase();
    if (name.endsWith(".xlsx") || name.endsWith(".xls")) {
      setImportMsg("File Excel (.xlsx/.xls) belum didukung langsung — silakan export/simpan sebagai CSV dulu dari Excel/Google Sheets, lalu upload file .csv itu.");
      if (fileRef.current) fileRef.current.value = "";
      return;
    }
    const text = await file.text();
    const lines = text.split(/\r?\n/).filter((l) => l.trim());
    const headers = parseCsvLine(lines[0] ?? "").map((h) => h.trim().toLowerCase());
    const idx = (key: string) => headers.indexOf(key);
    const rows = lines.slice(1).map((line) => {
      const cols = parseCsvLine(line);
      const className = idx("classname") >= 0 ? cols[idx("classname")] : "";
      const matchedClass = classes.find((c) => c.name.toLowerCase() === (className ?? "").toLowerCase());
      return {
        title: cols[idx("title")] ?? "",
        eventDate: cols[idx("eventdate")] ?? "",
        eventType: idx("eventtype") >= 0 ? cols[idx("eventtype")] : "acara",
        description: idx("description") >= 0 ? cols[idx("description")] : undefined,
        classId: matchedClass?.id,
        division: idx("division") >= 0 ? cols[idx("division")] : undefined,
      };
    });
    const r = await bulkImportCalendarEvents({ data: { password: access.pw, staffId: staffId ?? "", rows } });
    setImportMsg(r.ok ? `${r.added} event berhasil diimport.` : `Gagal: ${r.error}`);
    if (r.ok) setReload((x) => x + 1);
    if (fileRef.current) fileRef.current.value = "";
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
        {!access.code ? (
          <div className="flex flex-wrap gap-1.5 items-center">
            <button onClick={() => setScopeMode("school")} className={"rounded-full px-3 py-1 text-xs font-semibold border " + (scopeMode === "school" ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border")}>School Wide</button>
            <button onClick={() => setScopeMode("division")} className={"rounded-full px-3 py-1 text-xs font-semibold border " + (scopeMode === "division" ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border")}>
              {isStaffScoped ? divisionLabel || "Principal" : "Unit"}
            </button>
            <button onClick={() => setScopeMode("class")} className={"rounded-full px-3 py-1 text-xs font-semibold border " + (scopeMode === "class" ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border")}>Class</button>
            {roleScope === "hos" && (scopeMode === "division" || scopeMode === "class") && (
              <select value={scopeDivision} onChange={(e) => { setScopeDivision(e.target.value); setClassId(""); }} className="rounded-lg bg-background border border-border px-2 py-1 text-xs">
                <option value="">pilih unit</option>
                {CALENDAR_DIVISIONS.map((d) => <option key={d.id} value={d.id}>{d.label}</option>)}
              </select>
            )}
            {scopeMode === "class" && (roleScope !== "hos" || scopeDivision) && (
              <select value={classId} onChange={(e) => setClassId(e.target.value)} className="rounded-lg bg-background border border-border px-2 py-1 text-xs">
                <option value="">{classesInScope.length === 1 ? classesInScope[0].name : "pilih kelas"}</option>
                {classesInScope.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            )}
          </div>
        ) : <span />}
        {canEdit && (
          <>
            <button onClick={() => fileRef.current?.click()} title="Import Agenda Tahunan (CSV)" aria-label="Import Agenda Tahunan" className="shrink-0 rounded-lg border border-border p-2">
              <Upload size={15} />
            </button>
            <input ref={fileRef} type="file" accept=".csv,text/csv,text/plain,application/vnd.ms-excel,text/comma-separated-values,.xlsx,.xls" onChange={handleImportFile} className="hidden" />
          </>
        )}
      </div>
      {importMsg && <p className="text-xs mb-2">{importMsg}</p>}

      <div className="flex flex-wrap gap-2.5 mb-2 text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500 shrink-0" /> Holiday</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-foreground/50 border border-border shrink-0" /> School Wide</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-400 shrink-0" /> Preschool</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" /> Primary</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-orange-500 shrink-0" /> Secondary</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-purple-500 shrink-0" /> IB</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-4 items-start">
        <div>
          <CalendarGrid events={events} cursor={cursor} setCursor={setCursor} onDateClick={openAddForm} compact={compact} />
          {formMode && (
            <div className={card + " mt-3 grid gap-2"}>
              {formMode === "edit" && !editingIsOwn ? (
                <>
                  <p className="text-sm font-semibold">{title}</p>
                  <p className="text-xs text-muted-foreground">{new Date(date).toLocaleDateString()}</p>
                  {desc && <p className="text-sm whitespace-pre-wrap">{desc}</p>}
                  <p className="text-[11px] text-muted-foreground">Ini agenda milik orang lain — hanya bisa dilihat.</p>
                  <button onClick={closeForm} className="rounded-lg border border-border px-3 py-1.5 text-sm justify-self-start">Tutup</button>
                </>
              ) : (
                <>
                  <p className="text-xs text-primary font-semibold">
                    {formMode === "edit" ? "Mengedit event" : `Tambah event — ${new Date(date).toLocaleDateString()}`}
                  </p>
                  <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Judul event" className={field} />
                  <textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={2} placeholder="Deskripsi (opsional)" className={field} />
                  <div className="flex gap-2 flex-wrap">
                    <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="rounded-lg bg-background border border-border px-2 py-1.5 text-sm" />
                    <select value={type} onChange={(e) => setType(e.target.value)} className="rounded-lg bg-background border border-border px-2 py-1.5 text-sm">
                      {EVENT_TYPES.map((t) => <option key={t.v} value={t.v}>{t.label}</option>)}
                    </select>
                    <button onClick={submitForm} disabled={busy} className={btn}><Plus size={13} /> {formMode === "edit" ? "Simpan" : "Tambah"}</button>
                    {formMode === "edit" && <button onClick={removeEvent} className="rounded-lg bg-destructive text-destructive-foreground px-3 py-1.5 text-sm font-semibold">Hapus</button>}
                    <button onClick={closeForm} className="rounded-lg border border-border px-3 py-1.5 text-sm">Batal</button>
                  </div>
                  <Err msg={err} />
                </>
              )}
            </div>
          )}
        </div>

        <MonthEventList events={events} cursor={cursor} onEventClick={openEditForm} />
      </div>
    </div>
  );
}

/** From today through the end of the displayed month (or the whole month,
 * if browsing a different month) — skips days with no events. Click an
 * entry to open it (Edit for your own, view-only for others'). */
function MonthEventList({ events, cursor, onEventClick }: { events: Row[]; cursor: { y: number; m: number }; onEventClick: (e: Row) => void }) {
  const now = new Date();
  const isCurrentMonth = cursor.y === now.getFullYear() && cursor.m === now.getMonth();
  const todayStr = now.toISOString().slice(0, 10);
  const monthPrefix = `${cursor.y}-${String(cursor.m + 1).padStart(2, "0")}`;
  const inMonth = events.filter((e) => String(e.event_date).slice(0, 7) === monthPrefix);
  const filtered = isCurrentMonth ? inMonth.filter((e) => String(e.event_date).slice(0, 10) >= todayStr) : inMonth;
  const byDate = new Map<string, Row[]>();
  for (const e of filtered) {
    const k = String(e.event_date).slice(0, 10);
    byDate.set(k, [...(byDate.get(k) ?? []), e]);
  }
  const sortedDates = [...byDate.keys()].sort();

  return (
    <div className="rounded-2xl bg-card border border-border p-3 space-y-3 max-h-[28rem] overflow-y-auto">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">
        {isCurrentMonth ? `Hari Ini – Akhir ${MONTHS[cursor.m]}` : `${MONTHS[cursor.m]} ${cursor.y}`}
      </p>
      {sortedDates.length === 0 && <Hint>Tidak ada event.</Hint>}
      {sortedDates.map((dateStr) => (
        <div key={dateStr}>
          <p className="text-[10px] text-muted-foreground font-semibold mb-1">
            {new Date(dateStr).toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" })}
          </p>
          <ul className="space-y-1">
            {(byDate.get(dateStr) ?? []).map((e) => {
              const st = eventStyle(e);
              return (
                <li key={e.id}>
                  <button onClick={() => onEventClick(e)} className={"w-full text-left rounded-lg px-2 py-1.5 text-xs flex items-center gap-1.5 " + st.bg + " " + st.text}>
                    <span className={"w-1.5 h-1.5 rounded-full shrink-0 " + st.dot} />
                    <span className="truncate">{e.title}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}

const MONTHS = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
const WEEKDAYS = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];

/** Visual month grid. Weekends and detected holidays get a red tint; each
 * event shows a dot colored by its Unit (or red for holidays, neutral for
 * School Wide). Clicking a date opens the Add-event form for that date —
 * editing an existing event happens from MonthEventList instead, so an
 * empty calendar never shows a stray form until something is clicked. */
function CalendarGrid({ events, cursor, setCursor, onDateClick, compact }: {
  events: Row[]; cursor: { y: number; m: number }; setCursor: (c: { y: number; m: number }) => void;
  onDateClick: (dateStr: string) => void; compact?: boolean;
}) {
  const byDate = new Map<string, Row[]>();
  for (const e of events) {
    const k = String(e.event_date).slice(0, 10);
    byDate.set(k, [...(byDate.get(k) ?? []), e]);
  }

  const first = new Date(cursor.y, cursor.m, 1);
  const daysInMonth = new Date(cursor.y, cursor.m + 1, 0).getDate();
  const lead = (first.getDay() + 6) % 7; // Monday-first
  const cells: (number | null)[] = [...Array(lead).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  while (cells.length % 7 !== 0) cells.push(null);
  const keyFor = (d: number) => `${cursor.y}-${String(cursor.m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  const shift = (delta: number) => {
    const d = new Date(cursor.y, cursor.m + delta, 1);
    setCursor({ y: d.getFullYear(), m: d.getMonth() });
  };
  const todayKey = new Date().toISOString().slice(0, 10);

  return (
    <div className="rounded-2xl bg-card border border-border p-2 max-w-[300px] mx-auto lg:mx-0">
      <div className="flex items-center justify-between mb-1.5">
        <button onClick={() => shift(-1)} className="rounded-lg border border-border px-1.5 py-0.5 text-xs">‹</button>
        <p className="text-xs font-semibold">{MONTHS[cursor.m]} {cursor.y}</p>
        <button onClick={() => shift(1)} className="rounded-lg border border-border px-1.5 py-0.5 text-xs">›</button>
      </div>
      <div className="grid grid-cols-7 gap-0.5 text-center text-[8px] uppercase text-muted-foreground mb-0.5">
        {WEEKDAYS.map((d, i) => <div key={d} className={i >= 5 ? "text-red-500 font-semibold" : ""}>{d[0]}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-0.5">
        {cells.map((d, i) => {
          if (d === null) return <div key={i} />;
          const k = keyFor(d);
          const dayEvents = byDate.get(k) ?? [];
          const dow = new Date(cursor.y, cursor.m, d).getDay();
          const isWeekend = dow === 0 || dow === 6;
          const isHoliday = dayEvents.some((e) => e.event_type === "libur");
          const isToday = k === todayKey;
          const dotColors = [...new Set(dayEvents.map((e) => eventStyle(e).dot))].slice(0, 4);
          return (
            <button
              key={i}
              onClick={() => onDateClick(k)}
              className={
                "aspect-square rounded text-[9px] flex flex-col items-center justify-center gap-0.5 border " +
                (isToday ? "border-primary " : "border-transparent ") +
                ((isHoliday || isWeekend) ? "bg-red-500/15 text-red-600 font-semibold" : dayEvents.length ? "bg-secondary font-semibold" : "text-muted-foreground")
              }
            >
              {d}
              {dotColors.length > 0 && (
                <span className="flex gap-0.5">
                  {dotColors.map((c, idx) => <span key={idx} className={"w-1 h-1 rounded-full " + c} />)}
                </span>
              )}
            </button>
          );
        })}
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
  const [editingId, setEditingId] = useState<string | null>(null);
  const [day, setDay] = useState(1);
  const [subject, setSubject] = useState("");
  const [start, setStart] = useState("07:30");
  const [end, setEnd] = useState("08:30");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [importMsg, setImportMsg] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const res = useAsync(
    () => listTimetable({ data: access.code ? { code: access.code } : { password: access.pw, classId: classId || undefined } }),
    [access.pw, access.code, classId, reload],
  );
  const slots: Row[] = res.data && res.data.ok ? res.data.slots : [];

  async function add() {
    if (!subject.trim() || !classId || !access.pw) return;
    setBusy(true); setErr(null);
    const r = await saveTimetableSlot({ data: { password: access.pw, id: editingId || undefined, classId, dayOfWeek: day, subject, teacherId: staffId || undefined, startTime: start, endTime: end } });
    setBusy(false);
    if (!r.ok) { setErr(r.error); return; }
    setSubject(""); setEditingId(null); setReload((x) => x + 1);
  }
  function startEdit(s: Row) {
    setEditingId(s.id);
    setDay(s.day_of_week);
    setSubject(s.subject);
    setStart(String(s.start_time).slice(0, 5));
    setEnd(String(s.end_time).slice(0, 5));
  }
  async function remove(id: string) {
    if (!access.pw) return;
    await deleteTimetableSlot({ data: { password: access.pw, id } });
    if (editingId === id) { setEditingId(null); setSubject(""); }
    setReload((x) => x + 1);
  }

  async function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !access.pw) return;
    setImportMsg(null);
    const text = await file.text();
    const lines = text.split(/\r?\n/).filter((l) => l.trim());
    const headers = (lines[0] ?? "").split(",").map((h) => h.trim().toLowerCase());
    const idx = (k: string) => headers.indexOf(k);
    const rows = lines.slice(1).map((line) => {
      const cols = line.split(",").map((c) => c.trim());
      const className = cols[idx("classname")] ?? "";
      const matchedClass = classes.find((c) => c.name.toLowerCase() === className.toLowerCase());
      return {
        classId: matchedClass?.id ?? "",
        dayOfWeek: Number(cols[idx("dayofweek")] ?? 1),
        subject: cols[idx("subject")] ?? "",
        startTime: cols[idx("starttime")] ?? "",
        endTime: cols[idx("endtime")] ?? "",
      };
    });
    const r = await bulkImportTimetable({ data: { password: access.pw, rows } });
    setImportMsg(r.ok ? `${r.added} slot berhasil diimport.` : `Gagal: ${r.error}`);
    if (r.ok) setReload((x) => x + 1);
    if (fileRef.current) fileRef.current.value = "";
  }

  return (
    <div>
      {!access.code && <ClassPicker value={classId} onChange={setClassId} classes={classes} allLabel="pilih kelas" />}
      {canEdit && classId && (
        <div className={card + " mb-3 grid gap-2"}>
          {editingId && <p className="text-xs text-primary font-semibold">Mengedit slot — Simpan untuk update, atau Batal.</p>}
          <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Mata pelajaran" className={field} />
          <div className="flex gap-2 flex-wrap items-center">
            <select value={day} onChange={(e) => setDay(Number(e.target.value))} className="rounded-lg bg-background border border-border px-2 py-1.5 text-sm">
              {DAYS.map((d) => <option key={d.v} value={d.v}>{d.label}</option>)}
            </select>
            <input type="time" value={start} onChange={(e) => setStart(e.target.value)} className="rounded-lg bg-background border border-border px-2 py-1.5 text-sm" />
            <span className="text-xs text-muted-foreground">-</span>
            <input type="time" value={end} onChange={(e) => setEnd(e.target.value)} className="rounded-lg bg-background border border-border px-2 py-1.5 text-sm" />
            <button onClick={add} disabled={busy} className={btn}><Plus size={13} /> {editingId ? "Simpan" : "Tambah Slot"}</button>
            {editingId && <button onClick={() => { setEditingId(null); setSubject(""); }} className="rounded-lg border border-border px-3 py-1.5 text-sm">Batal</button>}
          </div>
          <Err msg={err} />
          <div className="flex items-center gap-2 pt-1 border-t border-border mt-1">
            <button onClick={() => fileRef.current?.click()} className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold">Import Timetable (CSV)</button>
            <input ref={fileRef} type="file" accept=".csv,text/csv,text/plain,application/vnd.ms-excel,text/comma-separated-values" onChange={handleImportFile} className="hidden" />
            <span className="text-[10px] text-muted-foreground">Kolom: className, dayOfWeek (1-5), subject, startTime, endTime</span>
          </div>
          {importMsg && <p className="text-xs">{importMsg}</p>}
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
                    {canEdit && <button onClick={() => startEdit(s)} className="text-muted-foreground shrink-0"><Pencil size={11} /></button>}
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

/** Review-history entries used to show the raw decision word ("approve"),
 * which reads as final even when it was just Principal forwarding to HoS —
 * confusing if HoS later asks for revision. This gives an honest label
 * that reflects whether that specific decision was actually the end of
 * the road, using the project's own requires_hos + current status. */
function reviewDecisionLabel(r: Row, project: Row): string {
  const isRevisi = (r.notes ?? "").startsWith(REVISI_TAG);
  if (r.decision === "reject") return isRevisi ? "Diminta Revisi" : "Ditolak";
  if (r.reviewer_role === "principal") {
    return project.requires_hos
      ? "Disetujui Principal — diteruskan ke Head of School (belum final)"
      : "Disetujui Principal (final)";
  }
  if (r.reviewer_role === "hos") return "Disetujui Head of School (final)";
  return r.decision;
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
    const r = await saveProject({ data: { password: pw, id: editingId || undefined, classId, teacherId: staffId || undefined, submitterRole: reviewerRole === "principal" ? "principal" : "teacher", title, description, submit: !asDraft, requiresHos } });
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

      {canSubmit && (reviewerRole || view === "list") && (
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
            <button onClick={() => submit(true)} disabled={busy || !title.trim() || !classId} className="rounded-lg border border-border px-3 py-1.5 text-sm font-semibold disabled:opacity-50">Simpan Draft</button>
            <button onClick={() => submit(false)} disabled={busy || !title.trim() || !classId} className={btn + " disabled:opacity-50"}>
              <Save size={13} /> {reviewerRole === "principal" ? (editingId ? "Ajukan Ulang ke Head of School" : "Ajukan ke Head of School") : (editingId ? "Ajukan Ulang ke Principal" : "Ajukan ke Principal")}
            </button>
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
  const [localReload, setLocalReload] = useState(0);
  const badge = projectBadge(project);
  const history = useAsync(() => (open ? listProjectReviews({ data: { password: pw, projectId: project.id } }) : Promise.resolve(null)), [open, pw, project.id, localReload]);
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
    setNotes(""); setLocalReload((x) => x + 1); onChanged();
  }

  return (
    <li className="rounded-xl bg-card border border-border p-3">
      <div className="flex items-start justify-between gap-2">
        <button onClick={() => setOpen((v) => !v)} className="flex-1 min-w-0 text-left">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-semibold">{project.title}</p>
            <span className={"shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase " + badge.cls}>{badge.label}</span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            {project.school_classes?.name}{project.school_staff?.full_name ? " - " + project.school_staff.full_name : ""}
            {project.requires_hos === false && <span className="ml-2 text-[10px] uppercase text-muted-foreground">· Final di Principal</span>}
          </p>
        </button>
        <PreviewButton title={project.title} body={<ProjectLetterPreview project={project} pw={pw} badge={badge} />} />
      </div>
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
                      {new Date(r.reviewed_at).toLocaleDateString()} - {reviewDecisionLabel(r, project)}{r.notes ? ": " + r.notes : ""}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {reviewerRole && (
              <div className="grid gap-2 content-start">
                <p className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">Catatan & Keputusan</p>
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Catatan untuk guru (opsional)" className={field} />
                <p className="text-xs">Status: <span className={"rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase " + badge.cls}>{badge.label}</span></p>
                <div className="flex gap-2 flex-wrap">
                  <button onClick={() => decide("approve")} disabled={busy} className="rounded-lg bg-emerald-600 text-white px-3 py-1.5 text-sm font-semibold disabled:opacity-50 flex items-center gap-1">🟢 <Check size={13} /> Approve</button>
                  <button onClick={() => decide("revisi")} disabled={busy} className="rounded-lg bg-amber-500 text-white px-3 py-1.5 text-sm font-semibold disabled:opacity-50">🟡 Minta Revisi</button>
                  <button onClick={() => decide("reject")} disabled={busy} className="rounded-lg bg-red-600 text-white px-3 py-1.5 text-sm font-semibold disabled:opacity-50 flex items-center gap-1">🔴 <X size={13} /> Reject</button>
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

/** Self-contained preview body for Official Letter — fetches its own
 * review history so it's correct whenever opened in the Preview panel. */
function ProjectLetterPreview({ project, pw, badge }: { project: Row; pw: string; badge: { label: string; cls: string } }) {
  const history = useAsync(() => listProjectReviews({ data: { password: pw, projectId: project.id } }), [pw, project.id]);
  const reviews: Row[] = history.data && history.data.ok ? history.data.reviews : [];
  return (
    <div className="space-y-4">
      <div>
        <span className={"rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase " + badge.cls}>{badge.label}</span>
        <p className="text-xs text-muted-foreground mt-1.5">
          {project.school_classes?.name}{project.school_staff?.full_name ? " - " + project.school_staff.full_name : ""}
        </p>
        {project.description && <p className="text-sm mt-2 whitespace-pre-wrap">{project.description}</p>}
      </div>
      {project.last_review_notes && (
        <p className="text-xs rounded-lg bg-secondary/50 p-2"><span className="text-muted-foreground">Catatan terakhir: </span>{project.last_review_notes}</p>
      )}
      <div>
        <p className="text-xs uppercase tracking-wide text-muted-foreground font-semibold mb-1.5">Riwayat Revisi & Review</p>
        <ul className="space-y-1.5">
          {reviews.map((r) => (
            <li key={r.id} className="text-xs rounded-lg bg-secondary/40 p-2">
              {new Date(r.reviewed_at).toLocaleDateString()} - {reviewDecisionLabel(r, project)}{r.notes ? ": " + r.notes : ""}
            </li>
          ))}
          {reviews.length === 0 && <Hint>Belum ada riwayat review.</Hint>}
        </ul>
      </div>
    </div>
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

  const compRes = useAsync(() => (canEdit && access.pw ? listCompetencies({ data: { password: access.pw, subject: subject.trim() || undefined } }) : Promise.resolve(null)), [access.pw, canEdit, subject]);
  const templateCompetencies: Row[] = compRes.data && compRes.data.ok ? compRes.data.competencies : [];
  function loadTemplateCompetencies() {
    if (templateCompetencies.length === 0) return;
    setForms(templateCompetencies.map((c) => ({ competency: c.title, achieved: false, rating: 3 })));
  }

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

          <div className="flex items-center justify-between mt-1">
            <p className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">Checklist Kompetensi</p>
            {templateCompetencies.length > 0 && (
              <button onClick={loadTemplateCompetencies} className="text-xs text-primary underline">Load Competencies ({templateCompetencies.length}) from Principal</button>
            )}
          </div>
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
              {(Array.isArray(a.school_assessment_forms) ? a.school_assessment_forms : a.school_assessment_forms ? [a.school_assessment_forms] : []).map((f: Row) => (
                <li key={f.id} className="text-xs flex items-center gap-2">
                  <span className={f.achieved ? "text-emerald-600" : "text-muted-foreground"}>{f.achieved ? "✓" : "○"}</span>
                  <span className="flex-1">{f.competency}</span>
                  <span className="text-muted-foreground">{f.rating}/5</span>
                </li>
              ))}
            </ul>
            {(Array.isArray(a.school_assessment_notes) ? a.school_assessment_notes : a.school_assessment_notes ? [a.school_assessment_notes] : []).map((n: Row) => n.final_note && (
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
  const flagsRes = useAsync(
    () => (access.pw ? listAttendanceDayFlags({ data: { password: access.pw, classId, from, to } }) : Promise.resolve(null)),
    [access.pw, classId, from, to],
  );
  const nonMandatoryDates = new Set(
    (flagsRes.data && "ok" in flagsRes.data && flagsRes.data.ok ? flagsRes.data.flags : [])
      .filter((f: Row) => f.is_mandatory === false).map((f: Row) => String(f.attendance_date).slice(0, 10)),
  );
  const allRecords: Row[] = res.data && res.data.ok ? res.data.records : [];
  // Days explicitly marked "tidak wajib" (holiday/optional activity) are
  // excluded so monthly/semester/yearly stats aren't skewed by them.
  const records = allRecords.filter((r) => !nonMandatoryDates.has(String(r.date).slice(0, 10)));

  const STATUS_COLORS: Record<string, string> = { hadir: "#10b981", izin: "#3b82f6", sakit: "#f97316", alpha: "#ef4444" };
  const classCounts = STATUSES.map((st) => ({ status: st.label, jumlah: records.filter((r) => r.status === st.v).length }));

  const studentRecords = studentId ? records.filter((r) => r.student_id === studentId) : [];
  const studentCounts = STATUSES.map((st) => ({ status: st.label, jumlah: studentRecords.filter((r) => r.status === st.v).length }));

  if (records.length === 0) return null;

  return (
    <div className={card + " mb-3 grid gap-4"}>
      <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground font-semibold"><BarChart3 size={14} /> Ringkasan Attendance (30 hari terakhir)</div>
      {nonMandatoryDates.size > 0 && <p className="text-[10px] text-muted-foreground">{nonMandatoryDates.size} hari libur/tidak wajib dikecualikan dari perhitungan ini.</p>}
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

  const dayInfoRes = useAsync(
    () => (access.pw && classId && date ? getAttendanceDayInfo({ data: { password: access.pw, classId, date } }) : Promise.resolve(null)),
    [access.pw, classId, date, reload],
  );
  const dayInfo = dayInfoRes.data && "ok" in dayInfoRes.data && dayInfoRes.data.ok ? dayInfoRes.data : null;
  const [dayNote, setDayNote] = useState("");

  async function setMandatory(isMandatory: boolean) {
    if (!access.pw || !classId) return;
    await setAttendanceDayMandatory({ data: { password: access.pw, classId, date, isMandatory, note: dayNote, staffId: staffId ?? "" } });
    setReload((x) => x + 1);
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
      {classId && dayInfo && (dayInfo.isHoliday || dayInfo.eventTitles.length > 0 || dayInfo.explicitMandatory !== null) && (
        <div className="rounded-xl bg-secondary/40 p-3 mb-3 text-xs space-y-2">
          <p>
            {dayInfo.isHoliday ? "📅 Hari ini terdeteksi LIBUR di kalender." : dayInfo.eventTitles.length > 0 ? "📅 Ada activity di kalender hari ini." : "Status hari sudah diset manual."}
            {dayInfo.eventTitles.length > 0 && <span className="block text-muted-foreground mt-0.5">{dayInfo.eventTitles.join(", ")}</span>}
          </p>
          <p className="font-semibold">
            Status saat ini: {dayInfo.explicitMandatory === null ? (dayInfo.isHoliday ? "Belum diset (default: tidak wajib karena libur)" : "Wajib (default)") : dayInfo.explicitMandatory ? "Wajib dihitung" : "Tidak wajib dihitung"}
          </p>
          <div className="flex gap-2 flex-wrap items-center">
            <button onClick={() => setMandatory(true)} className="rounded-full border border-border px-3 py-1 font-semibold">Tandai Wajib</button>
            <button onClick={() => setMandatory(false)} className="rounded-full border border-border px-3 py-1 font-semibold">Tandai Tidak Wajib</button>
            <input value={dayNote} onChange={(e) => setDayNote(e.target.value)} placeholder="Catatan (opsional)" className="rounded-lg bg-background border border-border px-2 py-1 flex-1 min-w-32" />
          </div>
          <p className="text-[10px] text-muted-foreground">Hari yang "Tidak wajib" tidak ikut dihitung di laporan bulanan/semester/tahunan.</p>
        </div>
      )}
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

/* ───────────── 7. Agenda (HoS: school-wide; Principal: division/classes w/ HoS approval; Teacher: own class) ───────────── */
/** Robust fallback for agenda.creator_role — older rows created before this
 * column existed (or before a backfill migration ran) have it NULL/undefined.
 * Infer it from scope_level so review-button gating still works even
 * without running that backfill first. */
function creatorRoleOf(agenda: Row): "hos" | "principal" | "teacher" {
  if (agenda.creator_role) return agenda.creator_role;
  if (agenda.scope_level === "class") return "teacher";
  if (agenda.scope_level === "division") return "principal";
  return "hos";
}

const AGENDA_STATUS: Record<string, { label: string; cls: string }> = {
  draft: { label: "Draft", cls: "bg-muted text-muted-foreground" },
  submitted: { label: "Awaiting HoS Approval", cls: "bg-yellow-500/20 text-yellow-700" },
  revision_requested: { label: "Revision Requested", cls: "bg-blue-500/15 text-blue-600" },
  approved: { label: "Approved", cls: "bg-emerald-500/15 text-emerald-600" },
  rejected: { label: "Rejected", cls: "bg-red-500/15 text-red-600" },
};

export function AgendaPanel({ pw, role, staffId, staffName, division, classes }: {
  pw: string; role: "hos" | "principal" | "teacher"; staffId: string; staffName?: string; division?: string; classes?: ClassOpt[];
}) {
  const [reload, setReload] = useState(0);
  const [open, setOpen] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [purpose, setPurpose] = useState("");
  const [theme, setTheme] = useState("");
  const [startDate, setStartDate] = useState(today());
  const [endDate, setEndDate] = useState(today());
  const [scopeLevel, setScopeLevel] = useState<"school" | "division" | "class">(role === "hos" ? "school" : role === "teacher" ? "class" : "division");
  const [classIds, setClassIds] = useState<string[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const res = useAsync(() => listAgendas({ data: { password: pw, role, staffId, division } }), [pw, role, staffId, division, reload]);
  const agendas: Row[] = res.data && res.data.ok ? res.data.agendas : [];

  const staffRes = useAsync(() => listSchoolStaff({ data: { password: pw } }), [pw]);
  const staffList: Row[] = staffRes.data && "staff" in staffRes.data ? (staffRes.data.staff ?? []) : [];

  function toggleClass(id: string) {
    setClassIds((c) => (c.includes(id) ? c.filter((x) => x !== id) : [...c, id]));
  }

  async function create() {
    if (!title.trim()) return;
    setBusy(true); setErr(null);
    const r = await saveAgenda({
      data: {
        password: pw, staffId, role, title, purpose, theme, startDate, endDate,
        scopeLevel: role === "teacher" ? "class" : scopeLevel, division,
        classIds: role === "teacher" ? (classes?.[0] ? [classes[0].id] : []) : classIds,
      },
    });
    setBusy(false);
    if (!r.ok) { setErr(r.error); return; }
    setTitle(""); setPurpose(""); setTheme(""); setClassIds([]); setReload((x) => x + 1);
  }
  async function remove(id: string) {
    await deleteAgenda({ data: { password: pw, id } });
    setReload((x) => x + 1);
  }

  const [hosView, setHosView] = useState<"approval" | "proposal" | "create">("approval");
  const pendingForHos = agendas.filter((a) => a.approval_status === "submitted");
  const proposalsFromPrincipal = agendas.filter((a) => a.creator_role === "principal");
  const hosOwnAgendas = agendas.filter((a) => a.creator_role === "hos");

  if (role === "hos") {
    return (
      <div>
        <div className="flex gap-2 mb-3 flex-wrap">
          <button onClick={() => setHosView("approval")} className={"rounded-full px-3 py-1 text-xs font-semibold border " + (hosView === "approval" ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border")}>
            Approval List{pendingForHos.length > 0 ? ` (${pendingForHos.length})` : ""}
          </button>
          <button onClick={() => setHosView("proposal")} className={"rounded-full px-3 py-1 text-xs font-semibold border " + (hosView === "proposal" ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border")}>Proposal List</button>
          <button onClick={() => setHosView("create")} className={"rounded-full px-3 py-1 text-xs font-semibold border " + (hosView === "create" ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border")}>Create HoS Agenda</button>
        </div>

        {hosView === "create" && (
          <div className={card + " mb-3 grid gap-2"}>
            <p className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">New School-Wide Agenda</p>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" className={field} />
            <input value={purpose} onChange={(e) => setPurpose(e.target.value)} placeholder="Purpose" className={field} />
            <input value={theme} onChange={(e) => setTheme(e.target.value)} placeholder="Theme" className={field} />
            <div className="flex gap-2 flex-wrap items-center">
              <label className="text-xs text-muted-foreground">Start</label>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="rounded-lg bg-background border border-border px-2 py-1.5 text-sm" />
              <label className="text-xs text-muted-foreground">End</label>
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="rounded-lg bg-background border border-border px-2 py-1.5 text-sm" />
            </div>
            <button onClick={create} disabled={busy || !title.trim()} className={btn + " justify-self-start disabled:opacity-50"}><Plus size={13} /> Create Agenda</button>
            <Err msg={err} />
          </div>
        )}

        <ul className="space-y-2">
          {(hosView === "approval" ? pendingForHos : hosView === "proposal" ? proposalsFromPrincipal : hosOwnAgendas).map((a) => (
            <AgendaRow key={a.id} agenda={a} pw={pw} role={role} staffId={staffId} staffName={staffName ?? ""} staffList={staffList} open={open === a.id} onToggle={() => setOpen(open === a.id ? null : a.id)} onRemove={() => remove(a.id)} onChanged={() => setReload((x) => x + 1)} />
          ))}
          {(hosView === "approval" ? pendingForHos : hosView === "proposal" ? proposalsFromPrincipal : hosOwnAgendas).length === 0 && (
            <Hint>{hosView === "approval" ? "Tidak ada yang menunggu approval." : hosView === "proposal" ? "Belum ada proposal dari Principal." : "Belum ada agenda sekolah yang dibuat HoS."}</Hint>
          )}
        </ul>
      </div>
    );
  }

  return (
    <div>
      <div className={card + " mb-3 grid gap-2"}>
        <p className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">New Agenda</p>
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" className={field} />
        <input value={purpose} onChange={(e) => setPurpose(e.target.value)} placeholder="Purpose" className={field} />
        <input value={theme} onChange={(e) => setTheme(e.target.value)} placeholder="Theme" className={field} />
        <div className="flex gap-2 flex-wrap items-center">
          <label className="text-xs text-muted-foreground">Start</label>
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="rounded-lg bg-background border border-border px-2 py-1.5 text-sm" />
          <label className="text-xs text-muted-foreground">End</label>
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="rounded-lg bg-background border border-border px-2 py-1.5 text-sm" />
        </div>
        {role === "principal" && (
          <div>
            <div className="flex gap-2 mb-2">
              <button onClick={() => setScopeLevel("division")} className={"rounded-full px-3 py-1 text-xs font-semibold border " + (scopeLevel === "division" ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border")}>Whole Division</button>
              <button onClick={() => setScopeLevel("class")} className={"rounded-full px-3 py-1 text-xs font-semibold border " + (scopeLevel === "class" ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border")}>Specific Classes</button>
            </div>
            {scopeLevel === "class" && (
              <div className="flex gap-1.5 flex-wrap">
                {(classes ?? []).map((c) => (
                  <button key={c.id} onClick={() => toggleClass(c.id)} className={"rounded-full px-2.5 py-1 text-xs border " + (classIds.includes(c.id) ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border")}>{c.name}</button>
                ))}
              </div>
            )}
          </div>
        )}
        <button onClick={create} disabled={busy || !title.trim()} className={btn + " justify-self-start disabled:opacity-50"}><Plus size={13} /> Create Agenda</button>
        {(role === "principal" || role === "teacher") && <p className="text-[11px] text-muted-foreground">New agendas start as Draft — use "Forward for Approval" below once ready.</p>}
        <Err msg={err} />
      </div>

      <ul className="space-y-2">
        {agendas.map((a) => (
          <AgendaRow key={a.id} agenda={a} pw={pw} role={role} staffId={staffId} staffName={staffName ?? ""} staffList={staffList} open={open === a.id} onToggle={() => setOpen(open === a.id ? null : a.id)} onRemove={() => remove(a.id)} onChanged={() => setReload((x) => x + 1)} />
        ))}
        {agendas.length === 0 && <Hint>No agendas yet.</Hint>}
      </ul>
    </div>
  );
}

function AgendaRow({ agenda, pw, role, staffId, staffName, staffList, open, onToggle, onRemove, onChanged }: {
  agenda: Row; pw: string; role: "hos" | "principal" | "teacher"; staffId: string; staffName: string; staffList: Row[];
  open: boolean; onToggle: () => void; onRemove: () => void; onChanged: () => void;
}) {
  const [picStaffId, setPicStaffId] = useState("");
  const [extName, setExtName] = useState("");
  const [extContact, setExtContact] = useState("");
  const [addingExternal, setAddingExternal] = useState(false);
  const [reviewNotes, setReviewNotes] = useState("");
  const [comment, setComment] = useState("");
  const [finalReport, setFinalReport] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [localReload, setLocalReload] = useState(0);
  const picList: Row[] = agenda.school_agenda_pic ?? [];
  const badge = AGENDA_STATUS[agenda.approval_status] ?? AGENDA_STATUS.draft;
  const classNames: string = (agenda.school_agenda_classes ?? []).map((c: Row) => c.school_classes?.name).filter(Boolean).join(", ");

  const timelineRes = useAsync(() => (open ? listAgendaTimeline({ data: { password: pw, agendaId: agenda.id } }) : Promise.resolve(null)), [open, pw, agenda.id, localReload]);
  const timeline: Row[] = timelineRes.data && timelineRes.data.ok ? timelineRes.data.entries : [];

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
  async function submitForApproval() {
    setBusy(true); setErr(null);
    const r = await submitAgendaForApproval({ data: { password: pw, staffId, agendaId: agenda.id, actorName: staffName } });
    setBusy(false);
    if (!r.ok) { setErr(r.error); return; }
    setLocalReload((x) => x + 1); onChanged();
  }
  async function review(decision: "approve" | "reject" | "revise") {
    setBusy(true); setErr(null);
    const r = await reviewAgenda({ data: { password: pw, staffId, agendaId: agenda.id, actorName: staffName, decision, notes: reviewNotes } });
    setBusy(false);
    if (!r.ok) { setErr(r.error); return; }
    setReviewNotes(""); setLocalReload((x) => x + 1); onChanged();
  }
  async function startExecution() {
    const r = await startAgendaExecution({ data: { password: pw, agendaId: agenda.id, actorName: staffName } });
    if (!r.ok) { setErr(r.error); return; }
    setLocalReload((x) => x + 1); onChanged();
  }
  async function sendComment() {
    if (!comment.trim()) return;
    await addAgendaComment({ data: { password: pw, agendaId: agenda.id, authorName: staffName, authorRole: role, body: comment } });
    setComment(""); setLocalReload((x) => x + 1); onChanged();
  }
  async function close() {
    setBusy(true); setErr(null);
    const r = await closeAgenda({ data: { password: pw, agendaId: agenda.id, actorName: staffName, finalReport } });
    setBusy(false);
    if (!r.ok) { setErr(r.error); return; }
    setFinalReport(""); onChanged();
  }

  return (
    <li className="rounded-xl bg-card border border-border p-3">
      <div className="flex items-start justify-between gap-2">
        <button onClick={onToggle} className="flex-1 min-w-0 text-left">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-semibold">{agenda.title}</p>
            <span className={"shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase " + badge.cls}>{badge.label}</span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            {agenda.scope_level === "school" ? "Whole School" : agenda.scope_level === "division" ? "Whole Division" : classNames || "Class"}
            {" · "}{agenda.theme ? agenda.theme + " · " : ""}
            {agenda.start_date ? new Date(agenda.start_date).toLocaleDateString() : ""}{agenda.end_date ? " – " + new Date(agenda.end_date).toLocaleDateString() : ""}
            {agenda.execution_status === "closed" ? " · Closed" : agenda.execution_status === "in_progress" ? " · In Progress" : ""}
          </p>
          {picList.length > 0 && (
            <p className="text-[11px] text-muted-foreground mt-1">
              PIC: {picList.map((p) => p.is_external ? p.external_name : p.school_staff?.full_name).join(", ")}
            </p>
          )}
        </button>
        <PreviewButton title={agenda.title} body={<AgendaTimelinePreview agenda={agenda} pw={pw} badge={badge} classNames={classNames} picList={picList} role={role} staffId={staffId} staffName={staffName} onChanged={onChanged} />} />
      </div>
      {open && (
        <div className="mt-3 pt-3 border-t border-border space-y-3">
          {agenda.purpose && <p className="text-sm"><span className="text-muted-foreground">Purpose: </span>{agenda.purpose}</p>}
          {agenda.last_review_notes && <p className="text-xs rounded-lg bg-secondary/50 p-2"><span className="text-muted-foreground">HoS notes: </span>{agenda.last_review_notes}</p>}
          {agenda.final_report && <p className="text-xs rounded-lg bg-emerald-500/10 p-2"><span className="text-muted-foreground">Final Report: </span>{agenda.final_report}</p>}

          {(role === "principal" || role === "teacher") && agenda.approval_status === "draft" && (
            <>
              <button onClick={submitForApproval} disabled={busy || !agenda.purpose?.trim()} className="rounded-lg bg-primary text-primary-foreground px-3 py-1.5 text-xs font-semibold disabled:opacity-50">
                {role === "teacher" ? "Forward to Principal for Approval" : "Forward to Head of School for Approval"}
              </button>
              {!agenda.purpose?.trim() && <p className="text-[11px] text-muted-foreground mt-1">Isi Purpose dulu sebelum bisa di-forward.</p>}
            </>
          )}
          {(role === "principal" || role === "teacher") && agenda.approval_status === "revision_requested" && (
            <p className="text-xs text-blue-600">{role === "teacher" ? "Principal" : "Head of School"} asked for revision — edit details above and forward again once ready.</p>
          )}

          {role === "principal" && creatorRoleOf(agenda) === "teacher" && agenda.approval_status === "submitted" && !agenda.forwarded_to_hos && (
            <div className="grid gap-2">
              <p className="text-xs">Status: <span className={"rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase " + badge.cls}>{badge.label}</span></p>
              <textarea value={reviewNotes} onChange={(e) => setReviewNotes(e.target.value)} rows={2} placeholder="Notes for Teacher (optional)" className={field} />
              <div className="flex gap-2 flex-wrap">
                <button onClick={() => review("approve")} disabled={busy} className="rounded-lg bg-emerald-600 text-white px-3 py-1.5 text-xs font-semibold">🟢 Approve</button>
                <button onClick={() => review("forward")} disabled={busy} className="rounded-lg bg-emerald-700 text-white px-3 py-1.5 text-xs font-semibold">🟢 Approve & Forward to HoS</button>
                <button onClick={() => review("revise")} disabled={busy} className="rounded-lg bg-amber-500 text-white px-3 py-1.5 text-xs font-semibold">🟡 Ask to Revise</button>
                <button onClick={() => review("reject")} disabled={busy} className="rounded-lg bg-red-600 text-white px-3 py-1.5 text-xs font-semibold">🔴 Reject</button>
              </div>
            </div>
          )}
          {role === "hos" && (creatorRoleOf(agenda) === "principal" || agenda.forwarded_to_hos) && agenda.approval_status === "submitted" && (
            <div className="grid gap-2">
              <p className="text-xs">Status: <span className={"rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase " + badge.cls}>{badge.label}</span></p>
              <textarea value={reviewNotes} onChange={(e) => setReviewNotes(e.target.value)} rows={2} placeholder={"Notes for " + (agenda.creator_role === "teacher" ? "Principal" : "Principal") + " (optional)"} className={field} />
              <div className="flex gap-2 flex-wrap">
                <button onClick={() => review("approve")} disabled={busy} className="rounded-lg bg-emerald-600 text-white px-3 py-1.5 text-xs font-semibold">🟢 Approve</button>
                <button onClick={() => review("revise")} disabled={busy} className="rounded-lg bg-amber-500 text-white px-3 py-1.5 text-xs font-semibold">🟡 Ask to Revise</button>
                <button onClick={() => review("reject")} disabled={busy} className="rounded-lg bg-red-600 text-white px-3 py-1.5 text-xs font-semibold">🔴 Reject</button>
              </div>
            </div>
          )}

          {agenda.approval_status !== "draft" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground font-semibold mb-1.5">Timeline</p>
                <ul className="space-y-1.5 max-h-56 overflow-y-auto">
                  {timeline.map((t) => (
                    <li key={t.id} className={"text-xs rounded-lg p-2 " + (t.entry_type === "system" ? "bg-secondary/40 text-muted-foreground italic" : "bg-secondary/60")}>
                      <span className="font-semibold not-italic">{t.author_name}</span>{t.author_role ? " (" + t.author_role + ")" : ""}: {t.body}
                      <span className="block text-[10px] opacity-60 mt-0.5">{new Date(t.created_at).toLocaleString()}</span>
                    </li>
                  ))}
                  {timeline.length === 0 && <Hint>No timeline entries yet.</Hint>}
                </ul>
              </div>
              <div className="grid gap-2 content-start">
                <textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={2} placeholder="Add a timeline note…" className={field} />
                <button onClick={sendComment} className="rounded-lg bg-primary text-primary-foreground px-3 py-1.5 text-xs font-semibold justify-self-start">Add Note</button>
                {role === "principal" && agenda.approval_status === "approved" && agenda.execution_status === "in_progress" && (
                  <div className="grid gap-2 pt-2 border-t border-border">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">Close with Evaluation / Final Report</p>
                    <textarea value={finalReport} onChange={(e) => setFinalReport(e.target.value)} rows={3} placeholder="Evaluation summary — sent to HoS as the Final Report" className={field} />
                    <button onClick={close} disabled={busy} className="rounded-lg bg-emerald-600 text-white px-3 py-1.5 text-xs font-semibold justify-self-start">Close & Send Final Report</button>
                  </div>
                )}
              </div>
            </div>
          )}

          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground font-semibold mb-1.5">Invite Team (PIC)</p>
            <ul className="space-y-1.5 mb-2">
              {picList.map((p) => (
                <li key={p.id} className="flex items-center justify-between text-sm rounded-lg bg-secondary/40 px-2 py-1.5">
                  <span>{p.is_external ? p.external_name + " (external)" : p.school_staff?.full_name}</span>
                  <button onClick={() => removePic(p.id)} className="text-destructive"><Trash2 size={13} /></button>
                </li>
              ))}
              {picList.length === 0 && <Hint>No one invited yet.</Hint>}
            </ul>
            <div className="flex gap-2 flex-wrap">
              <select value={picStaffId} onChange={(e) => setPicStaffId(e.target.value)} className="rounded-lg bg-background border border-border px-2 py-1.5 text-sm">
                <option value="">pick internal staff</option>
                {staffList.map((s) => <option key={s.id} value={s.id}>{s.full_name}</option>)}
              </select>
              <button onClick={addInternal} disabled={!picStaffId} className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold disabled:opacity-40">Add Internal PIC</button>
              <button onClick={() => setAddingExternal((v) => !v)} className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold">+ External PIC</button>
            </div>
            {addingExternal && (
              <div className="mt-2 flex gap-2 flex-wrap">
                <ExternalLinkPicker pw={pw} onPick={(l) => { setExtName(l.name); setExtContact(l.contact_info ?? ""); }} />
                <input value={extName} onChange={(e) => setExtName(e.target.value)} placeholder="External PIC name" className="rounded-lg bg-background border border-border px-2 py-1.5 text-sm" />
                <input value={extContact} onChange={(e) => setExtContact(e.target.value)} placeholder="Contact (optional)" className="rounded-lg bg-background border border-border px-2 py-1.5 text-sm" />
                <button onClick={addExternal} className="rounded-lg bg-primary text-primary-foreground px-3 py-1.5 text-xs font-semibold">Add</button>
              </div>
            )}
            <p className="text-[11px] text-muted-foreground mt-1.5">Staff internal yang diundang otomatis lihat Agenda ini di dashboard mereka sendiri.</p>
          </div>

          {agenda.approval_status === "approved" && agenda.execution_status === "not_started" && role !== "hos" && (
            <button onClick={startExecution} className="rounded-lg bg-primary text-primary-foreground px-3 py-1.5 text-xs font-semibold">Start Execution</button>
          )}

          <Err msg={err} />
          <button onClick={onRemove} className="text-xs text-destructive flex items-center gap-1"><Trash2 size={12} /> Delete Agenda</button>
        </div>
      )}
    </li>
  );
}

/** Self-contained preview body for the Agenda — fetches its own timeline so
 * it renders correctly whenever it's opened in the Preview panel. */
function AgendaTimelinePreview({ agenda, pw, badge, classNames, picList, role, staffId, staffName, onChanged }: {
  agenda: Row; pw: string; badge: { label: string; cls: string }; classNames: string; picList: Row[];
  role: "hos" | "principal" | "teacher"; staffId: string; staffName: string; onChanged: () => void;
}) {
  const [reload, setReload] = useState(0);
  const [note, setNote] = useState("");
  const [reviewNotes, setReviewNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const timelineRes = useAsync(() => listAgendaTimeline({ data: { password: pw, agendaId: agenda.id } }), [pw, agenda.id, reload]);
  const timeline: Row[] = timelineRes.data && timelineRes.data.ok ? timelineRes.data.entries : [];

  async function addNote() {
    if (!note.trim()) return;
    setBusy(true);
    await addAgendaComment({ data: { password: pw, agendaId: agenda.id, authorName: staffName, authorRole: role, body: note } });
    setBusy(false);
    setNote(""); setReload((x) => x + 1); onChanged();
  }
  async function reForward() {
    setBusy(true);
    await submitAgendaForApproval({ data: { password: pw, staffId, agendaId: agenda.id, actorName: staffName } });
    setBusy(false);
    setReload((x) => x + 1); onChanged();
  }
  async function review(decision: "approve" | "reject" | "revise" | "forward") {
    setBusy(true);
    const r = await reviewAgenda({ data: { password: pw, staffId, agendaId: agenda.id, actorName: staffName, decision, notes: reviewNotes } });
    setBusy(false);
    if (!r.ok) return;
    setReviewNotes(""); setReload((x) => x + 1); onChanged();
  }

  const canReForward = (role === "principal" || role === "teacher") && (agenda.approval_status === "draft" || agenda.approval_status === "revision_requested");
  const canPrincipalReview = role === "principal" && creatorRoleOf(agenda) === "teacher" && agenda.approval_status === "submitted" && !agenda.forwarded_to_hos;
  const canHosReview = role === "hos" && (creatorRoleOf(agenda) === "principal" || agenda.forwarded_to_hos) && agenda.approval_status === "submitted";

  return (
    <div className="space-y-4">
      <div>
        <span className={"rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase " + badge.cls}>{badge.label}</span>
        <p className="text-xs text-muted-foreground mt-1.5">
          {agenda.scope_level === "school" ? "Whole School" : agenda.scope_level === "division" ? "Whole Division" : classNames || "Class"}
          {" · "}{agenda.theme ? agenda.theme + " · " : ""}
          {agenda.start_date ? new Date(agenda.start_date).toLocaleDateString() : ""}{agenda.end_date ? " – " + new Date(agenda.end_date).toLocaleDateString() : ""}
        </p>
        {agenda.purpose && <p className="text-sm mt-2"><span className="text-muted-foreground">Purpose: </span>{agenda.purpose}</p>}
      </div>
      {(canPrincipalReview || canHosReview) && (
        <div className="grid gap-2 rounded-lg bg-secondary/30 p-3">
          <p className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">Keputusan</p>
          <textarea value={reviewNotes} onChange={(e) => setReviewNotes(e.target.value)} rows={2} placeholder="Catatan (opsional)" className={field} />
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => review("approve")} disabled={busy} className="rounded-lg bg-emerald-600 text-white px-3 py-1.5 text-xs font-semibold">🟢 Approve</button>
            {canPrincipalReview && (
              <button onClick={() => review("forward")} disabled={busy} className="rounded-lg bg-emerald-700 text-white px-3 py-1.5 text-xs font-semibold">🟢 Approve & Forward to HoS</button>
            )}
            <button onClick={() => review("revise")} disabled={busy} className="rounded-lg bg-amber-500 text-white px-3 py-1.5 text-xs font-semibold">🟡 Ask to Revise</button>
            <button onClick={() => review("reject")} disabled={busy} className="rounded-lg bg-red-600 text-white px-3 py-1.5 text-xs font-semibold">🔴 Reject</button>
          </div>
        </div>
      )}
      {picList.length > 0 && (
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground font-semibold mb-1">PIC</p>
          <p className="text-sm">{picList.map((p) => p.is_external ? p.external_name + " (external)" : p.school_staff?.full_name).join(", ")}</p>
        </div>
      )}
      {agenda.final_report && (
        <div className="rounded-lg bg-emerald-500/10 p-2">
          <p className="text-xs uppercase tracking-wide text-muted-foreground font-semibold mb-1">Final Report</p>
          <p className="text-sm">{agenda.final_report}</p>
        </div>
      )}
      <div>
        <p className="text-xs uppercase tracking-wide text-muted-foreground font-semibold mb-1.5">Timeline</p>
        <ul className="space-y-1.5 mb-2">
          {timeline.map((t) => (
            <li key={t.id} className={"text-xs rounded-lg p-2 " + (t.entry_type === "system" ? "bg-secondary/40 text-muted-foreground italic" : "bg-secondary/60")}>
              <span className="font-semibold not-italic">{t.author_name}</span>{t.author_role ? " (" + t.author_role + ")" : ""}: {t.body}
              <span className="block text-[10px] opacity-60 mt-0.5">{new Date(t.created_at).toLocaleString()}</span>
            </li>
          ))}
          {timeline.length === 0 && <Hint>No timeline entries yet.</Hint>}
        </ul>
        <div className="grid gap-1.5">
          <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder="Tambah catatan timeline…" className={field} />
          <div className="flex gap-2 flex-wrap">
            <button onClick={addNote} disabled={busy || !note.trim()} className="rounded-lg bg-primary text-primary-foreground px-3 py-1.5 text-xs font-semibold disabled:opacity-50">+ Add Timeline</button>
            {canReForward && (
              <button onClick={reForward} disabled={busy} className="rounded-lg bg-blue-600 text-white px-3 py-1.5 text-xs font-semibold disabled:opacity-50">Re-forward & Save</button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}


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
  const unreadRes = useAsync(() => listUnreadStaffSenderIds({ data: { password: pw, staffId } }), [pw, staffId, otherId, reload]);
  const unreadSenderIds = new Set(unreadRes.data && "ok" in unreadRes.data && unreadRes.data.ok ? unreadRes.data.senderIds : []);

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
                <span className="flex items-center gap-1.5">
                  {unreadSenderIds.has(c.id) && <span className="w-2 h-2 rounded-full bg-orange-500 shrink-0" title="Pesan baru" />}
                  {c.full_name}
                </span>
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
      : role === "principal"
        ? await reportCaseAsPrincipal({ data: { password: access.pw!, staffId: staffId ?? "", staffName: staffName ?? "", classId: classId || undefined, division, title, description } })
        : role === "hos"
          ? await reportCaseAsHos({ data: { password: access.pw!, staffId: staffId ?? "", staffName: staffName ?? "", classId: classId || undefined, division, title, description } })
          : await reportCaseAsTeacher({ data: { password: access.pw!, staffId: staffId ?? "", staffName: staffName ?? "", classId: classId || undefined, division, title, description } });
    setBusy(false);
    if (!r.ok) { setErr(r.error); return; }
    setTitle(""); setDescription(""); setReload((x) => x + 1);
  }

  const [hosView, setHosView] = useState<"approval" | "list" | "create">("approval");
  const pendingForHos = cases.filter((c) => c.status === "hos");

  if (role === "hos") {
    return (
      <div>
        <div className="flex gap-2 mb-3 flex-wrap">
          <button onClick={() => setHosView("approval")} className={"rounded-full px-3 py-1 text-xs font-semibold border " + (hosView === "approval" ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border")}>
            Approval List{pendingForHos.length > 0 ? ` (${pendingForHos.length})` : ""}
          </button>
          <button onClick={() => setHosView("list")} className={"rounded-full px-3 py-1 text-xs font-semibold border " + (hosView === "list" ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border")}>Report List</button>
          <button onClick={() => setHosView("create")} className={"rounded-full px-3 py-1 text-xs font-semibold border " + (hosView === "create" ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border")}>Create Report</button>
        </div>

        {hosView === "create" && (
          <div className={card + " mb-3 grid gap-2"}>
            <p className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">Buat Report Baru</p>
            <select value={classId} onChange={(e) => setClassId(e.target.value)} className={field}>
              <option value="">kelas terkait (opsional)</option>
              {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Judul kasus" className={field} />
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="Detail kasus" className={field} />
            <button onClick={report} disabled={busy || !title.trim()} className={btn + " justify-self-start disabled:opacity-50"}>Buat Report</button>
            <Err msg={err} />
          </div>
        )}

        <ul className="space-y-2">
          {(hosView === "approval" ? pendingForHos : cases).map((c) => (
            <CaseRow key={c.id} kase={c} access={access} role={role} staffId={staffId} staffName={staffName} open={openId === c.id} onToggle={() => setOpenId(openId === c.id ? null : c.id)} onChanged={() => setReload((x) => x + 1)} />
          ))}
          {(hosView === "approval" ? pendingForHos : cases).length === 0 && (
            <Hint>{hosView === "approval" ? "Tidak ada yang menunggu tindakan." : "Belum ada kasus."}</Hint>
          )}
        </ul>
      </div>
    );
  }

  return (
    <div>
      {(role === "teacher" || role === "parent" || role === "principal") && (
        <div className={card + " mb-3 grid gap-2"}>
          <p className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">{role === "principal" ? "Open New Case" : "Lapor Kasus Baru ke Principal"}</p>
          {(role === "teacher" || role === "principal") && (
            <select value={classId} onChange={(e) => setClassId(e.target.value)} className={field}>
              <option value="">kelas terkait (opsional)</option>
              {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          )}
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Judul kasus" className={field} />
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="Detail kasus" className={field} />
          <button onClick={report} disabled={busy || !title.trim()} className={btn + " justify-self-start disabled:opacity-50"}>{role === "principal" ? "Buka Kasus" : "Lapor ke Principal"}</button>
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
  const [inviteMode, setInviteMode] = useState<"staff" | "external">("staff");
  const [inviteStaffId, setInviteStaffId] = useState("");
  const [extName, setExtName] = useState("");
  const [extContact, setExtContact] = useState("");
  const [localReload, setLocalReload] = useState(0);

  const staffListRes = useAsync(() => (showInvite && !access.code ? listSchoolStaff({ data: { password: access.pw! } }) : Promise.resolve(null)), [showInvite, access.pw]);
  const staffOptions: Row[] = staffListRes.data && "staff" in staffListRes.data ? (staffListRes.data.staff ?? []) : [];

  const timelineRes = useAsync(
    () => open
      ? (access.code ? listCaseTimelineForParent({ data: { code: access.code, caseId: kase.id } }) : listCaseTimeline({ data: { password: access.pw!, caseId: kase.id } }))
      : Promise.resolve(null),
    [open, access.pw, access.code, kase.id, localReload],
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
    setComment(""); setLocalReload((x) => x + 1); onChanged();
  }
  async function escalate() {
    if (!access.pw) return;
    const r = await escalateCaseToHos({ data: { password: access.pw, caseId: kase.id, actorName: staffName ?? "" } });
    if (!r.ok) { setErr(r.error); return; }
    setLocalReload((x) => x + 1); onChanged();
  }
  async function close() {
    if (!access.pw) return;
    const r = await closeCase({ data: { password: access.pw, caseId: kase.id, actorName: staffName ?? "", actorRole: role as "principal" | "hos" } });
    if (!r.ok) { setErr(r.error); return; }
    setLocalReload((x) => x + 1); onChanged();
  }
  async function reopen() {
    if (!access.pw) return;
    const r = await reopenCase({ data: { password: access.pw, caseId: kase.id, actorName: staffName ?? "", actorRole: role as "principal" | "hos" } });
    if (!r.ok) { setErr(r.error); return; }
    setLocalReload((x) => x + 1); onChanged();
  }
  async function inviteStaff() {
    if (!access.pw || !inviteStaffId) return;
    await addCaseParticipant({
      data: { password: access.pw, caseId: kase.id, invitedBy: staffId ?? "", invitedByName: staffName ?? "", participantType: "staff", staffId: inviteStaffId },
    });
    setInviteStaffId(""); setShowInvite(false); onChanged();
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
      <div className="flex items-start justify-between gap-2">
        <button onClick={onToggle} className="flex-1 min-w-0 text-left">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-semibold">{kase.title}</p>
            <span className={"shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase " + badge.cls}>{badge.label}</span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            {kase.school_students?.full_name ?? kase.school_classes?.name ?? ""}
          </p>
        </button>
        {!access.code && <PreviewButton title={kase.title} body={<CaseTimelinePreview kase={kase} access={access} badge={badge} role={role} staffId={staffId} staffName={staffName} onChanged={onChanged} />} />}
      </div>
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
                <div className="grid gap-1.5 pt-1">
                  <p className="text-xs">Status: <span className={"rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase " + badge.cls}>{badge.label}</span></p>
                  <div className="flex gap-2 flex-wrap">
                    {role === "principal" && kase.status === "open" && (
                      <button onClick={escalate} className="rounded-lg bg-amber-500 text-white px-3 py-1.5 text-xs font-semibold">🟡 Teruskan ke HoS</button>
                    )}
                    {isOwner && (
                      <button onClick={close} className="rounded-lg bg-emerald-600 text-white px-3 py-1.5 text-xs font-semibold">🟢 Tandai Selesai</button>
                    )}
                    {role === "hos" && kase.status !== "selesai" && kase.status !== "hos" && (
                      <button onClick={close} className="rounded-lg bg-emerald-700 text-white px-3 py-1.5 text-xs font-semibold">🟢 Authorized Final Close</button>
                    )}
                    {kase.status === "selesai" && (role === "principal" || role === "hos") && (
                      <button onClick={reopen} className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold">🔵 Buka Kembali</button>
                    )}
                    {role === "principal" && (
                      <button onClick={() => setShowInvite((v) => !v)} className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold">+ Undang Pihak Lain</button>
                    )}
                  </div>
                </div>
              )}
              <Err msg={err} />

              {showInvite && (
                <div className="mt-1 space-y-2">
                  <div className="flex gap-1.5">
                    <button onClick={() => setInviteMode("staff")} className={"rounded-full px-2.5 py-1 text-xs border " + (inviteMode === "staff" ? "bg-primary text-primary-foreground border-primary" : "bg-background border-border")}>Staff Internal</button>
                    <button onClick={() => setInviteMode("external")} className={"rounded-full px-2.5 py-1 text-xs border " + (inviteMode === "external" ? "bg-primary text-primary-foreground border-primary" : "bg-background border-border")}>Eksternal</button>
                  </div>
                  {inviteMode === "staff" ? (
                    <div className="flex gap-2 flex-wrap">
                      <select value={inviteStaffId} onChange={(e) => setInviteStaffId(e.target.value)} className="rounded-lg bg-background border border-border px-2 py-1.5 text-sm">
                        <option value="">pilih staff</option>
                        {staffOptions.map((s) => <option key={s.id} value={s.id}>{s.full_name}</option>)}
                      </select>
                      <button onClick={inviteStaff} disabled={!inviteStaffId} className="rounded-lg bg-primary text-primary-foreground px-3 py-1.5 text-xs font-semibold disabled:opacity-40">Undang</button>
                    </div>
                  ) : (
                    <div className="flex gap-2 flex-wrap">
                      <ExternalLinkPicker pw={access.pw!} onPick={(l) => { setExtName(l.name); setExtContact(l.contact_info ?? ""); }} />
                      <input value={extName} onChange={(e) => setExtName(e.target.value)} placeholder="Nama (eksternal)" className="rounded-lg bg-background border border-border px-2 py-1.5 text-sm" />
                      <input value={extContact} onChange={(e) => setExtContact(e.target.value)} placeholder="Kontak" className="rounded-lg bg-background border border-border px-2 py-1.5 text-sm" />
                      <button onClick={inviteExternal} disabled={!extName.trim()} className="rounded-lg bg-primary text-primary-foreground px-3 py-1.5 text-xs font-semibold disabled:opacity-40">Undang</button>
                    </div>
                  )}
                  <p className="text-[11px] text-muted-foreground">Staff internal yang diundang otomatis lihat Report ini di dashboard mereka sendiri.</p>
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

/** Self-contained preview body for a Report/Case — fetches its own timeline. */
function CaseTimelinePreview({ kase, access, badge, role, staffId, staffName, onChanged }: {
  kase: Row; access: Access; badge: { label: string; cls: string };
  role: "hos" | "principal" | "teacher"; staffId?: string | null; staffName?: string | null; onChanged: () => void;
}) {
  const [reload, setReload] = useState(0);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const timelineRes = useAsync(() => listCaseTimeline({ data: { password: access.pw!, caseId: kase.id } }), [access.pw, kase.id, reload]);
  const timeline: Row[] = timelineRes.data && timelineRes.data.ok ? timelineRes.data.entries : [];

  async function addNote() {
    if (!note.trim() || !access.pw) return;
    setBusy(true);
    await addCaseComment({ data: { password: access.pw, caseId: kase.id, authorName: staffName ?? "", authorRole: role, body: note } });
    setBusy(false);
    setNote(""); setReload((x) => x + 1); onChanged();
  }
  async function escalate() {
    if (!access.pw) return;
    setBusy(true);
    await escalateCaseToHos({ data: { password: access.pw, caseId: kase.id, actorName: staffName ?? "" } });
    setBusy(false);
    setReload((x) => x + 1); onChanged();
  }
  const canEscalate = role === "principal" && kase.status === "open";

  return (
    <div className="space-y-4">
      <div>
        <span className={"rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase " + badge.cls}>{badge.label}</span>
        <p className="text-xs text-muted-foreground mt-1.5">{kase.school_students?.full_name ?? kase.school_classes?.name ?? ""}</p>
        {kase.description && <p className="text-sm mt-2 whitespace-pre-wrap">{kase.description}</p>}
      </div>
      <div>
        <p className="text-xs uppercase tracking-wide text-muted-foreground font-semibold mb-1.5">Timeline</p>
        <ul className="space-y-1.5 mb-2">
          {timeline.map((t) => (
            <li key={t.id} className={"text-xs rounded-lg p-2 " + (t.entry_type === "system" ? "bg-secondary/40 text-muted-foreground italic" : "bg-secondary/60")}>
              <span className="font-semibold not-italic">{t.author_name}</span>{t.author_role ? " (" + t.author_role + ")" : ""}: {t.body}
              <span className="block text-[10px] opacity-60 mt-0.5">{new Date(t.created_at).toLocaleString()}</span>
            </li>
          ))}
          {timeline.length === 0 && <Hint>Belum ada riwayat.</Hint>}
        </ul>
        <div className="grid gap-1.5">
          <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder="Tambah catatan timeline…" className={field} />
          <div className="flex gap-2 flex-wrap">
            <button onClick={addNote} disabled={busy || !note.trim()} className="rounded-lg bg-primary text-primary-foreground px-3 py-1.5 text-xs font-semibold disabled:opacity-50">+ Add Timeline</button>
            {canEscalate && (
              <button onClick={escalate} disabled={busy} className="rounded-lg bg-orange-600 text-white px-3 py-1.5 text-xs font-semibold disabled:opacity-50">Teruskan ke HoS & Save</button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ───────────── 10. Evaluation (Principal → HoS) ───────────── */
export function EvaluationPanel({ pw, role, staffId, division }: { pw: string; role: "principal" | "hos"; staffId?: string; division?: string }) {
  const [reload, setReload] = useState(0);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [period, setPeriod] = useState("");
  const [content, setContent] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const res = useAsync(() => listEvaluations({ data: { password: pw, role, division } }), [pw, role, division, reload]);
  const evaluations: Row[] = res.data && res.data.ok ? res.data.evaluations : [];

  async function save(submit: boolean) {
    if (!title.trim()) return;
    setBusy(true); setErr(null);
    const r = await saveEvaluation({ data: { password: pw, id: editingId || undefined, staffId: staffId ?? "", division, title, period, content, submit } });
    setBusy(false);
    if (!r.ok) { setErr(r.error); return; }
    setTitle(""); setPeriod(""); setContent(""); setEditingId(null); setReload((x) => x + 1);
  }
  function startEdit(e: Row) {
    setEditingId(e.id); setTitle(e.title); setPeriod(e.period ?? ""); setContent(e.content ?? "");
  }
  async function remove(id: string) {
    await deleteEvaluation({ data: { password: pw, id } });
    setReload((x) => x + 1);
  }

  return (
    <div>
      {role === "principal" && (
        <div className={card + " mb-3 grid gap-2"}>
          <p className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">{editingId ? "Edit Evaluation" : "New Evaluation"}</p>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" className={field} />
          <input value={period} onChange={(e) => setPeriod(e.target.value)} placeholder="Period (e.g. Semester 1 2026/2027)" className={field} />
          <textarea value={content} onChange={(e) => setContent(e.target.value)} rows={5} placeholder="Evaluation content / notes" className={field} />
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => save(false)} disabled={busy} className="rounded-lg border border-border px-3 py-1.5 text-sm font-semibold disabled:opacity-50">Save Draft</button>
            <button onClick={() => save(true)} disabled={busy} className={btn}><Save size={13} /> Submit to HoS</button>
            {editingId && <button onClick={() => { setEditingId(null); setTitle(""); setPeriod(""); setContent(""); }} className="rounded-lg border border-border px-3 py-1.5 text-sm">Cancel</button>}
          </div>
          <Err msg={err} />
        </div>
      )}

      <ul className="space-y-2">
        {evaluations.map((e) => (
          <li key={e.id} className="rounded-xl bg-card border border-border p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold">{e.title}</p>
              <span className={"shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase " + (e.status === "submitted" ? "bg-emerald-500/15 text-emerald-600" : "bg-muted text-muted-foreground")}>
                {e.status === "submitted" ? "Submitted" : "Draft"}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {e.period ? e.period + " · " : ""}{e.school_staff?.full_name ?? ""}
            </p>
            {e.content && <p className="text-sm mt-2 whitespace-pre-wrap">{e.content}</p>}
            {role === "principal" && e.status === "draft" && (
              <div className="flex gap-2 mt-2">
                <button onClick={() => startEdit(e)} className="text-xs text-primary flex items-center gap-1"><Pencil size={11} /> Edit</button>
                <button onClick={() => remove(e.id)} className="text-xs text-destructive flex items-center gap-1"><Trash2 size={11} /> Delete</button>
              </div>
            )}
          </li>
        ))}
        {evaluations.length === 0 && <Hint>No evaluations yet.</Hint>}
      </ul>
    </div>
  );
}

/* ───────────── 5c. Competency Manager (Principal only) ───────────── */
export function CompetencyManager({ pw, staffId }: { pw: string; staffId: string }) {
  const [reload, setReload] = useState(0);
  const [subject, setSubject] = useState("");
  const [title, setTitle] = useState("");
  const [err, setErr] = useState<string | null>(null);

  const res = useAsync(() => listCompetencies({ data: { password: pw } }), [pw, reload]);
  const all: Row[] = res.data && res.data.ok ? res.data.competencies : [];
  const general = all.filter((c) => !c.subject);
  const bySubject = new Map<string, Row[]>();
  for (const c of all) {
    if (!c.subject) continue;
    bySubject.set(c.subject, [...(bySubject.get(c.subject) ?? []), c]);
  }

  async function add() {
    if (!title.trim()) return;
    setErr(null);
    const r = await saveCompetency({ data: { password: pw, staffId, subject: subject.trim() || undefined, title } });
    if (!r.ok) { setErr(r.error); return; }
    setTitle(""); setReload((x) => x + 1);
  }
  async function remove(id: string) {
    await deleteCompetency({ data: { password: pw, id } });
    setReload((x) => x + 1);
  }

  return (
    <div className="mb-4">
      <div className={card + " grid gap-2 mb-3"}>
        <p className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">Add Competency</p>
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Competency name" className={field} />
        <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Subject (leave empty = general, for all Homeroom classes)" className={field} />
        <button onClick={add} className={btn + " justify-self-start"}><Plus size={13} /> Add</button>
        <Err msg={err} />
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground font-semibold mb-1.5">General (all Homeroom classes)</p>
          <ul className="space-y-1.5">
            {general.map((c) => (
              <li key={c.id} className="flex items-center justify-between text-sm rounded-lg bg-secondary/40 px-2 py-1.5">
                <span>{c.title}</span>
                <button onClick={() => remove(c.id)} className="text-destructive"><Trash2 size={13} /></button>
              </li>
            ))}
            {general.length === 0 && <Hint>None yet.</Hint>}
          </ul>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground font-semibold mb-1.5">By Subject</p>
          {Array.from(bySubject.entries()).map(([subj, comps]) => (
            <div key={subj} className="mb-2">
              <p className="text-xs font-semibold mb-1">{subj}</p>
              <ul className="space-y-1.5">
                {comps.map((c) => (
                  <li key={c.id} className="flex items-center justify-between text-sm rounded-lg bg-secondary/40 px-2 py-1.5">
                    <span>{c.title}</span>
                    <button onClick={() => remove(c.id)} className="text-destructive"><Trash2 size={13} /></button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          {bySubject.size === 0 && <Hint>None yet.</Hint>}
        </div>
      </div>
    </div>
  );
}

/* ───────────── Assessment v2 — indicator-based, per-division, Principal setup + approval ───────────── */
const RUBRIC_OPTIONS = [
  { v: "I", label: "I — Independently" },
  { v: "E", label: "E — Expected" },
  { v: "D", label: "D — Developing" },
  { v: "M", label: "M — More Support" },
];

export function AssessmentSetupPanel({ pw, staffId, division }: { pw: string; staffId: string; division: string }) {
  const [sub, setSub] = useState<"domains" | "indicators" | "character">("domains");
  const [reload, setReload] = useState(0);
  const [domainCode, setDomainCode] = useState("");
  const [domainName, setDomainName] = useState("");
  const [level, setLevel] = useState("");
  const [indDomain, setIndDomain] = useState("");
  const [indCode, setIndCode] = useState("");
  const [indDesc, setIndDesc] = useState("");
  const [indEvidence, setIndEvidence] = useState("");
  const [indActivity, setIndActivity] = useState("");
  const [indSubject, setIndSubject] = useState("");
  const [charName, setCharName] = useState("");
  const [charDesc, setCharDesc] = useState("");

  const domainsRes = useAsync(() => listAssessmentDomains({ data: { password: pw, division } }), [pw, division, reload]);
  const domains: Row[] = domainsRes.data && domainsRes.data.ok ? domainsRes.data.domains : [];
  const indicatorsRes = useAsync(() => listAssessmentIndicators({ data: { password: pw, division, level: level || undefined } }), [pw, division, level, reload]);
  const indicators: Row[] = indicatorsRes.data && indicatorsRes.data.ok ? indicatorsRes.data.indicators : [];
  const charactersRes = useAsync(() => listCharacters({ data: { password: pw } }), [pw, reload]);
  const characters: Row[] = charactersRes.data && charactersRes.data.ok ? charactersRes.data.characters : [];

  async function addDomain() {
    if (!domainCode.trim() || !domainName.trim()) return;
    await saveAssessmentDomain({ data: { password: pw, staffId, division, code: domainCode, name: domainName } });
    setDomainCode(""); setDomainName(""); setReload((x) => x + 1);
  }
  async function removeDomain(id: string) {
    await deleteAssessmentDomain({ data: { password: pw, id } });
    setReload((x) => x + 1);
  }
  async function addIndicator() {
    if (!indCode.trim() || !indDesc.trim() || !level.trim() || !indDomain) return;
    await saveAssessmentIndicator({
      data: { password: pw, staffId, division, level, domainCode: indDomain, indicatorCode: indCode, description: indDesc, evidenceExample: indEvidence, relatedActivity: indActivity, subject: indSubject || undefined },
    });
    setIndCode(""); setIndDesc(""); setIndEvidence(""); setIndActivity(""); setIndSubject(""); setReload((x) => x + 1);
  }
  async function removeIndicator(id: string) {
    await deleteAssessmentIndicator({ data: { password: pw, id } });
    setReload((x) => x + 1);
  }
  async function addCharacter() {
    if (!charName.trim()) return;
    await saveCharacter({ data: { password: pw, staffId, name: charName, description: charDesc } });
    setCharName(""); setCharDesc(""); setReload((x) => x + 1);
  }
  async function removeCharacter(id: string) {
    await deleteCharacter({ data: { password: pw, id } });
    setReload((x) => x + 1);
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => setSub("domains")} className={"rounded-full px-3 py-1 text-xs font-semibold border " + (sub === "domains" ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border")}>Domains</button>
          <button onClick={() => setSub("character")} className={"rounded-full px-3 py-1 text-xs font-semibold border " + (sub === "character" ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border")}>14 Character</button>
          <button onClick={() => setSub("indicators")} className={"rounded-full px-3 py-1 text-xs font-semibold border " + (sub === "indicators" ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border")}>Indicator Bank (Advanced)</button>
        </div>
        <AssessmentGuideButton />
      </div>
      <p className="text-[11px] text-muted-foreground mb-3">Cukup isi <span className="font-semibold">Domains</span> + <span className="font-semibold">14 Character</span> supaya Daily Assessment Teacher langsung bisa jalan — Indicator Bank sifatnya opsional, cuma dipakai kalau butuh assessment lebih detail per-kode indikator.</p>

      {sub === "domains" && (
        <div>
          <div className={card + " mb-3 grid gap-2"}>
            <input value={domainCode} onChange={(e) => setDomainCode(e.target.value)} placeholder="Kode (mis. MOR, SOC, PHY, LAN, COG, ART)" className={field} />
            <input value={domainName} onChange={(e) => setDomainName(e.target.value)} placeholder="Nama domain" className={field} />
            <button onClick={addDomain} className={btn + " justify-self-start"}><Plus size={13} /> Tambah Domain</button>
          </div>
          <ul className="space-y-1.5">
            {domains.map((d) => (
              <li key={d.id} className="flex items-center justify-between rounded-lg bg-card border border-border px-3 py-2 text-sm">
                <span className="font-mono text-xs mr-2">{d.code}</span>{d.name}
                <button onClick={() => removeDomain(d.id)} className="text-destructive ml-auto"><Trash2 size={13} /></button>
              </li>
            ))}
            {domains.length === 0 && <Hint>Belum ada domain. Contoh: MOR (Moral & Spiritual), SOC (Social Emotional), PHY (Physical), LAN (Language), COG (Cognitive), ART (Creative Arts).</Hint>}
          </ul>
        </div>
      )}

      {sub === "indicators" && (
        <div>
          <div className={card + " mb-3 grid gap-2"}>
            <div className="flex gap-2 flex-wrap">
              <input value={level} onChange={(e) => setLevel(e.target.value)} placeholder="Level (mis. Toddler, Nursery, K1, K2)" className={field + " flex-1 min-w-32"} />
              <select value={indDomain} onChange={(e) => setIndDomain(e.target.value)} className="rounded-lg bg-background border border-border px-2 py-2 text-sm">
                <option value="">pilih domain</option>
                {domains.map((d) => <option key={d.id} value={d.code}>{d.code} — {d.name}</option>)}
              </select>
            </div>
            <input value={indCode} onChange={(e) => setIndCode(e.target.value)} placeholder="Kode indikator (mis. K1-LAN-012)" className={field} />
            <textarea value={indDesc} onChange={(e) => setIndDesc(e.target.value)} rows={2} placeholder="Deskripsi indikator" className={field} />
            <input value={indEvidence} onChange={(e) => setIndEvidence(e.target.value)} placeholder="Contoh evidence (opsional)" className={field} />
            <input value={indActivity} onChange={(e) => setIndActivity(e.target.value)} placeholder="Aktivitas terkait (opsional)" className={field} />
            <input value={indSubject} onChange={(e) => setIndSubject(e.target.value)} placeholder="Subject (opsional — untuk kompetensi tambahan Subject Teacher)" className={field} />
            <button onClick={addIndicator} className={btn + " justify-self-start"}><Plus size={13} /> Tambah Indikator</button>
          </div>
          <ul className="space-y-1.5">
            {indicators.map((i) => (
              <li key={i.id} className="rounded-lg bg-card border border-border px-3 py-2 text-sm">
                <div className="flex items-center justify-between">
                  <span><span className="font-mono text-xs font-semibold">{i.indicator_code}</span> · {i.level} · {i.domain_code}{i.subject ? " · " + i.subject : ""}</span>
                  <button onClick={() => removeIndicator(i.id)} className="text-destructive"><Trash2 size={13} /></button>
                </div>
                <p className="text-xs mt-1">{i.description}</p>
              </li>
            ))}
            {indicators.length === 0 && <Hint>Belum ada indikator untuk filter ini.</Hint>}
          </ul>
        </div>
      )}

      {sub === "character" && (
        <div>
          <p className="text-xs text-muted-foreground mb-3">14 Character — ciri khas Stella Maris, berlaku sama di semua divisi/level, terpisah dari Indicator Bank per-divisi.</p>
          <div className={card + " mb-3 grid gap-2"}>
            <input value={charName} onChange={(e) => setCharName(e.target.value)} placeholder="Nama character (mis. Respect, Curiosity, Integrity)" className={field} />
            <input value={charDesc} onChange={(e) => setCharDesc(e.target.value)} placeholder="Deskripsi (opsional)" className={field} />
            <button onClick={addCharacter} className={btn + " justify-self-start"}><Plus size={13} /> Tambah Character</button>
          </div>
          <ul className="space-y-1.5">
            {characters.map((c) => (
              <li key={c.id} className="flex items-center justify-between rounded-lg bg-card border border-border px-3 py-2 text-sm">
                <span>{c.name}{c.description && <span className="block text-xs text-muted-foreground">{c.description}</span>}</span>
                <button onClick={() => removeCharacter(c.id)} className="text-destructive shrink-0"><Trash2 size={13} /></button>
              </li>
            ))}
            {characters.length === 0 && <Hint>Belum ada character. Contoh: Independent, Respect, Curiosity, Caring, Enthusiastic, Creative, Responsible, Self-Directed, Tolerant.</Hint>}
          </ul>
        </div>
      )}

    </div>
  );
}

/** Report Approval — split out of Assessment Setup (it's an operational
 * workflow, not configuration) and lives as its own tab in Class Setup. */
export function AssessmentReportApprovalPanel({ pw, staffId, division }: { pw: string; staffId: string; division: string }) {
  const [reload, setReload] = useState(0);
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});
  const reportsRes = useAsync(() => listAssessmentReports({ data: { password: pw, division, status: "pending_approval" } }), [pw, division, reload]);
  const pendingReports: Row[] = reportsRes.data && reportsRes.data.ok ? reportsRes.data.reports : [];

  async function review(reportId: string, decision: "approve" | "revise") {
    await reviewAssessmentReport({ data: { password: pw, staffId, reportId, decision, notes: reviewNotes[reportId] } });
    setReload((x) => x + 1);
  }

  return (
    <ul className="space-y-2">
      {pendingReports.map((r) => (
        <li key={r.id} className="rounded-lg bg-card border border-border p-3 text-sm">
          <p className="font-semibold">{r.school_students?.full_name} — {r.period_type} {r.period_label}</p>
          {r.summary && <p className="text-xs mt-1">{r.summary}</p>}
          {r.recommendations && <p className="text-xs mt-1"><span className="text-muted-foreground">Rekomendasi: </span>{r.recommendations}</p>}
          {r.next_target && <p className="text-xs mt-1"><span className="text-muted-foreground">Target berikutnya: </span>{r.next_target}</p>}
          <textarea value={reviewNotes[r.id] ?? ""} onChange={(e) => setReviewNotes((x) => ({ ...x, [r.id]: e.target.value }))} rows={2} placeholder="Catatan Principal (opsional)" className={field + " mt-2"} />
          <div className="flex gap-2 mt-2">
            <button onClick={() => review(r.id, "approve")} className="rounded-lg bg-emerald-600 text-white px-3 py-1.5 text-xs font-semibold">Approve & Publish ke Parent</button>
            <button onClick={() => review(r.id, "revise")} className="rounded-lg bg-blue-600 text-white px-3 py-1.5 text-xs font-semibold">Minta Revisi</button>
          </div>
        </li>
      ))}
      {pendingReports.length === 0 && <Hint>Tidak ada laporan menunggu approval.</Hint>}
    </ul>
  );
}

/* ───────────── Assessment v2 — Teacher: record per indicator + submit report ───────────── */
export function TeacherIndicatorAssessmentPanel({ pw, staffId, classes, division, isSubject }: { pw: string; staffId: string; classes: ClassOpt[]; division: string; isSubject?: boolean }) {
  const [sub, setSub] = useState<"daily" | "record" | "character" | "report">("daily");
  const [classId, setClassId] = useState(classes[0]?.id ?? "");
  const [studentId, setStudentId] = useState("");
  const [subject, setSubject] = useState("");
  const [periodType, setPeriodType] = useState("day");
  const [periodLabel, setPeriodLabel] = useState(today());
  const [rubrics, setRubrics] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [reload, setReload] = useState(0);
  const [busy, setBusy] = useState(false);
  const [summary, setSummary] = useState("");
  const [recommendations, setRecommendations] = useState("");
  const [nextTarget, setNextTarget] = useState("");

  const selectedClass = classes.find((c) => c.id === classId);
  const studentsRes = useAsync(() => (classId ? listSchoolStudents({ data: { password: pw, classId } }) : Promise.resolve(null)), [pw, classId]);
  const students: Row[] = studentsRes.data && "students" in studentsRes.data ? (studentsRes.data.students ?? []) : [];
  const indicatorsRes = useAsync(
    () => ((selectedClass as Row)?.level ? listAssessmentIndicators({ data: { password: pw, division, level: (selectedClass as Row).level, subject: subject.trim() || undefined } }) : Promise.resolve(null)),
    [pw, division, selectedClass, subject],
  );
  const indicators: Row[] = indicatorsRes.data && indicatorsRes.data.ok ? indicatorsRes.data.indicators : [];
  const recordsRes = useAsync(
    () => (studentId && periodLabel ? listAssessmentRecords({ data: { password: pw, studentId, periodType, periodLabel } }) : Promise.resolve(null)),
    [pw, studentId, periodType, periodLabel, reload],
  );
  const records: Row[] = recordsRes.data && recordsRes.data.ok ? recordsRes.data.records : [];
  const charactersRes = useAsync(() => listCharacters({ data: { password: pw } }), [pw]);
  const characters: Row[] = charactersRes.data && charactersRes.data.ok ? charactersRes.data.characters : [];
  const charRecordsRes = useAsync(
    () => (studentId && periodLabel ? listCharacterRecords({ data: { password: pw, studentId, periodType, periodLabel } }) : Promise.resolve(null)),
    [pw, studentId, periodType, periodLabel, reload],
  );
  const charRecords: Row[] = charRecordsRes.data && charRecordsRes.data.ok ? charRecordsRes.data.records : [];
  const [charScores, setCharScores] = useState<Record<string, number>>({});
  const [charMode, setCharMode] = useState<"auto" | "manual">("manual");
  const [charNarration, setCharNarration] = useState("");
  const [charGenerating, setCharGenerating] = useState(false);
  const selectedStudent = students.find((s) => s.id === studentId);

  // ————— Simplified Daily Assessment (domain-direct, no indicator code) —————
  const domainsRes = useAsync(() => listAssessmentDomains({ data: { password: pw, division } }), [pw, division]);
  const domains: Row[] = domainsRes.data && domainsRes.data.ok ? domainsRes.data.domains : [];
  const dailyDate = periodType === "day" ? periodLabel : today();
  const dailyRecordsRes = useAsync(
    () => (studentId ? listDailyDomainRecords({ data: { password: pw, studentId, date: dailyDate } }) : Promise.resolve(null)),
    [pw, studentId, dailyDate, reload],
  );
  const dailyRecords: Row[] = dailyRecordsRes.data && dailyRecordsRes.data.ok ? dailyRecordsRes.data.records : [];
  const [dailyPosition, setDailyPosition] = useState<Record<string, number>>({});
  const [dailyActivity, setDailyActivity] = useState<Record<string, string>>({});
  const [dailyEvidence, setDailyEvidence] = useState<Record<string, string>>({});

  async function saveDailyAll() {
    if (!studentId) return;
    setBusy(true);
    const entries = domains.map((d) => ({
      domainCode: d.code,
      position: dailyPosition[d.code] ?? 50,
      activityNote: dailyActivity[d.code] ?? "",
      evidenceNote: dailyEvidence[d.code] ?? "",
    }));
    await saveDailyDomainRecordsBatch({ data: { password: pw, studentId, classId, division, teacherId: staffId, date: dailyDate, entries } });
    setBusy(false);
    setReload((x) => x + 1);
  }

  async function generateNarrationForAll() {
    setCharGenerating(true);
    const list = characters.map((c) => ({ name: c.name, score: charScores[c.id] ?? 50 }));
    const r = await draftCharacterNarrationBatch({ data: { password: pw, studentName: selectedStudent?.full_name ?? "murid", characters: list } });
    setCharGenerating(false);
    if (r.ok) setCharNarration(r.note);
  }
  async function saveAllCharacters() {
    if (!studentId || !periodLabel.trim()) return;
    setBusy(true);
    const scores = characters.map((c) => ({ characterId: c.id, score: charScores[c.id] ?? 50 }));
    await saveCharacterRecordsBatch({
      data: { password: pw, studentId, teacherId: staffId, narrationMode: charMode, narration: charNarration, periodType, periodLabel, scores },
    });
    setBusy(false);
    setReload((x) => x + 1);
  }

  async function saveOne(indicatorId: string) {
    const rubric = rubrics[indicatorId];
    if (!rubric || !studentId || !periodLabel.trim()) return;
    setBusy(true);
    await saveAssessmentRecord({
      data: { password: pw, studentId, classId, indicatorId, teacherId: staffId, rubric: rubric as "I" | "E" | "D" | "M", evidenceNote: notes[indicatorId], periodType, periodLabel },
    });
    setBusy(false);
    setReload((x) => x + 1);
  }
  async function submitReport() {
    if (!studentId || !periodLabel.trim()) return;
    setBusy(true);
    await generateAssessmentReport({ data: { password: pw, staffId, studentId, division, periodType, periodLabel, summary, recommendations, nextTarget } });
    setBusy(false);
    setSummary(""); setRecommendations(""); setNextTarget(""); setReload((x) => x + 1);
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => setSub("daily")} className={"rounded-full px-3 py-1 text-xs font-semibold border " + (sub === "daily" ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border")}>Daily Assessment</button>
          <button onClick={() => setSub("record")} className={"rounded-full px-3 py-1 text-xs font-semibold border " + (sub === "record" ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border")}>Indicator (Advanced)</button>
          <button onClick={() => setSub("character")} className={"rounded-full px-3 py-1 text-xs font-semibold border " + (sub === "character" ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border")}>14 Character</button>
          <button onClick={() => setSub("report")} className={"rounded-full px-3 py-1 text-xs font-semibold border " + (sub === "report" ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border")}>Create Report</button>
        </div>
        <AssessmentGuideButton />
      </div>

      <div className="flex gap-2 flex-wrap mb-3">
        {classes.length > 1 && (
          <select value={classId} onChange={(e) => { setClassId(e.target.value); setStudentId(""); }} className="rounded-lg bg-background border border-border px-2 py-2 text-sm">
            {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        )}
        <select value={studentId} onChange={(e) => setStudentId(e.target.value)} className="rounded-lg bg-background border border-border px-2 py-2 text-sm">
          <option value="">pilih murid</option>
          {students.map((s) => <option key={s.id} value={s.id}>{s.full_name}</option>)}
        </select>
        <select value={periodType} onChange={(e) => setPeriodType(e.target.value)} className="rounded-lg bg-background border border-border px-2 py-2 text-sm">
          <option value="day">Day</option>
          <option value="week">Week</option>
          <option value="month">Month</option>
          <option value="semester">Semester</option>
        </select>
        <input
          value={periodLabel} onChange={(e) => setPeriodLabel(e.target.value)}
          placeholder={periodType === "day" ? "Tanggal (YYYY-MM-DD)" : "Label periode (mis. Week 3 Agustus 2026)"}
          className="rounded-lg bg-background border border-border px-2 py-2 text-sm flex-1 min-w-40"
        />
        {sub === "record" && isSubject && (
          <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Subject Anda (untuk kompetensi tambahan)" className="rounded-lg bg-background border border-border px-2 py-2 text-sm" />
        )}
      </div>

      {!studentId || !periodLabel.trim() ? (
        <Hint>Pilih murid dan isi periode dulu.</Hint>
      ) : sub === "daily" ? (
        <div>
          <p className="text-[11px] text-muted-foreground mb-2">6 Domain otomatis, geser slider ke posisi mana pun antara I dan M (nggak harus tepat di satu titik) — nanti dirangkum otomatis jadi laporan Week/Month/Semester saat Create Report.</p>
          <div className="space-y-3">
            {domains.map((d) => {
              const existing = dailyRecords.find((r) => r.domain_code === d.code);
              const pos = dailyPosition[d.code] ?? existing?.position ?? 50;
              const gradientStyle = { background: `linear-gradient(90deg, #ef4444 0%, #f97316 33%, #3b82f6 67%, #10b981 100%)` };
              return (
                <div key={d.id} className="rounded-lg bg-card border border-border p-3">
                  <p className="text-sm font-semibold mb-2">{d.name} <span className="font-mono text-xs text-muted-foreground">({d.code})</span></p>
                  {existing && <p className="text-[10px] text-emerald-600 mb-1">Sudah diisi hari ini</p>}
                  <div className="mb-1">
                    <div className="h-2 rounded-full overflow-hidden" style={gradientStyle} />
                    <div className="flex justify-between text-[9px] text-muted-foreground px-0.5 mt-0.5">
                      <span>M</span><span>D</span><span>E</span><span>I</span>
                    </div>
                  </div>
                  <input
                    type="range" min={0} max={100} value={pos}
                    onChange={(e) => setDailyPosition((x) => ({ ...x, [d.code]: Number(e.target.value) }))}
                    className="w-full mb-2"
                  />
                  <input
                    value={dailyActivity[d.code] ?? existing?.activity_note ?? ""}
                    onChange={(e) => setDailyActivity((x) => ({ ...x, [d.code]: e.target.value }))}
                    placeholder="Activity (mis. Menggunakan gunting dengan aman)"
                    className={field + " mb-1.5"}
                  />
                  <input
                    value={dailyEvidence[d.code] ?? existing?.evidence_note ?? ""}
                    onChange={(e) => setDailyEvidence((x) => ({ ...x, [d.code]: e.target.value }))}
                    placeholder="Catatan/evidence singkat"
                    className={field}
                  />
                </div>
              );
            })}
            {domains.length === 0 && <Hint>Belum ada Domain — hubungi Principal untuk setup di Assessment Setup.</Hint>}
          </div>
          {domains.length > 0 && (
            <button onClick={saveDailyAll} disabled={busy} className={btn + " mt-3"}>Simpan Semua Domain</button>
          )}
        </div>
      ) : sub === "record" ? (
        <>
          {periodType === "day" && <p className="text-[11px] text-muted-foreground mb-2">Ini tempat isi assessment harian — nanti dirangkum otomatis jadi laporan Week/Month/Semester saat Create Report.</p>}
          <ul className="space-y-2">
          {indicators.map((i) => {
            const existing = records.find((r) => r.indicator_id === i.id);
            return (
              <li key={i.id} className="rounded-lg bg-card border border-border p-3 text-sm">
                <p><span className="font-mono text-xs font-semibold">{i.indicator_code}</span> · {i.domain_code}{i.subject ? " · " + i.subject : ""}</p>
                <p className="text-xs mt-0.5 mb-2">{i.description}</p>
                {existing && <p className="text-[10px] text-emerald-600 mb-1">Sudah dinilai: {existing.rubric}</p>}
                <div className="flex gap-1.5 flex-wrap mb-1.5">
                  {RUBRIC_OPTIONS.map((r) => (
                    <button
                      key={r.v}
                      onClick={() => setRubrics((x) => ({ ...x, [i.id]: r.v }))}
                      className={"rounded-full px-2.5 py-1 text-xs border " + (rubrics[i.id] === r.v ? "bg-primary text-primary-foreground border-primary" : "bg-background border-border")}
                    >{r.v}</button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input value={notes[i.id] ?? ""} onChange={(e) => setNotes((x) => ({ ...x, [i.id]: e.target.value }))} placeholder="Catatan/evidence singkat" className="rounded-lg bg-background border border-border px-2 py-1 text-xs flex-1" />
                  <button onClick={() => saveOne(i.id)} disabled={busy || !rubrics[i.id]} className="rounded-lg bg-primary text-primary-foreground px-3 py-1 text-xs font-semibold disabled:opacity-40">Simpan</button>
                </div>
              </li>
            );
          })}
          {indicators.length === 0 && <Hint>Belum ada indikator untuk level/subject ini — hubungi Principal untuk setup Indicator Bank.</Hint>}
          </ul>
        </>
      ) : sub === "character" ? (
        <div>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-2 mb-3">
            {characters.map((c) => {
              const existing = charRecords.find((r) => r.character_id === c.id);
              const score = charScores[c.id] ?? existing?.score ?? 50;
              const pct = Math.max(0, Math.min(100, score));
              const gradientStyle = { background: `linear-gradient(90deg, #ffffff 0%, #d4af37 100%)` };
              return (
                <div key={c.id} className="rounded-lg bg-card border border-border p-2">
                  <p className="text-xs font-semibold truncate mb-1">{c.name}</p>
                  <div className="h-2 rounded-full border border-border overflow-hidden relative mb-1" style={gradientStyle}>
                    <div className="absolute inset-y-0 right-0 bg-background/70" style={{ width: `${100 - pct}%` }} />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="range" min={0} max={100} value={score}
                      onChange={(e) => setCharScores((x) => ({ ...x, [c.id]: Number(e.target.value) }))}
                      className="flex-1 h-3"
                    />
                    <span className="text-[10px] font-mono w-7 text-right">{score}</span>
                  </div>
                </div>
              );
            })}
            {characters.length === 0 && <Hint>Belum ada daftar 14 Character — hubungi Principal untuk setup di Assessment Setup.</Hint>}
          </div>

          {characters.length > 0 && (
            <div className={card + " grid gap-2"}>
              <p className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">Narasi (1x untuk semua Character)</p>
              <div className="flex gap-1.5">
                <button onClick={() => setCharMode("auto")} className={"rounded-full px-2.5 py-1 text-xs border " + (charMode === "auto" ? "bg-primary text-primary-foreground border-primary" : "bg-background border-border")}>Auto (AI)</button>
                <button onClick={() => setCharMode("manual")} className={"rounded-full px-2.5 py-1 text-xs border " + (charMode === "manual" ? "bg-primary text-primary-foreground border-primary" : "bg-background border-border")}>Manual</button>
                {charMode === "auto" && (
                  <button onClick={generateNarrationForAll} disabled={charGenerating} className="rounded-lg border border-border px-2.5 py-1 text-xs font-semibold">
                    {charGenerating ? "Membuat…" : "Generate"}
                  </button>
                )}
              </div>
              <textarea value={charNarration} onChange={(e) => setCharNarration(e.target.value)} rows={3} placeholder="Narasi keseluruhan 14 Character (bisa diedit walau dari AI)" className={field} />
              <button onClick={saveAllCharacters} disabled={busy} className={btn + " justify-self-start"}>Simpan Semua</button>
            </div>
          )}
        </div>
      ) : (
        <div className={card + " grid gap-2"}>
          <p className="text-xs text-muted-foreground">Merangkum {records.length} penilaian indikator + {charRecords.length} penilaian Character untuk periode ini menjadi laporan ke Parent (perlu approval Principal dulu).</p>
          <textarea value={summary} onChange={(e) => setSummary(e.target.value)} rows={3} placeholder="Ringkasan perkembangan" className={field} />
          <textarea value={recommendations} onChange={(e) => setRecommendations(e.target.value)} rows={2} placeholder="Rekomendasi aktivitas di rumah" className={field} />
          <textarea value={nextTarget} onChange={(e) => setNextTarget(e.target.value)} rows={2} placeholder="Target periode berikutnya" className={field} />
          <button onClick={submitReport} disabled={busy} className={btn + " justify-self-start"}>Submit ke Principal untuk Approval</button>
        </div>
      )}
    </div>
  );
}

/* ───────────── Assessment v2 — HoS: results only (read-only, published) ───────────── */
export function AssessmentResultsPanel({ pw }: { pw: string }) {
  const res = useAsync(() => listAssessmentReports({ data: { password: pw, status: "published" } }), [pw]);
  const reports: Row[] = res.data && res.data.ok ? res.data.reports : [];
  return (
    <div>
      <div className="flex justify-end mb-2"><AssessmentGuideButton /></div>
      <ul className="space-y-2">
        {reports.map((r) => (
          <li key={r.id} className="rounded-lg bg-card border border-border p-3 text-sm">
            <p className="font-semibold">{r.school_students?.full_name} — {r.division} — {r.period_type} {r.period_label}</p>
            {r.summary && <p className="text-xs mt-1">{r.summary}</p>}
          </li>
        ))}
      {reports.length === 0 && <Hint>Belum ada laporan yang sudah dipublikasikan.</Hint>}
      </ul>
    </div>
  );
}

/* ───────────── Assessment v2 — Parent: published reports only ───────────── */
export function ParentAssessmentReportsPanel({ code }: { code: string }) {
  const res = useAsync(() => listAssessmentReportsForCode({ data: { code } }), [code]);
  const reports: Row[] = res.data && res.data.ok ? res.data.reports : [];
  return (
    <ul className="space-y-2">
      {reports.map((r) => (
        <li key={r.id} className="rounded-xl bg-card border border-border p-3 text-sm">
          <p className="font-semibold">{r.period_type} — {r.period_label}</p>
          {r.summary && <p className="mt-1">{r.summary}</p>}
          {r.recommendations && <p className="mt-2 text-xs"><span className="text-muted-foreground">Rekomendasi aktivitas di rumah: </span>{r.recommendations}</p>}
          {r.next_target && <p className="mt-1 text-xs"><span className="text-muted-foreground">Target berikutnya: </span>{r.next_target}</p>}
        </li>
      ))}
      {reports.length === 0 && <Hint>Belum ada laporan perkembangan yang dipublikasikan.</Hint>}
    </ul>
  );
}

/* ───────────── Ass-Guide — reference doc for Domain/Indicator Bank/14 Character ───────────── */
function AssessmentGuideContent() {
  return (
    <div className="space-y-4 text-sm">
      <div>
        <p className="font-semibold mb-1">1. Domain (wajib disetup)</p>
        <p className="text-xs text-muted-foreground mb-2">Kategori besar area perkembangan anak — ini yang otomatis muncul di Daily Assessment Teacher. Tiap divisi bisa punya set Domain sendiri (Principal yang setup). Contoh standar Preschool:</p>
        <ul className="text-xs space-y-0.5">
          <li><span className="font-mono font-semibold">MOR</span> — Moral & Spiritual</li>
          <li><span className="font-mono font-semibold">SOC</span> — Social Emotional</li>
          <li><span className="font-mono font-semibold">PHY</span> — Physical Development</li>
          <li><span className="font-mono font-semibold">LAN</span> — Language</li>
          <li><span className="font-mono font-semibold">COG</span> — Cognitive</li>
          <li><span className="font-mono font-semibold">ART</span> — Creative Arts</li>
        </ul>
      </div>
      <div>
        <p className="font-semibold mb-1">2. Daily Assessment — cara isi Teacher</p>
        <p className="text-xs text-muted-foreground mb-1">Setiap Domain dinilai dengan menggeser slider di sepanjang garis <span className="font-mono">M — D — E — I</span> — posisinya nggak harus tepat di satu titik, boleh di antara dua (misal antara E dan D).</p>
        <ul className="text-xs space-y-1 mt-1">
          <li><span className="font-mono font-semibold">I</span> — Independently: mandiri, konsisten, bisa jadi contoh untuk teman.</li>
          <li><span className="font-mono font-semibold">E</span> — Expected: mencapai target sesuai usia.</li>
          <li><span className="font-mono font-semibold">D</span> — Developing: sedang berkembang, masih perlu bimbingan.</li>
          <li><span className="font-mono font-semibold">M</span> — More Support: perlu lebih banyak latihan & pendampingan.</li>
        </ul>
        <p className="text-xs text-muted-foreground mt-1">Kolom "Activity" diisi bebas (aktivitas hari itu, mis. "Menggunakan gunting dengan aman"), plus Catatan/evidence singkat.</p>
      </div>
      <div>
        <p className="font-semibold mb-1">3. Indicator Bank (opsional/lanjutan)</p>
        <p className="text-xs text-muted-foreground mb-1">Kalau butuh assessment lebih detail per-kode (bukan sekadar per-Domain), Principal bisa isi Indicator Bank di Assessment Setup. Format kode: <span className="font-mono">[Level]-[Domain]-[Nomor]</span> — contoh <span className="font-mono font-semibold">K1-LAN-012</span> = Level K1, Domain Language, indikator nomor 012.</p>
        <p className="text-xs text-muted-foreground">Ini muncul di tab "Indicator (Advanced)" milik Teacher — terpisah dari Daily Assessment yang sederhana, dan sifatnya benar-benar opsional.</p>
      </div>
      <div>
        <p className="font-semibold mb-1">4. 14 Character (wajib disetup)</p>
        <p className="text-xs text-muted-foreground mb-1">Ciri khas Stella Maris — 14 sifat yang sama di semua level/divisi, terpisah dari Domain (yang per-divisi). Dinilai dengan skala <span className="font-semibold">0-100</span>, ditampilkan sebagai gradient warna putih (0) → emas (100).</p>
        <p className="text-xs">Independent, Respect, Curiosity, Caring, Enthusiastic, Creative, Responsible, Self-Directed, Tolerant, Integrity, Self-Control, Assertive, Persuasive, Productive.</p>
        <p className="text-xs text-muted-foreground mt-1">Narasi bisa dibuat otomatis (Auto/AI) atau ditulis manual — keduanya tetap bisa diedit sebelum disimpan.</p>
      </div>
      <div>
        <p className="font-semibold mb-1">5. Alur Pengisian</p>
        <p className="text-xs text-muted-foreground">Teacher isi Daily Assessment (Domain + 14 Character) tiap hari → dirangkum jadi laporan Week/Month/Semester → dikirim ke Principal untuk approval → setelah disetujui (Approve & Publish), baru laporan bisa dilihat Parent. HoS hanya melihat hasil laporan yang sudah published.</p>
      </div>
    </div>
  );
}

export function AssessmentGuideButton() {
  const { openPreview } = usePreview();
  return (
    <button
      onClick={() => openPreview({ title: "Panduan Assessment (Ass-Guide)", body: <AssessmentGuideContent /> })}
      className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold flex items-center gap-1.5"
    >
      📖 Panduan Assessment
    </button>
  );
}

/* ───────────── NSV Relay — invite-only bridge to NSV's local Messages ───────────── */
export function RelayPanel({ pw, staffId, staffName }: { pw: string; staffId: string; staffName: string }) {
  const [reload, setReload] = useState(0);
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [body, setBody] = useState("");
  const [openThread, setOpenThread] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [busy, setBusy] = useState(false);
  const res = useAsync(() => listRelayThreads({ data: { password: pw, staffId } }), [pw, staffId, reload]);
  const threads: Row[] = res.data && res.data.ok ? res.data.threads : [];

  async function start() {
    if (!phone.trim() || !body.trim()) return;
    setBusy(true);
    await startRelayThread({ data: { password: pw, staffId, senderName: staffName, recipientPhone: phone, recipientName: name, body } });
    setBusy(false);
    setPhone(""); setName(""); setBody(""); setReload((x) => x + 1);
  }
  async function reply(threadId: string) {
    if (!replyText.trim()) return;
    setBusy(true);
    await replyToRelayThread({ data: { password: pw, threadId, body: replyText } });
    setBusy(false);
    setReplyText(""); setReload((x) => x + 1);
  }
  async function remove(threadId: string) {
    await deleteRelayThread({ data: { password: pw, threadId } });
    setReload((x) => x + 1);
  }

  return (
    <div>
      <p className="text-[11px] text-muted-foreground mb-3">
        Kirim pesan ke nomor HP siapa pun yang pakai aplikasi NSV — pesan ini nunggu di "penampungan" sampai dia buka NSV dan pilih simpan ke Messages-nya sendiri. Balasannya juga lewat sini. Hanya nomor yang kamu undang di sini yang bisa lihat/masuk — nggak ada pengecekan "punya NSV atau tidak", kalau dia nggak punya NSV ya otomatis nggak akan pernah masuk ke sana.
      </p>
      <div className={card + " mb-3 grid gap-2"}>
        <p className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">Undang / Mulai Percakapan Baru</p>
        <ExternalLinkPicker pw={pw} onPick={(l) => { setName(l.name); setPhone(l.contact_info ?? ""); }} />
        <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Nomor HP/WhatsApp (mis. 0812xxxxxxx)" className={field} />
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nama (opsional)" className={field} />
        <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={2} placeholder="Pesan" className={field} />
        <button onClick={start} disabled={busy || !phone.trim() || !body.trim()} className={btn + " justify-self-start disabled:opacity-50"}><Plus size={13} /> Kirim</button>
      </div>
      <ul className="space-y-2">
        {threads.map((t) => {
          const msgs: Row[] = (t.nsv_relay_messages ?? []).slice().sort((a: Row, b: Row) => a.created_at.localeCompare(b.created_at));
          const hasNewReply = msgs.some((m) => m.direction === "from_nsv_user");
          return (
            <li key={t.id} className="rounded-lg bg-card border border-border p-3 text-sm">
              <button onClick={() => setOpenThread(openThread === t.id ? null : t.id)} className="w-full text-left flex items-center justify-between">
                <span className="font-semibold">{t.recipient_name || t.recipient_phone}{hasNewReply ? " 🟠" : ""}</span>
                <span className="text-xs text-muted-foreground">{t.recipient_phone}</span>
              </button>
              {openThread === t.id && (
                <div className="mt-2 grid gap-2">
                  <ul className="space-y-1.5 max-h-56 overflow-y-auto">
                    {msgs.map((m) => (
                      <li key={m.id} className={"text-xs rounded-lg p-2 " + (m.direction === "from_nsv_user" ? "bg-emerald-500/10" : "bg-secondary/50")}>
                        <span className="font-semibold">{m.direction === "from_nsv_user" ? (t.recipient_name || "Dia") : "Anda"}: </span>{m.body}
                      </li>
                    ))}
                  </ul>
                  <div className="flex gap-2">
                    <input value={replyText} onChange={(e) => setReplyText(e.target.value)} placeholder="Balas…" className={field + " flex-1"} />
                    <button onClick={() => reply(t.id)} disabled={busy || !replyText.trim()} className="rounded-lg bg-primary text-primary-foreground px-3 py-1.5 text-xs font-semibold disabled:opacity-50">Kirim</button>
                  </div>
                  <button onClick={() => remove(t.id)} className="text-[11px] text-destructive flex items-center gap-1 justify-self-start"><Trash2 size={11} /> Hapus percakapan ini</button>
                </div>
              )}
            </li>
          );
        })}
        {threads.length === 0 && <Hint>Belum ada percakapan.</Hint>}
      </ul>
    </div>
  );
}

/* ───────────── External Link directory (HoS-only) + reusable picker ───────────── */
export function ExternalLinkManagerPanel({ pw, staffId }: { pw: string; staffId: string }) {
  const [reload, setReload] = useState(0);
  const [name, setName] = useState("");
  const [department, setDepartment] = useState("");
  const [contactInfo, setContactInfo] = useState("");
  const [note, setNote] = useState("");
  const res = useAsync(() => listExternalLinks({ data: { password: pw } }), [pw, reload]);
  const links: Row[] = res.data && res.data.ok ? res.data.links : [];

  async function add() {
    if (!name.trim()) return;
    await saveExternalLink({ data: { password: pw, staffId, name, department, contactInfo, note } });
    setName(""); setDepartment(""); setContactInfo(""); setNote(""); setReload((x) => x + 1);
  }
  async function remove(id: string) {
    await deleteExternalLink({ data: { password: pw, staffId, id } });
    setReload((x) => x + 1);
  }

  return (
    <div>
      <p className="text-[11px] text-muted-foreground mb-3">Directory pihak eksternal yang sering diajak bicara (mis. GA, Finance, Marketing, Admission) — sekali dibuat di sini, bisa langsung dipilih waktu invite ke Agenda, Message, atau Report, tanpa isi ulang nama/kontaknya tiap kali.</p>
      <div className={card + " mb-3 grid gap-2"}>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nama (mis. Ibu Sari - GA)" className={field} />
        <input value={department} onChange={(e) => setDepartment(e.target.value)} placeholder="Departemen (mis. GA, Finance, Marketing, Admission)" className={field} />
        <input value={contactInfo} onChange={(e) => setContactInfo(e.target.value)} placeholder="Kontak (WA/email/telp)" className={field} />
        <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Catatan (opsional)" className={field} />
        <button onClick={add} className={btn + " justify-self-start"}><Plus size={13} /> Tambah ke List</button>
      </div>
      <ul className="space-y-1.5">
        {links.map((l) => (
          <li key={l.id} className="rounded-lg bg-card border border-border px-3 py-2 text-sm flex items-center justify-between">
            <span>
              {l.name}{l.department ? <span className="text-xs text-muted-foreground ml-1.5">({l.department})</span> : null}
              {l.contact_info ? <span className="block text-xs text-muted-foreground">{l.contact_info}</span> : null}
            </span>
            <button onClick={() => remove(l.id)} className="text-destructive shrink-0"><Trash2 size={13} /></button>
          </li>
        ))}
        {links.length === 0 && <Hint>Belum ada External Link. Contoh: GA, Finance, Marketing, Admission.</Hint>}
      </ul>
    </div>
  );
}

/** Reusable picker — dropdown of the HoS's External Link directory, used to
 * pre-fill name+contact wherever an external party can be invited (Agenda
 * PIC, Report participant, NSV relay). Selecting one calls onPick with the
 * chosen entry; the calling form still owns the actual invite action. */
export function ExternalLinkPicker({ pw, onPick }: { pw: string; onPick: (link: Row) => void }) {
  const res = useAsync(() => listExternalLinks({ data: { password: pw } }), [pw]);
  const links: Row[] = res.data && res.data.ok ? res.data.links : [];
  if (links.length === 0) return null;
  return (
    <select
      onChange={(e) => { const l = links.find((x) => x.id === e.target.value); if (l) onPick(l); e.target.value = ""; }}
      defaultValue=""
      className="rounded-lg bg-background border border-border px-2 py-1.5 text-sm"
    >
      <option value="">pilih dari External Link…</option>
      {links.map((l) => <option key={l.id} value={l.id}>{l.name}{l.department ? " (" + l.department + ")" : ""}</option>)}
    </select>
  );
}
