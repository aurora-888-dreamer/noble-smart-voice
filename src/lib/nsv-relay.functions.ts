import { createServerFn } from "@tanstack/react-start";
import { staffClient, schoolId } from "./school-academic.server";
import { createLovableSchoolSupabase, normalizeContact } from "./supabase.server";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>;
type Fail = { ok: false; error: string };

// ————— School Dashboard side (staff, password-gated) —————
export const listRelayThreads = createServerFn({ method: "POST" })
  .inputValidator((input: { password: string; staffId: string }) => input)
  .handler(async ({ data }): Promise<{ ok: true; threads: Row[] } | Fail> => {
    const gate = staffClient(data.password);
    if (!gate.ok) return gate;
    const { data: rows, error } = await gate.supabase
      .from("nsv_relay_threads").select("*, nsv_relay_messages(*)").eq("sender_staff_id", data.staffId).order("created_at", { ascending: false });
    if (error) return { ok: false, error: error.message };
    return { ok: true, threads: rows ?? [] };
  });

export const startRelayThread = createServerFn({ method: "POST" })
  .inputValidator((input: { password: string; staffId: string; senderName: string; recipientPhone: string; recipientName?: string; body: string }) => input)
  .handler(async ({ data }): Promise<{ ok: true } | Fail> => {
    const gate = staffClient(data.password);
    if (!gate.ok) return gate;
    if (!data.recipientPhone.trim() || !data.body.trim()) return { ok: false, error: "Nomor HP dan pesan wajib diisi." };
    const { data: thread, error: tErr } = await gate.supabase.from("nsv_relay_threads").insert({
      recipient_phone: normalizeContact(data.recipientPhone), recipient_name: data.recipientName || null,
      sender_staff_id: data.staffId, sender_name: data.senderName, sender_context: "school",
    }).select("id").single();
    if (tErr) return { ok: false, error: tErr.message };
    const { error: mErr } = await gate.supabase.from("nsv_relay_messages").insert({
      thread_id: thread.id, direction: "to_nsv_user", body: data.body,
    });
    if (mErr) return { ok: false, error: mErr.message };
    return { ok: true };
  });

export const replyToRelayThread = createServerFn({ method: "POST" })
  .inputValidator((input: { password: string; threadId: string; body: string }) => input)
  .handler(async ({ data }): Promise<{ ok: true } | Fail> => {
    const gate = staffClient(data.password);
    if (!gate.ok) return gate;
    if (!data.body.trim()) return { ok: false, error: "Pesan kosong." };
    const { error } = await gate.supabase.from("nsv_relay_messages").insert({
      thread_id: data.threadId, direction: "to_nsv_user", body: data.body,
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  });

export const deleteRelayThread = createServerFn({ method: "POST" })
  .inputValidator((input: { password: string; threadId: string }) => input)
  .handler(async ({ data }): Promise<{ ok: true } | Fail> => {
    const gate = staffClient(data.password);
    if (!gate.ok) return gate;
    const { error } = await gate.supabase.from("nsv_relay_threads").delete().eq("id", data.threadId);
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  });

// ————— NSV side (no password — scoped purely by the user's own phone
// number, which is all that lets a thread be visible; nobody without an
// invited thread for their exact number ever sees anything) —————
export const listMyRelayThreads = createServerFn({ method: "POST" })
  .inputValidator((input: { phone: string }) => input)
  .handler(async ({ data }): Promise<{ ok: true; threads: Row[] } | Fail> => {
    const supabase = createLovableSchoolSupabase();
    if (!supabase) return { ok: false, error: "Relay belum dikonfigurasi." };
    const { data: rows, error } = await supabase
      .from("nsv_relay_threads").select("*, nsv_relay_messages(*)").eq("recipient_phone", normalizeContact(data.phone)).order("created_at", { ascending: false });
    if (error) return { ok: false, error: error.message };
    return { ok: true, threads: rows ?? [] };
  });

export const replyAsNsvUser = createServerFn({ method: "POST" })
  .inputValidator((input: { threadId: string; body: string }) => input)
  .handler(async ({ data }): Promise<{ ok: true } | Fail> => {
    const supabase = createLovableSchoolSupabase();
    if (!supabase) return { ok: false, error: "Relay belum dikonfigurasi." };
    if (!data.body.trim()) return { ok: false, error: "Pesan kosong." };
    const { error } = await supabase.from("nsv_relay_messages").insert({
      thread_id: data.threadId, direction: "from_nsv_user", body: data.body,
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  });

export const markRelayImported = createServerFn({ method: "POST" })
  .inputValidator((input: { messageId: string }) => input)
  .handler(async ({ data }): Promise<{ ok: true } | Fail> => {
    const supabase = createLovableSchoolSupabase();
    if (!supabase) return { ok: false, error: "Relay belum dikonfigurasi." };
    const { error } = await supabase.from("nsv_relay_messages").update({ imported: true }).eq("id", data.messageId);
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  });
