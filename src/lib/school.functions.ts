import { createServerFn } from "@tanstack/react-start";
import { createNobleSupabase } from "./supabase.server";

export type SchoolRole = "hos" | "principal" | "teacher_homeroom" | "teacher_shadow" | "teacher_subject";
export type StaffTier = "admin" | "teacher";

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
  .handler(async ({ data }): Promise<{ ok: true; tier: StaffTier } | { ok: false }> => {
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
