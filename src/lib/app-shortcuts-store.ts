import { useEffect, useState } from "react";
import { DEFAULT_SHORTCUTS, type AppShortcut } from "./app-shortcuts";

const ENABLED_KEY = "noble.appShortcutsEnabled";
const CUSTOM_KEY = "noble.appShortcutsCustom";
const OVERRIDE_KEY = "noble.appShortcutsUrlOverride";

function getUrlOverrides(): Record<string, string> {
  if (typeof window === "undefined") return {};
  const raw = localStorage.getItem(OVERRIDE_KEY);
  return raw ? JSON.parse(raw) : {};
}

/** Lets any shortcut's URL be viewed/edited — e.g. filling in your own
 * WhatsApp number for the default "wa.me" shortcut, which otherwise opens
 * a useless generic landing page with no chat attached. */
export function updateShortcutUrl(id: string, url: string) {
  const overrides = getUrlOverrides();
  overrides[id] = url;
  localStorage.setItem(OVERRIDE_KEY, JSON.stringify(overrides));
  window.dispatchEvent(new Event("noble:shortcuts"));
}

function getEnabled(): Record<string, boolean> {
  if (typeof window === "undefined") return {};
  const raw = localStorage.getItem(ENABLED_KEY);
  if (raw) return JSON.parse(raw);
  // Default: WhatsApp, Email, Browser on; the social apps off (keep Home tidy until chosen).
  return { whatsapp: true, email: true, browser: true };
}

function saveEnabled(state: Record<string, boolean>) {
  localStorage.setItem(ENABLED_KEY, JSON.stringify(state));
  window.dispatchEvent(new Event("noble:shortcuts"));
}

export function isShortcutEnabled(id: string): boolean {
  return !!getEnabled()[id];
}

export function setShortcutEnabled(id: string, enabled: boolean) {
  const state = getEnabled();
  state[id] = enabled;
  saveEnabled(state);
}

export function getCustomShortcuts(): AppShortcut[] {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(CUSTOM_KEY);
  return raw ? JSON.parse(raw) : [];
}

export function addCustomShortcut(name: string, url: string) {
  const list = getCustomShortcuts();
  const id = "custom-" + Date.now();
  list.push({ id, name, nameId: name, url, custom: true });
  localStorage.setItem(CUSTOM_KEY, JSON.stringify(list));
  setShortcutEnabled(id, true);
  window.dispatchEvent(new Event("noble:shortcuts"));
}

export function removeCustomShortcut(id: string) {
  const list = getCustomShortcuts().filter((s) => s.id !== id);
  localStorage.setItem(CUSTOM_KEY, JSON.stringify(list));
  window.dispatchEvent(new Event("noble:shortcuts"));
}

export function useAllShortcuts(): AppShortcut[] {
  const [list, setList] = useState<AppShortcut[]>([]);
  useEffect(() => {
    const sync = () => {
      const overrides = getUrlOverrides();
      setList([...DEFAULT_SHORTCUTS, ...getCustomShortcuts()].map((s) => ({ ...s, url: overrides[s.id] ?? s.url })));
    };
    sync();
    window.addEventListener("noble:shortcuts", sync);
    return () => window.removeEventListener("noble:shortcuts", sync);
  }, []);
  return list;
}

export function useEnabledShortcuts(): AppShortcut[] {
  const all = useAllShortcuts();
  const [enabled, setEnabled] = useState<Record<string, boolean>>({});
  useEffect(() => {
    const sync = () => setEnabled(getEnabled());
    sync();
    window.addEventListener("noble:shortcuts", sync);
    return () => window.removeEventListener("noble:shortcuts", sync);
  }, []);
  return all.filter((s) => enabled[s.id]);
}

export function useShortcutEnabledMap(): Record<string, boolean> {
  const [enabled, setEnabled] = useState<Record<string, boolean>>({});
  useEffect(() => {
    const sync = () => setEnabled(getEnabled());
    sync();
    window.addEventListener("noble:shortcuts", sync);
    return () => window.removeEventListener("noble:shortcuts", sync);
  }, []);
  return enabled;
}
