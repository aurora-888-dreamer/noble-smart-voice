import { createServerFn } from "@tanstack/react-start";
import { staffClient, schoolId, logAgendaTimeline as logTimeline } from "./school-academic.server";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>;
type Fail = { ok: false; error: string };
type Role = "hos" | "principal" | "teacher";

const AGENDA_SELECT =
  "*, school_staff(full_name), school_agenda_pic(id, staff_id, external_name, external_contact, is_external, school_staff(full_name)), school_agenda_classes(id, class_id, school_classes(name))";

// ————— Agenda Sekolah: HoS school-wide, Principal division/class with HoS
// approval, Teacher class-level. —————

export const listAgendas = createServerFn({ method: "POST" })
  .inputValidator((input: { password: string; role?: Role; staffId?: string; division?: string }) => input)
  .handler(async ({ data }): Promise<{ ok: true; agendas: Row[] } | Fail> => {
    const gate = staffClient(data.password);
    if (!gate.ok) return gate;
    let q = gate.supabase.from("school_agendas").select(AGENDA_SELECT).order("start_date", { ascending: true });
    if (data.role === "principal" && data.division) {
      q = q.or(`scope_level.eq.school,division.eq.${data.division}`);
    }
    const { data: rows, error } = await q;
    if (error) return { ok: false, error: error.message };
    let agendas = (rows ?? []) as Row[];
    if (data.role === "teacher") {
      agendas = agendas.filter(
        (a) => a.scope_level !== "class" || a.created_by === data.staffId || a.approval_status === "approved",
      );
    }
    return { ok: true, agendas };
  });

export const saveAgenda = createServerFn({ method: "POST" })
  .inputValidator(
    (input: {
      password: string; id?: string; staffId: string; role?: Role;
      title: string; purpose?: string; theme?: string;
      startDate?: string; endDate?: string; status?: string;
      scopeLevel?: "school" | "division" | "class"; division?: string; classIds?: string[];
    }) => input,
  )
  .handler(async ({ data }): Promise<{ ok: true; agenda: Row } | Fail> => {
    const gate = staffClient(data.password);
    if (!gate.ok) return gate;
    const scope = data.scopeLevel ?? (data.role === "hos" ? "school" : data.role === "teacher" ? "class" : "division");
    const payload = {
      school_id: schoolId(),
      title: data.title.trim(),
      purpose: data.purpose || null,
      theme: data.theme || null,
      start_date: data.startDate || null,
      end_date: data.endDate || null,
      status: data.status || "aktif",
      scope_level: scope,
      division: data.division || null,
    };
    const q = data.id
      ? gate.supabase.from("school_agendas").update(payload).eq("id", data.id).select().single()
      : gate.supabase
          .from("school_agendas")
          .insert({
            ...payload,
            created_by: data.staffId || null,
            approval_status: data.role === "hos" ? "approved" : "draft",
          })
          .select()
          .single();
    const { data: row, error } = await q;
    if (error) return { ok: false, error: error.message };
    const agenda = row as Row;

    if (data.classIds) {
      await gate.supabase.from("school_agenda_classes").delete().eq("agenda_id", agenda.id);
      if (data.classIds.length > 0) {
        const { error: cErr } = await gate.supabase
          .from("school_agenda_classes")
          .insert(data.classIds.map((class_id) => ({ agenda_id: agenda.id, class_id })));
        if (cErr) return { ok: false, error: cErr.message };
      }
    }
    return { ok: true, agenda };
  });

export const deleteAgenda = createServerFn({ method: "POST" })
  .inputValidator((input: { password: string; id: string }) => input)
  .handler(async ({ data }): Promise<{ ok: true } | Fail> => {
    const gate = staffClient(data.password);
    if (!gate.ok) return gate;
    const { error } = await gate.supabase.from("school_agendas").delete().eq("id", data.id);
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  });

// PIC assignment — external PIC is name/contact only (no login).
export const addAgendaPic = createServerFn({ method: "POST" })
  .inputValidator(
    (input: {
      password: string; agendaId: string;
      staffId?: string; externalName?: string; externalContact?: string; isExternal: boolean;
    }) => input,
  )
  .handler(async ({ data }): Promise<{ ok: true } | Fail> => {
    const gate = staffClient(data.password);
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
    const gate = staffClient(data.password);
    if (!gate.ok) return gate;
    const { error } = await gate.supabase.from("school_agenda_pic").delete().eq("id", data.id);
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  });

// ————— Approval & execution workflow —————

export const submitAgendaForApproval = createServerFn({ method: "POST" })
  .inputValidator((input: { password: string; agendaId: string; actorName?: string }) => input)
  .handler(async ({ data }): Promise<{ ok: true } | Fail> => {
    const gate = staffClient(data.password);
    if (!gate.ok) return gate;
    const { error } = await gate.supabase
      .from("school_agendas")
      .update({ approval_status: "submitted" })
      .eq("id", data.agendaId);
    if (error) return { ok: false, error: error.message };
    await logTimeline(gate.supabase, data.agendaId, "submitted", data.actorName ?? "", "Delivered to HoS for approval.");
    return { ok: true };
  });

export const reviewAgenda = createServerFn({ method: "POST" })
  .inputValidator(
    (input: { password: string; agendaId: string; decision: "approve" | "reject" | "revise"; actorName?: string; notes?: string }) => input,
  )
  .handler(async ({ data }): Promise<{ ok: true } | Fail> => {
    const gate = staffClient(data.password, true); // HoS-only
    if (!gate.ok) return gate;
    const status =
      data.decision === "approve" ? "approved" : data.decision === "reject" ? "rejected" : "revision_requested";
    const { error } = await gate.supabase
      .from("school_agendas")
      .update({ approval_status: status, last_review_notes: data.notes || null })
      .eq("id", data.agendaId);
    if (error) return { ok: false, error: error.message };
    await logTimeline(gate.supabase, data.agendaId, status, data.actorName ?? "", data.notes ?? "", "hos");
    return { ok: true };
  });

export const startAgendaExecution = createServerFn({ method: "POST" })
  .inputValidator((input: { password: string; agendaId: string; actorName?: string }) => input)
  .handler(async ({ data }): Promise<{ ok: true } | Fail> => {
    const gate = staffClient(data.password);
    if (!gate.ok) return gate;
    const { error } = await gate.supabase
      .from("school_agendas")
      .update({ execution_status: "in_progress" })
      .eq("id", data.agendaId);
    if (error) return { ok: false, error: error.message };
    await logTimeline(gate.supabase, data.agendaId, "started", data.actorName ?? "", "Execution started.");
    return { ok: true };
  });

export const closeAgenda = createServerFn({ method: "POST" })
  .inputValidator((input: { password: string; agendaId: string; actorName?: string; finalReport?: string }) => input)
  .handler(async ({ data }): Promise<{ ok: true } | Fail> => {
    const gate = staffClient(data.password);
    if (!gate.ok) return gate;
    const { error } = await gate.supabase
      .from("school_agendas")
      .update({ execution_status: "closed", final_report: data.finalReport || null })
      .eq("id", data.agendaId);
    if (error) return { ok: false, error: error.message };
    await logTimeline(gate.supabase, data.agendaId, "closed", data.actorName ?? "", data.finalReport ?? "");
    return { ok: true };
  });

export const listAgendaTimeline = createServerFn({ method: "POST" })
  .inputValidator((input: { password: string; agendaId: string }) => input)
  .handler(async ({ data }): Promise<{ ok: true; entries: Row[] } | Fail> => {
    const gate = staffClient(data.password);
    if (!gate.ok) return gate;
    const { data: rows, error } = await gate.supabase
      .from("school_agenda_timeline")
      .select("*")
      .eq("agenda_id", data.agendaId)
      .order("created_at", { ascending: true });
    if (error) return { ok: false, error: error.message };
    return { ok: true, entries: (rows ?? []) as Row[] };
  });

export const addAgendaComment = createServerFn({ method: "POST" })
  .inputValidator((input: { password: string; agendaId: string; authorName?: string; authorRole?: string; body: string }) => input)
  .handler(async ({ data }): Promise<{ ok: true } | Fail> => {
    const gate = staffClient(data.password);
    if (!gate.ok) return gate;
    const { error } = await gate.supabase.from("school_agenda_timeline").insert({
      agenda_id: data.agendaId,
      kind: "comment",
      author_name: data.authorName || null,
      author_role: data.authorRole || null,
      body: data.body,
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  });
