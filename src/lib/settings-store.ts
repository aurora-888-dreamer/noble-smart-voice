import { useEffect, useState } from "react";
import type { Lang } from "./i18n";

const LANG_KEY = "voicetag.lang";
const ONBOARDED_KEY = "voicetag.onboarded";
const WAKE_KEY = "voicetag.wake";
const AUTOSAVE_KEY = "voicetag.autosaveRaw";

export function getStoredLang(): Lang {
  if (typeof window === "undefined") return "en";
  const v = localStorage.getItem(LANG_KEY);
  return v === "id" ? "id" : "en";
}

export function setStoredLang(lang: Lang) {
  localStorage.setItem(LANG_KEY, lang);
  window.dispatchEvent(new Event("voicetag:lang"));
}

export function useLang(): [Lang, (l: Lang) => void] {
  const [lang, setLang] = useState<Lang>("en");
  useEffect(() => {
    setLang(getStoredLang());
    const h = () => setLang(getStoredLang());
    window.addEventListener("voicetag:lang", h);
    return () => window.removeEventListener("voicetag:lang", h);
  }, []);
  return [
    lang,
    (l: Lang) => {
      setStoredLang(l);
      setLang(l);
    },
  ];
}

export function isOnboarded(): boolean {
  if (typeof window === "undefined") return true;
  return localStorage.getItem(ONBOARDED_KEY) === "1";
}

export function markOnboarded() {
  localStorage.setItem(ONBOARDED_KEY, "1");
}

// Wake-word phrase (used by the Android assistant shortcut, e.g. "open voicetag")
export function getWakePhrase(): string {
  if (typeof window === "undefined") return "open voicetag";
  return localStorage.getItem(WAKE_KEY) || "open voicetag";
}
export function setWakePhrase(v: string) {
  localStorage.setItem(WAKE_KEY, v);
  window.dispatchEvent(new Event("voicetag:wake"));
}
export function useWakePhrase(): [string, (v: string) => void] {
  const [w, setW] = useState<string>("open voicetag");
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