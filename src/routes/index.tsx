import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Mic, Plane, GanttChart } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { getDb } from "@/lib/db";
import { useLang } from "@/lib/settings-store";
import { t } from "@/lib/i18n";
import { isOnboarded } from "@/lib/settings-store";
import { isRegistered, isSignedIn } from "@/lib/auth-store";
import { rehydrateReminders } from "@/lib/reminders";

export const Route = createFileRoute("/")({
  component: Home,
});

function Home() {
  const [lang] = useLang();
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!isOnboarded()) {
      navigate({ to: "/onboarding" });
      return;
    }
    if (!isRegistered()) {
      navigate({ to: "/register" });
      return;
    }
    if (!isSignedIn()) {
      navigate({ to: "/login" });
      return;
    }
    setReady(true);
    rehydrateReminders();
  }, [navigate]);

  const tasksToday = useLiveQuery(async () => {
    if (typeof window === "undefined") return [];
    const db = getDb();
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    return db.tasks
      .where("status")
      .equals("open")
      .and((t) => !t.dueAt || t.dueAt <= end.getTime())
      .limit(5)
      .toArray();
  }, []);

  const upcomingMeetings = useLiveQuery(async () => {
    if (typeof window === "undefined") return [];
    const db = getDb();
    const now = Date.now();
    return db.meetings
      .filter((m) => !m.meetingAt || m.meetingAt >= now)
      .limit(3)
      .toArray();
  }, []);

  const recentNotes = useLiveQuery(async () => {
    if (typeof window === "undefined") return [];
    const db = getDb();
    return db.notes.orderBy("createdAt").reverse().limit(3).toArray();
  }, []);

  const reminders = useLiveQuery(async () => {
    if (typeof window === "undefined") return [];
    const db = getDb();
    return db.reminders.where("status").equals("pending").sortBy("remindAt");
  }, []);

  if (!ready) return null;

  return (
    <AppShell title={t(lang, "home")}>
      <section className="mb-6 rounded-3xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground p-6 shadow-lg shadow-primary/20">
        <p className="text-sm/5 opacity-90">{t(lang, "tagline")}</p>
        <h2 className="mt-1 text-2xl font-semibold">{t(lang, "tapToSpeak")}</h2>
        <p className="mt-3 text-sm/5 opacity-90 flex items-center gap-2">
          <Mic size={16} />
          {lang === "id"
            ? "Ketuk tombol mic di kanan-atas kapan saja — apa yang Anda ucapkan tersimpan di menu yang sedang terbuka."
            : "Tap the mic top-right anytime — what you say saves into the menu you're on."}
        </p>
      </section>


      <Section title={t(lang, "todaysTasks")} href="/tasks" lang={lang}>
        {tasksToday && tasksToday.length > 0 ? (
          <ul className="space-y-2">
            {tasksToday.map((task) => (
              <li key={task.id} className="rounded-2xl bg-card border border-border p-3">
                <p className="text-sm font-medium">{task.title}</p>
                {task.dueAt && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {new Date(task.dueAt).toLocaleString()}
                  </p>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <Empty label={t(lang, "empty")} />
        )}
      </Section>

      <Section title={t(lang, "upcomingMeetings")} href="/meetings" lang={lang}>
        {upcomingMeetings && upcomingMeetings.length > 0 ? (
          <ul className="space-y-2">
            {upcomingMeetings.map((m) => (
              <li key={m.id} className="rounded-2xl bg-card border border-border p-3">
                <p className="text-sm font-medium">{m.title}</p>
                {m.meetingAt && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {new Date(m.meetingAt).toLocaleString()}
                  </p>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <Empty label={t(lang, "empty")} />
        )}
      </Section>

      <Section title={t(lang, "recentNotes")} href="/notes" lang={lang}>
        {recentNotes && recentNotes.length > 0 ? (
          <ul className="space-y-2">
            {recentNotes.map((n) => (
              <li key={n.id} className="rounded-2xl bg-card border border-border p-3">
                <p className="text-sm font-medium line-clamp-1">{n.title}</p>
                <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{n.transcript}</p>
              </li>
            ))}
          </ul>
        ) : (
          <Empty label={t(lang, "empty")} />
        )}
      </Section>

      <Section title={t(lang, "activeReminders")} href="/reminders" lang={lang}>
        {reminders && reminders.length > 0 ? (
          <ul className="space-y-2">
            {reminders.slice(0, 3).map((r) => (
              <li key={r.id} className="rounded-2xl bg-accent/20 border border-accent/40 p-3">
                <p className="text-sm font-medium">{r.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {new Date(r.remindAt).toLocaleString()}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <Empty label={t(lang, "empty")} />
        )}
      </Section>

      <section className="mb-6 grid grid-cols-2 gap-3">
        <Link
          to="/trips"
          className="rounded-2xl bg-card border border-border p-4 flex flex-col gap-2 active:scale-[0.98] transition-transform"
        >
          <Plane size={22} className="text-primary" />
          <p className="text-sm font-semibold">{t(lang, "trips")}</p>
        </Link>
        <Link
          to="/projects"
          className="rounded-2xl bg-card border border-border p-4 flex flex-col gap-2 active:scale-[0.98] transition-transform"
        >
          <GanttChart size={22} className="text-primary" />
          <p className="text-sm font-semibold">{t(lang, "projects")}</p>
        </Link>
      </section>
    </AppShell>
  );
}

function Section({
  title,
  href,
  children,
  lang: _lang,
}: {
  title: string;
  href: "/tasks" | "/meetings" | "/notes" | "/reminders";
  children: React.ReactNode;
  lang: string;
}) {
  return (
    <section className="mb-6">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          {title}
        </h3>
        <Link to={href} className="text-xs text-primary font-medium">
          →
        </Link>
      </div>
      {children}
    </section>
  );
}

function Empty({ label }: { label: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
      {label}
    </div>
  );
}
