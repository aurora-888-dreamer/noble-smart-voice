import { createServerFn } from "@tanstack/react-start";
import { generateText, NoObjectGeneratedError, Output } from "ai";
import { z } from "zod";
import { createNobleAI } from "./ai-gateway.server";

const analyzeSchema = z.object({
  type: z.enum(["note", "task", "meeting", "appointment", "contact", "message"]),
  title: z.string(),
  summary: z.string().nullable(),
  category: z.string().nullable(),
  language: z.enum(["en", "id", "mixed"]),
  tags: z.array(z.string()),
});

export const analyzeVoice = createServerFn({ method: "POST" })
  .inputValidator((input: { transcript: string }) => input)
  .handler(async ({ data }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) {
      return { ok: false as const, error: "AI unavailable" };
    }
    const provider = createNobleAI(key);
    const model = provider("google/gemini-3-flash-preview");

    try {
      const { output } = await generateText({
        model,
        output: Output.object({ schema: analyzeSchema }),
        prompt: `You are Noble, a bilingual (English + Bahasa Indonesia) executive assistant. Classify the following voice transcript into ONE type (note, task, meeting, appointment, contact, message), extract a short title (max 80 chars), a one-line summary, a category label (e.g. "work", "family", "finance", "health"), the detected language, and up to 5 tags.

Transcript:
"""
${data.transcript}
"""

Return JSON only.`,
      });
      return { ok: true as const, result: output };
    } catch (error) {
      if (NoObjectGeneratedError.isInstance(error)) {
        return { ok: false as const, error: "Could not parse AI response" };
      }
      const message = error instanceof Error ? error.message : String(error);
      return { ok: false as const, error: message };
    }
  });
