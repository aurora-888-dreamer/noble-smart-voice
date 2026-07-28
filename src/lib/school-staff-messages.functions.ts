import { createServerFn } from "@tanstack/react-start";
import { staffClient } from "./school-academic.server";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>;
type Fail = { ok: false; error: string };

// Role tiers for the messaging hierarchy. Only HOS<->PRINCIPAL and
// PRINCIPAL<->TEACHER are allowed — Teacher can never message HoS directly,
// and HoS never messages Teacher directly; both must go via Principal.
const HOS_TIER = ["hos", "vice_hos"];
const PRINCIPAL_TIER = ["principal", "vice_principal", "admin_principal"];
const TEACHER_TIER = ["teacher_homeroom", "teacher_subject", "teacher_shadow"];

function tierOf(role: string): "hos" | "principal" | "teacher" | null {
  if (HOS_TIER.includes(role)) return "hos";
  if (PRINCIPAL_TIER.includes(role)) return "principal";
  if (TEACHER_TIER.includes(role)) return "teacher";
  return null;
}

function pairAllowed(roleA: string, roleB: string): boolean {
  const a = tierOf(roleA);
  const b = tierOf(roleB);
  if (!a || !b) return false;
  if (a === b) return false; // no same-tier messaging here (e.g. teacher-to-teacher isn't part of this feature)
  const pair = [a, b].sort().join("-");
  return pair === "hos-principal" || pair === "principal-teacher";
}

/** Who the logged-in staff member is allowed to message, given their role. */
export const listMessagingContacts = createServerFn({ method: "POST" })
  .inputValidator((input: { password: string; staffId: string }) => input)
  .handler(async ({ data }): Promise<{ ok: true; contacts: Row[] } | Fail> => {
    const gate = staffClient(data.password);
    if (!gate.ok) return gate;
    const { data: me, error: meErr } = await gate.supabase
      .from("school_staff").select("id, role").eq("id", data.staffId).maybeSingle();
    if (meErr) return { ok: false, error: meErr.message };
    if (!me) return { ok: false, error: "Staff tidak ditemukan." };
    const myTier = tierOf((me as Row).role);
    if (!myTier) return { ok: true, contacts: [] };

    const allowedRoles = myTier === "hos" ? PRINCIPAL_TIER
      : myTier === "teacher" ? PRINCIPAL_TIER
      : [...HOS_TIER, ...TEACHER_TIER]; // principal talks to both hos and teachers

    const { data: rows, error } = await gate.supabase
      .from("school_staff")
      .select("id, full_name, role, division")
      .in("role", allowedRoles)
      .eq("is_active", true)
      .order("full_name", { ascending: true });
    if (error) return { ok: false, error: error.message };
    return { ok: true, contacts: rows ?? [] };
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
    return { ok: true, messages: rows ?? [] };
  });

export const sendStaffMessage = createServerFn({ method: "POST" })
  .inputValidator((input: { password: string; staffId: string; otherId: string; body: string }) => input)
  .handler(async ({ data }): Promise<{ ok: true } | Fail> => {
    const gate = staffClient(data.password);
    if (!gate.ok) return gate;
    if (!data.body.trim()) return { ok: false, error: "Pesan kosong." };
    const { data: pair, error: readErr } = await gate.supabase
      .from("school_staff").select("id, role").in("id", [data.staffId, data.otherId]);
    if (readErr) return { ok: false, error: readErr.message };
    const rows = (pair ?? []) as Row[];
    const me = rows.find((r) => r.id === data.staffId);
    const other = rows.find((r) => r.id === data.otherId);
    if (!me || !other) return { ok: false, error: "Staff tidak ditemukan." };
    if (!pairAllowed(me.role, other.role)) {
      return { ok: false, error: "Tidak bisa mengirim pesan langsung ke role ini — harus lewat Principal." };
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
