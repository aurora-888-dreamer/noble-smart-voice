import { createServerFn } from "@tanstack/react-start";
import { staffClient, schoolId, parentScope } from "./school-academic.server";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>;
type Fail = { ok: false; error: string };

export const listGalleryFiles = createServerFn({ method: "POST" })
  .inputValidator((input: { password?: string; code?: string; staffId?: string }) => input)
  .handler(async ({ data }): Promise<{ ok: true; files: Row[] } | Fail> => {
    let supabase; let ownerType: "staff" | "parent"; let ownerId: string;
    if (data.code) {
      const scope = await parentScope(data.code);
      if (!scope.ok) return scope;
      supabase = scope.supabase; ownerType = "parent"; ownerId = data.code.trim().toUpperCase();
    } else {
      const gate = staffClient(data.password ?? "");
      if (!gate.ok) return gate;
      supabase = gate.supabase; ownerType = "staff"; ownerId = data.staffId ?? "";
    }
    const { data: rows, error } = await supabase
      .from("school_gallery_files").select("*").eq("owner_type", ownerType).eq("owner_id", ownerId).order("created_at", { ascending: false });
    if (error) return { ok: false, error: error.message };
    return { ok: true, files: rows ?? [] };
  });

export const saveGalleryFile = createServerFn({ method: "POST" })
  .inputValidator(
    (input: {
      password?: string; code?: string; staffId?: string;
      fileType: "image" | "pdf" | "doc" | "txt" | "other"; fileName: string; dataUrl: string; source?: "camera" | "upload";
    }) => input,
  )
  .handler(async ({ data }): Promise<{ ok: true } | Fail> => {
    let supabase; let ownerType: "staff" | "parent"; let ownerId: string;
    if (data.code) {
      const scope = await parentScope(data.code);
      if (!scope.ok) return scope;
      supabase = scope.supabase; ownerType = "parent"; ownerId = data.code.trim().toUpperCase();
    } else {
      const gate = staffClient(data.password ?? "");
      if (!gate.ok) return gate;
      supabase = gate.supabase; ownerType = "staff"; ownerId = data.staffId ?? "";
    }
    if (!data.dataUrl) return { ok: false, error: "File kosong." };
    const { error } = await supabase.from("school_gallery_files").insert({
      school_id: schoolId(), owner_type: ownerType, owner_id: ownerId,
      file_type: data.fileType, file_name: data.fileName || "untitled", data_url: data.dataUrl, source: data.source || "upload",
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  });

export const deleteGalleryFile = createServerFn({ method: "POST" })
  .inputValidator((input: { password?: string; code?: string; id: string }) => input)
  .handler(async ({ data }): Promise<{ ok: true } | Fail> => {
    let supabase;
    if (data.code) {
      const scope = await parentScope(data.code);
      if (!scope.ok) return scope;
      supabase = scope.supabase;
    } else {
      const gate = staffClient(data.password ?? "");
      if (!gate.ok) return gate;
      supabase = gate.supabase;
    }
    const { error } = await supabase.from("school_gallery_files").delete().eq("id", data.id);
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  });
