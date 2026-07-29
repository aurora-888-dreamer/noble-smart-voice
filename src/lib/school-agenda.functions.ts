import { createServerFn } from "@tanstack/react-start";
import { staffClient, schoolId } from "./school-academic.server";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>;
type Fail = { ok: false; error: string };

async function addTimelineEntry(supabase: Row, agendaId: string, authorName: string, authorRole: string | undefined, body: string, entryType: "comment" | "system" = "comment") {
  await supabase.from("school_agenda_timeline").insert({ agenda_id: agendaId, author_name: authorName, author_role: authorRole || null, body, entry_type: entryType });
}

// ————— Agenda: HoS (school-wide, auto-approved), Principal (division/classes,
// needs HoS approval), Teacher (their own class, auto-approved) —————

export const listAgendas = createServerFn({ method: "POST" })
  .inputValidator((input: { password: string; role: "hos" | "principal" | "teacher"; staffId: string; division?: string; classId?: string | null }) => input)
  .handler(async ({ data }): Promise<{ ok: true; agendas: Row[] } | Fail> => {
    const gate = staffClient(data.password);
    if (!gate.ok) return gate;
    let q = gate.supabase
      .from("school_agendas")
      .select("*, school_staff(full_name), school_agenda_pic(id, staff_id, external_name, external_contact, is_external, school_staff(full_name)), school_agenda_classes(class_id, school_classes(name))")
      .order("start_date", { ascending: true });
    if (data.role === "teacher") {
      q = q.eq("created_by", data.staffId).eq("scope_level", "class");
    } else if (data.role === "principal" && data.division) {
      q = q.or(`division.eq.${data.division},created_by.eq.${data.staffId}`);
    }
    // HoS sees everything (school-wide ones they made, plus all Principal submissions for approval/oversight).
    const { data: rows, error } = await q;
    if (error) return { ok: false, error: error.message };
    return { ok: true, agendas: rows ?? [] };
  });

export const saveAgenda = createServerFn({ method: "POST" })
  .inputValidator(
    (input: {
      password: string; id?: string; staffId: string; role: "hos" | "principal" | "teacher";
      title: string; purpose?: string; theme?: string;
      startDate?: string; endDate?: string;
      scopeLevel: "school" | "division" | "class"; division?: string; classIds?: string[];
    }) => input,
  )
  .handler(async ({ data }): Promise<{ ok: true; agenda: Row } | Fail> => {
    const gate = staffClient(data.password);
    if (!gate.ok) return gate;
    // Only Principal-created agendas go through HoS approval — HoS and Teacher
    // agendas are auto-approved (nobody above them needs to sign off).
    const approvalStatus = data.role === "principal" ? "draft" : "approved";
    const payload = {
      school_id: schoolId(),
      title: data.title.trim(),
      purpose: data.purpose || null,
      theme: data.theme || null,
      start_date: data.startDate || null,
      end_date: data.endDate || null,
      creator_role: data.role,
      scope_level: data.scopeLevel,
      division: data.division || null,
      approval_status: approvalStatus,
    };
    let agendaId = data.id;
    if (data.id) {
      const { error } = await gate.supabase.from("school_agendas").update(payload).eq("id", data.id);
      if (error) return { ok: false, error: error.message };
    } else {
      const { data: row, error } = await gate.supabase
        .from("school_agendas").insert({ ...payload, created_by: data.staffId || null }).select().single();
      if (error) return { ok: false, error: error.message };
      agendaId = row.id;
      await addTimelineEntry(gate.supabase, agendaId, "System", undefined, `Agenda created by ${data.role}.`, "system");
    }
    if (agendaId && data.scopeLevel === "class" && data.classIds) {
      await gate.supabase.from("school_agenda_classes").delete().eq("agenda_id", agendaId);
      if (data.classIds.length > 0) {
        await gate.supabase.from("school_agenda_classes").insert(data.classIds.map((cid) => ({ agenda_id: agendaId, class_id: cid })));
      }
    }
    const { data: final, error: readErr } = await gate.supabase.from("school_agendas").select("*").eq("id", agendaId).single();
    if (readErr) return { ok: false, error: readErr.message };
    return { ok: true, agenda: final as Row };
  });

export const submitAgendaForApproval = createServerFn({ method: "POST" })
  .inputValidator((input: { password: string; agendaId: string; actorName: string }) => input)
  .handler(async ({ data }): Promise<{ ok: true } | Fail> => {
    const gate = staffClient(data.password);
    if (!gate.ok) return gate;
    const { error } = await gate.supabase.from("school_agendas").update({ approval_status: "submitted" }).eq("id", data.agendaId);
    if (error) return { ok: false, error: error.message };
    await addTimelineEntry(gate.supabase, data.agendaId, data.actorName, "principal", "Delivered to HoS for approval.", "system");
    return { ok: true };
  });

export const reviewAgenda = createServerFn({ method: "POST" })
  .inputValidator((input: { password: string; agendaId: string; actorName: string; decision: "approve" | "reject" | "revise"; notes?: string }) => input)
  .handler(async ({ data }): Promise<{ ok: true } | Fail> => {
    const gate = staffClient(data.password, true); // HoS only
    if (!gate.ok) return gate;
    const next = data.decision === "approve" ? "approved" : data.decision === "reject" ? "rejected" : "revision_requested";
    const { error } = await gate.supabase.from("school_agendas").update({ approval_status: next, last_review_notes: data.notes || null }).eq("id", data.agendaId);
    if (error) return { ok: false, error: error.message };
    const msg = next === "approved" ? "Approved by HoS." : next === "rejected" ? "Rejected by HoS." : "HoS requested revision.";
    await addTimelineEntry(gate.supabase, data.agendaId, data.actorName, "hos", msg + (data.notes ? " " + data.notes : ""), "system");
    return { ok: true };
  });

export const startAgendaExecution = createServerFn({ method: "POST" })
  .inputValidator((input: { password: string; agendaId: string; actorName: string }) => input)
  .handler(async ({ data }): Promise<{ ok: true } | Fail> => {
    const gate = staffClient(data.password);
    if (!gate.ok) return gate;
    const { error } = await gate.supabase.from("school_agendas").update({ execution_status: "in_progress" }).eq("id", data.agendaId);
    if (error) return { ok: false, error: error.message };
    await addTimelineEntry(gate.supabase, data.agendaId, data.actorName, undefined, "Agenda execution started.", "system");
    return { ok: true };
  });

export const closeAgenda = createServerFn({ method: "POST" })
  .inputValidator((input: { password: string; agendaId: string; actorName: string; finalReport: string }) => input)
  .handler(async ({ data }): Promise<{ ok: true } | Fail> => {
    const gate = staffClient(data.password);
    if (!gate.ok) return gate;
    if (!data.finalReport.trim()) return { ok: false, error: "Evaluation / Final Report tidak boleh kosong." };
    const { error } = await gate.supabase
      .from("school_agendas")
      .update({ execution_status: "closed", final_report: data.finalReport.trim(), closed_at: new Date().toISOString() })
      .eq("id", data.agendaId);
    if (error) return { ok: false, error: error.message };
    await addTimelineEntry(gate.supabase, data.agendaId, data.actorName, undefined, "Agenda closed. Final Report sent to HoS: " + data.finalReport.trim(), "system");
    return { ok: true };
  });

export const listAgendaTimeline = createServerFn({ method: "POST" })
  .inputValidator((input: { password: string; agendaId: string }) => input)
  .handler(async ({ data }): Promise<{ ok: true; entries: Row[] } | Fail> => {
    const gate = staffClient(data.password);
    if (!gate.ok) return gate;
    const { data: rows, error } = await gate.supabase
      .from("school_agenda_timeline").select("*").eq("agenda_id", data.agendaId).order("created_at", { ascending: true });
    if (error) return { ok: false, error: error.message };
    return { ok: true, entries: rows ?? [] };
  });

export const addAgendaComment = createServerFn({ method: "POST" })
  .inputValidator((input: { password: string; agendaId: string; authorName: string; authorRole?: string; body: string }) => input)
  .handler(async ({ data }): Promise<{ ok: true } | Fail> => {
    const gate = staffClient(data.password);
    if (!gate.ok) return gate;
    if (!data.body.trim()) return { ok: false, error: "Comment kosong." };
    await addTimelineEntry(gate.supabase, data.agendaId, data.authorName, data.authorRole, data.body.trim());
    return { ok: true };
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

// PIC assignment — internal staff (linked account) or external name/contact
// only (no login, can't fill in anything themselves).
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
