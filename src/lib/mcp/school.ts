// Shared helpers for the MCP tools. No env reads or I/O at module scope —
// everything happens inside the exported functions, which only run per request.
import { createLovableSchoolSupabase } from "@/lib/supabase.server";

export function schoolClient() {
  return createLovableSchoolSupabase();
}

export function currentSchoolId(): string {
  return process.env.SCHOOL_ID || "";
}

export function unauthenticated() {
  return {
    content: [{ type: "text" as const, text: "Not authenticated. Sign in to Noble Smart Voice to use this tool." }],
    isError: true,
  };
}
