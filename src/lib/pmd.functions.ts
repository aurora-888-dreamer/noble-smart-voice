import { createServerFn } from "@tanstack/react-start";
import { createNobleSupabase } from "./supabase.server";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>;
type Fail = { ok: false; error: string };
type PmdStatus = "active" | "hold" | "issue" | "cancelled" | "finished";
type PmdContactStatus = "active" | "inactive" | "blocked";
type PmdTimelineKind = "approval" | "recommendation" | "task" | "note" | "message";
type PmdTimelineState = "open" | "answered" | "closed";

export interface PmdProperty { id: string; label: string; value: string }
export interface PmdBudgetLine { id: string; label: string; amount: number; spent: number }

export interface PmdProjectRow {
  id: string;
  name: string;
  code: string;
  location: string | null;
  summary: string | null;
  startAt: string | null;
  targetAt: string | null;
  managerId: string | null;
  managerName: string | null;
  participantIds: string[];
  properties: PmdProperty[];
  budget: PmdBudgetLine[];
  status: PmdStatus;
  ownerUserId: string;
  createdAt: string;
  updatedAt: string;
}
export interface PmdContactRow {
  id: string; ownerUserId: string; name: string; company: string | null; role: string | null;
  whatsapp: string | null; email: string | null; status: PmdContactStatus; createdAt: string;
}
export interface PmdVendorRow {
  id: string; projectId: string; company: string; contactName: string | null; whatsapp: string | null;
  email: string | null; supplyType: string | null; status: PmdContactStatus; createdAt: string;
}
export interface PmdFileRow {
  id: string; projectId: string; name: string; mimeType: string; size: number; dataUrl: string;
  note: string | null; createdAt: string;
}
export interface PmdTimelineRow {
  id: string; projectId: string; parentId: string | null; subject: string; body: string | null;
  author: string; kind: PmdTimelineKind; state: PmdTimelineState; recipients: string[]; createdAt: string;
}

function projectFromRow(r: Row): PmdProjectRow {
  return {
    id: r.id, name: r.name, code: r.code, location: r.location, summary: r.summary,
    startAt: r.start_at, targetAt: r.target_at, managerId: r.manager_id, managerName: r.manager_name,
    participantIds: r.participant_ids ?? [], properties: r.properties ?? [], budget: r.budget ?? [],
    status: r.status, ownerUserId: r.owner_user_id, createdAt: r.created_at, updatedAt: r.updated_at,
  };
}
function contactFromRow(r: Row): PmdContactRow {
  return { id: r.id, ownerUserId: r.owner_user_id, name: r.name, company: r.company, role: r.role, whatsapp: r.whatsapp, email: r.email, status: r.status, createdAt: r.created_at };
}
function vendorFromRow(r: Row): PmdVendorRow {
  return { id: r.id, projectId: r.project_id, company: r.company, contactName: r.contact_name, whatsapp: r.whatsapp, email: r.email, supplyType: r.supply_type, status: r.status, createdAt: r.created_at };
}
function fileFromRow(r: Row): PmdFileRow {
  return { id: r.id, projectId: r.project_id, name: r.name, mimeType: r.mime_type, size: r.size, dataUrl: r.data_url, note: r.note, createdAt: r.created_at };
}
function timelineFromRow(r: Row): PmdTimelineRow {
  return { id: r.id, projectId: r.project_id, parentId: r.parent_id, subject: r.subject, body: r.body, author: r.author, kind: r.kind, state: r.state, recipients: r.recipients ?? [], createdAt: r.created_at };
}

/* ───────────── Projects ───────────── */
// Visible to whoever owns it OR is listed as a participant — so a project
// created by one PMD user shows up for their teammates too, not just them.
export const listPmdProjects = createServerFn({ method: "POST" })
  .inputValidator((input: { userId: string }) => input)
  .handler(async ({ data }): Promise<{ ok: true; projects: PmdProjectRow[] } | Fail> => {
    const supabase = createNobleSupabase();
    if (!supabase) return { ok: false, error: "Backend not configured." };
    const { data: rows, error } = await supabase
      .from("pmd_projects").select("*").or(`owner_user_id.eq.${data.userId},participant_ids.cs.{${data.userId}}`).order("created_at", { ascending: false });
    if (error) return { ok: false, error: error.message };
    return { ok: true, projects: (rows ?? []).map(projectFromRow) };
  });

export const savePmdProject = createServerFn({ method: "POST" })
  .inputValidator(
    (input: {
      id?: string; userId: string; name: string; code: string; location?: string; summary?: string;
      startAt?: string; targetAt?: string; managerId?: string; managerName?: string; participantIds?: string[];
      properties?: PmdProperty[]; budget?: PmdBudgetLine[]; status?: PmdStatus;
    }) => input,
  )
  .handler(async ({ data }): Promise<{ ok: true; project: PmdProjectRow } | Fail> => {
    const supabase = createNobleSupabase();
    if (!supabase) return { ok: false, error: "Backend not configured." };
    if (!data.name.trim() || !data.code.trim()) return { ok: false, error: "Name and code are required." };
    const payload = {
      name: data.name.trim(), code: data.code.trim(), location: data.location || null, summary: data.summary || null,
      start_at: data.startAt || null, target_at: data.targetAt || null, manager_id: data.managerId || null,
      manager_name: data.managerName || null, participant_ids: data.participantIds ?? [],
      properties: data.properties ?? [], budget: data.budget ?? [], status: data.status ?? "active",
      updated_at: new Date().toISOString(),
    };
    if (data.id) {
      const { data: row, error } = await supabase.from("pmd_projects").update(payload).eq("id", data.id).select().single();
      if (error) return { ok: false, error: error.message };
      return { ok: true, project: projectFromRow(row) };
    }
    const { data: row, error } = await supabase.from("pmd_projects").insert({ ...payload, owner_user_id: data.userId }).select().single();
    if (error) return { ok: false, error: error.message };
    return { ok: true, project: projectFromRow(row) };
  });

export const deletePmdProject = createServerFn({ method: "POST" })
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data }): Promise<{ ok: true } | Fail> => {
    const supabase = createNobleSupabase();
    if (!supabase) return { ok: false, error: "Backend not configured." };
    const { error } = await supabase.from("pmd_projects").delete().eq("id", data.id);
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  });

/* ───────────── Contacts ───────────── */
export const listPmdContacts = createServerFn({ method: "POST" })
  .inputValidator((input: { userId: string }) => input)
  .handler(async ({ data }): Promise<{ ok: true; contacts: PmdContactRow[] } | Fail> => {
    const supabase = createNobleSupabase();
    if (!supabase) return { ok: false, error: "Backend not configured." };
    const { data: rows, error } = await supabase.from("pmd_contacts").select("*").eq("owner_user_id", data.userId).order("name");
    if (error) return { ok: false, error: error.message };
    return { ok: true, contacts: (rows ?? []).map(contactFromRow) };
  });

export const savePmdContact = createServerFn({ method: "POST" })
  .inputValidator(
    (input: { id?: string; userId: string; name: string; company?: string; role?: string; whatsapp?: string; email?: string; status?: PmdContactStatus }) => input,
  )
  .handler(async ({ data }): Promise<{ ok: true; contact: PmdContactRow } | Fail> => {
    const supabase = createNobleSupabase();
    if (!supabase) return { ok: false, error: "Backend not configured." };
    if (!data.name.trim()) return { ok: false, error: "Name is required." };
    const payload = {
      name: data.name.trim(), company: data.company || null, role: data.role || null,
      whatsapp: data.whatsapp || null, email: data.email || null, status: data.status ?? "active",
      updated_at: new Date().toISOString(),
    };
    if (data.id) {
      const { data: row, error } = await supabase.from("pmd_contacts").update(payload).eq("id", data.id).select().single();
      if (error) return { ok: false, error: error.message };
      return { ok: true, contact: contactFromRow(row) };
    }
    const { data: row, error } = await supabase.from("pmd_contacts").insert({ ...payload, owner_user_id: data.userId }).select().single();
    if (error) return { ok: false, error: error.message };
    return { ok: true, contact: contactFromRow(row) };
  });

export const deletePmdContact = createServerFn({ method: "POST" })
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data }): Promise<{ ok: true } | Fail> => {
    const supabase = createNobleSupabase();
    if (!supabase) return { ok: false, error: "Backend not configured." };
    const { error } = await supabase.from("pmd_contacts").delete().eq("id", data.id);
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  });

/* ───────────── Vendors ───────────── */
export const listPmdVendors = createServerFn({ method: "POST" })
  .inputValidator((input: { projectId: string }) => input)
  .handler(async ({ data }): Promise<{ ok: true; vendors: PmdVendorRow[] } | Fail> => {
    const supabase = createNobleSupabase();
    if (!supabase) return { ok: false, error: "Backend not configured." };
    const { data: rows, error } = await supabase.from("pmd_vendors").select("*").eq("project_id", data.projectId).order("created_at", { ascending: false });
    if (error) return { ok: false, error: error.message };
    return { ok: true, vendors: (rows ?? []).map(vendorFromRow) };
  });

export const savePmdVendor = createServerFn({ method: "POST" })
  .inputValidator(
    (input: { projectId: string; company: string; contactName?: string; whatsapp?: string; email?: string; supplyType?: string; status?: PmdContactStatus }) => input,
  )
  .handler(async ({ data }): Promise<{ ok: true; vendor: PmdVendorRow } | Fail> => {
    const supabase = createNobleSupabase();
    if (!supabase) return { ok: false, error: "Backend not configured." };
    if (!data.company.trim()) return { ok: false, error: "Company is required." };
    const { data: row, error } = await supabase.from("pmd_vendors").insert({
      project_id: data.projectId, company: data.company.trim(), contact_name: data.contactName || null,
      whatsapp: data.whatsapp || null, email: data.email || null, supply_type: data.supplyType || null,
      status: data.status ?? "active",
    }).select().single();
    if (error) return { ok: false, error: error.message };
    return { ok: true, vendor: vendorFromRow(row) };
  });

export const deletePmdVendor = createServerFn({ method: "POST" })
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data }): Promise<{ ok: true } | Fail> => {
    const supabase = createNobleSupabase();
    if (!supabase) return { ok: false, error: "Backend not configured." };
    const { error } = await supabase.from("pmd_vendors").delete().eq("id", data.id);
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  });

/* ───────────── Files ───────────── */
export const listPmdFiles = createServerFn({ method: "POST" })
  .inputValidator((input: { projectId: string }) => input)
  .handler(async ({ data }): Promise<{ ok: true; files: PmdFileRow[] } | Fail> => {
    const supabase = createNobleSupabase();
    if (!supabase) return { ok: false, error: "Backend not configured." };
    const { data: rows, error } = await supabase.from("pmd_files").select("*").eq("project_id", data.projectId).order("created_at", { ascending: false });
    if (error) return { ok: false, error: error.message };
    return { ok: true, files: (rows ?? []).map(fileFromRow) };
  });

export const savePmdFile = createServerFn({ method: "POST" })
  .inputValidator((input: { projectId: string; name: string; mimeType: string; size: number; dataUrl: string; note?: string }) => input)
  .handler(async ({ data }): Promise<{ ok: true; file: PmdFileRow } | Fail> => {
    const supabase = createNobleSupabase();
    if (!supabase) return { ok: false, error: "Backend not configured." };
    const { data: row, error } = await supabase.from("pmd_files").insert({
      project_id: data.projectId, name: data.name, mime_type: data.mimeType, size: data.size,
      data_url: data.dataUrl, note: data.note || null,
    }).select().single();
    if (error) return { ok: false, error: error.message };
    return { ok: true, file: fileFromRow(row) };
  });

export const deletePmdFile = createServerFn({ method: "POST" })
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data }): Promise<{ ok: true } | Fail> => {
    const supabase = createNobleSupabase();
    if (!supabase) return { ok: false, error: "Backend not configured." };
    const { error } = await supabase.from("pmd_files").delete().eq("id", data.id);
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  });

/* ───────────── Timeline (approvals, recommendations, tasks, notes, messages + replies) ───────────── */
export const listPmdTimeline = createServerFn({ method: "POST" })
  .inputValidator((input: { projectId: string }) => input)
  .handler(async ({ data }): Promise<{ ok: true; entries: PmdTimelineRow[] } | Fail> => {
    const supabase = createNobleSupabase();
    if (!supabase) return { ok: false, error: "Backend not configured." };
    const { data: rows, error } = await supabase.from("pmd_timeline").select("*").eq("project_id", data.projectId).order("created_at", { ascending: true });
    if (error) return { ok: false, error: error.message };
    return { ok: true, entries: (rows ?? []).map(timelineFromRow) };
  });

export const savePmdTimelineEntry = createServerFn({ method: "POST" })
  .inputValidator(
    (input: { projectId: string; parentId?: string; subject: string; body?: string; author: string; kind: PmdTimelineKind; recipients?: string[] }) => input,
  )
  .handler(async ({ data }): Promise<{ ok: true; entry: PmdTimelineRow } | Fail> => {
    const supabase = createNobleSupabase();
    if (!supabase) return { ok: false, error: "Backend not configured." };
    if (!data.subject.trim()) return { ok: false, error: "Subject is required." };
    const { data: row, error } = await supabase.from("pmd_timeline").insert({
      project_id: data.projectId, parent_id: data.parentId || null, subject: data.subject.trim(),
      body: data.body || null, author: data.author, kind: data.kind, recipients: data.recipients ?? [],
    }).select().single();
    if (error) return { ok: false, error: error.message };
    return { ok: true, entry: timelineFromRow(row) };
  });

export const setPmdTimelineState = createServerFn({ method: "POST" })
  .inputValidator((input: { id: string; state: PmdTimelineState }) => input)
  .handler(async ({ data }): Promise<{ ok: true } | Fail> => {
    const supabase = createNobleSupabase();
    if (!supabase) return { ok: false, error: "Backend not configured." };
    const { error } = await supabase.from("pmd_timeline").update({ state: data.state }).eq("id", data.id);
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  });
