import { createServerFn } from "@tanstack/react-start";
import { generateText, NoObjectGeneratedError, Output, type LanguageModel } from "ai";
import { z } from "zod";
import { createNobleAI } from "./ai-gateway.server";
import { createGoogleAI, GOOGLE_MODEL_ID } from "./google-ai.server";

// Prefer the free, direct Google AI Studio key when present (set
// GOOGLE_AI_API_KEY as an env var) so Noble keeps working even when the
// Lovable AI Gateway is out of credits. Falls back to the Lovable gateway
// if no direct key is configured.
function resolveModel(): { model: LanguageModel; source: "google" | "lovable" } | null {
  const google = createGoogleAI();
  if (google) return { model: google(GOOGLE_MODEL_ID), source: "google" };

  const lovableKey = process.env.LOVABLE_API_KEY;
  if (lovableKey) {
    const provider = createNobleAI(lovableKey);
    return { model: provider("google/gemini-3-flash-preview"), source: "lovable" };
  }
  return null;
}

const analyzeSchema = z.object({
  type: z.enum(["note", "task", "meeting", "appointment", "contact", "message", "diary"]),
  title: z.string(),
  summary: z.string().nullable(),
  category: z.string().nullable(),
  language: z.enum(["en", "id", "mixed"]),
  tags: z.array(z.string()),
});

const structureSchema = z.object({
  title: z.string(),
  content: z.string(),
  whenISO: z.string().nullable(),
  contactName: z.string().nullable(),
  contactEmail: z.string().nullable(),
  contactPhone: z.string().nullable(),
});

// Category-aware structuring: takes the transcript AND the category the
// person already picked, and explicitly separates it into a short title,
// full content, a date/time (if one was mentioned), and contact details
// (if relevant) — instead of the naive local parser, which just dumps the
// whole utterance into both title and content. Also fixes spoken-aloud
// patterns a plain transcript won't ("suharto at gmail dot com" ->
// "suharto@gmail.com"). Text-only by design: no audio/mic involved, so it
// works identically on mobile and desktop with no contention risk.
export const structureCapture = createServerFn({ method: "POST" })
  .inputValidator((input: { transcript: string; type: string; nowISO: string }) => input)
  .handler(async ({ data }) => {
    const resolved = resolveModel();
    if (!resolved) {
      return { ok: false as const, error: "AI unavailable" };
    }

    try {
      const { output } = await generateText({
        model: resolved.model,
        output: Output.object({ schema: structureSchema }),
        prompt: `You are Noble, a bilingual (English + Bahasa Indonesia) executive assistant. The person recorded a voice entry and picked the category "${data.type}" for it. The transcript below may contain misheard words or spoken-aloud formatting (e.g. "suharto at gmail dot com" should become "suharto@gmail.com"; spoken phone numbers should become plain digits).

Extract these fields:
- title: a SHORT label (max 8 words) summarizing what this is — a headline, NEVER the full transcript.
- content: the full cleaned-up text with obvious mishearings and spoken-aloud email/phone formatting fixed, keeping all real detail and natural sentences. Do not just repeat the title here.
- whenISO: if a specific date/time is mentioned or implied (e.g. "tomorrow 3pm", "jam 10 pagi hari Minggu"), resolve it to an ISO 8601 datetime relative to right now (${data.nowISO}). Otherwise null.
- contactName, contactEmail, contactPhone: fill these ONLY if category is "contact" or a specific person's contact details are clearly the point of the entry. Otherwise null.

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

export const analyzeVoice = createServerFn({ method: "POST" })
  .inputValidator((input: { transcript: string }) => input)
  .handler(async ({ data }) => {
    const resolved = resolveModel();
    if (!resolved) {
      return { ok: false as const, error: "AI unavailable" };
    }

    try {
      const { output } = await generateText({
        model: resolved.model,
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
    const resolved = resolveModel();
    if (!resolved) {
      return { ok: false as const, error: "AI unavailable" };
    }

    try {
      const { text } = await generateText({
        model: resolved.model,
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
