import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Plane, GanttChart, NotebookPen, Mic, MessageSquare, Calculator, Languages, Camera, MessageCircle, Mail, Music2, Instagram, Facebook, Globe, ExternalLink, StickyNote, CheckSquare, Calendar as CalendarIcon, Video, CalendarClock, Users, BellRing, Wifi } from "lucide-react";
import { usePlugin } from "@/lib/plugins-store";
import { useEnabledShortcuts } from "@/lib/app-shortcuts-store";
import { AppShell } from "@/components/AppShell";
import { getDb } from "@/lib/db";
import { useLang } from "@/lib/settings-store";
import { t } from "@/lib/i18n";
import { isOnboarded } from "@/lib/settings-store";
import { isRegistered, isSignedIn, ensureTrialStarted } from "@/lib/auth-store";
import { rehydrateReminders } from "@/lib/reminders";
import { CalculatorWidget } from "@/components/CalculatorWidget";
import { PhotoCaptureFlow } from "@/components/PhotoCaptureFlow";
import { PhotoCarousel } from "@/components/PhotoCarousel";
import { translateText } from "@/lib/ai.functions";

export const Route = createFileRoute("/")({
  component: Home,
});

function Home() {
  const [lang] = useLang();
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const hasCalculator = usePlugin("calculator");
  const hasTranslator = usePlugin("translator");
  const hasCamera = usePlugin("camera");
  const shortcuts = useEnabledShortcuts();

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
    { to: "/sync", label: lang === "id" ? "Sinkronisasi" : "Sync", Icon: Wifi },
  ] as const;

  const headerExtra = (
    <div className="flex items-center gap-1.5 lg:hidden">
      {hasCamera && (
        <Link
          to="/camera"
          aria-label="Camera"
          className="grid place-items-center w-10 h-10 rounded-full border border-border text-muted-foreground active:scale-95"
        >
          <Camera size={19} />
        </Link>
      )}
      {hasCalculator && (
        <Link
          to="/calculator"
          aria-label="Calculator"
          className="grid place-items-center w-10 h-10 rounded-full border border-border text-muted-foreground active:scale-95"
        >
          <Calculator size={19} />
        </Link>
      )}
      {hasTranslator && (
        <Link
          to="/translate"
          aria-label="Translator"
          className="grid place-items-center w-10 h-10 rounded-full border border-border text-muted-foreground active:scale-95"
        >
          <Languages size={19} />
        </Link>
      )}
    </div>
  );

  return (
    <AppShell title={t(lang, "home")} headerExtra={headerExtra}>
      <h2 className="mb-3 text-xl font-semibold">{t(lang, "dailyActivities")}</h2>

      <button
        onClick={() => navigate({ to: "/record" })}
        className="w-full mb-5 rounded-2xl bg-primary text-primary-foreground py-3.5 font-semibold flex items-center justify-center gap-2 active:scale-[0.98] transition-transform shadow-md shadow-primary/20"
      >
        <Mic size={18} /> {lang === "id" ? "Rekam Sekarang" : "Record Now"}
      </button>

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

      {(hasCalculator || hasTranslator || hasCamera) && (
        <DesktopToolsPanel
          lang={lang}
          hasCalculator={hasCalculator}
          hasTranslator={hasTranslator}
          hasCamera={hasCamera}
        />
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

function DesktopToolsPanel({
  lang,
  hasCalculator,
  hasTranslator,
  hasCamera,
}: {
  lang: "en" | "id";
  hasCalculator: boolean;
  hasTranslator: boolean;
  hasCamera: boolean;
}) {
  return (
    <section className="hidden lg:grid grid-cols-2 gap-4 mt-2 mb-6">
      {hasCalculator && (
        <div className="rounded-2xl bg-card border border-border p-4">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            {lang === "id" ? "Kalkulator" : "Calculator"}
          </h3>
          <CalculatorWidget />
        </div>
      )}
      {hasTranslator && <DesktopTranslatorCard lang={lang} />}
      {hasCamera && (
        <div className="rounded-2xl bg-card border border-border p-4 col-span-2">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            {lang === "id" ? "Kamera & Galeri" : "Camera & Gallery"}
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <PhotoCaptureFlow />
            <div>
              <PhotoCarouselGrid />
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function PhotoCarouselGrid() {
  return (
    <div className="max-h-[26rem] overflow-y-auto">
      <PhotoCarousel />
    </div>
  );
}

function DesktopTranslatorCard({ lang }: { lang: "en" | "id" }) {
  const [text, setText] = useState("");
  const [targetLang, setTargetLang] = useState(lang === "id" ? "English" : "Bahasa Indonesia");
  const [result, setResult] = useState("");
  const [busy, setBusy] = useState(false);

  async function run() {
    if (!text.trim()) return;
    setBusy(true);
    try {
      const res = await translateText({ data: { text, targetLang } });
      setResult(res.ok ? res.text : res.error);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-2xl bg-card border border-border p-4">
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
        {lang === "id" ? "Penerjemah" : "Translator"}
      </h3>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={3}
        placeholder={lang === "id" ? "Ketik teks…" : "Type text…"}
        className="w-full rounded-xl bg-secondary text-secondary-foreground px-3 py-2 text-sm resize-none mb-2"
      />
      <div className="flex gap-2 mb-2">
        <select
          value={targetLang}
          onChange={(e) => setTargetLang(e.target.value)}
          className="flex-1 rounded-lg bg-secondary text-secondary-foreground px-2 py-1.5 text-xs"
        >
          {["English", "Bahasa Indonesia", "Spanish", "Mandarin Chinese", "Japanese", "Arabic", "French", "German"].map((l) => (
            <option key={l} value={l}>{l}</option>
          ))}
        </select>
        <button onClick={run} disabled={busy} className="rounded-lg bg-primary text-primary-foreground px-3 py-1.5 text-xs font-semibold disabled:opacity-40">
          {lang === "id" ? "Terjemahkan" : "Translate"}
        </button>
      </div>
      {result && <p className="text-sm whitespace-pre-wrap leading-relaxed">{result}</p>}
    </div>
  );
}