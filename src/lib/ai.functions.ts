import { createServerFn } from "@tanstack/react-start";
import { generateText, NoObjectGeneratedError, Output } from "ai";
import { z } from "zod";
import { createNobleAI } from "./ai-gateway.server";

const analyzeSchema = z.object({
  type: z.enum(["note", "task", "meeting", "appointment", "contact", "message", "diary"]),
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
        prompt: `You are Noble, a bilingual (English + Bahasa Indonesia) executive assistant. Classify the following voice transcript into ONE type (note, task, meeting, appointment, contact, message, diary), extract a short title (max 80 chars), a one-line summary, a category label (e.g. "work", "family", "finance", "health"), the detected language, and up to 5 tags.

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

// Accurate, code-switch-aware transcription pass. The browser's built-in
// Web Speech API only ever listens in ONE declared language (id-ID or
// en-US) per session, so when someone mixes Indonesian and English in the
// same sentence, the live captions can come out lopsided toward whichever
// locale is active. This sends the actual recorded audio to Gemini (which
// isn't locked to one locale) and asks for a literal, unedited transcript,
// then the client uses it to replace the draft if the person hasn't
// already started editing it themselves.
export const transcribeAudio = createServerFn({ method: "POST" })
  .inputValidator((input: { audioBase64: string; mimeType: string }) => input)
  .handler(async ({ data }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) {
      return { ok: false as const, error: "AI unavailable" };
    }
    const provider = createNobleAI(key);
    const model = provider("google/gemini-3-flash-preview");

    try {
      const { text } = await generateText({
        model,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text:
                  "Transcribe this audio verbatim. The speaker is likely mixing Bahasa Indonesia and English within the same sentence (natural code-switching for Indonesian speakers) — keep every word exactly as spoken, in whichever language it was said, without translating anything or forcing it into a single language. Do not add commentary, punctuation cleanup beyond normal sentence punctuation, or a preamble — return ONLY the transcript text.",
              },
              {
                type: "file",
                data: data.audioBase64,
                mediaType: data.mimeType,
              },
            ],
          },
        ],
      });
      return { ok: true as const, text: text.trim() };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { ok: false as const, error: message };
    }
  });
