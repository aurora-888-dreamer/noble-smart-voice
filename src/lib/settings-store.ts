import { useEffect, useState } from "react";
import type { Lang } from "./i18n";

const LANG_KEY = "voicetag.lang";
const ONBOARDED_KEY = "voicetag.onboarded";
const WAKE_KEY = "voicetag.wake";
const AUTOSAVE_KEY = "voicetag.autosaveRaw";
const RECORD_TIMEOUT_KEY = "voicetag.recordTimeoutMin";

export function getStoredLang(): Lang {
  // Language selection is removed — UI labels are always English while voice
  // input / transcripts stay bilingual (auto-mixed EN + ID).
  return "en";
}

export function setStoredLang(_lang: Lang) {
  // no-op: language switching is disabled.
}

export function useLang(): [Lang, (l: Lang) => void] {
  return ["en", () => {}];
}

export function isOnboarded(): boolean {
  if (typeof window === "undefined") return true;
  return localStorage.getItem(ONBOARDED_KEY) === "1";
}

export function markOnboarded() {
  localStorage.setItem(ONBOARDED_KEY, "1");
}

// Wake-word phrase (default: "Aurora Start")
const DEFAULT_WAKE = "Aurora Start";
export function getWakePhrase(): string {
  if (typeof window === "undefined") return DEFAULT_WAKE;
  return localStorage.getItem(WAKE_KEY) || DEFAULT_WAKE;
}
export function setWakePhrase(v: string) {
  localStorage.setItem(WAKE_KEY, v);
  window.dispatchEvent(new Event("voicetag:wake"));
}
export function useWakePhrase(): [string, (v: string) => void] {
  const [w, setW] = useState<string>(DEFAULT_WAKE);
  useEffect(() => {
    setW(getWakePhrase());
    const h = () => setW(getWakePhrase());
    window.addEventListener("voicetag:wake", h);
    return () => window.removeEventListener("voicetag:wake", h);
  }, []);
  return [w, (v: string) => { setWakePhrase(v); setW(v); }];
}

// Auto-save raw transcript (skip parse/review, keep bilingual mix as-is)
export function getAutoSaveRaw(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(AUTOSAVE_KEY) === "1";
}
export function setAutoSaveRaw(v: boolean) {
  localStorage.setItem(AUTOSAVE_KEY, v ? "1" : "0");
  window.dispatchEvent(new Event("voicetag:autosave"));
}
export function useAutoSaveRaw(): [boolean, (v: boolean) => void] {
  const [a, setA] = useState<boolean>(false);
  useEffect(() => {
    setA(getAutoSaveRaw());
    const h = () => setA(getAutoSaveRaw());
    window.addEventListener("voicetag:autosave", h);
    return () => window.removeEventListener("voicetag:autosave", h);
  }, []);
  return [a, (v: boolean) => { setAutoSaveRaw(v); setA(v); }];
}

// Recording auto-stop timeout, in minutes, of continuous silence before the
// full-screen recorder closes itself automatically. User can still stop
// earlier with an explicit command ("close mic" / "selesai") or the Done
// button — this timer is only a safety net, and resets on every utterance.
export const DEFAULT_RECORD_TIMEOUT_MIN = 5;
export function getRecordTimeoutMin(): number {
  if (typeof window === "undefined") return DEFAULT_RECORD_TIMEOUT_MIN;
  const v = Number(localStorage.getItem(RECORD_TIMEOUT_KEY));
  return v > 0 ? v : DEFAULT_RECORD_TIMEOUT_MIN;
}
export function setRecordTimeoutMin(v: number) {
  localStorage.setItem(RECORD_TIMEOUT_KEY, String(Math.max(1, v)));
  window.dispatchEvent(new Event("voicetag:recordTimeout"));
}
export function useRecordTimeoutMin(): [number, (v: number) => void] {
  const [v, setV] = useState<number>(DEFAULT_RECORD_TIMEOUT_MIN);
  useEffect(() => {
    setV(getRecordTimeoutMin());
    const h = () => setV(getRecordTimeoutMin());
    window.addEventListener("voicetag:recordTimeout", h);
    return () => window.removeEventListener("voicetag:recordTimeout", h);
  }, []);
  return [v, (val: number) => { setRecordTimeoutMin(val); setV(val); }];
}