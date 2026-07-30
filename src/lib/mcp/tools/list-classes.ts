import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { schoolClient, unauthenticated } from "../school";

export default defineTool({
  name: "list_classes",
  title: "List school classes",
  description: "List the classes (grades/sections) configured in the School Dashboard.",
  inputSchema: {
    search: z.string().optional().describe("Optional case-insensitive filter on the class name."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ search }: { search?: string }, ctx: ToolContext) => {
    if (!ctx.isAuthenticated()) return unauthenticated();
    const supabase = schoolClient();
    if (!supabase) return { content: [{ type: "text" as const, text: "School backend is not configured." }], isError: true };

    let q = supabase.from("school_classes").select("id, name, level, homeroom_teacher_id").order("name");
    if (search) q = q.ilike("name", `%${search}%`);
    const { data, error } = await q;
    if (error) return { content: [{ type: "text" as const, text: error.message }], isError: true };
    return {
      content: [{ type: "text" as const, text: JSON.stringify(data ?? []) }],
      structuredContent: { classes: data ?? [] },
    };
  },
});
