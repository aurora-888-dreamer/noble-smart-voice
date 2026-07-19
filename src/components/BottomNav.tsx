import { Link, useRouterState } from "@tanstack/react-router";
import { BookOpen, Wifi, Download, FileText, ShieldCheck } from "lucide-react";
import { useLang } from "@/lib/settings-store";
import { t } from "@/lib/i18n";

export function BottomNav() {
  const [lang] = useLang();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const items = [
    { to: "/sync", label: lang === "id" ? "Sinkron" : "Sync", Icon: Wifi },
    { to: "/backup", label: "Backup", Icon: Download },
    { to: "/guide", label: t(lang, "guide"), Icon: BookOpen },
    { to: "/terms", label: "T&C", Icon: FileText },
    { to: "/privacy", label: "PP", Icon: ShieldCheck },
  ] as const;
  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 border-t border-border bg-card/95 backdrop-blur pb-[env(safe-area-inset-bottom)]">
      <ul className="mx-auto max-w-md grid grid-cols-5">
        {items.map(({ to, label, Icon }) => {
          const active = pathname.startsWith(to);
          return (
            <li key={to} className="min-w-0">
              <Link
                to={to}
                className={`flex flex-col items-center gap-1 py-2.5 px-0.5 text-[10px] transition-colors ${
                  active ? "text-primary" : "text-muted-foreground"
                }`}
              >
                <Icon size={20} strokeWidth={active ? 2.4 : 1.8} />
                <span className="leading-none truncate w-full text-center">{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
