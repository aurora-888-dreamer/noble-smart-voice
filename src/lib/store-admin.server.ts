import { sendLovableEmail } from "@lovable.dev/email-js";
import { createNobleSupabase } from "./supabase.server";

// ————— Password storage —————
// The admin password starts life as the STORE_ADMIN_PASSWORD env secret.
// Once the owner resets it through the "Lupa Password" flow, the new one is
// stored as a SHA-256 hash in store_admin_auth and takes precedence — so a
// reset works without anyone having to touch environment variables.

export async function sha256(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Constant-time-ish comparison of two equal-length hex strings. */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** The single admin identity for /store/admin. */
export const ADMIN_USER_ID = "Noble888";
export const DEFAULT_ADMIN_PIN = "440077";

export function isAdminUserId(userId: string): boolean {
  return userId.trim().toLowerCase() === ADMIN_USER_ID.toLowerCase();
}

export async function verifyAdminPassword(password: string): Promise<boolean> {
  if (!password) return false;
  const supabase = createNobleSupabase();
  if (supabase) {
    const { data } = await supabase.from("store_admin_auth").select("password_hash").eq("id", 1).maybeSingle();
    const stored = data?.password_hash as string | undefined;
    if (stored) return safeEqual(await sha256(password), stored);
  }
  const expected = DEFAULT_ADMIN_PIN;
  return safeEqual(await sha256(password), await sha256(expected));
}

export async function storeAdminPassword(password: string): Promise<string | null> {
  const supabase = createNobleSupabase();
  if (!supabase) return "Store backend not configured.";
  const { error } = await supabase
    .from("store_admin_auth")
    .upsert({ id: 1, password_hash: await sha256(password), updated_at: new Date().toISOString() }, { onConflict: "id" });
  return error ? error.message : null;
}

// ————— Reset email —————

/** Only one address may ever receive a PIN reset code. */
export const ADMIN_EMAIL = "auroradreamer888@gmail.com";

export function adminEmail(): string | null {
  return ADMIN_EMAIL;
}

export function generateResetCode(): string {
  const n = crypto.getRandomValues(new Uint32Array(1))[0] % 1_000_000;
  return String(n).padStart(6, "0");
}

export async function sendResetCodeEmail(to: string, code: string): Promise<string | null> {
  const apiKey = process.env.LOVABLE_API_KEY;
  const senderDomain = process.env.STORE_EMAIL_SENDER_DOMAIN;
  if (!apiKey) return "LOVABLE_API_KEY is not available on the server.";
  if (!senderDomain) return "Sender email domain not configured (STORE_EMAIL_SENDER_DOMAIN).";

  const html = `
    <div style="font-family:Arial,Helvetica,sans-serif;background:#ffffff;padding:24px">
      <h2 style="margin:0 0 8px">AURORA MASTER — Reset Admin PIN</h2>
      <p style="color:#444;margin:0 0 16px">Use the code below to reset the store admin PIN. This code is valid for 15 minutes.</p>
      <p style="font-size:30px;letter-spacing:8px;font-weight:700;margin:0 0 16px">${code}</p>
      <p style="color:#777;font-size:12px;margin:0">Ignore this email if you didn't request a PIN reset.</p>
    </div>`;

  try {
    await sendLovableEmail(
      {
        to,
        from: `AURORA MASTER <admin@${senderDomain}>`,
        sender_domain: senderDomain,
        subject: "AURORA MASTER admin PIN reset code",
        html,
        text: `AURORA MASTER admin PIN reset code: ${code} (valid for 15 minutes).`,
        purpose: "transactional",
      },
      { apiKey },
    );
    return null;
  } catch (e) {
    return e instanceof Error ? e.message : "Failed to send reset email.";
  }
}

// ————— Auto-delivery: sent the moment an order is confirmed paid (either
// the admin's manual "Mark Paid", or an automatic Komerce webhook) — the
// buyer doesn't have to stay on the order page or wait for an admin to
// click "Send Serial via WA" to get their serial. —————
export async function sendSerialEmail(to: string, buyerName: string, planName: string, serial: string): Promise<string | null> {
  const apiKey = process.env.LOVABLE_API_KEY;
  const senderDomain = process.env.STORE_EMAIL_SENDER_DOMAIN;
  if (!apiKey || !senderDomain || !to) return "Sender email not configured, or the buyer has no email on file.";

  const html = `
    <div style="font-family:Arial,Helvetica,sans-serif;background:#ffffff;padding:24px">
      <h2 style="margin:0 0 8px">AURORA MASTER — Payment Received</h2>
      <p style="color:#444;margin:0 0 4px">Hi ${buyerName},</p>
      <p style="color:#444;margin:0 0 16px">Thank you! Your <b>${planName}</b> order has been paid and is ready to use.</p>
      <p style="color:#777;font-size:12px;margin:0 0 4px">Your Serial Number:</p>
      <p style="font-size:22px;letter-spacing:2px;font-weight:700;margin:0 0 16px;font-family:monospace">${serial}</p>
      <p style="color:#444;margin:0 0 8px">How to activate: open the Noble app → Activate Premium → paste the serial above.</p>
      <p style="color:#777;font-size:12px;margin:0">Keep this email as your proof of purchase.</p>
    </div>`;

  try {
    await sendLovableEmail(
      {
        to,
        from: `AURORA MASTER <admin@${senderDomain}>`,
        sender_domain: senderDomain,
        subject: `Your Serial Number — ${planName}`,
        html,
        text: `Hi ${buyerName}, your ${planName} order has been paid. Serial Number: ${serial}. Activate in Noble -> Activate Premium.`,
        purpose: "transactional",
      },
      { apiKey },
    );
    return null;
  } catch (e) {
    return e instanceof Error ? e.message : "Failed to send serial email.";
  }
}
