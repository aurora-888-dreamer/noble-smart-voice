import { createClient } from "@supabase/supabase-js";

// Server-only Supabase client for Noble's licensing/voucher backend — a
// separate Supabase project from Portal Pulsa Murah's, per your call to
// keep the two businesses independent.
//
// Add these as environment variables in Lovable/Cloudflare:
//   SUPABASE_URL              -> Project Settings -> API -> Project URL
//   SUPABASE_SERVICE_ROLE_KEY -> Project Settings -> API -> service_role key
//
// IMPORTANT: the service_role key bypasses Row Level Security and must
// NEVER be used in client code or committed anywhere — only read here,
// inside a *.server.ts file that TanStack Start keeps off the client bundle.
export function createNobleSupabase() {
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
