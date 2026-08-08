import { createServerFn } from "@tanstack/react-start";
import { createNobleSupabase, normalizeContact } from "./supabase.server";

export interface RedeemVoucherResult {
  ok: boolean;
  error?: string;
  tier?: "standard" | "premium";
  durationDays?: number;
  pluginId?: string;
}

// Used by the homepage Redeem box: shows only if there's a REAL unused
// voucher waiting for this contact — not a local flag, which used to drift
// out of sync with the actual database (e.g. still "pending" after an
// admin deleted the underlying order server-side).
export interface MyVoucher {
  code: string;
  tier: "standard" | "premium";
  durationDays: number | null;
  pluginId: string | null;
}

// Checks BOTH email and whatsapp (not just whichever the profile happens to
// have filled in first) — a voucher bought by someone else, granted by an
// admin, or issued from a different device/app can be bound to either
// contact, so both must be checked for the box to reliably find it.
export const getMyVouchers = createServerFn({ method: "POST" })
  .inputValidator((input: { email?: string; whatsapp?: string }) => input)
  .handler(async ({ data }): Promise<{ ok: true; vouchers: MyVoucher[] } | { ok: false; error: string }> => {
    const supabase = createNobleSupabase();
    if (!supabase) return { ok: false, error: "Backend belum dikonfigurasi." };
    const contacts = [data.email, data.whatsapp].filter(Boolean).map((c) => normalizeContact(c as string));
    if (contacts.length === 0) return { ok: true, vouchers: [] };
    const { data: rows, error } = await supabase
      .from("noble_vouchers").select("code, tier, duration_days, plugin_id").in("bound_contact", contacts).eq("status", "unused");
    if (error) return { ok: false, error: error.message };
    return {
      ok: true,
      vouchers: (rows ?? []).map((r) => ({
        code: r.code as string,
        tier: r.tier as "standard" | "premium",
        durationDays: r.duration_days as number | null,
        pluginId: (r.plugin_id as string | null) ?? null,
      })),
    };
  });

export const redeemVoucher = createServerFn({ method: "POST" })
  .inputValidator((input: { code: string; contact: string }) => input)
  .handler(async ({ data }): Promise<RedeemVoucherResult> => {
    const supabase = createNobleSupabase();
    if (!supabase) {
      return { ok: false, error: "Backend voucher belum dikonfigurasi (SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY belum diset)." };
    }

    const code = data.code.trim().toUpperCase();
    const contact = normalizeContact(data.contact);
    if (!code) return { ok: false, error: "Kode kosong." };
    if (!contact) return { ok: false, error: "Akun kamu belum punya email/nomor WhatsApp terdaftar." };

    const { data: voucher, error } = await supabase
      .from("noble_vouchers")
      .select("*")
      .eq("code", code)
      .maybeSingle();

    if (error) return { ok: false, error: error.message };
    if (!voucher) return { ok: false, error: "Kode tidak ditemukan." };
    if (voucher.status !== "unused") return { ok: false, error: "Kode ini sudah pernah dipakai atau tidak berlaku lagi." };
    if (voucher.bound_contact !== contact) {
      return { ok: false, error: "Kode ini terdaftar untuk email/nomor lain, bukan akun kamu." };
    }

    const { error: updateError } = await supabase
      .from("noble_vouchers")
      .update({ status: "used", used_at: new Date().toISOString(), used_by_contact: contact })
      .eq("id", voucher.id)
      .eq("status", "unused"); // guard against a race between two simultaneous redemptions

    if (updateError) return { ok: false, error: updateError.message };

    return { ok: true, tier: voucher.tier, durationDays: voucher.duration_days, pluginId: voucher.plugin_id ?? undefined };
  });
