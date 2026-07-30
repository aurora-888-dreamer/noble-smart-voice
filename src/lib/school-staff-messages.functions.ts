import { createServerFn } from "@tanstack/react-start";
import { staffClient } from "./school-academic.server";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>;
type Fail = { ok: false; error: string };

// Role tiers for the messaging hierarchy:
//  - HoS <-> Principal (any division)
//  - Principal <-> Teacher (same division only)
//  - Teacher <-> Teacher (same division only — colleagues)
// Teacher can never message HoS directly (must go via Principal), and HoS
// never messages Teacher directly.
const HOS_TIER = ["hos", "vice_hos"];
const PRINCIPAL_TIER = ["principal", "vice_principal", "admin_principal"];
const TEACHER_TIER = ["teacher_homeroom", "teacher_subject", "teacher_shadow"];

function tierOf(role: string): "hos" | "principal" | "teacher" | null {
  if (HOS_TIER.includes(role)) return "hos";
  if (PRINCIPAL_TIER.includes(role)) return "principal";
  if (TEACHER_TIER.includes(role)) return "teacher";
  return null;
}

function pairAllowed(
  roleA: string, divisionA: string | null,
  roleB: string, divisionB: string | null,
): boolean {
  const a = tierOf(roleA);
  const b = tierOf(roleB);
  if (!a || !b) return false;
  if (a === "teacher" && b === "teacher") return !!divisionA && divisionA === divisionB;
  if (a === "principal" && b === "principal") return true; // peer Principals/Vice Principals, any division
  if (a === "hos" && b === "hos") return false;
  if (a === "principal" && b === "teacher") return !!divisionA && divisionA === divisionB;
  if (a === "teacher" && b === "principal") return !!divisionB && divisionA === divisionB;
  const pair = [a, b].sort().join("-");
  return pair === "hos-principal";
}

/** Who the logged-in staff member is allowed to message, given their role
 * and division. HoS reaches every Principal school-wide; Principal reaches
 * HoS (school-wide) plus Teachers in their own division; Teacher reaches
 * Principal-tier and other Teacher colleagues, both scoped to their own
 * division only. */
export const listMessagingContacts = createServerFn({ method: "POST" })
  .inputValidator((input: { password: string; staffId: string }) => input)
  .handler(async ({ data }): Promise<{ ok: true; contacts: Row[] } | Fail> => {
    const gate = staffClient(data.password);
    if (!gate.ok) return gate;
    const { data: me, error: meErr } = await gate.supabase
      .from("school_staff").select("id, role, division").eq("id", data.staffId).maybeSingle();
    if (meErr) return { ok: false, error: meErr.message };
    if (!me) return { ok: false, error: "Staff tidak ditemukan." };
    const myTier = tierOf((me as Row).role);
    const myDivision = (me as Row).division as string | null;
    if (!myTier) return { ok: true, contacts: [] };

    let contacts: Row[] = [];
    if (myTier === "hos") {
      const { data: rows, error } = await gate.supabase
        .from("school_staff").select("id, full_name, role, division").in("role", PRINCIPAL_TIER).eq("is_active", true);
      if (error) return { ok: false, error: error.message };
      contacts = rows ?? [];
    } else if (myTier === "principal") {
      const { data: hosRows, error: e1 } = await gate.supabase
        .from("school_staff").select("id, full_name, role, division").in("role", HOS_TIER).eq("is_active", true);
      if (e1) return { ok: false, error: e1.message };
      const { data: teacherRows, error: e2 } = await gate.supabase
        .from("school_staff").select("id, full_name, role, division").in("role", TEACHER_TIER).eq("division", myDivision).eq("is_active", true);
      if (e2) return { ok: false, error: e2.message };
      const { data: peerPrincipals, error: e3 } = await gate.supabase
        .from("school_staff").select("id, full_name, role, division").in("role", PRINCIPAL_TIER).eq("is_active", true).neq("id", data.staffId);
      if (e3) return { ok: false, error: e3.message };
      contacts = [...(hosRows ?? []), ...(peerPrincipals ?? []), ...(teacherRows ?? [])];
    } else {
      const { data: principalRows, error: e1 } = await gate.supabase
        .from("school_staff").select("id, full_name, role, division").in("role", PRINCIPAL_TIER).eq("division", myDivision).eq("is_active", true);
      if (e1) return { ok: false, error: e1.message };
      const { data: peerRows, error: e2 } = await gate.supabase
        .from("school_staff").select("id, full_name, role, division").in("role", TEACHER_TIER).eq("division", myDivision).eq("is_active", true).neq("id", data.staffId);
      if (e2) return { ok: false, error: e2.message };
      contacts = [...(principalRows ?? []), ...(peerRows ?? [])];
    }
    contacts.sort((a, b) => (a.full_name ?? "").localeCompare(b.full_name ?? ""));
    return { ok: true, contacts };
  });

export const listStaffConversation = createServerFn({ method: "POST" })
  .inputValidator((input: { password: string; staffId: string; otherId: string }) => input)
  .handler(async ({ data }): Promise<{ ok: true; messages: Row[] } | Fail> => {
    const gate = staffClient(data.password);
    if (!gate.ok) return gate;
    const { data: rows, error } = await gate.supabase
      .from("school_staff_messages")
      .select("*, sender:sender_id(full_name), recipient:recipient_id(full_name)")
      .or(
        `and(sender_id.eq.${data.staffId},recipient_id.eq.${data.otherId}),` +
        `and(sender_id.eq.${data.otherId},recipient_id.eq.${data.staffId})`,
      )
      .order("created_at", { ascending: true });
    if (error) return { ok: false, error: error.message };
    // Opening this conversation marks anything the other person sent us as read.
    await gate.supabase
      .from("school_staff_messages").update({ read_at: new Date().toISOString() })
      .eq("sender_id", data.otherId).eq("recipient_id", data.staffId).is("read_at", null);
    return { ok: true, messages: rows ?? [] };
  });

export const listUnreadStaffSenderIds = createServerFn({ method: "POST" })
  .inputValidator((input: { password: string; staffId: string }) => input)
  .handler(async ({ data }): Promise<{ ok: true; senderIds: string[] } | Fail> => {
    const gate = staffClient(data.password);
    if (!gate.ok) return gate;
    const { data: rows, error } = await gate.supabase
      .from("school_staff_messages").select("sender_id").eq("recipient_id", data.staffId).is("read_at", null);
    if (error) return { ok: false, error: error.message };
    return { ok: true, senderIds: [...new Set((rows ?? []).map((r: Row) => r.sender_id))] };
  });

export const sendStaffMessage = createServerFn({ method: "POST" })
  .inputValidator((input: { password: string; staffId: string; otherId: string; body: string }) => input)
  .handler(async ({ data }): Promise<{ ok: true } | Fail> => {
    const gate = staffClient(data.password);
    if (!gate.ok) return gate;
    if (!data.body.trim()) return { ok: false, error: "Pesan kosong." };
    const { data: pair, error: readErr } = await gate.supabase
      .from("school_staff").select("id, role, division").in("id", [data.staffId, data.otherId]);
    if (readErr) return { ok: false, error: readErr.message };
    const rows = (pair ?? []) as Row[];
    const me = rows.find((r) => r.id === data.staffId);
    const other = rows.find((r) => r.id === data.otherId);
    if (!me || !other) return { ok: false, error: "Staff tidak ditemukan." };
    if (!pairAllowed(me.role, me.division, other.role, other.division)) {
      return { ok: false, error: "Tidak bisa mengirim pesan langsung ke orang ini." };
    }
    const { error } = await gate.supabase.from("school_staff_messages").insert({
      school_id: process.env.SCHOOL_ID || "",
      sender_id: data.staffId,
      recipient_id: data.otherId,
      body: data.body.trim(),
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  });
