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
// ————— School ID (from server env; client caches it in sessionStorage) —————
export const getSchoolId = createServerFn({ method: "GET" })
  .handler(async (): Promise<{ id: string }> => ({ id: process.env.SCHOOL_ID || "" }));

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

// ————— Daily Activity (Phase 1 slice of Phase 2 — see school_phase1.sql note) —————
// ————— One-click sample data seed (Admin HoS only) — imports the full
// Stella Maris roster (9 classes, their homeroom teachers, 133 students)
// in one call, so testing doesn't require adding everything by hand.
// Idempotent: matches classes by name and students by (class + studentNumber
// or fullName), skipping anything already present. —————
const SEED_CLASSES: { name: string; level: string; teachers: string[]; students: { sid: string; name: string; sex: "M" | "F" }[] }[] = [
  { name: "Toddler - Penguin", level: "toddler", teachers: [], students: [
    { sid: "26.27.T.002", name: "Anselmus Herjuan Abhiseva Arsyanendra", sex: "M" },
    { sid: "26.27.T.001", name: "Celine Olivia Suryono", sex: "F" },
    { sid: "26.27.T.007", name: "Ciel Kathlyne Chandrawan", sex: "F" },
    { sid: "26.27.T.012", name: "Claviera Jeanice Wong", sex: "F" },
    { sid: "26.27.T.011", name: "Ebenezer Nathanael", sex: "M" },
    { sid: "26.27.T.005", name: "Edrick Kenzo Wijaya", sex: "M" },
    { sid: "26.27.T.013", name: "Erin Roseanne Halim", sex: "F" },
    { sid: "26.27.T.003", name: "Freyja Minerva Ren", sex: "F" },
    { sid: "25.26.T.007", name: "Glenn Ravelius", sex: "M" },
    { sid: "26.27.T.010", name: "Harvin Davey Aprilries", sex: "M" },
    { sid: "26.27.T.004", name: "Jesse Sean Harsojo", sex: "M" },
    { sid: "26.27.T.014", name: "Miles Ghalibie", sex: "M" },
    { sid: "26.27.T.009", name: "Rendharta Tatsuomi Dimarco", sex: "M" },
    { sid: "26.27.T.006", name: "Ryu Amadeus Harreltan", sex: "M" },
    { sid: "26.27.T.008", name: "Sonia Emmanuella Sandra", sex: "F" },
  ] },
  { name: "Nursery - Bear", level: "nursery", teachers: ["Ms. Elita", "Ms. Tias"], students: [
    { sid: "25.26.T.003", name: "Charlotte Joanna Dharmawan", sex: "F" },
    { sid: "26.27.N.011", name: "Elizabeth Maple Haruna Gurning", sex: "F" },
    { sid: "25.26.T.004", name: "Hailey Valerie Susanto", sex: "F" },
    { sid: "26.27.N.012", name: "Jeremy Madelim", sex: "M" },
    { sid: "26.27.N.009", name: "Kathleen Keira Elska", sex: "F" },
    { sid: "25.26.T.008", name: "Nityam Lohiya", sex: "M" },
    { sid: "25.26.T.006", name: "Noel Marvelous Setiady", sex: "M" },
    { sid: "26.27.N.014", name: "Raphael Suto De Vera", sex: "M" },
    { sid: "26.27.N.015", name: "Riley Zefanya Yaputra", sex: "F" },
    { sid: "26.27.N.016", name: "Thiago Peter ng", sex: "M" },
    { sid: "26.27.N.017", name: "Michaella Audrey Matasak", sex: "F" },
    { sid: "26.27.N.018", name: "Minjie Lee", sex: "M" },
  ] },
  { name: "Nursery - Bee", level: "nursery", teachers: ["Ms. Hermin", "Ms. Yhoslien"], students: [
    { sid: "26.27.N.001", name: "Alfred Timothy Siregar", sex: "M" },
    { sid: "25.26.T.001", name: "Amadeus Rosario", sex: "M" },
    { sid: "25.26.T.002", name: "Benedict Mikael Widjaja", sex: "M" },
    { sid: "26.27.N.002", name: "Daniela Lynnelle Alexandra Nugroho", sex: "F" },
    { sid: "26.27.N.003", name: "Deven Latanuda", sex: "M" },
    { sid: "26.27.N.004", name: "Eiji Dante Sun", sex: "M" },
    { sid: "26.27.N.005", name: "Emslee Kerrin Abbeygail", sex: "F" },
    { sid: "26.27.N.006", name: "Gracella Michelle Hartanto", sex: "F" },
    { sid: "26.27.N.007", name: "Grecia Gwyneira Liwang", sex: "F" },
    { sid: "25.26.T.005", name: "Irene Lumina Kurniawan", sex: "F" },
    { sid: "26.27.N.008", name: "Ji Yoon An", sex: "F" },
    { sid: "26.27.N.013", name: "Kaira Ginela Tjoandaritmo", sex: "F" },
    { sid: "26.27.N.010", name: "Orlando Ignacio Budiwinata", sex: "M" },
  ] },
  { name: "Kindergarten 1 - Butterfly", level: "k1", teachers: [], students: [
    { sid: "25.26.N.009", name: "Andrew Vanko Wijaya", sex: "M" },
    { sid: "26.27.K1.014", name: "Axel Hadi Emmanuel", sex: "M" },
    { sid: "24.25.T.007", name: "Elvano Uriel Prince", sex: "M" },
    { sid: "26.27.K1.009", name: "Frederick Wayne Terutung", sex: "M" },
    { sid: "26.27.K1.015", name: "Hillary Gwen Charlotte", sex: "F" },
    { sid: "25.26.N.002", name: "Immanuel Jayden Kadir", sex: "M" },
    { sid: "25.26.N.012", name: "Kaneishia Fredella Danesputri", sex: "F" },
    { sid: "26.27.K1.011", name: "Klaus Neil Jeremiah", sex: "M" },
    { sid: "26.27.K1.013", name: "Manuel Zionathan", sex: "M" },
    { sid: "25.26.N.003", name: "Nasya Margaret Kristianto", sex: "F" },
    { sid: "26.27.K1.010", name: "Nolan Faith Sumardi", sex: "M" },
    { sid: "26.27.K1.012", name: "Reynardus Jonathan Ferryandi", sex: "M" },
    { sid: "25.26.N.013", name: "Sam Alexander", sex: "M" },
    { sid: "25.26.N.006", name: "Sheikha Raline Zaina", sex: "F" },
    { sid: "24.25.T.005", name: "Valerie Mischa Wijaya", sex: "F" },
  ] },
  { name: "Kindergarten 1 - Horse", level: "k1", teachers: [], students: [
    { sid: "24.25.T.001", name: "Calla Sutan", sex: "F" },
    { sid: "25.26.N.010", name: "Chloe Arcelia Theodore", sex: "F" },
    { sid: "26.27.K1.007", name: "Darren Austin Adhitama", sex: "M" },
    { sid: "25.26.N.011", name: "Gamaliel Hope Sugianto", sex: "M" },
    { sid: "26.27.K1.002", name: "Hezekiah Rafael", sex: "M" },
    { sid: "26.27.K1.005", name: "Kenzo Shankara Wijaya", sex: "M" },
    { sid: "26.27.K1.003", name: "Kiana Andrean Notonegoro", sex: "F" },
    { sid: "26.27.K1.004", name: "Naevia Aracelyne Audemars Wardana", sex: "F" },
    { sid: "26.27.K1.001", name: "Nicholas Erick Sutrisno", sex: "M" },
    { sid: "26.27.K1.006", name: "Reizelle Ryder Young", sex: "F" },
    { sid: "25.26.N.004", name: "Richard Clayton Sutanto", sex: "M" },
    { sid: "25.26.N.005", name: "River Jayden Yaputra", sex: "M" },
    { sid: "26.27.K1.008", name: "Roderick Wesley Terutung", sex: "M" },
    { sid: "24.25.T.004", name: "San Napoleon", sex: "M" },
    { sid: "25.26.N.016", name: "Swarna Bhatnagar", sex: "F" },
  ] },
  { name: "Kindergarten 1 - Eagle", level: "k1", teachers: ["Ms. Edith"], students: [
    { sid: "25.26.N.008", name: "Ainsley Winifred Sudiro", sex: "F" },
    { sid: "26.27.K1.019", name: "Ben Elvan Flambo", sex: "M" },
    { sid: "26.27.K1.022", name: "Ezra Giovanno", sex: "M" },
    { sid: "26.27.K1.020", name: "Garren Gwenael Liwang", sex: "M" },
    { sid: "25.26.N.001", name: "Genevieve Eloise Daniella Sisco", sex: "F" },
    { sid: "26.27.K1.017", name: "Gracielle Christie", sex: "F" },
    { sid: "24.25.T.002", name: "Jocelyn Jean", sex: "F" },
    { sid: "26.27.K1.016", name: "Josephine Glory Kurniawan", sex: "F" },
    { sid: "23.24.T.008", name: "Li Youan (Chris)", sex: "M" },
    { sid: "25.26.N.017", name: "Lucca Kyle Fang", sex: "M" },
    { sid: "26.27.K1.021", name: "Miguel Abqary", sex: "M" },
    { sid: "24.25.T.003", name: "Mikael Sentosa Wigin", sex: "M" },
    { sid: "26.27.K1.023", name: "Richardza Pamelo Lee", sex: "M" },
    { sid: "26.27.K1.018", name: "Thercio Montana Chandrawan", sex: "M" },
    { sid: "25.26.N.007", name: "Valencia Widisetyanto", sex: "F" },
  ] },
  { name: "Kindergarten 2 - Dolphin", level: "k2", teachers: ["Ms. Ruth", "Ms. Lorelie"], students: [
    { sid: "26.27.K2.005", name: "Aaron Yuankai Liu", sex: "F" },
    { sid: "23.24.T.001", name: "Akio Kanaka Tantiono", sex: "M" },
    { sid: "24.25.N.011", name: "Andrew Immanuel Johan", sex: "M" },
    { sid: "24.25.N.002", name: "Catlynn Mikaela Hadi", sex: "F" },
    { sid: "23.24.T.003", name: "Clairyne Olivia Tjiu", sex: "F" },
    { sid: "24.25.N.014", name: "Haruka Hana Keona", sex: "F" },
    { sid: "24.25.N.004", name: "Hyachinta Mariscotti Illona Phoebe", sex: "F" },
    { sid: "24.25.N.016", name: "Kenzie Kane Lie", sex: "M" },
    { sid: "24.25.N.017", name: "Kimberly Elaine Luhur", sex: "F" },
    { sid: "25.26.K1.014", name: "Kizashi Yoshinaga", sex: "F" },
    { sid: "25.26.K1.004", name: "Krishana Lydia Sihotang", sex: "F" },
    { sid: "24.25.N.009", name: "Nicholas Kane Wijaya", sex: "M" },
    { sid: "24.25.N.007", name: "Lucio Hanaka Phung", sex: "M" },
    { sid: "24.25.N.019", name: "Marvelio Gevariel Vinesian", sex: "M" },
    { sid: "25.26.K1.016", name: "Sada Frederika Siringoringo", sex: "F" },
  ] },
  { name: "Kindergarten 2 - Rabbit", level: "k2", teachers: ["Ms. Bella", "Ms. Yuni S"], students: [
    { sid: "26.27.K2.004", name: "Aeryn Xinkai Liu", sex: "F" },
    { sid: "23.24.T.002", name: "Arsen Arshavin Liam Murfih", sex: "M" },
    { sid: "24.25.N.012", name: "Clairine Arrabella Sulistyawan", sex: "F" },
    { sid: "25.26.K1.008", name: "Daniel Elvano Lalu Baghi", sex: "M" },
    { sid: "26.27.K2.003", name: "Elvina Brielle Aritonang", sex: "F" },
    { sid: "24.25.N.013", name: "Ferixel Pratama Sembhaji", sex: "M" },
    { sid: "25.26.K1.018", name: "Freya Lonicka Laddran Borromeo", sex: "F" },
    { sid: "26.27.K2.002", name: "Gwen Aurelia Gosiddhy", sex: "F" },
    { sid: "25.26.K1.002", name: "Gwenida Morita", sex: "F" },
    { sid: "25.26.K1.009", name: "Isaiah Nawasena Siahaan", sex: "M" },
    { sid: "25.26.K1.013", name: "Jonetta Leon Tjoa", sex: "F" },
    { sid: "24.25.N.006", name: "Kennan Arion Suto", sex: "M" },
    { sid: "25.26.K1.011", name: "Michelle Glyvechia Aileen", sex: "F" },
    { sid: "25.26.K1.006", name: "Mileva Arelie Hutapea", sex: "F" },
    { sid: "25.26.K1.015", name: "Owen Waldemar Nugroho", sex: "M" },
    { sid: "23.24.T.005", name: "Rey Emmanuel Yaprimadi", sex: "M" },
  ] },
  { name: "Kindergarten 2 - Dove", level: "k2", teachers: [], students: [
    { sid: "25.26.K1.001", name: "Brandon Asher Suparman", sex: "M" },
    { sid: "24.25.N.001", name: "Braxton Flynn Suliarta", sex: "M" },
    { sid: "25.26.K1.007", name: "Claire Ronley Limner", sex: "F" },
    { sid: "23.24.T.006", name: "Edward Kenneth Wijaya", sex: "M" },
    { sid: "25.26.K1.017", name: "Eva Sreyas", sex: "F" },
    { sid: "24.25.N.003", name: "Gertrude Gizaka Zeta", sex: "F" },
    { sid: "25.26.K1.003", name: "Gwyneth Giana Raharja", sex: "F" },
    { sid: "25.26.K1.012", name: "Isabella Sherynne Pratama", sex: "F" },
    { sid: "24.25.N.015", name: "Javier Kuswanto", sex: "M" },
    { sid: "24.25.N.005", name: "Jeconia Alvaro Pratama", sex: "M" },
    { sid: "24.25.N.021", name: "Jillian Abigail Calim", sex: "F" },
    { sid: "24.25.N.018", name: "Leander Filbert Wibowo", sex: "M" },
    { sid: "25.26.K1.005", name: "Lucio Moses Alexander", sex: "M" },
    { sid: "24.25.N.015b", name: "Mikhael Brian Lee", sex: "M" },
    { sid: "24.25.N.008", name: "Nelson Immanuel Iskandar", sex: "M" },
    { sid: "26.27.K2.001", name: "Sirena Yuri Ghosako", sex: "F" },
    { sid: "24.25.N.020", name: "Valerie Joan Christiono", sex: "F" },
  ] },
];

export const seedStellaMarisPhase1 = createServerFn({ method: "POST" })
  .inputValidator((input: { password: string; schoolId: string }) => input)
  .handler(async ({ data }) => {
    if (checkSchoolPassword(data.password) !== "admin") return { ok: false as const, error: "Admin HoS access required." };
    const supabase = createNobleSupabase();
    if (!supabase) return { ok: false as const, error: "Backend School belum dikonfigurasi." };

    let classesAdded = 0;
    let teachersAdded = 0;
    let studentsAdded = 0;
    let studentsSkipped = 0;

    for (const c of SEED_CLASSES) {
      const { data: existingClass } = await supabase.from("school_classes").select("id").eq("school_id", data.schoolId).eq("name", c.name).maybeSingle();
      let classId = existingClass?.id as string | undefined;
      if (!classId) {
        const { data: newClass, error: classErr } = await supabase
          .from("school_classes")
          .insert({ school_id: data.schoolId, name: c.name, division: "kindergarten", level: c.level })
          .select("id")
          .single();
        if (classErr) return { ok: false as const, error: `Kelas "${c.name}": ${classErr.message}` };
        classId = newClass.id;
        classesAdded++;
      }

      for (const tname of c.teachers) {
        const { data: existingTeacher } = await supabase.from("school_staff").select("id").eq("school_id", data.schoolId).eq("full_name", tname).maybeSingle();
        if (!existingTeacher) {
          await supabase.from("school_staff").insert({
            school_id: data.schoolId, full_name: tname, role: "teacher_homeroom", division: "kindergarten", class_id: classId,
          });
          teachersAdded++;
        }
      }

      for (const s of c.students) {
        const { data: dupe } = await supabase
          .from("school_students")
          .select("id")
          .eq("class_id", classId)
          .or(`student_number.eq.${s.sid},full_name.eq.${s.name}`)
          .maybeSingle();
        if (dupe) {
          studentsSkipped++;
          continue;
        }
        const { error: studentErr } = await supabase.from("school_students").insert({
          school_id: data.schoolId, class_id: classId, full_name: s.name, student_number: s.sid, gender: s.sex, status: "active",
        });
        if (studentErr) {
          studentsSkipped++;
          continue;
        }
        studentsAdded++;
      }
    }

    return { ok: true as const, classesAdded, teachersAdded, studentsAdded, studentsSkipped };
  });

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
