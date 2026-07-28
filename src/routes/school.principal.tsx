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
  const { session, ready } = useSchoolSession();
  if (!ready) return null;
  if (!session || session.kind !== "staff" || !["principal", "vice_principal", "admin_principal"].includes(session.role ?? "")) return <NotSignedIn />;
  return (
    <div>
      <StaffHeader session={session} />
      <PrincipalDashboard division={session.division || "kindergarten"} staffId={session.id} staffName={session.name} />
    </div>
  );
}
