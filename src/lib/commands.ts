// Short-command dispatcher. English trigger phrases; content after the
// trigger may be any language.
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

const ROUTES: Array<{ re: RegExp; to: string }> = [
  { re: /^(open|show|go to)\s+(the\s+)?calendar/i, to: "/calendar" },
  { re: /^(open|show|go to)\s+(the\s+)?tasks?/i, to: "/tasks" },
  { re: /^(open|show|go to)\s+(the\s+)?notes?/i, to: "/notes" },
  { re: /^(open|show|go to)\s+(the\s+)?meetings?/i, to: "/meetings" },
  { re: /^(open|show|go to)\s+(the\s+)?appointments?/i, to: "/appointments" },
  { re: /^(open|show|go to)\s+(the\s+)?contacts?/i, to: "/contacts" },
  { re: /^(open|show|go to)\s+(the\s+)?reminders?/i, to: "/reminders" },
  { re: /^(open|show|go to)\s+(the\s+)?trips?/i, to: "/trips" },
  { re: /^(open|show|go to)\s+(the\s+)?projects?/i, to: "/projects" },
  { re: /^(open|show|go to)\s+(the\s+)?(guide|manual|help)/i, to: "/guide" },
  { re: /^(open|show|go to)\s+(the\s+)?settings/i, to: "/settings" },
  { re: /^(go\s+)?home$|^home$/i, to: "/" },
];

export function dispatchCommand(raw: string, ctx: Ctx): CommandResult {
  const text = raw.trim().replace(/[.!?]+$/, "");
  const lower = text.toLowerCase();

  if (/^(open|start)\s+mic$/.test(lower)) {
    ctx.openMic();
    return { handled: true, intent: "openMic" };
  }
  if (/^(close|stop|mute)\s+mic$/.test(lower)) {
    ctx.closeMic();
    return { handled: true, intent: "closeMic" };
  }
  if (/^(standby|pause|sleep)$/.test(lower)) {
    ctx.closeMic();
    ctx.navigate({ to: "/" });
    return { handled: true, intent: "standby" };
  }
  if (/^sign\s*out$|^log\s*out$/.test(lower)) {
    ctx.signOut();
    return { handled: true, intent: "signOut" };
  }
  if (/^backup(\s+now)?$|^export(\s+data)?$/.test(lower)) {
    ctx.backup();
    return { handled: true, intent: "backup" };
  }
  const callMatch = lower.match(/^call\s+(.+)/);
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
