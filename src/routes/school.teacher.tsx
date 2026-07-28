import { createFileRoute } from "@tanstack/react-router";
import { useSchoolSession } from "@/lib/school-store";
import { TeacherDashboard, StaffHeader, NotSignedIn } from "@/components/school/dashboards";

const TEACHER_ROLES = ["teacher_homeroom", "teacher_shadow", "teacher_subject"];

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
  const { teacherDevice, teacherUnlocked, ready } = useSchoolSession();
  if (!ready) return null;
  if (!teacherDevice || !teacherUnlocked || !TEACHER_ROLES.includes(teacherDevice.role ?? "")) return <NotSignedIn />;
  return (
    <div>
      <StaffHeader device={teacherDevice} />
      <TeacherDashboard staffName={teacherDevice.name} role={teacherDevice.role ?? null} defaultClassId={teacherDevice.classId} />
    </div>
  );
}
