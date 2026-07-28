import { createFileRoute } from "@tanstack/react-router";
import { useSchoolSession } from "@/lib/school-store";
import { AdminHosDashboard, StaffHeader, NotSignedIn } from "@/components/school/dashboards";

export const Route = createFileRoute("/school/admin-hos")({
  head: () => ({
    meta: [
      { title: "Admin HoS — School Dashboard" },
      { name: "description", content: "Import data kelas, guru dan murid, kelola staff serta pengumuman sekolah." },
      { property: "og:title", content: "Admin HoS — School Dashboard" },
      { property: "og:description", content: "Import data kelas, guru dan murid, kelola staff serta pengumuman sekolah." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminHosPage,
});

function AdminHosPage() {
  const { session, ready } = useSchoolSession();
  if (!ready) return null;
  if (!session || session.kind !== "staff" || session.role !== "admin_hos") return <NotSignedIn />;
  return (
    <div>
      <StaffHeader session={session} />
      <AdminHosDashboard />
    </div>
  );
}
