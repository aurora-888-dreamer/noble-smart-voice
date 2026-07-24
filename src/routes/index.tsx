import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Plane, GanttChart, NotebookPen, MessageSquare, Calculator, Languages, Camera, MessageCircle, Mail, Music2, Instagram, Facebook, Globe, ExternalLink, StickyNote, CheckSquare, Calendar as CalendarIcon, Video, CalendarClock, Users, BellRing, Crown, GraduationCap } from "lucide-react";
import { useEnabledShortcuts } from "@/lib/app-shortcuts-store";
import { AppShell } from "@/components/AppShell";
import { getDb } from "@/lib/db";
import { useLang } from "@/lib/settings-store";
import { t } from "@/lib/i18n";
import { isOnboarded } from "@/lib/settings-store";
import { isRegistered, isSignedIn, ensureTrialStarted, useLicenseInfo } from "@/lib/auth-store";
import { usePlugin } from "@/lib/plugins-store";
import { rehydrateReminders } from "@/lib/reminders";

export const Route = createFileRoute("/")({
  component: Home,
});

function Home() {
  const [lang] = useLang();
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const license = useLicenseInfo();
  const shortcuts = useEnabledShortcuts();
  const hasSchool = usePlugin("school");
  const isAdmin = license.code === "NOBLE440077";

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
    ensureTrialStarted();
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

  const CATEGORY_TILES = [
    { to: "/notes", label: t(lang, "notes"), Icon: StickyNote },
    { to: "/tasks", label: t(lang, "tasks"), Icon: CheckSquare },
    { to: "/calendar", label: t(lang, "calendar"), Icon: CalendarIcon },
    { to: "/meetings", label: t(lang, "meetings"), Icon: Video },
    { to: "/appointments", label: t(lang, "appointments"), Icon: CalendarClock },
    { to: "/contacts", label: t(lang, "contacts"), Icon: Users },
    { to: "/reminders", label: t(lang, "reminders"), Icon: BellRing },
    { to: "/diary", label: t(lang, "diary"), Icon: NotebookPen },
    { to: "/messages", label: t(lang, "messages"), Icon: MessageSquare },
    { to: "/trips", label: t(lang, "trips"), Icon: Plane },
    { to: "/projects", label: t(lang, "projects"), Icon: GanttChart },
  ] as const;

  return (
    <AppShell title={t(lang, "home")}>
      {license.tier !== "premium" && (
        <Link
          to="/upgrade"
          className="mb-4 flex items-center justify-between gap-3 rounded-2xl border border-primary/40 bg-gradient-to-br from-primary/15 to-primary/5 p-4 hover:opacity-90"
        >
          <div className="flex items-center gap-3 min-w-0">
            <Crown size={20} className="text-primary shrink-0" />
            <div className="min-w-0">
              <div className="text-sm font-semibold truncate">
                {lang === "id" ? "Upgrade ke Premium" : "Upgrade to Premium"}
              </div>
              <div className="text-xs text-muted-foreground truncate">
                {lang === "id" ? "Lihat paket & kode grup khusus" : "See plans & apply your group code"}
              </div>
            </div>
          </div>
          <span className="text-xs text-primary font-semibold shrink-0">
            {lang === "id" ? "Buka →" : "Open →"}
          </span>
        </Link>
      )}

      {(hasSchool || isAdmin) && (
        <Link
          to="/school"
          className="mb-4 flex items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4 hover:opacity-90"
        >
          <div className="flex items-center gap-3 min-w-0">
            <GraduationCap size={20} className="text-primary shrink-0" />
            <div className="min-w-0">
              <div className="text-sm font-semibold truncate">School Dashboard</div>
              <div className="text-xs text-muted-foreground truncate">
                Kindergarten · Teacher / Parent / Principal
              </div>
            </div>
          </div>
          <span className="text-xs text-primary font-semibold shrink-0">Open →</span>
        </Link>
      )}

      <h2 className="mb-4 text-xl font-semibold">{t(lang, "dailyActivities")}</h2>

      <MarqueeSection
        title={t(lang, "todaysTasks")}
        href="/tasks"
        lang={lang}
        items={(tasksToday ?? []).map((task) => `${task.title}${task.dueAt ? " · " + new Date(task.dueAt).toLocaleString() : ""}`)}
      />

      <MarqueeSection
        title={t(lang, "upcomingMeetings")}
        href="/meetings"
        lang={lang}
        items={(upcomingMeetings ?? []).map((m) => `${m.title}${m.meetingAt ? " · " + new Date(m.meetingAt).toLocaleString() : ""}`)}
      />

      <MarqueeSection
        title={t(lang, "recentNotes")}
        href="/notes"
        lang={lang}
        items={(recentNotes ?? []).map((n) => n.title)}
      />

      <MarqueeSection
        title={t(lang, "activeReminders")}
        href="/reminders"
        lang={lang}
        items={(reminders ?? []).slice(0, 8).map((r) => `${r.label} · ${new Date(r.remindAt).toLocaleString()}`)}
        accent
      />

      <section className="mb-6 grid grid-cols-3 gap-3 lg:hidden">
        {CATEGORY_TILES.map(({ to, label, Icon }) => (
          <Link
            key={to}
            to={to}
            className="rounded-2xl bg-card border border-border p-3 flex flex-col items-center gap-2 text-center active:scale-[0.98] transition-transform"
          >
            <Icon size={22} className="text-primary" />
            <p className="text-xs font-semibold leading-tight">{label}</p>
          </Link>
        ))}
      </section>

      {shortcuts.length > 0 && (
        <section className="mb-6">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
            {lang === "id" ? "Pintasan Aplikasi" : "App Shortcuts"}
          </h3>
          <div className="flex flex-wrap gap-3">
            {shortcuts.map((s) => (
              <a
                key={s.id}
                href={s.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-center gap-1.5 w-16"
              >
                <span className="grid place-items-center w-12 h-12 rounded-2xl bg-card border border-border text-primary active:scale-95 transition-transform">
                  {shortcutIcon(s.id)}
                </span>
                <span className="text-[10px] text-muted-foreground text-center truncate w-full">
                  {lang === "id" ? s.nameId : s.name}
                </span>
              </a>
            ))}
          </div>
        </section>
      )}
    </AppShell>
  );
}

function MarqueeSection({
  title,
  href,
  items,
  lang: _lang,
  accent,
}: {
  title: string;
  href: "/tasks" | "/meetings" | "/notes" | "/reminders";
  items: string[];
  lang: string;
  accent?: boolean;
}) {
  const [paused, setPaused] = useState(false);

  return (
    <section className="mb-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">{title}</h3>
        <Link to={href} className="text-xs text-primary font-medium">
          →
        </Link>
      </div>
      {items.length === 0 ? (
        <Empty label="—" />
      ) : (
        <Link
          to={href}
          onTouchStart={() => setPaused(true)}
          onTouchEnd={() => setPaused(false)}
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          className={`block overflow-hidden rounded-2xl border py-2.5 ${
            accent ? "bg-accent/15 border-accent/30" : "bg-card border-border"
          }`}
        >
          <div className={`flex whitespace-nowrap marquee-track ${paused ? "marquee-paused" : ""}`}>
            {[...items, ...items].map((text, i) => (
              <span key={i} className="text-sm px-4 shrink-0">
                {text}
              </span>
            ))}
          </div>
        </Link>
      )}
    </section>
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

function shortcutIcon(id: string) {
  switch (id) {
    case "whatsapp": return <MessageCircle size={20} />;
    case "email": return <Mail size={20} />;
    case "tiktok": return <Music2 size={20} />;
    case "instagram": return <Instagram size={20} />;
    case "facebook": return <Facebook size={20} />;
    case "browser": return <Globe size={20} />;
    default: return <ExternalLink size={20} />;
  }
}

function Empty({ label }: { label: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
      {label}
    </div>
  );
}

