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
  MessageSquare,
  Calculator,
  Languages,
  Camera,
  Download,
  FileText,
  ShieldCheck,
  FolderKanban,
} from "lucide-react";
import { useLang } from "@/lib/settings-store";
import { usePlugin } from "@/lib/plugins-store";
import { t } from "@/lib/i18n";

export function Sidebar() {
  const [lang] = useLang();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const hasCalculator = usePlugin("calculator");
  const hasTranslator = usePlugin("translator");
  const hasCamera = usePlugin("camera");
  const hasPmd = usePlugin("pmd");

  // Primary categories — same set/order on every page (Home included), two columns.
  const items = [
    { to: "/", label: t(lang, "home"), Icon: Home },
    { to: "/calendar", label: t(lang, "calendar"), Icon: CalendarIcon },
    { to: "/tasks", label: t(lang, "tasks"), Icon: CheckSquare },
    { to: "/notes", label: t(lang, "notes"), Icon: StickyNote },
    { to: "/diary", label: t(lang, "diary"), Icon: NotebookPen },
    { to: "/messages", label: t(lang, "messages"), Icon: MessageSquare },
    { to: "/meetings", label: t(lang, "meetings"), Icon: Video },
    { to: "/appointments", label: t(lang, "appointments"), Icon: CalendarClock },
    { to: "/contacts", label: t(lang, "contacts"), Icon: Users },
    { to: "/reminders", label: t(lang, "reminders"), Icon: BellRing },
    { to: "/trips", label: t(lang, "trips"), Icon: Plane },
    { to: "/projects", label: t(lang, "projects"), Icon: GanttChart },
  ] as const;

  // Tools + utility links — same list/positions on every page, including Home
  // (no special inline cards on Home anymore; Sidebar is the one consistent
  // entry point everywhere).
  const toolItems = [
    ...(hasPmd ? [{ to: "/pmd", label: lang === "id" ? "Manajemen Proyek" : "Project Management", Icon: FolderKanban }] : []),
    ...(hasCamera ? [{ to: "/camera", label: lang === "id" ? "Kamera & Foto" : "Camera & Photos", Icon: Camera }] : []),
    ...(hasCalculator ? [{ to: "/calculator", label: lang === "id" ? "Kalkulator" : "Calculator", Icon: Calculator }] : []),
    ...(hasTranslator ? [{ to: "/translate", label: lang === "id" ? "Penerjemah" : "Translator", Icon: Languages }] : []),
    { to: "/sync", label: lang === "id" ? "Sinkronisasi" : "Sync", Icon: Wifi },
    { to: "/backup", label: lang === "id" ? "Cadangan Data" : "Backup", Icon: Download },
    { to: "/guide", label: t(lang, "guide"), Icon: BookOpen },
    { to: "/settings", label: t(lang, "settings"), Icon: SettingsIcon },
    { to: "/terms", label: lang === "id" ? "Syarat & Ketentuan" : "Terms & Conditions", Icon: FileText },
    { to: "/privacy", label: lang === "id" ? "Kebijakan Privasi" : "Privacy Policy", Icon: ShieldCheck },
  ] as const;

  function NavGrid({ list }: { list: readonly { to: string; label: string; Icon: typeof Home }[] }) {
    return (
      <ul className="grid grid-cols-2 gap-0.5">
        {list.map(({ to, label, Icon }) => {
          const active = to === "/" ? pathname === "/" : pathname.startsWith(to);
          return (
            <li key={to} className="min-w-0">
              <Link
                to={to}
                className={`flex items-center gap-2 rounded-lg px-2.5 py-2 text-[13px] transition-colors truncate ${
                  active ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                }`}
              >
                <Icon size={15} strokeWidth={active ? 2.4 : 1.8} className="shrink-0" />
                <span className="truncate">{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    );
  }

  return (
    <nav className="hidden md:flex flex-col w-72 shrink-0 h-dvh sticky top-0 border-r border-border bg-card/40 px-3 py-5">
      <div className="px-2 mb-6 flex items-baseline gap-2">
        <span className="text-lg font-semibold uppercase tracking-widest text-primary">Noble</span>
        <Link to="/store" className="text-[11px] text-muted-foreground hover:text-primary transition-colors">
          → Store
        </Link>
      </div>

      <Link
        to="/record"
        className="mb-4 flex items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground px-3 py-2.5 text-sm font-semibold active:scale-[0.98] transition-transform"
      >
        <Mic size={16} /> {lang === "id" ? "Rekam" : "Record"}
      </Link>

      <div className="flex-1 overflow-y-auto">
        <NavGrid list={items} />
        <div className="pt-2 mt-2 border-t border-border">
          <NavGrid list={toolItems} />
        </div>
      </div>
    </nav>
  );
}
