import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { usePlugin } from "@/lib/plugins-store";
import { useLicenseInfo } from "@/lib/auth-store";
import { getSchoolId } from "@/lib/school.functions";
import { SchoolTools } from "@/components/SchoolTools";


export const Route = createFileRoute("/school")({
  head: () => ({
    meta: [
      { title: "School Dashboard — Noble Smart Voice" },
      { name: "description", content: "Dashboard sekolah untuk Head of School, Admin, Principal, Guru dan Orangtua." },
      { property: "og:title", content: "School Dashboard — Noble Smart Voice" },
      { property: "og:description", content: "Dashboard sekolah untuk Head of School, Admin, Principal, Guru dan Orangtua." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SchoolLayout,
});

function SchoolLayout() {
  const hasPlugin = usePlugin("school");
  const license = useLicenseInfo();
  const isAdmin = license.code === "NOBLE440077" || license.tier === "premium";
  const [schoolId, setSchoolId] = useState<string | null>(null);

  useEffect(() => {
    getSchoolId().then((res) => {
      if (res.id) {
        sessionStorage.setItem("noble.school.id", res.id);
        setSchoolId(res.id);
      } else {
        setSchoolId("");
      }
    });
  }, []);

  if (!hasPlugin && !isAdmin) {
    return (
      <AppShell title="School Dashboard" fullWidth>
        <div className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          Plugin School Dashboard belum aktif.
          <div className="mt-3"><Link to="/upgrade" className="rounded-xl bg-primary text-primary-foreground px-4 py-2 text-xs font-semibold">Upgrade / Enable</Link></div>
        </div>
      </AppShell>
    );
  }
  if (schoolId === null) return null;
  if (!schoolId) {
    return (
      <AppShell title="School Dashboard" fullWidth>
        <div className="rounded-2xl border border-dashed border-destructive/40 bg-destructive/5 p-6 text-center text-sm">
          <p className="font-semibold text-destructive mb-1">Setup belum selesai</p>
          <p className="text-muted-foreground">Secret <code className="font-mono">SCHOOL_ID</code> belum diisi.</p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title="School Dashboard" fullWidth headerExtra={<SchoolTools />}>
      <Outlet />
    </AppShell>
  );
}

