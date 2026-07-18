// Short-command dispatcher. Bilingual trigger phrases (English + Indonesian).
// Content after the trigger may be in any language.
import type { NavigateFn } from "@tanstack/react-router";

export interface CommandResult {
  handled: boolean;
  intent?: "openMic" | "closeMic" | "standby" | "signOut" | "backup" | "call" | "goRecord";
  payload?: string;
}

interface Ctx {
  navigate: NavigateFn;
  openMic: () => void;
  closeMic: () => void;
  signOut: () => void;
  backup: () => void;
  call: (phone: string) => void;
  goRecord: () => void;
}

// "open|show|go to|buka|tampilkan|pergi ke" + <menu>
const OPEN = "(?:open|show|go\\s*to|buka|tampilkan|pergi\\s*ke|ke)";

const ROUTES: Array<{ re: RegExp; to: string }> = [
  { re: new RegExp(`^${OPEN}\\s+(?:the\\s+)?(calendar|kalender)`, "i"), to: "/calendar" },
  { re: new RegExp(`^${OPEN}\\s+(?:the\\s+)?(tasks?|tugas)`, "i"), to: "/tasks" },
  { re: new RegExp(`^${OPEN}\\s+(?:the\\s+)?(notes?|catatan)`, "i"), to: "/notes" },
  { re: new RegExp(`^${OPEN}\\s+(?:the\\s+)?(diary|diaries|jurnal)`, "i"), to: "/diary" },
  { re: new RegExp(`^${OPEN}\\s+(?:the\\s+)?(meetings?|rapat|pertemuan)`, "i"), to: "/meetings" },
  { re: new RegExp(`^${OPEN}\\s+(?:the\\s+)?(appointments?|janji|janji\\s*temu)`, "i"), to: "/appointments" },
  { re: new RegExp(`^${OPEN}\\s+(?:the\\s+)?(contacts?|kontak)`, "i"), to: "/contacts" },
  { re: new RegExp(`^${OPEN}\\s+(?:the\\s+)?(reminders?|pengingat)`, "i"), to: "/reminders" },
  { re: new RegExp(`^${OPEN}\\s+(?:the\\s+)?(trips?|perjalanan)`, "i"), to: "/trips" },
  { re: new RegExp(`^${OPEN}\\s+(?:the\\s+)?(projects?|proyek)`, "i"), to: "/projects" },
  { re: new RegExp(`^${OPEN}\\s+(?:the\\s+)?(guide|manual|help|panduan|bantuan)`, "i"), to: "/guide" },
  { re: new RegExp(`^${OPEN}\\s+(?:the\\s+)?(settings|pengaturan|setelan)`, "i"), to: "/settings" },
  { re: new RegExp(`^${OPEN}\\s+(?:the\\s+)?(receive|terima|transfer)`, "i"), to: "/receive" },
  { re: /^(?:go\s+)?home$|^home$|^beranda$|^utama$/i, to: "/" },
];

export function dispatchCommand(raw: string, ctx: Ctx): CommandResult {
  const text = raw.trim().replace(/[.!?,]+$/, "");
  // Loose normalization for the fixed-phrase checks below: strip ALL
  // punctuation (not just trailing) and collapse whitespace, since speech
  // recognition often inserts commas/periods mid-utterance ("go, record.").
  const lower = text.toLowerCase().replace(/[.,!?;:]+/g, " ").replace(/\s+/g, " ").trim();

  if (/\b(open|start|buka|aktifkan)\s+mic\b/.test(lower)) {
    ctx.openMic();
    return { handled: true, intent: "openMic" };
  }
  if (/\b(close|stop|mute|tutup|matikan)\s+mic\b/.test(lower)) {
    ctx.closeMic();
    return { handled: true, intent: "closeMic" };
  }
  if (/^(standby|pause|sleep|berhenti|jeda|tidur)$/.test(lower)) {
    ctx.closeMic();
    ctx.navigate({ to: "/" });
    return { handled: true, intent: "standby" };
  }
  if (/\b(sign\s*out|log\s*out|keluar|logout)\b/.test(lower)) {
    ctx.signOut();
    return { handled: true, intent: "signOut" };
  }
  if (/\b(backup|export\s*data|cadangkan|ekspor)\b/.test(lower)) {
    ctx.backup();
    return { handled: true, intent: "backup" };
  }
  // "go record" and its many likely mis-hearings/variants. Deliberately
  // loose: any utterance in command-listening mode that even mentions
  // "record"/"rekam" (without "stop") is almost certainly meant for this.
  if (
    /\b(go\s*to?\s*record(ing)?|start\s*record(ing)?|open\s*record(ing)?|new\s*record(ing)?|record(ing)?\s*page|halaman\s*rekam|mulai\s*rekam|buka\s*rekam|ke\s*rekam)\b/.test(lower) ||
    (/\brekam\b|\brecord\b/.test(lower) && !/\b(stop|close|tutup|matikan|berhenti)\b/.test(lower))
  ) {
    ctx.goRecord();
    return { handled: true, intent: "goRecord" };
  }
  const callMatch = lower.match(/\b(?:call|telepon|hubungi|panggil)\s+(.+)/);
  if (callMatch) {
    ctx.call(callMatch[1]);
    return { handled: true, intent: "call", payload: callMatch[1] };
  }
  for (const { re, to } of ROUTES) {
    if (re.test(text)) {
      ctx.navigate({ to: to as never });
      return { handled: true };
    }
  }
  return { handled: false };
}
