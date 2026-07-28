import { createFileRoute } from "@tanstack/react-router";
import { useSchoolSession } from "@/lib/school-store";
import { PrincipalDashboard, StaffHeader, NotSignedIn } from "@/components/school/dashboards";

export const Route = createFileRoute("/school/principal")({
  head: () => ({
    meta: [
      { title: "Principal — School Dashboard" },
      { name: "description", content: "Kelola guru dan murid satu divisi serta approval tahap pertama Project & Surat Resmi." },
      { property: "og:title", content: "Principal — School Dashboard" },
      { property: "og:description", content: "Kelola guru dan murid satu divisi serta approval tahap pertama Project & Surat Resmi." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PrincipalPage,
});

function PrincipalPage() {
  const { teacherDevice, teacherUnlocked, ready } = useSchoolSession();
  if (!ready) return null;
  if (!teacherDevice || !teacherUnlocked || teacherDevice.role !== "principal") return <NotSignedIn />;
  return (
    <div>
      <StaffHeader device={teacherDevice} />
      <PrincipalDashboard division={teacherDevice.division || "kindergarten"} />
    </div>
  );
}
