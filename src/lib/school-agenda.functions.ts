import { createServerFn } from "@tanstack/react-start";
import { staffClient, schoolId } from "./school-academic.server";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>;
type Fail = { ok: false; error: string };

// ————— Agenda Sekolah (HoS-only school-wide agenda, separate from the
// Teacher→Principal→HoS project approval flow) —————

export const listAgendas = createServerFn({ method: "POST" })
  .inputValidator((input: { password: string }) => input)
  .handler(async ({ data }): Promise<{ ok: true; agendas: Row[] } | Fail> => {
    const gate = staffClient(data.password);
    if (!gate.ok) return gate;
    const { data: rows, error } = await gate.supabase
      .from("school_agendas")
      .select("*, school_staff(full_name), school_agenda_pic(id, staff_id, external_name, external_contact, is_external, school_staff(full_name))")
      .order("start_date", { ascending: true });
    if (error) return { ok: false, error: error.message };
    return { ok: true, agendas: rows ?? [] };
  });

export const saveAgenda = createServerFn({ method: "POST" })
  .inputValidator(
    (input: {
      password: string; id?: string; staffId: string;
      title: string; purpose?: string; theme?: string;
      startDate?: string; endDate?: string; status?: string;
    }) => input,
  )
  .handler(async ({ data }): Promise<{ ok: true; agenda: Row } | Fail> => {
    const gate = staffClient(data.password, true); // HoS-only, admin tier
    if (!gate.ok) return gate;
    const payload = {
      school_id: schoolId(),
      title: data.title.trim(),
      purpose: data.purpose || null,
      theme: data.theme || null,
      start_date: data.startDate || null,
      end_date: data.endDate || null,
      status: data.status || "aktif",
    };
    const q = data.id
      ? gate.supabase.from("school_agendas").update(payload).eq("id", data.id).select().single()
      : gate.supabase.from("school_agendas").insert({ ...payload, created_by: data.staffId || null }).select().single();
    const { data: row, error } = await q;
    if (error) return { ok: false, error: error.message };
    return { ok: true, agenda: row as Row };
  });

export const deleteAgenda = createServerFn({ method: "POST" })
  .inputValidator((input: { password: string; id: string }) => input)
  .handler(async ({ data }): Promise<{ ok: true } | Fail> => {
    const gate = staffClient(data.password, true);
    if (!gate.ok) return gate;
    const { error } = await gate.supabase.from("school_agendas").delete().eq("id", data.id);
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  });

// PIC assignment — HoS CRUDs who's responsible; external PIC is name/contact
// only (no login, no ability to fill in anything themselves).
export const addAgendaPic = createServerFn({ method: "POST" })
  .inputValidator(
    (input: {
      password: string; agendaId: string;
      staffId?: string; externalName?: string; externalContact?: string; isExternal: boolean;
    }) => input,
  )
  .handler(async ({ data }): Promise<{ ok: true } | Fail> => {
    const gate = staffClient(data.password, true);
    if (!gate.ok) return gate;
    if (data.isExternal && !data.externalName?.trim()) return { ok: false, error: "Nama PIC eksternal wajib diisi." };
    if (!data.isExternal && !data.staffId) return { ok: false, error: "Pilih staff untuk jadi PIC." };
    const { error } = await gate.supabase.from("school_agenda_pic").insert({
      agenda_id: data.agendaId,
      staff_id: data.isExternal ? null : data.staffId,
      external_name: data.isExternal ? data.externalName!.trim() : null,
      external_contact: data.isExternal ? (data.externalContact || null) : null,
      is_external: data.isExternal,
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  });

export const removeAgendaPic = createServerFn({ method: "POST" })
  .inputValidator((input: { password: string; id: string }) => input)
  .handler(async ({ data }): Promise<{ ok: true } | Fail> => {
    const gate = staffClient(data.password, true);
    if (!gate.ok) return gate;
    const { error } = await gate.supabase.from("school_agenda_pic").delete().eq("id", data.id);
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  });
