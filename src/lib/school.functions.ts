import { createServerFn } from "@tanstack/react-start";
import { createNobleSupabase } from "./supabase.server";

export type SchoolRole = "hos" | "principal" | "teacher_homeroom" | "teacher_shadow" | "teacher_subject";
export type StaffTier = "admin" | "teacher";

export type SchoolError = { ok: false; error: string };
export type SchoolClass = { id: string; name: string; division?: string; level?: string | null };
export type SchoolStaff = { id: string; full_name: string; role: SchoolRole; division?: string; class_id?: string | null; email?: string | null };
export type SchoolStudent = { id: string; full_name: string; student_number?: string | null; nickname?: string | null; class_id?: string; gender?: "M" | "F" | null; dob?: string | null; pob?: string | null; address?: string | null; religion?: string | null; joined_at?: string | null; status?: string; allergies?: string | null; notes?: string | null; certificates?: string[]; extracurriculars?: string[] };
export type SchoolGuardian = { id: string; student_id: string; full_name: string; relation: string; email?: string | null; whatsapp?: string | null; invite_code: string; invite_used_at?: string | null };
export type SchoolActivity = { id: string; title: string; body?: string | null; activity_date: string; author_name?: string | null; class_id?: string; school_classes?: { name?: string } };
export type SchoolAnnouncement = { id: string; title: string; body?: string | null; scope: string; division?: string | null; class_id?: string | null; author_name?: string | null; created_at: string };
export type SchoolMessage = { id: string; student_id: string; from_side: "teacher" | "parent"; body: string; author_name?: string | null; closed_by_teacher?: boolean; closed_by_parent?: boolean };

export type SchoolClassesResult = SchoolError | { ok: true; classes: SchoolClass[] };
export type SchoolStaffResult = SchoolError | { ok: true; staff: SchoolStaff[] };
export type SchoolStudentsResult = SchoolError | { ok: true; students: SchoolStudent[] };
export type SchoolStudentResult = SchoolError | { ok: true; student: SchoolStudent | null };
export type SchoolGuardiansResult = SchoolError | { ok: true; guardians: SchoolGuardian[] };
export type SchoolGuardianResult = SchoolError | { ok: true; guardian: SchoolGuardian | null };
export type SchoolActivityResult = SchoolError | { ok: true; activity: SchoolActivity };
export type SchoolActivitiesResult = SchoolError | { ok: true; activities: SchoolActivity[] };
export type SchoolAnnouncementResult = SchoolError | { ok: true; announcements: SchoolAnnouncement[] };
export type SchoolMessagesResult = SchoolError | { ok: true; messages: SchoolMessage[] };
export type SchoolAccessResult = { ok: true; tier: StaffTier } | { ok: false };
export type SchoolOkResult = SchoolError | { ok: true };
export type SchoolImportResult = SchoolError | { ok: true; imported: number; skipped: number; skippedRows: string[] };

function checkSchoolPassword(password: string): StaffTier | null {
  if (password && password === (process.env.SCHOOL_ADMIN_PASSWORD || "")) return "admin";
  if (password && password === (process.env.SCHOOL_TEACHER_PASSWORD || "")) return "teacher";
  return null;
}

function randomCode(n = 8): string {
  const alpha = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < n; i++) out += alpha[Math.floor(Math.random() * alpha.length)];
  return out;
}

// ————— Auth check (client calls this once to know which tier a password unlocks) —————
export const checkSchoolAccess = createServerFn({ method: "POST" })
  .inputValidator((input: { password: string }) => input)
  .handler(async ({ data }): Promise<SchoolAccessResult> => {
    const tier = checkSchoolPassword(data.password);
    return tier ? { ok: true, tier } : { ok: false };
  });

// ————— Classes —————
export const listSchoolClasses = createServerFn({ method: "POST" })
  .inputValidator((input: { password: string }) => input)
  .handler(async ({ data }) => {
    if (!checkSchoolPassword(data.password)) return { ok: false as const, error: "Wrong password." };
    const supabase = createNobleSupabase();
    if (!supabase) return { ok: false as const, error: "Backend School belum dikonfigurasi." };
    const { data: rows, error } = await supabase.from("school_classes").select("*").order("name");
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const, classes: rows ?? [] };
  });

export const createSchoolClass = createServerFn({ method: "POST" })
  .inputValidator((input: { password: string; schoolId: string; name: string; division: string; level?: string }) => input)
  .handler(async ({ data }) => {
    if (!checkSchoolPassword(data.password)) return { ok: false as const, error: "Wrong password." };
    const supabase = createNobleSupabase();
    if (!supabase) return { ok: false as const, error: "Backend School belum dikonfigurasi." };
    const { data: row, error } = await supabase
      .from("school_classes")
      .insert({ school_id: data.schoolId, name: data.name.trim(), division: data.division, level: data.level ?? null })
      .select()
      .single();
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const, class: row };
  });

// ————— Staff —————
export const listSchoolStaff = createServerFn({ method: "POST" })
  .inputValidator((input: { password: string }) => input)
  .handler(async ({ data }) => {
    const tier = checkSchoolPassword(data.password);
    if (tier !== "admin") return { ok: false as const, error: "Admin access required." };
    const supabase = createNobleSupabase();
    if (!supabase) return { ok: false as const, error: "Backend School belum dikonfigurasi." };
    const { data: rows, error } = await supabase.from("school_staff").select("*").order("full_name");
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const, staff: rows ?? [] };
  });

export const createSchoolStaff = createServerFn({ method: "POST" })
  .inputValidator(
    (input: { password: string; schoolId: string; fullName: string; role: SchoolRole; division: string; email?: string; classId?: string }) =>
      input,
  )
  .handler(async ({ data }) => {
    if (checkSchoolPassword(data.password) !== "admin") return { ok: false as const, error: "Admin access required." };
    const supabase = createNobleSupabase();
    if (!supabase) return { ok: false as const, error: "Backend School belum dikonfigurasi." };
    const { data: row, error } = await supabase
      .from("school_staff")
      .insert({
        school_id: data.schoolId,
        full_name: data.fullName.trim(),
        role: data.role,
        division: data.division,
        email: data.email || null,
        class_id: data.classId || null,
      })
      .select()
      .single();
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const, staff: row };
  });

export const deleteSchoolStaff = createServerFn({ method: "POST" })
  .inputValidator((input: { password: string; id: string }) => input)
  .handler(async ({ data }) => {
    if (checkSchoolPassword(data.password) !== "admin") return { ok: false as const, error: "Admin access required." };
    const supabase = createNobleSupabase();
    if (!supabase) return { ok: false as const, error: "Backend School belum dikonfigurasi." };
    const { error } = await supabase.from("school_staff").delete().eq("id", data.id);
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const };
  });

// ————— Students (readable/writable by admin or teacher tier) —————
export const listSchoolStudents = createServerFn({ method: "POST" })
  .inputValidator((input: { password: string; classId?: string }) => input)
  .handler(async ({ data }) => {
    if (!checkSchoolPassword(data.password)) return { ok: false as const, error: "Wrong password." };
    const supabase = createNobleSupabase();
    if (!supabase) return { ok: false as const, error: "Backend School belum dikonfigurasi." };
    let q = supabase.from("school_students").select("*").order("full_name");
    if (data.classId) q = q.eq("class_id", data.classId);
    const { data: rows, error } = await q;
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const, students: rows ?? [] };
  });

export const upsertSchoolStudent = createServerFn({ method: "POST" })
  .inputValidator(
    (input: {
      password: string;
      id?: string;
      schoolId: string;
      classId: string;
      fullName: string;
      studentNumber?: string;
      nickname?: string;
      dob?: string;
      pob?: string;
      address?: string;
      religion?: string;
      joinedAt?: string;
      gender?: "M" | "F";
      allergies?: string;
      notes?: string;
      certificates?: string[];
      extracurriculars?: string[];
      status?: string;
    }) => input,
  )
  .handler(async ({ data }) => {
    if (!checkSchoolPassword(data.password)) return { ok: false as const, error: "Wrong password." };
    const supabase = createNobleSupabase();
    if (!supabase) return { ok: false as const, error: "Backend School belum dikonfigurasi." };
    const payload = {
      school_id: data.schoolId,
      class_id: data.classId,
      full_name: data.fullName.trim(),
      student_number: data.studentNumber || null,
      nickname: data.nickname || null,
      dob: data.dob || null,
      pob: data.pob || null,
      address: data.address || null,
      religion: data.religion || null,
      joined_at: data.joinedAt || null,
      gender: data.gender || null,
      allergies: data.allergies || null,
      notes: data.notes || null,
      certificates: data.certificates ?? [],
      extracurriculars: data.extracurriculars ?? [],
      status: data.status || "active",
    };
    const query = data.id
      ? supabase.from("school_students").update(payload).eq("id", data.id).select().single()
      : supabase.from("school_students").insert(payload).select().single();
    const { data: row, error } = await query;
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const, student: row };
  });

export const deleteSchoolStudent = createServerFn({ method: "POST" })
  .inputValidator((input: { password: string; id: string }) => input)
  .handler(async ({ data }) => {
    if (checkSchoolPassword(data.password) !== "admin") return { ok: false as const, error: "Admin HoS access required." };
    const supabase = createNobleSupabase();
    if (!supabase) return { ok: false as const, error: "Backend School belum dikonfigurasi." };
    const { error } = await supabase.from("school_students").delete().eq("id", data.id);
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const };
  });

// Bulk import — Admin HoS only. Rows come pre-parsed from CSV on the
// client (columns: studentNumber, fullName, nickname, gender, className).
// Matches an existing class by name (case-insensitive) within the same
// school; skips rows whose class can't be found rather than guessing.
export const importSchoolStudents = createServerFn({ method: "POST" })
  .inputValidator(
    (input: {
      password: string;
      schoolId: string;
      rows: { studentNumber?: string; fullName: string; nickname?: string; gender?: "M" | "F"; className: string }[];
    }) => input,
  )
  .handler(async ({ data }) => {
    if (checkSchoolPassword(data.password) !== "admin") return { ok: false as const, error: "Admin HoS access required." };
    const supabase = createNobleSupabase();
    if (!supabase) return { ok: false as const, error: "Backend School belum dikonfigurasi." };

    const { data: classes, error: classErr } = await supabase.from("school_classes").select("id, name").eq("school_id", data.schoolId);
    if (classErr) return { ok: false as const, error: classErr.message };
    const classByName = new Map((classes ?? []).map((c) => [c.name.trim().toLowerCase(), c.id]));

    let imported = 0;
    let skipped = 0;
    const skippedRows: string[] = [];
    for (const row of data.rows) {
      const classId = classByName.get(row.className.trim().toLowerCase());
      if (!classId || !row.fullName?.trim()) {
        skipped++;
        skippedRows.push(row.fullName || "(no name)");
        continue;
      }
      // Skip if a student with the same student number already exists in this class.
      if (row.studentNumber) {
        const { data: dupe } = await supabase
          .from("school_students")
          .select("id")
          .eq("class_id", classId)
          .eq("student_number", row.studentNumber)
          .maybeSingle();
        if (dupe) {
          skipped++;
          skippedRows.push(`${row.fullName} (already exists)`);
          continue;
        }
      }
      const { error: insertErr } = await supabase.from("school_students").insert({
        school_id: data.schoolId,
        class_id: classId,
        full_name: row.fullName.trim(),
        student_number: row.studentNumber || null,
        nickname: row.nickname || null,
        gender: row.gender || null,
        status: "active",
      });
      if (insertErr) {
        skipped++;
        skippedRows.push(`${row.fullName} (${insertErr.message})`);
        continue;
      }
      imported++;
    }
    return { ok: true as const, imported, skipped, skippedRows: skippedRows.slice(0, 20) };
  });

// ————— Guardians + real invite-code linking —————
export const listGuardians = createServerFn({ method: "POST" })
  .inputValidator((input: { password: string; studentId: string }) => input)
  .handler(async ({ data }) => {
    if (!checkSchoolPassword(data.password)) return { ok: false as const, error: "Wrong password." };
    const supabase = createNobleSupabase();
    if (!supabase) return { ok: false as const, error: "Backend School belum dikonfigurasi." };
    const { data: rows, error } = await supabase.from("school_guardians").select("*").eq("student_id", data.studentId);
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const, guardians: rows ?? [] };
  });

// Adding a guardian automatically generates their personal invite code —
// staff sends this to the parent (via WA, reusing the same share pattern
// used elsewhere in Noble). This is the ONLY way a parent's session ever
// gets to see a student's data.
export const addGuardian = createServerFn({ method: "POST" })
  .inputValidator(
    (input: { password: string; studentId: string; fullName: string; relation: "father" | "mother" | "guardian"; email?: string; whatsapp?: string }) =>
      input,
  )
  .handler(async ({ data }) => {
    if (!checkSchoolPassword(data.password)) return { ok: false as const, error: "Wrong password." };
    const supabase = createNobleSupabase();
    if (!supabase) return { ok: false as const, error: "Backend School belum dikonfigurasi." };
    const { data: row, error } = await supabase
      .from("school_guardians")
      .insert({
        student_id: data.studentId,
        full_name: data.fullName.trim(),
        relation: data.relation,
        email: data.email || null,
        whatsapp: data.whatsapp || null,
        invite_code: randomCode(),
      })
      .select()
      .single();
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const, guardian: row };
  });

export const deleteGuardian = createServerFn({ method: "POST" })
  .inputValidator((input: { password: string; id: string }) => input)
  .handler(async ({ data }) => {
    if (!checkSchoolPassword(data.password)) return { ok: false as const, error: "Wrong password." };
    const supabase = createNobleSupabase();
    if (!supabase) return { ok: false as const, error: "Backend School belum dikonfigurasi." };
    const { error } = await supabase.from("school_guardians").delete().eq("id", data.id);
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const };
  });

// ————— Public: parent redeems their invite code (no password — the code IS the credential) —————
export const redeemGuardianInvite = createServerFn({ method: "POST" })
  .inputValidator((input: { code: string }) => input)
  .handler(async ({ data }) => {
    const supabase = createNobleSupabase();
    if (!supabase) return { ok: false as const, error: "Backend School belum dikonfigurasi." };
    const { data: guardian, error } = await supabase
      .from("school_guardians")
      .select("*, school_students(*)")
      .eq("invite_code", data.code.trim().toUpperCase())
      .maybeSingle();
    if (error) return { ok: false as const, error: error.message };
    if (!guardian) return { ok: false as const, error: "Kode tidak valid." };
    if (!guardian.invite_used_at) {
      await supabase.from("school_guardians").update({ invite_used_at: new Date().toISOString() }).eq("id", guardian.id);
    }
    return {
      ok: true as const,
      guardianName: guardian.full_name,
      student: guardian.school_students,
    };
  });

// Every subsequent parent-facing read re-validates the code server-side and
// resolves the student from IT — never from a client-supplied student id —
// so a parent's session can never be tricked/tampered into seeing a
// different child than the one their real code unlocks.
export const getStudentForCode = createServerFn({ method: "POST" })
  .inputValidator((input: { code: string }) => input)
  .handler(async ({ data }) => {
    const supabase = createNobleSupabase();
    if (!supabase) return { ok: false as const, error: "Backend School belum dikonfigurasi." };
    const { data: guardian, error } = await supabase
      .from("school_guardians")
      .select("student_id, school_students(*)")
      .eq("invite_code", data.code.trim().toUpperCase())
      .maybeSingle();
    if (error) return { ok: false as const, error: error.message };
    if (!guardian) return { ok: false as const, error: "Kode tidak valid." };
    return { ok: true as const, student: guardian.school_students };
  });

// ————— Daily Activity (Phase 1 slice of Phase 2 — see school_phase1.sql note) —————
export const postSchoolActivity = createServerFn({ method: "POST" })
  .inputValidator((input: { password: string; schoolId: string; classId: string; title: string; body?: string; authorName?: string }) => input)
  .handler(async ({ data }) => {
    if (!checkSchoolPassword(data.password)) return { ok: false as const, error: "Wrong password." };
    const supabase = createNobleSupabase();
    if (!supabase) return { ok: false as const, error: "Backend School belum dikonfigurasi." };
    const { data: row, error } = await supabase
      .from("school_activities")
      .insert({ school_id: data.schoolId, class_id: data.classId, title: data.title.trim(), body: data.body || null, author_name: data.authorName || null })
      .select()
      .single();
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const, activity: row };
  });

export const deleteSchoolActivity = createServerFn({ method: "POST" })
  .inputValidator((input: { password: string; id: string }) => input)
  .handler(async ({ data }) => {
    if (!checkSchoolPassword(data.password)) return { ok: false as const, error: "Wrong password." };
    const supabase = createNobleSupabase();
    if (!supabase) return { ok: false as const, error: "Backend School belum dikonfigurasi." };
    const { error } = await supabase.from("school_activities").delete().eq("id", data.id);
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const };
  });

export const listActivitiesForClass = createServerFn({ method: "POST" })
  .inputValidator((input: { password: string; classId: string }) => input)
  .handler(async ({ data }) => {
    if (!checkSchoolPassword(data.password)) return { ok: false as const, error: "Wrong password." };
    const supabase = createNobleSupabase();
    if (!supabase) return { ok: false as const, error: "Backend School belum dikonfigurasi." };
    const { data: rows, error } = await supabase
      .from("school_activities")
      .select("*")
      .eq("class_id", data.classId)
      .order("activity_date", { ascending: false })
      .limit(20);
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const, activities: rows ?? [] };
  });

// For HoS / Admin HoS (see everything) and Principal (scoped to their division).
export const listAllActivities = createServerFn({ method: "POST" })
  .inputValidator((input: { password: string; division?: string }) => input)
  .handler(async ({ data }) => {
    if (!checkSchoolPassword(data.password)) return { ok: false as const, error: "Wrong password." };
    const supabase = createNobleSupabase();
    if (!supabase) return { ok: false as const, error: "Backend School belum dikonfigurasi." };
    let q = supabase
      .from("school_activities")
      .select("*, school_classes!inner(name, division)")
      .order("activity_date", { ascending: false })
      .limit(50);
    if (data.division) q = q.eq("school_classes.division", data.division);
    const { data: rows, error } = await q;
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const, activities: rows ?? [] };
  });

// ————— Messages (Teacher <-> Parent, per-student thread) —————
export const postMessageAsTeacher = createServerFn({ method: "POST" })
  .inputValidator((input: { password: string; schoolId: string; studentId: string; body: string; authorName?: string }) => input)
  .handler(async ({ data }) => {
    if (!checkSchoolPassword(data.password)) return { ok: false as const, error: "Wrong password." };
    const supabase = createNobleSupabase();
    if (!supabase) return { ok: false as const, error: "Backend School belum dikonfigurasi." };
    const { error } = await supabase.from("school_messages").insert({
      school_id: data.schoolId, student_id: data.studentId, from_side: "teacher",
      author_name: data.authorName || null, body: data.body.trim(),
    });
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const };
  });

export const postMessageAsParent = createServerFn({ method: "POST" })
  .inputValidator((input: { code: string; body: string; authorName?: string }) => input)
  .handler(async ({ data }) => {
    const supabase = createNobleSupabase();
    if (!supabase) return { ok: false as const, error: "Backend School belum dikonfigurasi." };
    const { data: guardian, error: gErr } = await supabase
      .from("school_guardians")
      .select("student_id, school_students(school_id)")
      .eq("invite_code", data.code.trim().toUpperCase())
      .maybeSingle();
    if (gErr) return { ok: false as const, error: gErr.message };
    if (!guardian) return { ok: false as const, error: "Kode tidak valid." };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const schoolId = (guardian.school_students as any)?.school_id;
    const { error } = await supabase.from("school_messages").insert({
      school_id: schoolId, student_id: guardian.student_id, from_side: "parent",
      author_name: data.authorName || null, body: data.body.trim(),
    });
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const };
  });

export const listMessagesForStudent = createServerFn({ method: "POST" })
  .inputValidator((input: { password: string; studentId: string }) => input)
  .handler(async ({ data }) => {
    if (!checkSchoolPassword(data.password)) return { ok: false as const, error: "Wrong password." };
    const supabase = createNobleSupabase();
    if (!supabase) return { ok: false as const, error: "Backend School belum dikonfigurasi." };
    const { data: rows, error } = await supabase.from("school_messages").select("*").eq("student_id", data.studentId).order("created_at");
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const, messages: rows ?? [] };
  });

export const listMessagesForCode = createServerFn({ method: "POST" })
  .inputValidator((input: { code: string }) => input)
  .handler(async ({ data }) => {
    const supabase = createNobleSupabase();
    if (!supabase) return { ok: false as const, error: "Backend School belum dikonfigurasi." };
    const { data: guardian, error: gErr } = await supabase
      .from("school_guardians")
      .select("student_id")
      .eq("invite_code", data.code.trim().toUpperCase())
      .maybeSingle();
    if (gErr) return { ok: false as const, error: gErr.message };
    if (!guardian) return { ok: false as const, error: "Kode tidak valid." };
    const { data: rows, error } = await supabase.from("school_messages").select("*").eq("student_id", guardian.student_id).order("created_at");
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const, messages: rows ?? [] };
  });

// "Close" = mark every message FROM THE OTHER SIDE as read/dismissed on
// this side — this is what makes the notification go away until a new
// message arrives again.
export const closeThreadAsTeacher = createServerFn({ method: "POST" })
  .inputValidator((input: { password: string; studentId: string }) => input)
  .handler(async ({ data }) => {
    if (!checkSchoolPassword(data.password)) return { ok: false as const, error: "Wrong password." };
    const supabase = createNobleSupabase();
    if (!supabase) return { ok: false as const, error: "Backend School belum dikonfigurasi." };
    const { error } = await supabase.from("school_messages").update({ closed_by_teacher: true }).eq("student_id", data.studentId).eq("from_side", "parent");
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const };
  });
export const closeThreadAsParent = createServerFn({ method: "POST" })
  .inputValidator((input: { code: string }) => input)
  .handler(async ({ data }) => {
    const supabase = createNobleSupabase();
    if (!supabase) return { ok: false as const, error: "Backend School belum dikonfigurasi." };
    const { data: guardian, error: gErr } = await supabase
      .from("school_guardians")
      .select("student_id")
      .eq("invite_code", data.code.trim().toUpperCase())
      .maybeSingle();
    if (gErr) return { ok: false as const, error: gErr.message };
    if (!guardian) return { ok: false as const, error: "Kode tidak valid." };
    const { error } = await supabase.from("school_messages").update({ closed_by_parent: true }).eq("student_id", guardian.student_id).eq("from_side", "teacher");
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const };
  });

// ————— Announcements (scope enforced server-side, not just hidden in UI) —————
export const postAnnouncement = createServerFn({ method: "POST" })
  .inputValidator(
    (input: {
      password: string;
      subrole: "hos" | "admin_hos" | "principal";
      schoolId: string;
      scope: "school" | "division" | "class";
      division?: string;
      classId?: string;
      title: string;
      body?: string;
      authorName?: string;
    }) => input,
  )
  .handler(async ({ data }) => {
    if (checkSchoolPassword(data.password) !== "admin") return { ok: false as const, error: "Admin access required." };
    if (data.scope === "school" && data.subrole !== "hos") {
      return { ok: false as const, error: "Hanya Head of School yang boleh mengumumkan ke seluruh sekolah." };
    }
    if (data.scope === "division" && !data.division) return { ok: false as const, error: "Divisi wajib diisi." };
    if (data.scope === "class" && !data.classId) return { ok: false as const, error: "Kelas wajib diisi." };
    const supabase = createNobleSupabase();
    if (!supabase) return { ok: false as const, error: "Backend School belum dikonfigurasi." };
    const { error } = await supabase.from("school_announcements").insert({
      school_id: data.schoolId,
      scope: data.scope,
      division: data.scope === "division" ? data.division : null,
      class_id: data.scope === "class" ? data.classId : null,
      title: data.title.trim(),
      body: data.body || null,
      author_name: data.authorName || null,
    });
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const };
  });

export const listAnnouncements = createServerFn({ method: "POST" })
  .inputValidator((input: { password: string }) => input)
  .handler(async ({ data }) => {
    if (!checkSchoolPassword(data.password)) return { ok: false as const, error: "Wrong password." };
    const supabase = createNobleSupabase();
    if (!supabase) return { ok: false as const, error: "Backend School belum dikonfigurasi." };
    const { data: rows, error } = await supabase.from("school_announcements").select("*").order("created_at", { ascending: false }).limit(30);
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const, announcements: rows ?? [] };
  });

export const listAnnouncementsForCode = createServerFn({ method: "POST" })
  .inputValidator((input: { code: string }) => input)
  .handler(async ({ data }) => {
    const supabase = createNobleSupabase();
    if (!supabase) return { ok: false as const, error: "Backend School belum dikonfigurasi." };
    const { data: guardian, error: gErr } = await supabase
      .from("school_guardians")
      .select("school_students(class_id, school_classes(division))")
      .eq("invite_code", data.code.trim().toUpperCase())
      .maybeSingle();
    if (gErr) return { ok: false as const, error: gErr.message };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const student = guardian?.school_students as any;
    if (!student) return { ok: false as const, error: "Kode tidak valid." };
    const classId = student.class_id;
    const division = student.school_classes?.division;
    const { data: rows, error } = await supabase
      .from("school_announcements")
      .select("*")
      .or(`scope.eq.school,and(scope.eq.division,division.eq.${division}),and(scope.eq.class,class_id.eq.${classId})`)
      .order("created_at", { ascending: false })
      .limit(30);
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const, announcements: rows ?? [] };
  });

// Public: parent's activity feed, resolved from their code (never a raw classId from the client).
export const listActivitiesForCode = createServerFn({ method: "POST" })
  .inputValidator((input: { code: string }) => input)
  .handler(async ({ data }) => {
    const supabase = createNobleSupabase();
    if (!supabase) return { ok: false as const, error: "Backend School belum dikonfigurasi." };
    const { data: guardian, error: gErr } = await supabase
      .from("school_guardians")
      .select("school_students(class_id)")
      .eq("invite_code", data.code.trim().toUpperCase())
      .maybeSingle();
    if (gErr) return { ok: false as const, error: gErr.message };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const classId = (guardian?.school_students as any)?.class_id;
    if (!classId) return { ok: false as const, error: "Kode tidak valid." };
    const { data: rows, error } = await supabase
      .from("school_activities")
      .select("*")
      .eq("class_id", classId)
      .order("activity_date", { ascending: false })
      .limit(20);
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const, activities: rows ?? [] };
  });
