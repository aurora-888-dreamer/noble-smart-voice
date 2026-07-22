import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { ChevronLeft, ChevronRight, Plus, X } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { getDb, nextOccurrence, type ItemType } from "@/lib/db";
import { saveCapturedEntry } from "@/lib/capture";
import { useLang } from "@/lib/settings-store";
import { t } from "@/lib/i18n";
import { useIsDesktop } from "@/hooks/use-desktop";

export const Route = createFileRoute("/calendar")({
  head: () => ({ meta: [{ title: "Calendar — Noble" }] }),
  component: CalendarPage,
});

interface DayEvent {
  when: number;
  title: string;
  kind: "task" | "meeting" | "appointment" | "reminder" | "event";
}

function CalendarPage() {
  const [lang] = useLang();
  const [cursor, setCursor] = useState(() => new Date());
  const [newEventDate, setNewEventDate] = useState<Date | null>(null);

  const events = useLiveQuery<DayEvent[]>(async () => {
    if (typeof window === "undefined") return [];
    const db = getDb();
    const [tasks, meetings, appointments, reminders, eventEntries] = await Promise.all([
      db.tasks.toArray(),
      db.meetings.toArray(),
      db.appointments.toArray(),
      db.reminders.toArray(),
      db.events.toArray(),
    ]);
    const out: DayEvent[] = [];
    tasks.forEach((x) => x.dueAt && out.push({ when: x.dueAt, title: x.title, kind: "task" }));
    meetings.forEach((x) => x.meetingAt && out.push({ when: x.meetingAt, title: x.title, kind: "meeting" }));
    appointments.forEach((x) => out.push({ when: x.appointmentAt, title: x.title, kind: "appointment" }));
    reminders.forEach((x) => out.push({ when: x.remindAt, title: x.label, kind: "reminder" }));
    // Yearly events use their computed NEXT occurrence here so the
    // "Upcoming" list, general sorting, and the month grid all reflect the
    // real next date, not the originally-entered year.
    eventEntries.forEach((x) => out.push({ when: nextOccurrence(x.eventAt, x.recurring), title: x.title, kind: "event" }));
    return out.sort((a, b) => a.when - b.when);
  }, []);

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  const offset = firstDay.getDay();

  const byDay = new Map<number, DayEvent[]>();
  (events ?? []).forEach((e) => {
    const d = new Date(e.when);
    if (d.getFullYear() === year && d.getMonth() === month) {
      const day = d.getDate();
      if (!byDay.has(day)) byDay.set(day, []);
      byDay.get(day)!.push(e);
    }
  });

  const monthName = cursor.toLocaleDateString(lang === "id" ? "id-ID" : "en-US", {
    month: "long",
    year: "numeric",
  });
  const weekDays = lang === "id"
    ? ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"]
    : ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const today = new Date();
  const isToday = (d: number) =>
    today.getFullYear() === year && today.getMonth() === month && today.getDate() === d;

  const upcomingSelected = (events ?? [])
    .filter((e) => e.when >= Date.now())
    .slice(0, 10);

  const isDesktop = useIsDesktop();

  return (
    <AppShell title={t(lang, "calendar")}>
      <div className={isDesktop ? "flex gap-4 items-start" : undefined}>
        <div className={isDesktop ? "w-1/2" : undefined}>
          <button
            onClick={() => setNewEventDate(new Date())}
            className="w-full mb-4 rounded-2xl bg-primary text-primary-foreground py-3 font-semibold flex items-center justify-center gap-2"
          >
            <Plus size={18} /> {t(lang, "newEvent")}
          </button>

          <div className="rounded-2xl bg-card border border-border p-4 mb-4">
            <div className="flex items-center justify-between mb-3">
              <button
                onClick={() => setCursor(new Date(year, month - 1, 1))}
                className="p-2 rounded-full hover:bg-secondary"
              >
                <ChevronLeft size={18} />
              </button>
              <p className="text-sm font-semibold capitalize">{monthName}</p>
              <button
                onClick={() => setCursor(new Date(year, month + 1, 1))}
                className="p-2 rounded-full hover:bg-secondary"
              >
                <ChevronRight size={18} />
              </button>
            </div>
            <div className="grid grid-cols-7 gap-1 text-center text-[10px] uppercase tracking-widest text-muted-foreground mb-2">
              {weekDays.map((d) => (
                <div key={d}>{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: offset }).map((_, i) => (
                <div key={"e" + i} />
              ))}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const d = i + 1;
                const evs = byDay.get(d) ?? [];
                return (
                  <button
                    key={d}
                    onClick={() => setNewEventDate(new Date(year, month, d, 9, 0))}
                    className={`aspect-square rounded-lg flex flex-col items-center justify-start pt-1 text-xs ${
                      isToday(d)
                        ? "bg-primary text-primary-foreground font-semibold"
                        : evs.length > 0
                          ? "bg-accent/15 border border-accent/30"
                          : "hover:bg-secondary/50"
                    }`}
                  >
                    <span>{d}</span>
                    {evs.length > 0 && (
                      <span
                        className={`mt-0.5 w-1 h-1 rounded-full ${
                          isToday(d) ? "bg-primary-foreground" : "bg-primary"
                        }`}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className={isDesktop ? "w-1/2" : undefined}>
          {newEventDate && (
            <NewEventForm lang={lang} defaultDate={newEventDate} onClose={() => setNewEventDate(null)} />
          )}

          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-2">
            {lang === "id" ? "Akan datang" : "Upcoming"}
          </h3>
          {upcomingSelected.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-6">{t(lang, "empty")}</p>
          ) : (
            <ul className="space-y-2">
              {upcomingSelected.map((e, i) => (
                <li
                  key={i}
                  className="rounded-2xl bg-card border border-border p-3 flex items-center gap-3"
                >
                  <div className="w-1 self-stretch rounded-full bg-primary" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">{e.title}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {new Date(e.when).toLocaleString()} · {e.kind}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </AppShell>
  );
}

const EVENT_TYPES: Extract<ItemType, "task" | "meeting" | "appointment" | "event">[] = ["task", "meeting", "appointment", "event"];

function toLocalInputValue(d: Date) {
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

function NewEventForm({
  lang,
  defaultDate,
  onClose,
}: {
  lang: "en" | "id";
  defaultDate: Date;
  onClose: () => void;
}) {
  const [type, setType] = useState<Extract<ItemType, "task" | "meeting" | "appointment" | "event">>("task");
  const [title, setTitle] = useState("");
  const [when, setWhen] = useState(toLocalInputValue(defaultDate));

  async function save() {
    if (!title.trim()) return;
    await saveCapturedEntry(
      { type, title: title.trim(), when: when ? new Date(when).getTime() : undefined },
      lang,
    );
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-background/80 backdrop-blur p-4">
      <div className="w-full max-w-md rounded-2xl bg-card border border-primary/30 p-4 shadow-2xl">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold text-primary">{t(lang, "newEvent")}</p>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-secondary text-muted-foreground">
            <X size={16} />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2 mb-3">
          {EVENT_TYPES.map((tp) => (
            <button
              key={tp}
              onClick={() => setType(tp)}
              className={`rounded-xl px-3 py-2 text-xs font-semibold border transition-colors ${
                type === tp ? "bg-primary text-primary-foreground border-primary" : "bg-secondary text-secondary-foreground border-border"
              }`}
            >
              {t(lang, tp)}
            </button>
          ))}
        </div>

        <label className="block text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          {t(lang, "title")}
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            autoFocus
            className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground font-normal normal-case tracking-normal"
          />
        </label>

        <label className="block text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
          {t(lang, "eventDate")}
          <input
            type="datetime-local"
            value={when}
            onChange={(e) => setWhen(e.target.value)}
            className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground font-normal normal-case tracking-normal"
          />
        </label>

        <div className="flex gap-2 mt-4">
          <button onClick={onClose} className="flex-1 py-2 rounded-full bg-secondary text-secondary-foreground text-sm font-semibold">
            {t(lang, "cancel")}
          </button>
          <button onClick={save} className="flex-1 py-2 rounded-full bg-primary text-primary-foreground text-sm font-semibold">
            {t(lang, "save")}
          </button>
        </div>
      </div>
    </div>
  );
}
