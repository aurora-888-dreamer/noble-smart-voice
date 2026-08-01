import { createServerFn } from "@tanstack/react-start";
import { staffClient, schoolId, parentScope, generateCharacterNarration, generateCharacterNarrationBatch } from "./school-academic.server";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>;
type Fail = { ok: false; error: string };

// ————— Domains (Principal-managed, per division) —————
export const listAssessmentDomains = createServerFn({ method: "POST" })
  .inputValidator((input: { password: string; division: string }) => input)
  .handler(async ({ data }): Promise<{ ok: true; domains: Row[] } | Fail> => {
    const gate = staffClient(data.password);
    if (!gate.ok) return gate;
    const { data: rows, error } = await gate.supabase
      .from("school_assessment_domains").select("*").eq("division", data.division).order("sort_order");
    if (error) return { ok: false, error: error.message };
    return { ok: true, domains: rows ?? [] };
  });

export const saveAssessmentDomain = createServerFn({ method: "POST" })
  .inputValidator((input: { password: string; staffId: string; division: string; code: string; name: string }) => input)
  .handler(async ({ data }): Promise<{ ok: true } | Fail> => {
    const gate = staffClient(data.password);
    if (!gate.ok) return gate;
    if (!data.code.trim() || !data.name.trim()) return { ok: false, error: "Kode dan nama domain wajib diisi." };
    const { error } = await gate.supabase.from("school_assessment_domains").insert({
      school_id: schoolId(), division: data.division, code: data.code.trim().toUpperCase(), name: data.name.trim(), created_by: data.staffId || null,
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  });

export const deleteAssessmentDomain = createServerFn({ method: "POST" })
  .inputValidator((input: { password: string; id: string }) => input)
  .handler(async ({ data }): Promise<{ ok: true } | Fail> => {
    const gate = staffClient(data.password);
    if (!gate.ok) return gate;
    const { error } = await gate.supabase.from("school_assessment_domains").delete().eq("id", data.id);
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  });

// ————— Master Indicator Bank —————
export const listAssessmentIndicators = createServerFn({ method: "POST" })
  .inputValidator((input: { password: string; division: string; level?: string; subject?: string }) => input)
  .handler(async ({ data }): Promise<{ ok: true; indicators: Row[] } | Fail> => {
    const gate = staffClient(data.password);
    if (!gate.ok) return gate;
    let q = gate.supabase.from("school_assessment_indicators").select("*").eq("division", data.division).order("sort_order");
    if (data.subject) {
      q = data.level ? q.or(`level.eq.${data.level},subject.eq.${data.subject}`) : q.eq("subject", data.subject);
    } else if (data.level) {
      q = q.eq("level", data.level);
    }
    const { data: rows, error } = await q;
    if (error) return { ok: false, error: error.message };
    return { ok: true, indicators: rows ?? [] };
  });

export const saveAssessmentIndicator = createServerFn({ method: "POST" })
  .inputValidator(
    (input: {
      password: string; staffId: string; division: string; level: string; domainCode: string;
      indicatorCode: string; description: string; evidenceExample?: string; relatedActivity?: string; subject?: string;
    }) => input,
  )
  .handler(async ({ data }): Promise<{ ok: true } | Fail> => {
    const gate = staffClient(data.password);
    if (!gate.ok) return gate;
    if (!data.indicatorCode.trim() || !data.description.trim()) return { ok: false, error: "Kode indikator dan deskripsi wajib diisi." };
    const { error } = await gate.supabase.from("school_assessment_indicators").insert({
      school_id: schoolId(), division: data.division, level: data.level, domain_code: data.domainCode,
      indicator_code: data.indicatorCode.trim().toUpperCase(), description: data.description.trim(),
      evidence_example: data.evidenceExample || null, related_activity: data.relatedActivity || null,
      subject: data.subject || null, created_by: data.staffId || null,
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  });

export const deleteAssessmentIndicator = createServerFn({ method: "POST" })
  .inputValidator((input: { password: string; id: string }) => input)
  .handler(async ({ data }): Promise<{ ok: true } | Fail> => {
    const gate = staffClient(data.password);
    if (!gate.ok) return gate;
    const { error } = await gate.supabase.from("school_assessment_indicators").delete().eq("id", data.id);
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  });

// ————— Per-student assessment records (Teacher) —————
export const listAssessmentRecords = createServerFn({ method: "POST" })
  .inputValidator((input: { password: string; studentId: string; periodType?: string; periodLabel?: string }) => input)
  .handler(async ({ data }): Promise<{ ok: true; records: Row[] } | Fail> => {
    const gate = staffClient(data.password);
    if (!gate.ok) return gate;
    let q = gate.supabase
      .from("school_assessment_records")
      .select("*, school_assessment_indicators(indicator_code, description, domain_code, level), school_staff(full_name)")
      .eq("student_id", data.studentId).order("assessed_at", { ascending: false });
    if (data.periodType) q = q.eq("period_type", data.periodType);
    if (data.periodLabel) q = q.eq("period_label", data.periodLabel);
    const { data: rows, error } = await q;
    if (error) return { ok: false, error: error.message };
    return { ok: true, records: rows ?? [] };
  });

export const saveAssessmentRecord = createServerFn({ method: "POST" })
  .inputValidator(
    (input: {
      password: string; studentId: string; classId?: string; indicatorId: string; teacherId: string;
      rubric: "I" | "E" | "D" | "M"; evidenceNote?: string; teacherComment?: string; periodType: string; periodLabel: string;
    }) => input,
  )
  .handler(async ({ data }): Promise<{ ok: true } | Fail> => {
    const gate = staffClient(data.password);
    if (!gate.ok) return gate;
    const { error } = await gate.supabase.from("school_assessment_records").insert({
      school_id: schoolId(), student_id: data.studentId, class_id: data.classId || null, indicator_id: data.indicatorId,
      teacher_id: data.teacherId || null, rubric: data.rubric, evidence_note: data.evidenceNote || null,
      teacher_comment: data.teacherComment || null, period_type: data.periodType, period_label: data.periodLabel,
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  });

export const deleteAssessmentRecord = createServerFn({ method: "POST" })
  .inputValidator((input: { password: string; id: string }) => input)
  .handler(async ({ data }): Promise<{ ok: true } | Fail> => {
    const gate = staffClient(data.password);
    if (!gate.ok) return gate;
    const { error } = await gate.supabase.from("school_assessment_records").delete().eq("id", data.id);
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  });

// ————— Parent-facing reports, gated by mandatory Principal approval —————
export const listAssessmentReports = createServerFn({ method: "POST" })
  .inputValidator((input: { password: string; studentId?: string; division?: string; status?: string }) => input)
  .handler(async ({ data }): Promise<{ ok: true; reports: Row[] } | Fail> => {
    const gate = staffClient(data.password);
    if (!gate.ok) return gate;
    let q = gate.supabase.from("school_assessment_reports").select("*, school_students(full_name, class_id)").order("created_at", { ascending: false });
    if (data.studentId) q = q.eq("student_id", data.studentId);
    if (data.division) q = q.eq("division", data.division);
    if (data.status) q = q.eq("status", data.status);
    const { data: rows, error } = await q;
    if (error) return { ok: false, error: error.message };
    return { ok: true, reports: rows ?? [] };
  });

export const generateAssessmentReport = createServerFn({ method: "POST" })
  .inputValidator(
    (input: {
      password: string; staffId: string; studentId: string; division: string; periodType: string; periodLabel: string;
      summary?: string; recommendations?: string; nextTarget?: string;
    }) => input,
  )
  .handler(async ({ data }): Promise<{ ok: true } | Fail> => {
    const gate = staffClient(data.password);
    if (!gate.ok) return gate;
    const { error } = await gate.supabase.from("school_assessment_reports").insert({
      school_id: schoolId(), student_id: data.studentId, division: data.division, period_type: data.periodType,
      period_label: data.periodLabel, status: "pending_approval", summary: data.summary || null,
      recommendations: data.recommendations || null, next_target: data.nextTarget || null, generated_by: data.staffId || null,
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  });

export const reviewAssessmentReport = createServerFn({ method: "POST" })
  .inputValidator((input: { password: string; staffId: string; reportId: string; decision: "approve" | "revise"; notes?: string }) => input)
  .handler(async ({ data }): Promise<{ ok: true } | Fail> => {
    const gate = staffClient(data.password, true); // Principal/admin tier
    if (!gate.ok) return gate;
    const patch: Row = { principal_notes: data.notes || null, updated_at: new Date().toISOString() };
    if (data.decision === "approve") {
      patch.status = "published";
      patch.approved_by = data.staffId || null;
      patch.approved_at = new Date().toISOString();
      patch.published_at = new Date().toISOString();
    } else {
      patch.status = "revision_requested";
    }
    const { error } = await gate.supabase.from("school_assessment_reports").update(patch).eq("id", data.reportId);
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  });

export const listAssessmentReportsForCode = createServerFn({ method: "POST" })
  .inputValidator((input: { code: string }) => input)
  .handler(async ({ data }): Promise<{ ok: true; reports: Row[] } | Fail> => {
    const scope = await parentScope(data.code);
    if (!scope.ok) return scope;
    const { data: rows, error } = await scope.supabase
      .from("school_assessment_reports").select("*").eq("student_id", scope.studentId).eq("status", "published").order("created_at", { ascending: false });
    if (error) return { ok: false, error: error.message };
    return { ok: true, reports: rows ?? [] };
  });

// ————— "14 Character" — school-wide traits, separate from Competency Indicators —————
export const listCharacters = createServerFn({ method: "POST" })
  .inputValidator((input: { password: string }) => input)
  .handler(async ({ data }): Promise<{ ok: true; characters: Row[] } | Fail> => {
    const gate = staffClient(data.password);
    if (!gate.ok) return gate;
    const { data: rows, error } = await gate.supabase.from("school_assessment_characters").select("*").order("sort_order");
    if (error) return { ok: false, error: error.message };
    return { ok: true, characters: rows ?? [] };
  });

export const saveCharacter = createServerFn({ method: "POST" })
  .inputValidator((input: { password: string; staffId: string; name: string; description?: string }) => input)
  .handler(async ({ data }): Promise<{ ok: true } | Fail> => {
    const gate = staffClient(data.password);
    if (!gate.ok) return gate;
    if (!data.name.trim()) return { ok: false, error: "Nama karakter wajib diisi." };
    const { error } = await gate.supabase.from("school_assessment_characters").insert({
      school_id: schoolId(), name: data.name.trim(), description: data.description || null, created_by: data.staffId || null,
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  });

export const deleteCharacter = createServerFn({ method: "POST" })
  .inputValidator((input: { password: string; id: string }) => input)
  .handler(async ({ data }): Promise<{ ok: true } | Fail> => {
    const gate = staffClient(data.password);
    if (!gate.ok) return gate;
    const { error } = await gate.supabase.from("school_assessment_characters").delete().eq("id", data.id);
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  });

export const listCharacterRecords = createServerFn({ method: "POST" })
  .inputValidator((input: { password: string; studentId: string; periodType?: string; periodLabel?: string }) => input)
  .handler(async ({ data }): Promise<{ ok: true; records: Row[] } | Fail> => {
    const gate = staffClient(data.password);
    if (!gate.ok) return gate;
    let q = gate.supabase
      .from("school_assessment_character_records").select("*, school_assessment_characters(name)").eq("student_id", data.studentId).order("assessed_at", { ascending: false });
    if (data.periodType) q = q.eq("period_type", data.periodType);
    if (data.periodLabel) q = q.eq("period_label", data.periodLabel);
    const { data: rows, error } = await q;
    if (error) return { ok: false, error: error.message };
    return { ok: true, records: rows ?? [] };
  });

export const draftCharacterNarrationBatch = createServerFn({ method: "POST" })
  .inputValidator((input: { password: string; studentName: string; characters: { name: string; score: number }[] }) => input)
  .handler(async ({ data }): Promise<{ ok: true; note: string } | Fail> => {
    const gate = staffClient(data.password);
    if (!gate.ok) return gate;
    return generateCharacterNarrationBatch({ studentName: data.studentName, characters: data.characters });
  });

export const saveCharacterRecordsBatch = createServerFn({ method: "POST" })
  .inputValidator(
    (input: {
      password: string; studentId: string; teacherId: string; narrationMode: "auto" | "manual"; narration: string;
      periodType: string; periodLabel: string; scores: { characterId: string; score: number }[];
    }) => input,
  )
  .handler(async ({ data }): Promise<{ ok: true } | Fail> => {
    const gate = staffClient(data.password);
    if (!gate.ok) return gate;
    const rows = data.scores
      .filter((s) => s.score >= 0 && s.score <= 100)
      .map((s) => ({
        school_id: schoolId(), student_id: data.studentId, character_id: s.characterId, teacher_id: data.teacherId || null,
        score: s.score, narration: data.narration || null, narration_mode: data.narrationMode,
        period_type: data.periodType, period_label: data.periodLabel,
      }));
    if (rows.length === 0) return { ok: false, error: "Tidak ada skor untuk disimpan." };
    const { error } = await gate.supabase.from("school_assessment_character_records").insert(rows);
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  });

export const draftCharacterNarration = createServerFn({ method: "POST" })
  .inputValidator((input: { password: string; studentName: string; characterName: string; score: number }) => input)
  .handler(async ({ data }): Promise<{ ok: true; note: string } | Fail> => {
    const gate = staffClient(data.password);
    if (!gate.ok) return gate;
    return generateCharacterNarration({ studentName: data.studentName, characterName: data.characterName, score: data.score });
  });

export const saveCharacterRecord = createServerFn({ method: "POST" })
  .inputValidator(
    (input: {
      password: string; studentId: string; characterId: string; teacherId: string;
      score: number; narration?: string; narrationMode: "auto" | "manual"; periodType: string; periodLabel: string;
    }) => input,
  )
  .handler(async ({ data }): Promise<{ ok: true } | Fail> => {
    const gate = staffClient(data.password);
    if (!gate.ok) return gate;
    if (data.score < 0 || data.score > 100) return { ok: false, error: "Skor harus 0-100." };
    const { error } = await gate.supabase.from("school_assessment_character_records").insert({
      school_id: schoolId(), student_id: data.studentId, character_id: data.characterId, teacher_id: data.teacherId || null,
      score: data.score, narration: data.narration || null, narration_mode: data.narrationMode,
      period_type: data.periodType, period_label: data.periodLabel,
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  });
