import { createServerFn } from "@tanstack/react-start";
import { createNobleSupabase, normalizeContact } from "./supabase.server";

export interface RedeemVoucherResult {
  ok: boolean;
  error?: string;
  tier?: "standard" | "premium";
  durationDays?: number;
}

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

    return { ok: true, tier: voucher.tier, durationDays: voucher.duration_days };
  });
