import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { usePlugin } from "@/lib/plugins-store";
import { useLicenseInfo } from "@/lib/auth-store";
import { useLang } from "@/lib/settings-store";
import { tp } from "@/lib/pmd-i18n";

export const Route = createFileRoute("/pmd")({
  head: () => ({
    meta: [
      { title: "Project Management Dashboard — Noble Smart Voice" },
      { name: "description", content: "Plan, track and document projects: contacts, vendors, budgets, files and approval timelines." },
      { property: "og:title", content: "Project Management Dashboard — Noble Smart Voice" },
      { property: "og:description", content: "Plan, track and document projects: contacts, vendors, budgets, files and approval timelines." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PmdLayout,
});

function PmdLayout() {
  const [lang] = useLang();
  const hasPlugin = usePlugin("pmd");
  const license = useLicenseInfo();
  const isAdmin = license.code === "NOBLE440077" || license.tier === "premium";

  if (!hasPlugin && !isAdmin) {
    return (
      <AppShell title={tp(lang, "title")} fullWidth>
        <div className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          {lang === "id"
            ? "Plugin Manajemen Proyek belum aktif."
            : "The Project Management plugin is not active yet."}
          <div className="mt-3">
            <Link to="/upgrade" className="rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground">
              {lang === "id" ? "Upgrade / Aktifkan" : "Upgrade / Enable"}
            </Link>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title={tp(lang, "title")} fullWidth>
      <Outlet />
    </AppShell>
  );
}
