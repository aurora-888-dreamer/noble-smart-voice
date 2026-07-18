import { createGoogleGenerativeAI } from "@ai-sdk/google";

// Direct Google AI Studio access. Get a free key (no credit card) at
// https://aistudio.google.com -> "Get API key" -> "Create API key", then
// add it as an environment variable named GOOGLE_AI_API_KEY in your
// Lovable/Cloudflare project settings. Never commit the key itself to
// source — only this file (which just reads the env var) is checked in.
export function createGoogleAI() {
  const key = process.env.GOOGLE_AI_API_KEY;
  if (!key) return null;
  return createGoogleGenerativeAI({ apiKey: key });
}

export const GOOGLE_MODEL_ID = "gemini-flash-latest";
