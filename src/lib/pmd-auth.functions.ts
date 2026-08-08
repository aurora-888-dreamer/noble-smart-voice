import { createServerFn } from "@tanstack/react-start";
import { createNobleSupabase } from "./supabase.server";
import { sha256, generateResetCode } from "./store-admin.server";
import { sendLovableEmail } from "@lovable.dev/email-js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>;
const CODE_TTL_MS = 15 * 60 * 1000;

/** 5 letters (from the person's name) + 3 digits — same shape as School
 * Dashboard's UserID (e.g. "Noble888"), generated automatically, never
 * picked by the user. */
function baseFromName(fullName: string): string {
  const letters = fullName.replace(/[^A-Za-z]/g, "");
  const raw = (letters + "Userxx").slice(0, 5).toLowerCase();
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

async function generateUserId(supabase: ReturnType<typeof createNobleSupabase>, fullName: string): Promise<string> {
  const base = baseFromName(fullName);
  for (let attempt = 0; attempt < 40; attempt++) {
    const candidate = base + String(100 + Math.floor(Math.random() * 900));
    const { data } = await supabase!.from("pmd_users").select("id").ilike("user_id", candidate).maybeSingle();
    if (!data) return candidate;
  }
  return base + Date.now().toString().slice(-3);
}

async function sendPmdResetEmail(to: string, code: string): Promise<string | null> {
  const apiKey = process.env.LOVABLE_API_KEY;
  const senderDomain = process.env.STORE_EMAIL_SENDER_DOMAIN;
  if (!apiKey || !senderDomain) return "Sender email not configured.";
  const html = `
    <div style="font-family:Arial,Helvetica,sans-serif;background:#ffffff;padding:24px">
      <h2 style="margin:0 0 8px">Project Management Dashboard — PIN Reset</h2>
      <p style="color:#444;margin:0 0 16px">Use the code below to reset your PIN. This code is valid for 15 minutes.</p>
      <p style="font-size:30px;letter-spacing:8px;font-weight:700;margin:0 0 16px">${code}</p>
      <p style="color:#777;font-size:12px;margin:0">Ignore this email if you didn't request a PIN reset.</p>
    </div>`;
  try {
    await sendLovableEmail(
      {
        to,
        from: `Noble Smart Voice <admin@${senderDomain}>`,
        sender_domain: senderDomain,
        subject: "Your PMD PIN reset code",
        html,
        text: `Your PMD PIN reset code: ${code} (valid for 15 minutes).`,
        purpose: "transactional",
      },
      { apiKey },
    );
    return null;
  } catch (e) {
    return e instanceof Error ? e.message : "Failed to send reset email.";
  }
}

export interface PmdProfile {
  userId: string;
  fullName: string;
  company: string | null;
  position: string | null;
  whatsapp: string;
  email: string;
}

function rowToProfile(row: Row): PmdProfile {
  return {
    userId: row.user_id,
    fullName: row.full_name,
    company: row.company ?? null,
    position: row.position ?? null,
    whatsapp: row.whatsapp,
    email: row.email,
  };
}

export const registerPmdUser = createServerFn({ method: "POST" })
  .inputValidator(
    (input: { fullName: string; company?: string; position?: string; whatsapp: string; email: string; pin: string }) => input,
  )
  .handler(async ({ data }): Promise<{ ok: true; profile: PmdProfile } | { ok: false; error: string }> => {
    const supabase = createNobleSupabase();
    if (!supabase) return { ok: false, error: "Backend not configured." };
    if (!data.fullName.trim() || !data.whatsapp.trim() || !data.email.trim()) {
      return { ok: false, error: "Name, WhatsApp, and email are required." };
    }
    if (!/^\d{6}$/.test(data.pin)) return { ok: false, error: "PIN must be 6 digits." };

    const userId = await generateUserId(supabase, data.fullName.trim());
    const { data: row, error } = await supabase
      .from("pmd_users")
      .insert({
        user_id: userId,
        full_name: data.fullName.trim(),
        company: data.company?.trim() || null,
        position: data.position?.trim() || null,
        whatsapp: data.whatsapp.trim(),
        email: data.email.trim().toLowerCase(),
        pin: data.pin,
      })
      .select()
      .single();
    if (error) return { ok: false, error: error.message };
    return { ok: true, profile: rowToProfile(row) };
  });

export const loginPmdUser = createServerFn({ method: "POST" })
  .inputValidator((input: { userId: string; pin: string }) => input)
  .handler(async ({ data }): Promise<{ ok: true; profile: PmdProfile } | { ok: false; error: string }> => {
    const supabase = createNobleSupabase();
    if (!supabase) return { ok: false, error: "Backend not configured." };
    const { data: row, error } = await supabase.from("pmd_users").select("*").ilike("user_id", data.userId.trim()).maybeSingle();
    if (error) return { ok: false, error: error.message };
    if (!row || row.pin !== data.pin) return { ok: false, error: "Wrong User ID or PIN." };
    return { ok: true, profile: rowToProfile(row) };
  });

export const requestPmdPinReset = createServerFn({ method: "POST" })
  .inputValidator((input: { email: string }) => input)
  .handler(async ({ data }): Promise<{ ok: true } | { ok: false; error: string }> => {
    const supabase = createNobleSupabase();
    if (!supabase) return { ok: false, error: "Backend not configured." };
    const email = data.email.trim().toLowerCase();
    const { data: user } = await supabase.from("pmd_users").select("id, email").eq("email", email).maybeSingle();
    if (!user) return { ok: true }; // silent no-op — don't reveal whether the email exists

    const since = new Date(Date.now() - CODE_TTL_MS).toISOString();
    const { count } = await supabase
      .from("pmd_pin_resets").select("id", { count: "exact", head: true }).eq("pmd_user_id", user.id).gte("created_at", since);
    if ((count ?? 0) >= 3) return { ok: false, error: "Too many requests. Try again in 15 minutes." };

    const code = generateResetCode();
    const { error } = await supabase.from("pmd_pin_resets").insert({
      pmd_user_id: user.id, code: await sha256(code), expires_at: new Date(Date.now() + CODE_TTL_MS).toISOString(),
    });
    if (error) return { ok: false, error: error.message };
    const sendError = await sendPmdResetEmail(user.email, code);
    if (sendError) return { ok: false, error: sendError };
    return { ok: true };
  });

export const resetPmdPin = createServerFn({ method: "POST" })
  .inputValidator((input: { email: string; code: string; newPin: string }) => input)
  .handler(async ({ data }): Promise<{ ok: true } | { ok: false; error: string }> => {
    const supabase = createNobleSupabase();
    if (!supabase) return { ok: false, error: "Backend not configured." };
    if (!/^\d{6}$/.test(data.newPin)) return { ok: false, error: "New PIN must be 6 digits." };
    const email = data.email.trim().toLowerCase();
    const { data: user } = await supabase.from("pmd_users").select("id").eq("email", email).maybeSingle();
    if (!user) return { ok: false, error: "Invalid or expired code." };

    const codeHash = await sha256(data.code.trim());
    const { data: reset } = await supabase
      .from("pmd_pin_resets").select("*").eq("pmd_user_id", user.id).eq("code", codeHash).is("used_at", null)
      .gt("expires_at", new Date().toISOString()).order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (!reset) return { ok: false, error: "Invalid or expired code." };

    await supabase.from("pmd_pin_resets").update({ used_at: new Date().toISOString() }).eq("id", reset.id);
    const { error } = await supabase.from("pmd_users").update({ pin: data.newPin, updated_at: new Date().toISOString() }).eq("id", user.id);
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  });

export const updatePmdProfile = createServerFn({ method: "POST" })
  .inputValidator(
    (input: { userId: string; fullName: string; company?: string; position?: string; whatsapp: string; email: string }) => input,
  )
  .handler(async ({ data }): Promise<{ ok: true; profile: PmdProfile } | { ok: false; error: string }> => {
    const supabase = createNobleSupabase();
    if (!supabase) return { ok: false, error: "Backend not configured." };
    if (!data.fullName.trim() || !data.whatsapp.trim() || !data.email.trim()) {
      return { ok: false, error: "Name, WhatsApp, and email are required." };
    }
    const { data: row, error } = await supabase
      .from("pmd_users")
      .update({
        full_name: data.fullName.trim(),
        company: data.company?.trim() || null,
        position: data.position?.trim() || null,
        whatsapp: data.whatsapp.trim(),
        email: data.email.trim().toLowerCase(),
        updated_at: new Date().toISOString(),
      })
      .ilike("user_id", data.userId)
      .select()
      .single();
    if (error) return { ok: false, error: error.message };
    return { ok: true, profile: rowToProfile(row) };
  });

export const changePmdPin = createServerFn({ method: "POST" })
  .inputValidator((input: { userId: string; currentPin: string; newPin: string }) => input)
  .handler(async ({ data }): Promise<{ ok: true } | { ok: false; error: string }> => {
    const supabase = createNobleSupabase();
    if (!supabase) return { ok: false, error: "Backend not configured." };
    if (!/^\d{6}$/.test(data.newPin)) return { ok: false, error: "New PIN must be 6 digits." };
    const { data: row } = await supabase.from("pmd_users").select("id, pin").ilike("user_id", data.userId).maybeSingle();
    if (!row || row.pin !== data.currentPin) return { ok: false, error: "Current PIN is wrong." };
    const { error } = await supabase.from("pmd_users").update({ pin: data.newPin, updated_at: new Date().toISOString() }).eq("id", row.id);
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  });
