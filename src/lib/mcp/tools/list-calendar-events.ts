import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { schoolClient, unauthenticated } from "../school";

export default defineTool({
  name: "list_calendar_events",
  title: "List academic calendar events",
  description:
    "List academic calendar events from the School Dashboard, optionally filtered by an inclusive date range (YYYY-MM-DD) and owner scope.",
  inputSchema: {
    from: z.string().optional().describe("Start date, YYYY-MM-DD."),
    to: z.string().optional().describe("End date, YYYY-MM-DD."),
    scope: z.string().optional().describe("Owner scope, e.g. hos, principal, teacher."),
    limit: z.number().int().optional().describe("Max rows to return (default 50)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (
    { from, to, scope, limit }: { from?: string; to?: string; scope?: string; limit?: number },
    ctx: ToolContext,
  ) => {
    if (!ctx.isAuthenticated()) return unauthenticated();
    const supabase = schoolClient();
    if (!supabase) return { content: [{ type: "text" as const, text: "School backend is not configured." }], isError: true };

    let q = supabase
      .from("school_calendar_events")
      .select("*")
      .order("event_date", { ascending: true })
      .limit(Math.min(Math.max(limit ?? 50, 1), 200));
    if (from) q = q.gte("event_date", from);
    if (to) q = q.lte("event_date", to);
    if (scope) q = q.eq("owner_role", scope);

    const { data, error } = await q;
    if (error) return { content: [{ type: "text" as const, text: error.message }], isError: true };
    return {
      content: [{ type: "text" as const, text: JSON.stringify(data ?? []) }],
      structuredContent: { events: data ?? [] },
    };
  },
});
