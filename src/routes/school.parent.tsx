import { createFileRoute } from "@tanstack/react-router";
import { useParentCode } from "@/lib/school-store";
import { ParentDashboard, NotSignedIn, ParentProfileGate } from "@/components/school/dashboards";

export const Route = createFileRoute("/school/parent")({
  head: () => ({
    meta: [
      { title: "Orangtua — School Dashboard" },
      { name: "description", content: "Pantau aktivitas harian, kalender, timetable, assessment dan kehadiran anak Anda." },
      { property: "og:title", content: "Orangtua — School Dashboard" },
      { property: "og:description", content: "Pantau aktivitas harian, kalender, timetable, assessment dan kehadiran anak Anda." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ParentPage,
});

function ParentPage() {
  const code = useParentCode();
  if (!code) return <NotSignedIn />;
  return (
    <ParentProfileGate code={code}>
      <ParentDashboard code={code} />
    </ParentProfileGate>
  );
}
