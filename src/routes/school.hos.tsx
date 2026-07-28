import { createFileRoute } from "@tanstack/react-router";
import { useSchoolSession } from "@/lib/school-store";
import { HosDashboard, StaffHeader, NotSignedIn } from "@/components/school/dashboards";

export const Route = createFileRoute("/school/hos")({
  head: () => ({
    meta: [
      { title: "Head of School — School Dashboard" },
      { name: "description", content: "Overview sekolah, kelola staff & role, dan approval akhir Project & Surat Resmi." },
      { property: "og:title", content: "Head of School — School Dashboard" },
      { property: "og:description", content: "Overview sekolah, kelola staff & role, dan approval akhir Project & Surat Resmi." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: HosPage,
});

function HosPage() {
  const { teacherDevice, teacherUnlocked, ready } = useSchoolSession();
  if (!ready) return null;
  if (!teacherDevice || !teacherUnlocked || teacherDevice.role !== "hos") return <NotSignedIn />;
  return (
    <div>
      <StaffHeader device={teacherDevice} />
      <HosDashboard />
    </div>
  );
}
