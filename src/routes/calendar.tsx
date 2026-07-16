import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { getDb } from "@/lib/db";
import { useLang } from "@/lib/settings-store";
import { t } from "@/lib/i18n";

export const Route = createFileRoute("/calendar")({
  head: () => ({ meta: [{ title: "Calendar — Noble" }] }),
  component: CalendarPage,
});

interface DayEvent {
  when: number;
  title: string;
  kind: "task" | "meeting" | "appointment" | "reminder";
}

function CalendarPage() {
  const [lang] = useLang();
  const [cursor, setCursor] = useState(() => new Date());

  const events = useLiveQuery<DayEvent[]>(async () => {
    if (typeof window === "undefined") return [];
    const db = getDb();
    const [tasks, meetings, appointments, reminders] = await Promise.all([
      db.tasks.toArray(),
      db.meetings.toArray(),
      db.appointments.toArray(),
      db.reminders.toArray(),
    ]);
    const out: DayEvent[] = [];
    tasks.forEach((x) => x.dueAt && out.push({ when: x.dueAt, title: x.title, kind: "task" }));
    meetings.forEach((x) => x.meetingAt && out.push({ when: x.meetingAt, title: x.title, kind: "meeting" }));
    appointments.forEach((x) => out.push({ when: x.appointmentAt, title: x.title, kind: "appointment" }));
    reminders.forEach((x) => out.push({ when: x.remindAt, title: x.label, kind: "reminder" }));
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

  return (
    <AppShell title={t(lang, "calendar")}>
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
              <div
                key={d}
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
              </div>
            );
          })}
        </div>
      </div>

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
    </AppShell>
  );
}
