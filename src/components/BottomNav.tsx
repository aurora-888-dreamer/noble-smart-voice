import { Link, useRouterState } from "@tanstack/react-router";
import {
  Home,
  CheckSquare,
  Users,
  Plane,
  GanttChart,
  Settings as SettingsIcon,
} from "lucide-react";
import { useLang } from "@/lib/settings-store";
import { t } from "@/lib/i18n";

export function BottomNav() {
  const [lang] = useLang();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const items = [
    { to: "/", label: t(lang, "home"), Icon: Home },
    { to: "/tasks", label: t(lang, "tasks"), Icon: CheckSquare },
    { to: "/trips", label: t(lang, "trips"), Icon: Plane },
    { to: "/projects", label: t(lang, "projects"), Icon: GanttChart },
    { to: "/contacts", label: t(lang, "contacts"), Icon: Users },
    { to: "/settings", label: t(lang, "settings"), Icon: SettingsIcon },
  ] as const;
  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 border-t border-border bg-card/95 backdrop-blur pb-[env(safe-area-inset-bottom)]">
      <ul className="mx-auto max-w-md grid grid-cols-6">
        {items.map(({ to, label, Icon }) => {
          const active = to === "/" ? pathname === "/" : pathname.startsWith(to);
          return (
            <li key={to}>
              <Link
                to={to}
                className={`flex flex-col items-center gap-1 py-2 text-[10px] transition-colors ${
                  active ? "text-primary" : "text-muted-foreground"
                }`}
              >
                <Icon size={20} strokeWidth={active ? 2.4 : 1.8} />
                <span className="leading-none">{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}