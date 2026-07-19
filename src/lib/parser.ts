import type { ItemType } from "./db";
import type { Lang } from "./i18n";

export interface Parsed {
  type: ItemType;
  title: string;
  body?: string;
  when?: number; // epoch ms
  contact?: { fullName: string; email?: string };
}

// Very lightweight bilingual command parser.
// Not perfect — designed for demo/prototype clarity.

const TRIGGERS: Record<ItemType, { en: RegExp; id: RegExp }> = {
  note: {
    en: /^(save (a )?note|note|remember|catat)[\s:,-]+/i,
    id: /^(simpan catatan|catatan|catat)[\s:,-]+/i,
  },
  task: {
    en: /^(create (a )?task|task|todo|remind me to)[\s:,-]+/i,
    id: /^(buat tugas|tugas|ingatkan saya|ingatkan aku)[\s:,-]+/i,
  },
  meeting: {
    en: /^(meeting( note| summary)?|schedule a meeting)[\s:,-]+/i,
    id: /^(catatan rapat|rapat|jadwalkan meeting|jadwalkan rapat)[\s:,-]+/i,
  },
  appointment: {
    en: /^(appointment|deal|follow[- ]?up)[\s:,-]+/i,
    id: /^(janji|janji temu|kesepakatan)[\s:,-]+/i,
  },
  contact: {
    en: /^(save (a )?contact|contact|add contact)[\s:,-]+/i,
    id: /^(simpan kontak|kontak|tambah kontak)[\s:,-]+/i,
  },
  message: {
    en: /^(save (a )?message|message|memo)[\s:,-]+/i,
    id: /^(simpan pesan|pesan|memo)[\s:,-]+/i,
  },
  diary: {
    en: /^(diary( entry)?|journal)[\s:,-]+/i,
    id: /^(diary|catatan harian|jurnal)[\s:,-]+/i,
  },
  trip: {
    en: /^(save (a )?trip|trip|plan a trip)[\s:,-]+/i,
    id: /^(simpan trip|trip|rencana perjalanan|perjalanan)[\s:,-]+/i,
  },
  project: {
    en: /^(save (a )?project|new project|project)[\s:,-]+/i,
    id: /^(simpan proyek|proyek baru|proyek)[\s:,-]+/i,
  },
};

function detectType(text: string, lang: Lang): { type: ItemType; rest: string } {
  for (const t of Object.keys(TRIGGERS) as ItemType[]) {
    const re = TRIGGERS[t][lang];
    const m = text.match(re);
    if (m) return { type: t, rest: text.slice(m[0].length).trim() };
  }
  // fallback keywords anywhere
  if (/remind me|ingatkan/i.test(text)) return { type: "task", rest: text };
  return { type: "note", rest: text };
}

function extractEmail(text: string): string | undefined {
  const m = text.match(/[\w.+-]+@[\w-]+\.[\w.-]+/);
  return m?.[0];
}

const EN_DAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
const ID_DAYS = ["minggu", "senin", "selasa", "rabu", "kamis", "jumat", "sabtu"];

function parseTime(text: string, lang: Lang): number | undefined {
  const now = new Date();
  const t = text.toLowerCase();

  // time of day
  let hour: number | undefined;
  let minute = 0;
  const timeMatchEn = t.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)/);
  const timeMatchId = t.match(/jam\s*(\d{1,2})(?::(\d{2}))?(?:\s*(pagi|siang|sore|malam))?/);
  if (timeMatchEn) {
    hour = parseInt(timeMatchEn[1], 10);
    minute = timeMatchEn[2] ? parseInt(timeMatchEn[2], 10) : 0;
    if (timeMatchEn[3] === "pm" && hour < 12) hour += 12;
    if (timeMatchEn[3] === "am" && hour === 12) hour = 0;
  } else if (timeMatchId) {
    hour = parseInt(timeMatchId[1], 10);
    minute = timeMatchId[2] ? parseInt(timeMatchId[2], 10) : 0;
    const period = timeMatchId[3];
    if ((period === "siang" || period === "sore" || period === "malam") && hour < 12) hour += 12;
    if (period === "pagi" && hour === 12) hour = 0;
  }

  // day
  const target = new Date(now);
  let dayMatched = false;
  if (/tomorrow|besok/.test(t)) {
    target.setDate(now.getDate() + 1);
    dayMatched = true;
  } else if (/today|hari ini/.test(t)) {
    dayMatched = true;
  } else if (/tonight|malam ini/.test(t)) {
    dayMatched = true;
    if (hour === undefined) {
      hour = 20;
    }
  }
  const days = lang === "id" ? ID_DAYS : EN_DAYS;
  for (let i = 0; i < 7; i++) {
    if (new RegExp(`\\b${days[i]}\\b`, "i").test(text)) {
      const cur = now.getDay();
      let diff = (i - cur + 7) % 7;
      if (diff === 0) diff = 7;
      target.setDate(now.getDate() + diff);
      dayMatched = true;
      break;
    }
  }

  // "in 30 minutes" / "30 menit lagi"
  const inMinEn = t.match(/in (\d+)\s*(minute|minutes|min|hour|hours|hr)/);
  const inMinId = t.match(/(\d+)\s*(menit|jam)\s*lagi/);
  if (inMinEn) {
    const n = parseInt(inMinEn[1], 10);
    const ms = /hour|hr/.test(inMinEn[2]) ? n * 3600_000 : n * 60_000;
    return now.getTime() + ms;
  }
  if (inMinId) {
    const n = parseInt(inMinId[1], 10);
    const ms = inMinId[2] === "jam" ? n * 3600_000 : n * 60_000;
    return now.getTime() + ms;
  }

  if (hour !== undefined) {
    target.setHours(hour, minute, 0, 0);
    if (!dayMatched && target.getTime() < now.getTime()) {
      target.setDate(target.getDate() + 1);
    }
    return target.getTime();
  }
  if (dayMatched) {
    target.setHours(9, 0, 0, 0);
    return target.getTime();
  }
  return undefined;
}

export function parseUtterance(text: string, lang: Lang): Parsed {
  const clean = text.trim().replace(/\s+/g, " ");
  const { type, rest } = detectType(clean, lang);
  const when = parseTime(clean, lang);

  if (type === "contact") {
    // "Save contact: Sarah Chen, sarah@email.com"
    const email = extractEmail(rest);
    const namePart = rest.replace(email ?? "", "").replace(/[,;]/g, " ").trim();
    return {
      type,
      title: namePart || (email ?? "Contact"),
      contact: { fullName: namePart || "Unknown", email },
    };
  }

  const title = rest.length > 80 ? rest.slice(0, 77) + "…" : rest || clean;
  return { type, title, body: rest, when };
}