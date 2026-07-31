import { createServerFn } from "@tanstack/react-start";
import { staffClient, schoolId } from "./school-academic.server";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>;
type Fail = { ok: false; error: string };

export const listIncidentalContacts = createServerFn({ method: "POST" })
  .inputValidator((input: { password: string; context: "message" | "report" }) => input)
  .handler(async ({ data }): Promise<{ ok: true; contacts: Row[] } | Fail> => {
    const gate = staffClient(data.password);
    if (!gate.ok) return gate;
    const { data: rows, error } = await gate.supabase
      .from("school_incidental_contacts").select("*").eq("context", data.context).order("created_at", { ascending: false });
    if (error) return { ok: false, error: error.message };
    return { ok: true, contacts: rows ?? [] };
  });

export const addIncidentalContact = createServerFn({ method: "POST" })
  .inputValidator((input: { password: string; staffId: string; context: "message" | "report"; name: string; contactInfo?: string; note?: string }) => input)
  .handler(async ({ data }): Promise<{ ok: true } | Fail> => {
    const gate = staffClient(data.password);
    if (!gate.ok) return gate;
    if (!data.name.trim()) return { ok: false, error: "Nama wajib diisi." };
    const { error } = await gate.supabase.from("school_incidental_contacts").insert({
      school_id: schoolId(), context: data.context, name: data.name.trim(),
      contact_info: data.contactInfo || null, note: data.note || null, created_by: data.staffId || null,
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  });

export const removeIncidentalContact = createServerFn({ method: "POST" })
  .inputValidator((input: { password: string; id: string }) => input)
  .handler(async ({ data }): Promise<{ ok: true } | Fail> => {
    const gate = staffClient(data.password);
    if (!gate.ok) return gate;
    const { error } = await gate.supabase.from("school_incidental_contacts").delete().eq("id", data.id);
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  });
