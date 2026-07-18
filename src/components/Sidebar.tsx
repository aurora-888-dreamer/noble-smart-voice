import { Link, useRouterState } from "@tanstack/react-router";
import {
  Home,
  CheckSquare,
  Calendar as CalendarIcon,
  BookOpen,
  Users,
  Settings as SettingsIcon,
  StickyNote,
  Video,
  CalendarClock,
  BellRing,
  Plane,
  GanttChart,
  Mic,
  Wifi,
  NotebookPen,
} from "lucide-react";
import { useLang } from "@/lib/settings-store";
import { t } from "@/lib/i18n";

export function Sidebar() {
  const [lang] = useLang();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const items = [
    { to: "/", label: t(lang, "home"), Icon: Home },
    { to: "/calendar", label: t(lang, "calendar"), Icon: CalendarIcon },
    { to: "/tasks", label: t(lang, "tasks"), Icon: CheckSquare },
    { to: "/notes", label: t(lang, "notes"), Icon: StickyNote },
    { to: "/diary", label: t(lang, "diary"), Icon: NotebookPen },
    { to: "/meetings", label: t(lang, "meetings"), Icon: Video },
    { to: "/appointments", label: t(lang, "appointments"), Icon: CalendarClock },
    { to: "/contacts", label: t(lang, "contacts"), Icon: Users },
    { to: "/reminders", label: t(lang, "reminders"), Icon: BellRing },
    { to: "/trips", label: t(lang, "trips"), Icon: Plane },
    { to: "/projects", label: t(lang, "projects"), Icon: GanttChart },
  ] as const;

  const bottomItems = [
    { to: "/guide", label: t(lang, "guide"), Icon: BookOpen },
    { to: "/settings", label: t(lang, "settings"), Icon: SettingsIcon },
  ] as const;

  return (
    <nav className="hidden lg:flex flex-col w-60 shrink-0 h-dvh sticky top-0 border-r border-border bg-card/40 px-3 py-5">
      <div className="px-2 mb-6">
        <span className="text-xs font-semibold uppercase tracking-widest text-primary">Noble</span>
      </div>

      <Link
        to="/record"
        className="mb-4 flex items-center gap-2 rounded-xl bg-primary text-primary-foreground px-3 py-2.5 text-sm font-semibold active:scale-[0.98] transition-transform"
      >
        <Mic size={16} /> {lang === "id" ? "Rekam" : "Record"}
      </Link>

      <ul className="flex-1 space-y-0.5 overflow-y-auto">
        {items.map(({ to, label, Icon }) => {
          const active = to === "/" ? pathname === "/" : pathname.startsWith(to);
          return (
            <li key={to}>
              <Link
                to={to}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                  active ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                }`}
              >
                <Icon size={16} strokeWidth={active ? 2.4 : 1.8} />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>

      <div className="pt-2 mt-2 border-t border-border space-y-0.5">
        <Link
          to="/sync"
          className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
            pathname === "/sync" ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:bg-secondary hover:text-foreground"
          }`}
        >
          <Wifi size={16} strokeWidth={pathname === "/sync" ? 2.4 : 1.8} />
          {lang === "id" ? "Sinkronisasi" : "Sync"}
        </Link>
        {bottomItems.map(({ to, label, Icon }) => {
          const active = pathname.startsWith(to);
          return (
            <Link
              key={to}
              to={to}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                active ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              }`}
            >
              <Icon size={16} strokeWidth={active ? 2.4 : 1.8} />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
