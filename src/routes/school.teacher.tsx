import { createFileRoute } from "@tanstack/react-router";
import { useSchoolSession } from "@/lib/school-store";
import { TeacherDashboard, StaffHeader, NotSignedIn, StaffProfileGate } from "@/components/school/dashboards";

const TEACHER_ROLES = ["teacher_homeroom", "teacher_subject", "teacher_shadow"];

export const Route = createFileRoute("/school/teacher")({
  head: () => ({
    meta: [
      { title: "Teacher — School Dashboard" },
      { name: "description", content: "Kelas, kalender, timetable, lesson plan, project, assessment, attendance dan pesan orangtua." },
      { property: "og:title", content: "Teacher — School Dashboard" },
      { property: "og:description", content: "Kelas, kalender, timetable, lesson plan, project, assessment, attendance dan pesan orangtua." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TeacherPage,
});

function TeacherPage() {
  const { session, ready } = useSchoolSession();
  if (!ready) return null;
  if (!session || session.kind !== "staff" || !TEACHER_ROLES.includes(session.role ?? "")) return <NotSignedIn />;
  return (
    <div>
      <StaffHeader session={session} />
      <StaffProfileGate session={session}>
        <TeacherDashboard staffId={session.id} staffName={session.name} role={session.role ?? null} defaultClassId={session.classId} />
      </StaffProfileGate>
    </div>
  );
}
