// Short-command dispatcher. Bilingual trigger phrases (English + Indonesian).
// Content after the trigger may be in any language.
import type { NavigateFn } from "@tanstack/react-router";

export interface CommandResult {
  handled: boolean;
  intent?: "openMic" | "closeMic" | "standby" | "signOut" | "backup" | "call";
  payload?: string;
}

interface Ctx {
  navigate: NavigateFn;
  openMic: () => void;
  closeMic: () => void;
  signOut: () => void;
  backup: () => void;
  call: (phone: string) => void;
}

// "open|show|go to|buka|tampilkan|pergi ke" + <menu>
const OPEN = "(?:open|show|go\\s*to|buka|tampilkan|pergi\\s*ke|ke)";

const ROUTES: Array<{ re: RegExp; to: string }> = [
  { re: new RegExp(`^${OPEN}\\s+(?:the\\s+)?(calendar|kalender)`, "i"), to: "/calendar" },
  { re: new RegExp(`^${OPEN}\\s+(?:the\\s+)?(tasks?|tugas)`, "i"), to: "/tasks" },
  { re: new RegExp(`^${OPEN}\\s+(?:the\\s+)?(notes?|catatan)`, "i"), to: "/notes" },
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
  const lower = text.toLowerCase();

  if (/^(open|start|buka|aktifkan)\s+mic$/.test(lower)) {
    ctx.openMic();
    return { handled: true, intent: "openMic" };
  }
  if (/^(close|stop|mute|tutup|matikan)\s+mic$/.test(lower)) {
    ctx.closeMic();
    return { handled: true, intent: "closeMic" };
  }
  if (/^(standby|pause|sleep|berhenti|jeda|tidur)$/.test(lower)) {
    ctx.closeMic();
    ctx.navigate({ to: "/" });
    return { handled: true, intent: "standby" };
  }
  if (/^(sign\s*out|log\s*out|keluar|logout)$/.test(lower)) {
    ctx.signOut();
    return { handled: true, intent: "signOut" };
  }
  if (/^(backup(\s+now)?|export(\s+data)?|cadangkan|ekspor)$/.test(lower)) {
    ctx.backup();
    return { handled: true, intent: "backup" };
  }
  const callMatch = lower.match(/^(?:call|telepon|hubungi|panggil)\s+(.+)/);
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
