import { createServerFn } from "@tanstack/react-start";
import { staffClient } from "./school-academic.server";

type Fail = { ok: false; error: string };

export const getPendingCounts = createServerFn({ method: "POST" })
  .inputValidator((input: { password: string; role: "principal" | "hos"; division?: string }) => input)
  .handler(async ({ data }): Promise<{ ok: true; officialLetters: number; agendas: number; reports: number } | Fail> => {
    const gate = staffClient(data.password);
    if (!gate.ok) return gate;

    if (data.role === "principal") {
      const [letters, agendas, reports] = await Promise.all([
        gate.supabase.from("school_projects").select("id").eq("status", "diajukan_principal"),
        gate.supabase.from("school_agendas").select("id").eq("approval_status", "submitted").eq("creator_role", "teacher").eq("division", data.division ?? ""),
        gate.supabase.from("school_cases").select("id").eq("status", "open").eq("division", data.division ?? ""),
      ]);
      if (letters.error) return { ok: false, error: letters.error.message };
      if (agendas.error) return { ok: false, error: agendas.error.message };
      if (reports.error) return { ok: false, error: reports.error.message };
      return { ok: true, officialLetters: (letters.data ?? []).length, agendas: (agendas.data ?? []).length, reports: (reports.data ?? []).length };
    }

    // HoS
    const [letters, agendas, reports] = await Promise.all([
      gate.supabase.from("school_projects").select("id").eq("status", "diajukan_hos"),
      gate.supabase.from("school_agendas").select("id").eq("approval_status", "submitted").eq("creator_role", "principal"),
      gate.supabase.from("school_cases").select("id").eq("status", "hos"),
    ]);
    if (letters.error) return { ok: false, error: letters.error.message };
    if (agendas.error) return { ok: false, error: agendas.error.message };
    if (reports.error) return { ok: false, error: reports.error.message };
    return {
      ok: true,
      officialLetters: (letters.data ?? []).length,
      agendas: (agendas.data ?? []).length,
      reports: (reports.data ?? []).length,
    };
  });
