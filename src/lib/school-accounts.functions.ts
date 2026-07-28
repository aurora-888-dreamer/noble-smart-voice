// Account + UserID login layer for the School Dashboard.
//
// One single login screen: UserID (5 letters + 3 digits, e.g. Noble888) + PIN.
// The server resolves identity and role from school_staff (or school_guardians
// for parents) — the user never picks a name or a role by hand.
import { createServerFn } from "@tanstack/react-start";
import { createLovableSchoolSupabase } from "./supabase.server";
import { ADMIN_TIER_ROLES, type StaffTier } from "./school-roles";


export const DEFAULT_PIN = "123456";

function passwordForTier(tier: StaffTier): string {
  return (tier === "admin" ? process.env.SCHOOL_ADMIN_PASSWORD : process.env.SCHOOL_TEACHER_PASSWORD) || "";
}
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

/** 5 letters (from the person's name) + 3 digits — e.g. "Noble888". */
function baseFromName(fullName: string): string {
  const letters = fullName.replace(/[^A-Za-z]/g, "");
  const raw = (letters + "Userxx").slice(0, 5).toLowerCase();
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function generateUserId(supabase: any, fullName: string): Promise<string> {
  const base = baseFromName(fullName);
  for (let attempt = 0; attempt < 40; attempt++) {
    const candidate = base + String(100 + Math.floor(Math.random() * 900));
    const [{ data: s }, { data: g }] = await Promise.all([
      supabase.from("school_staff").select("id").ilike("user_id", candidate).maybeSingle(),
      supabase.from("school_guardians").select("id").ilike("user_id", candidate).maybeSingle(),
    ]);
    if (!s && !g) return candidate;
  }
  return base + Date.now().toString().slice(-3);
}

/* ───────────── Login ───────────── */
export type LoginResult =
  | {
      ok: true;
      kind: "staff";
      staff: { id: string; full_name: string; role: string; class_id: string | null; division: string | null; user_id: string };
      pinIsDefault: boolean;
      tier: StaffTier;
      tierPassword: string;
    }
  | { ok: true; kind: "parent"; guardian: { id: string; full_name: string; user_id: string; invite_code: string }; pinIsDefault: boolean }
  | { ok: false; error: string };

export const loginWithUserId = createServerFn({ method: "POST" })
  .inputValidator((input: { userId: string; pin: string }) => input)
  .handler(async ({ data }): Promise<LoginResult> => {
    const supabase = createLovableSchoolSupabase();
    if (!supabase) return { ok: false, error: "Backend School belum dikonfigurasi." };
    const uid = data.userId.trim();
    if (!uid) return { ok: false, error: "UserID wajib diisi." };

    const { data: staff } = await supabase
      .from("school_staff")
      .select("id, full_name, role, class_id, division, pin, pin_is_default, user_id, is_active")
      .ilike("user_id", uid)
      .maybeSingle();

    if (staff) {
      if (staff.is_active === false) return { ok: false, error: "Akun ini dinonaktifkan. Hubungi Admin HoS." };
      const expected = (staff.pin as string | null) || DEFAULT_PIN;
      if (expected !== data.pin) return { ok: false, error: "UserID atau PIN salah." };
      const tier = tierForRole(staff.role as string);
      return {
        ok: true,
        kind: "staff",
        staff: {
          id: staff.id as string,
          full_name: staff.full_name as string,
          role: staff.role as string,
          class_id: (staff.class_id as string | null) ?? null,
          division: (staff.division as string | null) ?? null,
          user_id: (staff.user_id as string) ?? uid,
        },
        pinIsDefault: staff.pin_is_default !== false,
        tier,
        tierPassword: passwordForTier(tier),
      };
    }

    const { data: guardian } = await supabase
      .from("school_guardians")
      .select("id, full_name, pin, pin_is_default, user_id, invite_code, is_active")
      .ilike("user_id", uid)
      .maybeSingle();

    if (guardian) {
      if (guardian.is_active === false) return { ok: false, error: "Akun ini dinonaktifkan. Hubungi sekolah." };
      const expected = (guardian.pin as string | null) || DEFAULT_PIN;
      if (expected !== data.pin) return { ok: false, error: "UserID atau PIN salah." };
      await supabase.from("school_guardians").update({ invite_used_at: new Date().toISOString() }).eq("id", guardian.id);
      return {
        ok: true,
        kind: "parent",
        guardian: {
          id: guardian.id as string,
          full_name: guardian.full_name as string,
          user_id: (guardian.user_id as string) ?? uid,
          invite_code: guardian.invite_code as string,
        },
        pinIsDefault: guardian.pin_is_default !== false,
      };
    }

    return { ok: false, error: "UserID atau PIN salah." };
  });

/** Change my own PIN — available from every dashboard. */
export const changeMyPin = createServerFn({ method: "POST" })
  .inputValidator((input: { userId: string; currentPin: string; newPin: string }) => input)
  .handler(async ({ data }) => {
    const supabase = createLovableSchoolSupabase();
    if (!supabase) return { ok: false as const, error: "Backend School belum dikonfigurasi." };
    if (!/^\d{6}$/.test(data.newPin)) return { ok: false as const, error: "PIN baru harus 6 angka." };
    if (data.newPin === DEFAULT_PIN) return { ok: false as const, error: "PIN baru tidak boleh sama dengan PIN default." };
    const uid = data.userId.trim();

    for (const table of ["school_staff", "school_guardians"] as const) {
      const { data: row } = await supabase.from(table).select("id, pin").ilike("user_id", uid).maybeSingle();
      if (!row) continue;
      const expected = (row.pin as string | null) || DEFAULT_PIN;
      if (expected !== data.currentPin) return { ok: false as const, error: "PIN lama salah." };
      const patch: Record<string, unknown> = { pin: data.newPin, pin_is_default: false };
      if (table === "school_staff") patch.pin_updated_at = new Date().toISOString();
      const { error } = await supabase.from(table).update(patch).eq("id", row.id);
      if (error) return { ok: false as const, error: error.message };
      return { ok: true as const };
    }
    return { ok: false as const, error: "UserID tidak ditemukan." };
  });

/**
 * "Lupa PIN" — verified by the email registered on the account. On success the
 * PIN goes back to the default and must be changed again at first login.
 */
export const resetPinByEmail = createServerFn({ method: "POST" })
  .inputValidator((input: { userId: string; email: string }) => input)
  .handler(async ({ data }) => {
    const supabase = createLovableSchoolSupabase();
    if (!supabase) return { ok: false as const, error: "Backend School belum dikonfigurasi." };
    const uid = data.userId.trim();
    const email = data.email.trim().toLowerCase();
    if (!uid || !email) return { ok: false as const, error: "UserID dan email wajib diisi." };

    for (const table of ["school_staff", "school_guardians"] as const) {
      const { data: row } = await supabase.from(table).select("id, email").ilike("user_id", uid).maybeSingle();
      if (!row) continue;
      const stored = ((row.email as string | null) || "").trim().toLowerCase();
      if (!stored || stored !== email) return { ok: false as const, error: "Email tidak cocok dengan akun ini. Hubungi Admin HoS." };
      const { error } = await supabase.from(table).update({ pin: DEFAULT_PIN, pin_is_default: true }).eq("id", row.id);
      if (error) return { ok: false as const, error: error.message };
      return { ok: true as const, defaultPin: DEFAULT_PIN };
    }
    return { ok: false as const, error: "UserID tidak ditemukan." };
  });

/* ───────────── Staff accounts (HoS / Admin HoS) ───────────── */
export const createStaffAccount = createServerFn({ method: "POST" })
  .inputValidator(
    (input: {
      password: string;
      schoolId: string;
      fullName: string;
      role: string;
      division: string;
      email?: string;
      phone?: string;
      classId?: string;
      subjects?: string[];
    }) => input,
  )
  .handler(async ({ data }) => {
    if (checkSchoolPassword(data.password) !== "admin") return { ok: false as const, error: "Admin access required." };
    const supabase = createLovableSchoolSupabase();
    if (!supabase) return { ok: false as const, error: "Backend School belum dikonfigurasi." };
    if (!data.fullName.trim()) return { ok: false as const, error: "Nama wajib diisi." };
    const userId = await generateUserId(supabase, data.fullName.trim());
    const { data: row, error } = await supabase
      .from("school_staff")
      .insert({
        school_id: data.schoolId,
        full_name: data.fullName.trim(),
        role: data.role,
        division: data.division,
        email: data.email || null,
        phone: data.phone || null,
        class_id: data.classId || null,
        subjects: data.subjects ?? [],
        user_id: userId,
        pin: DEFAULT_PIN,
        pin_is_default: true,
        is_active: true,
      })
      .select()
      .single();
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const, staff: row, userId, defaultPin: DEFAULT_PIN };
  });

export const updateStaffAccount = createServerFn({ method: "POST" })
  .inputValidator(
    (input: {
      password: string;
      id: string;
      fullName?: string;
      role?: string;
      division?: string;
      email?: string | null;
      phone?: string | null;
      classId?: string | null;
      subjects?: string[];
      isActive?: boolean;
      resetPin?: boolean;
    }) => input,
  )
  .handler(async ({ data }) => {
    if (checkSchoolPassword(data.password) !== "admin") return { ok: false as const, error: "Admin access required." };
    const supabase = createLovableSchoolSupabase();
    if (!supabase) return { ok: false as const, error: "Backend School belum dikonfigurasi." };
    const patch: Record<string, unknown> = {};
    if (data.fullName !== undefined) patch.full_name = data.fullName.trim();
    if (data.role !== undefined) patch.role = data.role;
    if (data.division !== undefined) patch.division = data.division;
    if (data.email !== undefined) patch.email = data.email || null;
    if (data.phone !== undefined) patch.phone = data.phone || null;
    if (data.classId !== undefined) patch.class_id = data.classId || null;
    if (data.subjects !== undefined) patch.subjects = data.subjects;
    if (data.isActive !== undefined) patch.is_active = data.isActive;
    if (data.resetPin) { patch.pin = DEFAULT_PIN; patch.pin_is_default = true; }
    if (Object.keys(patch).length === 0) return { ok: true as const };
    const { error } = await supabase.from("school_staff").update(patch).eq("id", data.id);
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const };
  });

/** Fills in a UserID for legacy staff rows that were created before UserIDs existed. */
export const ensureStaffUserId = createServerFn({ method: "POST" })
  .inputValidator((input: { password: string; id: string }) => input)
  .handler(async ({ data }) => {
    if (checkSchoolPassword(data.password) !== "admin") return { ok: false as const, error: "Admin access required." };
    const supabase = createLovableSchoolSupabase();
    if (!supabase) return { ok: false as const, error: "Backend School belum dikonfigurasi." };
    const { data: row } = await supabase.from("school_staff").select("id, full_name, user_id").eq("id", data.id).maybeSingle();
    if (!row) return { ok: false as const, error: "Staff tidak ditemukan." };
    if (row.user_id) return { ok: true as const, userId: row.user_id as string };
    const userId = await generateUserId(supabase, row.full_name as string);
    const { error } = await supabase
      .from("school_staff")
      .update({ user_id: userId, pin: DEFAULT_PIN, pin_is_default: true })
      .eq("id", data.id);
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const, userId, defaultPin: DEFAULT_PIN };
  });

/* ───────────── Parent accounts (invited by a Teacher) ───────────── */
export const inviteParentAccount = createServerFn({ method: "POST" })
  .inputValidator(
    (input: {
      password: string;
      studentId: string;
      fullName: string;
      relation: "father" | "mother" | "guardian";
      email?: string;
      whatsapp?: string;
    }) => input,
  )
  .handler(async ({ data }) => {
    if (!checkSchoolPassword(data.password)) return { ok: false as const, error: "Wrong password." };
    const supabase = createLovableSchoolSupabase();
    if (!supabase) return { ok: false as const, error: "Backend School belum dikonfigurasi." };
    if (!data.fullName.trim()) return { ok: false as const, error: "Nama wali wajib diisi." };
    const userId = await generateUserId(supabase, data.fullName.trim());
    const { data: row, error } = await supabase
      .from("school_guardians")
      .insert({
        student_id: data.studentId,
        full_name: data.fullName.trim(),
        relation: data.relation,
        email: data.email || null,
        whatsapp: data.whatsapp || null,
        invite_code: randomCode(),
        user_id: userId,
        pin: DEFAULT_PIN,
        pin_is_default: true,
        is_active: true,
      })
      .select()
      .single();
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const, guardian: row, userId, defaultPin: DEFAULT_PIN };
  });

export const updateGuardianAccount = createServerFn({ method: "POST" })
  .inputValidator(
    (input: {
      password: string;
      id: string;
      fullName?: string;
      relation?: string;
      email?: string | null;
      whatsapp?: string | null;
      isActive?: boolean;
      resetPin?: boolean;
    }) => input,
  )
  .handler(async ({ data }) => {
    if (!checkSchoolPassword(data.password)) return { ok: false as const, error: "Wrong password." };
    const supabase = createLovableSchoolSupabase();
    if (!supabase) return { ok: false as const, error: "Backend School belum dikonfigurasi." };
    const patch: Record<string, unknown> = {};
    if (data.fullName !== undefined) patch.full_name = data.fullName.trim();
    if (data.relation !== undefined) patch.relation = data.relation;
    if (data.email !== undefined) patch.email = data.email || null;
    if (data.whatsapp !== undefined) patch.whatsapp = data.whatsapp || null;
    if (data.isActive !== undefined) patch.is_active = data.isActive;
    if (data.resetPin) { patch.pin = DEFAULT_PIN; patch.pin_is_default = true; }
    if (Object.keys(patch).length === 0) return { ok: true as const };
    const { error } = await supabase.from("school_guardians").update(patch).eq("id", data.id);
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const };
  });

/* ───────────── Personnel directory (Admin HoS) ───────────── */
export const listAllPersonnel = createServerFn({ method: "POST" })
  .inputValidator((input: { password: string }) => input)
  .handler(async ({ data }) => {
    if (checkSchoolPassword(data.password) !== "admin") return { ok: false as const, error: "Admin access required." };
    const supabase = createLovableSchoolSupabase();
    if (!supabase) return { ok: false as const, error: "Backend School belum dikonfigurasi." };
    const [staffRes, studentRes, guardianRes] = await Promise.all([
      supabase.from("school_staff").select("id, full_name, role, division, class_id, email, phone, user_id, pin_is_default, is_active, subjects").order("full_name"),
      supabase.from("school_students").select("id, full_name, student_number, class_id, status").order("full_name"),
      supabase.from("school_guardians").select("id, full_name, relation, email, whatsapp, user_id, pin_is_default, is_active, student_id, invite_code").order("full_name"),
    ]);
    if (staffRes.error) return { ok: false as const, error: staffRes.error.message };
    return {
      ok: true as const,
      staff: staffRes.data ?? [],
      students: studentRes.data ?? [],
      guardians: guardianRes.data ?? [],
    };
  });
