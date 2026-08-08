import { createServerFn } from "@tanstack/react-start";
import { createNobleSupabase } from "./supabase.server";
import {
  adminEmail,
  isAdminUserId,
  generateResetCode,
  sendResetCodeEmail,
  sha256,
  storeAdminPassword,
  verifyAdminPassword,
} from "./store-admin.server";

const CODE_TTL_MS = 15 * 60 * 1000;

// Ask for a reset code. Always answers the same way regardless of whether
// the email matches, so this endpoint can't be used to discover the owner's
// address.
export const requestStoreAdminReset = createServerFn({ method: "POST" })
  .inputValidator((input: { email: string }) => input)
  .handler(async ({ data }): Promise<{ ok: true } | { ok: false; error: string }> => {
    const supabase = createNobleSupabase();
    if (!supabase) return { ok: false, error: "Store backend not configured." };

    const target = adminEmail();
    const given = data.email.trim().toLowerCase();
    if (!target) return { ok: false, error: "Admin email not configured (STORE_ADMIN_EMAIL)." };
    if (given !== target) return { ok: true }; // silent no-op

    // Throttle: max 3 requests per 15 minutes.
    const since = new Date(Date.now() - CODE_TTL_MS).toISOString();
    const { count } = await supabase
      .from("store_admin_resets")
      .select("id", { count: "exact", head: true })
      .gte("created_at", since);
    if ((count ?? 0) >= 3) return { ok: false, error: "Too many requests. Try again in 15 minutes." };

    const code = generateResetCode();
    const { error } = await supabase.from("store_admin_resets").insert({
      email: target,
      code_hash: await sha256(code),
      expires_at: new Date(Date.now() + CODE_TTL_MS).toISOString(),
    });
    if (error) return { ok: false, error: error.message };

    const sendError = await sendResetCodeEmail(target, code);
    if (sendError) return { ok: false, error: sendError };
    return { ok: true };
  });

// Single-identity login: UserID + 6-digit PIN. Returns the PIN back so the
// client can keep using it as the credential for every admin call.
export const storeAdminLogin = createServerFn({ method: "POST" })
  .inputValidator((input: { userId: string; pin: string }) => input)
  .handler(async ({ data }): Promise<{ ok: true; pin: string } | { ok: false; error: string }> => {
    if (!isAdminUserId(data.userId || "")) return { ok: false, error: "Wrong UserID or PIN." };
    const pin = (data.pin || "").trim();
    if (!(await verifyAdminPassword(pin))) return { ok: false, error: "Wrong UserID or PIN." };
    return { ok: true, pin };
  });

// Redeem the code and set a new PIN.
export const resetStoreAdminPassword = createServerFn({ method: "POST" })
  .inputValidator((input: { code: string; newPassword: string }) => input)
  .handler(async ({ data }): Promise<{ ok: true } | { ok: false; error: string }> => {
    const supabase = createNobleSupabase();
    if (!supabase) return { ok: false, error: "Store backend not configured." };
    const password = data.newPassword.trim();
    if (!/^\d{6}$/.test(password)) return { ok: false, error: "New PIN must be 6 digits." };

    const codeHash = await sha256(data.code.trim());
    const { data: row, error } = await supabase
      .from("store_admin_resets")
      .select("*")
      .eq("code_hash", codeHash)
      .is("used_at", null)
      .gte("expires_at", new Date().toISOString())
      .maybeSingle();
    if (error) return { ok: false, error: error.message };
    if (!row) return { ok: false, error: "Invalid or expired code." };

    const storeError = await storeAdminPassword(password);
    if (storeError) return { ok: false, error: storeError };

    await supabase.from("store_admin_resets").update({ used_at: new Date().toISOString() }).eq("id", row.id);
    return { ok: true };
  });
