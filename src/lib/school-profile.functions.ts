import { createServerFn } from "@tanstack/react-start";
import { staffClient, parentScope, schoolId } from "./school-academic.server";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>;
type Fail = { ok: false; error: string };

const HEALTH_FIELDS = ["allergies", "health_notes"];

function canSeeHealth(
  viewerRole: string, viewerDivision: string | null, viewerClassId: string | null,
  targetDivision: string | null, targetClassId: string | null,
): boolean {
  if (viewerRole === "hos" || viewerRole === "vice_hos" || viewerRole === "admin_hos") return true;
  if (viewerRole === "principal" || viewerRole === "vice_principal" || viewerRole === "admin_principal") {
    return !!viewerDivision && viewerDivision === targetDivision;
  }
  if (viewerRole === "teacher_homeroom") return !!viewerClassId && viewerClassId === targetClassId;
  return false;
}

// ————— Staff self-profile —————
export const checkMyProfileStatus = createServerFn({ method: "POST" })
  .inputValidator((input: { password: string; staffId: string }) => input)
  .handler(async ({ data }): Promise<{ ok: true; isComplete: boolean; exempt: boolean } | Fail> => {
    const gate = staffClient(data.password);
    if (!gate.ok) return gate;
    const { data: row, error } = await gate.supabase
      .from("school_staff").select("is_profile_complete, user_id").eq("id", data.staffId).maybeSingle();
    if (error) return { ok: false, error: error.message };
    const exempt = row?.user_id === "Noble888";
    return { ok: true, isComplete: !!row?.is_profile_complete, exempt };
  });

export const getMyStaffProfile = createServerFn({ method: "POST" })
  .inputValidator((input: { password: string; staffId: string }) => input)
  .handler(async ({ data }): Promise<{ ok: true; profile: Row } | Fail> => {
    const gate = staffClient(data.password);
    if (!gate.ok) return gate;
    const { data: row, error } = await gate.supabase.from("school_staff").select("*").eq("id", data.staffId).maybeSingle();
    if (error) return { ok: false, error: error.message };
    if (!row) return { ok: false, error: "Staff tidak ditemukan." };
    return { ok: true, profile: row as Row };
  });

export const saveMyStaffProfile = createServerFn({ method: "POST" })
  .inputValidator(
    (input: {
      password: string; staffId: string;
      fullName: string; nickname?: string; gender?: string; homeAddress?: string; idCardAddress?: string;
      birthplace?: string; birthDate?: string; whatsapp?: string; email?: string; religion?: string;
      allergies?: string; healthNotes?: string; photoUrl?: string;
    }) => input,
  )
  .handler(async ({ data }): Promise<{ ok: true } | Fail> => {
    const gate = staffClient(data.password);
    if (!gate.ok) return gate;
    if (!data.fullName.trim()) return { ok: false, error: "Nama lengkap wajib diisi." };
    const { error } = await gate.supabase.from("school_staff").update({
      full_name: data.fullName.trim(),
      nickname: data.nickname || null,
      gender: data.gender || null,
      home_address: data.homeAddress || null,
      id_card_address: data.idCardAddress || null,
      birthplace: data.birthplace || null,
      birth_date: data.birthDate || null,
      whatsapp: data.whatsapp || null,
      email: data.email || null,
      religion: data.religion || null,
      allergies: data.allergies || null,
      health_notes: data.healthNotes || null,
      photo_url: data.photoUrl || null,
      is_profile_complete: true,
    }).eq("id", data.staffId);
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  });

// ————— Student profile, filled by Parent —————
export const checkMyStudentProfileStatus = createServerFn({ method: "POST" })
  .inputValidator((input: { code: string }) => input)
  .handler(async ({ data }): Promise<{ ok: true; isComplete: boolean } | Fail> => {
    const scope = await parentScope(data.code);
    if (!scope.ok) return scope;
    const { data: row, error } = await scope.supabase
      .from("school_students").select("is_profile_complete").eq("id", scope.studentId).maybeSingle();
    if (error) return { ok: false, error: error.message };
    return { ok: true, isComplete: !!row?.is_profile_complete };
  });

export const getMyStudentProfile = createServerFn({ method: "POST" })
  .inputValidator((input: { code: string }) => input)
  .handler(async ({ data }): Promise<{ ok: true; profile: Row } | Fail> => {
    const scope = await parentScope(data.code);
    if (!scope.ok) return scope;
    const { data: row, error } = await scope.supabase.from("school_students").select("*").eq("id", scope.studentId).maybeSingle();
    if (error) return { ok: false, error: error.message };
    if (!row) return { ok: false, error: "Murid tidak ditemukan." };
    return { ok: true, profile: row as Row };
  });

export const saveMyStudentProfile = createServerFn({ method: "POST" })
  .inputValidator(
    (input: {
      code: string;
      fullName: string; nickname?: string; gender?: string; homeAddress?: string; idCardAddress?: string;
      birthplace?: string; birthDate?: string; whatsapp?: string; religion?: string;
      allergies?: string; healthNotes?: string; photoUrl?: string;
    }) => input,
  )
  .handler(async ({ data }): Promise<{ ok: true } | Fail> => {
    const scope = await parentScope(data.code);
    if (!scope.ok) return scope;
    if (!data.fullName.trim()) return { ok: false, error: "Nama lengkap wajib diisi." };
    const { error } = await scope.supabase.from("school_students").update({
      full_name: data.fullName.trim(),
      nickname: data.nickname || null,
      gender: data.gender || null,
      address: data.homeAddress || null,
      id_card_address: data.idCardAddress || null,
      pob: data.birthplace || null,
      dob: data.birthDate || null,
      whatsapp: data.whatsapp || null,
      religion: data.religion || null,
      allergies: data.allergies || null,
      notes: data.healthNotes || null,
      photo_url: data.photoUrl || null,
      is_profile_complete: true,
    }).eq("id", scope.studentId);
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  });

// ————— Viewing someone else's profile — health fields only for permitted roles —————
export const getStaffProfileForViewer = createServerFn({ method: "POST" })
  .inputValidator((input: { password: string; viewerId: string; targetStaffId: string }) => input)
  .handler(async ({ data }): Promise<{ ok: true; profile: Row } | Fail> => {
    const gate = staffClient(data.password);
    if (!gate.ok) return gate;
    const { data: rows, error } = await gate.supabase
      .from("school_staff").select("*").in("id", [data.viewerId, data.targetStaffId]);
    if (error) return { ok: false, error: error.message };
    const viewer = (rows ?? []).find((r: Row) => r.id === data.viewerId);
    const target = (rows ?? []).find((r: Row) => r.id === data.targetStaffId);
    if (!target) return { ok: false, error: "Staff tidak ditemukan." };
    const allowed = viewer && canSeeHealth(viewer.role, viewer.division, viewer.class_id, target.division, target.class_id);
    const profile = { ...target };
    if (!allowed) for (const f of HEALTH_FIELDS) delete profile[f];
    return { ok: true, profile };
  });

export const getStudentProfileForViewer = createServerFn({ method: "POST" })
  .inputValidator((input: { password: string; viewerId: string; targetStudentId: string }) => input)
  .handler(async ({ data }): Promise<{ ok: true; profile: Row } | Fail> => {
    const gate = staffClient(data.password);
    if (!gate.ok) return gate;
    const { data: viewer, error: vErr } = await gate.supabase.from("school_staff").select("*").eq("id", data.viewerId).maybeSingle();
    if (vErr) return { ok: false, error: vErr.message };
    const { data: target, error: tErr } = await gate.supabase
      .from("school_students").select("*, school_classes(division)").eq("id", data.targetStudentId).maybeSingle();
    if (tErr) return { ok: false, error: tErr.message };
    if (!target) return { ok: false, error: "Murid tidak ditemukan." };
    const targetDivision = (target as Row).school_classes?.division ?? null;
    const allowed = viewer && canSeeHealth(viewer.role, viewer.division, viewer.class_id, targetDivision, target.class_id);
    const profile: Row = { ...target };
    if (!allowed) { profile.allergies = undefined; profile.notes = undefined; }
    return { ok: true, profile };
  });
