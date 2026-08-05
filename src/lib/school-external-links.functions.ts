import { createServerFn } from "@tanstack/react-start";
import { staffClient, schoolId } from "./school-academic.server";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>;
type Fail = { ok: false; error: string };

async function requireHos(supabase: Row, staffId: string): Promise<{ ok: true } | Fail> {
  const { data: staff, error } = await supabase.from("school_staff").select("role").eq("id", staffId).maybeSingle();
  if (error) return { ok: false, error: error.message };
  if (!staff || staff.role !== "hos") return { ok: false, error: "Hanya Head of School yang bisa mengelola External Link." };
  return { ok: true };
}

export const listExternalLinks = createServerFn({ method: "POST" })
  .inputValidator((input: { password: string }) => input)
  .handler(async ({ data }): Promise<{ ok: true; links: Row[] } | Fail> => {
    const gate = staffClient(data.password);
    if (!gate.ok) return gate;
    const { data: rows, error } = await gate.supabase.from("school_external_links").select("*").order("created_at", { ascending: false });
    if (error) return { ok: false, error: error.message };
    return { ok: true, links: rows ?? [] };
  });

export const saveExternalLink = createServerFn({ method: "POST" })
  .inputValidator((input: { password: string; staffId: string; name: string; department?: string; contactInfo?: string; note?: string }) => input)
  .handler(async ({ data }): Promise<{ ok: true } | Fail> => {
    const gate = staffClient(data.password);
    if (!gate.ok) return gate;
    const hosCheck = await requireHos(gate.supabase, data.staffId);
    if (!hosCheck.ok) return hosCheck;
    if (!data.name.trim()) return { ok: false, error: "Nama wajib diisi." };
    const { error } = await gate.supabase.from("school_external_links").insert({
      school_id: schoolId(), name: data.name.trim(), department: data.department || null,
      contact_info: data.contactInfo || null, note: data.note || null, created_by: data.staffId || null,
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  });

export const deleteExternalLink = createServerFn({ method: "POST" })
  .inputValidator((input: { password: string; staffId: string; id: string }) => input)
  .handler(async ({ data }): Promise<{ ok: true } | Fail> => {
    const gate = staffClient(data.password);
    if (!gate.ok) return gate;
    const hosCheck = await requireHos(gate.supabase, data.staffId);
    if (!hosCheck.ok) return hosCheck;
    const { error } = await gate.supabase.from("school_external_links").delete().eq("id", data.id);
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  });
