import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { schoolClient, unauthenticated } from "../school";

export default defineTool({
  name: "list_timetable",
  title: "List timetable slots",
  description: "List timetable slots from the School Dashboard, optionally filtered by class id or weekday.",
  inputSchema: {
    classId: z.string().optional().describe("Class UUID to filter by."),
    day: z.string().optional().describe("Weekday to filter by, as stored (e.g. Monday / Senin)."),
    limit: z.number().int().optional().describe("Max rows to return (default 100)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (
    { classId, day, limit }: { classId?: string; day?: string; limit?: number },
    ctx: ToolContext,
  ) => {
    if (!ctx.isAuthenticated()) return unauthenticated();
    const supabase = schoolClient();
    if (!supabase) return { content: [{ type: "text" as const, text: "School backend is not configured." }], isError: true };

    let q = supabase.from("school_timetable").select("*").limit(Math.min(Math.max(limit ?? 100, 1), 300));
    if (classId) q = q.eq("class_id", classId);
    if (day) q = q.eq("day_of_week", day);

    const { data, error } = await q;
    if (error) return { content: [{ type: "text" as const, text: error.message }], isError: true };
    return {
      content: [{ type: "text" as const, text: JSON.stringify(data ?? []) }],
      structuredContent: { slots: data ?? [] },
    };
  },
});
