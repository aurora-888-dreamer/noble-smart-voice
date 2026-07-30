import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { currentSchoolId, schoolClient, unauthenticated } from "../school";

export default defineTool({
  name: "create_calendar_event",
  title: "Create an academic calendar event",
  description: "Add a new event to the School Dashboard academic calendar.",
  inputSchema: {
    title: z.string().describe("Event title."),
    date: z.string().describe("Event date, YYYY-MM-DD."),
    scope: z.string().optional().describe("Owner scope, e.g. hos, principal, teacher. Defaults to hos."),
    notes: z.string().optional().describe("Optional description."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async (
    { title, date, scope, notes }: { title: string; date: string; scope?: string; notes?: string },
    ctx: ToolContext,
  ) => {
    if (!ctx.isAuthenticated()) return unauthenticated();
    const supabase = schoolClient();
    if (!supabase) return { content: [{ type: "text" as const, text: "School backend is not configured." }], isError: true };

    const { data, error } = await supabase
      .from("school_calendar_events")
      .insert({
        school_id: currentSchoolId(),
        title: title.trim(),
        event_date: date,
        owner_role: scope || "hos",
        description: notes || null,
      })
      .select()
      .single();

    if (error) return { content: [{ type: "text" as const, text: error.message }], isError: true };
    return {
      content: [{ type: "text" as const, text: JSON.stringify(data) }],
      structuredContent: { event: data },
    };
  },
});
