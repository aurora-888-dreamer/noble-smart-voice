import { useEffect, useState } from "react";
import type { PmdProfile } from "./pmd-auth.functions";

const PMD_SESSION_KEY = "noble.pmdSession";

export function getPmdSession(): PmdProfile | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(PMD_SESSION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as PmdProfile;
  } catch {
    return null;
  }
}

export function setPmdSession(profile: PmdProfile) {
  localStorage.setItem(PMD_SESSION_KEY, JSON.stringify(profile));
  window.dispatchEvent(new Event("noble:pmd-session"));
}

export function clearPmdSession() {
  localStorage.removeItem(PMD_SESSION_KEY);
  window.dispatchEvent(new Event("noble:pmd-session"));
}

export function usePmdSession(): PmdProfile | null {
  const [session, setSession] = useState<PmdProfile | null>(() => getPmdSession());
  useEffect(() => {
    const sync = () => setSession(getPmdSession());
    sync();
    window.addEventListener("noble:pmd-session", sync);
    return () => window.removeEventListener("noble:pmd-session", sync);
  }, []);
  return session;
}
