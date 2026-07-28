// Server-only helpers for the School academic modules (calendar, timetable,
// lesson plans, projects, assessments, attendance). Kept out of the
// *.functions.ts wrapper so that file stays a thin list of server functions.
import { createLovableSchoolSupabase } from "./supabase.server";

export type StaffTier = "admin" | "teacher";

export function checkSchoolPassword(password: string): StaffTier | null {
  if (password && password === (process.env.SCHOOL_ADMIN_PASSWORD || "")) return "admin";
  if (password && password === (process.env.SCHOOL_TEACHER_PASSWORD || "")) return "teacher";
  return null;
}

export function schoolId(): string {
  return process.env.SCHOOL_ID || "";
}

export type Client = NonNullable<ReturnType<typeof createLovableSchoolSupabase>>;

export function sb(): Client | null {
  return createLovableSchoolSupabase();
}

/** Staff gate — returns the client or an error shape. */
export function staffClient(password: string, requireAdmin = false):
  | { ok: true; supabase: Client; tier: StaffTier }
  | { ok: false; error: string } {
  const tier = checkSchoolPassword(password);
  if (!tier) return { ok: false, error: "Wrong password." };
  if (requireAdmin && tier !== "admin") return { ok: false, error: "Admin access required." };
  const supabase = sb();
  if (!supabase) return { ok: false, error: "Backend School belum dikonfigurasi." };
  return { ok: true, supabase, tier };
}

/** Parent gate — the invite code IS the credential; the student/class is
 * always resolved server-side from the code, never from client input. */
export async function parentScope(code: string): Promise<
  | { ok: true; supabase: Client; studentId: string; classId: string | null; studentName: string }
  | { ok: false; error: string }
> {
  const supabase = sb();
  if (!supabase) return { ok: false, error: "Backend School belum dikonfigurasi." };
  const { data: guardian, error } = await supabase
    .from("school_guardians")
    .select("student_id, school_students(id, class_id, full_name)")
    .eq("invite_code", code.trim().toUpperCase())
    .maybeSingle();
  if (error) return { ok: false, error: error.message };
  const student = (guardian as { school_students?: { id: string; class_id: string | null; full_name: string } } | null)
    ?.school_students;
  if (!guardian || !student) return { ok: false, error: "Kode tidak valid." };
  return { ok: true, supabase, studentId: student.id, classId: student.class_id, studentName: student.full_name };
}

export const PROJECT_STATUSES = ["draft", "diajukan_principal", "diajukan_hos", "disetujui", "ditolak"] as const;
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

/** Generates a draft narrative note from a competency checklist via Lovable AI. */
export async function generateNoteDraft(input: {
  studentName: string;
  subject: string;
  period: string;
  forms: { competency: string; achieved: boolean; rating: number | null }[];
}): Promise<{ ok: true; note: string } | { ok: false; error: string }> {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) return { ok: false, error: "AI belum dikonfigurasi." };
  const { createNobleAI } = await import("./ai-gateway.server");
  const { generateText } = await import("ai");
  const lines = input.forms
    .map((f) => `- ${f.competency}: ${f.achieved ? "tercapai" : "belum tercapai"}${f.rating ? ` (nilai ${f.rating}/5)` : ""}`)
    .join("\n");
  try {
    const gateway = createNobleAI(key);
    const { text } = await generateText({
      model: gateway("google/gemini-3.6-flash"),
      prompt:
        `Tulis catatan penilaian singkat (3-5 kalimat) untuk rapor murid bernama ${input.studentName}, ` +
        `mata pelajaran ${input.subject}, periode ${input.period}. Gunakan bahasa Indonesia yang hangat, ` +
        `positif, dan konkret untuk orangtua. Sebutkan kekuatan dan satu saran perkembangan.\n\nChecklist:\n${lines}`,
    });
    return { ok: true, note: text.trim() };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "AI gagal membuat catatan." };
  }
}
