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
  .inputValidator((input: { password?: string; code?: string; classId?: string; from?: string; to?: string }) => input)
  .handler(async ({ data }): Promise<{ ok: true; events: Row[] } | Fail> => {
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
    let q = supabase.from("school_calendar_events").select("*, school_staff(full_name)").order("event_date", { ascending: true });
    if (classFilter) q = q.or(`class_id.is.null,class_id.eq.${classFilter}`);
    if (data.from) q = q.gte("event_date", data.from);
    if (data.to) q = q.lte("event_date", data.to);
    const { data: rows, error } = await q;
    if (error) return { ok: false, error: error.message };
    return { ok: true, events: rows ?? [] };
  });

export const saveCalendarEvent = createServerFn({ method: "POST" })
  .inputValidator(
    (input: {
      password: string; id?: string; classId?: string; title: string;
      description?: string; eventDate: string; eventType: string; staffId: string;
    }) => input,
  )
  .handler(async ({ data }): Promise<{ ok: true; event: Row } | Fail> => {
    const gate = staffClient(data.password);
    if (!gate.ok) return gate;
    const payload = {
      school_id: schoolId(),
      class_id: data.classId || null,
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
    (input: { password: string; id?: string; classId: string; teacherId?: string; title: string; description?: string; submit?: boolean }) =>
      input,
  )
  .handler(async ({ data }): Promise<{ ok: true; project: Row } | Fail> => {
    const gate = staffClient(data.password);
    if (!gate.ok) return gate;
    const payload = {
      school_id: schoolId(),
      class_id: data.classId,
      teacher_id: data.teacherId || null,
      title: data.title.trim(),
      description: data.description || null,
      status: (data.submit ? "diajukan_principal" : "draft") as ProjectStatus,
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
      reviewerName?: string; decision: "approve" | "reject"; notes?: string;
    }) => input,
  )
  .handler(async ({ data }): Promise<{ ok: true; status: ProjectStatus } | Fail> => {
    const gate = staffClient(data.password, true);
    if (!gate.ok) return gate;
    const { data: project, error: readErr } = await gate.supabase
      .from("school_projects").select("id, status").eq("id", data.id).maybeSingle();
    if (readErr) return { ok: false, error: readErr.message };
    if (!project) return { ok: false, error: "Project tidak ditemukan." };

    const current = (project as { status: string }).status;
    let next: ProjectStatus;
    if (data.decision === "reject") next = "ditolak";
    else if (data.reviewerRole === "principal") {
      if (current !== "diajukan_principal") return { ok: false, error: "Project belum diajukan ke Principal." };
      next = "diajukan_hos";
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
