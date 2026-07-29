import { createServerFn } from "@tanstack/react-start";
import { staffClient } from "./school-academic.server";

type Fail = { ok: false; error: string };

export const sendHeartbeat = createServerFn({ method: "POST" })
  .inputValidator((input: { password: string; staffId: string }) => input)
  .handler(async ({ data }): Promise<{ ok: true } | Fail> => {
    const gate = staffClient(data.password);
    if (!gate.ok) return gate;
    const { error } = await gate.supabase
      .from("school_staff").update({ last_seen_at: new Date().toISOString() }).eq("id", data.staffId);
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  });
