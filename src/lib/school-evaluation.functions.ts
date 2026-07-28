import { createServerFn } from "@tanstack/react-start";
import { staffClient, schoolId } from "./school-academic.server";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>;
type Fail = { ok: false; error: string };

export const listEvaluations = createServerFn({ method: "POST" })
  .inputValidator((input: { password: string; role: "principal" | "hos"; division?: string }) => input)
  .handler(async ({ data }): Promise<{ ok: true; evaluations: Row[] } | Fail> => {
    const gate = staffClient(data.password);
    if (!gate.ok) return gate;
    let q = gate.supabase
      .from("school_evaluations")
      .select("*, school_staff(full_name)")
      .order("created_at", { ascending: false });
    if (data.role === "hos") {
      q = q.eq("status", "submitted"); // HoS only sees submitted evaluations, not Principal's drafts
    } else if (data.division) {
      q = q.eq("division", data.division);
    }
    const { data: rows, error } = await q;
    if (error) return { ok: false, error: error.message };
    return { ok: true, evaluations: rows ?? [] };
  });

export const saveEvaluation = createServerFn({ method: "POST" })
  .inputValidator(
    (input: { password: string; id?: string; staffId: string; division?: string; title: string; period?: string; content?: string; submit?: boolean }) => input,
  )
  .handler(async ({ data }): Promise<{ ok: true; evaluation: Row } | Fail> => {
    const gate = staffClient(data.password, true);
    if (!gate.ok) return gate;
    const payload = {
      school_id: schoolId(),
      division: data.division || null,
      title: data.title.trim(),
      period: data.period || null,
      content: data.content || null,
      status: data.submit ? "submitted" : "draft",
    };
    const q = data.id
      ? gate.supabase.from("school_evaluations").update(payload).eq("id", data.id).select().single()
      : gate.supabase.from("school_evaluations").insert({ ...payload, submitted_by: data.staffId || null }).select().single();
    const { data: row, error } = await q;
    if (error) return { ok: false, error: error.message };
    return { ok: true, evaluation: row as Row };
  });

export const deleteEvaluation = createServerFn({ method: "POST" })
  .inputValidator((input: { password: string; id: string }) => input)
  .handler(async ({ data }): Promise<{ ok: true } | Fail> => {
    const gate = staffClient(data.password, true);
    if (!gate.ok) return gate;
    const { error } = await gate.supabase.from("school_evaluations").delete().eq("id", data.id);
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  });
