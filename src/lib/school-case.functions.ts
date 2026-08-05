import { createServerFn } from "@tanstack/react-start";
import { staffClient, parentScope, schoolId } from "./school-academic.server";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>;
type Fail = { ok: false; error: string };

async function addTimelineEntry(
  supabase: Row, caseId: string, authorName: string, authorRole: string | undefined,
  body: string, entryType: "comment" | "system" = "comment",
) {
  await supabase.from("school_case_timeline").insert({
    case_id: caseId, author_name: authorName, author_role: authorRole || null, body, entry_type: entryType,
  });
}

// ————— Reporting a case —————
export const reportCaseAsTeacher = createServerFn({ method: "POST" })
  .inputValidator(
    (input: { password: string; staffId: string; staffName: string; classId?: string; studentId?: string; division?: string; title: string; description?: string }) => input,
  )
  .handler(async ({ data }): Promise<{ ok: true; caseId: string } | Fail> => {
    const gate = staffClient(data.password);
    if (!gate.ok) return gate;
    const { data: row, error } = await gate.supabase.from("school_cases").insert({
      school_id: schoolId(),
      title: data.title.trim(),
      description: data.description || null,
      reported_by_type: "teacher",
      reported_by_staff_id: data.staffId,
      class_id: data.classId || null,
      student_id: data.studentId || null,
      division: data.division || null,
      status: "open",
    }).select().single();
    if (error) return { ok: false, error: error.message };
    await addTimelineEntry(gate.supabase, row.id, data.staffName, "teacher", `Melaporkan kasus: ${data.title.trim()}`, "system");
    return { ok: true, caseId: row.id };
  });

export const reportCaseAsHos = createServerFn({ method: "POST" })
  .inputValidator(
    (input: { password: string; staffId: string; staffName: string; classId?: string; studentId?: string; division?: string; title: string; description?: string }) => input,
  )
  .handler(async ({ data }): Promise<{ ok: true; caseId: string } | Fail> => {
    const gate = staffClient(data.password, true);
    if (!gate.ok) return gate;
    const { data: row, error } = await gate.supabase.from("school_cases").insert({
      school_id: schoolId(),
      title: data.title.trim(),
      description: data.description || null,
      reported_by_type: "hos",
      reported_by_staff_id: data.staffId,
      class_id: data.classId || null,
      student_id: data.studentId || null,
      division: data.division || null,
      status: "hos",
      was_escalated: true,
    }).select().single();
    if (error) return { ok: false, error: error.message };
    await addTimelineEntry(gate.supabase, row.id, data.staffName, "hos", `Case opened: ${data.title.trim()}`, "system");
    return { ok: true, caseId: row.id };
  });

export const reportCaseAsPrincipal = createServerFn({ method: "POST" })
  .inputValidator(
    (input: { password: string; staffId: string; staffName: string; classId?: string; studentId?: string; division?: string; title: string; description?: string }) => input,
  )
  .handler(async ({ data }): Promise<{ ok: true; caseId: string } | Fail> => {
    const gate = staffClient(data.password, true);
    if (!gate.ok) return gate;
    const { data: row, error } = await gate.supabase.from("school_cases").insert({
      school_id: schoolId(),
      title: data.title.trim(),
      description: data.description || null,
      reported_by_type: "principal",
      reported_by_staff_id: data.staffId,
      class_id: data.classId || null,
      student_id: data.studentId || null,
      division: data.division || null,
      status: "open",
    }).select().single();
    if (error) return { ok: false, error: error.message };
    await addTimelineEntry(gate.supabase, row.id, data.staffName, "principal", `Case opened: ${data.title.trim()}`, "system");
    return { ok: true, caseId: row.id };
  });

export const reportCaseAsParent = createServerFn({ method: "POST" })
  .inputValidator((input: { code: string; title: string; description?: string }) => input)
  .handler(async ({ data }): Promise<{ ok: true; caseId: string } | Fail> => {
    const scope = await parentScope(data.code);
    if (!scope.ok) return scope;
    const { data: guardian } = await scope.supabase
      .from("school_guardians").select("id").eq("invite_code", data.code.trim().toUpperCase()).maybeSingle();
    const { data: row, error } = await scope.supabase.from("school_cases").insert({
      school_id: schoolId(),
      title: data.title.trim(),
      description: data.description || null,
      reported_by_type: "parent",
      reported_by_guardian_id: guardian?.id || null,
      student_id: scope.studentId,
      class_id: scope.classId,
      status: "open",
    }).select().single();
    if (error) return { ok: false, error: error.message };
    await addTimelineEntry(scope.supabase, row.id, scope.studentName + " (orangtua)", "parent", `Melaporkan kasus: ${data.title.trim()}`, "system");
    return { ok: true, caseId: row.id };
  });

export const listCasesForParent = createServerFn({ method: "POST" })
  .inputValidator((input: { code: string }) => input)
  .handler(async ({ data }): Promise<{ ok: true; cases: Row[] } | Fail> => {
    const scope = await parentScope(data.code);
    if (!scope.ok) return scope;
    const { data: rows, error } = await scope.supabase
      .from("school_cases").select("*").eq("student_id", scope.studentId).order("created_at", { ascending: false });
    if (error) return { ok: false, error: error.message };
    return { ok: true, cases: rows ?? [] };
  });

export const listCaseTimelineForParent = createServerFn({ method: "POST" })
  .inputValidator((input: { code: string; caseId: string }) => input)
  .handler(async ({ data }): Promise<{ ok: true; entries: Row[] } | Fail> => {
    const scope = await parentScope(data.code);
    if (!scope.ok) return scope;
    // Confirm this case actually belongs to their child before showing anything.
    const { data: kase } = await scope.supabase.from("school_cases").select("student_id").eq("id", data.caseId).maybeSingle();
    if (!kase || kase.student_id !== scope.studentId) return { ok: false, error: "Kasus tidak ditemukan." };
    const { data: rows, error } = await scope.supabase
      .from("school_case_timeline").select("*").eq("case_id", data.caseId).order("created_at", { ascending: true });
    if (error) return { ok: false, error: error.message };
    return { ok: true, entries: rows ?? [] };
  });

export const addCaseCommentAsParent = createServerFn({ method: "POST" })
  .inputValidator((input: { code: string; caseId: string; body: string }) => input)
  .handler(async ({ data }): Promise<{ ok: true } | Fail> => {
    const scope = await parentScope(data.code);
    if (!scope.ok) return scope;
    if (!data.body.trim()) return { ok: false, error: "Komentar kosong." };
    const { data: kase } = await scope.supabase.from("school_cases").select("student_id").eq("id", data.caseId).maybeSingle();
    if (!kase || kase.student_id !== scope.studentId) return { ok: false, error: "Kasus tidak ditemukan." };
    await addTimelineEntry(scope.supabase, data.caseId, scope.studentName + " (orangtua)", "parent", data.body.trim());
    return { ok: true };
  });

// ————— Listing (role-scoped) —————
export const listCases = createServerFn({ method: "POST" })
  .inputValidator((input: { password: string; role: "teacher" | "principal" | "hos"; staffId: string; division?: string }) => input)
  .handler(async ({ data }): Promise<{ ok: true; cases: Row[] } | Fail> => {
    const gate = staffClient(data.password);
    if (!gate.ok) return gate;
    let q = gate.supabase
      .from("school_cases")
      .select("*, school_students(full_name), school_classes(name), reporter:reported_by_staff_id(full_name)")
      .order("created_at", { ascending: false });

    // Whoever is an invited participant sees it too, regardless of role/division/escalation scope.
    const { data: partRows } = await gate.supabase
      .from("school_case_participants").select("case_id").eq("participant_type", "staff").eq("staff_id", data.staffId);
    const invitedIds = (partRows ?? []).map((r: Row) => r.case_id);
    const invitedClause = invitedIds.length > 0 ? `,id.in.(${invitedIds.join(",")})` : "";

    if (data.role === "hos") {
      q = q.or(`was_escalated.eq.true${invitedClause}`); // HoS sees escalated cases + anything they're invited to
    } else if (data.role === "principal" && data.division) {
      q = q.or(`division.eq.${data.division}${invitedClause}`);
    } else if (data.role === "teacher") {
      q = q.or(`reported_by_staff_id.eq.${data.staffId}${invitedClause}`);
    }
    const { data: rows, error } = await q;
    if (error) return { ok: false, error: error.message };
    return { ok: true, cases: rows ?? [] };
  });

// ————— Timeline & participants —————
export const listCaseTimeline = createServerFn({ method: "POST" })
  .inputValidator((input: { password: string; caseId: string }) => input)
  .handler(async ({ data }): Promise<{ ok: true; entries: Row[] } | Fail> => {
    const gate = staffClient(data.password);
    if (!gate.ok) return gate;
    const { data: rows, error } = await gate.supabase
      .from("school_case_timeline").select("*").eq("case_id", data.caseId).order("created_at", { ascending: true });
    if (error) return { ok: false, error: error.message };
    return { ok: true, entries: rows ?? [] };
  });

export const addCaseComment = createServerFn({ method: "POST" })
  .inputValidator((input: { password: string; caseId: string; authorName: string; authorRole?: string; body: string }) => input)
  .handler(async ({ data }): Promise<{ ok: true } | Fail> => {
    const gate = staffClient(data.password);
    if (!gate.ok) return gate;
    if (!data.body.trim()) return { ok: false, error: "Komentar kosong." };
    await addTimelineEntry(gate.supabase, data.caseId, data.authorName, data.authorRole, data.body.trim());
    return { ok: true };
  });

export const listCaseParticipants = createServerFn({ method: "POST" })
  .inputValidator((input: { password: string; caseId: string }) => input)
  .handler(async ({ data }): Promise<{ ok: true; participants: Row[] } | Fail> => {
    const gate = staffClient(data.password);
    if (!gate.ok) return gate;
    const { data: rows, error } = await gate.supabase
      .from("school_case_participants")
      .select("*, school_staff(full_name), school_guardians(full_name)")
      .eq("case_id", data.caseId);
    if (error) return { ok: false, error: error.message };
    return { ok: true, participants: rows ?? [] };
  });

export const addCaseParticipant = createServerFn({ method: "POST" })
  .inputValidator(
    (input: {
      password: string; caseId: string; invitedBy: string; invitedByName: string;
      participantType: "staff" | "parent" | "external";
      staffId?: string; guardianId?: string; externalName?: string; externalContact?: string;
    }) => input,
  )
  .handler(async ({ data }): Promise<{ ok: true } | Fail> => {
    const gate = staffClient(data.password, true); // Principal/HoS tier only invites
    if (!gate.ok) return gate;
    const { error } = await gate.supabase.from("school_case_participants").insert({
      case_id: data.caseId,
      participant_type: data.participantType,
      staff_id: data.participantType === "staff" ? data.staffId : null,
      guardian_id: data.participantType === "parent" ? data.guardianId : null,
      external_name: data.participantType === "external" ? data.externalName : null,
      external_contact: data.participantType === "external" ? data.externalContact : null,
      invited_by: data.invitedBy,
    });
    if (error) return { ok: false, error: error.message };
    const who = data.participantType === "external" ? data.externalName : "seseorang";
    await addTimelineEntry(gate.supabase, data.caseId, data.invitedByName, "principal", `Mengundang ${who} ke kasus ini.`, "system");
    return { ok: true };
  });

// ————— Status changes: escalate / close / reopen —————
export const escalateCaseToHos = createServerFn({ method: "POST" })
  .inputValidator((input: { password: string; caseId: string; actorName: string }) => input)
  .handler(async ({ data }): Promise<{ ok: true } | Fail> => {
    const gate = staffClient(data.password, true);
    if (!gate.ok) return gate;
    const { data: kase, error: readErr } = await gate.supabase.from("school_cases").select("status").eq("id", data.caseId).maybeSingle();
    if (readErr) return { ok: false, error: readErr.message };
    if (!kase || kase.status !== "open") return { ok: false, error: "Kasus ini tidak bisa diteruskan ke HoS dari status sekarang." };
    const { error } = await gate.supabase.from("school_cases").update({ status: "hos", was_escalated: true }).eq("id", data.caseId);
    if (error) return { ok: false, error: error.message };
    await addTimelineEntry(gate.supabase, data.caseId, data.actorName, "principal", "Meneruskan kasus ini ke Head of School.", "system");
    return { ok: true };
  });

export const closeCase = createServerFn({ method: "POST" })
  .inputValidator((input: { password: string; caseId: string; actorName: string; actorRole: "principal" | "hos" }) => input)
  .handler(async ({ data }): Promise<{ ok: true } | Fail> => {
    const gate = staffClient(data.password, true);
    if (!gate.ok) return gate;
    const { data: kase, error: readErr } = await gate.supabase.from("school_cases").select("status").eq("id", data.caseId).maybeSingle();
    if (readErr) return { ok: false, error: readErr.message };
    if (!kase) return { ok: false, error: "Kasus tidak ditemukan." };
    const owner = kase.status === "hos" ? "hos" : "principal";
    // HoS has ultimate authority — can force-close a case even if it's
    // still with Principal ("Authorized Final Close"). Principal can only
    // close what's currently theirs.
    if (data.actorRole === "principal" && owner !== "principal") {
      return { ok: false, error: "Kasus ini saat ini di tangan Head of School — hanya dia yang bisa menutup." };
    }
    const { error } = await gate.supabase.from("school_cases").update({ status: "selesai", closed_at: new Date().toISOString() }).eq("id", data.caseId);
    if (error) return { ok: false, error: error.message };
    await addTimelineEntry(gate.supabase, data.caseId, data.actorName, data.actorRole, "Menutup kasus ini — status: Selesai. Masuk arsip.", "system");
    return { ok: true };
  });

export const reopenCase = createServerFn({ method: "POST" })
  .inputValidator((input: { password: string; caseId: string; actorName: string; actorRole: "principal" | "hos" }) => input)
  .handler(async ({ data }): Promise<{ ok: true } | Fail> => {
    const gate = staffClient(data.password, true);
    if (!gate.ok) return gate;
    const { data: kase, error: readErr } = await gate.supabase.from("school_cases").select("status, was_escalated").eq("id", data.caseId).maybeSingle();
    if (readErr) return { ok: false, error: readErr.message };
    if (!kase || kase.status !== "selesai") return { ok: false, error: "Kasus ini belum ditutup." };
    const backTo = kase.was_escalated ? "hos" : "open";
    const { error } = await gate.supabase.from("school_cases").update({ status: backTo, closed_at: null }).eq("id", data.caseId);
    if (error) return { ok: false, error: error.message };
    await addTimelineEntry(gate.supabase, data.caseId, data.actorName, data.actorRole, "Membuka kembali kasus ini dari arsip.", "system");
    return { ok: true };
  });
