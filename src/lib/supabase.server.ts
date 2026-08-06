import { createClient } from "@supabase/supabase-js";

// Server-only Supabase client for Noble's licensing/voucher backend — a
// separate Supabase project from Portal Pulsa Murah's, per your call to
// keep the two businesses independent.
//
// Add these as environment variables in Lovable/Cloudflare:
//   NOBLE_SUPABASE_URL              -> Project Settings -> API -> Project URL
//   NOBLE_SUPABASE_SERVICE_ROLE_KEY -> Project Settings -> API -> service_role key
//
// NOTE: named with a "NOBLE_" prefix (not "SUPABASE_") because Lovable
// reserves the plain "SUPABASE_" prefix for its own managed Lovable Cloud
// integration and won't let you create a secret with that name — this has
// nothing to do with our own separate Supabase project.
//
// IMPORTANT: the service_role key bypasses Row Level Security and must
// NEVER be used in client code or committed anywhere — only read here,
// inside a *.server.ts file that TanStack Start keeps off the client bundle.
// UPDATE: the separate NOBLE_SUPABASE_* project became unreachable (its
// origin returns Cloudflare "error code: 1016"), which broke checkout with
// that exact message. Store/voucher tables now live in this project's own
// managed database (same one School Dashboard uses); the NOBLE_SUPABASE_*
// pair is only used as a fallback if it is ever set again.
export function createNobleSupabase() {
  const url = process.env.SUPABASE_URL || process.env.NOBLE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NOBLE_SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

// School Dashboard specifically uses Lovable Cloud's own auto-managed
// Supabase connection (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY — the
// reserved-prefix secrets Lovable sets itself), NOT the NOBLE_SUPABASE_*
// pair above. This was discovered the hard way: no matter what the
// NOBLE_SUPABASE_* secrets were set to, School Dashboard writes kept
// landing in whatever database Lovable Cloud manages internally — so
// this makes that the officially intended connection instead of fighting
// it. Store/voucher features are unaffected and still use
// createNobleSupabase() -> the separate, user-owned Supabase project.
export function createLovableSchoolSupabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

// Vouchers are bound to a contact (email or Indonesian phone number).
// Normalize both sides the same way so "0812...", "+62812...", "62812..."
// and mixed-case emails all match consistently.
export function normalizeContact(raw: string): string {
  const v = raw.trim();
  if (v.includes("@")) return v.toLowerCase();
  let digits = v.replace(/\D/g, "");
  if (digits.startsWith("0")) digits = "62" + digits.slice(1);
  else if (digits.startsWith("8")) digits = "62" + digits;
  return digits;
}
