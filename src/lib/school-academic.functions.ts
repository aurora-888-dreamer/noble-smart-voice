import { createServerFn } from "@tanstack/react-start";
import {
  staffClient,
  parentScope,
  schoolId,
  generateNoteDraft,
  type ProjectStatus,
} from "./school-academic.server";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>;
type Fail = { ok: false; error: string };

// ————— 1. Academic calendar —————
export const listCalendarEvents = createServerFn({ method: "POST" })
  .inputValidator((input: { password?: string; code?: string; classId?: string; division?: string; from?: string; to?: string; scopeAll?: boolean; schoolWideOnly?: boolean }) => input)
  .handler(async ({ data }): Promise<{ ok: true; events: Row[] } | Fail> => {
    let supabase;
    let classFilter = data.classId ?? null;
    let divisionFilter = data.division ?? null;
    if (data.code) {
      const scope = await parentScope(data.code);
      if (!scope.ok) return scope;
      supabase = scope.supabase;
      classFilter = scope.classId;
      const { data: cls } = await scope.supabase.from("school_classes").select("division").eq("id", scope.classId).maybeSingle();
      divisionFilter = cls?.division ?? null;
    } else {
      const gate = staffClient(data.password ?? "");
      if (!gate.ok) return gate;
      supabase = gate.supabase;
    }
    let q = supabase.from("school_calendar_events").select("*, school_staff(full_name)").order("event_date", { ascending: true });
    if (data.schoolWideOnly) {
      q = q.is("division", null).is("class_id", null); // explicitly chosen "School Wide" scope
    } else if (!data.scopeAll) {
      if (classFilter && divisionFilter) {
        // Parent or Teacher pinned to one class: whole-school + whole-division
        // (division-wide, not tied to a class) + their own class specifically.
        q = q.or(`division.is.null,and(division.eq.${divisionFilter},class_id.is.null),class_id.eq.${classFilter}`);
      } else if (classFilter) {
        q = q.or(`division.is.null,class_id.eq.${classFilter}`);
      } else if (divisionFilter) {
        // Principal viewing their whole division: whole-school + anything in their division (including class-specific).
        q = q.or(`division.is.null,division.eq.${divisionFilter}`);
      } else {
        q = q.is("division", null).is("class_id", null); // fallback: whole-school only
      }
    }
    if (data.from) q = q.gte("event_date", data.from);
    if (data.to) q = q.lte("event_date", data.to);
    const { data: rows, error } = await q;
    if (error) return { ok: false, error: error.message };

    // Auto-generate each student's birthday as a calendar entry for their
    // own class — computed live from dob, never stored as a real row, so it
    // always tracks the roster/dob without needing yearly re-entry. Shown
    // for the current year and next (covers Dec->Jan browsing) unless a
    // from/to range was given, in which case only years touching that range.
    let birthdayEvents: Row[] = [];
    if (classFilter) {
      const { data: students } = await supabase
        .from("school_students").select("id, full_name, nickname, dob").eq("class_id", classFilter);
      const years = new Set<number>();
      const nowYear = new Date().getFullYear();
      if (data.from) years.add(new Date(data.from).getFullYear());
      if (data.to) years.add(new Date(data.to).getFullYear());
      if (years.size === 0) { years.add(nowYear); years.add(nowYear + 1); }
      for (const s of students ?? []) {
        if (!s.dob) continue;
        const dob = new Date(s.dob);
        const mm = String(dob.getMonth() + 1).padStart(2, "0");
        const dd = String(dob.getDate()).padStart(2, "0");
        for (const y of years) {
          birthdayEvents.push({
            id: `birthday-${s.id}-${y}`,
            title: `🎂 Ulang Tahun ${s.nickname || s.full_name}`,
            description: null,
            event_date: `${y}-${mm}-${dd}`,
            event_type: "acara",
            class_id: classFilter,
            division: divisionFilter,
            created_by: null,
            school_staff: null,
          });
        }
      }
    }
    return { ok: true, events: [...(rows ?? []), ...birthdayEvents] };
  });

export const saveCalendarEvent = createServerFn({ method: "POST" })
  .inputValidator(
    (input: {
      password: string; id?: string; classId?: string; title: string;
      description?: string; eventDate: string; eventType: string; staffId: string;
      divisionScope?: string; // used only when classId is empty (whole-school = undefined, whole-division = the division id)
    }) => input,
  )
  .handler(async ({ data }): Promise<{ ok: true; event: Row } | Fail> => {
    const gate = staffClient(data.password);
    if (!gate.ok) return gate;
    let division: string | null = data.divisionScope || null;
    if (data.classId) {
      const { data: cls } = await gate.supabase.from("school_classes").select("division").eq("id", data.classId).maybeSingle();
      division = cls?.division ?? null;
    }
    const payload = {
      school_id: schoolId(),
      class_id: data.classId || null,
      division,
      title: data.title.trim(),
      description: data.description || null,
      event_date: data.eventDate,
      event_type: data.eventType,
    };
    if (data.id) {
      // Only the original creator may edit their own agenda entry — everyone
      // can still VIEW every event, but editing someone else's is blocked
      // here (not just hidden in the UI) so HoS can't overwrite what a
      // Teacher or Principal set up, and vice versa.
      const { data: existing, error: readErr } = await gate.supabase
        .from("school_calendar_events").select("created_by").eq("id", data.id).maybeSingle();
      if (readErr) return { ok: false, error: readErr.message };
      if (existing && existing.created_by && existing.created_by !== data.staffId) {
        return { ok: false, error: "Anda hanya bisa mengubah agenda yang Anda buat sendiri." };
      }
      const { data: row, error } = await gate.supabase
        .from("school_calendar_events").update(payload).eq("id", data.id).select().single();
      if (error) return { ok: false, error: error.message };
      return { ok: true, event: row as Row };
    }
    const { data: row, error } = await gate.supabase
      .from("school_calendar_events").insert({ ...payload, created_by: data.staffId || null }).select().single();
    if (error) return { ok: false, error: error.message };
    return { ok: true, event: row as Row };
  });

export const deleteCalendarEvent = createServerFn({ method: "POST" })
  .inputValidator((input: { password: string; id: string; staffId: string }) => input)
  .handler(async ({ data }): Promise<{ ok: true } | Fail> => {
    const gate = staffClient(data.password);
    if (!gate.ok) return gate;
    const { data: existing, error: readErr } = await gate.supabase
      .from("school_calendar_events").select("created_by").eq("id", data.id).maybeSingle();
    if (readErr) return { ok: false, error: readErr.message };
    if (existing && existing.created_by && existing.created_by !== data.staffId) {
      return { ok: false, error: "Anda hanya bisa menghapus agenda yang Anda buat sendiri." };
    }
    const { error } = await gate.supabase.from("school_calendar_events").delete().eq("id", data.id);
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  });

export const bulkImportCalendarEvents = createServerFn({ method: "POST" })
  .inputValidator(
    (input: {
      password: string; staffId: string;
      rows: { title: string; eventDate: string; eventType?: string; description?: string; classId?: string; division?: string }[];
    }) => input,
  )
  .handler(async ({ data }): Promise<{ ok: true; added: number } | Fail> => {
    const gate = staffClient(data.password);
    if (!gate.ok) return gate;
    // Resolve division from classId when given (so a class-scoped row is
    // always consistent with its class's division), else use the row's own
    // division value (blank = whole-school).
    const classIds = [...new Set(data.rows.map((r) => r.classId).filter(Boolean))] as string[];
    let classDivision: Record<string, string> = {};
    if (classIds.length > 0) {
      const { data: classes } = await gate.supabase.from("school_classes").select("id, division").in("id", classIds);
      classDivision = Object.fromEntries((classes ?? []).map((c: Row) => [c.id, c.division]));
    }
    const payload = data.rows
      .filter((r) => r.title?.trim() && r.eventDate?.trim())
      .map((r) => ({
        school_id: schoolId(),
        class_id: r.classId || null,
        division: r.classId ? (classDivision[r.classId] ?? null) : (r.division || null),
        title: r.title.trim(),
        description: r.description || null,
        event_date: r.eventDate.trim(),
        event_type: r.eventType?.trim() || "acara",
        created_by: data.staffId || null,
      }));
    if (payload.length === 0) return { ok: false, error: "Tidak ada baris valid untuk diimport." };
    const { error } = await gate.supabase.from("school_calendar_events").insert(payload);
    if (error) return { ok: false, error: error.message };
    return { ok: true, added: payload.length };
  });

// ————— 2. Timetable —————
export const listTimetable = createServerFn({ method: "POST" })
  .inputValidator((input: { password?: string; code?: string; classId?: string }) => input)
  .handler(async ({ data }): Promise<{ ok: true; slots: Row[] } | Fail> => {
    let supabase;
    let classFilter = data.classId ?? null;
    if (data.code) {
      const scope = await parentScope(data.code);
      if (!scope.ok) return scope;
      supabase = scope.supabase;
      classFilter = scope.classId;
    } else {
      const gate = staffClient(data.password ?? "");
      if (!gate.ok) return gate;
      supabase = gate.supabase;
    }
    let q = supabase
      .from("school_timetable")
      .select("*, school_staff(full_name)")
      .order("day_of_week")
      .order("start_time");
    if (classFilter) q = q.eq("class_id", classFilter);
    const { data: rows, error } = await q;
    if (error) return { ok: false, error: error.message };
    return { ok: true, slots: rows ?? [] };
  });

export const saveTimetableSlot = createServerFn({ method: "POST" })
  .inputValidator(
    (input: {
      password: string; id?: string; classId: string; dayOfWeek: number;
      subject: string; teacherId?: string; startTime: string; endTime: string;
    }) => input,
  )
  .handler(async ({ data }): Promise<{ ok: true; slot: Row } | Fail> => {
    const gate = staffClient(data.password);
    if (!gate.ok) return gate;
    const payload = {
      school_id: schoolId(),
      class_id: data.classId,
      day_of_week: data.dayOfWeek,
      subject: data.subject.trim(),
      teacher_id: data.teacherId || null,
      start_time: data.startTime,
      end_time: data.endTime,
    };
    const q = data.id
      ? gate.supabase.from("school_timetable").update(payload).eq("id", data.id).select().single()
      : gate.supabase.from("school_timetable").insert(payload).select().single();
    const { data: row, error } = await q;
    if (error) return { ok: false, error: error.message };
    return { ok: true, slot: row as Row };
  });

export const deleteTimetableSlot = createServerFn({ method: "POST" })
  .inputValidator((input: { password: string; id: string }) => input)
  .handler(async ({ data }): Promise<{ ok: true } | Fail> => {
    const gate = staffClient(data.password);
    if (!gate.ok) return gate;
    const { error } = await gate.supabase.from("school_timetable").delete().eq("id", data.id);
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  });

export const bulkImportTimetable = createServerFn({ method: "POST" })
  .inputValidator(
    (input: {
      password: string;
      rows: { classId: string; dayOfWeek: number; subject: string; startTime: string; endTime: string; teacherId?: string }[];
    }) => input,
  )
  .handler(async ({ data }): Promise<{ ok: true; added: number } | Fail> => {
    const gate = staffClient(data.password);
    if (!gate.ok) return gate;
    const payload = data.rows
      .filter((r) => r.classId && r.subject?.trim() && r.startTime && r.endTime)
      .map((r) => ({
        school_id: schoolId(),
        class_id: r.classId,
        day_of_week: r.dayOfWeek,
        subject: r.subject.trim(),
        teacher_id: r.teacherId || null,
        start_time: r.startTime,
        end_time: r.endTime,
      }));
    if (payload.length === 0) return { ok: false, error: "Tidak ada baris valid untuk diimport." };
    const { error } = await gate.supabase.from("school_timetable").insert(payload);
    if (error) return { ok: false, error: error.message };
    return { ok: true, added: payload.length };
  });

// ————— 3. Lesson plans —————
export const listLessonPlans = createServerFn({ method: "POST" })
  .inputValidator((input: { password: string; classId?: string; weekOf?: string }) => input)
  .handler(async ({ data }): Promise<{ ok: true; plans: Row[] } | Fail> => {
    const gate = staffClient(data.password);
    if (!gate.ok) return gate;
    let q = gate.supabase
      .from("school_lesson_plans")
      .select("*, school_staff(full_name), school_classes(name)")
      .order("week_of", { ascending: false });
    if (data.classId) q = q.eq("class_id", data.classId);
    if (data.weekOf) q = q.eq("week_of", data.weekOf);
    const { data: rows, error } = await q;
    if (error) return { ok: false, error: error.message };
    return { ok: true, plans: rows ?? [] };
  });

export const saveLessonPlan = createServerFn({ method: "POST" })
  .inputValidator(
    (input: {
      password: string; id?: string; classId: string; subject: string; teacherId?: string;
      weekOf: string; topic: string; objectives?: string; materials?: string;
    }) => input,
  )
  .handler(async ({ data }): Promise<{ ok: true; plan: Row } | Fail> => {
    const gate = staffClient(data.password);
    if (!gate.ok) return gate;
    const payload = {
      school_id: schoolId(),
      class_id: data.classId,
      subject: data.subject.trim(),
      teacher_id: data.teacherId || null,
      week_of: data.weekOf,
      topic: data.topic.trim(),
      objectives: data.objectives || null,
      materials: data.materials || null,
    };
    const q = data.id
      ? gate.supabase.from("school_lesson_plans").update(payload).eq("id", data.id).select().single()
      : gate.supabase.from("school_lesson_plans").insert(payload).select().single();
    const { data: row, error } = await q;
    if (error) return { ok: false, error: error.message };
    return { ok: true, plan: row as Row };
  });

export const deleteLessonPlan = createServerFn({ method: "POST" })
  .inputValidator((input: { password: string; id: string }) => input)
  .handler(async ({ data }): Promise<{ ok: true } | Fail> => {
    const gate = staffClient(data.password);
    if (!gate.ok) return gate;
    const { error } = await gate.supabase.from("school_lesson_plans").delete().eq("id", data.id);
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  });

// ————— 4. Projects + approval workflow —————
export const listProjects = createServerFn({ method: "POST" })
  .inputValidator((input: { password: string; classId?: string; status?: string }) => input)
  .handler(async ({ data }): Promise<{ ok: true; projects: Row[] } | Fail> => {
    const gate = staffClient(data.password);
    if (!gate.ok) return gate;
    let q = gate.supabase
      .from("school_projects")
      .select("*, school_classes(name, division), school_staff(full_name)")
      .order("created_at", { ascending: false });
    if (data.classId) q = q.eq("class_id", data.classId);
    if (data.status) q = q.eq("status", data.status);
    const { data: rows, error } = await q;
    if (error) return { ok: false, error: error.message };
    return { ok: true, projects: rows ?? [] };
  });

export const saveProject = createServerFn({ method: "POST" })
  .inputValidator(
    (input: { password: string; id?: string; classId: string; teacherId?: string; submitterRole?: "teacher" | "principal"; title: string; description?: string; submit?: boolean; requiresHos?: boolean }) =>
      input,
  )
  .handler(async ({ data }): Promise<{ ok: true; project: Row } | Fail> => {
    const gate = staffClient(data.password);
    if (!gate.ok) return gate;
    // A Principal creating their own Official Letter has implicitly already
    // "passed" the Principal review stage — it goes straight to HoS.
    const submittedStatus: ProjectStatus = data.submitterRole === "principal" ? "diajukan_hos" : "diajukan_principal";
    const payload = {
      school_id: schoolId(),
      class_id: data.classId,
      teacher_id: data.teacherId || null,
      title: data.title.trim(),
      description: data.description || null,
      status: (data.submit ? submittedStatus : "draft") as ProjectStatus,
      requires_hos: data.requiresHos ?? true,
    };
    const q = data.id
      ? gate.supabase.from("school_projects").update(payload).eq("id", data.id).select().single()
      : gate.supabase.from("school_projects").insert(payload).select().single();
    const { data: row, error } = await q;
    if (error) return { ok: false, error: error.message };
    return { ok: true, project: row as Row };
  });

export const reviewProject = createServerFn({ method: "POST" })
  .inputValidator(
    (input: {
      password: string; id: string; reviewerRole: "principal" | "hos";
      reviewerName?: string; decision: "approve" | "reject"; isRevisi?: boolean; notes?: string;
    }) => input,
  )
  .handler(async ({ data }): Promise<{ ok: true; status: ProjectStatus } | Fail> => {
    const gate = staffClient(data.password, true);
    if (!gate.ok) return gate;
    const { data: project, error: readErr } = await gate.supabase
      .from("school_projects").select("id, status, requires_hos").eq("id", data.id).maybeSingle();
    if (readErr) return { ok: false, error: readErr.message };
    if (!project) return { ok: false, error: "Project tidak ditemukan." };

    const current = (project as { status: string; requires_hos: boolean }).status;
    const requiresHos = (project as { status: string; requires_hos: boolean }).requires_hos;
    let next: ProjectStatus;
    if (data.decision === "reject") {
      // "Minta Revisi" sends it back to draft so the original submitter can
      // fix and resubmit — it is NOT a dead end like a hard reject.
      next = data.isRevisi ? "draft" : "ditolak";
    } else if (data.reviewerRole === "principal") {
      if (current !== "diajukan_principal") return { ok: false, error: "Project belum diajukan ke Principal." };
      // Some proposals don't need HoS's sign-off — Principal's approval is
      // final for those, and it goes straight to disetujui (finished).
      next = requiresHos ? "diajukan_hos" : "disetujui";
    } else {
      if (current !== "diajukan_hos") return { ok: false, error: "Project belum diteruskan ke Head of School." };
      next = "disetujui";
    }

    const { error: upErr } = await gate.supabase
      .from("school_projects")
      .update({ status: next, last_review_notes: data.notes || null })
      .eq("id", data.id);
    if (upErr) return { ok: false, error: upErr.message };
    const { error: revErr } = await gate.supabase.from("school_project_reviews").insert({
      project_id: data.id,
      reviewer_name: data.reviewerName || null,
      reviewer_role: data.reviewerRole,
      decision: data.decision,
      notes: data.notes || null,
    });
    if (revErr) return { ok: false, error: revErr.message };
    return { ok: true, status: next };
  });

export const listProjectReviews = createServerFn({ method: "POST" })
  .inputValidator((input: { password: string; projectId: string }) => input)
  .handler(async ({ data }): Promise<{ ok: true; reviews: Row[] } | Fail> => {
    const gate = staffClient(data.password);
    if (!gate.ok) return gate;
    const { data: rows, error } = await gate.supabase
      .from("school_project_reviews").select("*").eq("project_id", data.projectId)
      .order("reviewed_at", { ascending: false });
    if (error) return { ok: false, error: error.message };
    return { ok: true, reviews: rows ?? [] };
  });

// ————— 5b. Competencies (Principal-defined, auto-populate Assessment forms) —————
export const listCompetencies = createServerFn({ method: "POST" })
  .inputValidator((input: { password: string; subject?: string }) => input)
  .handler(async ({ data }): Promise<{ ok: true; competencies: Row[] } | Fail> => {
    const gate = staffClient(data.password);
    if (!gate.ok) return gate;
    let q = gate.supabase.from("school_competencies").select("*").order("sort_order", { ascending: true });
    q = data.subject ? q.or(`subject.is.null,subject.eq.${data.subject}`) : q.is("subject", null);
    const { data: rows, error } = await q;
    if (error) return { ok: false, error: error.message };
    return { ok: true, competencies: rows ?? [] };
  });

export const saveCompetency = createServerFn({ method: "POST" })
  .inputValidator((input: { password: string; staffId: string; subject?: string; title: string }) => input)
  .handler(async ({ data }): Promise<{ ok: true } | Fail> => {
    const gate = staffClient(data.password, true); // Principal/admin tier
    if (!gate.ok) return gate;
    if (!data.title.trim()) return { ok: false, error: "Nama kompetensi wajib diisi." };
    const { error } = await gate.supabase.from("school_competencies").insert({
      school_id: schoolId(), subject: data.subject || null, title: data.title.trim(), created_by: data.staffId || null,
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  });

export const deleteCompetency = createServerFn({ method: "POST" })
  .inputValidator((input: { password: string; id: string }) => input)
  .handler(async ({ data }): Promise<{ ok: true } | Fail> => {
    const gate = staffClient(data.password, true);
    if (!gate.ok) return gate;
    const { error } = await gate.supabase.from("school_competencies").delete().eq("id", data.id);
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  });

// ————— 5. Subject assessments —————
export const listAssessments = createServerFn({ method: "POST" })
  .inputValidator((input: { password?: string; code?: string; classId?: string; studentId?: string }) => input)
  .handler(async ({ data }): Promise<{ ok: true; assessments: Row[] } | Fail> => {
    let supabase;
    let studentFilter = data.studentId ?? null;
    if (data.code) {
      const scope = await parentScope(data.code);
      if (!scope.ok) return scope;
      supabase = scope.supabase;
      studentFilter = scope.studentId;
    } else {
      const gate = staffClient(data.password ?? "");
      if (!gate.ok) return gate;
      supabase = gate.supabase;
    }
    let q = supabase
      .from("school_subject_assessments")
      .select("*, school_students(full_name), school_assessment_forms(*), school_assessment_notes(*)")
      .order("period_start", { ascending: false });
    if (studentFilter) q = q.eq("student_id", studentFilter);
    else if (data.classId) q = q.eq("class_id", data.classId);
    const { data: rows, error } = await q;
    if (error) return { ok: false, error: error.message };
    return { ok: true, assessments: rows ?? [] };
  });

export const saveAssessment = createServerFn({ method: "POST" })
  .inputValidator(
    (input: {
      password: string; id?: string; studentId: string; classId: string; subject: string;
      teacherId?: string; period: string; periodStart: string;
      forms: { competency: string; achieved: boolean; rating: number | null }[];
      finalNote?: string;
    }) => input,
  )
  .handler(async ({ data }): Promise<{ ok: true; id: string } | Fail> => {
    const gate = staffClient(data.password);
    if (!gate.ok) return gate;
    const payload = {
      school_id: schoolId(),
      student_id: data.studentId,
      class_id: data.classId,
      subject: data.subject.trim(),
      teacher_id: data.teacherId || null,
      period: data.period,
      period_start: data.periodStart,
    };
    const q = data.id
      ? gate.supabase.from("school_subject_assessments").update(payload).eq("id", data.id).select("id").single()
      : gate.supabase.from("school_subject_assessments").insert(payload).select("id").single();
    const { data: row, error } = await q;
    if (error) return { ok: false, error: error.message };
    const id = (row as { id: string }).id;

    await gate.supabase.from("school_assessment_forms").delete().eq("assessment_id", id);
    if (data.forms.length > 0) {
      const { error: fErr } = await gate.supabase.from("school_assessment_forms").insert(
        data.forms.map((f, i) => ({
          assessment_id: id,
          competency: f.competency.trim(),
          achieved: f.achieved,
          rating: f.rating,
          position: i,
        })),
      );
      if (fErr) return { ok: false, error: fErr.message };
    }
    if (data.finalNote !== undefined) {
      await gate.supabase.from("school_assessment_notes").delete().eq("assessment_id", id);
      const { error: nErr } = await gate.supabase
        .from("school_assessment_notes")
        .insert({ assessment_id: id, final_note: data.finalNote || null });
      if (nErr) return { ok: false, error: nErr.message };
    }
    return { ok: true, id };
  });

export const deleteAssessment = createServerFn({ method: "POST" })
  .inputValidator((input: { password: string; id: string }) => input)
  .handler(async ({ data }): Promise<{ ok: true } | Fail> => {
    const gate = staffClient(data.password);
    if (!gate.ok) return gate;
    const { error } = await gate.supabase.from("school_subject_assessments").delete().eq("id", data.id);
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  });

export const draftAssessmentNote = createServerFn({ method: "POST" })
  .inputValidator(
    (input: {
      password: string; studentName: string; subject: string; period: string;
      forms: { competency: string; achieved: boolean; rating: number | null }[];
    }) => input,
  )
  .handler(async ({ data }): Promise<{ ok: true; note: string } | Fail> => {
    const gate = staffClient(data.password);
    if (!gate.ok) return gate;
    return generateNoteDraft({
      studentName: data.studentName,
      subject: data.subject,
      period: data.period,
      forms: data.forms,
    });
  });

// ————— 6. Attendance —————
export const listAttendance = createServerFn({ method: "POST" })
  .inputValidator((input: { password?: string; code?: string; classId?: string; date?: string; from?: string; to?: string }) => input)
  .handler(async ({ data }): Promise<{ ok: true; records: Row[] } | Fail> => {
    let supabase;
    let studentFilter: string | null = null;
    if (data.code) {
      const scope = await parentScope(data.code);
      if (!scope.ok) return scope;
      supabase = scope.supabase;
      studentFilter = scope.studentId;
    } else {
      const gate = staffClient(data.password ?? "");
      if (!gate.ok) return gate;
      supabase = gate.supabase;
    }
    let q = supabase
      .from("school_attendance")
      .select("*, school_students(full_name)")
      .order("date", { ascending: false });
    if (studentFilter) q = q.eq("student_id", studentFilter);
    if (data.classId && !studentFilter) q = q.eq("class_id", data.classId);
    if (data.date) q = q.eq("date", data.date);
    if (data.from) q = q.gte("date", data.from);
    if (data.to) q = q.lte("date", data.to);
    const { data: rows, error } = await q;
    if (error) return { ok: false, error: error.message };
    return { ok: true, records: rows ?? [] };
  });

export const saveAttendance = createServerFn({ method: "POST" })
  .inputValidator(
    (input: {
      password: string; classId: string; date: string; recordedBy?: string;
      entries: { studentId: string; status: string; notes?: string }[];
    }) => input,
  )
  .handler(async ({ data }): Promise<{ ok: true; saved: number } | Fail> => {
    const gate = staffClient(data.password);
    if (!gate.ok) return gate;
    if (data.entries.length === 0) return { ok: true, saved: 0 };
    // one row per (student, date) — replace the day's records for this class
    const ids = data.entries.map((e) => e.studentId);
    const { error: delErr } = await gate.supabase
      .from("school_attendance").delete().eq("class_id", data.classId).eq("date", data.date).in("student_id", ids);
    if (delErr) return { ok: false, error: delErr.message };
    const { error } = await gate.supabase.from("school_attendance").insert(
      data.entries.map((e) => ({
        school_id: schoolId(),
        class_id: data.classId,
        student_id: e.studentId,
        date: data.date,
        status: e.status,
        notes: e.notes || null,
        recorded_by: data.recordedBy || null,
      })),
    );
    if (error) return { ok: false, error: error.message };
    return { ok: true, saved: data.entries.length };
  });

/** Checks whether a given class/date looks like a school holiday or has a
 * class activity on the calendar (weekday or not), and whether Teacher has
 * already set an explicit mandatory/not-mandatory override for that day. */
export const getAttendanceDayInfo = createServerFn({ method: "POST" })
  .inputValidator((input: { password: string; classId: string; date: string }) => input)
  .handler(async ({ data }): Promise<{ ok: true; isHoliday: boolean; eventTitles: string[]; explicitMandatory: boolean | null } | Fail> => {
    const gate = staffClient(data.password);
    if (!gate.ok) return gate;
    const { data: cls } = await gate.supabase.from("school_classes").select("division").eq("id", data.classId).maybeSingle();
    const division = cls?.division ?? null;
    let evQ = gate.supabase.from("school_calendar_events").select("title, event_type").eq("event_date", data.date);
    evQ = division
      ? evQ.or(`division.is.null,and(division.eq.${division},class_id.is.null),class_id.eq.${data.classId}`)
      : evQ.or(`division.is.null,class_id.eq.${data.classId}`);
    const { data: events, error: evErr } = await evQ;
    if (evErr) return { ok: false, error: evErr.message };
    const isHoliday = (events ?? []).some((e: Row) => e.event_type === "libur");
    const eventTitles = (events ?? []).map((e: Row) => e.title);
    const { data: flag, error: flagErr } = await gate.supabase
      .from("school_attendance_day_flags").select("is_mandatory").eq("class_id", data.classId).eq("attendance_date", data.date).maybeSingle();
    if (flagErr) return { ok: false, error: flagErr.message };
    return { ok: true, isHoliday, eventTitles, explicitMandatory: flag ? flag.is_mandatory : null };
  });

export const setAttendanceDayMandatory = createServerFn({ method: "POST" })
  .inputValidator((input: { password: string; classId: string; date: string; isMandatory: boolean; note?: string; staffId: string }) => input)
  .handler(async ({ data }): Promise<{ ok: true } | Fail> => {
    const gate = staffClient(data.password);
    if (!gate.ok) return gate;
    const { error } = await gate.supabase.from("school_attendance_day_flags").upsert(
      { class_id: data.classId, attendance_date: data.date, is_mandatory: data.isMandatory, note: data.note || null, set_by: data.staffId || null },
      { onConflict: "class_id,attendance_date" },
    );
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  });

export const listAttendanceDayFlags = createServerFn({ method: "POST" })
  .inputValidator((input: { password: string; classId: string; from: string; to: string }) => input)
  .handler(async ({ data }): Promise<{ ok: true; flags: Row[] } | Fail> => {
    const gate = staffClient(data.password);
    if (!gate.ok) return gate;
    const { data: rows, error } = await gate.supabase
      .from("school_attendance_day_flags").select("attendance_date, is_mandatory")
      .eq("class_id", data.classId).gte("attendance_date", data.from).lte("attendance_date", data.to);
    if (error) return { ok: false, error: error.message };
    return { ok: true, flags: rows ?? [] };
  });
